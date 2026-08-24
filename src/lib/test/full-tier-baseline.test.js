/* global afterAll beforeAll describe expect test */
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import request from 'supertest'

import { Reporter } from '@liquid-labs/plugable-express'

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

describe('Full-tier baseline characterization', () => {
  let app, cache, serverHome, playgroundHome
  let origPluggablePlayground

  beforeAll(async() => {
    serverHome = fsPath.join(os.tmpdir(), 'comply-server-full-tier-' + Math.round(Math.random() * 10000000000000000))
    playgroundHome =
      fsPath.join(os.tmpdir(), 'comply-server-full-tier-playground-' + Math.round(Math.random() * 10000000000000000))
    await fs.mkdir(playgroundHome, { recursive : true })

    // `PLUGABLE_PLAYGROUND` isolation is mandatory, not optional: `liq-projects`'
    // `setupPlayground()` otherwise defaults to `${HOME}/playground`, creates it if
    // absent, and hands it to a `PlaygroundMonitor` that scans it -- emitting roughly
    // 9,500 lines of stray console.log output on a developer host and side-effecting the
    // user's home directory. The observable surface is verified byte-identical either
    // way (plan/notes/parity-baseline.md), so this is purely an isolation/noise concern,
    // but it must be set before `appInit()` runs.
    origPluggablePlayground = process.env.PLUGABLE_PLAYGROUND
    process.env.PLUGABLE_PLAYGROUND = playgroundHome;

    ({ app, cache } = await appInit({
      serverConfigRoot : serverHome,
      // No `skipCorePlugins` here: this harness loads the real, full eleven-package
      // explicit-plugin tier so the resulting surface can be recorded as the absorption
      // baseline. `golden-api-spec.test.js` already covers core-server's own
      // framework-level surface in isolation via `skipCorePlugins: true`; that test is
      // deliberately left untouched.
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

  test('app.ext.credentialsDB exposes the recorded method set', () => {
    expect(app.ext.credentialsDB).toBeDefined()
    for (const method of EXPECTED_CREDENTIALS_DB_METHODS) {
      expect(typeof app.ext.credentialsDB[method]).toBe('function')
    }
  })
})
