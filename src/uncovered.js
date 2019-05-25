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

function getUncoveredCode(report, { config }) {
  const files = Object.values(report)
    .map(file => ({
      ...file,
      path: file.path.replace(`${config.baseDir}/`, ''),
    }))

  return {
    statements: getUncovered(files, 's', 'statementMap'),
    branches: getUncoveredBranches(files),
    functions: getUncovered(files, 'f', 'fnMap'),
  }
}

function formatStatementAnnotation(statements) {
  return _.flatMap(statements, file => file.uncovered.map(err => ({
    path: file.filePath,
    annotation_level: 'warning',
    message: 'Statement is not covered',
    start_line: err.start.line,
    end_line: err.end.line,
  })))
}

function getFunctionName(err) {
  return err.name[0] === '(' ? undefined : err.name
}

function formatFunctionAnnotation(statements) {
  return _.flatMap(statements, file => file.uncovered.map((err) => {
    const fnName = getFunctionName(err)

    return {
      path: file.filePath,
      annotation_level: 'warning',
      message: `Function${fnName ? ` “${fnName}”` : ''} is not covered`,
      start_line: err.loc.start.line,
      end_line: err.loc.end.line,
    }
  }))
}

exports.getAnnotations = ({ report, config }) => {
  const { statements, functions } = getUncoveredCode(report, { config })

  return [
    ...formatStatementAnnotation(statements),
    ...formatFunctionAnnotation(functions),
    // ...formatStatementAnnotation(functions.map()),
  ]
}
