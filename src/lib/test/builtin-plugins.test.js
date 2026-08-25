/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import request from 'supertest'

import { Reporter } from '@liquid-labs/plugable-express'

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

describe('builtin-plugins aggregator (empty-but-shaped)', () => {
  test('contributes no handlers while `submodules` is empty', () => {
    expect(Array.isArray(builtinHandlers)).toBe(true)
    expect(builtinHandlers).toHaveLength(0)
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

  test('the composed `setup` is a no-op that resolves while `submodules` is empty', async() => {
    const [{ module: { setup } }] = builtinPluginsFor({ npmName : '@example/host', version : '9.9.9' })

    await expect(setup({ probe : 'forwarded unchanged' })).resolves.toBeUndefined()
  })
})

// The full-tier configuration: `skipCorePlugins` absent, so `loadBuiltinPlugins` actually runs.
// `PLUGABLE_PLAYGROUND` isolation and a temp `serverConfigRoot` mirror
// `full-tier-baseline.test.js`, the harness Phase 3 already proved works. The probe reaches
// `appInit` through the `builtinPlugins` option override, replacing (not joining) the real
// `@sdlcforge/core-server` entry `app-init.mjs` defaults to.
describe('builtinPlugins registration path, proven with a test-injected probe', () => {
  let app, cache, serverHome, playgroundHome, apiSpecPath, probe
  let origPluggablePlayground

  beforeAll(async() => {
    serverHome = makeTempDir('comply-server-builtin-probe-')
    playgroundHome = makeTempDir('comply-server-builtin-probe-playground-')
    await fs.mkdir(serverHome, { recursive : true })
    await fs.mkdir(playgroundHome, { recursive : true })
    apiSpecPath = fsPath.join(serverHome, 'probe-api.json')

    // Mandatory isolation: `liq-projects`' `setupPlayground()` otherwise defaults to
    // `${HOME}/playground` and scans it. See `full-tier-baseline.test.js` for the full rationale.
    origPluggablePlayground = process.env.PLUGABLE_PLAYGROUND
    process.env.PLUGABLE_PLAYGROUND = playgroundHome

    probe = createProbePlugin();

    ({ app, cache } = await appInit({
      serverConfigRoot : serverHome,
      apiSpecPath,
      builtinPlugins   : [probe.builtinPluginsEntry],
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
