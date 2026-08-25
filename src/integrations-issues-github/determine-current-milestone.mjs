import { Octocache } from '@liquid-labs/octocache'
import { minVersion } from '@liquid-labs/versioning'

const determineCurrentMilestone = async({ app, cache, gitHubOrg, projectBasename }) => {
  const credDB = app.ext.credentialsDB
  const authToken = await credDB.getToken('GITHUB_API')

  const octocache = new Octocache({ authToken })

  const milestoneData = await octocache.paginate(`GET /repos/${gitHubOrg}/${projectBasename}/milestones`)

  const milestones = milestoneData.map((m) => m.title)

  const minTitle = minVersion({ versions : milestones, ignoreNonVersions : true })

  return milestoneData.find((m) => m.title === minTitle)?.number
}

export { determineCurrentMilestone }
