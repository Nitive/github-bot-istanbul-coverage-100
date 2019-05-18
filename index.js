/* eslint-disable global-require */

const { createApp } = require('./app')
const { formatReport, formatStatus } = require('./report')

async function run() {
  const app = await createApp({
    owner: 'Nitive',
    repo: 'github-jest-coverage-bot',
  })
  const prNumber = 1
  const commitSha = '31c5d2957c906d822843e542e86e4db3e27557e5'
  const reports = {
    prevReport: require('./fixtures/bad-coverage-summary.json'),
    currentReport: require('./fixtures/coverage-summary.json'),
  }
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

  const status = formatStatus(reports)
  await app.request('POST /repos/:owner/:repo/statuses/:sha', {
    sha: commitSha,
    state: status.state,
    description: status.description,
    context: 'coverage',
  })

  // eslint-disable-next-line no-console
  // console.log(report)
}

run()
  .catch(console.error)
