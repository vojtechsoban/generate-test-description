// eslint-disable-next-line import/no-extraneous-dependencies
import { parse } from 'babylon'
import { readFileSync } from 'fs'

export default (fileName, generateFromFile = false) => {
  console.log(`processing file=${fileName}`)
  const fileContent = readFileSync(fileName, 'utf8')
  try {
    const ast = parse(fileContent, {
      sourceType: 'module',
      // see https://github.com/babel/babel/tree/master/packages/babylon
      // or try https://www.npmjs.com/package/babylon-options
      plugins: [
        'objectRestSpread',
        'jsx',
      ],
    })
    const configuration = ast.comments.reduce(
      (result, commentNode) => {
        const comment = commentNode.value.trim()
        if (comment === 'generate-from-import') {
          result.willGenerate = true
          result.testNameSourceFileName = null
          if (commentNode.loc.start.column === 0) {
            result.importLocation = { afterLine: commentNode.loc.start.line }
          } else {
            result.importLocation = { beforeLine: commentNode.loc.end.line }
          }
        } else if (comment === 'generate-from-file' && !result.importLocation) {
          result.willGenerate = true
          result.testNameSourceFileName = fileName
        }
        return result
      },
      {
        willGenerate: false,
        importLocation: null,
        testNameSourceFileName: null,
      },
    )
    if (!configuration.willGenerate && !generateFromFile) {
      console.log('generate configuration', configuration)
      return []
    } else
    if (!configuration.willGenerate && generateFromFile) {
      configuration.testNameSourceFileName = fileName
    }

    if (configuration.importLocation) {
      console.log('DEBUG: **************************************')
      console.log('DEBUG: generate configuration', configuration)
      console.log('DEBUG: **************************************')
      const { testNameSourceFileName } = ast.program.body.reduce(
        (result, node) => {
          if (result.done || node.type !== 'ImportDeclaration') {
            return result
          }
          if (node.loc.start.line > configuration.importLocation.afterLine) {
            result.testNameSourceFileName = node.source.value
            console.log(`result.testNameSourceFileName = '${node.source.value}' set from 'afterLine'`)
            result.done = true
            return result
          } else if (node.loc.end.line === configuration.importLocation.beforeLine) {
            if (result.testNameSourceFileName) {
              console.warn(`overriding ${result.testNameSourceFileName} with ${node.source.value}`)
            }
            result.testNameSourceFileName = node.source.value
            console.log(`result.testNameSourceFileName = '${node.source.value}' set from 'beforeLine'`)
            result.done = true
            return result
          } else {
            return result
          }
        },
        {
          ...configuration,
          done: false,
        },
      )
      configuration.testNameSourceFileName = testNameSourceFileName
    }

    console.log('generate configuration', configuration)
    return ast.program.body.reduce((result, node) => {
      if (node.type === 'ExpressionStatement'
        && node.loc.start.column === 0
        && node.expression.callee.name === 'describe') {
        const { start, end, value } = node.expression.arguments[0]
        return [
          ...result,
          {
            start,
            end,
            value,
            fileName: configuration.testNameSourceFileName,
          },
        ]
      } else {
        return result
      }
    }, [])
  } catch (error) {
    console.error(`Failed parsing file ${fileName}: Error: ${error.message}`)
    return []
  }
}
