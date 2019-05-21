const { run } = require('../app')
const { baseOctokit } = require('./octokit')

const octokit = baseOctokit
  .extend('POST /repos/:owner/:repo/check-runs', () => Promise.resolve())
  .extend('GET /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve({ data: [] }))
  .extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve())
  .extend('DELETE /repos/:owner/:repo/issues/comments/:commentId', () => Promise.resolve())

const env = {
  TRAVIS_PULL_REQUEST: '1',
  TRAVIS_PULL_REQUEST_SHA: 'sha',
}

const badCoverageReport = {
  total: {
    lines: { pct: 92.61 },
    statements: { pct: 91.99 },
    functions: { pct: 76.83 },
    branches: { pct: 93.75 },
  },
}

const goodCoverageReport = {
  total: {
    lines: { pct: 100 },
    statements: { pct: 100 },
    functions: { pct: 100 },
    branches: { pct: 100 },
  },
}

const mixedCoverageReport = {
  total: {
    lines: { pct: 95 },
    statements: { pct: 100 },
    functions: { pct: 80 },
    branches: { pct: 100 },
  },
}

const reports = [
  badCoverageReport,
  mixedCoverageReport,
  goodCoverageReport,
]

async function every(data, check) {
  await Promise.all(data.map(check))
}

describe('App', () => {
  it('should set failed check when coverage is below 100%', async () => {
    expect.assertions(3)

    await run({
      octokit: octokit.extend('POST /repos/:owner/:repo/check-runs', (result) => {
        expect(result).toMatchObject({
          name: 'Coverage',
          conclusion: 'failure',
          status: 'completed',
        })
        expect(result.output).toMatchObject({
          title: '💔 below 100%',
        })
        expect(result.output.summary).toMatchSnapshot()

        return Promise.resolve()
      }),
      env,
      report: badCoverageReport,
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
      report: goodCoverageReport,
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
      report: goodCoverageReport,
    })

    expect(createComment).not.toHaveBeenCalled()
  })

  it('should remove previous coverage comments', async () => {
    await every(reports, async (report) => {
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
        report,
      })

      expect(test).toHaveBeenCalledWith(1)
      expect(test).toHaveBeenCalledWith(2)
      expect(test).toHaveBeenCalledTimes(2)
    })
  })

  it('should not remove comments only with commentType: "coverage-report"', async () => {
    await every(reports, async (report) => {
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
        report,
      })

      expect(test).toHaveBeenCalledWith(1)
      expect(test).not.toHaveBeenCalledWith(2)
      expect(test).not.toHaveBeenCalledWith(3)
      expect(test).toHaveBeenCalledTimes(1)
    })
  })

  it('should leave comment when coverage is below 100%', async () => {
    expect.assertions(2)

    await every(reports, async (report) => {
      await run({
        octokit: octokit.extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', (data) => {
          expect(data).toMatchSnapshot()
          return Promise.resolve()
        }),
        env,
        report,
      })
    })
  })

  it('should exit with message when executed not inside PR', async () => {
    await every(reports, async (report) => {
      await every(['false', ''], async (TRAVIS_PULL_REQUEST) => {
        const effects = await run({
          octokit,
          env: {
            ...env,
            TRAVIS_PULL_REQUEST,
          },
          report,
        })

        expect(effects.log).toEqual(['Not a pull request. Exit'])
      })
    })
  })
})
