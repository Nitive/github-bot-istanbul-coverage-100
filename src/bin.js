#!/usr/bin/env node

/* istanbul ignore file */
/* eslint-disable global-require */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const App = require('@octokit/app')
const { request } = require('@octokit/request')

const { run } = require('./app')

const env = {
  GITHUB_APP_ID: process.env.GITHUB_APP_ID,
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY || fs.readFileSync('./private-key.pem'),
  TRAVIS_PULL_REQUEST: process.env.TRAVIS_PULL_REQUEST,
  TRAVIS_PULL_REQUEST_SHA: process.env.TRAVIS_PULL_REQUEST_SHA || execSync('git rev-parse HEAD || true', { encoding: 'utf8' }).trim(),
  TRAVIS_PULL_REQUEST_SLUG: process.env.TRAVIS_PULL_REQUEST_SLUG,
  TRAVIS_BUILD_DIR: process.env.TRAVIS_BUILD_DIR,
}

const summaryReportPath = path.join(process.env.TRAVIS_BUILD_DIR, 'coverage/coverage-summary.json')
const coverageReportPath = path.join(process.env.TRAVIS_BUILD_DIR, 'coverage/coverage-final.json')

run({
  env,
  summaryReport: require(summaryReportPath), // eslint-disable-line import/no-dynamic-require
  coverageReport: require(coverageReportPath), // eslint-disable-line import/no-dynamic-require
  octokit: { App, request },
})
  .then((effects) => {
    (effects.log || []).forEach((message) => {
      // eslint-disable-next-line no-console
      console.log(message)
    })
  })
  .catch((err) => {
    console.error(err) // eslint-disable-line no-console
    process.exit(1)
  })
