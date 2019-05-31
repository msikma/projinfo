const { readdirSync } = require('fs')
const { execCmd } = require('./exec')

// Bin file types for each language.
const BIN_TYPES = {
  python: 'py',
  php: 'php',
  node: 'js'
}

/** Returns whether a file is a readme (used to sort it at the top of the list). */
const isReadme = f => f.split('.').shift().toLowerCase() === 'readme'

/** Returns the binaries indicated in the project metadata. */
const getBins = (path, pkgData) => {
  const type = pkgData.type
  const binFiles = filterFiles(readdirSync(path), [BIN_TYPES[type]])
  const pkgFiles = getBinsFromPkg(pkgData)

  // Note: Node projects always have all bins listed in the package.json.
  // If this is a node project, only return the bins from there.
  if (type === 'node') {
    return { bins: pkgFiles }
  }

  return { bins: [...pkgFiles, ...removeItem(binFiles, 'setup.py')] }
}

/** Filters a list of files by an array of filetypes. */
const filterFiles = (files, types = []) => {
  const re = new RegExp(`.*\\.(${types.join('|')})`, 'gi')
  return files.filter(f => re.test(f))
}

/** Returns binary files from package information. */
const getBinsFromPkg = (pkgData) => {
  if (!pkgData || !pkgData.configData || !pkgData.configData.bin) return []

  // If 'bin' is an object, we need the keys since that's how they get symlinked.
  if (typeof pkgData.configData.bin === 'object') {
    return Object.keys(pkgData.configData.bin)
  }
  else {
    return [singleBinName(pkgData.configData.bin)]
  }
}

/** If a package's 'bin' is a string, it could be a path; e.g. 'bins/mybin.js'. Return only the bin name. */
const singleBinName = (binPath) => {
  const bits = binPath.split('/')
  return bits[bits.length - 1]
}

/** Removes an item from an array. */
const removeItem = (files, rem) => {
  const remIdx = files.indexOf(rem)
  if (remIdx > -1) {
    files.splice(remIdx, 1)
  }
  return files
}

/** Returns a list of text files. */
const getDocs = path => {
  const files = readdirSync(path)

  // Sort the text files so that the readme is on top.
  const docs = (filterFiles(files, ['md', 'rst', 'txt'])
    .sort((a, b) => isReadme(a) ? -1 : isReadme(b) ? 1 : a > b) || [])

  // Little hack: remove requirements.txt from Python projects, since it's not a doc.
  return { docs: removeItem(docs, 'requirements.txt') }
}

/** Returns information on the Git repo state. */
const getCommit = () => {
  // Get a timestamp of the current commit in ISO and relative.
  const [commitDateISO, commitDateRel] = execCmd('git log -n 1 --format=format:"%ai|%ar"; exit 0').split('|')
  return commitDateISO ? { commitDateISO, commitDateRel } : { commitDateISO: null, commitDateRel: null }
}

module.exports = {
  getDocs,
  getBins,
  getCommit
}
