import * as fsPath from 'node:path'

import { readFJSON } from '@liquid-labs/federated-json'
import { tryExec } from '@liquid-labs/shell-toolkit'

const crossLinkDevProjects = async({ app, dryRun, projects, reporter }) => {
  // first, let's extarct necessary data and build out our view of the question
  const crossLinks = {}
  reporter?.push(`Gathering project data for ${projects.length} projects...`)
  for (const projectFQN of projects) {
    const projectPath = (await app.ext._liqProjects.playgroundMonitor.getProjectData(projectFQN))?.projectPath
    if (projectPath === undefined) {
      throw new Error(`Was asked to cross-link '${projectFQN}' but no such project was found.`)
    }

    const pkgPath = fsPath.join(projectPath, 'package.json')
    const pkgData = readFJSON(pkgPath)
    const npmDeps =
      Object.keys(pkgData.dependencies || {})
        .concat(Object.keys(pkgData.devDependencies || {}))
        .concat(Object.keys(pkgData.peerDependencies || {}))
        .concat(Object.keys(pkgData.optionalDependencies || {}))
    crossLinks[projectFQN] = {
      npmName : pkgData.name,
      npmDeps,
      projectPath
    }
  }

  // now, we analyze
  const links = []
  reporter?.push('Analyzing dependency data...')
  for (const dependencyFQN of projects) {
    const { npmName: dependencyNPMName, projectPath: dependencyPath } = crossLinks[dependencyFQN]

    const otherProjects = projects.filter((p) => p !== dependencyFQN)
    for (const dependentFQN of otherProjects) {
      const { npmDeps, projectPath: dependentPath } = crossLinks[dependentFQN]
      if (npmDeps.includes(dependencyNPMName)) {
        links.push({ dependencyFQN, dependencyNPMName, dependencyPath, dependentFQN, dependentPath })
      }
    }
  }

  if (dryRun !== true) {
    for (const { dependencyFQN, dependencyNPMName, dependencyPath, dependentFQN, dependentPath } of links) {
      reporter?.push(`Linking dependency ${dependencyFQN} to dependent ${dependentFQN}...`)
      tryExec(`cd '${dependencyPath}' && yalc publish`)
      tryExec(`cd '${dependentPath}' && yalc add ${dependencyNPMName}`)
    }
  }

  return links
}

export { crossLinkDevProjects }
