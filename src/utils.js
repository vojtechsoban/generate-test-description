// intentionally dotted in order to fit in test package summary
export function getTestModuleName(filename = 'undefined.test.package') {
  const rootStart = filename.indexOf(global.sourceDirname)
  const testPathBase = rootStart >= 0
    ? filename.substr(rootStart + global.sourceDirname.length + 1)
    : filename.replace(/^\//, '')
  return testPathBase
    .replace(/(\.spec)?(-tests?)?(\.jsx?)$/, '')
    .replace(/__tests__\//, '')
    .replace(/\//g, '.')
}
