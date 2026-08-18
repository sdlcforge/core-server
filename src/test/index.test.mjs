/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import { handlers, setup } from '../index'
import { handlers as projectsHandlers } from '../projects'
import { handlers as orgsHandlers } from '../orgs'

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
    expect(handlers).toEqual([...projectsHandlers, ...orgsHandlers])
    expect(handlers).not.toBe(projectsHandlers)
    expect(handlers).not.toBe(orgsHandlers)
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

    test("runs the projects and orgs submodules' setup, in order, and populates their app.ext contracts", async() => {
      const registeredPathVars = []
      const app = {
        ext : {
          credentialsDB : { registerCredentialType : () => {} },
          setupMethods  : []
        }
      }
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

      // `orgs`' own setup is synchronous and defers its real work onto `app.ext.setupMethods`
      // (drained later by the server's DependencyRunner) rather than running it inline here --
      // see docs/dev-core-consolidation-contract.md#composite-setup-ordering. Confirming
      // `_liqProjects` is already populated by the time `orgs` runs is what proves the fixed
      // `projects`-then-`orgs` order actually held.
      expect(registeredPathVars).toEqual(['newProjectName', 'projectName', 'newOrgKey', 'orgKey'])
      expect(app.ext.setupMethods.map(({ name, deps }) => ({ name, deps }))).toEqual([
        { name : 'prepare org dependencies', deps : ['!'] },
        { name : 'load orgs', deps : undefined },
        { name : 'process org setup', deps : ['*'] }
      ])

      // Assert the exact `_liqOrgs` key name (D7/the contract freeze) and its initial shape,
      // by invoking the first deferred setup method the way the server's DependencyRunner would.
      app.ext.setupMethods[0].func({ app })
      expect(app.ext._liqOrgs).toEqual({ orgSetupMethods : [] })
    })
  })
})
