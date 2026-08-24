# liq-integrations-issues-github Source Inventory

## Purpose and scope

Ground-truth inventory of `@liquid-labs/liq-integrations-issues-github` as it actually exists on disk at plan-authoring time, gathered by reading source rather than by restating the committed `README.md` / `docs/liq-integrations-issues-github-spec.md`. This is the baseline every task in this plan validates against: the file census the relocation must move intact, the provider/hook surface that must survive byte-identical, the dependency inventory the `determineCurrentMilestone` inlining changes, the consumer inventory the retirement notice restates, and the anomalies each task must preserve rather than fix.

## Package identity

| Field | Value |
|---|---|
| `name` | `@liquid-labs/liq-integrations-issues-github` |
| `version` | `1.0.0-alpha.3` |
| `description` | `""` (the empty string — anomaly 6) |
| `main` | `dist/liq-integrations-issues-github.js` |
| `license` | `UNLICENSED` |
| `engines.node` | `>=18.0.0` |
| Published versions on npm | `1.0.0-alpha.1`, `1.0.0-alpha.2`, `1.0.0-alpha.3` |

The current `version` is already published, so the retirement bump target is `1.0.0-alpha.4`.

## File census

Ten files under `src/`, all at the top level except the one test:

| Path | Role |
|---|---|
| `src/index.js` | `setup()` — the plugin's entire external surface; pushes one `setupMethods` entry that makes two `app.ext.integrations.register()` calls |
| `src/constants.mjs` | `GH_BASE_URL` (`https://github.com`), `WORKSPACE` (`workspace`) |
| `src/uses-github-issues.mjs` | `usesGitHubIssues` — the shared `providerTest` for both registrations |
| `src/create-or-update-pull-request.mjs` | `createOrUpdatePullRequest`, plus module-private `createPR` and `updatePR` helpers |
| `src/get-current-integration-user.mjs` | `getCurrentIntegrationUser` |
| `src/get-issue-url.mjs` | `getIssueURL` |
| `src/get-project-url.mjs` | `getProjectURL` |
| `src/get-pull-request-urls-by-head.mjs` | `getPullRequestURLsByHead` |
| `src/get-qa-link-file-index.mjs` | `getQALinkFileIndex` |
| `src/test/uses-github-issues.test.js` | The repository's only test — two cases against `usesGitHubIssues` |

There is no test-data fixture directory. `src/test/uses-github-issues.test.js` imports its subject as `'../uses-github-issues'`, a relative path inside the tree, so it survives a whole-subtree relocation unchanged.

## Provider and hook surface

`src/index.js`'s `setup()` pushes exactly one setup method:

- `name: 'register github issues integrations'`
- `deps: ['setup integrations']`

`@liquid-labs/dependency-runner` matches these by exact string and `'setup integrations'` is a `plugable-express` framework built-in, so both strings are load-bearing and must survive relocation and absorption verbatim.

That method makes two `app.ext.integrations.register()` calls:

| `providerFor` | Hooks | `providerTest` | `npmName` |
|---|---|---|---|
| `tickets` | `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` | `usesGitHubIssues` | `@liquid-labs/liq-integrations-issues-github` |
| `pull request` | `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` | `usesGitHubIssues` | `@liquid-labs/liq-integrations-issues-github` |

Seven hook registrations across the two providers (`getCurrentIntegrationUser` appears in both).

**This donor contributes zero HTTP routes.** Its whole surface is the two provider registrations above. Nothing in a route table, api-spec snapshot, or handler census can confirm that a relocation or absorption of this package worked — the provider/hook table is the only observable contract, which is why `core-server`'s own absorb task pins its verification to a `register()`-call baseline rather than a route snapshot.

## Host contract required

