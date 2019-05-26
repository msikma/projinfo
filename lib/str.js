/** Limits the size of a string to a certain value and adds an ellipsis if shortened. */
const strLimitEl = (str, len, align = 'left') => {
	if (str.length <= len) return str
  const shortLen = len - 1
  return align === 'left'
    ? str.padEnd(shortLen).slice(0, shortLen) + '…'
    : str.padStart(shortLen).slice(0, shortLen) + '…'
}

/** Pads the size of a string to a certain value with spaces. */
const strPad = (str, size) => {
  return str + ' '.repeat(Math.max(size - str.length, 0))
}

/** Limits the size of a string, without ellipsis. */
const strLimit = (str, len, align = 'left') => (
  align === 'left'
    ? str.padEnd(len).slice(0, len)
    : str.padStart(len).slice(0, len)
)

module.exports = {
  strLimitEl,
  strPad,
  strLimit
}
