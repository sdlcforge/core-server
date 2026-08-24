# Parity Baseline

## Purpose and scope

Records why this plan cannot verify its own central constraint yet, and what a research pass must establish before Phase 3's tasks can be written. The constraint is "no consumer-facing behavior change"; the problem is that `core-server` currently has no test, snapshot, or artifact that observes any of the three donors' behavior at all, so there is nothing to compare against.

## What exists today

- `src/lib/test/app-init.test.js` and `src/lib/test/golden-api-spec.test.js` both pass `skipCorePlugins: true`, which makes `appInit` skip the `loadPlugins` call over the server package root entirely — the only call site that ever reads `explicitPlugins`. No donor is loaded in either test.
- `test/__snapshots__/golden-api-spec.json` holds 35 routes, all of them `plugable-express` core routes.
- `test/__snapshots__/golden-plugins-list.json` is `[]`.
- `test/test-server.js` (the local integration pass) and `test/run-integration-tests.sh` (the Docker multi-version pass) start a real server. The Docker pass's stated primary purpose is exactly to verify explicit-plugin loading on first startup, so it is the most promising existing home for a real baseline — but it checks that startup *succeeds*, not what the loaded surface *contains*.

## The open feasibility question

The wave manifest's Wave 3 entries name a live bug, `ynGa`: "`appInit()` crash from the `serverHome` to `serverConfigRoot` rename because `liq-credentials`/`liq-credentials-db`/`liq-integrations`/`liq-work` still read the old key." If `appInit` still crashes against the full 11-package explicit tier, a real loaded-surface baseline cannot be captured by simply removing `skipCorePlugins: true`, and Phase 3 has to either fix enough of that first or capture the baseline a different way.

Partial evidence: `liq-credentials`' own source has since been updated — `src/setup.mjs` and `src/handlers/credentials/import.mjs` both read `serverConfigRoot`, not `serverHome`. That is one of the four packages named. The state of the other three, and of the transitive `@liquid-labs/liq-credentials-db`, is unverified.

**This must be answered empirically, by actually starting the server against the real explicit tier, before Phase 3's tasks are written.** The answer determines whether Phase 3 is "add assertions to an already-working path" or "make the path work first."

## What the baseline must capture

Whatever form it takes, it has to cover every observable the absorption could perturb — not just routes, since one of the three donors contributes no routes at all:

- **Registered endpoints** — each handler's `method` and its `path`/`paths` array, plus the `npmName` provenance recorded into `app.ext.handlers` by `register-handlers.js`. Note that `npmName` provenance necessarily changes for absorbed endpoints; see [plugin list visibility](./plugin-list-visibility.md).
- **Registered path variables** — the merged set, and that each name is registered exactly once. `registerPathVar` throws `Path variable '<name>' is already registered.` on a duplicate, and `pathToRe` throws `Unknown variable path element type '<name>'` on an unregistered one used in a route. `liq-credentials` registers `credential`; `liq-controls` registers none but consumes `orgKey` from `liq-orgs`.
- **Enqueued setup methods** — each method's `name` and `deps`, and that `@liquid-labs/dependency-runner` finds every `deps` entry satisfiable. This is where the [`load orgs` hazard](./in-tree-plugin-registration.md#the-load-orgs-hazard) shows up.
- **Registered integration providers and hooks** — the `providerFor`/`name`/`npmName` triple and the hook names under each. Seven hook registrations across two providers from `issues-github`, plus one provider with one hook from `controls`.
- **`app.ext` keys installed by setup** — notably `app.ext.credentialsDB`, which `liq-work` and `issues-github` both read.
- **The two plugin-list endpoints' response bodies** — with the accepted diff enumerated in advance, per the visibility decision.

## Sequencing

Phase 3 runs first precisely because this baseline is independent of the registration-mechanism decision: it observes the *current* npm-dependency world, which no pending decision changes. It is also the artifact that makes Phase 5's per-donor absorb tasks verifiable one at a time rather than only in aggregate at the end.

## Research findings

Answered empirically on 2026-08-24 against the `main` checkout at `/Users/zane/playground/sdlcforge/core-server` (Node v26.5.0, `@liquid-labs/plugable-express` 1.0.0-alpha.58 via yalc, the installed `node_modules` tree as of the last `bun install`).

### The `ynGa` bug is already fixed; `appInit` succeeds against the full explicit tier

`appInit()` loads all eleven `explicitPlugins` without throwing, runs every enqueued setup method to completion, and serves a 165-route API surface. Phase 3 is therefore **"add assertions to an already-working path,"** not "make the path work first."

Two independent lines of evidence:

