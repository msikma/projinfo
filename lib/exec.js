const { execSync } = require('child_process')

/** Executes an external command and returns the result string (and hides stderr). */
const execCmd = cmd => execSync(cmd, { encoding: 'utf8', stdio: 'pipe' })

module.exports = {
  execCmd
}
