/* global beforeAll describe expect test */
import * as fsPath from 'node:path'

import { Controls } from '../controls'

describe('Controls', () => {
  let controls

  beforeAll(async() => {
    const controlsDir = fsPath.join(__dirname, 'data', 'orgRootA', 'data', 'org', 'controls')

    const reporterMock = { log : () => {} }

    controls = await Controls.load(controlsDir, reporterMock)
  })

  test('load() loads controls from an org dir', () => {
    expect(controls).toBeTruthy()
    expect(controls.list()).toHaveLength(1)
  })

  test('getControl() finds the loaded control', () => {
    expect(controls.getControl('test-controls')).toBeTruthy()
  })
})