1. **No live `serverHome` read survives anywhere in the loaded tree.** A recursive grep for `serverHome` across all of `core-server/node_modules` returns exactly one file — `@liquid-labs/liq-projects/src/handlers/projects/_lib/test/project-lifecycle.test.mjs`, which passes a stray `serverHome` key into a test-local `appInit()` call. `plugable-express` destructures only the option names it knows, so that key is silently ignored; the file is a Jest fixture that never executes during server startup. All four named packages are clean, and the fix is visible in each one's own history: `liq-credentials` `cab8a77` ("take 'serverConfigRoot' as part of 'setup()' and remove direct access to 'app.ext'"), `liq-credentials-db` `a6372a2` ("factor out 'app.ext' access now that the config dir is passed in"), and `liq-integrations` `f2d9184` ("fix: read app.ext.serverConfigRoot instead of removed serverHome"). `liq-work` never carried a `serverHome` read at all — it reaches the credentials store through `app.ext.credentialsDB`, which `liq-credentials`' setup installs.
2. **`liq-integrations` is moot regardless.** Its functionality is folded into `plugable-express` (`src/lib/integrations-manager.mjs`, `src/handlers/server/plugins/integrations/`), and `src/lib/load-plugins.js` carries an explicit `supersededPlugins` set — `@liquid-labs/liq-integrations` and `@liquid-labs/plugable-server-documentation` — whose members are skipped with a warning wherever they are discovered. Neither appears in the current eleven-entry `explicitPlugins` list either.

The stale `dist/sdlcforge-server.js` in the main checkout (built 2026-08-14) still carries the *old* thirteen-entry list including both superseded packages; it is harmless for the same reason, but any Phase 3 work that runs against `dist/` rather than `src/` should rebuild first.

### How it was verified

Two runs, both from inside `/Users/zane/playground/sdlcforge/core-server` so that `findOwnHome(process.argv[1])` resolves the server package root to the checkout whose `node_modules` holds the plugins:

- A scratch CommonJS probe calling `plugable-express`'s `appInit` directly with core-server's exact option set minus `skipCorePlugins`, dumping `app.ext` and driving `supertest` against the resulting app. (Written to the checkout root, run, then deleted; the checkout is back to a clean tree.)
- The real Jest suite with `skipCorePlugins : true` deleted from `src/lib/test/golden-api-spec.test.js` and `PLUGABLE_PLAYGROUND` pointed at an empty temp dir: `TEST=golden-api-spec make test`. Both tests failed **only** on the golden-snapshot comparison, with a purely additive diff (`- Expected 0 / + Received 6104` lines). `appInit()` itself did not throw. The edit was reverted; `src/` is byte-identical to the plan worktree again.

The concern that a Jest run would resolve `serverPackageRoot` to the Jest package rather than to core-server does **not** materialize: `npx jest` puts `node_modules/.bin/jest` in `process.argv[1]`, and `find-root` walks up past the package.json-less `.bin` and `node_modules` directories to core-server's own `package.json`.

### The baseline as it actually stands today

**Registered endpoints — 165 total**, of which the existing 35-route `golden-api-spec.json` snapshot is a *strict, deep-equal subset*: every one of the 35 core routes is present and byte-identical under the full tier, and the tier adds 130 more.

