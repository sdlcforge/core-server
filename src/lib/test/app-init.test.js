/* global afterAll beforeAll describe expect test */
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import request from 'supertest'

import { CATALYST_API_SPEC } from '@liquid-labs/catalyst-defaults'
import { Reporter } from '@liquid-labs/plugable-express'

import { appInit } from '../app-init'

describe('GET:/server/version', () => {
  let app, cache, CURR_VER, serverHome

  beforeAll(async() => {
    serverHome = fsPath.join(os.tmpdir(), 'catalyst-server-' + Math.round(Math.random() * 10000000000000000))
    process.env.CATALYST_HOME = serverHome;

    ({ app, cache } = await appInit({
      serverHome,
      skipCorePlugins    : true,
      reporter           : new Reporter({ silent : true }),
      useDefaultSettings : true
    }))

    const bits = await fs.readFile(fsPath.join(__dirname, '..', '..', '..', 'package.json'))
    const packageJSON = JSON.parse(bits)
    CURR_VER = packageJSON.version
  })

  afterAll(async() => {
    cache?.release()
    await fs.rm(serverHome, { recursive : true })
  })

  test('creates api.json', () => expect(existsSync(CATALYST_API_SPEC())).toBe(true))

  test('handles GET /server', async() => {
    const { status, text, headers } = await request(app)
      .get('/server/version') // it reads weird, but this MUST go first
      .set('Accept', 'text/plain')
    expect(status).toBe(200)
    expect(headers['content-type']).toMatch(/text\/plain/)
    expect(text).toMatch(new RegExp(`catalyst-server: ${CURR_VER}`))
  })
})
