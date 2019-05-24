const _ = require('lodash')

function getUncovered(files, typeKey, mapKey) {
  return files
    .map(file => ({
      filePath: file.path,
      uncovered: _.toPairs(file[typeKey])
        .filter(([, runsCount]) => runsCount === 0)
        .map(([id]) => file[mapKey][id]),
    }))
    .filter(row => row.uncovered.length > 0)
}

function getUncoveredBranches(files) {
  return files
    .map(file => ({
      filePath: file.path,
      uncovered: _.toPairs(file.b)
        .map(([id, [ifRunsCount, elseRunsCount]]) => [
          ifRunsCount === 0 && { type: 0, id },
          elseRunsCount === 0 && { type: 1, id },
        ].filter(Boolean))
        .reduce((acc, arr) => acc.concat(arr), [])
        .map(({ id, type }) => file.branchMap[id].locations[type]),
    }))
    .filter(row => row.uncovered.length > 0)
}

const getUncoveredCode = (report) => {
  const files = Object.values(report)

  return {
    statements: getUncovered(files, 's', 'statementMap'),
    branches: getUncoveredBranches(files),
    functions: getUncovered(files, 'f', 'fnMap'),
  }
}

exports.getAnnotations = ({ report, config }) => {
  const { statements } = getUncoveredCode(report)

  return _.flatMap(statements, file => file.uncovered.map((err) => {
    const oneLine = err.start.line === err.end.line

    const columns = oneLine
      ? { start_column: err.start.column, end_column: err.end.column }
      : {}

    return {
      path: file.filePath.replace(`${config.baseDir}/`, ''),
      start_line: err.start.line,
      end_line: err.end.line,
      ...columns,
      annotation_level: 'warning',
      message: 'Statement is not covered',
    }
  }))
}
