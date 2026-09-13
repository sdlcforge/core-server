/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import yaml from 'js-yaml'

import { Organization } from '../../resources/organization'
import { func } from '../parameters-list'

// `formatOutput` (`@liquid-labs/liq-handlers-lib`) is `async`, but for the plain JSON path it
// resolves `res.json(...)` synchronously within its own Promise executor -- there is no real
// `await` boundary on that path. A microtask flush after calling the (non-async) handler is a
// cheap, correct way to not depend on that internal detail holding forever.
const flushMicrotasks = () => new Promise((resolve) => { resolve() })

describe('GET /orgs/:orgKey/parameters/list', () => {
  let projectPath

  beforeAll(async() => {
    // A real `Organization` instance backed by a temp `settings.yaml`, matching the pattern
    // `src/orgs/handlers/test/list.test.mjs` and `src/orgs/resources/test/organization.test.mjs`
    // already use -- rather than a plain object literal carrying a `.settings` property directly,
    // which let this suite pass even while the real production code path (a real `Organization`
    // instance, whose `.settings` was previously `undefined`) was broken.
    projectPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'orgs-parameters-list-test-'))
    const settingsDir = fsPath.join(projectPath, 'data', 'org')
    await fs.mkdir(settingsDir, { recursive : true })
    await fs.writeFile(
      fsPath.join(settingsDir, 'settings.yaml'),
      yaml.dump({ COMMON_NAME : 'Acme Corp', nested : { LEGAL_NAME : 'Acme Corp, Inc.' } }),
      { encoding : 'utf8' }
    )
  })

  afterAll(async() => {
    await fs.rm(projectPath, { force : true, recursive : true })
  })

  test("returns the org's parameters", async() => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
    const reqMock = { accepts : () => 'application/json', vars : { orgKey : '@acme' } }
    let result
    const resMock = { json : (json) => { result = json } }

    func({ app : appMock, reporter : undefined })(reqMock, resMock)
    await flushMicrotasks()

    // Assert real parameter names/values actually come back -- not just `toEqual([])`, which is
    // exactly what the broken production code path (`org.settings` reading `undefined` off a
    // real `Organization` instance) would have silently produced.
    expect(result).toEqual(expect.arrayContaining([
      { name : '.COMMON_NAME', value : 'Acme Corp' },
      { name : '.nested.LEGAL_NAME', value : 'Acme Corp, Inc.' }
    ]))
    expect(result).toHaveLength(2)
  })

  // The md/terminal/text formatters previously destructured a `(parameters, title)` positional
  // signature, but `formatOutput` invokes non-JSON formatters with a single `{ data, title,
  // fields }` object -- so `parameters` was the whole options object and `.map` would throw.
  // This exercises those non-JSON `formatOutput` paths directly, which the prior JSON-only
  // coverage did not.
  test("renders the markdown format from the org's parameters", async() => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
    const reqMock = { accepts : () => 'text/markdown', vars : { orgKey : '@acme' } }
    let result
    const resMock = { type : () => resMock, send : (body) => { result = body } }

    func({ app : appMock, reporter : undefined })(reqMock, resMock)
    await flushMicrotasks()

    expect(result).toContain('- _.COMMON_NAME_: Acme Corp')
  })

  test("renders the terminal format from the org's parameters", async() => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
    const reqMock = { accepts : () => 'text/terminal', vars : { orgKey : '@acme' } }
    let result
    const resMock = { type : () => resMock, send : (body) => { result = body } }

    func({ app : appMock, reporter : undefined })(reqMock, resMock)
    await flushMicrotasks()

    expect(result).toContain('- <code>.COMMON_NAME<rst>: Acme Corp')
  })

  test("renders the plain text format from the org's parameters", async() => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
    const reqMock = { accepts : () => 'text/plain', vars : { orgKey : '@acme' } }
    let result
    const resMock = { type : () => resMock, send : (body) => { result = body } }

    func({ app : appMock, reporter : undefined })(reqMock, resMock)
    await flushMicrotasks()

    expect(result).toContain('- .COMMON_NAME: Acme Corp')
  })

  test('an unknown orgKey throws a 404-bearing error', () => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
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
