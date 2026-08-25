// A test-only probe plugin used to prove the `builtinPlugins` registration path end to end.
//
// It deliberately lives under `src/lib/test/fixtures/` and is *never* added to
// `src/lib/builtin-plugins.mjs`'s `submodules` array: a permanently-registered probe would add
// phantom routes to every baseline snapshot and to the published server. It reaches `appInit`
// only through the `builtinPlugins` *option override* that `app-init.mjs` makes possible by
// placing its `builtinPlugins` default before the `...options` spread.
//
// `src/lib/test/**` is excluded from the Rollup entry graph by the build's own
// `CATALYST_TEST_SELECTOR` (`-path "*/test/*"`), so nothing here can reach `dist/`.

const PROBE_NPM_NAME = '@sdlcforge/core-server-builtin-probe'
// Deliberately carries the exact phrase the npm load path strips off a package `description`
// (` for a @liquid-labs/plugable-express server`). A `builtinPlugins` caller supplies the final
// display string directly, so that regex must not run on it; the test asserts this string comes
// back verbatim from `GET /server/plugins/list`.
const PROBE_SUMMARY = 'Probe plugin for a @liquid-labs/plugable-express server'
const PROBE_VERSION = '0.0.0-probe'
const PROBE_PATH_VAR = 'probeVar'
const PROBE_PATH_VAR_OPTIONS = ['alpha', 'beta']
const PROBE_SETUP_METHOD_NAME = 'probe setup method'
const PROBE_THROWN_MESSAGE = 'probe route deliberately threw'

const SENTINEL_NPM_NAME = '@sdlcforge/core-server-builtin-probe-sentinel'

/**
 * Builds a fresh probe and its observation record. The record is populated as `appInit()` runs;
 * the *assertions* over it live in the test file rather than here, because a throw from inside
 * `setup()` aborts `appInit()` in `beforeAll` and surfaces as an opaque harness failure rather
 * than a legible expectation failure.
 */
const createProbePlugin = () => {
  const observed = {
    setupCallCount                : 0,
    setupArgKeys                  : undefined,
    appIsExpressApp               : undefined,
    cacheIsDefined                : undefined,
    reporterIsDefined             : undefined,
    registerPathVarIsFunction     : undefined,
    serverConfigRoot              : undefined,
    appExtServerConfigRoot        : undefined,
    serverConfigRootMatchesAppExt : undefined,
    pathVarRegistered             : false,
    setupMethodEnqueued           : false,
    setupMethodRan                : false
  }

  const setup = async(setupArgs) => {
    observed.setupCallCount += 1
    // The exact argument object the framework builds at its single `setup?.(...)` call site.
    observed.setupArgKeys = Object.keys(setupArgs).sort()

    const { app, cache, reporter, registerPathVar, serverConfigRoot } = setupArgs

    observed.appIsExpressApp = typeof app?.use === 'function'
    observed.cacheIsDefined = cache !== undefined
    observed.reporterIsDefined = reporter !== undefined
    observed.registerPathVarIsFunction = typeof registerPathVar === 'function'
    observed.serverConfigRoot = serverConfigRoot
    observed.appExtServerConfigRoot = app?.ext?.serverConfigRoot
    observed.serverConfigRootMatchesAppExt = serverConfigRoot === app?.ext?.serverConfigRoot

    // The affordance post-`appInit` registration could not obtain at all: `registerPathVar` is
    // re-exported by neither the package's `src/index.js` nor its `src/lib/index.js`.
    registerPathVar(PROBE_PATH_VAR, {
      optionsFetcher : () => [...PROBE_PATH_VAR_OPTIONS],
      validationRe   : '[a-z]+'
    })
    observed.pathVarRegistered = true

    // No `deps`: satisfiable in every configuration, so the `DependencyRunner` pass that runs
    // after the error middleware is installed can always complete it.
    app.ext.setupMethods.push({
      name : PROBE_SETUP_METHOD_NAME,
      deps : [],
      func : () => { observed.setupMethodRan = true }
    })
    observed.setupMethodEnqueued = true
  }

  const echoHandler = {
    method     : 'get',
    path       : ['probe', ':' + PROBE_PATH_VAR, 'echo'],
    parameters : [],
    func       : () => (req, res) => {
      res.type('text/plain').send(req.vars[PROBE_PATH_VAR])
    }
  }

  // Throws synchronously from inside the route handler, so Express routes it to whatever error
  // middleware is installed *ahead of* this route in the router stack. Registered through
  // `builtinPlugins`, that is `plugable-express`' own two error layers; registered after
  // `appInit()` returns, it would be Express's default handler instead -- which is exactly the
  // difference the test's error-shape comparison detects.
  const throwHandler = {
    method     : 'get',
    path       : ['probe', 'boom'],
    parameters : [],
    func       : () => () => {
      throw new Error(PROBE_THROWN_MESSAGE)
    }
  }

  const handlers = [echoHandler, throwHandler]

  const builtinPluginsEntry = {
    npmName : PROBE_NPM_NAME,
    version : PROBE_VERSION,
    summary : PROBE_SUMMARY,
    module  : { handlers, setup }
  }

  return { builtinPluginsEntry, handlers, observed, setup }
}

/**
 * Builds a `builtinPlugins` entry whose `setup` sets a sentinel, plus the sentinel record. Used
 * to prove, negatively, that `skipCorePlugins: true` suppresses in-tree registration -- the
 * observable `app-init.test.js` and `golden-api-spec.test.js` implicitly depend on.
 */
const createSentinelPlugin = () => {
  const observed = { setupCallCount : 0 }

  const builtinPluginsEntry = {
    npmName : SENTINEL_NPM_NAME,
    version : PROBE_VERSION,
    summary : 'Sentinel plugin; its setup must not run under skipCorePlugins.',
    module  : {
      setup : async() => { observed.setupCallCount += 1 }
    }
  }

  return { builtinPluginsEntry, observed }
}

export {
  createProbePlugin,
  createSentinelPlugin,
  PROBE_NPM_NAME,
  PROBE_PATH_VAR,
  PROBE_PATH_VAR_OPTIONS,
  PROBE_SETUP_METHOD_NAME,
  PROBE_SUMMARY,
  PROBE_THROWN_MESSAGE,
  PROBE_VERSION,
  SENTINEL_NPM_NAME
}
