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
        TRAVIS_PULL_REQUEST: '0',
        TRAVIS_PULL_REQUEST_SHA: 'sha',
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
