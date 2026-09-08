/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import request from 'supertest'

import { Reporter } from '@liquid-labs/plugable-express'

import * as controls from '../../controls'
import * as credentials from '../../credentials'
import * as issuesGitHub from '../../integrations-issues-github'
import * as orgs from '../../orgs'
import * as projects from '../../projects'
import * as projectsAudit from '../../projects-audit'
import * as work from '../../work'
import { appInit } from '../app-init'
import { builtinPluginsFor, handlers as builtinHandlers, summary as builtinSummary } from '../builtin-plugins'
import {
  createProbePlugin,
  createSentinelPlugin,
  PROBE_NPM_NAME,
  PROBE_PATH_VAR,
  PROBE_SETUP_METHOD_NAME,
  PROBE_SUMMARY,
  PROBE_THROWN_MESSAGE,
  PROBE_VERSION,
  SENTINEL_NPM_NAME
} from './fixtures/probe-plugin'

// The framework builds the `setup()` argument object at exactly one call site
// (`registerPluginModule`), shared by the npm-package load path and the `builtinPlugins` path.
// These are its five members, sorted.
const EXPECTED_SETUP_ARG_KEYS = ['app', 'cache', 'registerPathVar', 'reporter', 'serverConfigRoot']

// Reduces an error response to its shape: status, content-type, and the structure of the body
// `plugable-express`' own error middleware renders (a banner section, a message section, and an
// error-reference section). The message and the random 5-character error id are normalized away,
// since only the *shape* is being compared between two different errors.
const errorShape = ({ status, headers, text }) => {
  const sections = text.split('\n\n')

  return {
    status,
    contentType  : headers['content-type'],
    sectionCount : sections.length,
    banner       : sections[0],
    errorRefLine : sections[sections.length - 1].replace(/[a-z0-9]{5}$/, '<liqID>')
  }
}

const makeTempDir = (prefix) =>
  fsPath.join(os.tmpdir(), prefix + Math.round(Math.random() * 10000000000000000))

// The absorbed submodules currently wired into `builtin-plugins.mjs`' `submodules` array, in the
// same dependency (DAG) order -- the array below is the order-bearing statement; the prose that
// follows enumerates all seven by donor, not by array position. `src/credentials/`, absorbed from
// `@liquid-labs/liq-credentials` by phase-05 task 002; `src/controls/`, from
// `@liquid-labs/liq-controls` by phase-05 task 001; `src/integrations-issues-github/`, from
// `@liquid-labs/liq-integrations-issues-github` by phase-05 task 003; and `src/projects/`,
// `src/orgs/`, `src/work/`, `src/projects-audit/`, absorbed from the `sdlcforge` `dev-core`
// package. `issuesGitHub` contributes no `handlers` at all, which is exactly why the aggregation
// assertion below reads each submodule's own `handlers` (defaulting to `[]`) rather than assuming
// every submodule has some; `projectsAudit` is the mirror case, contributing `handlers` but no
// `setup` (which is what makes the aggregator's `setup?.()` optional call load-bearing).
//
// This list is a literal, not `builtin-plugins.mjs`' own exported `submodules`: an independent
// restatement is what lets the aggregation assertion below actually witness a wiring mistake
// rather than compare the implementation against itself.
const ABSORBED_SUBMODULES = [credentials, projects, orgs, controls, issuesGitHub, work, projectsAudit]

