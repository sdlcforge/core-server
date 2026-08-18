# liq-orgs Source Inventory and Migration Mapping

## Purpose and scope

Ground-truth inventory of what `@liquid-labs/liq-orgs` actually contains at plan-authoring time, the exact old-path → new-path mapping into the dev-core layout (**D2**), the validation baseline later tasks measure against, the full consumer inventory, the corrections this slice's investigation forces on the shared foundation document, and the pre-existing defects this plan surfaces without fixing.

`liq-orgs` has **no README, no `docs/`, no architecture document, and an empty `package.json` description**. Everything below was read from source and verified by running the toolchain. Where an assumption carried into this slice from the dispatch framing or from the shared `dev-core-target-shape.md` disagrees with the source, the source is recorded and the disagreement is called out explicitly under "Corrections to the shared foundation".

## Package facts

- Name `@liquid-labs/liq-orgs`, version `1.0.0-alpha.7`, `main: dist/liq-orgs.js`, `license: UNLICENSED`, `engines.node >=18.0.0`, `description: ""`, `keywords: []`.
- **27 git-tracked files total**, of which **13 under `src/`**: 1 root `index.js`, 1 `setup.mjs`, 2 `index.js` aggregators, 5 handler modules, 1 `_lib/` module, 2 resource modules, 1 test. The rest are `Makefile`, `make/*.mk` (8 files), `package.json`, `package-lock.json`, `.gitignore`, `.catalyst-data.yaml`, and `plan/manifest.yaml`.
- No `README.md`, no `docs/`, no `.sdlc-data.yaml`. (Contrast liq-projects, which had a README route table and 32 stale generated HTML files to discard.)
- 4 committed runtime dependencies: `@liquid-labs/dependency-runner ^1.0.0-alpha.8`, `@liquid-labs/liq-handlers-lib ^1.0.0-alpha.17`, `@liquid-labs/resource-model ^1.0.0-alpha.10`, `js-yaml ^4.1.0`.
- 3 devDependencies, all on the **older `catalyst-resource-*` generation** rather than liq-projects's `sdlc-resource-*`: `@liquid-labs/catalyst-resource-{babel-and-rollup,eslint,jest}`. See "Toolchain divergence is cosmetic" below — this was measured, not assumed.
- No `liq` block in `package.json` (liq-projects has a vestigial one). No `pluggable-endpoints` keyword, consistent with **D5**.

### The working tree is dirty, and the dirt is load-bearing

`git status` in `/Users/zane/playground/liquid-labs/liq-orgs` shows an **uncommitted modification to `package.json`** adding a fifth runtime dependency:

```
+    "@liquid-labs/playground-monitor": "file:.yalc/@liquid-labs/playground-monitor",
```

Facts about it, all verified:

- **Nothing in `src/` imports `@liquid-labs/playground-monitor`.** `grep -rn "playground-monitor" src/` returns nothing. liq-orgs reaches the playground monitor exclusively through `app.ext._liqProjects.playgroundMonitor`, which is liq-projects's `setup` output — no import, no dependency needed.
- The target it points at, `.yalc/`, is **gitignored** (`.gitignore` lists `/yalc.lock` and `/.yalc`), so the entry could never resolve for a registry consumer. Publishing it would produce a broken tarball.
- It is accompanied by an untracked `.yalc/@liquid-labs/playground-monitor/` directory and a `yalc.lock`, i.e. it is the residue of a local `yalc add`, not an authored change.

This must be resolved before the restructure task commits anything. The plan's recommendation is **revert it** (`git checkout -- package.json`), because it is an unused, unpublishable, accidental entry. It is called out as an explicit decision point in phase 5 task 001 rather than silently reverted, and flagged to the manager, because reverting a user's uncommitted working-tree change is not a task agent's call to make unasked.

Consequence either way: this dependency is **not** part of the union into dev-core. dev-core already receives `@liquid-labs/playground-monitor ^1.0.0-beta.4` from liq-projects's absorb (a proper registry range), so even if the entry were kept it would be superseded by the higher-quality range under **D4** step 3.

## Route surface (5 handlers)

