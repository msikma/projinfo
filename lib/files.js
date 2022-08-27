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
  const re = new RegExp(`.*\\.(${types.join('|')})$`, 'gi')
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

/** Cleans up a branch name string from Git. */
const cleanBranch = (branch = '') => (
  branch.replace(/^heads\//, '')
)

/** Returns information on the Git repo state. */
const getCommit = (quickCall = false) => {
  let commitLog
  try {
    // Get a timestamp of the current commit in ISO and relative, branch.
    commitLog = execCmd('git log -n 1 --format=format:"%ai|%ar|%h"')
  }
  catch (err) {
    // If the repo exists but doesn't have any commits yet, skip the rest.
    // We'll mark this as having no commits.
    if (~err.stderr.indexOf('does not have any commits yet')) {
      return {
        commitExistsButIsEmpty: true,
        commitIsInitial: false,
        commitDateISO: null,
        commitDateRel: null,
        commitHash: null,
        commitBranch: null,
        commitCommits: null
      }
    }
  }

  // If this call failed, Git must be unavailable. Skip the other calls if so.
  if (!commitLog) {
    return {
      commitExistsButIsEmpty: false,
      commitIsInitial: false,
      commitDateISO: null,
      commitDateRel: null,
      commitHash: null,
      commitBranch: null,
      commitCommits: null
    }
  }

  const [commitDateISO, commitDateRel, commitHash] = commitLog.split('|')

  // If we only want the basics, return now instead of doing two other external calls.
  if (quickCall) {
    return {
      commitIsInitial: false,
      commitDateISO,
      commitDateRel,
      commitHash,
      commitBranch: null,
      commitCommits: null
    }
  }

  // Get information on the branch and number of commits.
  const commitBranch = cleanBranch(execCmd('git describe --all; exit 0').trim())
  const commitCommits = execCmd('git rev-list HEAD --count; exit 0').trim()
  // This is the initial commit if the branch is 'master' and the count is '1'.
  const commitIsInitial = commitBranch === 'master' && commitCommits === '1'

  return {
    commitIsInitial,
    commitDateISO,
    commitDateRel,
    commitHash,
    commitBranch,
    commitCommits
  }
}

module.exports = {
  getDocs,
  getBins,
  getCommit
}
