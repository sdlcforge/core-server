import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import yaml from 'js-yaml'

const getQuestionControls = async({ app, controlsName, projectName, reporter }) => {
  const { packageJSON, projectPath } = await app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)

  const packageControlsPath = fsPath.join(projectPath, 'controls', controlsName + '.qcontrols.yaml')
  let controlsContent
  // load controlsContent
  reporter.log(`Attempting to load '${controlsName}' controls from: ${packageControlsPath}...`)
  try {
    controlsContent = await fs.readFile(packageControlsPath, { encoding : 'utf8' })
    reporter.log('  success')

    const controlsSpec = yaml.load(controlsContent)
    return controlsSpec
  }
  catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    } // else, no problem, just doesn't define the control at the package level
    reporter.log('  not found')

    let orgKey = packageJSON._comply?.orgKey
    if (orgKey !== undefined) {
      reporter.log(`Found override orgKey '${orgKey}' in 'package.json:_comply.orgKey'...\n`)
    }
    else {
      let basename
      ;[orgKey, basename] = projectName.split('/')
      if (basename === undefined) { // three is no override and we can't determine the orgKey from the package name
        throw new Error("Did not find expected '_comply.orgKey' in the 'package.json' file. This value must be defined for unscoped packages.")
      }
    }

    const org = app.ext._liqOrgs.orgs[orgKey]
    if (org !== undefined) {
      // the 'controls' ItemManager is bound to the org by this plugin 'setup' and loadControls'.
      const controlsSpec = org.controls.getControl(controlsName)

      return controlsSpec
    }
    else {
      reporter.log(`Did not find 'org' data for '${orgKey}'. Consider creating custom '${controlsName}' controls in package (${packageControlsPath}) or set 'package.json:_comply.orgKey' to specify an existing org.`)
    }
  } // controlsContent load section

  return undefined
}

export { getQuestionControls }
