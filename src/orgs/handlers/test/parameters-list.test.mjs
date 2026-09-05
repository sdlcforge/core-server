/* global describe expect test */

import { func } from '../parameters-list'

// `formatOutput` (`@liquid-labs/liq-handlers-lib`) is `async`, but for the plain JSON path it
// resolves `res.json(...)` synchronously within its own Promise executor -- there is no real
// `await` boundary on that path. A microtask flush after calling the (non-async) handler is a
// cheap, correct way to not depend on that internal detail holding forever.
const flushMicrotasks = () => new Promise((resolve) => { resolve() })

describe('GET /orgs/:orgKey/parameters/list', () => {
  const org = { name : '@acme', settings : { COMMON_NAME : 'Acme Corp', nested : { LEGAL_NAME : 'Acme Corp, Inc.' } } }
  const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }

  test("returns the org's parameters", async() => {
    const reqMock = { accepts : () => 'application/json', vars : { orgKey : '@acme' } }
    let result
    const resMock = { json : (json) => { result = json } }

    func({ app : appMock, reporter : undefined })(reqMock, resMock)
    await flushMicrotasks()

    expect(result).toEqual(expect.arrayContaining([
      { name : '.COMMON_NAME', value : 'Acme Corp' },
      { name : '.nested.LEGAL_NAME', value : 'Acme Corp, Inc.' }
    ]))
    expect(result).toHaveLength(2)
  })

  test('an unknown orgKey throws a 404-bearing error', () => {
    const reqMock = { accepts : () => 'application/json', vars : { orgKey : '@unknown' } }
    const resMock = { json : () => {} }

    let caught
    try {
      func({ app : appMock, reporter : undefined })(reqMock, resMock)
    }
    catch (e) {
      caught = e
    }

    expect(caught).toBeDefined()
    expect(caught.status).toBe(404)
  })
})
