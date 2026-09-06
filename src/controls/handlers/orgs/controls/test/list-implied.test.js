/* global afterAll beforeAll describe expect jest test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import { func } from '../list-implied'

import { doListControls } from '../_lib/list-lib'

jest.mock('../_lib/list-lib', () => ({
  ...jest.requireActual('../_lib/list-lib'),
  doListControls : jest.fn()
}))

describe('GET:/orgs/controls/list (implied work)', () => {
  let pkgDir

  beforeAll(async() => {
    pkgDir = fsPath.join(os.tmpdir(), 'list-implied-test-' + Math.round(Math.random() * 10000000000000000))
    await fs.mkdir(pkgDir, { recursive : true })
    await fs.writeFile(fsPath.join(pkgDir, 'package.json'), JSON.stringify({ name : '@acme/widget' }))
  })

  afterAll(async() => {
    await fs.rm(pkgDir, { recursive : true, force : true })
  })

  test("resolves 'orgKey' from the 'X-CWD' package directory and calls 'doListControls' with it", async() => {
    let calledOrgKey
    doListControls.mockImplementation(({ orgKey }) => { calledOrgKey = orgKey })

    const mockReq = { get : (header) => (header === 'X-CWD' ? pkgDir : undefined) }
    const mockReporter = { isolate : () => mockReporter }

    const handler = func({ reporter : mockReporter })
    await handler(mockReq)

    expect(calledOrgKey).toBe('acme')
  })
})
