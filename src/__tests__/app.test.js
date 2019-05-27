const { run } = require('../app')
const { baseOctokit } = require('./octokit')

const badCoverage = require('./__fixtures__/bad-coverage-final.json')
const nestedCoverage = require('./__fixtures__/nested-uncovered-final.json')

const octokit = baseOctokit
  .extend('POST /repos/:owner/:repo/check-runs', () => Promise.resolve())
  .extend('GET /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve({ data: [] }))
  .extend('GET /repos/:owner/:repo/pulls/:pullNumber/files', () => Promise.resolve({ data: [] }))
  .extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve())
  .extend('DELETE /repos/:owner/:repo/issues/comments/:commentId', () => Promise.resolve())

const env = {
  TRAVIS_PULL_REQUEST: '1',
  TRAVIS_PULL_REQUEST_SHA: 'sha',
  TRAVIS_PULL_REQUEST_SLUG: 'owner/repo',
  TRAVIS_BUILD_DIR: '/baseDir',
}

const badSummary = {
  total: {
    lines: { pct: 92.61 },
    statements: { pct: 91.99 },
    functions: { pct: 76.83 },
    branches: { pct: 93.75 },
  },
}

const goodSummary = {
  total: {
    lines: { pct: 100 },
    statements: { pct: 100 },
    functions: { pct: 100 },
    branches: { pct: 100 },
  },
}

const mixedSummary = {
  total: {
    lines: { pct: 95 },
    statements: { pct: 100 },
    functions: { pct: 80 },
    branches: { pct: 100 },
  },
}

const summaryReports = [
  badSummary,
  mixedSummary,
  goodSummary,
]

async function every(data, check) {
  await Promise.all(data.map(check))
}

