# Overview

## Purpose and scope

Absorb `@sdlcforge/dev-core` into `@sdlcforge/core-server` as four additional in-tree plugin components, taking this package from three built-in components to **seven**, and retire the package boundary between them.

This is `core-server`'s half of the federated `sdlc-core-unification` plan-group of the SDLCForge Platform Modernization wave plan (wave "Unified CLI and MCP Binaries"). `core-server` is the absorption target and the lead project; `@sdlcforge/dev-core` is the donor, planned separately, and its own plan consists only of source-package retirement steps that **depend on this plan landing and being verified first**.

The 2026-09-05 architecture analysis found the `core-server`/`dev-core` split is not a real architectural boundary. Both are plain `{ handlers, setup }` plugin modules registered into the same generic framework, `@liquid-labs/plugable-express`, and their runtime coupling is already cyclic across the package boundary: `core-server`'s `controls` requires `dev-core`'s `orgs`, and `dev-core`'s `projects` requires `core-server`'s `credentials`. That cycle is what forces the permanently-allowlisted plugin-graph gate failure this plan removes.

### What must change

- `dev-core`'s four submodules (`projects`, `orgs`, `work`, `projects-audit`) become in-tree components at `src/{projects,orgs,work,projects-audit}/`, absorbed through the git-history-preserving merge recipe in [`dev-core`'s consolidation contract](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md).
- `src/lib/builtin-plugins.mjs` aggregates seven components instead of three, in the DAG order recorded in [`component-order-and-manifest-mechanics.md`](./notes/component-order-and-manifest-mechanics.md), preserving `dev-core`'s composite setup ordering (`projects` → `orgs` → `work`; `projects-audit` has no `setup`) rather than flattening it.
- `package.json`'s `plugable.host.builtins[0].components` declares all seven in that same order, replacing the current three-entry list; `@sdlcforge/dev-core` leaves both `explicitPlugins` and `dependencies`.
- `dev-core`'s runtime dependencies are unioned into `package.json` and the lockfile is regenerated with **Bun** (`rm -f bun.lock && bun install`), per this project's own documented procedure — never npm.
- `src/lib/test/plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` array empties out and the gate asserts `outcome === 'ok'`.
- A new ESLint rule forbids cross-component imports across all seven `src/<component>/` directories, formalizing the "coupling stays `app.ext`-only" contract both existing manifests already declare.
- This project's own docs describe the merged seven-component builtin set and the removal of `@sdlcforge/dev-core` as a separate npm plugin dependency.

### What must not change

