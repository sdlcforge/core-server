/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import yaml from 'js-yaml'

import { Organization } from '../../resources/organization'
import { func } from '../list'

// `formatOutput` (`@liquid-labs/liq-handlers-lib`) is `async`, but for the plain JSON path it
// resolves `res.json(...)` synchronously within its own Promise executor -- there is no real
// `await` boundary on that path. A microtask flush after calling the (non-async) handler is a
// cheap, correct way to not depend on that internal detail holding forever.
const flushMicrotasks = () => new Promise((resolve) => { resolve() })

describe('GET /orgs/list', () => {
  let projectPath

  beforeAll(async() => {
    projectPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'orgs-list-test-'))
    const settingsDir = fsPath.join(projectPath, 'data', 'org')
    await fs.mkdir(settingsDir, { recursive : true })
    await fs.writeFile(
      fsPath.join(settingsDir, 'settings.yaml'),
      yaml.dump({ COMMON_NAME : 'Acme Corp', LEGAL_NAME : 'Acme Corp, Inc.' }),
      { encoding : 'utf8' }
    )
  })

  afterAll(async() => {
    await fs.rm(projectPath, { force : true, recursive : true })
  })

  test('returns every org in the registry, with real key/commonName/legalName values', async() => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
    const reqMock = { accepts : () => 'application/json', vars : {} }
    let result
    const resMock = { json : (json) => { result = json } }

    func({ app : appMock, reporter : undefined })(reqMock, resMock)
    await flushMicrotasks()

    expect(result).toEqual([{ key : '@acme', commonName : 'Acme Corp', legalName : 'Acme Corp, Inc.' }])
  })

  test('an empty registry yields an empty array rather than throwing', async() => {
    const appMock = { ext : { _liqOrgs : { orgs : {} } } }
    const reqMock = { accepts : () => 'application/json', vars : {} }
    let result
    const resMock = { json : (json) => { result = json } }

    expect(() => func({ app : appMock, reporter : undefined })(reqMock, resMock)).not.toThrow()
    await flushMicrotasks()

    expect(result).toEqual([])
  })
})
