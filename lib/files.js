const { readdirSync, readFileSync } = require('fs')
const { execCmd } = require('./exec')

/** Returns whether a file is a readme (used to sort it at the top of the list). */
const isReadme = f => f.split('.').shift().toLowerCase() === 'readme'

/** Returns the binaries indicated in the project metadata. */
const getBins = (pkgData) => {
  if (!pkgData || !pkgData.configData) return []
  const bins = pkgData.configData.bin
  return bins ? { bins: Object.keys(bins) } : {}
}

/** Returns a list of Markdown files. */
const getDocs = path => {
  const files = readdirSync(path)

  // Sort the Markdown files so that the readme is on top.
  const docs = (files.filter((f) => /.*\.(md|rst|txt)/gi.test(f))
    .sort((a, b) => isReadme(a) ? -1 : isReadme(b) ? 1 : a > b) || [])

  // Little hack: remove requirements.txt from Python projects, since it's not a doc.
  const reqTxt = docs.indexOf('requirements.txt')
  if (reqTxt > -1) {
    docs.splice(reqTxt, 1)
  }
  return { docs }
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
