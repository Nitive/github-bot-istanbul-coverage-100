const { run } = require('../app')
const { baseOctokit } = require('./octokit')

const octokit = baseOctokit
  .extend('POST /repos/:owner/:repo/check-runs', () => Promise.resolve())
  .extend('GET /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve({ data: [] }))
  .extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve())

const env = {
  TRAVIS_PULL_REQUEST: '0',
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
})
