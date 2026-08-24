/* global describe expect test */

import * as fsPath from 'node:path'

import { doListControls } from '../list-lib'
import { Controls } from '../../../../../resources/controls'

describe('doListControls', () => {
  test('can provide JSON output', async() => {
    const controlsDir = fsPath.resolve(__dirname, '..', '..', '..', '..', '..', 'resources', 'test', 'data', 'orgRootA', 'data', 'org', 'controls')

    const reporterMock = {
      log : () => {}
    }

    const appMock = {
      ext : {
        _liqOrgs : {
          orgs : {
            '@acme' : {
              controls : await Controls.load(controlsDir, reporterMock)
            }
          }
        }
      }
    }

    const reqMock = {
      accepts : () => 'application/json'
    }

    let result
    const resMock = {
      json : (json) => { result = json }
    }

    doListControls({ app : appMock, orgKey : '@acme', reporter : reporterMock, req : reqMock, res : resMock })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('test-controls')
    expect(result[0].controls).toHaveLength(1)
  })
})
