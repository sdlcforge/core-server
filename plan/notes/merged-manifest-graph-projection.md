# Merged Manifest Graph Projection

## Purpose and scope

The empirical check that [`component-order-and-manifest-mechanics.md`](./component-order-and-manifest-mechanics.md) explicitly defers: it projects the DAG-ordered seven-component manifest, runs `@liquid-labs/plugable-express`'s real `validatePluginSet()` against it, and records the exact result. Read this before authoring the manifest-merge task and before authoring the verification task that has to assert a post-merge finding set — the predicted finding set is stated here concretely enough to be asserted against.

Nothing in either real repository was modified. All measurements were taken against a throwaway package root whose `node_modules` is a symlink to `core-server`'s installed tree.

## Headline result

**The central premise holds, and it was verified by running the validator, not by reasoning about it.**

The candidate merged manifest returns:

```text
outcome  : 'ok'
exitCode : 0
counts   : { error : 0, warning : 0, info : 1 }
```

Zero error-severity findings. Both entries currently in `ALLOWLISTED_ERROR_FINDINGS` (`src/lib/test/plugin-graph-gate.test.js`) disappear, for two different reasons:

- `violated-by-source-order` / `appExt:_liqOrgs.orgs` / `@sdlcforge/core-server#controls` — **resolved by the reordering**. The edge flips to `orderVerdict: 'satisfied-by-source-order'`. This is the finding the whole reordering exists to eliminate, and it does.
- `unsatisfied` / `appExt:_liqOrgs.orgSetupMethods` / `@sdlcforge/dev-core#orgs` — **downgraded from `error` to `info`**, and renamed to `@sdlcforge/core-server#orgs`. This is the [confirmed yalc drift](./pre-merge-state.md#confirmed-yalc-drift) already recorded: the merged manifest carries `@sdlcforge/dev-core`'s `main` HEAD text, which has `"optional": true` on that requirement, whereas the stale `.yalc` copy does not. The downgrade is a consequence of carrying the *source* declaration over, not of the merge itself.

The gate test can therefore assert unconditional `outcome === 'ok'`, `exitCode === 0`, and an empty error-finding list — `ALLOWLISTED_ERROR_FINDINGS` can be deleted outright rather than trimmed.

## Validator invocation used

The harness replicates `plugin-graph-gate.test.js`'s invocation shape exactly — same exported function, same single `packageRoot` argument, same installed `@liquid-labs/plugable-express` build — the `.yalc` copy under `core-server/node_modules`, at `1.0.0-alpha.59`. The `/Users/zane/playground/liquid-labs/plugable-express` source checkout is at that same version with a clean working tree, so the behavior measured here is the behavior of that source.

```javascript
const { validatePluginSet } =
  require('/Users/zane/playground/sdlcforge/core-server/node_modules/@liquid-labs/plugable-express/dist/plugable-express.js')

const result = await validatePluginSet({ packageRoot })
```

The scratch package root is `<scratch>/merged-candidate/`, containing exactly two entries:

- `package.json` — the candidate below (the full `plugable` block, plus the `name`/`version`/`dependencies` fields the resolver reads);
- `node_modules` — a symlink to `/Users/zane/playground/sdlcforge/core-server/node_modules`.

That is sufficient because `resolvePluginSet()` (`src/lib/static-plugin-set-resolver.js`) reads only the host's own `package.json` and the installed `node_modules` tree, and never imports a plugin module.

### Harness fidelity was proven, not assumed

Before measuring the candidate, the same harness was pointed at the **real, unmodified** `/Users/zane/playground/sdlcforge/core-server`. It reproduced the documented baseline exactly:

```text
outcome  : 'validation-failure'
exitCode : 1
counts   : { error : 2, warning : 0, info : 0 }
```

with precisely the two allowlisted findings and nothing else, plus four `debug`-severity `unmanifested-node` findings. That match is what licenses reading the candidate run as a real measurement rather than a fixture artifact.

A second, faster harness (`readHostDeclaration()` + `validatePluginGraph()` directly, skipping the filesystem scan) was used for the 5040-permutation sweep below. It was cross-checked against the full `validatePluginSet()` run on the DAG order and produces an identical finding set — the four unmanifested `@liquid-labs/sdlc-projects-*` nodes contribute no `provides`/`requires` and therefore no edges, so dropping them changes nothing but runtime.

## The candidate merged manifest

All seven components' `provides`/`requires` entries are carried over verbatim: `credentials`, `controls`, `issues-github` from `core-server`'s current `builtins[0].components`; `projects`, `orgs`, `work`, `projects-audit` from `@sdlcforge/dev-core`'s source-checkout `plugable.components`. No text was edited — only re-keyed and reordered.

Two changes outside the components array are part of the candidate and are **load-bearing** (see the risk section below): `@sdlcforge/dev-core` is removed from `explicitPlugins`, and from `dependencies`.

```json
{
  "plugable": {
    "plugableManifestVersion": 1,
    "host": {
      "explicitPlugins": [
        "@liquid-labs/sdlc-projects-badges-coverage",
        "@liquid-labs/sdlc-projects-badges-github-workflows",
        "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd",
        "@liquid-labs/sdlc-projects-workflow-local-node-build"
      ],
      "builtins": [
        {
          "npmName": "@sdlcforge/core-server",
          "components": [
            {
              "component": "credentials",
              "provides": [
                { "capability": "appExt:credentialsDB", "phase": "load", "via": "src/credentials/setup.mjs — app.ext.credentialsDB = <bare assignment>" },
                { "capability": "pathVar:credential", "phase": "load", "via": "src/credentials/setup.mjs — registerPathVar('credential')" }
              ],
              "requires": [
                "setupArg:app",
                "setupArg:cache",
                "setupArg:registerPathVar",
                "setupArg:serverConfigRoot",
                { "capability": "appExt:serverConfigRoot", "phase": "runtime", "reason": "handlers/credentials/import.mjs reads it" }
              ]
            },
            {
              "component": "projects",
              "provides": [
                {
                  "capability": "appExt:_liqProjects",
                  "phase": "load",
                  "via": "src/projects/setup.mjs setupPlayground(): app.ext._liqProjects = Object.assign(...)"
                },
                {
                  "capability": "appExt:_liqProjects.playgroundMonitor",
                  "phase": "load",
                  "via": "src/projects/setup.mjs:33, a new PlaygroundMonitor({ root: playgroundPath })"
                },
                {
                  "capability": "appExt:_liqProjects.playgroundPath",
                  "phase": "load",
                  "via": "src/projects/setup.mjs:33, PLUGABLE_PLAYGROUND or $HOME/playground"
                },
                {
                  "capability": "pathVar:newProjectName",
                  "phase": "load",
                  "via": "registerPathVar('newProjectName') from src/projects/setup.mjs:16"
                },
                {
                  "capability": "pathVar:projectName",
                  "phase": "load",
                  "via": "registerPathVar('projectName') from src/projects/setup.mjs:21"
                },
                {
                  "capability": "credential:GITHUB_API",
                  "phase": "load",
                  "via": "setupCredentials() from @liquid-labs/credentials-db-plugin-github, called at src/projects/setup.mjs:8; registers the GITHUB_API credential type onto the shared app.ext.credentialsDB"
                }
              ],
              "requires": [
                {
                  "capability": "appExt:credentialsDB",
                  "phase": "load",
                  "reason": "src/projects/setup.mjs:8 passes it to setupCredentials() during plugin setup; it is also read at runtime by four handler libs, and the earlier load-phase claim subsumes those"
                },
                {
                  "capability": "appExt:serverConfigRoot",
                  "phase": "runtime",
                  "reason": "src/projects/handlers/_lib/create-lib.mjs:91"
                },
                {
                  "capability": "credential:GITHUB_API",
                  "phase": "runtime",
                  "reason": "task 003 reconciliation: credentialsDB.getToken('GITHUB_API') at handlers/_lib/archive-lib.mjs:33, destroy-lib.mjs:48, rename-lib.mjs:121, releases/_lib/do-github-release.mjs:11 -- resolves against this same component's own credential:GITHUB_API provides"
                },
                "setupArg:registerPathVar",
                "setupArg:app",
                "setupArg:reporter"
              ]
            },
            {
              "component": "orgs",
              "provides": [
                {
                  "capability": "setupMethod:prepare org dependencies",
                  "order": "first",
                  "via": "app.ext.setupMethods.push at src/orgs/setup.mjs:6-10 (deps: ['!'])"
                },
                {
                  "capability": "setupMethod:load orgs",
                  "via": "app.ext.setupMethods.push at src/orgs/setup.mjs:11-14"
                },
                {
                  "capability": "setupMethod:process org setup",
                  "order": "last",
                  "via": "app.ext.setupMethods.push at src/orgs/setup.mjs:15-19 (deps: ['*'])"
                },
                {
                  "capability": "appExt:_liqOrgs",
                  "phase": "setup",
                  "via": "setup method 'prepare org dependencies' (src/orgs/setup.mjs:9) -- created by the DependencyRunner pass, not by orgs' own setup()"
                },
                {
                  "capability": "appExt:_liqOrgs.orgs",
                  "phase": "setup",
                  "via": "setup method 'load orgs' (src/orgs/setup.mjs:26)"
                },
                {
                  "capability": "pathVar:newOrgKey",
                  "phase": "load",
                  "via": "registerPathVar('newOrgKey') from src/orgs/setup.mjs:59"
                },
                {
                  "capability": "pathVar:orgKey",
                  "phase": "load",
                  "via": "registerPathVar('orgKey') from src/orgs/setup.mjs:64"
                },
                {
                  "capability": "pathVar:parameterKey",
                  "phase": "handlers",
                  "via": "registerPathVar('parameterKey') from the handler func at src/orgs/handlers/parameters-detail.mjs:10"
                }
              ],
              "requires": [
                {
                  "capability": "appExt:setupMethods",
                  "phase": "load",
                  "reason": "src/orgs/setup.mjs:6 pushes three entries onto it from orgs' own setup()"
                },
                {
                  "capability": "appExt:_liqProjects.playgroundMonitor",
                  "phase": "setup",
                  "reason": "src/orgs/setup.mjs:29, inside the deferred 'load orgs' setup method"
                },
                {
                  "capability": "appExt:_liqOrgs.orgSetupMethods",
                  "phase": "setup",
                  "optional": true,
                  "reason": "src/orgs/setup.mjs:6-10 unconditionally initializes the array empty, and 'process org setup' (src/orgs/setup.mjs:43-54) iterates it as a no-op enqueue when liq-policy -- the array's only writer, external to this package -- is not installed"
                },
                {
                  "capability": "appExt:_liqProjects.playgroundPath",
                  "phase": "runtime",
                  "reason": "src/orgs/handlers/create.mjs, containment check anchored on the playground root before fs.mkdir"
                },
                {
                  "capability": "appExt:_liqOrgs.orgs",
                  "phase": "runtime",
                  "reason": "src/orgs/handlers/list.mjs and _lib/get-org.mjs (consumed by parameters-{detail,list,set}.mjs) - resolves against this same component's own appExt:_liqOrgs.orgs provides"
                },
                "pathVar:parameterKey",
                "setupArg:registerPathVar",
                "setupArg:app",
                "setupArg:reporter"
              ]
            },
            {
              "component": "controls",
              "provides": [
                {
                  "capability": "setupMethod:load org controls",
                  "phase": "setup",
                  "via": "pushed onto app.ext.setupMethods in src/controls/setup.mjs (func: loadControls)"
                },
                {
                  "capability": "setupMethod:load controls integrations",
                  "phase": "setup",
                  "via": "pushed onto app.ext.setupMethods in src/controls/setup.mjs (func: registerControlsIntegrations)"
                },
                {
                  "capability": "integration:controls",
                  "phase": "setup",
                  "exclusive": false,
                  "via": "setup method 'load controls integrations'"
                },
                {
                  "capability": "integrationHook:controls/getQuestionControls",
                  "phase": "setup",
                  "exclusive": false,
                  "via": "registered via app.ext.integrations.register in setup method 'load controls integrations' (src/controls/integrations/register-controls-integrations.mjs)"
                }
              ],
              "requires": [
                { "capability": "appExt:setupMethods", "phase": "load" },
                "setupMethod:load orgs",
                "setupMethod:setup integrations",
                { "capability": "appExt:integrations", "phase": "setup" },
                { "capability": "appExt:_liqOrgs.orgs", "phase": "setup" },
                { "capability": "appExt:_liqOrgs.orgs", "phase": "runtime" },
                { "capability": "appExt:_liqProjects.playgroundMonitor", "phase": "runtime" },
                "pathVar:orgKey"
              ]
            },
            {
              "component": "issues-github",
              "provides": [
                "setupMethod:register github issues integrations",
                { "capability": "integration:tickets", "phase": "setup", "exclusive": false, "conditional": true, "via": "setup method 'register github issues integrations' (providerTest: usesGitHubIssues)" },
                { "capability": "integration:pull request", "phase": "setup", "exclusive": false, "conditional": true, "via": "setup method 'register github issues integrations' (providerTest: usesGitHubIssues)" },
                { "capability": "integrationHook:tickets/getCurrentIntegrationUser", "phase": "setup", "exclusive": false },
                { "capability": "integrationHook:tickets/getIssueURL", "phase": "setup", "exclusive": false },
                { "capability": "integrationHook:tickets/getProjectURL", "phase": "setup", "exclusive": false },
                { "capability": "integrationHook:pull request/createOrUpdatePullRequest", "phase": "setup", "exclusive": false },
                { "capability": "integrationHook:pull request/getCurrentIntegrationUser", "phase": "setup", "exclusive": false },
                { "capability": "integrationHook:pull request/getPullRequestURLsByHead", "phase": "setup", "exclusive": false },
                { "capability": "integrationHook:pull request/getQALinkFileIndex", "phase": "setup", "exclusive": false }
              ],
              "requires": [
                { "capability": "appExt:setupMethods", "phase": "load" },
                "setupMethod:setup integrations",
                { "capability": "appExt:integrations", "phase": "setup" },
                { "capability": "appExt:credentialsDB", "phase": "runtime" },
                { "capability": "credential:GITHUB_API", "phase": "runtime", "optional": true, "reason": "GitHub hooks fail at call time without it; the server is otherwise healthy" },
                { "capability": "appExt:_liqProjects.playgroundMonitor", "phase": "runtime" }
              ]
            },
            {
              "component": "work",
              "provides": [
                {
                  "capability": "appExt:constants.WORK_DB_PATH",
                  "phase": "load",
                  "via": "src/work/setup.mjs:6"
                },
                {
                  "capability": "pathVar:workKey",
                  "phase": "load",
                  "via": "registerPathVar('workKey') from src/work/setup.mjs:8"
                }
              ],
              "requires": [
                {
                  "capability": "appExt:serverConfigRoot",
                  "phase": "load",
                  "reason": "src/work/setup.mjs:6 joins it into WORK_DB_PATH during plugin setup"
                },
                {
                  "capability": "appExt:constants",
                  "phase": "load",
                  "reason": "src/work/setup.mjs:6 writes a member into the container"
                },
                {
                  "capability": "appExt:_liqProjects.playgroundMonitor",
                  "phase": "runtime",
                  "reason": "24 unguarded reads across 12 request-path modules under src/work/handlers/"
                },
                {
                  "capability": "appExt:credentialsDB",
                  "phase": "runtime",
                  "reason": "9 reads, all in src/work/handlers/**/_lib/; work's own setup.mjs never touches it"
                },
                {
                  "capability": "appExt:integrations",
                  "phase": "runtime",
                  "reason": "9 callHook/hasHook sites in src/work/handlers/_lib/submit-lib.mjs and answer-set-to-md.mjs"
                },
                "setupArg:registerPathVar",
                "setupArg:app",
                "setupArg:reporter",
                {
                  "capability": "credential:GITHUB_API",
                  "phase": "runtime",
                  "reason": "task 003 reconciliation: credentialsDB.getToken('GITHUB_API') at handlers/_lib/clean-lib.mjs:25, close-lib.mjs:17, start-lib.mjs:74, status-lib.mjs:11, issues/_lib/add-lib.mjs:14,59, issues/_lib/remove-lib.mjs:25, projects/_lib/add-lib.mjs:13,38 -- resolves against the projects component's credential:GITHUB_API provides"
                },
                {
                  "capability": "integrationHook:controls/getQuestionControls",
                  "phase": "runtime",
                  "optional": true,
                  "reason": "src/work/handlers/_lib/submit-lib.mjs:94 gates the call behind hasHook and skips the submitter-attestation step when no controls provider is registered"
                }
              ]
            },
            {
              "component": "projects-audit",
              "requires": [
                {
                  "capability": "appExt:_liqProjects.playgroundMonitor",
                  "phase": "runtime",
                  "reason": "src/projects-audit/handlers/_lib/audit-lib.mjs:7 and audit-fix-lib.mjs:9"
                },
                "pathVar:projectName"
              ]
            }
          ]
        }
      ],
      "providedCapabilities": [],
      "assumeProvided": [],
      "searchPaths": []
    }
  }
}
```

## The exact outcome

`outcome: 'ok'`, `exitCode: 0`, zero error findings. No surviving error-severity finding of any kind, so the "if findings survive" branch of the question does not arise.

Resolved node set — seven builtin nodes at contiguous `loadIndex` `0`–`6`, in declared order, plus the framework node and the four unmanifested explicit plugins:

```text
@liquid-labs/plugable-express                              [framework]
@sdlcforge/core-server#credentials                         [builtin loadIndex 0]
@sdlcforge/core-server#projects                            [builtin loadIndex 1]
@sdlcforge/core-server#orgs                                [builtin loadIndex 2]
@sdlcforge/core-server#controls                            [builtin loadIndex 3]
@sdlcforge/core-server#issues-github                       [builtin loadIndex 4]
@sdlcforge/core-server#work                                [builtin loadIndex 5]
@sdlcforge/core-server#projects-audit                      [builtin loadIndex 6]
@liquid-labs/sdlc-projects-badges-coverage                 [serverPackageRoot loadIndex 0]
@liquid-labs/sdlc-projects-badges-github-workflows         [serverPackageRoot loadIndex 1]
@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd  [serverPackageRoot loadIndex 2]
@liquid-labs/sdlc-projects-workflow-local-node-build       [serverPackageRoot loadIndex 3]
```

42 edges total. Every same-phase edge and its verdict:

```text
appExt:credentialsDB           #credentials  -> #projects       @load   satisfied-by-source-order
setupMethod:load orgs          #orgs         -> #controls       @setup  satisfied-by-setup-queue-simulation
setupMethod:setup integrations framework     -> #controls       @setup  satisfied-by-setup-queue-simulation
appExt:integrations            framework     -> #controls       @setup  satisfied-by-source-order
appExt:_liqOrgs.orgs           #orgs         -> #controls       @setup  satisfied-by-source-order
setupMethod:setup integrations framework     -> #issues-github  @setup  satisfied-by-setup-queue-simulation
appExt:integrations            framework     -> #issues-github  @setup  satisfied-by-source-order
```

The fifth line is the one the reordering was for. It is the same edge that today produces `violated-by-source-order`.

## Is a different ordering needed, or admissible?

No finding survives, so no alternative ordering is *needed*. The more useful question for the plan is how tight the constraint is, so a brute-force sweep over all 7! = 5040 orderings of the seven components was run against the graph engine.

| Orderings | Error findings |
| --- | --- |
| 1260 | 0 |
| 3780 | at least 1 |

The DAG order `credentials, projects, orgs, controls, issues-github, work, projects-audit` is one of the 1260 zero-error orderings.

Exactly two distinct error signatures appear anywhere in the sweep, each in 2520 of the 5040 orderings:

```text
violated-by-source-order | appExt:credentialsDB     | @sdlcforge/core-server#projects
violated-by-source-order | appExt:_liqOrgs.orgs     | @sdlcforge/core-server#controls
```

Correspondingly, exactly two pairwise precedence constraints hold across every one of the 1260 zero-error orderings, and they are the only binding ones (1260 = 5040 / 2 / 2):

```text
credentials < projects
orgs        < controls
```

Everything else in the chosen DAG order — `projects < orgs`, `controls < issues-github`, `controls < work`, `projects < projects-audit` — is free as far as the *validator* is concerned. Those positions are justified by runtime behavior and by the consolidation contract's setup ordering, as [`component-order-and-manifest-mechanics.md`](./component-order-and-manifest-mechanics.md#the-dag-order-and-what-each-position-buys) argues, not by any graph finding. Two consequences worth carrying into the plan:

- **The validator will not catch a runtime-ordering regression in the five free positions.** `projects` before `orgs` in particular is load-bearing at runtime (`orgs`' deferred `load orgs` setup method reads `app.ext._liqProjects.playgroundMonitor`), yet the validator scores it as a cross-phase `load → setup` edge with no order verdict at all. That is a direct, measured argument for the `submodules`-vs-`components` drift assertion that note already proposes.
- **The gate is not brittle against incidental reordering.** A future editor appending a component, or shuffling `issues-github`/`work`/`projects-audit`, will not turn the gate red spuriously.

## Full post-merge finding set, all severities

This is the concrete prediction the verification phase should assert against. Five findings, no more and no fewer:

| Severity | Kind | Capability / node | Requirer |
| --- | --- | --- | --- |
| `info` | `unsatisfied` | `appExt:_liqOrgs.orgSetupMethods` | `@sdlcforge/core-server#orgs` (`optional: true`, phase `setup`) |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-badges-coverage` | — |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-badges-github-workflows` | — |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | — |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-workflow-local-node-build` | — |

`counts` reports `{ error: 0, warning: 0, info: 1 }` — `debug` findings are present in `findings` but are not tallied in `counts`.

The rendered text report, verbatim:

```text
0 error(s), 0 warning(s), 1 info; 12 resolved plugin node(s), 4 unmanifested plugin node(s).
Searched: framework, builtin, serverPackageRoot. Note: 'dynamicPluginInstallDir' and 'pluginPaths' are outside this gate's guarantee - a plugin loaded only from one of those sources is not accounted for here.

INFO (1):
- [unsatisfied] @sdlcforge/core-server#orgs requires the `app.ext` key `_liqOrgs.orgSetupMethods` at phase 'setup', but no candidate provides it. Searched: framework, builtin, serverPackageRoot. Possible cause: @liquid-labs/sdlc-projects-badges-coverage, @liquid-labs/sdlc-projects-badges-github-workflows, @liquid-labs/sdlc-projects-workflow-github-node-jest-cicd, and @liquid-labs/sdlc-projects-workflow-local-node-build have no readable manifest and could not be checked for this capability.

DEBUG (4):
- [unmanifested-node] '@liquid-labs/sdlc-projects-badges-coverage' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-badges-github-workflows' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-workflow-local-node-build' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
```

Coverage is unchanged from the pre-merge baseline: `sourcesSearched: ['builtin', 'serverPackageRoot']`, `outOfScope: ['dynamicPluginInstallDir', 'pluginPaths']`. The existing coverage-boundary test in `plugin-graph-gate.test.js` needs no change.

### Strictness flags

Both non-default strictness flags were measured against the DAG order:

- `strictOrder: true` — still `ok`, `{ error: 0, warning: 0, info: 1 }`. There is not a single `order-unprovable` edge in the merged set, because every cross-plugin edge collapses into one `builtin` node whose `loadIndex` positions are all comparable. This is a genuine improvement the merge buys and one the gate could opt into for free.
- `strictOptional: true` — **fails**, `{ error: 1, warning: 0, info: 0 }`: the `appExt:_liqOrgs.orgSetupMethods` info is promoted to an error. The gate must keep `strictOptional` at its default `false`, and no task should enable it opportunistically.

## Two failure modes the verification phase must distinguish

Both were measured, and both produce error findings that look merge-caused but are not.

### The merge must drop `@sdlcforge/dev-core` from `explicitPlugins`, in the same change

If the seven-component `builtins` block lands while `@sdlcforge/dev-core` remains an `explicitPlugins` entry with the package still installed, the result is `validation-failure` with **21 errors and 2 warnings**: every dev-core capability is provided twice, once by the builtin node and once by the still-discovered `@sdlcforge/dev-core#*` nodes.

The breakdown is 18 `conflict` findings over 15 distinct capabilities — `appExt:_liqProjects`, `appExt:_liqProjects.playgroundMonitor`, `appExt:_liqProjects.playgroundPath`, `pathVar:newProjectName`, `pathVar:projectName`, `appExt:_liqOrgs`, `appExt:_liqOrgs.orgs`, `pathVar:newOrgKey`, `pathVar:orgKey`, `pathVar:parameterKey`, `appExt:constants.WORK_DB_PATH`, `pathVar:workKey` once each, plus `setupMethod:prepare org dependencies`, `setupMethod:load orgs`, and `setupMethod:process org setup` twice each, since the conflicts model and the setup-queue model each report a `setupMethod:` collision independently — then 1 `cycle` (`@sdlcforge/core-server#orgs` ↔ `@sdlcforge/dev-core#orgs` over `pathVar:parameterKey` at `handlers` phase), the re-appearing `violated-by-source-order` error on `appExt:_liqOrgs.orgs`, the stale-copy `unsatisfied` error on `appExt:_liqOrgs.orgSetupMethods` (`@sdlcforge/dev-core#orgs`), and 2 `order-unprovable` warnings on `pathVar:parameterKey`.

This is a large, loud, unmistakable signal, not a silent regression — but a verification task that sees it should read "the `explicitPlugins` entry was not removed", not "the merged manifest is wrong". Removing the entry from `dependencies` alone is not sufficient either, since discovery is driven by the `explicitPlugins` membership filter; both must go. (`@sdlcforge/dev-core` declares `"keywords": []`, so it is never keyword-discovered — leaving the physical package in `node_modules` while removing both declarations is harmless.)

### The merge must carry `dev-core`'s source declarations, not the `.yalc` copy

The `.yalc`-installed `@sdlcforge/dev-core` differs from the source checkout in exactly one place — the `orgs` component's `requires` — and this was re-confirmed by diffing the two `plugable` blocks (`projects`, `work`, `projects-audit` are byte-identical). The installed copy lacks `"optional": true` on `appExt:_liqOrgs.orgSetupMethods` and lacks the two runtime requirements `appExt:_liqProjects.playgroundPath` and `appExt:_liqOrgs.orgs`.

Merging the DAG order while copying the **stale** text yields `validation-failure` with exactly 1 error:

```text
unsatisfied | appExt:_liqOrgs.orgSetupMethods | @sdlcforge/core-server#orgs
```

An implementer who copies from `node_modules/@sdlcforge/dev-core/package.json` rather than from the `dev-core` source checkout will hit precisely this, and it is easy to misread as "the premise was wrong". It is not — it is [the known yalc drift](./pre-merge-state.md#confirmed-yalc-drift) transcribed into the merged manifest. The merge task should name `/Users/zane/playground/sdlcforge/dev-core/package.json` (or dev-core's `main` HEAD) as the copy source explicitly.

## Related documents

- [`component-order-and-manifest-mechanics.md`](./component-order-and-manifest-mechanics.md) — the ordering decision this document empirically confirms, and the `submodules`-vs-`components` drift gap the sweep result reinforces.
- [`pre-merge-state.md`](./pre-merge-state.md) — the measured baseline, including the yalc drift that accounts for the second allowlisted finding's disappearance.
