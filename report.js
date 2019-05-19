const R = require('ramda')

function getStats(coverage) {
  return R.map(obj => obj.pct, coverage.total)
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
  const reportStatus = getReportStatus({ currentStats })
  if (reportStatus === 'positive') {
    return undefined
  }

  const icons = {
    positive: '💚',
    negative: '💔',
  }

  const getIcon = pct => (pct === 100 ? icons.positive : icons.negative)
  const row = type => `${capitalize(type)} | ${getIcon(currentStats[type])} \`${formatPct(currentStats[type])}\``

  return [
    '<!-- commentType: "coverage-report" -->',
    '### 💔 Coverage report',
    '',
    'Type | Coverage',
    ':-|-:',
    row('statements'),
    row('branches'),
    row('functions'),
    row('lines'),
  ].join('\n')
}

exports.formatStatus = (report) => {
  const currentStats = getStats(report)
  const status = getReportStatus({ currentStats })

  if (status === 'positive') {
    return {
      conclusion: 'success',
      description: '💚 Everything is covered',
    }
  }

  return {
    conclusion: 'failure',
    description: '💔 Coverage is below 100%',
  }
}