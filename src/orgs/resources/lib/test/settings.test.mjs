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

// baseline snapshot; the regression test at the bottom of this file confirms no test in the
// suite left an enumerable own property on Object.prototype.
const baselineProtoKeys = Object.getOwnPropertyNames(Object.prototype)

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

describe('prototype pollution', () => {
  test.each([
    ['leading-dot __proto__ segment', '.__proto__.POLLUTED'],
    ['constructor.prototype segment', 'constructor.prototype.POLLUTED'],
    ['bare prototype segment', 'prototype']
  ])('updateSetting throws on %s: %p', (description, keyPath) => {
    expect(() => updateSetting({}, keyPath, 'x')).toThrow()
    expect(({}).POLLUTED).toBe(undefined)
  })

  test.each([
    ['leading-dot __proto__', '.__proto__'],
    ['bare constructor', 'constructor']
  ])('getSetting throws on %s: %p', (description, keyPath) => {
    expect(() => getSetting({}, keyPath)).toThrow()
  })

  test('Object.prototype gained no enumerable own property across the suite', () => {
    expect(Object.getOwnPropertyNames(Object.prototype)).toEqual(baselineProtoKeys)
  })
})
