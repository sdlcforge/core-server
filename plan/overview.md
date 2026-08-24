# Overview

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
