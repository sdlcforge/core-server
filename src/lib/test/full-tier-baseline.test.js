/* global afterAll beforeAll describe expect test */
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import request from 'supertest'

import { IntegrationsManager, Reporter } from '@liquid-labs/plugable-express'

import { appInit } from '../app-init'

// The checked-in baseline snapshots live under the repo's top-level `test/__snapshots__/`
// (plain JSON, not Jest's own `.snap` mechanism) so a human or agent can diff them easily
// outside Jest. This test file is compiled by Babel into
// `test-staging/lib/test/full-tier-baseline.test.js` before Jest runs it (see
// `make/55-test.mk`), so `__dirname` at runtime points into `test-staging/lib/test`, not
// `src/lib/test`. Three levels up from there lands back at the worktree root, the same
// traversal `golden-api-spec.test.js` and `app-init.test.js` already use to reach
// `package.json`.
const SNAPSHOT_DIR = fsPath.join(__dirname, '..', '..', '..', 'test', '__snapshots__')
const API_SNAPSHOT_PATH = fsPath.join(SNAPSHOT_DIR, 'full-tier-api-spec.json')
const PLUGINS_SNAPSHOT_PATH = fsPath.join(SNAPSHOT_DIR, 'full-tier-plugins-list.json')
const INTEGRATIONS_LIST_SNAPSHOT_PATH = fsPath.join(SNAPSHOT_DIR, 'full-tier-integrations-list.json')

// Regeneration is an explicit opt-in (`npm run test:update-full-tier-baseline`), never the
// default `npm test` path. Mirrors the `UPDATE_GOLDEN_API_SPEC` convention from
// `golden-api-spec.test.js` under a distinct variable so the two harnesses' regeneration
// runs stay independent. See `plan/notes/parity-baseline.md`.
const UPDATE_FULL_TIER_BASELINE =
  process.env.UPDATE_FULL_TIER_BASELINE === 'true' || process.env.UPDATE_FULL_TIER_BASELINE === '1'

const readGolden = async(path) => JSON.parse(await fs.readFile(path, 'utf8'))

const writeGolden = async(path, data) => {
  await fs.mkdir(SNAPSHOT_DIR, { recursive : true })
  await fs.writeFile(path, JSON.stringify(data, null, 2) + '\n')
}

// The recorded {name, deps} baseline for every setup method enqueued once the real,
// full explicit-plugin tier loads (plan/notes/parity-baseline.md's "Setup methods" table).
// Sorted by name; the actual value read off `app.ext.setupMethods` is sorted the same way
// before comparison, since enqueue order is `find-plugins` scan order, not a contract.
const EXPECTED_SETUP_METHODS = [
  { name : 'load controls integrations', deps : ['setup integrations'] },
  { name : 'load org controls', deps : ['load orgs'] },
  { name : 'load orgs', deps : [] },
  { name : 'prepare org dependencies', deps : ['!'] },
  { name : 'process org setup', deps : ['*'] },
  { name : 'register github issues integrations', deps : ['setup integrations'] },
  { name : 'setup integrations', deps : [] }
].sort((a, b) => a.name.localeCompare(b.name))

// The recorded `app.ext` key set once the full tier loads (parity-baseline.md's "app.ext
// keys" section).
const EXPECTED_APP_EXT_KEYS = [
  '_liqOrgs',
  '_liqProjects',
  'commandPaths',
  'constants',
  'credentialsDB',
  'dynamicPluginInstallDir',
  'errorsEphemeral',
  'errorsRetained',
  'handlerPlugins',
  'handlers',
  'integrations',
  'localSettings',
  'name',
  'pendingHandlers',
  'serverConfigRoot',
  'serverSettings',
  'serverVersion',
  'setupMethods',
  'teardownMethods',
  'version'
].sort()

// The recorded `app.ext.credentialsDB` method set (parity-baseline.md).
const EXPECTED_CREDENTIALS_DB_METHODS = [
  'detail',
  'getCredSpec',
  'getToken',
  'import',
  'list',
  'listSupported',
  'registerCredentialType',
  'resetDB',
  'verifyCreds',
  'writeDB'
].sort()

