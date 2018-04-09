import _isEmpty from 'lodash/isEmpty'
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join, resolve } from 'path'
import findDescribe from './parser'
import { getTestModuleName } from './utils'

const isDirectory = source => lstatSync(source).isDirectory()

const buildWildCardRegex = wildCard => {
  // TODO replace wildcards with regexp and escape regex characters
  return new RegExp(wildCard)
}

const testFile = arg => {
  if (!arg) {
    return () => true
  } else if (typeof arg === 'string') {
    return testFile(buildWildCardRegex(arg))
  } else if (arg instanceof RegExp) {
    return absoluteFileName => {
      const baseName = basename(absoluteFileName)
      return arg.test(baseName)
    }
  } else {
    throw new Error(`Unsupported arg: ${arg}`)
  }
}

const addFile = (result, fileName, testFn) => {
  if (!testFn || testFn(fileName)) {
    result.push(fileName)
  }
}

const listFiles = (source, testFn) => {
  const result = []
  readdirSync(source)
    .forEach(dirEntry => {
      const fullRelativePath = join(source, dirEntry)
      if (isDirectory(fullRelativePath)) {
        listFiles(fullRelativePath)
          .forEach(file => addFile(result, file, testFn))
      } else {
        addFile(result, fullRelativePath, testFn)
      }
    })
  return result
}

const modifyFile = (fileName, start, end, text) => {
  const fileContent = readFileSync(fileName, 'utf8')
  const newFileContent = fileContent.substr(0, start + 1) + text + fileContent.substr(end - 1, fileContent.length)
  writeFileSync(fileName, newFileContent)
}

// utility arguments

const input = 'example' // required argument - start directory

// skip other 'root describe', other substitutions are not supported since the first
// substitution breaks other substitutions positions
const firstOnly = true

// TODO define src root
// eslint-disable-next-line no-global-assign
global = global || {}
global.sourceDirname = resolve('./example')

try {
  const source = resolve(input)
  const files = listFiles(source, testFile('.*\\.spec\\.jsx?'))
  console.log('\nResult\n')
  files.forEach(file => {
    const describeDefitions = findDescribe(file, true)
    if (!_isEmpty(describeDefitions)) {
      console.log(`describeDefinition for file=${file}=`, describeDefitions)
      describeDefitions.forEach((describe, index) => {
        const moduleName = getTestModuleName(describe.fileName)
        if (describe.value === moduleName) {
          console.log(`file ${file} is ok: '${moduleName}'`)
        } else if (index === 0 || !firstOnly) {
          console.log(`file=${file}: index=${index}, value='${describe.value}' will be updated '${moduleName}'`)
          modifyFile(file, describe.start - 1, describe.end + 1, `'${moduleName}'`)
        } else {
          console.log(`file=${file} is not ok but skipped because of firstOnly=${firstOnly}, index=${index}`)
        }
      })
    } else {
      console.log(`file ${file} does not contain 'describe'`)
    }
  })
} catch (error) {
  console.error(`input=${input}, error=${error.message}`, error)
}

