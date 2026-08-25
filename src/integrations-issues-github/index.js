import { createOrUpdatePullRequest } from './create-or-update-pull-request'
import { getCurrentIntegrationUser } from './get-current-integration-user'
import { getIssueURL } from './get-issue-url'
import { getProjectURL } from './get-project-url'
import { getPullRequestURLsByHead } from './get-pull-request-urls-by-head'
import { getQALinkFileIndex } from './get-qa-link-file-index'
import { usesGitHubIssues } from './uses-github-issues'

// The setup method's `name` and `deps` are a cross-package contract, not labels:
// `@liquid-labs/dependency-runner` matches by exact string, and `'setup integrations'` is a
// `plugable-express` framework built-in. Renaming either resolves silently wrong in one
// direction and loudly in the other.
//
// `npmName` in both `register()` calls below is `@sdlcforge/core-server`, not
// `@liquid-labs/liq-integrations-issues-github`: this code was absorbed into `core-server`'s own
// tree at `src/integrations-issues-github/`, and the donor package is no longer installed.
// Reporting the capability under the identity of the package that actually ships it is the
// decision recorded in `plan/resources/absorption-parity-contract.md` (item 3) -- a predicted,
// accepted diff in `GET /server/plugins/integrations/list` and in the full-tier baseline, not a
// regression. A literal rather than a `package.json` read, because this module is bundled into
// `dist/sdlcforge-server.js`, where no manifest lookup relative to this file's source location
// resolves.
//
// Everything else about both registrations is deliberately unchanged, including the fact that
// neither supplies a `name`. That omission is a real, pre-existing defect --
// `IntegrationsManager.listInstalledPlugins()` de-duplicates via
// `new Map(list.map((p) => [p.name, p]))`, so both providers, keyed on `undefined`, collapse into
// a single entry on `GET /server/plugins/integrations/list`. It is carried forward untouched on
// purpose: fixing it here would change that endpoint's body in a way the parity contract does not
// license, making a real behavior change indistinguishable from an absorption regression. It is
// tracked as a follow-up item instead.
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
        npmName      : '@sdlcforge/core-server',
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
        npmName      : '@sdlcforge/core-server',
        providerFor  : 'pull request',
        providerTest : usesGitHubIssues
      })
    }
  })
}

export { setup }