// The recorded `{providerFor, name, npmName, hooks}` baseline for every
// `IntegrationsManager.register()` call the full explicit-plugin tier makes
// (plan/notes/parity-baseline.md's "Integration providers and hooks" table). Sorted by
// `providerFor` -- the three values are distinct, so this is an unambiguous sort key and no
// secondary key is needed. Hooks are asserted by name (sorted), not function identity, per
// the task doc.
//
// Both `issues-github` registrations (`tickets`, `pull request`) deliberately omit `name`.
// This is a real, pre-existing defect, encoded here as present-day fact rather than fixed:
// `IntegrationsManager.listInstalledPlugins()` de-duplicates via
// `new Map(list.map((p) => [p.name, p]))`, so the two providers -- both keyed on `undefined`
// -- collapse into one, and `GET /server/plugins/integrations/list` reports two entries
// where three providers are actually registered (see the
// `full-tier-integrations-list.json` snapshot below). Tracked as a follow-up item, not
// fixed in this plan.
const EXPECTED_INTEGRATION_PROVIDERS = [
  {
    providerFor : 'controls',
    // Absorbed in-tree at `src/controls/` (phase-05 task 001) and registered through
    // `builtinPlugins`, so this provider now reports under the identity of the package that
    // ships it. The predicted, accepted diff from the pre-absorption baseline -- item 3 of
    // `plan/resources/absorption-parity-contract.md`. `providerFor`, `name`, and the hook set
    // are unchanged.
    name        : 'controls',
    npmName     : '@sdlcforge/core-server',
    hooks       : ['getQuestionControls']
  },
  {
    // Absorbed in-tree at `src/integrations-issues-github/` (phase-05 task 003) and registered
    // through `builtinPlugins`, so -- exactly as for `controls` above -- this provider now reports
    // under the identity of the package that ships it. `providerFor`, the omitted `name`, and the
    // hook set are all unchanged; `npmName` is the only field this absorption moved.
    providerFor : 'tickets',
    name        : undefined,
    npmName     : '@sdlcforge/core-server',
    hooks       : ['getCurrentIntegrationUser', 'getIssueURL', 'getProjectURL']
  },
  {
    providerFor : 'pull request',
    name        : undefined,
    npmName     : '@sdlcforge/core-server',
    hooks       : [
      'createOrUpdatePullRequest',
      'getCurrentIntegrationUser',
      'getPullRequestURLsByHead',
      'getQALinkFileIndex'
    ]
  }
].sort((a, b) => a.providerFor.localeCompare(b.providerFor))

// Captured `IntegrationsManager.prototype.register()` calls, and the original function so it
// can be restored in `afterAll` and verified restored afterward. Both are module-scoped
// (rather than local to the describe block below) so the sibling
// 'IntegrationsManager.prototype.register restoration' describe block -- which Jest runs
// only after the main describe block's `afterAll` has completed -- can read `originalRegister`
// once restoration has actually happened.
let capturedIntegrationRegistrations
let originalIntegrationsManagerRegister