| `npmName` | routes |
| --- | ---: |
| `@liquid-labs/plugable-express` (core) | 35 |
| `@liquid-labs/liq-work` | 60 |
| `@liquid-labs/liq-projects` | 38 |
| `@liquid-labs/plugable-projects-audit` | 8 |
| `@liquid-labs/liq-orgs` | 6 |
| `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | 6 |
| `@liquid-labs/liq-controls` | 4 |
| `@liquid-labs/liq-credentials` | 2 |
| `@liquid-labs/sdlc-projects-badges-coverage` | 2 |
| `@liquid-labs/sdlc-projects-badges-github-workflows` | 2 |
| `@liquid-labs/sdlc-projects-workflow-local-node-build` | 2 |
| `@liquid-labs/liq-integrations-issues-github` | **0** |

`liq-integrations-issues-github` contributing zero routes confirms the note above that one donor's entire contribution is invisible to a route-only baseline.

Each `/server/api` entry already carries `npmName`, `method`, `path` (the array form, with `:varName` segments intact), `matcher`/`routablePath` (the compiled regex, which *inlines each path variable's `validationRe`*), `help`, and `parameters`. The inlined validation regexes mean a route snapshot transitively pins the path-variable registry's contents without needing separate access to the registry.

**Path variables.** The registry itself (`plugable-express` `src/lib/path-var-registry.mjs`) is module-private and not exported, so it cannot be read directly. Two observables stand in for it:

- The names actually consumed by registered routes: `credential`, `errorKey`, `integrationPluginName`, `newOrgKey`, `orgKey`, `parameterKey`, `projectName`, `serverPluginName`, `workKey`.
- The static registration sites: `serverPluginName` and `integrationPluginName` in `plugable-express` `src/app.js`; `errorKey` in its `src/handlers/server/errors/detail.mjs`; `credential` in `liq-credentials/src/setup.mjs`; `newOrgKey` and `orgKey` in `liq-orgs/src/setup.mjs`; `parameterKey` in `liq-orgs/src/handlers/orgs/parameters-detail.mjs`; `newProjectName` and `projectName` in `liq-projects/src/setup.mjs`; `workKey` in `liq-work/src/setup.mjs`. (`newOrgKey` and `newProjectName` are registered but used by no route in the current set.)

Two mechanism details worth carrying into Phase 5. First, `parameterKey` is registered from inside a *handler's* `func` factory rather than from `setup()` — path-var registration is not confined to setup, and handler factories run in the `pendingHandlers` pass after every setup has returned. Second, `liq-orgs/src/handlers/orgs/parameters-set.mjs` holds a commented-out second `parameterKey` registration with the note "Already set in parameters-detail"; un-commenting it during an absorption would trip `Path variable 'parameterKey' is already registered.` Duplicate registration is self-detecting — it throws — so "registered exactly once" needs no separate assertion beyond `appInit()` not throwing.

**Setup methods**, in enqueue order, with their `deps`:

| name | `deps` | source |
| --- | --- | --- |
| `setup integrations` | — | `plugable-express` (framework built-in) |
| `load org controls` | `['load orgs']` | `liq-controls` |
| `load controls integrations` | `['setup integrations']` | `liq-controls` |
| `register github issues integrations` | `['setup integrations']` | `liq-integrations-issues-github` |
| `prepare org dependencies` | `['!']` | `liq-orgs` |
| `load orgs` | — | `liq-orgs` |
| `process org setup` | `['*']` | `liq-orgs` |

The [`load orgs` hazard](./in-tree-plugin-registration.md#the-load-orgs-hazard) is live and visible here: `liq-controls`' `load org controls` names `load orgs` — a method contributed by a *different* package — as a dependency. `@liquid-labs/dependency-runner` resolves it today; enqueue order does not matter, since the runner is what orders execution. Setup methods run inside `appInit()` (a `DependencyRunner` with `waitTillComplete : true`, driven immediately after the `pendingHandlers` pass), so a broken `deps` entry surfaces as an `appInit()` failure, not as a deferred runtime error.

**Integration providers and hooks** — three `register()` calls, seven hooks from `issues-github` across two providers plus one hook from `controls`, exactly as the inventory predicted:

| `providerFor` | `name` | `npmName` | hooks |
| --- | --- | --- | --- |
| `controls` | `controls` | `@liquid-labs/liq-controls` | `getQuestionControls` |
| `tickets` | *(undefined)* | `@liquid-labs/liq-integrations-issues-github` | `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` |
| `pull request` | *(undefined)* | `@liquid-labs/liq-integrations-issues-github` | `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` |

Note the pre-existing defect this exposes, which a naive endpoint-based baseline would paper over: both `issues-github` registrations omit `name`, and `IntegrationsManager.listInstalledPlugins()` de-duplicates via `new Map(list.map((p) => [p.name, p]))`. Keyed on `undefined`, the two providers collapse into one, so `GET /server/plugins/integrations/list` reports **two** entries (`controls`, plus a single merged `issues-github` entry showing only the `pull request` hook set) where three providers are registered. The same list feeds the `integrationPluginName` path variable's `optionsFetcher`. This is out of scope for the consolidation, but a provider-level baseline must be taken by observing `register()` calls, not by reading that endpoint — and the endpoint's own body should be snapshotted as-is so the defect is preserved rather than accidentally "fixed" mid-absorption.

**`app.ext` keys** with the full tier loaded:

```text
_liqOrgs, _liqProjects, commandPaths, constants, credentialsDB, dynamicPluginInstallDir,
errorsEphemeral, errorsRetained, handlerPlugins, handlers, integrations, localSettings,
name, pendingHandlers, serverConfigRoot, serverSettings, setupMethods, serverVersion,
teardownMethods, version
```

Everything except `_liqOrgs`, `_liqProjects`, and `credentialsDB` is installed by `plugable-express` itself (`integrations` via its own `setup integrations` method). `app.ext.credentialsDB` is present and functional, exposing `detail`, `getCredSpec`, `getToken`, `import`, `list`, `listSupported`, `registerCredentialType`, `resetDB`, `verifyCreds`, `writeDB`.

An ordering coupling worth recording: `liq-projects`' `setup()` calls `setupCredentials({ credentialsDB : app.ext.credentialsDB })` at plugin-load time, so it depends on `liq-credentials`' `setup()` having already run. Plugin `setup()` calls run in `find-plugins` discovery order (alphabetical by package directory), which happens to put `liq-credentials` before `liq-projects`. Unlike the `setupMethods` graph, this ordering is **not** mediated by `dependency-runner` — it is incidental to package naming, and an absorption that renames or reorders packages could break it silently.

**Plugin-list endpoints.** `GET /server/plugins/list` returns eleven `{npmName, installed: true, summary}` objects (one per explicit plugin; `summary` is `""` for the several packages whose `package.json` carries no `description`). `GET /server/plugins/integrations/list` returns the two-entry body described above.

### Exact recipe for Phase 3

The capture is straightforward and needs no network:

1. Delete the `skipCorePlugins : true` line (and its explanatory comment block, now obsolete) from `src/lib/test/golden-api-spec.test.js`.
2. Export `PLUGABLE_PLAYGROUND` to an empty temp directory for the test run. `liq-projects`' `setupPlayground()` defaults to `${HOME}/playground`, **creates that directory if absent**, and hands it to a `PlaygroundMonitor` that scans it — on a developer host this emitted ~9,500 lines of stray `console.log` output from `@liquid-labs/playground-monitor`. Verified: the observable surface (`/server/api`, `/server/plugins/list`, `/server/plugins/integrations/list`, `app.ext` keys, setup methods) is byte-identical whether the playground is the real `~/playground` or an empty temp dir, so this is an isolation and noise concern rather than a correctness one — but leaving it unset makes the test slow, chatty, and side-effecting on the developer's home directory.
3. Regenerate: `PLUGABLE_PLAYGROUND=$(mktemp -d) npm run test:update-golden-api-spec` (which expands to `UPDATE_GOLDEN_API_SPEC=true TEST=golden-api-spec make test`). Expect `golden-api-spec.json` to go from 35 to 165 entries and `golden-plugins-list.json` from `[]` to 11 entries.
4. Verified stable: two consecutive full-tier runs produced byte-identical output for every observable except `/server/version` (which embeds the Node version and is not snapshotted).

Three observables the two existing golden snapshots do **not** cover, and which need new assertions rather than a regenerated snapshot:

- **Setup methods** — assert the `{name, deps}` list above off `app.ext.setupMethods`.
- **Integration providers** — the faithful `{providerFor, name, npmName, hooks}` triple is only reachable by wrapping `IntegrationsManager.prototype.register` before `appInit()` (the class *is* exported from `@liquid-labs/plugable-express`, and `#providers` is private). Snapshot `GET /server/plugins/integrations/list` separately as the consumer-visible view.
- **`app.ext` keys** — assert `Object.keys(app.ext).sort()`, plus the presence and method set of `app.ext.credentialsDB`.

