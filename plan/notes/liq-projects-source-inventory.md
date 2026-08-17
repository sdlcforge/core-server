# liq-projects Source Inventory and Migration Mapping

## Purpose and scope

Ground-truth inventory of what `@liquid-labs/liq-projects` actually contains at plan-authoring time, the exact old-path → new-path mapping into the dev-core layout ([D2](./dev-core-target-shape.md#d2--internal-layout-one-submodule-directory-per-donor)), the validation baseline later tasks measure against, the full consumer inventory, and the pre-existing defects this plan surfaces without fixing.

Everything here was read from source, not from the README. Where the README and the source disagree, the source is recorded.

## Package facts

- Name `@liquid-labs/liq-projects`, version `1.0.0-alpha.15`, `main: dist/liq-projects.js`, `license: UNLICENSED`, `engines.node >=18.0.0`.
- 59 git-tracked files under `src/` — 1 root `index.js`, 1 `setup.mjs`, 2 `index.js` aggregators, 17 top-level handler modules, 14 `_lib/` modules, 9 files under `_lib/test/` (2 tests + 7 data fixtures), 9 under `test/`, and 6 under `releases/` — plus 32 git-tracked generated HTML files under `docs/`, plus `Makefile`, `make/*.mk` (8 files), `README.md`, `.gitignore`, `.sdlc-data.yaml`, `.catalyst-data.yaml`, `package.json`, `package-lock.json`.
- 16 runtime dependencies, 3 devDependencies (`@liquid-labs/sdlc-resource-{babel-and-rollup,eslint,jest}`).
- Runtime dependencies to union into dev-core ([D4](./dev-core-target-shape.md#d4--absorption-mechanic-history-preserving-per-donor-conflict-free) step 3): `@liquid-labs/credentials-db-plugin-github ^1.0.0-alpha.5`, `@liquid-labs/federated-json ^1.0.0-alpha.34`, `@liquid-labs/git-toolkit ^1.0.0-alpha.16`, `@liquid-labs/github-toolkit ^1.0.0-alpha.20`, `@liquid-labs/http-smart-response ^1.0.0-alpha.6`, `@liquid-labs/liq-credentials-db ^1.0.0-alpha.7`, `@liquid-labs/liq-qa-lib ^1.0.0-alpha.9`, `@liquid-labs/npm-toolkit ^1.0.0-alpha.21`, `@liquid-labs/octocache ^1.0.0-alpha.4`, `@liquid-labs/playground-monitor ^1.0.0-beta.4`, `@liquid-labs/semver-plus ^1.0.0-alpha.11`, `@liquid-labs/shell-toolkit ^1.0.0-alpha.10`, `highlight.js ^11.9.0`, `http-errors ^2.0.0`, `natural-sort ^1.0.0`, `shelljs ^0.8.5`.
- `package.json` also carries a `liq` block (`orgBase`, `packageType: "node|server|lib"`, `tags: [plugin:liq-core, type:plugin:liq-core, implements:documentation]`). A playground-wide grep found no code reading `liq.orgBase`, `liq.packageType`, or `liq.tags` in `plugable-express`, `liq-plugins-lib`, `core-server`, or any donor — with one live exception in the *data* direction: `liq-orgs`' `loadOrgs` reads `packageJSON.liq?.packageType === 'org'` from **scanned playground projects**, not from a plugin's own manifest. The block is therefore vestigial for this package and is not carried into dev-core.

## Route surface (19 handlers)

Verified against the handler modules' own `path` exports, not the README table. `src/handlers/projects/index.js` pushes 17 handlers onto the array exported by `src/handlers/projects/releases/index.js`, which itself holds 2 — 19 total.

| Operation | Method | Explicit path | Implied path |
|---|---|---|---|
| create | POST | `/projects/create` | — |
| setup | POST | `/projects/:projectName/setup` | `/projects/setup` |
| detail | GET | `/projects/:projectName/detail` | `/projects/detail` |
| rename | POST | `/projects/:projectName/rename` | `/projects/rename` |
| update | PUT | `/projects/:projectName/update` | `/projects/update` |
| document | PUT | `/projects/:projectName/document` | `/projects/document` |
| close | DELETE | `/projects/:projectName/close` | `/projects/close` |
| archive | PUT | `/projects/:projectName/archive` | `/projects/archive` |
| destroy | DELETE | `/projects/:projectName/destroy` | `/projects/destroy` |
| releases/publish | POST | `/projects/:projectName/releases/publish` | `/projects/releases/publish` |

Route paths come from each module's `path` array (e.g. `['projects', ':projectName', 'archive']`), so relocation cannot change them.

## Plugin surface

- `src/index.js`: `export * from './handlers'`, `export * from './setup'`, plus inert `name = 'core-projects'` / `summary` exports ([D5](./dev-core-target-shape.md#d5--plugin-contract-one-package-one-plugin)).
- `src/handlers/index.js`: a two-line re-export of `./projects` with two commented-out `orgs` lines — deleted at restructure, not carried forward.
- `src/setup.mjs`: `setupCredentials({ credentialsDB: app.ext.credentialsDB })`, then `setupPlayground` (mkdir `PLUGABLE_PLAYGROUND` or `$HOME/playground`, construct `PlaygroundMonitor`, assign `app.ext._liqProjects`), then `setupPathResolvers` (`registerPathVar('newProjectName', …)`, `registerPathVar('projectName', …)` whose `optionsFetcher` reads `app.ext._liqProjects.playgroundMonitor.listProjects()`). Also carries a ~35-line commented-out `installProjectPlugins` block.

## Path mapping (old → new)

| Old path (liq-projects) | New path (dev-core) |
|---|---|
| `src/index.js` | dropped at absorb; superseded by dev-core's own `src/index.mjs` ([D3](./dev-core-target-shape.md#d3--rootfile-ownership)). During the transition it becomes a thin re-export of `./projects`. |
| `src/setup.mjs` | `src/projects/setup.mjs` |
| `src/handlers/index.js` | deleted (trivial re-export) |
| *(new file)* | `src/projects/index.mjs` — exports `{ handlers, setup }` |
| `src/handlers/projects/index.js` | `src/projects/handlers/index.js` |
| `src/handlers/projects/<handler>.mjs` (17 files, incl. `document.js`) | `src/projects/handlers/<handler>.mjs` |
| `src/handlers/projects/_lib/**` (14 modules) | `src/projects/handlers/_lib/**` |
| `src/handlers/projects/_lib/test/**` (2 tests + 7 data files) | `src/projects/handlers/_lib/test/**` |
| `src/handlers/projects/test/**` (6 `.test.mjs`, 1 stray `.mjs`, 2 `test/lib/` helpers) | `src/projects/handlers/test/**` |
| `src/handlers/projects/releases/**` (2 handlers, `index.js`, 3 `_lib` modules) | `src/projects/handlers/releases/**` |
| `docs/**` (32 generated HTML files) | not carried over (see "Generated docs" below) |
| `README.md` route table + integration notes | ported into dev-core's `README.md`/`docs/` at absorb time; the liq-projects `README.md` itself becomes a superseded notice ([D10](./dev-core-target-shape.md#d10--donor-retirement-policy-documentation-and-metadata-not-deletion-no-shim)) |

Only three imports in the entire tree cross a directory boundary — `src/handlers/projects/releases/_lib/publish-lib.mjs` (two `../../_lib/...` imports) and `.../do-github-release.mjs` (one) — and all three still resolve unchanged after the mapping, because the `handlers/projects/` → `handlers/` flatten moves the whole subtree uniformly.

## One required content edit after the move

`src/handlers/projects/test/lib/test-calls-implied.mjs` asserts `expect(result).toBe('@liquid-labs/liq-projects')`. That value is not a literal test constant: the implied-form handlers resolve the project name from the `X-CWD` header (here, `__dirname`) by reading the nearest `package.json`. Once the code lives in the dev-core repo, the nearest `package.json` is dev-core's, so the expectation becomes `@sdlcforge/dev-core`. This edit belongs to the **absorb** task (in dev-core), not the restructure task (in liq-projects), where the assertion is still correct.

## Validation baseline

Recorded from `qa/unit-test.txt` (the committed report of the last full run) and `qa/lint.txt`:

- `make test`: **8 test suites, 29 tests, all passing** (~45 s wall, dominated by the live-GitHub lifecycle suite below).
- `make lint`: passes (marker `qa/.lint.passed` present).
- `make build` produces `dist/liq-projects.js` from `src/index.js` via Rollup (`make/50-liq-projects-js.mk`).

The 8 suites are the 6 `src/handlers/projects/test/*.test.mjs` files plus `src/handlers/projects/_lib/test/get-files.test.js` and `src/handlers/projects/_lib/test/project-lifecycle.test.mjs`.

**`project-lifecycle.test.mjs` is a live integration test, not a unit test.** It reads real credentials from `$HOME/.config/comply-server/credentials/db.yaml`, then creates, renames, archives, and destroys **real GitHub repositories** under the `liquid-labs` org (overridable via `TEST_GITHUB_ORG`/`TEST_NPM_ORG`). Task agents validating a relocation should scope Jest to the fast suites — `make test TEST=<pattern>` forwards the pattern to Jest — and treat a credential/network failure of this one suite as an environment condition to report, not a regression, provided the other 7 suites pass and the failure mode is authentication rather than module resolution.

## Consumer inventory

Complete, from a playground-wide grep excluding `node_modules`, `.yalc`, `dist`, `test-staging`, and `worktrees`:

| Consumer | Reference | Kind |
|---|---|---|
| `@sdlcforge/core-server` | `package.json`: `"@liquid-labs/liq-projects": "file:.yalc/@liquid-labs/liq-projects"` | npm dependency (local yalc link) |
| `@sdlcforge/core-server` | `src/lib/app-init.mjs` — `explicitPlugins` array entry | runtime plugin registration |
| `@sdlcforge/core-server` | `test/test-basic.js`, `test/test-integration-quick.js` (two occurrences) | test fixtures listing expected plugins |
| `liq-controls` | `app.ext._liqProjects.playgroundMonitor.getProjectData(...)` in `src/lib/integrations/get-question-controls.mjs` | runtime `app.ext` contract — **no change needed** ([D7](./dev-core-target-shape.md#d7--appext-keys-are-frozen-for-this-wave)) |
| `liq-integrations-issues-github` | same contract, `src/create-or-update-pull-request.mjs` | runtime `app.ext` contract — no change needed |
| `liq-work`, `liq-orgs`, `plugable-projects-audit` | same contract, many call sites | runtime `app.ext` contract — no change needed; these are donors and end up in the same package |
| `liq-plugins-lib` | `src/lib/test/select-matching-plugins.test.js` uses the string as sample data | incidental; not a dependency |

Two provenance notes for the consumer handoff:

1. **GitHub credential registration moves.** liq-projects's `setup` is what calls `setupCredentials` from `@liquid-labs/credentials-db-plugin-github`, which is what registers the `GITHUB_API` key that `liq-integrations-issues-github` later fetches via `credentialsDB.getToken('GITHUB_API')` — an undeclared, load-order-dependent contract the wave plan already flags. Consolidation moves the *provider* from `@liquid-labs/liq-projects` to `@sdlcforge/dev-core` without changing the mechanism, so the swap must be atomic: registration must not disappear from the explicit-plugin set in one step and reappear in another.
2. **The plugin swap must be atomic** for the same reason from the route side: with both packages in `explicitPlugins`, all 19 `/projects` routes register twice and Express silently shadows the duplicates.

core-server's golden characterization snapshots (`test/__snapshots__/golden-api-spec.json`, `golden-plugins-list.json`) are currently degenerate — the plugins list is literally `[]` and the API spec carries only `@liquid-labs/plugable-express` provenance — so the swap is unlikely to move them; the handoff still names them as things to re-verify.

## Pre-existing defects surfaced (not fixed by this plan)

1. **A silently-dead test file.** `src/handlers/projects/test/close-implied.mjs` is missing the `.test` infix, so Jest never runs it, while the Make source-finder still classifies it as a test and excludes it from the bundle. It is dead in both directions. Relocation preserves the name as-is; fixing it is a separate judgment call (the file may also be stale relative to `close-implied.mjs`).
2. **32 tracked generated HTML files under `docs/` with no build target.** They are stale: `docs/handlers/projects/releases/prepare-and-publish.mjs.html` documents a module that no longer exists, and there is no HTML for the `publish.mjs`/`publish-implied.mjs` that replaced it. `Makefile`'s `DOC_TARGETS` is empty and no `make/*.mk` regenerates them. `README.md` links `docs/index.html` as "the generated API reference". They are not carried into dev-core; the accurate route table in `README.md` is what gets ported.
3. **~35 lines of commented-out dead code** in `src/setup.mjs` (`installProjectPlugins`, referencing a `LIQ_HOME()` that is no longer imported) plus two commented-out `orgs` lines in `src/handlers/index.js`. The latter disappears with the file; the former is carried verbatim by a pure move, and deleting it is a legitimate small cleanup for the absorb task to note rather than smuggle.
4. **A credentials-path inconsistency.** `project-lifecycle.test.mjs` hardcodes `$HOME/.config/comply-server/credentials/db.yaml` while core-server has since moved its config root to the XDG `${XDG_DATA_HOME}/sdlcforge-core/` location. Out of scope here; worth a follow-up.
5. **`shelljs ^0.8.5` is a runtime dependency** and is known to be incompatible with any bundled Bun output — already recorded at wave level as a recommendation to replace it with `node:child_process` before the Wave 4 single-binary work. Out of scope; carried over as-is.

## Cross-repository task precedent

Tasks in this plan execute in three different repositories (`liq-projects`, `sdlcforge/dev-core`, and read-only reads of `sdlcforge/core-server`). That is an established pattern in this playground, not an improvisation: core-server's completed `bun-conversion` plan contains task `003-add-server-config-root-accessor-to-comply-defaults`, documented as "**executes in the `@liquid-labs/comply-defaults` repository, not this one**", which landed a commit in that other repository on its own `task/...` branch. Each task document in this plan states its executing repository explicitly in `## Purpose and scope`.
