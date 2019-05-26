function getStats(coverage) {
  const total = {}
  Object.keys(coverage.total).forEach((key) => {
    total[key] = coverage.total[key].pct
  })
  return total
}


function formatNumber(num) {
  return (Math.floor(num * 100) / 100)
    .toFixed(2)
    .replace('-', '−')
}

function formatPct(pct) {
  return pct === 100 ? '100.0%' : `${formatNumber(pct)}%`.padStart(6, ' ')
}

function getReportStatus({ currentStats }) {
  return Object.values(currentStats).every(x => x === 100) ? 'positive' : 'negative'
}

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1)
}

exports.formatReport = (report) => {
  const currentStats = getStats(report)

  const icons = {
    positive: '💚',
    negative: '💔',
  }

  const getIcon = pct => (pct === 100 ? icons.positive : icons.negative)
  const row = type => `${capitalize(type)} | ${getIcon(currentStats[type])} \`${formatPct(currentStats[type])}\``

  return [
    '<!-- commentType: "coverage-report" -->',
    `### ${icons[getReportStatus({ currentStats })]} Coverage report`,
    '',
    'Type | Coverage',
    ':-|-:',
    row('statements'),
    row('branches'),
    row('functions'),
    row('lines'),
  ].join('\n')
}

exports.formatStatus = ({ annotations }) => {
  // const currentStats = getStats(report)
  // const status = getReportStatus({ currentStats })

  if (annotations.length === 0) {
    return {
      conclusion: 'success',
      description: '💚 Everything is covered',
    }
  }

  return {
    conclusion: 'failure',
    description: '💔 PR contains uncovered code',
  }
}
