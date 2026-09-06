const allCapsRe = /^[A-Z_]+$/

const listParameters = (org) => {
  const parameters = []
  const frontier = [{ path : '', struct : org.settings }]

  while (frontier.length > 0) {
    const { path, struct } = frontier.shift()

    for (const key in struct) {
      if (key.match(allCapsRe)) {
        parameters.push({ name : path + '.' + key, value : struct[key] })
      }
      else {
        frontier.push({ path : path + '.' + key, struct : struct[key] })
      }
    }
  }

  return parameters
}

export { listParameters }
