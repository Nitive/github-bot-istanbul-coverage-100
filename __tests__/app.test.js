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

const reports = [
  badCoverageReport,
  goodCoverageReport,
]

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
    await Promise.all(reports.map(async (report) => {
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
    }))
  })

  it('should leave comment when coverage is below 100%', async () => {
    expect.assertions(1)

    await run({
      octokit: octokit.extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', (data) => {
        expect(data).toMatchSnapshot()
        return Promise.resolve()
      }),
      env,
      report: badCoverageReport,
    })
  })
})
