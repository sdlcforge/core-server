import * as fsPath from 'node:path'

import { Controls } from './controls'

const loadControls = async({ app, reporter }) => {
  for (const org of Object.values(app.ext._liqOrgs.orgs)) {
    const controlsDir = fsPath.join(org.projectPath, 'data', 'org', 'controls')
    const controls = await Controls.load(controlsDir, reporter)

    org.bindRootItemManager(controls)
  }
}

export { loadControls }
