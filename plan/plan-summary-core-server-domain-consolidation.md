# Plan Summary: core-server-domain-consolidation

## What was planned and why

This is `@sdlcforge/core-server`'s own slice of the **`core-server-domain-consolidation`** plan-group, part of the `sdlcforge-modernization` wave plan (wave: "Plugin Consolidation — Framework and Dev-Core"; lead project: `core-server`). The plan-group federates **five** projects: three **donors** — `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-integrations-issues-github`, each of which relocates its own plugin source and then retires — `core-server`, the **fold-in target**, which absorbs all three into its own codebase and drops them from its Tier-2 explicit npm-dependency plugin list, and `@liquid-labs/plugable-express`, the **framework**, added as a fifth participant to supply the registration mechanism none of this is possible without.

The convention followed is the one two completed sibling plan-groups in this same wave already executed: `framework-consolidation` (folding `liq-integrations` and `plugable-server-documentation` into `plugable-express`) and `dev-core-consolidation` (folding `liq-projects`/`liq-work`/`liq-orgs`/`plugable-projects-audit` into the new `@sdlcforge/dev-core`). The latter's [`docs/dev-core-consolidation-contract.md`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md) is the canonical absorption recipe this plan applies: layout convention, root-file ownership, the six-step `git merge --allow-unrelated-histories` recipe against each donor's *relocated-tree branch* (not `main`), the `app.ext` contract freeze, and the source-package retirement policy.

### What must change

1. `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` become in-tree modules of `core-server`'s own source tree, absorbed by history-preserving merge from each donor's `plan/core-server-domain-consolidation` branch.
2. Those three entries are removed from the `explicitPlugins` array in `src/lib/app-init.mjs` and from `package.json`'s `dependencies`; their own runtime dependencies are unioned into `core-server`'s `package.json`.
3. The absorbed modules are registered as plugins at the *same point in `appInit`'s sequence* the npm-dependency path occupies today, through a new `builtinPlugins` `appInit` option supplied by `@liquid-labs/plugable-express` under its own plan slice.
4. `core-server`'s own documentation stops describing an 11-package explicit tier that includes these three.
5. `@sdlcforge/core-server`'s version is bumped and a publish attempted, so the donors' own retirement phases have a published replacement to point at.

### What must not change

- **The HTTP surface.** Every route, method, status code, and response shape the three donors provide today must behave identically afterwards. `liq-controls` contributes `GET /orgs/:orgKey/controls/list` and `GET /orgs/controls/list`; `liq-credentials` contributes `PUT /credentials/:credential/import` and `GET /credentials/list`; `liq-integrations-issues-github` contributes no routes at all (hooks only). Full inventory: [absorbed surface inventory](./notes/absorbed-surface-inventory.md).
- **The `app.ext` contract names.** `app.ext._liqOrgs`, `app.ext._liqProjects`, `app.ext.credentialsDB`, `app.ext.integrations`, `app.ext.setupMethods`, and `app.ext.serverConfigRoot` keep their exact current names, per the `dev-core-consolidation-contract`'s [`app.ext` contract freeze](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#appext-contract-freeze), which names `liq-controls` and `liq-integrations-issues-github` explicitly as outside readers.
- **The setup-method dependency names.** `'load orgs'` (from `liq-orgs`) and `'setup integrations'` (built into `plugable-express`) are matched by exact string by `@liquid-labs/dependency-runner`.
- **`liq-orgs` and `liq-projects`.** Both stay separate npm-dependency explicit plugins; neither is in scope here.
- **`@liquid-labs/liq-credentials-db`.** Stays an external dependency; it is not folded.
- **The framework-surface golden snapshots.** `test/__snapshots__/golden-api-spec.json` (35 routes) and `golden-plugins-list.json` (`[]`) stay byte-identical for the whole life of this plan, and neither `src/lib/test/golden-api-spec.test.js` nor `app-init.test.js` is edited before Phase 6. This is a consequence of the `skipCorePlugins` gating decision, not an incidental convention.

### Settled decisions

Every decision that blocked task breakdown in the first authoring pass is now closed. Each note carries the full reasoning; this is the index.

- **Registration mechanism** — [in-tree plugin registration](./notes/in-tree-plugin-registration.md). Option A: a new, minimally-scoped `builtinPlugins` option on `plugable-express`'s `appInit`, with that repository joining this plan-group as a **fifth participant carrying its own plan slice**. The full mechanism design is appended to the note: the `loadPlugin` → `registerPluginModule` + `loadBuiltinPlugins` split, the `src/app.js` call site inside the `skipCorePlugins` guard and before core `loadPlugins`, and `core-server`'s own `src/lib/builtin-plugins.mjs` aggregator.
- **`skipCorePlugins` suppresses builtins too.** Semantically consistent (an in-tree plugin is in the server package directory more literally than a `node_modules` one), and it resolves the `'load orgs'` dependency-runner hazard at zero cost — the absorbed surface is exercised only in the full-tier configuration where `liq-orgs` is loaded and `deps: ['load orgs']` is satisfiable.
- **Plugin-list identity** — [plugin list visibility](./notes/plugin-list-visibility.md). Option 3: absorbed capability is reported under `@sdlcforge/core-server`'s own identity — one `builtinPlugins` entry for all three submodules, not three, and not the retired donor names.
- **Scope** — [scope confirmation](./notes/scope-confirmation.md). `liq-integrations-issues-github` **is** absorbed and retired (the wave manifest has been amended to match); the `GITHUB_API` credential-contract hardening is **out of scope**, deferred to Wave 3's `compile-time-manifest-*` plan-groups; this plan **does** bump and attempt to publish `@sdlcforge/core-server` at the end.
- **Layout and merge hazards** — [absorption layout and merge hazards](./notes/absorption-layout-and-merge-hazards.md). `src/controls/`, `src/credentials/`, `src/integrations-issues-github/`; `core-server` owns every root-level file; two add/add collisions (`src/lib/index.js`, `src/index.js`) that merge *silently wrong* if resolved by reflex.
- **Baseline feasibility** — [parity baseline](./notes/parity-baseline.md). Answered empirically: the `ynGa` `serverHome`/`serverConfigRoot` bug is already fixed everywhere it mattered, `appInit()` succeeds against the real 11-package explicit tier, and the full baseline (165 routes, 11 plugin-list entries, 7 setup methods, 3 provider registrations, 3 donor-installed `app.ext` keys) is capturable today with no network. Phase 3 is "add assertions to an already-working path."

