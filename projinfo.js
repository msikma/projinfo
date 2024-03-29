#!/usr/bin/env node

// Displays some basic information about the project in this directory.
//
// Example output:
//
//    msikma-lib-projects (1.0.0) <https://github.com/msikma/msikma-lib-projects>
//    Monorepo container for msikma-lib-projects, containing a number of client libraries
//    Last commit: 2018-10-14 22:29:35 +0200 (63 minutes ago)
//
//    lerna | bootstrap (20 packages) |
//     yarn │ run compile             │ bin buyee-cli           │ doc readme.md
//          │     dev                 │     marktplaats-cli     │     license.md
//          │                         │     mlib                │     todo.md
//
// See the readme.md file for setting up a trigger so this runs automatically on dir change.

const chalk = require('chalk')
const { getPkgData, getMonorepoData, getZeitData } = require('./lib/readcfg')
const { getDocs, getBins, getCommit } = require('./lib/files')
const { strLimit } = require('./lib/str')

// Vertical line: U+2502 BOX DRAWINGS LIGHT VERTICAL
const LINE = ' \u2502 '

// Pretty names for the type slugs.
const TYPES = {
  python: 'Python',
  php: 'PHP',
  node: 'Node'
}

/**
 * Main script entry point. Reads data from the current directory and prints project info.
 * Currently only Node packages are supported.
 */
const main = async () => {
  // Load basic project info from JSON files.
  const cwd = process.cwd()
  const pkgData = getPkgData(cwd)
  //console.log(pkgData)

  // Exit if we couldn't find any project info to print.
  if (!pkgData.isValid) return

  // If this is a valid project, read the rest of the data and print the project overview.
  const projectData = {
    ...pkgData,
    details: {
      ...getZeitData(cwd)
    },
    ...getMonorepoData(cwd, pkgData),
    ...getDocs(cwd),
    ...await getBins(cwd, pkgData),
    ...getCommit()
  }
  return reportProject(projectData, LINE)
}

/** Prints project overview. */
const reportProject = (projectData, separator) => {
  const { commitDateISO, commitDateRel, commitBranch, commitCommits, commitIsInitial, commitExistsButIsEmpty, type, otherFiles, allPackages, docs, bins, packageManager, isMonorepo, monorepoType, details } = projectData
  const { name, version, pythonVersion, description, homepage, scripts } = projectData.configData

  // Fall back to the Lerna version if the package doesn't have one.
  const lernaVersion = projectData.lernaData ? projectData.lernaData.version : null

  // Print the header and last commit info if available.
  printHeader(name, version || lernaVersion, type, pythonVersion, description, homepage, commitDateISO, commitDateRel, commitBranch, commitCommits, commitIsInitial, commitExistsButIsEmpty, details)

  // Now print the package scripts, binaries and doc files.
  const rows = getColumns(allPackages || [], scripts ? Object.keys(scripts) : [], bins || [], docs, type, packageManager, otherFiles, pythonVersion, isMonorepo, monorepoType, details)
  if (rows.length) {
    printTable(rows, separator)
    // Finally, end with one extra blank line.
    console.log('')
  }
}

/** Returns a list of what items to print in the three columns. */
const getColumns = (packages, scripts, bins, docs, type, packageManager, otherFiles, pythonVersion, isMonorepo, monorepoType, details) => {
  const rows = []
  // In cases where more details about the package manager are needed,
  // for example in a monorepo, the package manager name will not
  // be printed on the first command row.
  let addPackageManager = true

  if (packageManager === 'python') {
    if (otherFiles['requirements.txt']) {
      rows.push([
        chalk.blue,
        'head',
        `pip${pythonVersion === 3 ? '3' : ''}`,
        `install -r requirements.txt`
      ])
      addPackageManager = false
    }
    else if (otherFiles['setup.py']) {
      rows.push([
        chalk.blue,
        'head',
        `python${pythonVersion === 3 ? '3' : ''}`,
        `setup.py install`
      ])
      addPackageManager = false
    }
    else if (otherFiles['setup.cfg']) {
      rows.push([
        chalk.blue,
        'head',
        `pip${pythonVersion === 3 ? '3' : ''}`,
        `install -e .`
      ])
      addPackageManager = false
    }
  }

  if (packageManager === 'php') {
    if (otherFiles['composer.json']) {
      rows.push([
        chalk.blue,
        'head',
        `composer`,
        `install`
      ])
      addPackageManager = false
    }
  }

  if (type === 'node') {
    if (isMonorepo) {
      rows.push([
        chalk.blue,
        'head',
        monorepoType,
        `${monorepoType === 'yarn' ? 'install' : 'bootstrap'} (${packages.length} packages)`
      ])
      addPackageManager = false
    }
    if (details.isNow) {
      rows.push([
        chalk.blue,
        'head',
        'now',
        'deploy'
      ])
      rows.push([
        chalk.blue,
        'head',
        '',
        'dev'
      ])
      addPackageManager = true
    }
  }

  // Determine the longest list out of run, bin, doc.
  const longest = [scripts, bins, docs].reduce((max, curr) => Math.max(max, curr.length), 0)

  // Create the column lists. Missing items are set to null.
  for (let a = 0; a < longest; ++a) {
    const run = scripts[a]
    const bin = bins[a]
    const doc = docs[a]
    rows.push([chalk.yellow, 'cmd', addPackageManager && a === 0 ? packageManager : '', run ? run : null, bin ? bin : null, doc ? doc : null])
  }

  return rows
}

