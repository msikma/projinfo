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
const { getPkgData, getMonorepoData } = require('./lib/readcfg')
const { getDocs, getBins, getCommit } = require('./lib/files')
const { strLimit } = require('./lib/str')

// Vertical line: U+2502 BOX DRAWINGS LIGHT VERTICAL
const LINE = ' \u2502 '

/**
 * Main script entry point. Reads data from the current directory and prints project info.
 * Currently only Node packages are supported.
 */
const main = () => {
  // Load basic project info from JSON files.
  const cwd = process.cwd()
  const pkgData = getPkgData(cwd)

  // Exit if we couldn't find any project info to print.
  if (!pkgData.isValid) return

  // If this is a valid project, read the rest of the data and print the project overview.
  const projectData = {
    ...pkgData,
    ...getMonorepoData(cwd, pkgData),
    ...getDocs(cwd),
    ...getBins(pkgData),
    ...getCommit()
  }
  return reportNodeProject(projectData, LINE)
}

/** Prints project overview for a Node project. */
const reportNodeProject = (projectData, separator) => {
  const { commitDateISO, commitDateRel, allPackages, docs, bins, packageManager, isMonorepo, monorepoType } = projectData
  const { name, version, description, homepage, scripts } = projectData.configData

  // Fall back to the Lerna version if the package doesn't have one.
  const lernaVersion = projectData.lernaData ? projectData.lernaData.version : 'unknown'

  // Print the header and last commit info if available.
  printHeader(name, version || lernaVersion, description, homepage, commitDateISO, commitDateRel)

  // Now print the package scripts, binaries and doc files.
  printTable(getNodeColumns(allPackages || [], scripts || [], bins || [], docs, packageManager, isMonorepo, monorepoType, separator))
}

/** Returns a list of what items to print in the three columns. */
const getNodeColumns = (packages, scripts, bins, docs, packageManager, isMonorepo, monorepoType, separator) => {
  const shortCol = isMonorepo ? monorepoType.length : packageManager.length
  const longCol = 23

  const mono = monorepoType
  const monopkg = `bootstrap (${packages.length} packages)`

  if (mono) {
    printMonoRow([mono, shortCol], [monopkg], chalk.blue, separator)
  }
  printMonoRow([packageManager, shortCol], [], chalk.yellow, separator)
  console.log(monopkg)
  return
  console.log(packages, scripts, bins, docs, packageManager, isMonorepo, monorepoType)
}

const printMonoRow = (shortCol, longCols, color, separator) => {
  console.log(color(strLimit(...shortCol), separator, longCols.join(separator), separator))
}

/**
 * Prints the main project info table, consisting of project packages, scripts, bin and doc files.
 * The table specification looks something like this:
 *
 *    {
 *      // Width of the short column on the left.
 *      shortCol: 10,
 *      // Width of the other columns.
 *      longCol: 20,
 *      rows: [
 *        { color: 'blue', cols: ['lerna', 'bootstrap (20 packages)'] },
 *        { color: 'yellow', cols: ['yarn', 'run', 'bin', 'doc'] }
 *      ]
 *    }
 *
 * asdf
 */
const printTable = (tableSpec, ) => {

}

/**
 * Prints a project header with basic package info and commit date. E.g.:
 *
 *    project-name (1.0.0) <https://github.com/foo/bar>
 *    Project description goes here
 *    2018-12-13 18:19:38 +0100 (4 months ago)
 *
 * Includes leading and trailing linebreaks.
 */
const printHeader = (name, version, description, homepage, dateISO, dateRel) => {
  console.log([
    `\n`,
    chalk.red(name),
    version ? chalk.magenta(` (${version})`) : ``,
    homepage ? chalk.blue('<', chalk.underline(homepage), '>') : ``,
    description ? `\n${chalk.green(description)}` : ``,
    dateISO ? `\n${chalk.yellow(`Last commit: ${dateISO} (${dateRel})`)}` : ``,
    '\n'
  ].join(''))
}

// Run main entry point.
main()