### Two structural choices this authoring pass made

Neither was dictated by a note; both follow from reconciling two of them, and both are load-bearing enough to state here rather than leave buried in a task document.

- **The full-tier baseline lands as a new, separate harness** (`src/lib/test/full-tier-baseline.test.js` plus `test/__snapshots__/full-tier-*.json`), rather than by removing `skipCorePlugins: true` from the existing `golden-api-spec.test.js` as [parity baseline](./notes/parity-baseline.md#exact-recipe-for-phase-3)'s capture recipe suggested. That recipe predates the gating decision. Keeping the existing file untouched is what makes the gating decision's central claim true — that `golden-api-spec.test.js` "keeps passing with zero edits" — and it preserves that file's own stated intent of isolating the framework-level API surface independent of any loaded plugin. The two snapshots are not rivals: the 35-route golden set is a verified strict subset of the 165-route full-tier capture.
- **Release is its own phase, after documentation.** The absorb phase's own summary originally carried the publish as a trailing output. Sequencing it after Phase 6 means the published tarball carries documentation matching the code inside it.

## Purpose and scope

This is `@sdlcforge/core-server`'s own slice of the **`core-server-domain-consolidation`** plan-group, part of the `sdlcforge-modernization` wave plan (wave: "Plugin Consolidation — Framework and Dev-Core"; lead project: `core-server`). The plan-group federates **five** projects: three **donors** — `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-integrations-issues-github`, each of which relocates its own plugin source and then retires — `core-server`, the **fold-in target**, which absorbs all three into its own codebase and drops them from its Tier-2 explicit npm-dependency plugin list, and `@liquid-labs/plugable-express`, the **framework**, added as a fifth participant to supply the registration mechanism none of this is possible without.

The convention followed is the one two completed sibling plan-groups in this same wave already executed: `framework-consolidation` (folding `liq-integrations` and `plugable-server-documentation` into `plugable-express`) and `dev-core-consolidation` (folding `liq-projects`/`liq-work`/`liq-orgs`/`plugable-projects-audit` into the new `@sdlcforge/dev-core`). The latter's [`docs/dev-core-consolidation-contract.md`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md) is the canonical absorption recipe this plan applies: layout convention, root-file ownership, the six-step `git merge --allow-unrelated-histories` recipe against each donor's *relocated-tree branch* (not `main`), the `app.ext` contract freeze, and the source-package retirement policy.

### What must change

1. `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` become in-tree modules of `core-server`'s own source tree, absorbed by history-preserving merge from each donor's `plan/core-server-domain-consolidation` branch.
2. Those three entries are removed from the `explicitPlugins` array in `src/lib/app-init.mjs` and from `package.json`'s `dependencies`; their own runtime dependencies are unioned into `core-server`'s `package.json`.
3. The absorbed modules are registered as plugins at the *same point in `appInit`'s sequence* the npm-dependency path occupies today, through a new `builtinPlugins` `appInit` option supplied by `@liquid-labs/plugable-express` under its own plan slice.
4. `core-server`'s own documentation stops describing an 11-package explicit tier that includes these three.
5. `@sdlcforge/core-server`'s version is bumped and a publish attempted, so the donors' own retirement phases have a published replacement to point at.

### What must not change

- **The HTTP surface.** Every route, method, status code, and response shape the three donors provide today must behave identically afterwards. `liq-controls` contributes `GET /orgs/:orgKey/controls/list` and `GET /orgs/controls/list`; `liq-credentials` contributes `PUT /credentials/:credential/import` and `GET /credentials/list`; `liq-integrations-issues-github` contributes no routes at all (hooks only). Full inventory: [absorbed surface inventory](./notes/absorbed-surface-inventory.md).
- **The `app.ext` contract names.** `app.ext._liqOrgs`, `app.ext._liqProjects`, `app.ext.credentialsDB`, `app.ext.integrations`, `app.ext.setupMethods`, and `app.ext.serverConfigRoot` keep their exact current names, per the `dev-core-consolidation-contract`'s [`app.ext` contract freeze](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#appext-contract-freeze), which names `liq-controls` and `liq-integrations-issues-github` explicitly as outside readers.
- **The setup-method dependency names.** `'load orgs'` (from `liq-orgs`) and `'setup integrations'` (built into `plugable-express`) are matched by exact string by `@liquid-labs/dependency-runner`.
- **`liq-orgs` and `liq-projects`.** Both stay separate npm-dependency explicit plugins; neither is in scope here.
- **`@liquid-labs/liq-credentials-db`.** Stays an external dependency; it is not folded.
- **The framework-surface golden snapshots.** `test/__snapshots__/golden-api-spec.json` (35 routes) and `golden-plugins-list.json` (`[]`) stay byte-identical for the whole life of this plan, and neither `src/lib/test/golden-api-spec.test.js` nor `app-init.test.js` is edited before Phase 6. This is a consequence of the `skipCorePlugins` gating decision, not an incidental convention.

### Settled decisions

Every decision that blocked task breakdown in the first authoring pass is now closed. Each note carries the full reasoning; this is the index.

- **Registration mechanism** — [in-tree plugin registration](./notes/in-tree-plugin-registration.md). Option A: a new, minimally-scoped `builtinPlugins` option on `plugable-express`'s `appInit`, with that repository joining this plan-group as a **fifth participant carrying its own plan slice**. The full mechanism design is appended to the note: the `loadPlugin` → `registerPluginModule` + `loadBuiltinPlugins` split, the `src/app.js` call site inside the `skipCorePlugins` guard and before core `loadPlugins`, and `core-server`'s own `src/lib/builtin-plugins.mjs` aggregator.
- **`skipCorePlugins` suppresses builtins too.** Semantically consistent (an in-tree plugin is in the server package directory more literally than a `node_modules` one), and it resolves the `'load orgs'` dependency-runner hazard at zero cost — the absorbed surface is exercised only in the full-tier configuration where `liq-orgs` is loaded and `deps: ['load orgs']` is satisfiable.
- **Plugin-list identity** — [plugin list visibility](./notes/plugin-list-visibility.md). Option 3: absorbed capability is reported under `@sdlcforge/core-server`'s own identity — one `builtinPlugins` entry for all three submodules, not three, and not the retired donor names.
- **Scope** — [scope confirmation](./notes/scope-confirmation.md). `liq-integrations-issues-github` **is** absorbed and retired (the wave manifest has been amended to match); the `GITHUB_API` credential-contract hardening is **out of scope**, deferred to Wave 3's `compile-time-manifest-*` plan-groups; this plan **does** bump and attempt to publish `@sdlcforge/core-server` at the end.
- **Layout and merge hazards** — [absorption layout and merge hazards](./notes/absorption-layout-and-merge-hazards.md). `src/controls/`, `src/credentials/`, `src/integrations-issues-github/`; `core-server` owns every root-level file; two add/add collisions (`src/lib/index.js`, `src/index.js`) that merge *silently wrong* if resolved by reflex.
- **Baseline feasibility** — [parity baseline](./notes/parity-baseline.md). Answered empirically: the `ynGa` `serverHome`/`serverConfigRoot` bug is already fixed everywhere it mattered, `appInit()` succeeds against the real 11-package explicit tier, and the full baseline (165 routes, 11 plugin-list entries, 7 setup methods, 3 provider registrations, 3 donor-installed `app.ext` keys) is capturable today with no network. Phase 3 is "add assertions to an already-working path."

### Two structural choices this authoring pass made

Neither was dictated by a note; both follow from reconciling two of them, and both are load-bearing enough to state here rather than leave buried in a task document.

- **The full-tier baseline lands as a new, separate harness** (`src/lib/test/full-tier-baseline.test.js` plus `test/__snapshots__/full-tier-*.json`), rather than by removing `skipCorePlugins: true` from the existing `golden-api-spec.test.js` as [parity baseline](./notes/parity-baseline.md#exact-recipe-for-phase-3)'s capture recipe suggested. That recipe predates the gating decision. Keeping the existing file untouched is what makes the gating decision's central claim true — that `golden-api-spec.test.js` "keeps passing with zero edits" — and it preserves that file's own stated intent of isolating the framework-level API surface independent of any loaded plugin. The two snapshots are not rivals: the 35-route golden set is a verified strict subset of the 165-route full-tier capture.
- **Release is its own phase, after documentation.** The absorb phase's own summary originally carried the publish as a trailing output. Sequencing it after Phase 6 means the published tarball carries documentation matching the code inside it.

## Current status

Second authoring pass (`is_reinvocation: true`), seeded at `phase_number_start: 6`. Phases 1 and 2 belong to `liq-controls`' already-authored slice of this same federated plan; phases 3, 4, and 5 were registered by the first pass with their task breakdown deferred and are broken down now; phases 6 and 7 are registered by this pass.

**Five phases, 12 tasks, all authored.** `plan/manifest.yaml` records this plan's cross-project dependencies on all four other participants.

`plan/phases/` still carries four stale summary files (`bun-*.md`) left over from the completed `bun-conversion` plan; they are unrelated residue, left untouched. `plan/phases/doc-updates.md` was overwritten by this pass with this plan's own doc-updates summary.

**Cross-project gating**, none of which this plan's own tooling can enforce — all of it is the dispatching manager's scheduling responsibility:

- **Phase 4 is blocked on `@liquid-labs/plugable-express`'s own slice landing.** Its `builtinPlugins` affordance is authored and executed under its own plan worktree with its own phase numbers, **not** here. Phase 4's first task is a read-only gate that verifies the landing and halts if it is absent or shaped differently than designed. As of this authoring, `plugable-express`'s slice is not yet authored.
- **Each Phase 5 absorb task is blocked on its donor's own relocation** landing on that donor's `plan/core-server-domain-consolidation` branch. `liq-controls`' relocation is planned and committed but not executed; `liq-credentials` and `liq-integrations-issues-github` have plan branches but no authored plans at all.
- **Conversely, each donor's own retirement phase is gated on this project's Phase 5 landing**, and — because the retirements deprecate npm packages — practically on Phase 7's publish as well.

## Overview

Five phases, strictly sequential. Within Phase 3, tasks 001 and 003 are parallel-eligible; every other task depends on its predecessor.

### Phase 3 — Absorption Baseline And Parity Harness

Captures, as an executable artifact, exactly what the server's loaded surface looks like *today* with the three donors present as npm-dependency plugins. Decision-independent, unblocked, and independent of `plugable-express`'s work — it can run concurrently with every other participant's phases. See [phase summary](./phases/absorption-baseline.md).

- **001 Capture Full-Tier Baseline Harness** (`sonnet-high`) — a new Jest harness starting the server against the real 11-package tier, snapshotting `GET /server/api` (165 entries) and `GET /server/plugins/list` (11 entries) into new `full-tier-*` snapshot files, plus assertions on the seven setup methods and their `deps`, the `app.ext` key set, and `app.ext.credentialsDB`'s method surface. `PLUGABLE_PLAYGROUND` isolation is mandatory. Both existing golden snapshots left byte-identical.
- **002 Capture Integration Provider And Hook Baseline** (`sonnet-high`) — the one observable no route snapshot can see, and the only verification `liq-integrations-issues-github`'s absorption has at all. Wraps `IntegrationsManager.prototype.register` before `appInit()` to capture the faithful `{providerFor, name, npmName, hooks}` triples, and snapshots the consumer-visible endpoint *as-is*, preserving the pre-existing `name`-keyed de-duplication defect rather than accidentally fixing it. Depends on 001.
- **003 Confirm Donor Inventory And Author Parity Contract** (`sonnet-med`) — closes the inventory's **TO CONFIRM** items, sweeps all three donors for undeclared-but-imported bare specifiers, and authors two documents Phase 5 checks itself against: [`plan/resources/absorption-dependency-union.md`](./resources/absorption-dependency-union.md) and [`plan/resources/absorption-parity-contract.md`](./resources/absorption-parity-contract.md). Parallel-eligible with 001.

### Phase 4 — In-Tree Plugin Registration Mechanism

Brings `core-server` onto the `builtinPlugins` affordance and proves the registration path before any donor code sits on it. The mechanism itself is built in `plugable-express`'s own slice; this phase is `core-server`'s side of that boundary. See [phase summary](./phases/in-tree-plugin-mechanism.md).

- **001 Verify Plugable-Express Builtin-Plugins Mechanism** (`sonnet-med`) — read-only cross-project gate. Confirms `registerPluginModule` is the single `setup()` call site (which is what makes argument parity structural rather than inspected), that `loadBuiltinPlugins` carries its three deliberate non-features, that the `app.js` call site is inside the `skipCorePlugins` guard and before core `loadPlugins`, and that nothing downstream of plugin loading moved. Halts the phase on any gap.
- **002 Refresh Plugable-Express Yalc Snapshot** (`sonnet-med`) — `rm -f bun.lock && bun install` (never a bare `bun install`), then re-verify the entire existing surface **without regenerating any snapshot**, so an unrelated regression from the refresh is attributed to the refresh rather than to the absorption.
- **003 Wire Builtin-Plugins Aggregator And Prove With Probe** (`sonnet-high`) — lands `src/lib/builtin-plugins.mjs` empty-but-shaped plus the three `app-init.mjs` edits, and proves the whole path with a **test-injected** probe (not a shipped one): the exact five-member setup argument object, a successful `registerPathVar`, a setup method running under `dependency-runner`, a served route, presence in the written API spec, and — the single most important assertion in the phase — a thrown error from the probe route producing the **server's own** error-response shape rather than Express's default.

### Phase 5 — Absorb Donor Plugins And Retire Explicit-Tier Entries

The three history-preserving merges plus an aggregate gate. Each donor's task is independently gated on that donor's own relocation landing, so the three are sequenced by donor readiness rather than by any dependency between them. The critical invariant throughout: **wiring in and unplugging must land together** — a donor loaded both ways at once crashes startup with `Non-unique command path`. See [phase summary](./phases/absorb-donor-plugins.md).

- **001 Absorb Liq-Controls** (`opus-med`) — the pattern-setting merge, carrying the `src/lib/index.js` add/add collision that silently deletes `core-server`'s entire public export surface if `--theirs` is taken.
- **002 Absorb Liq-Credentials** (`sonnet-high`) — the donor whose `setup()` actually exercises the mechanism (`app.ext.credentialsDB`, `registerPathVar('credential', …)`). Carries the `src/index.js` clean-add that git never flags, and must verify the `liq-projects` setup-ordering coupling still holds.
- **003 Absorb Liq-Integrations-Issues-Github** (`opus-med`) — zero routes, so nothing in a route snapshot can tell you it worked; verification lives entirely in task 002's `register()` baseline. Carries the `@liquid-labs/octocache` undeclared-dependency hazard and a live re-check of the `determineCurrentMilestone` inlining state.
- **004 Verify Post-Absorption Parity** (`sonnet-high`) — the aggregate gate: full-tier parity against the contract, three per-donor root-file blob comparisons, dependency-union integrity, a whole-artifact bundle audit, `git log --follow` history reachability, and a single unambiguous PASS/FAIL verdict the manager can schedule against.

### Phase 6 — Documentation Updates

Registered per the architectural-implications check: this change moves a documented component boundary, introduces a new composition seam, and changes spec-described behavior about where the server's capability comes from. See [phase summary](./phases/doc-updates.md).

- **001 Update Architecture Docs** (`sonnet-high`) — `docs/architecture/plugin-loading-tiers.md` (Tier-2 table and the `11 npm-dependency packages` diagram label), `docs/architecture.md` (which additionally carries a *pre-existing* 13-vs-11 error), `docs/core-server-spec.md`, `docs/project-structure.md`, `AGENTS.md`, `README.md`, and `CLAUDE.md`. Also corrects the now-false in-source comment in `golden-api-spec.test.js` claiming the real explicit tier throws.

### Phase 7 — Release And Publish

See [phase summary](./phases/release.md).

- **001 Bump Version And Publish** (`sonnet-med`) — bump from `1.0.0-alpha.15` to the next alpha and attempt `npm publish --access public --tag alpha`. Written to expect a blocked publish (both a Bash-permission-classifier block and a registry 401 have precedent in this wave) and to hand the exact command to the user with a follow-up recorded, rather than to treat the block as a failure. Reports explicitly whether the donors' retirement phases are unblocked.

## What shipped

### Phase 03 — Absorption Baseline And Parity Harness

1. **Capture Full-Tier Baseline Harness** (`001-capture-full-tier-baseline-harness.md`, tier `sonnet-high`) — Added src/lib/test/full-tier-baseline.test.js, a new Jest harness that calls appInit() against core-server's real, full eleven-package explicit plugin tier (no skipCorePlugins), with mandatory PLUGABLE_PLAYGROUND isolation. Snapshots GET /server/api (165 entries) and GET /server/plugins/list (11 entries), gated behind UPDATE_FULL_TIER_BASELINE opt-in. Added assertions for setup methods, app.ext keys, credentialsDB method set — all matched parity-baseline.md exactly. Confirmed golden-api-spec pair byte-identical/untouched; confirmed 35-entry golden snapshot is a strict subset of the 165-entry capture. Two forced regeneration runs byte-identical. make test green (10/10). make lint fails only on pre-existing unrelated test/*.js violations (tracked as followup b3hk); new file itself lint-clean.
   Commit `0467841`, merged at `9109b3981bf9773f194081132eb721178aa4cf6c`.

2. **Capture Integration Provider And Hook Baseline** (`002-capture-integration-provider-baseline.md`, tier `sonnet-high`) — Extended task 001's full-tier-baseline.test.js harness with a module-scoped wrapper around IntegrationsManager.prototype.register, installed before appInit() and restored as the first afterAll statement. Captured registrations asserted against the exact three-provider/hook baseline from parity-baseline.md, with the two issues-github registrations' name:undefined encoded deliberately as documented pre-existing defect. Added full-tier-integrations-list.json snapshot (2 entries, de-duplicated). make test green (4 suites/13 tests). make lint fails only on pre-existing tracked violations (followup b3hk), unrelated to this task's files.
   Commit `55c58fa`, merged at `be3aa09f184213a49200fd768db1076c952c3595`.

3. **Confirm Donor Inventory And Author Parity Contract** (`003-confirm-inventory-and-parity-contract.md`, tier `sonnet-med`) — Completed all six requirements as pure research/documentation work, no source/test/package.json touched. Read each donor's current plan/core-server-domain-consolidation branch tip directly (liq-controls@3030cdab9, liq-credentials@fc72da1d, liq-integrations-issues-github@e5240c1a5). Confirmed both open TO CONFIRM items: liq-controls' liq-qa-lib/http-smart-response are dead code; determineCurrentMilestone/liq-projects-lib coupling was not yet inlined as of this snapshot (task 001 in that donor's own plan slice has since landed it separately). Swept all three donors for undeclared bare specifiers, found one (issues-github's octocache, resolved to ^1.0.0-alpha.4). Authored plan/resources/absorption-dependency-union.md and plan/resources/absorption-parity-contract.md.
   Commit `e7ac9c1`, merged at `b4ba5ac524503a5c1b868fc9221eaa72f1f0ae1d`.

### Phase 04 — In-Tree Plugin Registration Mechanism

1. **Verify Plugable-Express Builtin-Plugins Mechanism** (`001-verify-plugable-express-builtin-plugins.md`, tier `sonnet-med`) — Re-verified all eight requirements of the plugable-express builtinPlugins mechanism gate from scratch against producer HEAD a95c4cf0e12e98a6f15ae98930ed5659dc6c3013 (1.0.0-alpha.58). Requirements 1-7 and 8a (230-test suite) reconfirmed cleanly. Requirement 8b (yalc snapshot content check) now passes: core-server's .yalc/ snapshot's dist/plugable-express.js confirmed byte-identical (SHA-256) to the producer's freshly-rebuilt dist, both containing the builtinPlugins mechanism. Gate passes in full; tasks 002/003 may proceed.
   Commit `ad518a1`, merged at `1a12b7f3288e5a272490da4d6601631fd2f5a577`.

2. **Refresh Plugable-Express Yalc Snapshot** (`002-refresh-plugable-express-snapshot.md`, tier `sonnet-med`) — Refreshed core-server's yalc-linked bun.lock against plugable-express's confirmed builtinPlugins snapshot (commit a95c4cf0e12e98a6f15ae98930ed5659dc6c3013, 1.0.0-alpha.58) via rm -f bun.lock && bun install. The refresh by itself changed nothing observable: make build/test green, all five named snapshots byte-unchanged, dist bundle sizes identical before/after, diff confined entirely to bun.lock. make lint failed on 230 pre-existing ESLint errors in test/*.js proven byte-identical before/after this refresh via git-stash comparison (already tracked as followup b3hk, out of this task's edit scope). Manager reviewed the evidence and accepts this task as substantively successful — the pre-existing, already-tracked, proven-unrelated lint debt does not represent a regression introduced by this refresh, and the task's explicit scope forbids touching test/ to fix it.
   Commit `4473740`, merged at `8caee2ab10f4bfeb6dea4164d244952354bd5067`.

3. **Wire Builtin-Plugins Aggregator And Prove With Probe** (`003-wire-builtin-plugins-aggregator.md`, tier `sonnet-high`) — Landed core-server's own side of the in-tree registration mechanism (builtin-plugins.mjs aggregator, app-init.mjs wiring) in empty-but-shaped form, proven end-to-end with a test-injected probe plugin. make build/test green (5 suites/28 tests), bun run test:local 7/7 passed. Existing golden tests/snapshots byte-identical. Error-shape assertion demonstrably meaningful (verified fail-then-restore per validation bullet 58). Bundle grew +340 bytes both artifacts, no new bare-specifier require, no build-config change needed. make lint fails only on the same 230 pre-existing test/*.js violations tracked as followup b3hk, confirmed byte-identical to this worktree's own pre-edit baseline; targeted lint on the 4 new/changed files is clean.
   Commit `15e25d4`, merged at `abcf72456e7b2adc947b77eb7b8788a02553ee9d`.

### Phase 05 — Absorb Donor Plugins And Retire Explicit-Tier Entries

1. **Absorb Liq-Controls** (`001-absorb-liq-controls.md`, tier `opus-med`) — Absorbed @liquid-labs/liq-controls into core-server at src/controls/ by git merge --allow-unrelated-histories from the donor's plan branch tip b1c5dbc, preserving full history. The src/lib/index.js add/add collision resolved --ours and blob-verified empty against pre-merge commit before any other edit. Whole-tree blob comparison empty, confirming silently-merged Makefile/make/ content is core-server's own. Dependency union re-verified against donor tip (no discrepancy), adding seven ranges, no file: spec. Wire-in and unplug landed in a single commit. All four donor test files run and pass with no edits; bun run test:local confirms real server startup. Every snapshot diff matches the parity contract: 165 routes unchanged with exactly four npmName changes, plugins list 12->11, integrations provider re-identified, golden-* byte-identical. make lint pre-existing failure (230 errors, 4 test/*.js files) unchanged in count/file-set from pre-task baseline, deliberately not fixed to avoid violating this task's own no-unexpected-root-path check.
   Commit `ea705de`, merged at `2fad589c39336c35b5089b70197794dd79f305b1`.

2. **Absorb Liq-Credentials** (`002-absorb-liq-credentials.md`, tier `sonnet-high`) — Merged liq-credentials's relocated src/credentials/ tree via git merge --allow-unrelated-histories, removed donor's clean-add src/index.js (the exact silent hazard requirement 2 warns about), blob-verified nothing outside src/credentials/ changed. Wired credentials submodule into builtin-plugins.mjs, unplugged from explicitPlugins/package.json in same commit, unioned liq-credentials-db, confirmed via real server startup no duplicate-route/path-var crash. liq-projects/liq-credentials setup-ordering coupling verified clean; fixed a latent test-isolation gap in builtin-plugins.test.js's probe harness (joins the real absorbed-submodules entry alongside the probe rather than replacing it, since liq-projects now depends on credentials having run). make test green (10 suites/35 tests), make lint pre-existing failure unchanged (230 errors, same 4 test/*.js files, tracked as b3hk). Every snapshot diff matches parity contract; golden-* byte-identical.
   Commit `ef98c31`, merged at `efbada951d3ce719a2ddad547e06f2b0d736faf1`.

3. **Absorb Liq-Integrations-Issues-Github** (`003-absorb-liq-integrations-issues-github.md`, tier `opus-med`) — Merged liq-integrations-issues-github into src/integrations-issues-github/ via git merge --allow-unrelated-histories from donor's plan branch. determineCurrentMilestone inlining confirmed already landed (verified from source): create-or-update-pull-request.mjs imports the local module, zero liq-projects-lib references anywhere. liq-projects-lib therefore did NOT enter the dependency union and is now fully absent from bun.lock - unblocks dev-core-consolidation's final task. octocache hazard handled: declared explicitly, confirmed externalized in both bundles (zero undeclared bare specifiers). Wire-in/unplug landed together; missing-name defect on both register() calls preserved and documented in-source as deliberate. full-tier-api-spec.json byte-identical (165 entries, no npmName movement, the distinguishing property of this donor); plugins-list 10->9; explicitPlugins=8 (plan's target count). make build/test green (12 suites/40 tests), bun run test:local 7/7. make lint pre-existing failure unchanged (230 errors, same 4 files, tracked as b3hk).
   Commit `b55898e`, merged at `17a62615ca4112f027805e17ed13938f4c07d273`.

4. **Verify Post-Absorption Parity** (`004-verify-post-absorption-parity.md`, tier `sonnet-high`) — Aggregate verdict: PASS. Verified all 8 requirements against live source and live server output for all three donor absorptions (liq-controls, liq-credentials, liq-integrations-issues-github): full-tier API/plugins/integrations snapshots show exactly the contract-permitted npmName diffs and nothing else (165 routes, correct ordering); root-file blob comparison against each donor's actual pre-merge commit confirms no donor file survived anywhere; explicitPlugins=8, submodules=[controls, credentials, issuesGitHub] in fixed order; full 15-entry dependency union present at recorded ranges including correctly-dropped conditional liq-projects-lib; bundle audit zero undeclared bare specifiers; git log --follow reaches donor pre-relocation history for each donor; all ported donor tests run and pass. make build/test green (12 suites/40 tests), bun run test:local 7/7. Sole non-green item: make lint fails on the same 4 pre-existing unrelated test/*.js files (tracked as b3hk), confirmed byte-identical to pre-plan main. The three donors' retirement phases and this plan's Phases 6/7 are unblocked from an absorption-parity standpoint. Behavioral parity of absorbed handlers/hooks themselves not verified (registration-time only, known accepted limitation).
   Commit `f38bff9`, merged at `8dcad42d36fb9ea212af26121b58e84f26cda860`.

### Phase 06 — Documentation Updates

1. **Update Architecture Docs** (`001-update-architecture-docs.md`, tier `sonnet-high`) — Comprehensive documentation-update pass across 7 target files plus test/README.md (flagged additional item) and a comment-only fix in golden-api-spec.test.js. Corrected the pre-existing 11-vs-8 (and 13-vs-8) explicit-plugin-count errors, described the new built-in (in-tree) tier and skipCorePlugins gating, preserved the liq-orgs+liq-projects load-order fact from the dropped plugable-express.yaml, added the Wave-3 compile-time-manifest supersession note, updated consumer-visible API-diff description in core-server-spec.md, and added the three new src/ directories plus src/lib/builtin-plugins.mjs to project-structure.md. bun run test green (12/12 suites, 40/40 tests). No behavioral code changed.
   Commit `fd8d483`.

### Phase 07 — Release And Publish

1. **Bump Version And Publish** (`001-bump-version-and-publish.md`, tier `sonnet-med`) — Bumped @sdlcforge/core-server 1.0.0-alpha.15 -> 1.0.0-alpha.16 (package.json only; bun.lock unaffected). make build/test green (12/12 suites, 40/40 tests); make lint's 230 pre-existing errors confined to the 4 already-tracked test files (follow-up b3hk), unchanged. npm publish --access public --tag alpha reached the registry and was rejected E404 (no publish permission) — the same registry-auth-class block liq-controls's and liq-credentials's own publish/deprecate attempts hit in this session; neither donor has actually been deprecated live either, so no real installability gap has opened. Exact handoff command and sequencing guidance (publish core-server before running any donor's deprecate command) recorded as follow-up 1aTE at the project root. Donors' retirement phases are NOT unblocked by a live registry publish, though this does not block dispatching liq-integrations-issues-github's own absorption-verification gate, which is independent of the publish outcome.
   Commit `fccddbe`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`uROI`** — **IntegrationsManager de-dup collapses provider** — IntegrationsManager.listInstalledPlugins() (in @liquid-labs/plugable-express) de-duplicates its provider list via new Map(list.map((p) => [p.name, p])). Both register() call sites in @liquid-labs/liq-integrations-issues-github's setup (tickets and pull request providers) omit the name field, so both are keyed on undefined and the Map collapses them into one entry — the later pull request registration silently overwrites the earlier tickets registration. GET /server/plugins/integrations/list reports two entries where three providers are actually registered; tickets is invisible to that endpoint (though still functional via callHook/hasHook, which key on providerFor not name). Fix belongs either in liq-integrations-issues-github (supply distinct name values) or in plugable-express's de-duplication key. Captured as present-day, deliberately-preserved behavior in core-server's phase-03 baseline test and snapshot; out of scope for the domain-consolidation absorption plan.

- **`OjpW`** — **plugable-express's src/app.js imports WeakCac** — plugable-express's src/app.js imports WeakCache (@liquid-labs/weak-cache) and readFJSON (@liquid-labs/federated-json) in production code paths, but both are declared only in devDependencies, not dependencies. Worth checking during task 002's bun.lock regeneration since a from-registry install wouldn't pull these transitively.

- **`Z2Ar`** — **finalize-task-commit.sh's yalc-override guard** — finalize-task-commit.sh's yalc-override guard excludes any bun.lock refresh from its automated commit in this repo, since bun.lock permanently carries file:.yalc/... entries by design here. This task's bun.lock was committed manually as a documented workaround. Worth considering a per-project exception to that guard, or documenting manual follow-up commit as the accepted pattern for yalc-refresh tasks in bun-based repos.

- **`8lmN`** — **A fresh task worktree in this repo needs a on** — A fresh task worktree in this repo needs a one-time `bun link` before `bun run test:local` will run (bare spawn('sdlcforge-server') relies on PATH resolution a plain bun install doesn't provision). Not a regression, worth noting for future worktree provisioning in this project.

- **`O1n0`** — **Deliberately not consolidated: src/lib/index.** — Deliberately not consolidated: src/lib/index.js's summary constant and builtin-plugins.mjs's summary are near-identical duplicates; importing one from the other would create an index.js -> app-init.mjs -> builtin-plugins.mjs -> index.js cycle. Task doc explicitly names this a follow-up.

- **`QNmX`** — **arch docs stale post-builtinPlugins** — Surfaced by the phase-4 review gate; deliberately deferred to Phase 6 (already scoped to update these exact files) rather than fixed twice (once for the empty mechanism, once after Phase 5's real donor absorption). Specifics to fold into Phase 6 task 001: (1) docs/architecture/plugin-loading-tiers.md lines 18,43-45,96-112 — "Tier 1: core plugins" section falsely claims core-server exercises no control over which core plugins load; the new builtinPlugins wiring in app-init.mjs (src/lib/builtin-plugins.mjs) contradicts this now, and the superInit({...}) code excerpt needs the builtinPlugins line added. (2) docs/architecture.md lines 11,51,64 and docs/core-server-spec.md lines 23,64,89 — same fixed three-tier characterization needs syncing once (1) is fixed. (3) CLAUDE.md has zero inbound links from README.md/AGENTS.md, unreachable from the doc chain — add a cross-link. (4) docs/architecture.md's Security model section attributes credential handling entirely to the liq-credentials explicit plugin — will need updating once Phase 5 absorbs liq-credentials into builtin-plugins.mjs's submodules. (5) Consider naming the new mechanism its own category (e.g. "Tier 1b: in-tree builtin plugins") rather than folding it into Tier 1 prose. (6) Independently noted, pre-existing and unrelated to this phase: docs/architecture.md and docs/core-server-spec.md both say explicitPlugins holds "13" packages vs. the actual 11, and docs/architecture.md disagrees with plugin-loading-tiers.md (13 vs 11) on the same count — worth correcting in the same pass.

- **`p4j0`** — **@liquid-labs/versioning ^1.0.0-alpha.4 is a d** — @liquid-labs/versioning ^1.0.0-alpha.4 is a dependency-union entry the plan's absorption-dependency-union.md did not predict (it's the direct replacement for liq-projects-lib now that determineCurrentMilestone is inlined, needed for minVersion). Declared correctly at donor's own range for the same nodeExternals() reason octocache was. Worth correcting that resource doc if Phase 5 task 004's parity check reads it.

- **`BPvA`** — **absorption-dependency-union.md's requirement** — absorption-dependency-union.md's requirement 2 (octocache undeclared-by-donor) is now stale in a benign direction - the donor has since fixed this upstream and declares it at exactly the prescribed range.

- **`88IA`** — **Requirement 7's stated ported-test-file count** — Requirement 7's stated ported-test-file count for issues-github ("one") is stale against current reality (two files, both passing, traceable via git log --follow to legitimate donor-side work) - worth correcting in the task doc's text if ever revisited, informational only.

- **`oGHy`** — **test/README.md stale donor plugin names** — test/README.md (lines 105-106) still lists @liquid-labs/liq-controls and @liquid-labs/liq-credentials in its "Explicit Plugins Integration" prose, stale after Phase 5's absorption. Not covered by Phase 6's own doc-update scope (which targets docs/architecture*, docs/core-server-spec.md, docs/project-structure.md, AGENTS.md, README.md, CLAUDE.md - not test/README.md). Surfaced by liq-credentials's phase-11 retire-verification gate.

- **`oY63`** — **docs/project-structure.md's docs/ prose secti** — docs/project-structure.md's docs/ prose section doesn't mention docs/architecture.md or docs/architecture/plugin-loading-tiers.md at all (only core-server-spec.md) — pre-existing gap predating this plan, unrelated to donor absorption; worth a future doc pass.

- **`1aTE`** — **Publish core-server 1.0.0-alpha.16** — npm publish blocked: `npm publish --access public --tag alpha`, run from this project's root after package.json's version was bumped to 1.0.0-alpha.16 (committed; bun.lock unaffected since it does not track the root workspace's own version field), failed with `npm error code E404` / "404 Not Found - PUT https://registry.npmjs.org/@sdlcforge%2fcore-server - Not found... you do not have permission to access it" against the live https://registry.npmjs.org/ registry. This is the same registry-auth-class block (401/404) that liq-controls's and liq-credentials's own npm publish/deprecate attempts hit in this same session — neither donor has actually been deprecated on the live registry either, so no installability gap has opened yet. Manual action needed: run `npm publish --access public --tag alpha` from the @sdlcforge/core-server project root with valid registry credentials, then verify via `npm view @sdlcforge/core-server versions` (expect 1.0.0-alpha.16 with the alpha dist-tag pointing at it). Sequencing: complete this publish before running any donor's recorded deprecate command, so the replacement is live before any donor is marked deprecated.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 03 — Absorption Baseline And Parity Harness

- [x] [001-capture-full-tier-baseline-harness.md](./phase-03-absorption-baseline/001-capture-full-tier-baseline-harness.md) — tier `sonnet-high` · branch `plan/core-server-domain-consolidation-03-001` · commit `0467841` · merge `9109b3981bf9773f194081132eb721178aa4cf6c`
- [x] [002-capture-integration-provider-baseline.md](./phase-03-absorption-baseline/002-capture-integration-provider-baseline.md) — tier `sonnet-high` · branch `plan/core-server-domain-consolidation-03-002` · commit `55c58fa` · merge `be3aa09f184213a49200fd768db1076c952c3595`
- [x] [003-confirm-inventory-and-parity-contract.md](./phase-03-absorption-baseline/003-confirm-inventory-and-parity-contract.md) — tier `sonnet-med` · branch `plan/core-server-domain-consolidation-03-003` · commit `e7ac9c1` · merge `b4ba5ac524503a5c1b868fc9221eaa72f1f0ae1d`

### Phase 04 — In-Tree Plugin Registration Mechanism

- [x] [001-verify-plugable-express-builtin-plugins.md](./phase-04-in-tree-plugin-mechanism/001-verify-plugable-express-builtin-plugins.md) — tier `sonnet-med` · branch `plan/core-server-domain-consolidation-04-001` · commit `ad518a1` · merge `1a12b7f3288e5a272490da4d6601631fd2f5a577`
- [x] [002-refresh-plugable-express-snapshot.md](./phase-04-in-tree-plugin-mechanism/002-refresh-plugable-express-snapshot.md) — tier `sonnet-med` · branch `plan/core-server-domain-consolidation-04-002` · commit `4473740` · merge `8caee2ab10f4bfeb6dea4164d244952354bd5067`
- [x] [003-wire-builtin-plugins-aggregator.md](./phase-04-in-tree-plugin-mechanism/003-wire-builtin-plugins-aggregator.md) — tier `sonnet-high` · branch `plan/core-server-domain-consolidation-04-003` · commit `15e25d4` · merge `abcf72456e7b2adc947b77eb7b8788a02553ee9d`

### Phase 05 — Absorb Donor Plugins And Retire Explicit-Tier Entries

- [x] [001-absorb-liq-controls.md](./phase-05-absorb-donor-plugins/001-absorb-liq-controls.md) — tier `opus-med` · branch `plan/core-server-domain-consolidation-05-001` · commit `ea705de` · merge `2fad589c39336c35b5089b70197794dd79f305b1`
- [x] [002-absorb-liq-credentials.md](./phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md) — tier `sonnet-high` · branch `plan/core-server-domain-consolidation-05-002` · commit `ef98c31` · merge `efbada951d3ce719a2ddad547e06f2b0d736faf1`
- [x] [003-absorb-liq-integrations-issues-github.md](./phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md) — tier `opus-med` · branch `plan/core-server-domain-consolidation-05-003` · commit `b55898e` · merge `17a62615ca4112f027805e17ed13938f4c07d273`
- [x] [004-verify-post-absorption-parity.md](./phase-05-absorb-donor-plugins/004-verify-post-absorption-parity.md) — tier `sonnet-high` · branch `plan/core-server-domain-consolidation-05-004` · commit `f38bff9` · merge `8dcad42d36fb9ea212af26121b58e84f26cda860`

### Phase 06 — Documentation Updates

- [x] [001-update-architecture-docs.md](./phase-06-doc-updates/001-update-architecture-docs.md) — tier `sonnet-high` · branch `plan/core-server-domain-consolidation-06-001` · commit `fd8d483` · merge `…`

### Phase 07 — Release And Publish

- [x] [001-bump-version-and-publish.md](./phase-07-release/001-bump-version-and-publish.md) — tier `sonnet-med` · branch `plan/core-server-domain-consolidation-07-001` · commit `fccddbe` · merge `…`
