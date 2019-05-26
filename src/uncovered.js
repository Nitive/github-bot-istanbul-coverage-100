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
        .map(([id, branches]) => branches
          .map((branch, index) => branch === 0 && { type: index, id })
          .filter(Boolean))
        .reduce((acc, arr) => acc.concat(arr), [])
        .map(({ id, type }) => ({
          ...file.branchMap[id].locations[type],
          type: file.branchMap[id].type,
        })),
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

function formatFunctionAnnotation(functions) {
  return _.flatMap(functions, file => file.uncovered.map((err) => {
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

function formatBranchAnnotation(statements) {
  return _.flatMap(statements, file => file.uncovered.map(err => ({
    path: file.filePath,
    annotation_level: 'warning',
    message: `Branch is not covered (${err.type})`,
    start_line: err.start.line,
    end_line: err.end.line,
  })))
}

exports.getAnnotations = ({ report, config, prFiles }) => {
  const { statements, functions, branches } = getUncoveredCode(report, { config })

  return [
    ...formatStatementAnnotation(statements),
    ...formatFunctionAnnotation(functions),
    ...formatBranchAnnotation(branches),
  ].filter(annotation => prFiles.includes(annotation.path))
}