describe('Full-tier baseline characterization', () => {
  let app, cache, serverHome, playgroundHome
  let origPluggablePlayground

  beforeAll(async() => {
    serverHome = fsPath.join(os.tmpdir(), 'comply-server-full-tier-' + Math.round(Math.random() * 10000000000000000))
    playgroundHome =
      fsPath.join(os.tmpdir(), 'comply-server-full-tier-playground-' + Math.round(Math.random() * 10000000000000000))
    await fs.mkdir(playgroundHome, { recursive : true })

    // `PLUGABLE_PLAYGROUND` isolation is mandatory, not optional: the builtin `projects`
    // component's `setupPlayground()` otherwise defaults to `${HOME}/playground`, creates it if
    // absent, and hands it to a `PlaygroundMonitor` that scans it -- emitting roughly
    // 9,500 lines of stray console.log output on a developer host and side-effecting the
    // user's home directory. The observable surface is verified byte-identical either
    // way (plan/notes/parity-baseline.md), so this is purely an isolation/noise concern,
    // but it must be set before `appInit()` runs.
    origPluggablePlayground = process.env.PLUGABLE_PLAYGROUND
    process.env.PLUGABLE_PLAYGROUND = playgroundHome

    // Wrap `IntegrationsManager.prototype.register` *before* `appInit()` runs so every
    // `{providerFor, name, npmName, hooks}` call it makes is captured faithfully.
    // `IntegrationsManager`'s `#providers` field is private, so this is the only way to
    // observe the real registration arguments; reading the field afterward, or reading the
    // consumer-visible `/server/plugins/integrations/list` endpoint, would only surface the
    // already-de-duplicated view (see EXPECTED_INTEGRATION_PROVIDERS above). Restored in
    // `afterAll` below so no other test file is affected.
    capturedIntegrationRegistrations = []
    originalIntegrationsManagerRegister = IntegrationsManager.prototype.register
    IntegrationsManager.prototype.register = function(registration) {
      capturedIntegrationRegistrations.push(registration)

      return originalIntegrationsManagerRegister.call(this, registration)
    };

    ({ app, cache } = await appInit({
      serverConfigRoot : serverHome,
      // No `skipCorePlugins` here: this harness loads the real, full five-package
      // explicit-plugin tier so the resulting surface can be recorded as the absorption
      // baseline. `golden-api-spec.test.js` already covers core-server's own
      // framework-level surface in isolation via `skipCorePlugins: true`; that test is
      // deliberately left untouched.
      reporter         : new Reporter({ silent : true })
    }))
  })

  afterAll(async() => {
    // Restored first, ahead of the other cleanup steps below, so a failure in an unrelated
    // cleanup step can never leave the prototype patched for a later test file.
    IntegrationsManager.prototype.register = originalIntegrationsManagerRegister

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

  test('GET /server/api matches the full-tier baseline snapshot', async() => {
    const { status, body } = await request(app)
      .get('/server/api')
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)

    if (UPDATE_FULL_TIER_BASELINE) {
      await writeGolden(API_SNAPSHOT_PATH, body)
    }

    expect(existsSync(API_SNAPSHOT_PATH)).toBe(true)
    const golden = await readGolden(API_SNAPSHOT_PATH)
    expect(body).toEqual(golden)
  })

  test('GET /server/plugins/list matches the full-tier baseline snapshot', async() => {
    const { status, body } = await request(app)
      .get('/server/plugins/list')
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)

    if (UPDATE_FULL_TIER_BASELINE) {
      await writeGolden(PLUGINS_SNAPSHOT_PATH, body)
    }

    expect(existsSync(PLUGINS_SNAPSHOT_PATH)).toBe(true)
    const golden = await readGolden(PLUGINS_SNAPSHOT_PATH)
    expect(body).toEqual(golden)
  })

  test('enqueued setup methods match the recorded {name, deps} baseline', () => {
    const actual = app.ext.setupMethods
      .map(({ name, deps }) => ({ name, deps : [...(deps || [])].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name))

    expect(actual).toEqual(EXPECTED_SETUP_METHODS)
  })

  test('app.ext keys match the recorded baseline', () => {
    expect(Object.keys(app.ext).sort()).toEqual(EXPECTED_APP_EXT_KEYS)
  })

  // `app.ext.credentialsDB`'s load-ordering contract: the builtin `src/credentials/` component
  // provides `appExt:credentialsDB @ load`, and the builtin `src/projects/` component requires it
  // at the same phase. Both are now components of this package's own single `builtinPlugins`
  // entry, so the ordering rests on their relative positions in `builtin-plugins.mjs`'
  // `submodules` array. This runtime characterization test only proves the method set exists once
  // `appInit()` has already succeeded; it says nothing about *why* the ordering holds. The
  // build-time-enforced form of that same contract -- asserted statically against the real
  // graph, before any test in this file ever runs `appInit()` -- lives in
  // `src/lib/test/plugin-graph-intra-builtin-ordering.test.js`.
  test('app.ext.credentialsDB exposes the recorded method set', () => {
    expect(app.ext.credentialsDB).toBeDefined()
    for (const method of EXPECTED_CREDENTIALS_DB_METHODS) {
      expect(typeof app.ext.credentialsDB[method]).toBe('function')
    }
  })

  test('IntegrationsManager.prototype.register was called exactly three times, matching the recorded provider/hook baseline', () => {
    expect(capturedIntegrationRegistrations).toHaveLength(3)

    // Normalized for call order (registration order follows `find-plugins` scan order and is
    // not a contract) and for hook identity (hooks are asserted by name, sorted, not by
    // function reference).
    const actual = capturedIntegrationRegistrations
      .map(({ hooks, name, npmName, providerFor }) => ({
        providerFor,
        name,
        npmName,
        hooks : Object.keys(hooks).sort()
      }))
      .sort((a, b) => a.providerFor.localeCompare(b.providerFor))

    expect(actual).toEqual(EXPECTED_INTEGRATION_PROVIDERS)
  })

  test('GET /server/plugins/integrations/list matches the full-tier baseline snapshot', async() => {
    const { status, body } = await request(app)
      .get('/server/plugins/integrations/list')
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)

    // Two entries, not three: the `name`-omission defect asserted above
    // (EXPECTED_INTEGRATION_PROVIDERS) collapses the two `issues-github` registrations
    // (`tickets`, `pull request`) into a single `undefined`-keyed Map entry, so this
    // consumer-visible endpoint reports only `controls` plus one merged `issues-github`
    // entry (showing the `pull request` hook set, since it was registered last and
    // overwrote the `tickets` entry sharing its `undefined` key). Snapshotted faithfully,
    // defect included -- the point of this baseline is to preserve the observable, not to
    // fix it. See plan/notes/parity-baseline.md.
    expect(body.length).toBe(2)

    if (UPDATE_FULL_TIER_BASELINE) {
      await writeGolden(INTEGRATIONS_LIST_SNAPSHOT_PATH, body)
    }

    expect(existsSync(INTEGRATIONS_LIST_SNAPSHOT_PATH)).toBe(true)
    const golden = await readGolden(INTEGRATIONS_LIST_SNAPSHOT_PATH)
    expect(body).toEqual(golden)
  })
})

// A sibling describe block, deliberately separate from the one above: Jest fully completes
// one top-level describe block (including its `afterAll`) before starting the next one
// declared in the same file, so this is the earliest point at which the restoration
// performed in the block above's `afterAll` can be observed and asserted.
describe('IntegrationsManager.prototype.register restoration', () => {
  test('prototype method is restored to the original function once the full-tier suite has completed', () => {
    expect(IntegrationsManager.prototype.register).toBe(originalIntegrationsManagerRegister)
    expect(typeof originalIntegrationsManagerRegister).toBe('function')
  })
})
