const { createApp } = require('./github')
const { formatReport, formatStatus } = require('./report')

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

async function addCoverageComment({ app, config, report }) {
  await app.request('POST /repos/:owner/:repo/issues/:issueNumber/comments', {
    issueNumber: config.pullRequestNumber,
    body: formatReport(report),
  })
}

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
  }
}

exports.run = async ({
  report, octokit, env,
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
  const status = formatStatus(report)

  await app.request('POST /repos/:owner/:repo/check-runs', {
    name: 'Coverage',
    head_sha: config.commitSha,
    status: 'completed',
    conclusion: status.conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: status.description,
      summary: formatReport(report),
      // annotations: [{
      //   path: 'README.md',
      //   start_line: 1,
      //   end_line: 1,
      //   annotation_level: 'warning',
      //   message: 'Line is not covered',
      // }],
    },
    headers: {
      Accept: 'application/vnd.github.antiope-preview+json',
    },
  })

  await removeCoverageComments({ app, config })
  if (status.conclusion !== 'success') {
    await addCoverageComment({ app, config, report })
  }

  return {}
}
