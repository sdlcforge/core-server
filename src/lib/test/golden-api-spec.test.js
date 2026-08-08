/* global afterAll beforeAll describe expect test */
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import request from 'supertest'

import { Reporter } from '@liquid-labs/plugable-express'

import { appInit } from '../app-init'

// The checked-in golden snapshots live under the repo's top-level `test/__snapshots__/`
// (plain JSON, not Jest's own `.snap` mechanism) so a human or agent can diff them
// easily outside Jest. This test file is compiled by Babel into
// `test-staging/lib/test/golden-api-spec.test.js` before Jest runs it (see
// `make/55-test.mk`), so `__dirname` at runtime points into `test-staging/lib/test`,
// not `src/lib/test`. Three levels up from there lands back at the worktree root,
// the same traversal `app-init.test.js` already uses to reach `package.json`.
const SNAPSHOT_DIR = fsPath.join(__dirname, '..', '..', '..', 'test', '__snapshots__')
const API_SNAPSHOT_PATH = fsPath.join(SNAPSHOT_DIR, 'golden-api-spec.json')
const PLUGINS_SNAPSHOT_PATH = fsPath.join(SNAPSHOT_DIR, 'golden-plugins-list.json')

// Regeneration is an explicit opt-in (`npm run test:update-golden-api-spec`), never the
// default `npm test` path. See `plan/resources/golden-api-spec-baseline.md`.
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN_API_SPEC === 'true' || process.env.UPDATE_GOLDEN_API_SPEC === '1'

const readGolden = async(path) => JSON.parse(await fs.readFile(path, 'utf8'))

const writeGolden = async(path, data) => {
  await fs.mkdir(SNAPSHOT_DIR, { recursive : true })
  await fs.writeFile(path, JSON.stringify(data, null, 2) + '\n')
}

describe('Golden API-spec characterization', () => {
  let app, cache, serverHome

  beforeAll(async() => {
    serverHome = fsPath.join(os.tmpdir(), 'comply-server-golden-' + Math.round(Math.random() * 10000000000000000));
    ({ app, cache } = await appInit({
      serverConfigRoot : serverHome,
      // Loading the real explicit-plugin set (liq-controls, liq-credentials, etc.)
      // currently throws during `appInit()`: liq-credentials (and liq-credentials-db,
      // liq-integrations, liq-work) still read `app.ext.serverHome`, which
      // `@liquid-labs/plugable-express` no longer sets after its serverHome ->
      // serverConfigRoot rename. That is a pre-existing, cross-package bug unrelated
      // to this test-only task (and out of scope to fix here — see the task's own
      // "do not modify any plugin, app-init, or build logic" constraint). Flagged for
      // the manager as a separate follow-up.
      //
      // `skipCorePlugins: true` isolates this test to core-server's own
      // framework-level API surface (the routes `plugable-express` registers
      // intrinsically, independent of any loaded plugin) so the golden snapshot is
      // deterministic and reproducible without that unrelated blocker — matching the
      // precedent already set by `app-init.test.js`.
      skipCorePlugins  : true,
      reporter         : new Reporter({ silent : true })
    }))
  })

  afterAll(async() => {
    cache?.release()
    await fs.rm(serverHome, { recursive : true, force : true })
  })

  test('GET /server/api matches the golden snapshot', async() => {
    const { status, body } = await request(app)
      .get('/server/api')
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)

    if (UPDATE_GOLDEN) {
      await writeGolden(API_SNAPSHOT_PATH, body)
    }

    expect(existsSync(API_SNAPSHOT_PATH)).toBe(true)
    const golden = await readGolden(API_SNAPSHOT_PATH)
    expect(body).toEqual(golden)
  })

  test('GET /server/plugins/list matches the golden snapshot', async() => {
    const { status, body } = await request(app)
      .get('/server/plugins/list')
      .set('Accept', 'application/json')

    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)

    if (UPDATE_GOLDEN) {
      await writeGolden(PLUGINS_SNAPSHOT_PATH, body)
    }

    expect(existsSync(PLUGINS_SNAPSHOT_PATH)).toBe(true)
    const golden = await readGolden(PLUGINS_SNAPSHOT_PATH)
    expect(body).toEqual(golden)
  })
})
