import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { PlaygroundMonitor } from '@liquid-labs/playground-monitor'
import { setupCredentials } from '@liquid-labs/credentials-db-plugin-github'

const setup = async({ app, reporter, registerPathVar }) => {
  setupCredentials({ credentialsDB : app.ext.credentialsDB })
  await setupPlayground({ app })
  setupPathResolvers({ app, registerPathVar })
}

const projectNameReString = '(?:(?:@|%40)[a-zA-Z][a-zA-Z0-9-]*(?:[/]|%2F|%2f))?[a-zA-Z][a-zA-Z0-9-]*'

const setupPathResolvers = ({ app, registerPathVar }) => {
  registerPathVar('newProjectName', {
    validationRe   : projectNameReString,
    optionsFetcher : () => []
  })

  registerPathVar('projectName', {
    validationRe   : projectNameReString,
    optionsFetcher : ({ app }) => app.ext._liqProjects.playgroundMonitor.listProjects()
  })
}

const setupPlayground = async({ app }) => {
  const playgroundPath = process.env.PLUGABLE_PLAYGROUND // TOOD: pull from plugable-defaults?
    || fsPath.join(process.env.HOME, 'playground')
  await fs.mkdir(playgroundPath, { recursive : true })
  const playgroundMonitor = new PlaygroundMonitor({ root : playgroundPath })
  // works wether or not app.ext._liqProjects is defined or not
  app.ext._liqProjects = Object.assign({}, app.ext._liqProjects, { playgroundMonitor, playgroundPath })
}

export { setup }
