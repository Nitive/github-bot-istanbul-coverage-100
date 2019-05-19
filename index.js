/* eslint-disable global-require */

const { createApp } = require('./app')
const { formatReport, formatStatus } = require('./report')


async function addCoverageComment({ app, prNumber, reports }) {
  const report = formatReport(reports)
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
    body: report,
  })
}

async function run({ prNumber, commitSha, reports }) {
  const app = await createApp({
    owner: 'Nitive',
    repo: 'github-jest-coverage-bot',
  })
  const report = formatReport(reports)

  const status = formatStatus(reports)

  await app.request('POST /repos/:owner/:repo/check-runs', {
    name: 'coverage',
    head_sha: commitSha,
    status: 'completed',
    conclusion: status.state,
    completed_at: new Date().toISOString(),
    output: {
      title: status.description,
      summary: report,
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

  if (status.state !== 'sucsess') {
    await addCoverageComment({ app, prNumber, reports })
  }
}

run({
  prNumber: 1,
  commitSha: '8addf6390e0d0be6543e64114eda2ae55282edd8',
  reports: {
    prevReport: require('./fixtures/bad-coverage-summary.json'),
    currentReport: require('./fixtures/coverage-summary.json'),
  },
})
  .catch(console.error) // eslint-disable-line no-console