- **Route count stays 165.** No endpoint is added, removed, or has its `path`, `method`, `matcher`, `help`, or `parameters` altered. `npmName` provenance and route *ordering* do change, and are declared as accepted diffs.
- **`golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical** for the whole life of this plan. Both are captured with `skipCorePlugins: true`, which suppresses the entire builtin tier; any movement in either is a regression, not an accepted change.
- **`app.ext` key names are frozen** — `_liqProjects`, `_liqOrgs`, `constants.WORK_DB_PATH`, `setupMethods`, `credentialsDB`. The consolidation contract's freeze applies unchanged.
- **Setup-method names and their `deps` strings are unchanged.** `@liquid-labs/dependency-runner` matches by exact string.
- **`@liquid-labs/plugable-express` is not absorbed.** It stays the one real package boundary above the merged package, and receives no change from this plan.
- **The third-party `sdlc-projects-*` workflow/badges plugins are not absorbed.** They stay real package boundaries below the merged package and remain explicit npm-dependency plugins.
- **No `@sdlcforge/core-server` → `@sdlcforge/sdlc-core` rename** is performed. See the open question below.

### Success criteria

1. `make build`, `make test`, and `make lint` are green, with lint showing no *new* findings beyond the ~233 pre-existing ones recorded in followups `b3hk`/`mLm3`.
2. The full-tier API spec still reports 165 routes, with 118 attributed to `@sdlcforge/core-server` (its own 6 plus dev-core's 112) and the plugins list down to 5 entries.
3. `validatePluginSet()` against the real package root returns `outcome: 'ok'` with **zero** error-severity findings and an empty `ALLOWLISTED_ERROR_FINDINGS` array — or, if exactly one finding genuinely survives, only that one is allowlisted with a fresh justification and the outcome is reported explicitly rather than absorbed silently.
4. `grep -n 'file:' package.json` shows exactly one surviving entry (`@liquid-labs/plugable-express`); `@sdlcforge/dev-core` appears nowhere in `package.json`, `src/`, or `bun.lock`.
5. Cross-component imports between any two of the seven `src/<component>/` directories fail lint.
6. `git log --follow src/projects/setup.mjs` (and equivalents in the other three absorbed components) still reaches the donor's original commits.

## Current status

Planning is **incomplete**: this invocation returned `needs input`. Five phases are registered with their goals, inputs, and outputs drafted in [`plan/phases/`](./phases/); task breakdown for every phase is deferred pending four research items and two user decisions, listed under [Open questions and research](#open-questions-and-research) below.

No implementation work has started. `plan/TODO.yaml` carries the five phases with zero tasks. The first phase to execute once decomposition completes is **Phase 1, Pre-Merge Baseline And Drift Clearance** — which must run before any merge is attempted, since it is what separates the pre-existing yalc drift from anything the merge itself introduces.

Two preconditions hold at plan creation time and were verified directly:

- `@sdlcforge/dev-core`'s `main` branch already carries the tree at `src/{projects,orgs,work,projects-audit}/…`, so the recipe's donor-side relocation step is unnecessary and the merge sources from `main` rather than a plan branch.
- The installed `node_modules/@sdlcforge/dev-core` snapshot is stale relative to that `main` (missing `optional: true` on `appExt:_liqOrgs.orgSetupMethods`), exactly as dev-core's followup `x6x1` records.

Dependencies are **not installed** in the plan worktree; any phase needing a live `node_modules` provisions it first via `scripts/provision-local-deps.sh`.

## Overview

Five phases, strictly sequential except where noted. Each leaves the repository building, testing, and serving.

### Phase 1 — Pre-Merge Baseline And Drift Clearance

Clear the yalc drift so it is provably pre-existing, then capture a re-runnable baseline of everything the merge could move: the 165-route spec and its `npmName` tally, the plugins/integrations lists, the setup-method name/`deps` graph, the `app.ext` key set, the registered path-variable set, and the current plugin-graph finding set. Author this merge's own parity contract — the enumerated list of every observable expected to change, with its reason — modelled on the predecessor plan-group's [`absorption-parity-contract.md`](./resources/absorption-parity-contract.md). Also capture the pre-merge blob identity of every root-level path, since the recipe's central hazard is that identical generated files merge silently and git's conflict list is *not* the review list.

No source change. Leaves the system exactly as found, plus a refreshed dependency snapshot and a written contract.

### Phase 2 — Absorb Dev-Core

The merge itself: `git remote add dev-core-source`, `git fetch`, confirm the fetched tree's shape, `git merge --allow-unrelated-histories dev-core-source/main`. Resolve every root-level conflict in `core-server`'s favor and `git rm` the package-level files that arrive clean — including the three that carry no conflict and no counterpart path at all (`src/index.mjs`, `make/50-dev-core-js.mk`, `.sdlc-data.yaml`, `package-lock.json`) and dev-core's own `plan/` residue. Union the dependencies, regenerate `bun.lock` the Bun way, and verify no stray `file:` spec survives.

Leaves the merged source in tree but **not yet wired**: `builtin-plugins.mjs` still aggregates three components and `@sdlcforge/dev-core` is still an explicit plugin, so the server's behavior is unchanged and the absorbed code is inert. This is deliberate — it makes the merge independently reviewable and revertible before any behavior moves.

### Phase 3 — Wire And Declare Seven Components

Wire all seven components into `src/lib/builtin-plugins.mjs` in DAG order using extensionless directory imports, preserving the composite setup ordering. Declare the same seven, in the same order, under `package.json`'s `plugable.host.builtins[0].components`, translating dev-core's plugin-manifest component bodies into host-builtin form. Drop `@sdlcforge/dev-core` from `explicitPlugins` (both `app-init.mjs` and the manifest) and from `dependencies`. Close the order-agreement gap documented in [`component-order-and-manifest-mechanics.md`](./notes/component-order-and-manifest-mechanics.md#the-drift-guard-does-not-check-what-the-comment-claims-it-checks) with a real Jest assertion, and correct `builtin-plugins.mjs`'s now-false "add to the end rather than reordering" comment.

This is the phase where behavior actually moves. It must land atomically with the `explicitPlugins` removal: loading a component both in-tree and via npm is a hard startup crash for anything registering a route or path variable, and a *silent* double-registration for `issues-github`, which registers neither.

### Phase 4 — Verify Parity And Tighten The Gate

Check the merged server against Phase 1's parity contract item by item, rebaseline `full-tier-*` snapshots, and confirm `golden-*` snapshots did not move. Empty `ALLOWLISTED_ERROR_FINDINGS` and assert `outcome === 'ok'`; if a finding genuinely survives, keep exactly that one with a fresh justification and report which. Update the plugin-graph tests that assert against now-nonexistent `@sdlcforge/dev-core#…` node IDs.

