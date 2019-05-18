/* eslint-disable global-require */

const R = require('ramda')

function getStats(coverage) {
  return R.map(obj => obj.pct, coverage.total)
}

function floor(diff) {
  return Math.floor(diff * 100) / 100
}

function formatDiff(diff) {
  if (diff === 0) {
    return 'unchanged'
  }

  if (diff > 0) {
    return `+${floor(diff)}%`
  }

  return `${String(floor(diff)).replace('-', '−')}%`
}

function formatReport({ prevReport, currentReport }) {
  const prevStats = getStats(prevReport)
  const currentStats = getStats(currentReport)
  const diffs = R.mapObjIndexed((stat, statK) => stat - prevStats[statK], currentStats)

  return [
    'Coverage report',
    '',
    `Statements: ${currentStats.statements}% (${formatDiff(diffs.statements)})`,
    `Branches: ${currentStats.branches}% (${formatDiff(diffs.branches)})`,
    `Functions: ${currentStats.functions}% (${formatDiff(diffs.functions)})`,
    `Lines: ${currentStats.lines}% (${formatDiff(diffs.lines)})`,
  ].join('\n')
}

function run() {
  const report = formatReport({
    prevReport: require('./fixtures/prev-coverage-summary.json'),
    currentReport: require('./fixtures/coverage-summary.json'),
  })

  // eslint-disable-next-line no-console
  console.log(report)
}

run()
