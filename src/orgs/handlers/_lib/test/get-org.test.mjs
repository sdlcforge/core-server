/* global describe expect test */

import { getOrg } from '../get-org'

describe('getOrg', () => {
  const acmeOrg = { name : '@acme' }

  const appMock = {
    ext : {
      _liqOrgs : {
        orgs : {
          '@acme' : acmeOrg
        }
      }
    }
  }

  test('returns the org for a known key', () => {
    expect(getOrg({ app : appMock, orgKey : '@acme' })).toBe(acmeOrg)
  })

  test('throws a 404 for an unknown key', () => {
    try {
      getOrg({ app : appMock, orgKey : '@unknown' })
      throw new Error('getOrg should have thrown')
    }
    catch (e) {
      expect(e.status).toBe(404)
      expect(e.message).toMatch(/@unknown/)
    }
  })

  test('throws a clear error when the org registry container is missing', () => {
    const brokenAppMock = { ext : {} }
    expect(() => getOrg({ app : brokenAppMock, orgKey : '@acme' })).toThrow(/_liqOrgs/)
  })
})