### Phase 5 — Component Boundary Hardening

Add the `no-restricted-imports` ESLint rule forbidding imports across the seven `src/<component>/` directories, while leaving `src/lib/builtin-plugins.mjs`'s aggregation imports permitted. Parallel-eligible with Phase 4 — it touches lint configuration and build wiring, not tests or snapshots — but is listed after it so that a failing gate is diagnosed before new lint findings are introduced on top of it.

### Documentation

Documentation updates (`README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`, `docs/core-server-spec.md`) are **in scope for this plan** but are deliberately not registered as a phase here: the architectural-implications check that adds the `doc-updates` phase runs only on the invocation that returns `complete`, and this one did not. The full document set that phase must cover is enumerated in [`plan/phases/verify-parity-and-tighten-gate.md`](./phases/verify-parity-and-tighten-gate.md) so it survives to re-invocation.

### Open questions and research

Four research items and two user decisions block full task decomposition:

- **Merge-arrival inventory** — a `git merge-tree` dry run classifying every arriving path as conflict-expected or clean-arrival, with a disposition for each. Blocks Phase 2.
- **Dependency union** — the resolved union table, an undeclared-bare-specifier sweep across dev-core's `src/`, and an assessment of the six ranges the "higher wins" rule upgrades under `core-server`'s own already-absorbed code. Blocks Phase 2.
- **Merged-manifest graph projection** — running `validatePluginSet()` against a candidate seven-component declaration *before* the merge, to convert this plan's central assumption (that DAG order yields `outcome: 'ok'`) into a measurement. Blocks Phases 3 and 4.
- **ESLint rule wiring** — how to add a project-local rule when `CATALYST_ESLINT_CONFIG` points into `node_modules` and `make/10-resources.mk` is generated. Blocks Phase 5.
- **The `@sdlcforge/sdlc-core` rename** — the wave manifest's own plan-group description asserts the merged package *is* `@sdlcforge/sdlc-core`; the change request says the rename is an open question. This plan assumes **not renaming**; the assumption needs confirming.
- **Release and publish scope** — whether this plan-group carries a version bump and `npm publish` attempt, given followup `1aTE`'s standing registry-auth block and dev-core's retirement plan depending on this one.

## Related documents

- [`notes/pre-merge-state.md`](./notes/pre-merge-state.md) — the measured baseline: route/plugin surface, confirmed yalc drift, dev-core's arriving tree, dependency shape.
- [`notes/component-order-and-manifest-mechanics.md`](./notes/component-order-and-manifest-mechanics.md) — the seven-component DAG order, what it changes, and the drift-guard gap it exposes.
- [`resources/absorption-parity-contract.md`](./resources/absorption-parity-contract.md) — the predecessor plan-group's parity contract, the model for Phase 1's.
- [`resources/absorption-dependency-union.md`](./resources/absorption-dependency-union.md) — the predecessor plan-group's dependency-union document, the model for this plan's.
- [`waves/sdlcforge-modernization/manifest.yaml`](./waves/sdlcforge-modernization/manifest.yaml) — the wave plan this plan-group belongs to.
