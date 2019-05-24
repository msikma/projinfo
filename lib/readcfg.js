const { existsSync, readFileSync } = require('fs')
const { execCmd } = require('./exec')

/** Checks if a Py file exists and tries to parse some of its contents. */
const readPy = path => {
  if (!existsSync(path)) {
    return null
  }
  const data = readFileSync(path, { encoding: 'utf8' })
  return parsePyString(data)
}

/** Checks if a JSON file exists and returns its contents. */
const readJSON = path => {
  if (!existsSync(path)) {
    return null
  }
  return require(path)
}

/** Checks if an INI file exists and returns its contents. */
const readINI = path => {
  if (!existsSync(path)) {
    return null
  }
  const data = readFileSync(path, { encoding: 'utf8' })
  return parseINIString(data)
}

/** Reads a config file, either INI, Py or JSON. */
const readConfigFile = path => {
  const ext = path.split('.').pop()
  if (ext === 'json') return readJSON(path)
  if (ext === 'py') return readPy(path)
  if (ext === 'cfg' || ext === 'ini') return readINI(path)
  return null
}

/** Returns whether this package requires Python 2 or 3. */
const parsePythonVersion = version => {
  if (version == null) return null
  if (/[>~]=\s?3/.test(version)) return 3
  if (/<\s?4/.test(version)) return 3
  return 2
}

/** Returns the same data, but in the structure we can feed directly to the output function. */
const makeCommonStructure = (rawData) => {
  const [type, configData, otherData] = rawData

  // Node and PHP already are in the right format, more or less.
  if (type === 'node' || type === 'php') return { type, configData, otherData }
  // Python needs a little bit of editing.
  if (type === 'python') {
    const metaData = (configData && configData.metadata ? configData.metadata : {})
    if (configData) delete configData.metadata
    return {
      type,
      configData: {
        ...configData,
        ...metaData,
        homepage: metaData['home-page'] || metaData['url'] || (configData && (configData['home-page'] || configData['url'])),
        pythonVersion: parsePythonVersion(configData && configData.options ? configData.options.python_requires : null)
      },
      otherData
    }
  }
  return { type, configData, otherData }
}

/** A parser for setup.py. Won't be very accurate, but it's something. */
const parsePyString = data => {
  let inSetup = false
  const setupData = {}
  for (const line of data.split(/\r?\n/)) {
    if (/\s?#/.test(line)) {
      // Ignore lines starting with #
      continue
    }
    if (inSetup) {
      // Retrieve information from the setup section.
      const lineData = line.match(/\s?([^\s]+)\s?=\s?'(.+)'/)
      if (lineData == null) continue
      setupData[lineData[1]] = lineData[2]
    }
    if (line.startsWith('setup(')) {
      // When we hit 'setup(', start scraping information.
      inSetup = true
    }
  }
  return setupData
}

/** A small and quick parser for ini files. */
// Taken and modified from <https://stackoverflow.com/a/12452845>.
const parseINIString = data => {
  const regex = {
    section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
    param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
    comment: /^\s*;.*$/
  }
  const value = {}
  let section = null
  data.split(/[\r\n]+/).forEach(line => {
    let match
    if (regex.comment.test(line)) {
      return
    }
    if (regex.param.test(line)) {
      match = line.match(regex.param)
      if (section) {
        value[section][match[1]] = match[2]
      }
      else {
        value[match[1]] = match[2]
      }
    }
    else if (regex.section.test(line)) {
      match = line.match(regex.section)
      value[match[1]] = {}
      section = match[1]
    }
    else if (line.length === 0 && section) {
      section = null
    }
  })
  return value
}

/** Returns the primary config data for a project (e.g. package.json). */
const getConfigData = (path, configFiles) => {
  let data = {}
  for (const file of configFiles) {
    const filePath = `${path}/${file}`
    if (!existsSync(filePath)) continue
    data = { ...data, ...readConfigFile(filePath) }
  }
  return Object.keys(data).length > 0 ? data : null
}

/** Checks a number of files to see if they exist. */
const getOtherData = (path, otherFiles) => {
  const otherData = {}
  for (const file of otherFiles) {
    otherData[file] = existsSync(`${path}/${file}`)
  }
  return otherData
}

/** Returns a project's type and data. */
const getProjectData = (path, fileTypes) => {
  for (const [type, files] of Object.entries(fileTypes)) {
    const configFiles = files[0]
    const otherFiles = [...configFiles, ...(files[1] || [])]

    // Retrieve data from the primary files and check if the other files exist.
    const configData = getConfigData(path, configFiles)
    const otherData = getOtherData(path, otherFiles)

    // Don't return this item unless the primary config file, or any of the other files exist.
    const otherExist = Object.keys(otherData).filter(f => !!otherData[f])
    if (configData == null && otherExist.length === 0) {
      continue
    }
    return [type, configData, otherData]
  }
  return null
}

/** Returns basic info from the project's configuration files. */
const getPkgData = path => {
  // Note: first item in the array will have its contents read and returned.
  // The optional second item is another array; these files will have only their existence checked.
  const php = [['composer.json']]
  const python = [['setup.cfg', 'setup.py'], ['requirements.txt']]
  const node = [['package.json'], ['yarn.lock']]

  const rawData = getProjectData(path, { php, python, node })
  const data = makeCommonStructure(rawData)

  return {
    configData: data.configData,
    otherFiles: data.otherData,
    type: data.type,
    isValid: !!rawData,
    // If a yarn.lock file exists we'll assume that it's
    // the preferred package manager for this project.
    packageManager: data.type === 'node'
      ? (data.otherData['yarn.lock'] ? 'yarn' : 'npm')
      : data.type
  }
}

/** Returns monorepo data for Lerna or Yarn workspaces. */
const getMonorepoData = (path, pkgData) => {
  if (pkgData.type !== 'node') return {}
  const { workspaces } = pkgData.configData
  const lerna = `${path}/lerna.json`
  const lernaExists = existsSync(lerna)
  const lernaData = readJSON(lerna)
  const lernaPackages = getPackages(lernaData ? lernaData.packages : null)
  const yarnPackages = getPackages(workspaces)
  const packages = { ...lernaPackages, ...yarnPackages }
  const allPackages = Object.values(packages).reduce((all, grpPck) => [...all, ...grpPck], [])
  return {
    lernaData,
    isMonorepo: Object.keys(packages).length > 0,
    monorepoType: lernaExists ? 'lerna' : 'yarn',
    packageGroups: packages,
    allPackages
  }
}

/** Escapes a string for use in regular expressions. */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Returns an object of packages (directories) found within each Lerna or Yarn package path. */
const getPackages = paths => {
  if (!paths) return null
  const groups = {}

  for (const path of paths) {
    // List directories within the package path.
    const dirs = execCmd(`ls -d ${path}`).trim().split('\n')
    // A package path contains a slash and wildcard at the end: 'packages/*' - remove it.
    const pathClean = path.slice(0, -2)
    // Cut the base path off the directories for cleaner output.
    groups[pathClean] = dirs.map(dir => dir.replace(new RegExp(`^${escapeRegex(pathClean)}\/`), ''))
  }
  return groups
}

module.exports = {
  getPkgData,
  getMonorepoData
}