import { DependencyRunner } from '@liquid-labs/dependency-runner'

import { Organization } from './resources/organization'

const setup = ({ app, reporter, registerPathVar }) => {
  app.ext.setupMethods.push({
    name : 'prepare org dependencies',
    deps : ['!'],
    func : ({ app }) => { app.ext._liqOrgs = { orgSetupMethods : [] } }
  })
  app.ext.setupMethods.push({
    name : 'load orgs',
    func : loadOrgs
  })
  app.ext.setupMethods.push({
    name : 'process org setup',
    deps : ['*'],
    func : processOrgSetup
  })

  setupPathResolvers({ app, registerPathVar })
}

const loadOrgs = async({ app, reporter }) => {
  const orgsData = {}
  app.ext._liqOrgs.orgs = orgsData

  for (const { packageJSON, projectPath } of
    Object.values(await app.ext._liqProjects.playgroundMonitor.getProjectsData())) {
    if (packageJSON.liq?.packageType === 'org') {
      loadOrg({ orgsData, packageJSON, projectPath })
    }
  }
}

const loadOrg = ({ orgsData, packageJSON, projectPath }) => {
  const { name: pkgName } = packageJSON
  const [orgName] = pkgName.split('/')

  orgsData[orgName] = new Organization({ name : orgName, pkgName, projectPath })
}

const processOrgSetup = async({ app, cache, reporter }) => {
  const orgDepRunner = new DependencyRunner({ runArgs : { app, cache, reporter } })
  for (const org of Object.values(app.ext._liqOrgs.orgs)) {
    for (const orgSetupMethod of app.ext._liqOrgs.orgSetupMethods) {
      const orgArgs = { org, orgKey : org.key }
      const mergedEntry = Object.assign({ args : orgArgs }, orgSetupMethod)
      orgDepRunner.enqueue(mergedEntry)
    }
  }
  orgDepRunner.complete()
  await orgDepRunner.await()
}

const orgNameREString = '(?:@|%40)[a-z][a-zA-Z0-9-]*'

const setupPathResolvers = ({ app, registerPathVar }) => {
  registerPathVar('newOrgKey', {
    validationRe   : orgNameREString,
    optionsFetcher : ({ currToken, newOrgKey }) => newOrgKey ? [newOrgKey] : []
  })

  registerPathVar('orgKey', {
    validationRe   : orgNameREString,
    optionsFetcher : ({ app }) => Object.keys(app.ext._liqOrgs.orgs)
  })
}

export { setup }
