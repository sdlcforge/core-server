const checkValue = (value, invalidMsg, noArray = false) => {
  const type = typeof value
  switch (type) {
  case 'boolean':
  case 'number':
  case 'string':
    return true
  default:
  }

  if (Array.isArray(value) && noArray === false) {
    for (const val of value) {
      checkValue(val, invalidMsg, true /* disallow nested arrays */)
    }
    return true
  }
  throw new Error(invalidMsg)
}

const getSetting = (data, keyPath) => {
  if (keyPath === undefined || keyPath === null) {
    return undefined
  }

  if (keyPath.startsWith('.') === true) {
    keyPath = keyPath.slice(1)
  }

  // check for process override
  let value = process.env[keyPath]
  if (value !== undefined) {
    checkValue(value, 'Data key is incomplete; all keys must lead to a simple value or array of simple values.')
    return structuredClone(value)
  }
  // else, follow the path

  value = data
  const pathBits = keyPath.split('.')

  for (const key of pathBits) {
    if (key in value) {
      value = value[key]
    }
    else {
      return undefined
    }
  }
  checkValue(value, 'Data key is incomplete; all keys must lead to a leaf.')
  return structuredClone(value)
}

const updateSetting = (data, keyPath, value) => {
  checkValue(value, 'Setting values are limited to primitive data and arrays of primitive data.')

  if (keyPath.startsWith('.')) keyPath = keyPath.slice(1)

  return keyPath.split('.').reduce((workingData, key, i, arr) => {
    if ((i + 1) === arr.length) {
      workingData[key] = value
      return value
    }
    else {
      if (!(key in workingData)) {
        workingData[key] = {}
      }
      return workingData[key]
    }
  }, data)
}

const requireSetting = (data, key) => {
  if (key === undefined) {
    return undefined
  }

  const value = getSetting(data, key)
  if (value === undefined) {
    throw new Error(`No such setting '${key}'.`)
  }
  return value
}

export { getSetting, requireSetting, updateSetting }
