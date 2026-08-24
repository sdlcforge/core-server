# Absorbed Surface Inventory

## Purpose and scope

A first-pass inventory of exactly what the three donor plugins contribute, taken by reading each donor's source directly. It exists so the absorption tasks can be written against a concrete list rather than a description, and so the parity check at the end of the plan has something to check against. A research agent completing this note should verify the lists against each donor's current `HEAD` (the donors are being edited in parallel under their own plan slices) and fill the gaps marked **TO CONFIRM**.

## `@liquid-labs/liq-controls`

Source root `/Users/zane/playground/liquid-labs/liq-controls/src/lib/`.

**HTTP routes (2):**

| Method | Path | Module |
|---|---|---|
| GET | `/orgs/:orgKey/controls/list` | `handlers/orgs/controls/list.mjs` |
| GET | `/orgs/controls/list` (implied org, via the `X-CWD` header) | `handlers/orgs/controls/list-implied.mjs` |

Both delegate to `handlers/orgs/controls/_lib/list-lib.mjs` (`doListControls`, `getControlsListEndpointParameters`).

**Setup methods (2), both pushed onto `app.ext.setupMethods` by `setup.mjs`:**

- `'load org controls'`, `deps: ['load orgs']` → `resources/load-controls.mjs`, which walks `app.ext._liqOrgs.orgs` and binds a `Controls` `ItemManager` onto each org.
- `'load controls integrations'`, `deps: ['setup integrations']` → `integrations/register-controls-integrations.mjs`, which registers one integration provider: `providerFor: 'controls'`, `name: 'controls'`, `npmName: '@liquid-labs/liq-controls'`, `providerTest: () => true`, hooks `{ getQuestionControls }`.

**Resource classes:** `resources/{control,controls,question-control,load-controls}.mjs` (`Item`/`ItemManager` subclasses over `*.qcontrols.yaml` files).

**Cross-plugin `app.ext` reads:** `app.ext._liqOrgs.orgs` (from `liq-orgs`) and `app.ext._liqProjects.playgroundMonitor.getProjectData()` (from `liq-projects`) — both consumed inside `integrations/get-question-controls.mjs`. Both stay external explicit plugins.

**Declared runtime dependencies:** `@liquid-labs/find-plus`, `@liquid-labs/http-smart-response`, `@liquid-labs/liq-handlers-lib`, `@liquid-labs/liq-qa-lib`, `@liquid-labs/npm-toolkit`, `@liquid-labs/resource-item`, `@liquid-labs/resource-model`, `http-errors`, `js-yaml`. Of these, `@liquid-labs/liq-qa-lib` and `@liquid-labs/http-smart-response` appear in no `import` statement under `src/` — **TO CONFIRM** whether they are genuinely unused before carrying them into `core-server`'s `package.json`. `@liquid-labs/http-smart-response` is already a `core-server` dependency regardless.

**Tests to port:** `handlers/orgs/controls/test/list.test.js`, `handlers/orgs/controls/_lib/test/list-lib.test.mjs`, `resources/test/controls.test.mjs`, `resources/test/question-controls.test.mjs`, plus their `test/data/` fixture trees.

**Also present:** a root `plugable-express.yaml` declaring `dependencies: ['@liquid-labs/liq-projects', '@liquid-labs/liq-orgs']`. Nothing in `plugable-express` reads this file — it is vestigial, and is the manual precursor of the compile-time manifest planned in Wave 3. It documents a real load-order requirement even though it enforces nothing.

## `@liquid-labs/liq-credentials`

Source root `/Users/zane/playground/liquid-labs/liq-credentials/src/`.

**HTTP routes (2):**

| Method | Path | Module |
|---|---|---|
| PUT | `/credentials/:credential/import` | `handlers/credentials/import.mjs` |
| GET | `/credentials/list` | `handlers/credentials/list.mjs` |

**Setup (`setup.mjs`, an ordinary async `setup` export, not a queued setup method):**

- `mkdir -p <serverConfigRoot>/<CREDS_PATH_STEM>`.
- Constructs `new CredentialsDB({ app, cache, serverConfigRoot })` and assigns it to **`app.ext.credentialsDB`** — a cross-package contract read by `liq-work` and by `liq-integrations-issues-github` (the `credentialsDB.getToken('GITHUB_API')` call named in the wave manifest).
- `registerPathVar('credential', …)` with an options fetcher over `app.ext.credentialsDB.listSupported()`. Note this uses the `registerPathVar` argument `plugable-express` passes into `setup()` — an affordance any in-tree registration mechanism must also supply.

**Declared runtime dependencies:** `@liquid-labs/http-smart-response` (already a `core-server` dependency), `@liquid-labs/liq-credentials-db`, `@liquid-labs/liq-handlers-lib`. **`@liquid-labs/liq-credentials-db` explicitly stays an external dependency** and is not folded.

**Inert export:** `src/index.js` exports `name = 'core-credentials'` and a `summary`. `plugable-express`'s `loadPlugin()` does not read either — it derives `summary` from the package's `description` and `npmName` from the package's `name`. The "registered as the `core-credentials` plugin" framing in the request does not correspond to anything the loader consumes.

**Tests to port:** `handlers/credentials/test/list.test.js` and its `test/data/creds-db.yaml` fixture.

## `@liquid-labs/liq-integrations-issues-github`

Source root `/Users/zane/playground/liquid-labs/liq-integrations-issues-github/src/`.

**HTTP routes: none.** This donor is hooks-only; it exports `setup` and no `handlers`.

**Setup:** pushes one setup method, `'register github issues integrations'`, `deps: ['setup integrations']`, which makes two `app.ext.integrations.register(...)` calls, both with `npmName: '@liquid-labs/liq-integrations-issues-github'` and `providerTest: usesGitHubIssues`:

| `providerFor` | Hooks |
|---|---|
| `tickets` | `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` |
| `pull request` | `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` |

Seven hook registrations across two providers, six distinct hook functions.

**Declared runtime dependencies:** `@liquid-labs/git-toolkit`, `@liquid-labs/github-toolkit`, `@liquid-labs/liq-projects-lib`, `@liquid-labs/liq-qa-lib`, `@liquid-labs/shell-toolkit`. **Undeclared but imported:** `@liquid-labs/octocache` — a latent packaging defect in the donor that resolves transitively today. `core-server` must declare it explicitly when absorbing.

**External coupling in flux:** `create-or-update-pull-request.mjs` imports `determineCurrentMilestone` from `@liquid-labs/liq-projects-lib`. A task in that donor's own plan slice inlines this function into the donor's source. **TO CONFIRM at absorption time** whether that has landed; absorb whatever the donor's source looks like then, per this plan's stated scope.

**Tests to port:** `src/test/uses-github-issues.test.js`.

## Cross-cutting facts

- **No reverse dependencies.** No other package installed under `core-server`'s `node_modules` declares any of the three donors as a dependency, so removing them from `package.json` removes them entirely.
- **No keyword discovery.** All three donors have `keywords: []` — none carries `pluggable-endpoints` — so removing them from `explicitPlugins` and from `dependencies` is sufficient to stop them loading. Unlike the `framework-consolidation` fold-in, no `supersededPlugins`-style skip list is needed to protect a consumer that still has them installed.
- **No existing test coverage in `core-server`.** Both `src/lib/test/*.test.js` files run with `skipCorePlugins: true`, and `test/__snapshots__/golden-plugins-list.json` is `[]` while `golden-api-spec.json` holds 35 core routes only. Nothing in `core-server`'s current suite exercises any of the three donors' routes or hooks, so the parity baseline this plan needs does not exist yet and has to be created.
