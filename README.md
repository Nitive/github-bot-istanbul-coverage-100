# Istanbul Coverage 100 [![Build Status](https://travis-ci.com/Nitive/github-bot-istanbul-coverage-100.svg?branch=master)](https://travis-ci.com/Nitive/github-bot-istanbul-coverage-100)

Github bot to ensure that your app have 100% coverage. It checks your coverage report and creates checks in pull requests, send coverage comments and annotate uncovered lines of code.

## Get started
1. Create github app
1. Set env variables GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in travis
1. Install `github-bot-istanbul-coverage-100` as dev dependency
1. Add `--coverage` flag to `jest` to collect coverage on CI
1. Add `json-summary` to coverage reporters
1. Add `npx github-bot-istanbul-coverage-100` in `after_success` script in .travis.yml
