/* global describe expect test */
import { getSetting, requireSetting, updateSetting } from '../settings'

const settings = {
  foo : 'bar',
  baz : {
    bing : 'bobo',
    blah : {
      fubar : 'blat'
    }
  },
  array : [1, 2, 3]
}

const getTests = [
  ['undefined key', undefined, undefined],
  ['root access', 'foo', 'bar'],
  ['root access (leading .)', '.foo', 'bar'],
  ['array value', 'array', [1, 2, 3]],
  ['nested value', 'baz.bing', 'bobo'],
  ['nested value (leading .)', '.baz.bing', 'bobo'],
  ['triple nested value', 'baz.blah.fubar', 'blat']
]

describe('getSettings', () => {
  test.each(getTests)('%s: %p -> %p', (description, keyPath, expectedValue) => {
    expect(getSetting(settings, keyPath)).toEqual(expectedValue)
  })

  test.each([
    ['foo'],
    ['baz.bing'],
    ['baz.blah.fubar']
  ])('allows env variables to override: %p', (keyPath) => {
    try {
      process.env[keyPath] = 'override value'
      expect(getSetting(settings, keyPath)).toBe('override value')
    }
    finally {
      delete process.env[keyPath]
    }
  })

  test('raises an exception on partial keys', () => expect(() => getSetting(settings, 'baz.blah')).toThrow())
})

describe('requireSetting', () => {
  test.each(getTests)('%s: %p -> %p', (description, keyPath, expectedValue) => {
    expect(requireSetting(settings, keyPath)).toEqual(expectedValue)
  })

  test('raises exception when no data', () => {
    expect(() => requireSetting(settings, 'barf')).toThrow(/No such setting 'barf'./)
  })

  test.each([
    ['foo'],
    ['baz.bing'],
    ['baz.blah.fubar']
  ])('allows env variables to override: %p', (keyPath) => {
    try {
      process.env[keyPath] = 'override value'
      expect(requireSetting(settings, keyPath)).toBe('override value')
    }
    finally {
      delete process.env[keyPath]
    }
  })

  test('raises an exception on partial keys', () => expect(() => requireSetting(settings, 'baz.blah')).toThrow())
})

describe('updateSetting', () => {
  test.each([
    ['replace root', 'foo'],
    ['replace root (leading .)', '.foo'],
    ['replace array', 'array'],
    ['relpace nested', 'baz.bing'],
    ['replace nested (leading .)', '.baz.bing'],
    ['replace triple nested', 'baz.blah.fubar'],
    ['create new root value', 'newRoot1'],
    ['create new root value (leading .)', '.newRoot2'],
    ['create nested value', 'nested1.nested2'],
    ['create nested value (leading .)', '.nestedA.nestedB'],
    ['create triple nested value (leading .)', 'triple1.triple2.triple3']
  ])('%s: %p with %p', (description, keyPath) => {
    const data = structuredClone(settings)
    updateSetting(data, keyPath, 'new value')
    expect(getSetting(data, keyPath)).toBe('new value')
  })

  test.each([
    {},
    undefined,
    null
  ])('refuses to store %p', (val) => expect(() => updateSetting({}, 'foo', val)).toThrow())
})