/** Returns the prefix to use for a long column. */
const _colPrefix = (n, first, header) => {
  if (header) return ''
  if (!first) return '    '
  if (n === 0) return 'run '
  if (n === 1) return 'bin '
  if (n === 2) return 'doc '
}

/** Returns the color function to use for a long column. */
const _colColor = (n) => {
  if (n === 0) return chalk.blue
  if (n === 1) return chalk.magenta
  if (n === 2) return chalk.red
}

/** Prints a single row. */
const printRow = (smallCol, smallColLength, largeCols, largeColLength, first, header, color, separator) => {
  const small = color(strLimit(smallCol ? smallCol : '', smallColLength, 'right'))
  const large = largeCols.map((c, n) => `${color(_colPrefix(n, first, header))}${_colColor(n)(strLimit(c ? c : (first ? '-' : ''), header ? largeColLength : largeColLength - 4, 'left'))}`)

  // Add an extra separator if this is a header with one column.
  const extraSeparator = header && largeCols.length === 1

  const separatorColor = color(`${separator}`)
  const cols = [small, ...large]
  const str = cols.join(separatorColor) + `${extraSeparator ? separatorColor : ''}`

  console.log(`${str}`)
}

/**
 * Prints the main project info table, consisting of project packages, scripts, bin and doc files.
 *
 * The table is printed using a table specification, which is produced by getColumns().
 * It has header rows and command rows. It should look like the following:
 *
 * [
 *   [chalk.blue, 'head', 'yarn', 'install (20 packages)']
 *   [chalk.yellow, 'cmd', '', 'compile', 'buyee-cli', 'readme.md'],
 *   [chalk.yellow, 'cmd', '', 'dev', 'marktplaats-cli', 'license.md'],
 *   [chalk.yellow, 'cmd', '', null, 'mlib', 'todo.md']
 * ]
 *
 * Null values are a dash if they appear on the first line, an empty string otherwise.
 * The column prefixes (run, bin, doc) are added automatically.
 */
const printTable = (rows, separator) => {
  const smallMin = 3
  const largeMin = 23
  // Calculate the lengths of the columns. Defaults are 3 and 23 (not counting padding).
  const smallColLength = rows.reduce((l, curr) => Math.max((curr[2] || '').length, l), smallMin)
  const largeColLength = rows.reduce((l, curr) => Math.max((curr[3] || '').length, (curr[4] || '').length, (curr[5] || '').length, l), largeMin)

  let firstCmd = true
  for (let a = 0; a < rows.length; ++a) {
    const row = rows[a]
    const color = row[0]
    const isHead = row[1] === 'head'
    const small = row[2]
    const large = row.slice(3)
    printRow(small, smallColLength, large, largeColLength, firstCmd, isHead, color, separator)
    if (!isHead && firstCmd) firstCmd = false
  }
}

/**
 * Prints a project header with basic package info and commit date. E.g.:
 *
 *    project-name (1.0.0, Python) <https://github.com/foo/bar>
 *    Project description goes here
 *    2018-12-13 18:19:38 +0100 (4 months ago)
 *    Deployment alias: nextjs-mysql.now.sh
 *
 * Includes leading and trailing linebreaks. Sections that are not relevant for
 * a specific project are not included.
 */
const printHeader = (name, version, type, typeVersion, description, homepage, dateISO, dateRel, branch, commits, isInitial, isEmpty, details) => {
  const typeString = [
    ...(version ? [version] : []),
    ...(type ? [`${TYPES[type]}${typeVersion ? ` ${typeVersion}` : ''}`] : [])
  ].join(', ')
  const commitString = [
    ...(branch ? [`Branch: ${branch}-${commits}${isInitial ? chalk.yellowBright(' (initial commit)') : ''}`] : []),
    `${branch ? 'l' : 'L'}ast commit: ${dateISO} (${dateRel})`
  ].join('; ')
  console.log([
    `\n`,
    name ? chalk.red(name) : 'Unknown project',
    version || type ? chalk.magenta(` (${typeString})`) : ``,
    homepage ? chalk.blue(` <${chalk.underline(homepage)}>`) : ``,
    description ? `\n${chalk.green(description)}` : ``,
    isEmpty && !dateISO ? `\n${chalk.yellowBright('Git repo exists but has no commits')}` : ``,
    dateISO ? `\n${chalk.yellow(commitString)}` : ``,
    details.isNow && details.nowAlias ? `\n${chalk.blue(`Deployment alias: ${details.nowAlias}`)}` : ``,
    '\n'
  ].join(''))
}

// Run main entry point.
main()
