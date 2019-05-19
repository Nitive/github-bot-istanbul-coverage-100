const { run } = require('../app')
const { baseOctokit } = require('./octokit')

const octokit = baseOctokit
  .extend('POST /repos/:owner/:repo/check-runs', () => Promise.resolve())
  .extend('GET /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve({ data: [] }))
  .extend('POST /repos/:owner/:repo/issues/:issueNumber/comments', () => Promise.resolve())

describe('App', () => {
  it('test', async () => {
    await run({
      octokit,
      env: {
        prNumber: 1,
        commitSha: '8addf6390e0d0be6543e64114eda2ae55282edd8',
      },
      report: {
        total: {
          lines: { pct: 92.61 },
          statements: { pct: 91.99 },
          functions: { pct: 76.83 },
          branches: { pct: 93.75 },
        },
      },
    })
  })
})
