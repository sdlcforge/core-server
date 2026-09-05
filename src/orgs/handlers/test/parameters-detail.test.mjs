/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import yaml from 'js-yaml'

import { Organization } from '../../resources/organization'
import { func } from '../parameters-detail'

const resMock = () => {
  const self = {
    out         : undefined,
    statusCode  : undefined,
    contentType : undefined,
    status      : (code) => { self.statusCode = code; return self },
    type        : (type) => { self.contentType = type; return self },
    send        : (chunk) => { self.out = chunk; return self }
  }

  return self
}

// `registerPathVar` spy capturing the `varDef` `func` registers, per the task doc's instruction
// to assert against the exported registration rather than a copy of the pattern.
const captureVarDef = ({ app }) => {
  let captured
  const registerPathVar = (name, varDef) => { if (name === 'parameterKey') captured = varDef }
  const handler = func({ app, reporter : undefined, registerPathVar })

  return { handler, varDef : captured }
}

describe('GET /orgs/:orgKey/parameters/:parameterKey/detail', () => {
  let projectPath

  beforeAll(async() => {
    // A real `Organization` instance backed by a temp `settings.yaml`, matching the pattern
    // `src/orgs/handlers/test/list.test.mjs` and `src/orgs/resources/test/organization.test.mjs`
    // already use -- rather than a plain object literal carrying a `.getSetting`/`.settings`
    // property directly, which let this suite pass even while the real production code path (a
    // real `Organization` instance, whose `.settings` was previously `undefined`) was broken.
    projectPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'orgs-parameters-detail-test-'))
    const settingsDir = fsPath.join(projectPath, 'data', 'org')
    await fs.mkdir(settingsDir, { recursive : true })
    await fs.writeFile(
      fsPath.join(settingsDir, 'settings.yaml'),
      yaml.dump({ COMMON_NAME : 'Acme Corp' }),
      { encoding : 'utf8' }
    )
  })

  afterAll(async() => {
    await fs.rm(projectPath, { force : true, recursive : true })
  })

  const makeAppMock = () => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    return { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
  }

  test('returns { name, value } for application/json', () => {
    const { handler } = captureVarDef({ app : makeAppMock() })
    const req = { accepts : () => 'application/json', vars : { orgKey : '@acme', parameterKey : '.COMMON_NAME' } }
    const res = resMock()

    handler(req, res)

    expect(res.out).toEqual({ name : '.COMMON_NAME', value : 'Acme Corp' })
  })

  test('returns the text/plain rendering', () => {
    const { handler } = captureVarDef({ app : makeAppMock() })
    const req = { accepts : () => 'text/plain', vars : { orgKey : '@acme', parameterKey : '.COMMON_NAME' } }
    const res = resMock()

    handler(req, res)

    expect(res.out).toBe('.COMMON_NAME: Acme Corp')
  })

  test('returns the text/terminal rendering', () => {
    const { handler } = captureVarDef({ app : makeAppMock() })
    const req = { accepts : () => 'text/terminal', vars : { orgKey : '@acme', parameterKey : '.COMMON_NAME' } }
    const res = resMock()

    handler(req, res)

    expect(res.out).toBe('<code>.COMMON_NAME<rst>: <em>Acme Corp<rst>')
  })

  test('responds 406 when req.accepts returns false', () => {
    const { handler } = captureVarDef({ app : makeAppMock() })
    const req = {
      accepts : () => false,
      get     : () => 'text/html',
      vars    : { orgKey : '@acme', parameterKey : '.COMMON_NAME' }
    }
    const res = resMock()

    handler(req, res)

    expect(res.statusCode).toBe(406)
  })

  test('an unknown orgKey throws a 404-bearing error', () => {
    const { handler } = captureVarDef({ app : makeAppMock() })
    const req = { accepts : () => 'application/json', vars : { orgKey : '@unknown', parameterKey : '.COMMON_NAME' } }
    const res = resMock()

    let caught
    try {
      handler(req, res)
    }
    catch (e) {
      caught = e
    }

    expect(caught).toBeDefined()
    expect(caught.status).toBe(404)
  })
})

describe("parameterKey's optionsFetcher", () => {
  let projectPath

  beforeAll(async() => {
    projectPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'orgs-parameters-detail-options-test-'))
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

  const makeAppMock = () => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
    return { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }
  }

  test('an unknown orgKey yields an empty option list rather than throwing', () => {
    const { varDef } = captureVarDef({ app : makeAppMock() })

    expect(() => varDef.optionsFetcher({ orgKey : '@unknown' })).not.toThrow()
    expect(varDef.optionsFetcher({ orgKey : '@unknown' })).toEqual([])
  })

  test("a known orgKey yields its real parameter names, sourced from the org's real settings", () => {
    const { varDef } = captureVarDef({ app : makeAppMock() })

    // Asserts real parameter names come back -- not just `toEqual([])`, which is exactly what the
    // broken production code path (`listParameters` reading `org.settings` off a real
    // `Organization` instance, previously `undefined`) would have silently produced.
    expect(varDef.optionsFetcher({ orgKey : '@acme' })).toEqual(
      expect.arrayContaining(['.COMMON_NAME', '.nested.LEGAL_NAME'])
    )
    expect(varDef.optionsFetcher({ orgKey : '@acme' })).toHaveLength(2)
  })
})

describe("parameterKey's validationRe (registered on '.../detail')", () => {
  const appMock = { ext : { _liqOrgs : { orgs : {} } } }
  const { varDef } = captureVarDef({ app : appMock })
  const re = new RegExp('^' + varDef.validationRe + '$')

  test('contains no named capture group', () => {
    expect(varDef.validationRe).not.toMatch(/\(\?</)
  })

  test.each([
    '.__proto__',
    '.constructor',
    '.prototype',
    '.a.__proto__.b'
  ])('rejects %p', (candidate) => {
    expect(re.test(candidate)).toBe(false)
  })

  test.each([
    '.COMMON_NAME',
    '.a.b.SOME_KEY'
  ])('accepts %p', (candidate) => {
    expect(re.test(candidate)).toBe(true)
  })
})