### What could not be verified

- The golden snapshots were **not** regenerated in this pass; the numbers above come from an equivalent in-process capture through the identical `plugable-express` `appInit` code path, plus a Jest run that confirmed the diff is purely additive. Actually writing the new snapshots is Phase 3's job.
- The Docker multi-version pass (`test/run-integration-tests.sh`, Node 18–24) was not run. All findings are from a single host on Node v26.5.0.
- Whether the *published* npm versions of these packages match the locally-installed ones was not audited beyond the versions the loader reported: `liq-controls` 1.0.0-alpha.9, `liq-credentials` 1.0.0-alpha.4, `liq-integrations-issues-github` 1.0.0-alpha.3, `liq-orgs` 1.0.0-alpha.7, `liq-projects` 1.0.0-alpha.15 (yalc-linked), `liq-work` 1.0.0-alpha.10, `plugable-projects-audit` 1.0.0-alpha.2, the two badge plugins 1.0.0-alpha.2, `sdlc-projects-workflow-github-node-jest-cicd` 1.0.0-alpha.2, `sdlc-projects-workflow-local-node-build` 1.0.0-alpha.7. Four of these resolve through yalc (`plugable-express`, `liq-projects`, `liq-work`, `sdlc-projects-workflow-local-node-build`), so a CI baseline taken from a clean registry install could differ.
- No hook was actually *invoked* and no handler actually *executed*; the baseline observed here is registration-time only. Behavioral parity of the handlers themselves remains unobserved by any test.

## Related documents

- [`absorbed-surface-inventory.md`](./absorbed-surface-inventory.md) — the hand-taken inventory this baseline mechanizes.
- [`plugin-list-visibility.md`](./plugin-list-visibility.md) — the one baseline diff that is expected rather than a regression.
