/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import { handlers, setup } from '../index'
import { handlers as projectsHandlers } from '../projects'
import { handlers as orgsHandlers } from '../orgs'
import { handlers as workHandlers } from '../work'

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
    expect(handlers).toEqual([...projectsHandlers, ...orgsHandlers, ...workHandlers])
    expect(handlers).not.toBe(projectsHandlers)
    expect(handlers).not.toBe(orgsHandlers)
    expect(handlers).not.toBe(workHandlers)
  })

  test('no (method, path) pair is registered twice across the merged handlers array', () => {
    // A duplicate is a hard startup crash, not a silent shadow: plugable-express's
    // `processCommandPath` throws `Non-unique command path: <path>`. The fresh merged array is
    // exactly where an accidental duplicate would appear.
    const pairs = handlers.flatMap(({ method, path, paths }) =>
      (paths || [path]).map((p) => `${(method || 'GET').toUpperCase()} ${JSON.stringify(p)}`))
    expect(pairs).toHaveLength(handlers.length)
    expect(new Set(pairs).size).toBe(pairs.length)
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

    test("runs the projects, orgs, and work submodules' setup, in order, and populates their app.ext contracts", async() => {
      const registeredPathVars = []
      const registeredPathVarOptions = {}
      const serverConfigRoot = fsPath.join(playgroundPath, 'server-config')
      const app = {
        ext : {
          constants     : {},
          credentialsDB : { registerCredentialType : () => {} },
          serverConfigRoot,
          setupMethods  : []
        }
      }
      const setupArgs = {
        app,
        cache           : {},
        reporter        : { log : () => {} },
        registerPathVar : (name, options) => {
          registeredPathVars.push(name)
          registeredPathVarOptions[name] = options
        },
        serverConfigRoot
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
      expect(registeredPathVars).toEqual([
        'newProjectName', 'projectName', 'newOrgKey', 'orgKey', 'workKey'
      ])
      // No path-var name may be registered twice: plugable-express's `registerPathVar` throws
      // `Path variable '<name>' is already registered.` on a duplicate, which is a hard startup
      // crash. (`parameterKey` is registered by an `orgs` handler's `func` at route-registration
      // time rather than from any `setup`, so it is deliberately absent from this set.)
      expect(new Set(registeredPathVars).size).toBe(registeredPathVars.length)
      expect(app.ext.setupMethods.map(({ name, deps }) => ({ name, deps }))).toEqual([
        { name : 'prepare org dependencies', deps : ['!'] },
        { name : 'load orgs', deps : undefined },
        { name : 'process org setup', deps : ['*'] }
      ])

      // Assert the exact `_liqOrgs` key name (D7/the contract freeze) and its initial shape,
      // by invoking the first deferred setup method the way the server's DependencyRunner would.
      app.ext.setupMethods[0].func({ app })
      expect(app.ext._liqOrgs).toEqual({ orgSetupMethods : [] })

      // `work`'s setup ran third. Both of the things it does are frozen by
      // docs/dev-core-consolidation-contract.md#appext-contract-freeze: the exact
      // `app.ext.constants.WORK_DB_PATH` key path, and the `workKey` path var's `validationRe`.
      // The `optionsFetcher` is a lazily-invoked closure -- it constructs a `WorkDB` only when
      // the framework calls it, so it reads nothing at setup time.
      expect(app.ext.constants.WORK_DB_PATH)
        .toBe(fsPath.join(serverConfigRoot, 'work', 'work-db.yaml'))
      expect(registeredPathVarOptions.workKey.validationRe)
        .toBe('work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+')
      expect(typeof registeredPathVarOptions.workKey.optionsFetcher).toBe('function')
    })
  })
})
