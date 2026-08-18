/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import { handlers, setup } from '../index'
import { handlers as projectsHandlers } from '../projects'

describe('dev-core plugin entry point', () => {
  test('handlers is an array', () => {
    expect(Array.isArray(handlers)).toBe(true)
  })

  test('setup is a function', () => {
    expect(typeof setup).toBe('function')
  })

  test('handlers is a fresh array carrying every wired submodule\'s handlers', () => {
    // Update this expectation as each further submodule is wired in. The aggregator must build
    // a fresh array rather than alias a submodule's own, or two submodules pushing into a
    // shared array would corrupt each other.
    expect(handlers).toEqual([...projectsHandlers])
    expect(handlers).not.toBe(projectsHandlers)
  })

  describe('setup', () => {
    let playgroundPath
    let priorPlayground

    beforeAll(async() => {
      priorPlayground = process.env.PLUGABLE_PLAYGROUND
      playgroundPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'dev-core-setup-test-'))
      process.env.PLUGABLE_PLAYGROUND = playgroundPath
    })

    afterAll(async() => {
      if (priorPlayground === undefined) delete process.env.PLUGABLE_PLAYGROUND
      else process.env.PLUGABLE_PLAYGROUND = priorPlayground
      await fs.rm(playgroundPath, { force : true, recursive : true })
    })

    test("runs the projects submodule's setup and populates app.ext._liqProjects", async() => {
      const registeredPathVars = []
      const app = { ext : { credentialsDB : { registerCredentialType : () => {} } } }
      const setupArgs = {
        app,
        cache            : {},
        reporter         : { log : () => {} },
        registerPathVar  : (name) => { registeredPathVars.push(name) },
        serverConfigRoot : {}
      }

      await expect(setup(setupArgs)).resolves.toBeUndefined()

      // `_liqProjects` is the exact key name external consumers (liq-controls,
      // liq-integrations-issues-github) read; it is frozen by
      // docs/dev-core-consolidation-contract.md#appext-contract-freeze.
      expect(Object.keys(app.ext)).toContain('_liqProjects')
      expect(app.ext._liqProjects.playgroundPath).toBe(playgroundPath)
      expect(app.ext._liqProjects.playgroundMonitor).toBeDefined()
      expect(registeredPathVars).toEqual(['newProjectName', 'projectName'])
    })
  })
})