Verified against the handler modules' own `path` exports. `src/handlers/orgs/index.js` builds a plain literal array of five modules — **no `handlers.push(...)` side-effect style**, so the aliasing hazard **D5** warns about for liq-projects does not exist here.

| Module | Method | `path` export | HTTP path(s) |
|---|---|---|---|
| `create.mjs` | POST | `['orgs', 'create', ':newOrgKey']` | `/orgs/create/:newOrgKey` |
| `list.mjs` | GET | `['orgs', 'list?']` | `/orgs/list` and `/orgs` |
| `parameters-detail.mjs` | GET | `['orgs', ':orgKey', 'parameters', ':parameterKey', 'detail']` | `/orgs/:orgKey/parameters/:parameterKey/detail` |
| `parameters-list.mjs` | GET | `['orgs', ':orgKey', 'parameters', 'list?']` | `/orgs/:orgKey/parameters/list` and `/orgs/:orgKey/parameters` |
| `parameters-set.mjs` | PUT | `['orgs', ':orgKey', 'parameters', ':parameterKey', 'set']` | `/orgs/:orgKey/parameters/:parameterKey/set` |

Note the `create` path puts the literal segment *before* the key (`orgs/create/:newOrgKey`), unlike liq-projects's `projects/:projectName/<verb>` convention. This is not a defect to normalize — normalizing it would change the HTTP surface, which **D11** forbids.

Route paths come from each module's `path` array, and `registerHandlers` uses that export rather than the file's position, so relocation cannot change the HTTP surface.

## Plugin surface

