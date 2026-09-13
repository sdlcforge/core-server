/* global describe expect test */
import { doAudit, getAuditEndpointParameters } from './audit-lib'
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

describe('doAudit', () => {
  test('throws a 404 (not a 500) for an unknown project name', async() => {
    const appMock = {
      ext : {
        _liqProjects : {
          playgroundMonitor : {
            getProjectData : async() => undefined
          }
        }
      }
    }

    await expect(doAudit({ app : appMock, projectName : 'no-such-project', req : {}, res : {} }))
      .rejects.toHaveProperty('status', 404)
  })
})
