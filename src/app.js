const { createApp } = require('./github')
const { formatReport, formatStatus } = require('./report')
const { getAnnotations } = require('./uncovered')

async function removeCoverageComments({ app, config }) {
  const { data: comments } = await app.request('GET /repos/:owner/:repo/issues/:issueNumber/comments', {
    issueNumber: config.pullRequestNumber,
  })

  await Promise.all(comments.map(async (comment) => {
    if (comment.body.includes('commentType: "coverage-report"')) {
      await app.request('DELETE /repos/:owner/:repo/issues/comments/:commentId', {
        commentId: comment.id,
      })
    }
  }))
}

// async function addCoverageComment({ app, config, summaryReport }) {
//   await app.request('POST /repos/:owner/:repo/issues/:issueNumber/comments', {
//     issueNumber: config.pullRequestNumber,
//     body: formatReport(summaryReport),
//   })
// }

function createConfig({ env }) {
  const [owner, repo] = env.TRAVIS_PULL_REQUEST_SLUG.split('/')

  return {
    isPR: Boolean(env.TRAVIS_PULL_REQUEST && env.TRAVIS_PULL_REQUEST !== 'false'),
    pullRequestNumber: env.TRAVIS_PULL_REQUEST,
    commitSha: env.TRAVIS_PULL_REQUEST_SHA,
    githubAppId: env.GITHUB_APP_ID,
    githubAppPrivateKey: env.GITHUB_APP_PRIVATE_KEY,
    owner,
    repo,
    baseDir: env.TRAVIS_BUILD_DIR,
  }
}

async function getPullRequestFiles({ app, config }) {
  const { data } = await app.request('GET /repos/:owner/:repo/pulls/:pullNumber/files', {
    pullNumber: config.pullRequestNumber,
  })

  return data.map(file => file.filename)
}

exports.run = async ({
  summaryReport, octokit, env, coverageReport,
}) => {
  const config = createConfig({ env })
  if (!config.isPR) {
    return Promise.resolve({
      log: ['Not a pull request. Exit'],
    })
  }

  const app = await createApp({
    octokit,
    config,
  })

  const prFiles = await getPullRequestFiles({ app, config })
  const annotations = coverageReport
    ? getAnnotations({ report: coverageReport, config, prFiles })
    : []

  const status = formatStatus({ summaryReport, annotations })

  await app.request('POST /repos/:owner/:repo/check-runs', {
    name: 'Coverage',
    head_sha: config.commitSha,
    status: 'completed',
    conclusion: status.conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: status.description,
      summary: formatReport(summaryReport),
      annotations,
    },
    headers: {
      Accept: 'application/vnd.github.antiope-preview+json',
    },
  })

  await removeCoverageComments({ app, config })
  // if (status.conclusion !== 'success') {
  //   await addCoverageComment({ app, config, summaryReport })
  // }

  return {}
}
