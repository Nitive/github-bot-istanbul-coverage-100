/* eslint-disable global-require */
const App = require('@octokit/app')
const { request } = require('@octokit/request')

const { run } = require('./app')

run({
  env: {
    prNumber: 1,
    commitSha: '8addf6390e0d0be6543e64114eda2ae55282edd8',
  },
  report: require('./fixtures/coverage-summary.json'),
  octokit: { App, request },
})
  .catch(console.error) // eslint-disable-line no-console
