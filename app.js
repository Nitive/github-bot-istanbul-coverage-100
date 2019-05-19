const { createApp } = require('./github')
const { formatReport, formatStatus } = require('./report')


async function addCoverageComment({ app, config, report }) {
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


  await app.request('POST /repos/:owner/:repo/issues/:issueNumber/comments', {
    issueNumber: config.pullRequestNumber,
    body: formatReport(report),
  })
}

function createConfig({ env }) {
  return {
    isPR: Boolean(env.TRAVIS_PULL_REQUEST && env.TRAVIS_PULL_REQUEST !== 'false'),
    pullRequestNumber: env.TRAVIS_PULL_REQUEST,
    commitSha: env.TRAVIS_COMMIT,
    githubAppPrivateKey: env.GITHUB_APP_PRIVATE_KEY,
  }
}

exports.run = async ({
  report, octokit, env,
}) => {
  const config = createConfig({ env })
  if (!config.isPR) {
    // eslint-disable-next-line no-console
    console.log('Not a pull request. Exit')
    return
  }

  const app = await createApp({
    octokit,
    config,
    owner: 'Nitive',
    repo: 'github-jest-coverage-bot',
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

  if (status.conclusion !== 'success') {
    await addCoverageComment({ app, config, report })
  }
}
