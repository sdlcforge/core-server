const RESERVED_KEY_SEGMENTS = ['__proto__', 'constructor', 'prototype']

// Rejects any key path whose '.'-split segments would traverse or write onto the prototype chain
// (e.g. '__proto__', 'constructor', 'prototype'). Own-property checks alone are not sufficient
// because 'workingData['__proto__'] = {}' still mutates the prototype rather than creating an own
// property, so reserved segments are rejected outright rather than sanitized.
const checkKeyPath = (keyPath) => {
  for (const segment of keyPath.split('.')) {
    if (RESERVED_KEY_SEGMENTS.includes(segment)) {
      throw new Error(`Key path segment '${segment}' is reserved and cannot be used.`)
    }
  }
}

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

  checkKeyPath(keyPath)

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
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) {
      return undefined
    }
    value = value[key]
  }
  checkValue(value, 'Data key is incomplete; all keys must lead to a leaf.')
  return structuredClone(value)
}

const updateSetting = (data, keyPath, value) => {
  checkValue(value, 'Setting values are limited to primitive data and arrays of primitive data.')

  if (keyPath.startsWith('.')) keyPath = keyPath.slice(1)

  checkKeyPath(keyPath)

  return keyPath.split('.').reduce((workingData, key, i, arr) => {
    if ((i + 1) === arr.length) {
      workingData[key] = value
      return value
    }
    else {
      if (!Object.hasOwn(workingData, key)) {
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
