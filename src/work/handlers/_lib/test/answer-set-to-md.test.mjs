/* global describe expect jest test */
import { IntegrationsManager } from '@liquid-labs/plugable-express'

import { answerSetToMd } from '../answer-set-to-md'

// `answerSetToMd`'s 'related projects' branch resolves a GitHub org/basename off of another
// project's package.json via `getGitHubOrgAndProjectBasename`; that plumbing is unrelated to
// the `IntegrationsManager` provider-resolution bug this test targets, so it's stubbed out to
// keep the test focused.
jest.mock('@liquid-labs/github-toolkit', () => ({
  getGitHubOrgAndProjectBasename : jest.fn().mockReturnValue({ org : 'otherOrg', projectBasename : 'proj2' })
}))

describe('answerSetToMd', () => {
  test("resolves the 'pull request' provider (not 'pull requests') when linking related projects' PRs", async() => {
    const getPullRequestURLsByHead = jest.fn().mockResolvedValue('https://github.com/otherOrg/proj2/pulls?q=head')
    const getCurrentIntegrationUser = jest.fn().mockResolvedValue('some-user')
    const getIssueURL = jest.fn().mockResolvedValue('https://github.com/orgA/proj1/issues/1')
    const getProjectURL = jest.fn().mockResolvedValue('https://github.com/otherOrg/proj2')

    const integrations = new IntegrationsManager()
    integrations.register({
      providerFor  : 'pull request',
      providerTest : () => true,
      hooks        : { getCurrentIntegrationUser, getPullRequestURLsByHead }
    })
    integrations.register({
      providerFor  : 'tickets',
      providerTest : () => true,
      hooks        : { getIssueURL, getProjectURL }
    })

    const app = {
      ext : {
        integrations,
        _liqProjects : {
          playgroundMonitor : {
            getProjectData : jest.fn().mockResolvedValue({ packageJSON : { name : '@otherOrg/proj2' } })
          }
        }
      }
    }

    const md = await answerSetToMd({
      app,
      answerSet   : { results : [] },
      closes      : ['orgA/proj1#1'],
      closeTarget : '@orgA/proj1',
      gitHubOrg   : 'orgA',
      noQA        : true,
      packageJSON : { name : '@orgA/proj1' },
      projectFQN  : '@orgA/proj1',
      projectPath : '/fake/path',
      projects    : [{ name : '@orgA/proj1' }, { name : '@otherOrg/proj2' }],
      reporter    : { push : () => {} },
      workKey     : 'orgA/proj1/1'
    })

    // The pre-fix typo ('pull requests') left no provider registered under that key, so
    // `IntegrationsManager.callHook` threw "No provider found for 'pull requests'." instead
    // of ever reaching these hooks or returning markdown.
    expect(getPullRequestURLsByHead).toHaveBeenCalledWith({ gitHubOrg : 'otherOrg', project : 'proj2', head : 'orgA/proj1/1' })
    expect(md).toContain('https://github.com/otherOrg/proj2/pulls?q=head')
  })
})
