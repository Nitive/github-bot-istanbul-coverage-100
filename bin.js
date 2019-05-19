/* eslint-disable global-require */
const fs = require('fs')
const { execSync } = require('child_process')

const App = require('@octokit/app')
const { request } = require('@octokit/request')

const { run } = require('./app')

const env = {
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY || fs.readFileSync('./private-key.pem'),
  TRAVIS_PULL_REQUEST: process.env.TRAVIS_PULL_REQUEST,
  TRAVIS_COMMIT: process.env.TRAVIS_COMMIT || execSync('git rev-parse HEAD || true', { encoding: 'utf8' }).trim(),
}

run({
  env,
  // eslint-disable-next-line import/no-unresolved
  report: require('./coverage/coverage-summary.json'),
  octokit: { App, request },
})
  .catch(console.error) // eslint-disable-line no-console
