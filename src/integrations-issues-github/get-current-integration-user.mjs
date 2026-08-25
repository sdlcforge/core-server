import { determineGitHubLogin } from '@liquid-labs/github-toolkit'

const getCurrentIntegrationUser = async({ app }) => {
  const credDB = app.ext.credentialsDB
  const authToken = await credDB.getToken('GITHUB_API')

  // determine assignee(s)
  return (await determineGitHubLogin({ authToken })).login
}

export { getCurrentIntegrationUser }
