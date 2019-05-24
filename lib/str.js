/** Limits the size of a string to a certain value and adds an ellipsis if shortened. */
const strLimitEl = (str, size) => {
	if (str.length <= size) return str
	return str.slice(0, size - 1) + '…'
}

/** Pads the size of a string to a certain value with spaces. */
const strPad = (str, size) => {
  return str + ' '.repeat(Math.max(size - str.length, 0))
}

/** Limits the size of a string, without ellipsis. */
const strLimit = (str, len) => (
  str.padEnd(len).slice(0, len)
)

module.exports = {
  strLimitEl,
  strPad,
  strLimit
}
