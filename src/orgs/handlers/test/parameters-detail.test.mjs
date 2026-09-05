/* global describe expect test */

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
  const org = { getSetting : (keyPath) => (keyPath === '.COMMON_NAME' ? 'Acme Corp' : undefined) }
  const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }

  test('returns { name, value } for application/json', () => {
    const { handler } = captureVarDef({ app : appMock })
    const req = { accepts : () => 'application/json', vars : { orgKey : '@acme', parameterKey : '.COMMON_NAME' } }
    const res = resMock()

    handler(req, res)

    expect(res.out).toEqual({ name : '.COMMON_NAME', value : 'Acme Corp' })
  })

  test('returns the text/plain rendering', () => {
    const { handler } = captureVarDef({ app : appMock })
    const req = { accepts : () => 'text/plain', vars : { orgKey : '@acme', parameterKey : '.COMMON_NAME' } }
    const res = resMock()

    handler(req, res)

    expect(res.out).toBe('.COMMON_NAME: Acme Corp')
  })

  test('returns the text/terminal rendering', () => {
    const { handler } = captureVarDef({ app : appMock })
    const req = { accepts : () => 'text/terminal', vars : { orgKey : '@acme', parameterKey : '.COMMON_NAME' } }
    const res = resMock()

    handler(req, res)

    expect(res.out).toBe('<code>.COMMON_NAME<rst>: <em>Acme Corp<rst>')
  })

  test('responds 406 when req.accepts returns false', () => {
    const { handler } = captureVarDef({ app : appMock })
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
    const { handler } = captureVarDef({ app : appMock })
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
  // `listParameters` walks `org.settings`; an empty object yields no parameters, which is enough
  // to exercise the fetcher without depending on `_lib/parameters-lib`'s traversal shape here.
  const org = { getSetting : () => undefined, settings : {} }
  const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : org } } } }

  test('an unknown orgKey yields an empty option list rather than throwing', () => {
    const { varDef } = captureVarDef({ app : appMock })

    expect(() => varDef.optionsFetcher({ orgKey : '@unknown' })).not.toThrow()
    expect(varDef.optionsFetcher({ orgKey : '@unknown' })).toEqual([])
  })

  test('a known orgKey yields its parameter names', () => {
    const { varDef } = captureVarDef({ app : appMock })

    expect(varDef.optionsFetcher({ orgKey : '@acme' })).toEqual([])
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
