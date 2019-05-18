const R = require('ramda')

function getStats(coverage) {
  return R.map(obj => obj.pct, coverage.total)
}


function formatNumber(num) {
  return (Math.floor(num * 100) / 100)
    .toFixed(2)
    .replace('-', '−')
    .replace('.', ',')
}

function formatDiff(diff) {
  if (diff === 0) {
    return 'unchanged'
  }

  if (diff > 0) {
    return `+${formatNumber(diff)}`
  }

  return `${formatNumber(diff)}`
}

function collectStats({ prevReport, currentReport }) {
  const prevStats = getStats(prevReport)
  const currentStats = getStats(currentReport)
  const diffs = R.mapObjIndexed((stat, statK) => stat - prevStats[statK], currentStats)

  return { currentStats, diffs }
}

function isReportStatus({ diffs }) {
  return Object.values(diffs).every(x => x >= 0) ? 'positive' : 'negative'
}

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1)
}

exports.formatReport = (reports) => {
  const { currentStats, diffs } = collectStats(reports)
  const reportStatus = isReportStatus({ diffs })
  const icons = {
    positive: '💚',
    negative: '💔',
  }

  const extraForNegative = (line, extra) => (reportStatus === 'negative' ? line + extra : line)
  const row = type => extraForNegative(
    `${capitalize(type)} | ${formatNumber(currentStats[type])}% | ${formatDiff(diffs[type])}%`,
    ` | ${diffs[type] >= 0 ? icons.positive : icons.negative}`,
  )

  return [
    '<!-- commentType: "coverage-report" -->',
    `### ${icons[reportStatus]} Coverage report`,
    '',
    extraForNegative('Type | Coverage | Difference', ' | '),
    extraForNegative(':-|-:|-:', '|-'),
    row('statements'),
    row('branches'),
    row('functions'),
    row('lines'),
  ].join('\n')
}

exports.formatStatus = (reports) => {
  const { currentStats, diffs } = collectStats(reports)
  const diff = diffs.statements

  if (diff === 0) {
    return {
      state: 'success',
      description: `the same (${formatNumber(currentStats.statements)}%)`,
    }
  }

  if (diff < 0) {
    return {
      state: 'failure',
      description: `${formatNumber(Math.abs(diff))}% down (total ${formatNumber(currentStats.statements)}%)`,
    }
  }

  return {
    state: 'success',
    description: `${formatNumber(diff)}% up (total ${formatNumber(currentStats.statements)}%)`,
  }
}