describe('App', () => {
  it('should set failed check when there are some uncovered code in PR', async () => {
    expect.assertions(3)

    await run({
      octokit: octokit
        .extend('POST /repos/:owner/:repo/check-runs', (result) => {
          expect(result).toMatchObject({
            name: 'Coverage',
            conclusion: 'failure',
            status: 'completed',
          })
          expect(result.output).toMatchObject({
            title: '💔 PR contains uncovered code',
          })
          expect(result.output.summary).toMatchSnapshot()

          return Promise.resolve()
        })
        .extend('GET /repos/:owner/:repo/pulls/:pullNumber/files', () => Promise.resolve({
          data: [{ filename: 'src/app.js' }],
        })),
      env,
      summaryReport: badSummary,
      coverageReport: badCoverage,
    })
  })

  it('should set success check when coverage is 100%', async () => {
    expect.assertions(3)

    await run({
      octokit: octokit.extend('POST /repos/:owner/:repo/check-runs', (result) => {
        expect(result).toMatchObject({
          name: 'Coverage',
          conclusion: 'success',
          status: 'completed',
        })
        expect(result.output).toMatchObject({
          title: '💚 Everything is covered',
        })
        expect(result.output.summary).toMatchSnapshot()

        return Promise.resolve()
      }),
      env,
      summaryReport: goodSummary,
    })
  })

  it('should not leave comment when coverage is 100%', async () => {
    const createComment = jest.fn()

    await run({
      octokit: octokit.extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', () => {
        createComment()
        return Promise.resolve()
      }),
      env,
      summaryReport: goodSummary,
    })

    expect(createComment).not.toHaveBeenCalled()
  })

  it('should remove previous coverage comments', async () => {
    await every(summaryReports, async (summaryReport) => {
      const test = jest.fn()

      await run({
        octokit: octokit
          .extend('GET /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve({
            data: [
              { id: 1, body: '<!-- commentType: "coverage-report" -->\n comment 1' },
              { id: 2, body: '<!-- commentType: "coverage-report" -->\n comment 2' },
            ],
          }))
          .extend('DELETE /repos/:owner/:repo/issues/comments/:commentId', (data) => {
            test(data.commentId)
            return Promise.resolve()
          }),
        env,
        summaryReport,
      })

      expect(test).toHaveBeenCalledWith(1)
      expect(test).toHaveBeenCalledWith(2)
      expect(test).toHaveBeenCalledTimes(2)
    })
  })

  it('should remove only comments with commentType: "coverage-report"', async () => {
    await every(summaryReports, async (summaryReport) => {
      const test = jest.fn()

      await run({
        octokit: octokit
          .extend('GET /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve({
            data: [
              { id: 1, body: '<!-- commentType: "coverage-report" -->\n comment 1' },
              { id: 2, body: '<!-- commentType: "another type" -->\n comment 2' },
              { id: 3, body: 'just regular comment' },
            ],
          }))
          .extend('DELETE /repos/:owner/:repo/issues/comments/:commentId', (data) => {
            test(data.commentId)
            return Promise.resolve()
          }),
        env,
        summaryReport,
      })

      expect(test).toHaveBeenCalledWith(1)
      expect(test).toHaveBeenCalledTimes(1)
    })
  })

  it.skip('should leave comment when coverage is below 100%', async () => {
    expect.assertions(2)

    await every(summaryReports, async (summaryReport) => {
      await run({
        octokit: octokit.extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', (data) => {
          expect(data).toMatchSnapshot()
          return Promise.resolve()
        }),
        env,
        summaryReport,
      })
    })
  })

  it('should exit with message when executed not inside PR', async () => {
    await every(summaryReports, async (summaryReport) => {
      await every(['false', ''], async (TRAVIS_PULL_REQUEST) => {
        const effects = await run({
          octokit,
          env: {
            ...env,
            TRAVIS_PULL_REQUEST,
          },
          summaryReport,
        })

        expect(effects.log).toEqual(['Not a pull request. Exit'])
      })
    })
  })

  it('should annotate uncovered code', async () => {
    expect.assertions(1)

    await run({
      octokit: octokit
        .extend('POST /repos/:owner/:repo/check-runs', (result) => {
          expect(result.output.annotations).toEqual([
            {
              annotation_level: 'warning',
              end_line: 42,
              message: 'Function “test” is not covered',
              path: 'src/app.js',
              start_line: 40,
            },
            {
              annotation_level: 'warning',
              end_line: 7,
              message: 'Function is not covered',
              path: 'src/uncovered.js',
              start_line: 1,
            },
            {
              annotation_level: 'warning',
              end_line: 59,
              message: 'Branch is not covered (if)',
              path: 'src/app.js',
              start_line: 57,
            },
          ])

          return Promise.resolve()
        })
        .extend('GET /repos/:owner/:repo/pulls/:pullNumber/files', () => Promise.resolve({
          data: [{ filename: 'src/app.js' }, { filename: 'src/uncovered.js' }],
        })),
      env,
      summaryReport: badSummary,
      coverageReport: badCoverage,
    })
  })

  it('should annotate uncovered code 2', async () => {
    expect.assertions(1)

    await run({
      octokit: octokit
        .extend('POST /repos/:owner/:repo/check-runs', (result) => {
          expect(result.output.annotations).toEqual([{
            path: 'src/uncovered.js',
            annotation_level: 'warning',
            message: 'Statement is not covered',
            start_line: 90,
            end_line: 90,
          },
          {
            path: 'src/uncovered.js',
            annotation_level: 'warning',
            message: 'Function “getBestAlternative” is not covered',
            start_line: 86,
            end_line: 88,
          },
          {
            path: 'src/uncovered.js',
            annotation_level: 'warning',
            message: 'Branch is not covered (if)',
            start_line: 110,
            end_line: 113,
          }])

          return Promise.resolve()
        })
        .extend('GET /repos/:owner/:repo/pulls/:pullNumber/files', () => Promise.resolve({
          data: [{ filename: 'src/uncovered.js' }],
        })),
      env,
      summaryReport: badSummary,
      coverageReport: nestedCoverage,
    })
  })

  it.skip('should not annotate 100% covered code', async () => {
    expect.assertions(1)

    await run({
      octokit: octokit.extend('POST /repos/:owner/:repo/check-runs', (result) => {
        expect(result.output.annotations).toEqual([])

        return Promise.resolve()
      }),
      env,
      summaryReport: goodSummary,
      coverageReport: badCoverage,
    })
  })
})
