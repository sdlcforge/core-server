/* global describe expect test */
import { getAuditEndpointParameters } from './audit-lib'
import { commonAuditPathParameters } from './common-audit-path-parameters'

// essentially a placeholder test because it's the easiest way to satisfiy the qa requirement for now
describe('getAuditEndpointParameters', () => {
  test('returns expected structure', () => {
    const result = getAuditEndpointParameters({ workDesc : 'test' })

    expect(result).toHaveProperty('help')
    expect(result).toHaveProperty('method')
    expect(result).toHaveProperty('parameters')

    expect(result.method).toBe('get')
    expect(result.parameters).toEqual(commonAuditPathParameters)

    expect(result.help.name).toContain('test')
    expect(result.help.summary).toContain('test')
    expect(result.help.description).toContain('test')
  })
})
