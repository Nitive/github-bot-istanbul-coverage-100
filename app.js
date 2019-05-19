const { createApp } = require('./github')
const { formatReport, formatStatus } = require('./report')


async function addCoverageComment({ app, prNumber, report }) {
  const { data: comments } = await app.request('GET /repos/:owner/:repo/issues/:issueNumber/comments', {
    issueNumber: prNumber,
  })

  await Promise.all(comments.map(async (comment) => {
    if (comment.body.includes('commentType: "coverage-report"')) {
      await app.request('DELETE /repos/:owner/:repo/issues/comments/:commentId', {
        commentId: comment.id,
      })
    }
  }))


  await app.request('POST /repos/:owner/:repo/issues/:issueNumber/comments', {
    issueNumber: prNumber,
    body: formatReport(report),
  })
}

exports.run = async ({
  prNumber, commitSha, report, octokit,
}) => {
  const app = await createApp({
    octokit,
    owner: 'Nitive',
    repo: 'github-jest-coverage-bot',
  })
  const status = formatStatus(report)

  await app.request('POST /repos/:owner/:repo/check-runs', {
    name: 'coverage',
    head_sha: commitSha,
    status: 'completed',
    conclusion: status.conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: status.description,
      summary: formatReport(report),
      annotations: [{
        path: 'README.md',
        start_line: 1,
        end_line: 1,
        annotation_level: 'warning',
        message: 'Line is not covered',
      }],
    },
    headers: {
      Accept: 'application/vnd.github.antiope-preview+json',
    },
  })

  if (status.conclusion !== 'success') {
    await addCoverageComment({ app, prNumber, report })
  }
}