- `app.ext.integrations.register` — the registration entry point.
- `app.ext.credentialsDB.getToken('GITHUB_API')` — read by `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, and (after Phase 12) the inlined `determineCurrentMilestone`.
- `app.ext._liqProjects.playgroundMonitor.getProjectData(projectFQN)` — read by `createOrUpdatePullRequest`.
- `app.ext.setupMethods` — pushed to by `setup()`.

## Dependency inventory

Declared in `package.json` `dependencies`:

| Package | Declared range | Actually imported by |
|---|---|---|
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.15` | `create-or-update-pull-request.mjs` (`determineOriginAndMain`) |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.16` | `create-or-update-pull-request.mjs`, `get-current-integration-user.mjs`, `get-qa-link-file-index.mjs` |
| `@liquid-labs/liq-projects-lib` | `^1.0.0-alpha.11` | `create-or-update-pull-request.mjs` (`determineCurrentMilestone` **only**) — removed by Phase 12 |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.8` | `create-or-update-pull-request.mjs`, `get-qa-link-file-index.mjs` (`getGitHubQAFileLinks`) |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.7` | `create-or-update-pull-request.mjs` (`tryExec`) |

Imported but **not** declared:

| Package | Installed version | Imported by | How it resolves today |
|---|---|---|---|
| `@liquid-labs/octocache` | `1.0.0-alpha.4` | `create-or-update-pull-request.mjs` (`Octocache`) | Transitively — declared by both `@liquid-labs/github-toolkit` (`^1.0.0-alpha.3`) and `@liquid-labs/liq-projects-lib` (`^1.0.0-alpha.4`) |

Needed **after** Phase 12's inlining and currently reachable only through the dependency being removed:

| Package | Installed version | Needed by | Sole provider today |
|---|---|---|---|
| `@liquid-labs/versioning` | `1.0.0-alpha.6` | the inlined `determineCurrentMilestone` (`minVersion`) | `@liquid-labs/liq-projects-lib` (`^1.0.0-alpha.4`) — the package Phase 12 removes |

This last row is the sharp edge of Phase 12: dropping `@liquid-labs/liq-projects-lib` from `dependencies` without declaring `@liquid-labs/versioning` leaves the inlined function importing a package with no declared provider at all. `@liquid-labs/octocache` survives the drop (because `github-toolkit` still declares it) but stays an undeclared-transitive hazard either way.

`@liquid-labs/versioning` is a live, separately-maintained package and is **not** part of any retirement in this wave. `minVersion` is therefore imported from it rather than inlined a second level down.

## `determineCurrentMilestone` — the function being inlined

Source: `/Users/zane/playground/liquid-labs/liq-projects-lib/src/determine-current-milestone.mjs`, 19 lines including imports and the export. Verbatim:

```javascript
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
```

Call site: `create-or-update-pull-request.mjs` line 126, inside the module-private `createPR` helper —

```javascript
const milestonePromise = determineCurrentMilestone({ app, cache, gitHubOrg, projectBasename })
```

— raced with a repo-metadata request via `Promise.all`, and the resolved `milestone` handed to the `PATCH /repos/{owner}/{repo}/issues/{issueNumber}` call that sets assignees and milestone on the freshly-created PR. That `PATCH` is inside `createPR`'s `try`/`catch`, so a milestone-determination failure is already non-fatal: it is reported via `reporter` and the PR URL is still returned.

`liq-projects-lib` exports it from `src/index.js` alongside `crossLinkDevProjects` and `updatePackageJSON`; only `determineCurrentMilestone` is imported here.

**There is no test coverage to port.** `liq-projects-lib/src/test/` holds `cross-link-dev-projects.test.js` and `update-package-json.test.js` only — nothing exercises `determineCurrentMilestone`. Any test this plan adds is new coverage, not a port.

Two structural oddities in the function, both to be carried across verbatim rather than cleaned up during the inlining (anomaly 3): the destructured `cache` parameter is never used in the body, and the function constructs a **second** `Octocache` from the same `GITHUB_API` token even though its only caller already holds one.

## Consumer inventory

Playground-wide `package.json` grep for `liq-integrations-issues-github`, excluding `node_modules/` and worktree copies: the sole npm dependent is **`@sdlcforge/core-server`** (`^1.0.0-alpha.3`, in its `dependencies` and in its `explicitPlugins` array). This matches the single-dependent pattern the other two donors in this plan-group show.

Nothing outside this repository imports any of this package's hook functions directly; consumption is entirely through the plugin-loader path.

## Residual `liq-projects-lib` coupling elsewhere in the playground

Relevant because Phase 12 exists specifically to unblock `liq-projects-lib`'s final npm deprecation. A playground-wide source grep found:

- `create-or-update-pull-request.mjs`'s `determineCurrentMilestone` import — this project's, the one Phase 12 removes.
- `sdlcforge/core-server/.yalc/@liquid-labs/liq-work/src/handlers/work/_lib/work-db.mjs` — imports `crossLinkDevProjects` from `@liquid-labs/liq-projects-lib`. The **live** `liquid-labs/liq-work` repository has already inlined that function at `src/work/handlers/_lib/cross-link-dev-projects.mjs` and imports it relatively, so this is a stale `.yalc` snapshot inside `core-server`, not a live dependent. It is nonetheless a real `package.json` declaration inside `core-server`'s tree.

This plan does not act on the `.yalc` staleness; it is recorded here so the finding reaches whoever closes out `liq-projects-lib`'s own deprecation task, which should not be surprised by a grep hit it did not expect.

## Build and test wiring

Root `Makefile`, four variables set before the shared `@liquid-labs/catalyst-scripts-node-project` preamble:

```makefile
BUILD_KEY:=liq-integrations-issues-github
SRC:=src
CATALYST_JS_LIB_SRC_PATH:=$(SRC)
CATALYST_NODE_PROJECT_LIB_ENTRY_POINT=$(CATALYST_JS_LIB_SRC_PATH)/index.js
```

Every file-set variable is `find`-based over `$(SRC)` and re-evaluates at each `make` invocation, so a subtree relocation under `src/` needs **no `Makefile` change** — the same conclusion the sibling `liq-credentials` donor reached and verified. The entry point stays `src/index.js`, which is why the relocation must leave a thin re-export there rather than deleting the file.

`make test` Babel-transpiles `src/` into `test-staging/` and runs Jest against the transpiled output; `make lint` runs ESLint over `src/` ignoring `dist/`, `test-staging/`, and `docs/`; `make qa` is test + lint. `make build` Rollup-bundles to `dist/liq-integrations-issues-github.js`.

## Anomalies and flags

1. **`@liquid-labs/octocache` is imported but undeclared.** `create-or-update-pull-request.mjs` imports `Octocache` from it; `package.json` declares nothing. It resolves transitively through `@liquid-labs/github-toolkit` and `@liquid-labs/liq-projects-lib` today, and still resolves through `github-toolkit` after Phase 12 drops the latter. `core-server`'s own absorb task handles this on its side (its requirement 5, because `nodeExternals()` decides externality from `package.json` and would silently inline an undeclared bare specifier into the bundle). Phase 12 declares it here too, since the inlined function adds a second `Octocache` import inside this repository.

2. **`@liquid-labs/versioning` is not in `core-server`'s dependency-union list.** `core-server`'s absorb task enumerates `git-toolkit`, `github-toolkit`, `shell-toolkit`, `liq-qa-lib`, and `octocache`, and treats `liq-projects-lib` as conditional on the inlining state. It does not name `@liquid-labs/versioning`, which the inlined function requires. Its own requirement 6 says to absorb whatever the donor's source actually is at merge time, so the union is meant to be re-derived rather than copied — but this specific addition should be surfaced explicitly to whoever runs that task.

3. **The inlined function carries two structural oddities**: an unused destructured `cache` parameter, and a redundant second `Octocache` construction when its only caller already has one. Both are preserved verbatim by Phase 12; "inline" means relocate the implementation, not improve it. Either would be a reasonable follow-up **after** the fold lands, never during it.

4. **Both `register()` calls omit `name`.** `IntegrationsManager.listInstalledPlugins()` de-duplicates by `name`, so the two registrations collapse into a single entry in `GET /server/plugins/integrations/list`. This is a known pre-existing defect. It must **not** be fixed anywhere in this plan: `core-server`'s absorb task (its requirement 10) captures the current two-entry body as a parity baseline, and a fix landing mid-fold would make a real behavior change indistinguishable from an absorption regression. A follow-up covering it was already recorded on `core-server`'s side.

5. **Branch reachability.** `core-server`'s absorb task verifies and merges this donor's **`plan/core-server-domain-consolidation` branch, not `main`**. That branch currently sits at `647cd7b`, the merge-base with `main`; `main` is three commits ahead (`70e1f9b` plan-worktree open, `a2e815b` wave back-pointer, `af00846` the README/AGENTS/spec/project-structure authoring). Both the Phase 12 inlining and the Phase 13 relocation must end up reachable from whichever branch `core-server` actually verifies, or `core-server` will absorb a pre-inline, pre-relocation tree. No task in this plan performs branch surgery; each reports which branches carry its result so the dispatching manager can reconcile before `core-server`'s absorb task is dispatched.

6. **`package.json` `description` is the empty string.** `plugable-express`'s loader derives the server-visible plugin `summary` from the package description, so this plugin has always reported a blank summary. Phase 14 replaces it with a deprecation-leading string.

7. **Publishing hygiene.** There is no `files` allowlist and no `.npmignore`, while `.gitignore` excludes `/dist`. npm therefore falls back to `.gitignore` and the published tarball depends on npm's force-include of `package.json`, `README.md`, and the `main` file. Identical to the condition the sibling `liq-credentials` donor recorded; verify against `npm pack --dry-run` output at retirement time rather than reasoning from the working tree.

8. **Documentation already exists and will go stale mid-plan.** `README.md`, `AGENTS.md`, `docs/liq-integrations-issues-github-spec.md`, and `docs/project-structure.md` are committed to `main` (commit `af00846`), and are therefore **not** present on the `plan/core-server-domain-consolidation` branch this plan worktree is cut from — read them from the `main` checkout. The spec's "Constraints and assumptions" section and one Key-use-case outcome sentence both describe the `liq-projects-lib` import as a live, unresolved external dependency; `AGENTS.md` says the same in two places. Phase 12 task 002 corrects exactly those claims. Phase 14's README task **rewrites** the existing `README.md` as a superseded notice rather than authoring one from scratch.
