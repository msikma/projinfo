const asyncFilter = async (arr, predicate) => {
  const results = await Promise.all(arr.map(predicate))
  return arr.filter((_, index) => results[index])
}

module.exports = {
  asyncFilter
}
