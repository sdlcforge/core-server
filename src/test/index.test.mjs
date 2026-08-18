/* global describe expect test */
import { handlers, setup } from '../index'

describe('dev-core plugin entry point', () => {
  test('handlers is an array', () => {
    expect(Array.isArray(handlers)).toBe(true)
  })

  test('setup is a function', () => {
    expect(typeof setup).toBe('function')
  })

  test('setup resolves without throwing and does not corrupt app.ext', async() => {
    const app = { ext : {} }
    const setupArgs = {
      app,
      cache            : {},
      reporter         : { log : () => {} },
      registerPathVar  : () => {},
      serverConfigRoot : {}
    }

    await expect(setup(setupArgs)).resolves.toBeUndefined()
    // No submodules are wired in yet, so setup must be a true no-op with respect to app.ext.
    expect(app.ext).toEqual({})
  })
})
