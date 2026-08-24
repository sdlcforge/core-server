import { createOrUpdatePullRequest } from './create-or-update-pull-request'
import { getCurrentIntegrationUser } from './get-current-integration-user'
import { getIssueURL } from './get-issue-url'
import { getProjectURL } from './get-project-url'
import { getPullRequestURLsByHead } from './get-pull-request-urls-by-head'
import { getQALinkFileIndex } from './get-qa-link-file-index'
import { usesGitHubIssues } from './uses-github-issues'

const setup = async({ app, reporter }) => {
  app.ext.setupMethods.push({
    name : 'register github issues integrations',
    deps : ['setup integrations'],
    func : async({ app, reporter }) => {
      app.ext.integrations.register({
        hooks : {
          getCurrentIntegrationUser,
          getIssueURL,
          getProjectURL
        },
        npmName      : '@liquid-labs/liq-integrations-issues-github',
        providerFor  : 'tickets',
        providerTest : usesGitHubIssues
      })

      app.ext.integrations.register({
        hooks : {
          createOrUpdatePullRequest,
          getCurrentIntegrationUser,
          getPullRequestURLsByHead,
          getQALinkFileIndex
        },
        npmName      : '@liquid-labs/liq-integrations-issues-github',
        providerFor  : 'pull request',
        providerTest : usesGitHubIssues
      })
    }
  })
}

export { setup }