describe('builtin-plugins aggregator', () => {
  test('contributes exactly the absorbed submodules` own handlers, in submodule order', () => {
    expect(Array.isArray(builtinHandlers)).toBe(true)

    const expectedHandlers = ABSORBED_SUBMODULES.flatMap(({ handlers = [] }) => handlers)

    // Non-vacuous: at least one submodule is absorbed and it really does contribute routes, so
    // this cannot silently pass by comparing two empty arrays.
    expect(expectedHandlers.length).toBeGreaterThan(0)
    expect(builtinHandlers).toEqual(expectedHandlers)

    // Every aggregated entry is a real `plugable-express` handler module, not an accidental
    // namespace object picked up by a mis-shaped flatMap.
    for (const handler of builtinHandlers) {
      expect(Array.isArray(handler.path)).toBe(true)
      expect(typeof handler.func).toBe('function')
    }
  })

  test('`handlers` is a fresh array, not an alias of any submodule`s own handlers array', () => {
    // `builtin-plugins.mjs`' fact-1 comment names this exact hazard: two submodules pushing into
    // a shared array would corrupt each other. The `toEqual` aggregation assertion above covers
    // the merged-content half; this covers the identity half it does not.
    for (const submodule of ABSORBED_SUBMODULES) {
      expect(builtinHandlers).not.toBe(submodule.handlers)
    }
  })

  test('no `(method, path)` pair is registered twice across the merged handlers array', () => {
    // A duplicate is a hard startup crash, not a silent shadow: `plugable-express`'s
    // `processCommandPath` throws `Non-unique command path: <path>`. This is strictly more
    // valuable at seven components than it was at dev-core's four: the merged surface is larger,
    // and it now spans components that used to be separated by a package boundary.
    const pairs = builtinHandlers.flatMap(({ method, path, paths }) =>
      (paths || [path]).map((p) => `${(method || 'GET').toUpperCase()} ${JSON.stringify(p)}`))
    expect(pairs).toHaveLength(builtinHandlers.length)
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  test('the four `projects-audit` routes are registered, with their exact paths', () => {
    // The `projects-audit` suite (`audit-lib.test.js`) is a single placeholder assertion over one
    // pure function and cannot detect a handler regression, so the route surface is asserted here
    // instead. These routes mount under `/projects` alongside the `projects` submodule's own,
    // which is why the no-duplicate-pair test above is this assertion's companion rather than a
    // duplicate of it.
    const auditRoutes = builtinHandlers
      .filter(({ path }) => path?.[0] === 'projects' && /^audit/.test(path[path.length - 1]))
      .map(({ method, path }) => `${method.toUpperCase()} ${JSON.stringify(path)}`)
      .sort()
    expect(auditRoutes).toEqual([
      'GET ["projects",":projectName","audit"]',
      'GET ["projects","audit"]',
      'PUT ["projects",":projectName","audit-fix"]',
      'PUT ["projects","audit-fix"]'
    ])
  })

  test('`projects-audit` contributes handlers but no `setup`', () => {
    // `projects-audit` is the only one of the seven with no `setup` at all, and nothing may be
    // added to the composite setup list on its behalf -- not a placeholder, not a no-op. Assert
    // the absence at the source rather than inferring it from the composite `setup`'s behavior;
    // this is also what makes the aggregator's `submodule.setup?.(setupArgs)` optional call
    // load-bearing rather than defensive.
    expect(projectsAudit.setup).toBeUndefined()
    expect(projectsAudit.handlers).toHaveLength(4)
  })

  test('`builtinPluginsFor` produces exactly one entry carrying the supplied identity', () => {
    const entries = builtinPluginsFor({ npmName : '@example/host', version : '9.9.9' })

    expect(entries).toHaveLength(1)
    const [entry] = entries
    expect(entry.npmName).toBe('@example/host')
    expect(entry.version).toBe('9.9.9')
    expect(entry.summary).toBe(builtinSummary)
    expect(entry.module.handlers).toBe(builtinHandlers)
    expect(typeof entry.module.setup).toBe('function')
  })

  test('the composed `setup` awaits every absorbed submodule`s own setup and resolves undefined', async() => {
    const [{ module: { setup } }] = builtinPluginsFor({ npmName : '@example/host', version : '9.9.9' })

    // A minimal stand-in for the framework's `app` and its five-member `setup()` argument object
    // (`{ app, cache, reporter, registerPathVar, serverConfigRoot }`). What each member is here
    // for, since none of it is decorative:
    //
    // - `serverConfigRoot` must be a real, writable directory: `credentials`' setup `mkdir -p`s a
    //   subdirectory under it and constructs a `CredentialsDB` against it, and `work`'s setup
    //   joins `app.ext.serverConfigRoot` into `app.ext.constants.WORK_DB_PATH`. It is supplied
    //   both as a setup argument and on `app.ext`, exactly as the framework does.
    // - `app.ext.constants` must exist as a container: `work`'s setup writes a member into it
    //   rather than creating it.
    // - `registerPathVar` must be a real function: four of the seven submodules register path
    //   variables through it.
    // - `PLUGABLE_PLAYGROUND` isolation is mandatory, not cosmetic: `projects`' `setupPlayground()`
    //   otherwise defaults to `${HOME}/playground`, creates it, and hands it to a
    //   `PlaygroundMonitor` that scans it. Same rationale as `full-tier-baseline.test.js`.
    // - `cache` and `reporter` are forwarded because the framework forwards them; `credentials`'
    //   setup passes `cache` straight into its `CredentialsDB`. Neither is exercised at setup time
    //   by any of the seven today, so a silent no-op stand-in for `cache` is honest here.
    //
    // Asserting the enqueued `{name, deps}` pairs verbatim is the point of the `setupMethods` half
    // of this test -- `@liquid-labs/dependency-runner` matches `deps` by exact string, so
    // `load orgs` (contributed by the in-tree `orgs` submodule) and `setup integrations`
    // (contributed by `plugable-express`) are a cross-component and cross-package contract
    // respectively, not cosmetic labels. Renaming either resolves silently wrong in one direction
    // and loudly in the other. See `plan/resources/absorption-parity-contract.md` item 5.
    const serverConfigRoot = makeTempDir('comply-server-builtin-plugins-composed-setup-')
    const playgroundHome = makeTempDir('comply-server-builtin-plugins-composed-setup-playground-')
    await fs.mkdir(serverConfigRoot, { recursive : true })
    await fs.mkdir(playgroundHome, { recursive : true })

    const origPluggablePlayground = process.env.PLUGABLE_PLAYGROUND
    process.env.PLUGABLE_PLAYGROUND = playgroundHome

    // An ordered array plus a separate options map, deliberately NOT a single `{name: opts}` map:
    // `Object.keys()` over a map silently absorbs a duplicate registration (the second write just
    // overwrites the first), and the registration *sequence* is the one artifact that pins the
    // runtime component order. `parameterKey` is absent on purpose -- it is registered by an `orgs`
    // handler func at route-registration time, not from any submodule's `setup()`.
    const registeredPathVarOrder = []
    const registeredPathVarOptions = {}
    const registerPathVar = (name, opts) => {
      registeredPathVarOrder.push(name)
      registeredPathVarOptions[name] = opts
    }

    const app = { ext : { constants : {}, serverConfigRoot, setupMethods : [] } }
    const reporter = new Reporter({ silent : true })
    const cache = { get : () => undefined, put : () => {}, release : () => {} }

    try {
      await expect(setup({ app, cache, registerPathVar, reporter, serverConfigRoot }))
        .resolves.toBeUndefined()

      // In `submodules` order: `orgs`' three, then `controls`' two, then `issues-github`' one.
      // `credentials`, `projects`, `work`, and `projects-audit` enqueue none. `load orgs` carries
      // no `deps` key at all here (`src/orgs/setup.mjs` pushes it without one) -- an observed
      // value, not a transcription: `full-tier-baseline.test.js` records `deps: []` for the same
      // method because it normalizes through `[...(deps || [])]` before comparing, and this
      // harness reads the raw pushed object.
      expect(app.ext.setupMethods.map(({ name, deps }) => ({ name, deps }))).toEqual([
        { name : 'prepare org dependencies', deps : ['!'] },
        { name : 'load orgs', deps : undefined },
        { name : 'process org setup', deps : ['*'] },
        { name : 'load org controls', deps : ['load orgs'] },
        { name : 'load controls integrations', deps : ['setup integrations'] },
        { name : 'register github issues integrations', deps : ['setup integrations'] }
      ])

      // `credentials`' setup contract: installs `app.ext.credentialsDB` (the cross-component
      // contract name the in-tree `projects` and `work` submodules and
      // `src/integrations-issues-github/` all read) and registers the `credential` path variable
      // via the forwarded `registerPathVar`.
      expect(app.ext.credentialsDB).toBeDefined()
      expect(typeof app.ext.credentialsDB.listSupported).toBe('function')

      // The registration sequence, which is what pins the runtime component order: `credential`
      // from `credentials`, then `newProjectName`/`projectName` from `projects`, then
      // `newOrgKey`/`orgKey` from `orgs`, then `workKey` from `work`. This ordered array is the
      // ONLY artifact in the suite that pins `credentials -> projects -> orgs -> work` at runtime
      // -- `projects` before `orgs` in particular is invisible to the compile-time validator,
      // which scores it as a cross-phase edge with no order verdict at all. Do not "simplify" this
      // back into a set or a `{name: opts}` map: `Object.keys()` over a map silently absorbs a
      // duplicate registration (the second write just overwrites the first), which is exactly what
      // the dedupe check just below this one exists to catch.
      expect(registeredPathVarOrder).toEqual([
        'credential',
        'newProjectName',
        'projectName',
        'newOrgKey',
        'orgKey',
        'workKey'
      ])
      // No duplicate registration hid inside that sequence.
      expect(new Set(registeredPathVarOrder).size).toBe(registeredPathVarOrder.length)
      for (const name of registeredPathVarOrder) {
        expect(typeof registeredPathVarOptions[name].validationRe).toBe('string')
      }

      // `app.ext` contract-freeze checks, ported from the donor suite nearly verbatim.
      // `_liqProjects` is the exact key name external consumers (`controls`,
      // `integrations-issues-github`) read; it is frozen by the consolidation contract.
      expect(app.ext._liqProjects).toBeDefined()
      expect(app.ext._liqProjects.playgroundPath).toBe(playgroundHome)
      expect(app.ext._liqProjects.playgroundMonitor).toBeDefined()

      // Invoking the first enqueued setup method the way the server's `DependencyRunner` would
      // asserts the exact `_liqOrgs` key name and its initial shape, and confirms `orgs` defers
      // its real work onto `app.ext.setupMethods` rather than running it inline.
      app.ext.setupMethods[0].func({ app })
      expect(app.ext._liqOrgs).toEqual({ orgSetupMethods : [] })

      // `work`'s setup contract: the exact `app.ext.constants.WORK_DB_PATH` key path, and the
      // `workKey` path var's `validationRe`. `optionsFetcher` is a lazily-invoked closure that
      // constructs a `WorkDB` only when the framework calls it, so it reads nothing at setup time.
      expect(app.ext.constants.WORK_DB_PATH)
        .toBe(fsPath.join(serverConfigRoot, 'work', 'work-db.yaml'))
      expect(registeredPathVarOptions.workKey.validationRe)
        .toBe('work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+')
      expect(typeof registeredPathVarOptions.workKey.optionsFetcher).toBe('function')
    }
    finally {
      await fs.rm(serverConfigRoot, { recursive : true, force : true })
      await fs.rm(playgroundHome, { recursive : true, force : true })

      if (origPluggablePlayground === undefined) {
        delete process.env.PLUGABLE_PLAYGROUND
      }
      else {
        process.env.PLUGABLE_PLAYGROUND = origPluggablePlayground
      }
    }
  })
})

// The full-tier configuration: `skipCorePlugins` absent, so `loadBuiltinPlugins` actually runs.
// `PLUGABLE_PLAYGROUND` isolation and a temp `serverConfigRoot` mirror
// `full-tier-baseline.test.js`, the harness Phase 3 already proved works. The probe reaches
// `appInit` through the `builtinPlugins` option override -- but, unlike when only `controls` was
// absorbed, that override can no longer *replace* the real `@sdlcforge/core-server` entry
// wholesale: the `projects` submodule's own `setup()` calls `setupCredentials({
// credentialsDB: app.ext.credentialsDB })` at plugin-load time (see
// `plan/resources/absorption-parity-contract.md` item 8), so `app.ext.credentialsDB` must already
// be installed by the time it runs -- which is exactly what `credentials` sitting ahead of
// `projects` in `submodules` buys, and it only holds if the real entry is actually loaded.
// The override therefore *joins* the real absorbed submodules' own `builtinPlugins` entry
// alongside the probe's, rather than replacing it.
const REAL_BUILTIN_PLUGINS = builtinPluginsFor({ npmName : '@sdlcforge/core-server', version : '0.0.0-test' })
describe('builtinPlugins registration path, proven with a test-injected probe', () => {
  let app, cache, serverHome, playgroundHome, apiSpecPath, probe
  let origPluggablePlayground

  beforeAll(async() => {
    serverHome = makeTempDir('comply-server-builtin-probe-')
    playgroundHome = makeTempDir('comply-server-builtin-probe-playground-')
    await fs.mkdir(serverHome, { recursive : true })
    await fs.mkdir(playgroundHome, { recursive : true })
    apiSpecPath = fsPath.join(serverHome, 'probe-api.json')

    // Mandatory isolation: the `projects` submodule's `setupPlayground()` otherwise
    // defaults to `${HOME}/playground` and scans it. See `full-tier-baseline.test.js` for the
    // full rationale.
    origPluggablePlayground = process.env.PLUGABLE_PLAYGROUND
    process.env.PLUGABLE_PLAYGROUND = playgroundHome

    probe = createProbePlugin();

    ({ app, cache } = await appInit({
      serverConfigRoot : serverHome,
      apiSpecPath,
      builtinPlugins   : [...REAL_BUILTIN_PLUGINS, probe.builtinPluginsEntry],
      reporter         : new Reporter({ silent : true })
    }))
  })

  afterAll(async() => {
    cache?.release()
    await fs.rm(serverHome, { recursive : true, force : true })
    await fs.rm(playgroundHome, { recursive : true, force : true })

    if (origPluggablePlayground === undefined) {
      delete process.env.PLUGABLE_PLAYGROUND
    }
    else {
      process.env.PLUGABLE_PLAYGROUND = origPluggablePlayground
    }
  })

  test('the probe`s `setup` ran exactly once', () => {
    expect(probe.observed.setupCallCount).toBe(1)
  })

  test('`setup` received exactly the framework`s five-member argument object', () => {
    expect(probe.observed.setupArgKeys).toEqual(EXPECTED_SETUP_ARG_KEYS)
    expect(probe.observed.appIsExpressApp).toBe(true)
    expect(probe.observed.cacheIsDefined).toBe(true)
    expect(probe.observed.reporterIsDefined).toBe(true)
    expect(probe.observed.registerPathVarIsFunction).toBe(true)
    expect(probe.observed.serverConfigRootMatchesAppExt).toBe(true)
    expect(probe.observed.serverConfigRoot).toBe(serverHome)
    expect(probe.observed.appExtServerConfigRoot).toBe(serverHome)
  })

  test('`registerPathVar` accepted the probe`s path variable and its optionsFetcher', () => {
    expect(probe.observed.pathVarRegistered).toBe(true)
  })

  test('the setup method the probe enqueued ran to completion under DependencyRunner', () => {
    expect(probe.observed.setupMethodEnqueued).toBe(true)
    expect(app.ext.setupMethods.map(({ name }) => name)).toContain(PROBE_SETUP_METHOD_NAME)
    expect(probe.observed.setupMethodRan).toBe(true)
  })

  test('a probe route consuming the probe`s path variable is served successfully', async() => {
    const { status, headers, text } = await request(app)
      .get('/probe/alpha/echo')
      .set('Accept', 'text/plain')

    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/plain/)
    expect(text).toBe('alpha')
  })

  // The single most important assertion in this file. A builtin handler's thrown error must be
  // rendered by `plugable-express`' own error middleware, which is only possible because builtin
  // handlers land in `app.ext.pendingHandlers` and are drained *before* those two `app.use(...)`
  // layers are installed. Compared against a real error from an existing core route rather than
  // against a hand-written expectation, so the assertion tracks the server's own error shape
  // rather than a copy of it that can silently drift.
  test('a throwing probe route matches the server`s own error shape, per an existing core route', async() => {
    const probeError = await request(app)
      .get('/probe/boom')
      .set('Accept', 'text/plain')

    // An equivalent error from a core `plugable-express` route: the framework's own per-route
    // parameter middleware throws a plain `Error` (no `status`, therefore 500) on an unknown
    // query parameter, exactly as the probe's handler throws a plain `Error`.
    const coreError = await request(app)
      .get('/server/version?probeUnknownQueryParameter=1')
      .set('Accept', 'text/plain')

    // Non-vacuity: both really are errors, and each carries its own distinct message.
    expect(probeError.status).toBe(500)
    expect(coreError.status).toBe(500)
    expect(probeError.text).toContain(PROBE_THROWN_MESSAGE)
    expect(coreError.text).toContain('probeUnknownQueryParameter')
    expect(probeError.text).not.toBe(coreError.text)

    expect(errorShape(probeError)).toEqual(errorShape(coreError))
  })

  test('the probe`s routes appear in GET /server/api', async() => {
    const { status, body } = await request(app)
      .get('/server/api')
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    const probeEntries = body.filter(({ npmName }) => npmName === PROBE_NPM_NAME)
    const probePaths = probeEntries.map(({ path }) => path.join('/')).sort()

    expect(probePaths).toEqual(['probe/' + ':' + PROBE_PATH_VAR + '/echo', 'probe/boom'].sort())
  })

  test('the probe`s routes appear in the API spec file written by appInit', async() => {
    const written = JSON.parse(await fs.readFile(apiSpecPath, 'utf8'))
    const probePaths = written
      .filter(({ npmName }) => npmName === PROBE_NPM_NAME)
      .map(({ path }) => path.join('/'))
      .sort()

    expect(probePaths).toEqual(['probe/' + ':' + PROBE_PATH_VAR + '/echo', 'probe/boom'].sort())
  })

  test('app.ext.handlerPlugins carries the probe`s identity verbatim, un-stripped', () => {
    const entry = app.ext.handlerPlugins.find(({ npmName }) => npmName === PROBE_NPM_NAME)

    expect(entry).toEqual({ npmName : PROBE_NPM_NAME, summary : PROBE_SUMMARY, version : PROBE_VERSION })
    // The npm load path would have stripped ' for a @liquid-labs/plugable-express server' off a
    // package `description`; a `builtinPlugins` caller supplies the final display string, so the
    // regex must not run on it.
    expect(entry.summary).toContain(' for a @liquid-labs/plugable-express server')
  })

  test('GET /server/plugins/list reports the probe', async() => {
    const { status, body } = await request(app)
      .get('/server/plugins/list')
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(body).toContainEqual({ npmName : PROBE_NPM_NAME, installed : true, summary : PROBE_SUMMARY })
  })
})

// The gating `app-init.test.js` and `golden-api-spec.test.js` implicitly depend on. Cheap
// precisely because the flag is true: no core scan runs.
describe('builtinPlugins are suppressed by skipCorePlugins', () => {
  let app, cache, serverHome, sentinel

  beforeAll(async() => {
    serverHome = makeTempDir('comply-server-builtin-sentinel-')
    await fs.mkdir(serverHome, { recursive : true })

    sentinel = createSentinelPlugin();

    ({ app, cache } = await appInit({
      serverConfigRoot : serverHome,
      apiSpecPath      : fsPath.join(serverHome, 'sentinel-api.json'),
      builtinPlugins   : [sentinel.builtinPluginsEntry],
      skipCorePlugins  : true,
      reporter         : new Reporter({ silent : true })
    }))
  })

  afterAll(async() => {
    cache?.release()
    await fs.rm(serverHome, { recursive : true, force : true })
  })

  test('the sentinel entry`s `setup` never ran', () => {
    expect(sentinel.observed.setupCallCount).toBe(0)
  })

  test('no handlerPlugins entry was recorded for the sentinel', () => {
    expect(app.ext.handlerPlugins.map(({ npmName }) => npmName)).not.toContain(SENTINEL_NPM_NAME)
  })
})
