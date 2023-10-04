/* global describe expect test */

import { name, summary } from '../index'

describe('root index.js', () => {
  test('defines name and summary', () => {
    expect(name).toBeTruthy()
    expect(summary).toBeTruthy()
  })
})
