/* global afterAll beforeAll describe expect jest test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import { func } from '../parameters-set'
import { Organization } from '../../resources/organization'

const reqMock = ({ accepts = 'application/json', vars }) => ({
  accepts : () => accepts,
  get     : () => 'text/unknown',
  vars
})

const resMock = () => {
  const self = {
    out    : undefined,
    status : () => self,
    type   : () => self,
    send   : (chunk) => { self.out = chunk; return self }
  }

  return self
}

describe('PUT /orgs/:orgKey/parameters/:parameterKey/set', () => {
  let projectPath

  beforeAll(async() => {
    projectPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'orgs-parameters-set-test-'))
  })

  afterAll(async() => {
    await fs.rm(projectPath, { force : true, recursive : true })
  })

  const makeOrg = () => new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })

  const appMockWithOrg = (org) => ({ ext : { _liqOrgs : { orgs : { '@acme' : org } } } })

  test('writes a string value and responds with { name, value } for application/json', async() => {
    const org = makeOrg()
    const app = appMockWithOrg(org)
    const req = reqMock({ vars : { orgKey : '@acme', parameterKey : 'FOO', value : 'bar' } })
    const res = resMock()

    await func({ app })(req, res)

    expect(res.out).toEqual({ name : 'FOO', value : 'bar' })
    expect(org.getSetting('FOO')).toBe('bar')

    // confirm the write actually landed on disk, not just in memory
    const reloaded = makeOrg()
    expect(reloaded.getSetting('FOO')).toBe('bar')
  })

  test.each([
    ['asBoolean', 'true', true],
    ['asBoolean', 'false', false],
    ['asInteger', '42', 42],
    ['asNumber', '3.14', 3.14],
    ['asJSON', '[1,2,3]', [1, 2, 3]]
  ])('%s conversion of %s lands the parsed type in settings', async(flag, rawValue, expected) => {
    const org = makeOrg()
    const app = appMockWithOrg(org)
    const req = reqMock({ vars : { orgKey : '@acme', parameterKey : 'CONV_TEST', value : rawValue, [flag] : true } })
    const res = resMock()

    await func({ app })(req, res)

    expect(org.getSetting('CONV_TEST')).toEqual(expected)
  })

  // NOTE: the task doc's Requirements #5 states "setNull stores null", but
  // `settings.mjs`'s `checkValue` (unchanged by this task; see Requirements #4's own
  // `setUndefined`/`checkValue` carve-out) only whitelists `boolean`/`number`/`string`/array --
  // `typeof null === 'object'` falls through that whitelist and is rejected exactly like
  // `undefined` is. This is the same pre-existing checkValue restriction the task doc already
  // calls out for `setUndefined`, just untouched for `setNull` too; confirmed empirically against
  // the current `settings.mjs`. Documented here rather than silently asserting the doc's literal
  // (currently unreachable) expectation; flagged for the manager to fold into the same follow-up.
  test('setNull currently rejects null via the pre-existing checkValue restriction (see note above)', async() => {
    const org = makeOrg()
    const app = appMockWithOrg(org)
    const req = reqMock({ vars : { orgKey : '@acme', parameterKey : 'NULL_TEST', setNull : true } })
    const res = resMock()

    await expect(func({ app })(req, res)).rejects.toThrow(/limited to primitive data/)
    expect(org.getSetting('NULL_TEST')).toBeUndefined()
  })

  test('an unknown orgKey produces a 404-bearing error', async() => {
    const org = makeOrg()
    const app = appMockWithOrg(org)
    const req = reqMock({ vars : { orgKey : '@unknown', parameterKey : 'FOO', value : 'bar' } })
    const res = resMock()

    let caught
    try {
      await func({ app })(req, res)
    }
    catch (e) {
      caught = e
    }

    expect(caught).toBeDefined()
    expect(caught.status).toBe(404)
  })

  test('req.accepts returning false produces a 406 and no write', async() => {
    const org = makeOrg()
    const app = appMockWithOrg(org)
    const req = reqMock({ accepts : false, vars : { orgKey : '@acme', parameterKey : 'NO_WRITE', value : 'bar' } })
    let statusCode
    const res = {
      status : (code) => { statusCode = code; return res },
      type   : () => res,
      send   : () => res
    }

    await func({ app })(req, res)

    expect(statusCode).toBe(406)
    expect(org.getSetting('NO_WRITE')).toBeUndefined()
  })

  test('renders text/plain', async() => {
    const org = makeOrg()
    const app = appMockWithOrg(org)
    const req = reqMock({ accepts : 'text/plain', vars : { orgKey : '@acme', parameterKey : 'FOO', value : 'bar' } })
    const res = resMock()

    await func({ app })(req, res)

    expect(res.out).toBe("Parameter FOO set to 'bar.")
  })

  test('renders text/terminal', async() => {
    const org = makeOrg()
    const app = appMockWithOrg(org)
    const req = reqMock({ accepts : 'text/terminal', vars : { orgKey : '@acme', parameterKey : 'FOO', value : 'bar' } })
    const res = resMock()

    await func({ app })(req, res)

    expect(res.out).toBe("Parameter <code>FOO<rst> set to '<em>bar<rst>'.")
  })

  test("save() is awaited: a rejecting save makes the handler's promise reject and sends no success response", async() => {
    const org = makeOrg()
    org.save = jest.fn(() => Promise.reject(new Error('disk full')))
    const app = appMockWithOrg(org)
    const req = reqMock({ vars : { orgKey : '@acme', parameterKey : 'FOO', value : 'bar' } })
    const res = resMock()

    await expect(func({ app })(req, res)).rejects.toThrow('disk full')

    expect(org.save).toHaveBeenCalledTimes(1)
    expect(res.out).toBeUndefined()
  })
})
