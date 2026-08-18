/* global describe expect test */
import * as fsPath from 'node:path'

import { crossLinkDevProjects } from '../cross-link-dev-projects'

describe('crossLinkDevProjects', () => {
  test('can deal with lack of dependencies', async() => {
    const proj1Path = fsPath.join(__dirname, 'data', 'cross-link', 'orgA', 'proj1')

    const appMock = {
      ext : {
        _liqProjects : {
          playgroundMonitor : {
            getProjectData : async() => ({ projectPath : proj1Path })
          }
        }
      }
    }

    const playground = fsPath.resolve(fsPath.join(__dirname, 'data'))
    try {
      const links = await crossLinkDevProjects({
        app      : appMock,
        dryRun   : true,
        playground,
        projects : ['@orgA/proj1']
      })
      expect(links).toHaveLength(0)
    }
    catch (e) {
      throw new Error('Unexpected exception: ' + e.message, { cause : e })
    }
  })
})