- `src/index.js`: `export * from './handlers'`, `export * from './setup'`, plus inert `name = 'core-orgs'` / `summary = 'Manage org level settings.'` exports. Per **D5** the loader never reads module-level `name`/`summary`; it takes them from `package.json`. `summary` here is nonetheless the only one-line description of this package that exists anywhere, and is worth preserving as prose in dev-core's docs.
- `src/handlers/index.js`: the one-line `export * from './orgs'` re-export. Deleted at restructure, not carried forward (**D3**).
- `src/setup.mjs`: **synchronous** (returns `undefined`, not a promise). It does two things:
  1. Pushes **three** entries onto `app.ext.setupMethods`, which plugable-express drains through a `DependencyRunner` after all plugins have loaded (`plugable-express/src/app.js:222-228`, `waitTillComplete: true`):
     - `prepare org dependencies`, `deps: ['!']` (runs before every other setup method) — assigns `app.ext._liqOrgs = { orgSetupMethods: [] }`.
     - `load orgs`, no deps — iterates `await app.ext._liqProjects.playgroundMonitor.getProjectsData()`, selects entries whose scanned `packageJSON.liq?.packageType === 'org'`, and builds `app.ext._liqOrgs.orgs[orgName] = new Organization({...})`.
     - `process org setup`, `deps: ['*']` (runs after every other setup method) — builds a nested `DependencyRunner` and runs each registered `app.ext._liqOrgs.orgSetupMethods` entry once per loaded org.
  2. Registers two path vars: `newOrgKey` and `orgKey` (the latter's `optionsFetcher` reads `Object.keys(app.ext._liqOrgs.orgs)`), both validated against `(?:@|%40)[a-z][a-zA-Z0-9-]*`.
- `src/resources/organization.mjs`: the `Organization` class, extending `Model` from `@liquid-labs/resource-model`. Reads `<projectPath>/data/org/settings.yaml` via `js-yaml` at construction, tolerating `ENOENT`. Exposes `name`, `pkgName`, `projectPath`, `commonName` (= setting `COMMON_NAME`), `legalName` (= setting `LEGAL_NAME`), and `getSetting`/`updateSetting`/`requireSetting`.
- `src/resources/lib/settings.mjs`: pure dotted-key-path get/update/require over a plain object, with `process.env` override support. This is the only well-tested module in the package.

### A third path var, registered from a handler rather than from `setup`

`parameters-detail.mjs` calls `registerPathVar('parameterKey', …)` **inside its `func`**, which plugable-express invokes at handler-registration time (`register-handlers.js:166`, deliberately before `processCommandPath` "to give the function the option of registering variable name parameters"). So liq-orgs contributes **three** path vars, not two: `orgKey`, `newOrgKey`, `parameterKey`.

`parameters-set.mjs` carries the same block **commented out**, with the note *"Already set in parameters-detail... we really need to approach this a different way"* — direct in-source evidence that a second registration of the same name is fatal (see "Corrections to the shared foundation" below).

Playground-wide collision check on `registerPathVar` (all call sites, excluding `node_modules`/`dist`/`test-staging`/`worktrees`): `serverPluginName`, `integrationPluginName`, `errorKey` (plugable-express core); `credential` (liq-credentials); `orgKey`, `newOrgKey`, `parameterKey` (liq-orgs); `workKey` (liq-work); `projectName`, `newProjectName` (liq-projects). **No collision** across the four donors, so the merged dev-core set is `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `parameterKey`, `workKey` — six names, one more than D6 records.

## Path mapping (old → new)

Every path moves under the single `src/orgs/` prefix, with the redundant `handlers/orgs/` nesting flattened to `handlers/` per **D2** rule 2.

| Old path (liq-orgs) | New path (dev-core) |
|---|---|
| `src/index.js` | dropped at absorb; superseded by dev-core's own `src/index.mjs` (**D3**). During the transition it becomes a thin re-export of `./orgs`. |
| `src/setup.mjs` | `src/orgs/setup.mjs` |
| `src/handlers/index.js` | deleted (trivial one-line re-export) |
| *(new file)* | `src/orgs/index.mjs` — exports `{ handlers, setup }` |
| `src/handlers/orgs/index.js` | `src/orgs/handlers/index.js` |
| `src/handlers/orgs/create.mjs` | `src/orgs/handlers/create.mjs` |
| `src/handlers/orgs/list.mjs` | `src/orgs/handlers/list.mjs` |
| `src/handlers/orgs/parameters-detail.mjs` | `src/orgs/handlers/parameters-detail.mjs` |
| `src/handlers/orgs/parameters-list.mjs` | `src/orgs/handlers/parameters-list.mjs` |
| `src/handlers/orgs/parameters-set.mjs` | `src/orgs/handlers/parameters-set.mjs` |
| `src/handlers/orgs/_lib/parameters-lib.mjs` | `src/orgs/handlers/_lib/parameters-lib.mjs` |
| `src/resources/organization.mjs` | `src/orgs/resources/organization.mjs` |
| `src/resources/lib/settings.mjs` | `src/orgs/resources/lib/settings.mjs` |
| `src/resources/lib/test/settings.test.mjs` | `src/orgs/resources/lib/test/settings.test.mjs` |

`src/resources/` has no analog in liq-projects, but it needs no special handling: D2 rule 2 says everything under the donor's `src/` moves under the one submodule directory preserving internal structure, and only the `handlers/<domain>/` level flattens. `resources/` simply rides along.

**Zero import rewriting is required.** Every one of the four intra-package imports is relative and stays valid because the whole subtree moves uniformly:

| Importer (new path) | Import specifier | Resolves to (new path) |
|---|---|---|
| `src/orgs/setup.mjs` | `./resources/organization` | `src/orgs/resources/organization.mjs` |
| `src/orgs/resources/organization.mjs` | `./lib/settings` | `src/orgs/resources/lib/settings.mjs` |
| `src/orgs/resources/lib/test/settings.test.mjs` | `../settings` | `src/orgs/resources/lib/settings.mjs` |
| `src/orgs/handlers/parameters-detail.mjs`, `parameters-list.mjs` | `./_lib/parameters-lib` | `src/orgs/handlers/_lib/parameters-lib.mjs` |

No import crosses a directory boundary upward (no `../../` anywhere), so unlike liq-projects there is not even a boundary-crossing case to re-verify.

**No content edit is forced by the relocation.** liq-projects needed one (`test-calls-implied.mjs`'s `npmName` expectation, which is derived from the nearest `package.json`). liq-orgs's single test is a pure unit test over `settings.mjs` with no reference to package identity, paths, or fixtures. The relocation is a pure `git mv` plus one new `index.mjs`.

## Dependencies to union into dev-core

Four ranges, exactly as committed (**D4** step 3):

- `@liquid-labs/dependency-runner ^1.0.0-alpha.8`
- `@liquid-labs/liq-handlers-lib ^1.0.0-alpha.17`
- `@liquid-labs/resource-model ^1.0.0-alpha.10`
- `js-yaml ^4.1.0`

**No overlap with liq-projects's 16**, so the union is a pure addition and the "take the higher range on overlap" rule never fires. (`@liquid-labs/dependency-runner` and `@liquid-labs/liq-handlers-lib` are also dependencies of `plugable-express` itself, but that is a peer of dev-core, not a source of conflict.)

The uncommitted `@liquid-labs/playground-monitor` `file:` entry is **excluded** — see "The working tree is dirty" above.

devDependencies are not unioned: dev-core owns them under **D3**, and liq-orgs's are the superseded `catalyst-resource-*` generation.

## Toolchain divergence is cosmetic (measured, not assumed)

liq-orgs is built by the older `@liquid-labs/catalyst-builder-workflow-local-make-node` (v1.0.0-alpha.0, recorded in `.catalyst-data.yaml`) whereas dev-core's toolchain is seeded from liq-projects's `@liquid-labs/sdlc-projects-workflow-local-node-build` (v1.0.0-alpha.5). Because dev-core's root files win unconditionally under D3, the only question that matters is whether liq-orgs's *source* survives dev-core's toolchain. It does:

- **ESLint config: byte-identical.** `diff` of `catalyst-resource-eslint/dist/eslint.config.js` against `sdlc-resource-eslint/dist/eslint.config.js` reports no differences. liq-orgs's source will lint clean under dev-core's config.
- **Jest config: differs only in the override key it reads** — `pkg.catalyst.jestConfig` versus `pkg._sdlc.{jestConfig,jestCoverageGlobs}`. liq-orgs's `package.json` carries **neither** block, so the effective config is identical.
- **`make/*.mk`: identical modulo a `CATALYST_` → `SDLC_` variable-prefix rename.** The two substantive differences are both in dev-core's favor and both irrelevant here: `55-test.mk` adds `--ignore='**/test/data/**' --ignore='**/test-data/**'` to the Babel invocation (liq-orgs has no test data), and `50-*-js.mk` names a different artifact (dev-core owns that file anyway).
- **The test and source finders are depth-agnostic and unchanged.** `15-data-finder.mk` globs `*/test/data/*`, `*/test/data-*/*`, `*/test-data/*`; `20-js-src-finder.mk` classifies `*/test/*` and `*.test.*js` as tests. `src/orgs/resources/lib/test/settings.test.mjs` matches both `*/test/*` and `*.test.*js` at its new depth exactly as it does at its current one.

So the "catalyst vs sdlc" divergence needs no migration work and carries no risk. Recording the measurement here is the point — a task agent should not have to rediscover it, and should not assume it either.

## Validation baseline

Measured by running the toolchain in `/Users/zane/playground/liquid-labs/liq-orgs` at commit `eebf32f` (working tree dirty only as described above), not read from a stale committed report — liq-orgs `.gitignore`s `/qa`, so there are no committed QA reports to read.

- `make test`: **1 test suite, 37 tests, all passing** (~0.35 s). The single suite is `src/resources/lib/test/settings.test.mjs`.
- `make lint`: **passes**, no findings (marker `qa/.lint.passed` written).
- `make build`: **succeeds**, `src/index.js` → `dist/liq-orgs.js` via Rollup.
- Coverage at that baseline: 19.26% statements overall; `settings.mjs` at 100%, **every other module at 0%**.

There is no live-integration suite here (contrast liq-projects's `project-lifecycle.test.mjs`, which creates real GitHub repositories). liq-orgs's suite is hermetic, fast, and network-free, so a test failure after relocation is a real regression with no environment-dependence excuse.

## Consumer inventory

Complete, from a playground-wide grep excluding `node_modules`, `.yalc`, `dist`, `test-staging`, and `worktrees`.

### npm dependents

| Consumer | Reference | Kind | Status |
|---|---|---|---|
| `@sdlcforge/core-server` | `package.json:46` — `"@liquid-labs/liq-orgs": "^1.0.0-alpha.6"` | **registry version range**, *not* a `file:.yalc/` link | Live. Installed tree resolves to `1.0.0-alpha.7`. |
| `@sdlcforge/core-server` | `src/lib/app-init.mjs:37` — `explicitPlugins` array entry | runtime plugin registration | Live. |
| `@liquid-labs/liq-roles` | `package.json` — `"@liquid-labs/liq-orgs": "^1.0.0-alpha.1"`; `src/handlers/orgs/jobs/test/{list,detail}.test.js` — `npm explore @liquid-labs/liq-orgs -- pwd` | npm dependency + test harness | **Dormant** — last commit 2023-11-26. Not in core-server's `explicitPlugins`, not a core-server dependency. |
| `@liquid-labs/liq-test-lib` | `package.json` — `"@liquid-labs/liq-orgs": "^1.0.0-alpha.2"`; `src/org-setup.mjs:19` loads it as a plugin dir | npm dependency + test harness | **Already broken independently of this plan** — `src/org-setup.mjs` imports `appInit`, `initModel`, `Reporter` from `@liquid-labs/liq-core`, a package superseded by `plugable-express` and no longer present, and loads `@liquid-labs/liq-playground` and `@liquid-labs/liq-staff`, which likewise no longer exist. |

**This contradicts **D10**'s claim that "the only npm dependent of any donor is `@sdlcforge/core-server`."** That claim was verified for the string `"@liquid-labs/liq-projects"` and is true for liq-projects. It is **false for `liq-orgs`**, which has three npm dependents. The retirement conclusion is unaffected — all three of the extra dependents are dormant or already broken, and none is loaded by the running server — but the *inventory* obligation in D10 step 2 is larger for this slice, and the claim must not be repeated verbatim in liq-orgs's superseded notice.

### `app.ext` contract consumers (frozen by **D7**; no change needed)

| Consumer | Reference | Contract |
|---|---|---|
| `liq-controls` | `src/lib/resources/load-controls.mjs:6` — `Object.values(app.ext._liqOrgs.orgs)` | reads `_liqOrgs.orgs` |
| `liq-controls` | `src/lib/integrations/get-question-controls.mjs:38` — `app.ext._liqOrgs.orgs[orgKey]` | reads `_liqOrgs.orgs` |
| `liq-controls` | `src/lib/handlers/orgs/controls/_lib/list-lib.mjs:43` + its test fixture | reads `_liqOrgs.orgs` |
| `liq-policy` | `src/liq-policy/setup.mjs:30,38` — `app.ext._liqOrgs.orgSetupMethods.push({...})` | **writes** `_liqOrgs.orgSetupMethods` |

`liq-policy` is the **only** producer of `orgSetupMethods` anywhere in the playground, and it is dormant (last commit 2023-11-08) and not in core-server's `explicitPlugins`. So liq-orgs's third setup method, `process org setup`, currently iterates an always-empty list in the live server. That is worth knowing before anyone concludes the nested `DependencyRunner` is exercised in production — it is not.

`liq-controls` is a participant of the sibling `core-server-domain-consolidation` plan-group and is live in core-server's `explicitPlugins`. Because D7 freezes `app.ext._liqOrgs` verbatim, **liq-controls needs no change at all** — which is the whole point of the freeze.

### Path-var consumers (need `orgKey` to stay registered)

`:orgKey` appears in handler paths owned by `liq-policy` (14 handlers), `liq-controls` (`src/lib/handlers/orgs/controls/list.mjs`), `liq-roles` (`src/handlers/orgs/roles/org-chart.mjs`), and `plugable-express` (`src/handlers/server/next-commands.mjs`). Of these only `liq-controls` and `plugable-express` are live. They need no change provided dev-core keeps registering `orgKey` with the same validation regex, which the relocation preserves byte-for-byte.

### Non-consumers, verified

- **None of the other three donors imports liq-orgs.** `grep -rn "liq-orgs"` over `liq-projects/src`, `liq-work/src`, `liq-projects-lib/src`, `plugable-projects-audit/src` and their `package.json` files returns nothing. The dispatch brief asked for this to be checked rather than assumed; it is checked, and the answer is none. There is therefore no inter-donor ordering constraint created by liq-orgs beyond the `app.ext._liqProjects` read that D6 already covers.
- **`core-server`'s test fixtures do not mention liq-orgs.** `test/test-basic.js` and `test/test-integration-quick.js` list only `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-projects`. Only `test/README.md` (documentation) names liq-orgs. So liq-orgs's consumer swap touches strictly fewer core-server files than liq-projects's did.
- **`liq-controls/plugable-express.yaml`** declares `dependencies: ['@liquid-labs/liq-projects', '@liquid-labs/liq-orgs']`, but **no code anywhere reads that file** (`grep -rn "plugable-express.yaml"` over all `.js`/`.mjs` outside `node_modules` returns nothing). It is dead metadata. Record it in the superseded notice for completeness; do not treat it as a live coupling.
- **`plugable-registry/registry.yaml`** lists `@liquid-labs/liq-orgs` in a plugin catalog. core-server runs with registries in play, so this is worth a line in the handoff, but updating a registry catalog is not this plan-group's to do.

## Corrections to the shared foundation

Three findings from this slice's source reading contradict or extend `dev-core-target-shape.md`. None changes any decision; all change the *stated reasoning*, and reasoning that is wrong in a contract document will mislead a later task agent diagnosing a failure. Each is flagged to the manager and carried as an explicit requirement in the tasks below.

### C1 — Duplicate plugin registration **throws**; it does not silently shadow

**D10** argues against a re-export shim on the grounds that *"`registerHandlers` has no duplicate-path detection — it calls `app[method](path, ...)` for whatever it is given — so Express would silently shadow the second registration."* The source says otherwise, in two independent places:

1. **`plugable-express/src/lib/path-var-registry.mjs:28-34`** — `registerPathVar` throws `Path variable '<name>' is already registered.` on any duplicate. This fires **first**, because `loadPlugin` runs a plugin's `setup` eagerly (`load-plugins.js:29`) while deferring handler registration to `app.ext.pendingHandlers`. With both `@liquid-labs/liq-orgs` and `@sdlcforge/dev-core` in `explicitPlugins`, the server dies at startup with `Path variable 'newOrgKey' is already registered.`
2. **`plugable-express/src/lib/register-handlers.js:130-132`** — `processCommandPath` throws `Non-unique command path: <path>` when a command path is registered twice. This applies to every array-style `path`, which is all of liq-orgs's and all of liq-projects's.

Corroborating evidence that this is understood behavior, not an accident: `parameters-set.mjs` carries its `registerPathVar('parameterKey', …)` block commented out with the note *"Already set in parameters-detail"*; and `plugable-express/src/lib/load-plugins.js` maintains a `supersededPlugins` set specifically to skip packages whose functionality moved, with a comment warning that removing an entry "would silently re-enable double registration."

**The conclusion D10 reaches is unchanged and in fact strengthened** — no shim, atomic swap — but the failure mode a consumer would actually observe is a loud startup crash, not a silent duplicate route. A task agent debugging a failed core-server swap needs the true mechanism, and the handoff spec must name the exact error strings so the failure is recognizable on sight.

### C2 — D10's "only npm dependent is core-server" does not hold for liq-orgs

See the consumer inventory above: `liq-roles` and `liq-test-lib` also declare `@liquid-labs/liq-orgs` in their `package.json`. Both are dormant, neither is loaded by the live server, and neither is a participant in this wave — so no plan change follows — but the superseded notice must inventory them honestly rather than inherit liq-projects's wording.

### C3 — D6's path-var set and its ordering rationale are both slightly off

- D6 records the merged path-var name set as `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `workKey`. It **omits `parameterKey`**, which liq-orgs registers from `parameters-detail.mjs`'s `func` rather than from `setup`. Verified: no collision, so the "no collisions" conclusion holds — but the mechanism (a *handler* registering a path var at registration time) is distinct from the one D6 describes and should be documented, because it means the merged path-var surface is not fully determined by reading the four `setup` functions.
- D6 justifies placing `orgs` second in the composite setup because *"one of which reads `app.ext._liqProjects.playgroundMonitor.getProjectsData()`."* True, but that read happens inside the deferred `load orgs` **setup method**, which the server's `DependencyRunner` runs long after every plugin's `setup` has returned. liq-orgs's `setup` itself touches only `app.ext.setupMethods` (initialized by plugable-express before any plugin loads) and `registerPathVar`. So the ordering constraint D6 states is real in effect but weaker in mechanism than described: **`orgs` after `projects` is safe and should be kept, but it is not load-bearing**, and a task agent must not conclude from a passing composite-setup smoke test that the `_liqProjects` dependency has been exercised. It has not.

## Pre-existing defects surfaced (not fixed by this plan)

1. **Four of the five handlers are dead at runtime.** `list.mjs`, `parameters-detail.mjs`, `parameters-list.mjs`, and `parameters-set.mjs` all read a `model` argument — `Object.values(model.orgs)` directly, or `getOrgFromKey({ model, … })` from `@liquid-labs/liq-handlers-lib`, whose implementation is `model.orgs[orgKey]`. But `plugable-express` **never passes `model` for plugin handlers**: `load-plugins.js:36` calls `registerHandlers(app, { npmName, handlers, reporter, setupData, cache })` with no `model` key, so `register-handlers.js:166`'s `func({ parameters, app, cache, model, reporter, registerPathVar, setupData })` passes `model === undefined`. Every one of those four endpoints throws `TypeError: Cannot read properties of undefined (reading 'orgs')` on its first request. Registration still succeeds, so the failure is invisible at startup and invisible in the API spec.

   The provenance is legible: `liq-test-lib/src/org-setup.mjs` still calls `initModel()` from the retired `@liquid-labs/liq-core` and threads the result into `appInit({ model, … })`. `model` was a `liq-core`-era argument that `plugable-express` dropped without updating the plugins that consumed it. Meanwhile `setup` writes the org registry to `app.ext._liqOrgs.orgs` — the *new* location, which `liq-controls` reads correctly — so the data exists; only these handlers look in the wrong place.

   This is left **unfixed and migrated as-is**, because **D11** forbids behavior changes and because the plausible fix (`model` → `app.ext._liqOrgs`) would also require changing `getOrgFromKey`'s signature in `@liquid-labs/liq-handlers-lib`, a package outside this plan-group. It is flagged to the manager as the single most consequential thing this investigation found, with a recommended follow-up, because consolidation moves known-broken endpoints into a brand-new package under a new name and that deserves an explicit decision rather than a silent inheritance.

2. **`create.mjs` is an unfinished stub.** Its `func` destructures `localDataRoot` (with `commonName`, `legalName`, and `newOrgKey` commented out "to pass lint until we rebuild 'create'"), creates `${localDataRoot}/org` with `fs.mkdir`, and then falls off the end at a bare `// TODO` — it **never sends a response**, so `POST /orgs/create/:newOrgKey` hangs until the client times out. Combined with defect 1, **every endpoint in this package is non-functional**. Migrated as-is.

3. **Zero test coverage of everything except `settings.mjs`.** The 37 passing tests all exercise one 82-line pure module. `setup.mjs`, all five handlers, `parameters-lib.mjs`, and `organization.mjs` are at 0%. Consequence for this plan: **the test suite cannot detect a relocation regression in any of the migrated behavior.** The validation in the tasks below therefore leans on static checks — file census, route-array equality, exported-shape assertions — rather than on the suite, and says so.

4. **`Organization` has no `save()` and no `key`.** `parameters-set.mjs` calls `org.save()` and `setup.mjs`/`list.mjs` read `org.key`, but `src/resources/organization.mjs` defines neither; both would have to come from `Model` in `@liquid-labs/resource-model` (an external, unversioned-in-playground package). Given defect 1 makes those code paths unreachable anyway, this is recorded rather than investigated further. Anyone fixing defect 1 must resolve this too.

5. **`.catalyst-data.yaml` describes a superseded builder.** Per **D8** it is not carried into dev-core. Nothing to do beyond dropping it.

## Cross-repository task precedent

Phase 5 task 001 and all of phase 6 execute in `liq-orgs`; phase 5 tasks 002 and 003 execute in the `sdlcforge/dev-core` checkout. That is an established pattern in this playground: core-server's completed `bun-conversion` task `003-add-server-config-root-accessor-to-comply-defaults` is documented as executing in the `@liquid-labs/comply-defaults` repository and landed a commit there on its own `task/...` branch. Each task document below states its executing repository explicitly in `## Purpose and scope`.
