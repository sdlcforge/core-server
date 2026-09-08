# Plan Summary: sdlc-core-unification

## What was planned and why

Absorb `@sdlcforge/dev-core` into `@sdlcforge/core-server` as four additional in-tree plugin components, taking this package from three built-in components to **seven**, and retire the package boundary between them.

This is `core-server`'s half of the federated `sdlc-core-unification` plan-group of the SDLCForge Platform Modernization wave plan (wave "Unified CLI and MCP Binaries"). `core-server` is the absorption target and the lead project; `@sdlcforge/dev-core` is the donor, planned separately, and its own plan consists only of source-package retirement steps that **depend on this plan landing and being verified first**.

The 2026-09-05 architecture analysis found the `core-server`/`dev-core` split is not a real architectural boundary. Both are plain `{ handlers, setup }` plugin modules registered into the same generic framework, `@liquid-labs/plugable-express`, and their runtime coupling is already cyclic across the package boundary: `core-server`'s `controls` requires `dev-core`'s `orgs`, and `dev-core`'s `projects` requires `core-server`'s `credentials`. That cycle is what forces the permanently-allowlisted plugin-graph gate failure this plan removes.

### What must change

- `dev-core`'s four submodules (`projects`, `orgs`, `work`, `projects-audit`) become in-tree components at `src/{projects,orgs,work,projects-audit}/`, absorbed through the git-history-preserving merge recipe in [`dev-core`'s consolidation contract](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md).
- `src/lib/builtin-plugins.mjs` aggregates seven components instead of three, in the DAG order recorded in [`component-order-and-manifest-mechanics.md`](./notes/component-order-and-manifest-mechanics.md), preserving `dev-core`'s composite setup ordering (`projects` → `orgs` → `work`; `projects-audit` has no `setup`) rather than flattening it.
- `package.json`'s `plugable.host.builtins[0].components` declares all seven in that same order, replacing the current three-entry list; `@sdlcforge/dev-core` leaves both `explicitPlugins` and `dependencies`.
- `dev-core`'s runtime dependencies are unioned into `package.json` (22 + 23 names → **32** after dropping `@sdlcforge/dev-core`) and the lockfile is regenerated with **Bun** (`rm -f bun.lock && bun install`), per this project's own documented procedure — never npm.
- `src/lib/test/plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` array is **deleted outright**, along with the logic that consumes it, and the gate asserts `outcome === 'ok'` with `counts.error === 0`.
- dev-core's ~22 open followups are **re-filed into `core-server`'s registry**, not dropped: at least seven describe live defects in code this merge absorbs.
- `src/controls/handlers/orgs/controls/list-implied.mjs`'s call into a since-renamed `@liquid-labs/npm-toolkit` export is fixed — a pre-existing break, fixed here because this plan's dependency work is what would first surface it.
- A new ESLint rule (`import/no-restricted-paths`, seven zones, in a root `.eslintrc.cjs`) forbids cross-component imports across all seven `src/<component>/` directories, formalizing the "coupling stays `app.ext`-only" contract both existing manifests already declare.
- This project's own docs describe the merged seven-component builtin set and the removal of `@sdlcforge/dev-core` as a separate npm plugin dependency.

### What must not change

- **Route count stays 165.** No endpoint is added, removed, or has its `path`, `method`, `matcher`, `help`, or `parameters` altered. `npmName` provenance and route *ordering* do change, and are declared as accepted diffs.
- **`golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical** for the whole life of this plan. Both are captured with `skipCorePlugins: true`, which suppresses the entire builtin tier; any movement in either is a regression, not an accepted change.
- **`app.ext` key names are frozen** — `_liqProjects`, `_liqOrgs`, `constants.WORK_DB_PATH`, `setupMethods`, `credentialsDB`. The consolidation contract's freeze applies unchanged.
- **Setup-method names and their `deps` strings are unchanged.** `@liquid-labs/dependency-runner` matches by exact string.
- **`@liquid-labs/plugable-express` is not absorbed.** It stays the one real package boundary above the merged package, and receives no change from this plan.
- **The third-party `sdlc-projects-*` workflow/badges plugins are not absorbed.** They stay real package boundaries below the merged package and remain explicit npm-dependency plugins.
- **No `@sdlcforge/core-server` → `@sdlcforge/sdlc-core` rename** is performed. [Settled](./notes/sdlc-core-rename-scope.md): the merge lands under `core-server`'s existing package identity, and a future rename is its own separately-scoped plan-group. The wave manifest's plan-group description naming `@sdlcforge/sdlc-core` is aspirational framing from wave-authoring time, not this plan-group's scope.
- **No release step.** [Settled](./notes/release-and-publish-scope.md): no version bump and no `npm publish` attempt for `@sdlcforge/core-server` in this plan-group. The deliverable is the locally/yalc-consumed merge. `core-server`'s last publish attempt already hit the registry-auth block recorded in followup `1aTE`, and nothing here clears it.
- **The `@liquid-labs/plugable-express` yalc link stays.** `grep -n 'file:' package.json` must end at **exactly one** hit, never zero — the contract's literal "returns nothing" gate does not apply to this repository.

### Success criteria

1. `make build`, `make test`, and `make lint` are green, with lint showing no *new* findings beyond the ~233 pre-existing ones recorded in followups `b3hk`/`mLm3`.
2. The full-tier API spec still reports 165 routes, with 118 attributed to `@sdlcforge/core-server` (its own 6 plus dev-core's 112) and the plugins list down to 5 entries.
3. `validatePluginSet()` against the real package root returns `outcome: 'ok'`, `exitCode: 0`, `counts.error === 0`, with `ALLOWLISTED_ERROR_FINDINGS` **deleted** rather than emptied. The full expected finding set is 1 `info` (`appExt:_liqOrgs.orgSetupMethods`, optional) plus 4 `debug` `unmanifested-node` findings for the untouched `sdlc-projects-*` plugins — [measured, not projected](./notes/merged-manifest-graph-projection.md#full-post-merge-finding-set-all-severities). If a finding genuinely survives, only that one is allowlisted with a fresh justification and the outcome is reported explicitly rather than absorbed silently.
4. `grep -n 'file:' package.json` shows exactly one surviving entry (`@liquid-labs/plugable-express`); `@sdlcforge/dev-core` appears nowhere in `package.json`, `src/`, or `bun.lock`.
5. Cross-component imports between any two of the seven `src/<component>/` directories fail lint, with `make lint`'s finding count unchanged at the standing 233.
6. `git log --follow src/projects/setup.mjs` (and equivalents in the other three absorbed components) still reaches the donor's original commits.
7. Every still-live dev-core followup has a home in `core-server`'s registry, with `AhMK`, `g23a`, `bTGn`, `X7IU`, `ZkAv`, `2Zug`, and `Jbaz` present by name and any deliberate drop named as such.

## Purpose and scope

Absorb `@sdlcforge/dev-core` into `@sdlcforge/core-server` as four additional in-tree plugin components, taking this package from three built-in components to **seven**, and retire the package boundary between them.

This is `core-server`'s half of the federated `sdlc-core-unification` plan-group of the SDLCForge Platform Modernization wave plan (wave "Unified CLI and MCP Binaries"). `core-server` is the absorption target and the lead project; `@sdlcforge/dev-core` is the donor, planned separately, and its own plan consists only of source-package retirement steps that **depend on this plan landing and being verified first**.

The 2026-09-05 architecture analysis found the `core-server`/`dev-core` split is not a real architectural boundary. Both are plain `{ handlers, setup }` plugin modules registered into the same generic framework, `@liquid-labs/plugable-express`, and their runtime coupling is already cyclic across the package boundary: `core-server`'s `controls` requires `dev-core`'s `orgs`, and `dev-core`'s `projects` requires `core-server`'s `credentials`. That cycle is what forces the permanently-allowlisted plugin-graph gate failure this plan removes.

### What must change

- `dev-core`'s four submodules (`projects`, `orgs`, `work`, `projects-audit`) become in-tree components at `src/{projects,orgs,work,projects-audit}/`, absorbed through the git-history-preserving merge recipe in [`dev-core`'s consolidation contract](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md).
- `src/lib/builtin-plugins.mjs` aggregates seven components instead of three, in the DAG order recorded in [`component-order-and-manifest-mechanics.md`](./notes/component-order-and-manifest-mechanics.md), preserving `dev-core`'s composite setup ordering (`projects` → `orgs` → `work`; `projects-audit` has no `setup`) rather than flattening it.
- `package.json`'s `plugable.host.builtins[0].components` declares all seven in that same order, replacing the current three-entry list; `@sdlcforge/dev-core` leaves both `explicitPlugins` and `dependencies`.
- `dev-core`'s runtime dependencies are unioned into `package.json` (22 + 23 names → **32** after dropping `@sdlcforge/dev-core`) and the lockfile is regenerated with **Bun** (`rm -f bun.lock && bun install`), per this project's own documented procedure — never npm.
- `src/lib/test/plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` array is **deleted outright**, along with the logic that consumes it, and the gate asserts `outcome === 'ok'` with `counts.error === 0`.
- dev-core's ~22 open followups are **re-filed into `core-server`'s registry**, not dropped: at least seven describe live defects in code this merge absorbs.
- `src/controls/handlers/orgs/controls/list-implied.mjs`'s call into a since-renamed `@liquid-labs/npm-toolkit` export is fixed — a pre-existing break, fixed here because this plan's dependency work is what would first surface it.
- A new ESLint rule (`import/no-restricted-paths`, seven zones, in a root `.eslintrc.cjs`) forbids cross-component imports across all seven `src/<component>/` directories, formalizing the "coupling stays `app.ext`-only" contract both existing manifests already declare.
- This project's own docs describe the merged seven-component builtin set and the removal of `@sdlcforge/dev-core` as a separate npm plugin dependency.

### What must not change

- **Route count stays 165.** No endpoint is added, removed, or has its `path`, `method`, `matcher`, `help`, or `parameters` altered. `npmName` provenance and route *ordering* do change, and are declared as accepted diffs.
- **`golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical** for the whole life of this plan. Both are captured with `skipCorePlugins: true`, which suppresses the entire builtin tier; any movement in either is a regression, not an accepted change.
- **`app.ext` key names are frozen** — `_liqProjects`, `_liqOrgs`, `constants.WORK_DB_PATH`, `setupMethods`, `credentialsDB`. The consolidation contract's freeze applies unchanged.
- **Setup-method names and their `deps` strings are unchanged.** `@liquid-labs/dependency-runner` matches by exact string.
- **`@liquid-labs/plugable-express` is not absorbed.** It stays the one real package boundary above the merged package, and receives no change from this plan.
- **The third-party `sdlc-projects-*` workflow/badges plugins are not absorbed.** They stay real package boundaries below the merged package and remain explicit npm-dependency plugins.
- **No `@sdlcforge/core-server` → `@sdlcforge/sdlc-core` rename** is performed. [Settled](./notes/sdlc-core-rename-scope.md): the merge lands under `core-server`'s existing package identity, and a future rename is its own separately-scoped plan-group. The wave manifest's plan-group description naming `@sdlcforge/sdlc-core` is aspirational framing from wave-authoring time, not this plan-group's scope.
- **No release step.** [Settled](./notes/release-and-publish-scope.md): no version bump and no `npm publish` attempt for `@sdlcforge/core-server` in this plan-group. The deliverable is the locally/yalc-consumed merge. `core-server`'s last publish attempt already hit the registry-auth block recorded in followup `1aTE`, and nothing here clears it.
- **The `@liquid-labs/plugable-express` yalc link stays.** `grep -n 'file:' package.json` must end at **exactly one** hit, never zero — the contract's literal "returns nothing" gate does not apply to this repository.

### Success criteria

1. `make build`, `make test`, and `make lint` are green, with lint showing no *new* findings beyond the ~233 pre-existing ones recorded in followups `b3hk`/`mLm3`.
2. The full-tier API spec still reports 165 routes, with 118 attributed to `@sdlcforge/core-server` (its own 6 plus dev-core's 112) and the plugins list down to 5 entries.
3. `validatePluginSet()` against the real package root returns `outcome: 'ok'`, `exitCode: 0`, `counts.error === 0`, with `ALLOWLISTED_ERROR_FINDINGS` **deleted** rather than emptied. The full expected finding set is 1 `info` (`appExt:_liqOrgs.orgSetupMethods`, optional) plus 4 `debug` `unmanifested-node` findings for the untouched `sdlc-projects-*` plugins — [measured, not projected](./notes/merged-manifest-graph-projection.md#full-post-merge-finding-set-all-severities). If a finding genuinely survives, only that one is allowlisted with a fresh justification and the outcome is reported explicitly rather than absorbed silently.
4. `grep -n 'file:' package.json` shows exactly one surviving entry (`@liquid-labs/plugable-express`); `@sdlcforge/dev-core` appears nowhere in `package.json`, `src/`, or `bun.lock`.
5. Cross-component imports between any two of the seven `src/<component>/` directories fail lint, with `make lint`'s finding count unchanged at the standing 233.
6. `git log --follow src/projects/setup.mjs` (and equivalents in the other three absorbed components) still reaches the donor's original commits.
7. Every still-live dev-core followup has a home in `core-server`'s registry, with `AhMK`, `g23a`, `bTGn`, `X7IU`, `ZkAv`, `2Zug`, and `Jbaz` present by name and any deliberate drop named as such.

## Current status

All four research items and both user decisions are **resolved**; their findings are recorded in [`plan/notes/`](./notes/) and folded into the phase summaries in [`plan/phases/`](./phases/). Nothing is outstanding that blocks task decomposition.

Six phases are registered in `plan/TODO.yaml` with zero tasks: the five implementation phases plus **Phase 6, Documentation Updates**, added because this plan reshapes a component boundary, introduces four subsystems into an existing package, and moves route provenance. Per-phase task breakdown is the next step and belongs to `phase-decomposition`, not to this document.

No implementation work has started. The first phase to execute is **Phase 1, Pre-Merge Baseline And Drift Clearance** — which must run before any merge is attempted, since it is what separates the pre-existing drift (both the yalc snapshot and the `npm-toolkit` break) from anything the merge itself introduces.

Two preconditions hold at plan creation time and were verified directly:

- `@sdlcforge/dev-core`'s `main` branch already carries the tree at `src/{projects,orgs,work,projects-audit}/…`, so the recipe's donor-side relocation step is unnecessary and the merge sources from `main` rather than a plan branch.
- The installed `node_modules/@sdlcforge/dev-core` snapshot is stale relative to that `main` (missing `optional: true` on `appExt:_liqOrgs.orgSetupMethods`), exactly as dev-core's followup `x6x1` records.

A third precondition surfaced during research and is **not** a merge consequence: `src/controls/handlers/orgs/controls/list-implied.mjs` calls `getPackageOrgAndBasename`, an `@liquid-labs/npm-toolkit` export renamed away in `1.0.0-alpha.17` while the installed and locked version is `1.0.0-alpha.21`. This is broken on `main` today. Phase 1 fixes it first, because this plan's dependency refresh is what would otherwise first surface it as a live crash and appear to have caused it.

Dependencies are **not installed** in the plan worktree; any phase needing a live `node_modules` provisions it first via `scripts/provision-local-deps.sh`.

## Overview

Five implementation phases plus a documentation phase, strictly sequential except where noted. Each leaves the repository building, testing, and serving.

### Phase 1 — Pre-Merge Baseline And Drift Clearance

Fix the pre-existing `npm-toolkit` rename break, clear the yalc drift so it is provably pre-existing, then capture a re-runnable baseline of everything the merge could move: the 165-route spec and its `npmName` tally, the plugins/integrations lists, the setup-method name/`deps` graph, the `app.ext` key set, the registered path-variable set, and the current plugin-graph finding set. Author this merge's own parity contract — the enumerated list of every observable expected to change, with its reason — modelled on the predecessor plan-group's [`absorption-parity-contract.md`](./resources/absorption-parity-contract.md). Also capture the pre-merge blob identity of every root-level path: git's conflict list is not the review list, and the recorded map is what makes Phase 2's verification a comparison rather than a recollection.

One two-line source fix (`list-implied.mjs`) and no other source change. Leaves the system as found, plus a refreshed dependency snapshot and a written contract.

### Phase 2 — Absorb Dev-Core

The merge itself: `git remote add dev-core-source`, `git fetch`, confirm the fetched tree's shape, `git merge --allow-unrelated-histories dev-core-source/main`. The arrival map is measured rather than projected — **13** `add/add` conflicts, **1** silent identical merge (`plan/manifest.yaml`, a no-op), **169** clean arrivals of which 10 need a decision and 159 are the absorbed component tree. Resolve all 13 conflicts `--ours`, but carry forward the substance of the four that `--ours` would silently discard (`package.json`, `plan/followups.yaml`, `README.md`, `docs/architecture.md`). `git rm` the eight clean arrivals with no `core-server` counterpart; the `plan/` removal is exactly two `plan-summary-*.md` files and **never** `plan/followups.yaml`, `plan/manifest.yaml`, or a blanket `plan/` sweep, since `core-server`'s own `main` tracks 14 `plan/` paths. Re-file dev-core's still-live followups. Union the dependencies, regenerate `bun.lock` as its own reviewed step, and confirm `file:` is down to the one pre-existing `plugable-express` link plus `dev-core`, which Phase 3 removes.

Leaves the merged source in tree but **not yet wired**: `builtin-plugins.mjs` still aggregates three components and `@sdlcforge/dev-core` is still an explicit plugin, so the server's behavior is unchanged and the absorbed code is inert. This is deliberate — it makes the merge independently reviewable and revertible before any behavior moves. Note that 20 absorbed test suites start executing under Jest the moment the merge lands, on top of `core-server`'s current 17.

### Phase 3 — Wire And Declare Seven Components

Wire all seven components into `src/lib/builtin-plugins.mjs` in DAG order using extensionless directory imports, preserving the composite setup ordering. Declare the same seven, in the same order, under `package.json`'s `plugable.host.builtins[0].components`, translating dev-core's plugin-manifest component bodies into host-builtin form. Drop `@sdlcforge/dev-core` from `explicitPlugins` (both `app-init.mjs` and the manifest) and from `dependencies`. Close the order-agreement gap documented in [`component-order-and-manifest-mechanics.md`](./notes/component-order-and-manifest-mechanics.md#the-drift-guard-does-not-check-what-the-comment-claims-it-checks) with a real Jest assertion, correct `builtin-plugins.mjs`'s now-false "add to the end rather than reordering" comment, and port the dropped donor `index.test.mjs`'s assertions into the existing `src/lib/test/builtin-plugins.test.js`.

The seven-component manifest is [no longer a projection](./notes/merged-manifest-graph-projection.md): it was built and run through the real `validatePluginSet()`, returning `outcome: 'ok'` with zero errors. Two hazards make that result look wrong when it is not — leaving `@sdlcforge/dev-core` in `explicitPlugins` (21 errors), and transcribing the four component bodies from the stale `node_modules` copy rather than dev-core's source tree (1 error). Both are named in the phase doc.

This is the phase where behavior actually moves. It must land atomically with the `explicitPlugins` removal: loading a component both in-tree and via npm is a hard startup crash for anything registering a route or path variable, and a *silent* double-registration for `projects-audit`, which registers neither at setup.

### Phase 4 — Verify Parity And Tighten The Gate

Check the merged server against Phase 1's parity contract item by item, rebaseline `full-tier-*` snapshots, and confirm `golden-*` snapshots did not move. **Delete** `ALLOWLISTED_ERROR_FINDINGS` and its filtering logic and assert `outcome === 'ok'` with `counts.error === 0`, against the concretely predicted five-finding set (1 `info`, 4 `debug`); if a finding genuinely survives, keep exactly that one with a fresh justification and report which. Update the plugin-graph tests that assert against now-nonexistent `@sdlcforge/dev-core#…` node IDs.

### Phase 5 — Component Boundary Hardening

Add a root `.eslintrc.cjs` carrying `import/no-restricted-paths` with seven zones — one per component — forbidding imports across the seven `src/<component>/` directories while leaving `src/lib/builtin-plugins.mjs`'s aggregation imports permitted *structurally*, and add a Jest guard so the rule cannot go silently inert. This phase is markedly smaller than first scoped: the [research](./notes/eslint-component-boundary-rule.md) ran the rule against a real assembled post-merge tree and found **zero** pre-existing violations and **zero** new findings, and `--config` composes additively in eslintrc mode, so there is no remediation work and **no build-wiring work at all**. Parallel-eligible with Phase 4 — it touches lint configuration and a new test, not snapshots or the graph gate — but is listed after it so a failing gate is diagnosed before new lint changes land on top of it.

### Phase 6 — Documentation Updates

`README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`, and `docs/core-server-spec.md` are brought in line with the merged seven-component builtin set and the removal of `@sdlcforge/dev-core` as a separate npm plugin dependency. This phase also owns the substance Phase 2's `--ours` conflict resolutions deliberately deferred — dev-core's `README.md` route tables, and its `docs/architecture.md` submodule decomposition, composite-`setup` ordering contract, and `app.ext` service contracts — plus the disposition of the two arrivals kept through Phase 2, `docs/consumer-migration.md` and `docs/dev-core-consolidation-contract.md`, the latter of which loses its home when dev-core retires.

### Resolved questions and research

All six items that blocked task decomposition at the prior planning pass are answered. Their findings are folded into the phase summaries; the notes remain the authority for detail.

- **[Merge-arrival inventory](./notes/merge-arrival-inventory.md)** — the merge was actually run in a throwaway clone. It **corrected** this plan's premise about generated build files (they all conflict rather than merging silently — safer than assumed), narrowed the `plan/` `git rm` set to two paths, reclassified `plan/followups.yaml` as a conflict needing re-filing rather than a clean arrival, and settled both donor test suites' dispositions.
- **[Dependency union](./notes/dependency-union.md)** — the six upward version moves are already resolved that way in today's lockfile, so the union is documentation catching up to reality. It also surfaced the pre-existing `npm-toolkit` break and corrected the `file:` verification gate.
- **[Merged-manifest graph projection](./notes/merged-manifest-graph-projection.md)** — the central premise was measured, not argued: the candidate seven-component manifest returns `outcome: 'ok'` with zero errors.
- **[ESLint component-boundary rule](./notes/eslint-component-boundary-rule.md)** — the rule was written and run; it is `import/no-restricted-paths`, it lives in a root `.eslintrc.cjs`, it needs no makefile change, and neither component set violates it today.
- **[The `@sdlcforge/sdlc-core` rename](./notes/sdlc-core-rename-scope.md)** — out of scope; a future separately-scoped plan-group.
- **[Release and publish scope](./notes/release-and-publish-scope.md)** — no version bump, no publish attempt.

### Risk notes

Three items shape this plan's risk profile more than the merge mechanics do:

- **Dropping dev-core's followups is a silent loss.** `plan/followups.yaml` conflicts, and the mechanically obvious `--ours` resolution discards 22 live items — at least seven of them defects in code this merge takes ownership of, including command injection in the `work` and `projects` shell-outs. Re-filing them is a tracked requirement of Phase 2, not a courtesy.
- **A pre-existing break sits directly under this plan's dependency work.** The `npm-toolkit` rename break is live on `main` today and unrelated to the merge, but the lockfile refresh is what would first make it visible. Fixed standalone in Phase 1 so it cannot be misattributed in either direction.
- **Two measured failure modes will look like "the merge did not help."** A forgotten `explicitPlugins` removal (21 errors) and a manifest transcribed from the stale `node_modules` copy (1 error) both produce loud validator failures that read as merge problems. Phases 3 and 4 name both explicitly so a verifying agent diagnoses rather than re-allowlists.

## Related documents

- [`notes/pre-merge-state.md`](./notes/pre-merge-state.md) — the planning-time baseline: route/plugin surface, confirmed yalc drift, dev-core's arriving tree, dependency shape. Two of its claims are superseded and corrected at the head of the note.
- [`notes/component-order-and-manifest-mechanics.md`](./notes/component-order-and-manifest-mechanics.md) — the seven-component DAG order, what it changes, and the drift-guard gap it exposes.
- [`notes/merge-arrival-inventory.md`](./notes/merge-arrival-inventory.md) — the measured per-path arrival map for Phase 2.
- [`notes/dependency-union.md`](./notes/dependency-union.md) — the 32-row resolved union and the pre-existing `npm-toolkit` break.
- [`notes/merged-manifest-graph-projection.md`](./notes/merged-manifest-graph-projection.md) — the measured `validatePluginSet()` result for the merged manifest, and the predicted post-merge finding set.
- [`notes/eslint-component-boundary-rule.md`](./notes/eslint-component-boundary-rule.md) — the boundary rule, its wiring, and both clean sweeps.
- [`notes/sdlc-core-rename-scope.md`](./notes/sdlc-core-rename-scope.md) and [`notes/release-and-publish-scope.md`](./notes/release-and-publish-scope.md) — the two settled scope decisions.
- [`resources/absorption-parity-contract.md`](./resources/absorption-parity-contract.md) — the predecessor plan-group's parity contract, the model for Phase 1's.
- [`resources/absorption-dependency-union.md`](./resources/absorption-dependency-union.md) — the predecessor plan-group's dependency-union document, the model for this plan's.
- [`waves/sdlcforge-modernization/manifest.yaml`](./waves/sdlcforge-modernization/manifest.yaml) — the wave plan this plan-group belongs to.

## What shipped

### Phase 01 — Pre-Merge Baseline And Drift Clearance

1. **Fix Npm-Toolkit Rename Break** (`001-fix-npm-toolkit-rename-break.md`, tier `sonnet-med`) — Fixed pre-existing break: list-implied.mjs now imports/awaits getPackageOrgBasenameAndVersion instead of removed getPackageOrgAndBasename. Verified via direct node script and new Jest test. Lint/tests green, no new findings, commit touches only source + new test file.
   Commit `f7f5b79`, merged at `e5c11f4`.

2. **Refresh Dev-Core Snapshot And Clear Yalc Drift** (`002-refresh-dev-core-snapshot-and-clear-yalc-drift.md`, tier `sonnet-med`) — Re-refreshed the worktree's yalc snapshot against dev-core's now-corrected main (after removing the worktree's own stale .yalc/), confirmed via direct validatePluginSet() inspection that the orgSetupMethods finding downgraded from error to info, then trimmed plugin-graph-gate.test.js's allowlist from two entries to one. The same refresh pulled in two unrelated sibling dev-core fixes that broke and required regenerating the full-tier-baseline.test.js golden snapshot via its own official opt-in regen path -- confined to exactly those two route matchers and one help-text pair. bun.lock needed no new commit (unchanged from 71fccaf). Full test suite (18/18) and lint (236 pre-existing, unchanged) confirmed clean.
   Commit `dca4ec5`, merged at `f40a459`.

3. **Capture Pre-Merge Observable Baseline** (`003-capture-pre-merge-observable-baseline.md`, tier `sonnet-med`) — Captured the post-tasks-001/002 pre-merge observable baseline into plan/resources/dev-core-absorption-pre-merge-baseline.md: setup-method/app.ext restatements, a route-derived 9-entry path-variable set with two source cross-checks plus one explicitly-flagged derivation gap (newProjectName), the full 6-finding validatePluginSet() result (1 error matching current allowlist, 1 info, 4 debug), and a verbatim sole-dependent grep with false-positive annotation. No observable moved as a result of tasks 001/002.
   Commit `9a811f6`, merged at `9d44718`.

4. **Author Dev-Core Absorption Parity Contract** (`004-author-dev-core-absorption-parity-contract.md`, tier `sonnet-high`) — Authored plan/resources/dev-core-absorption-parity-contract.md enumerating all ten required categories of expected diff for the dev-core absorption. All numeric claims independently verified against live repository state. Item 4 (integrations-list re-identification) confirmed as a non-event after directly inspecting dev-core source -- none of the four absorbed submodules registers an integration provider. Task 003's baseline artifact hadn't landed yet, so items 7-8 substituted the predecessor contract's still-valid recorded tables per this task's own assumptions, flagged inline.
   Commit `ede544a`, merged at `957d0a8`.

5. **Record Pre-Merge Root Blob Map** (`005-record-pre-merge-root-blob-map.md`, tier `haiku-med`) — Recorded the pre-merge root blob/tree identities of all 17 root-level tracked paths at commit cbd19fd820183e3ef7b1a98aa7434ef431d2f7d9 in plan/resources/pre-merge-root-blob-map.md. Three critical paths (src/lib/index.js, bun.lock, .catalyst-data.yaml) that dev-core cannot touch are explicitly called out per the merge-arrival-inventory document. All validation checks passed; task makes no source, test, or dependency changes.
   Commit `55e5151`, merged at `688a262`.

### Phase 02 — Absorb Dev-Core

1. **Execute Absorption Merge** (`001-execute-absorption-merge.md`, tier `opus-med`) — Executed the one-way git merge --allow-unrelated-histories of dev-core-source/main (914f951) into core-server on plan/sdlc-core-unification-02-001, landing as merge commit de663a7 with both parents intact and donor history reachable under all four absorbed trees. The corrected task document matched live reality exactly on retry: git produced precisely the 14 add/add conflicts it now predicts (including plan/manifest.yaml), and every subsequent measured count matched without divergence. All 14 conflicts resolved --ours with staged blobs verified byte-equal to HEAD blobs. Nothing wired, no build/test/lint run, per task scope.
   Commit `de663a7`, merged at `ab7d443`.

2. **Refile Dev-Core Followups** (`002-refile-dev-core-followups.md`, tier `sonnet-high`) — Triaged all 22 dev-core followups against the merged tree: 17 carried across into core-server's registry with new server-generated IDs (including all 7 named star items plus 0RpG resolved to carry, reworded), 5 dropped with recorded reasons (AEsA, 0eWj, IxJv, x6x1, JFTT). Every carried item's code paths were verified to resolve in the merged tree; two task-document defects were found and corrected in the process (a stale path for xehM, an over-length title for dsdl). No pre-existing followup was modified or removed.
   No commit or merge SHA recorded.

3. **Union Runtime Dependencies** (`003-union-runtime-dependencies.md`, tier `sonnet-high`) — Applied the exact 33-entry dependencies union to package.json (verified byte-for-byte), refreshed bun.lock via scripts/provision-local-deps.sh --refresh-lock as its own commit, and wrote plan/resources/dev-core-absorption-dependency-union.md covering the full table, the zero-new-resolved-versions justification, the _npm-check-plus drop decision, the lockfile diff findings, what was deliberately not carried across, the two-entry file: expectation, and the inherited shelljs liability (followup hwbY). All 10 validation checks passed.
   Commit `f7099c2`, merged at `c4b5ab9`.

4. **Verify Merge And Restore Green Build** (`004-verify-merge-and-restore-green-build.md`, tier `sonnet-high`) — Verified the dev-core absorption merge changed source layout and dependency declarations and nothing else observable: all Part 1-4 checks passed exactly as specified. make test needed one in-scope fix (a shared test literal tied to package identity) after which only the documented inherited failure (project-lifecycle.test.mjs) remained red. make lint pre/post-merge counts identical (236/236) -- absorbed source introduces zero new lint findings.
   Commit `c158ba7`, merged at `3bb1c25`.

### Phase 03 — Wire And Declare Seven Components

1. **Wire Seven Components And Retire Dev-Core** (`001-wire-seven-components-and-retire-dev-core.md`, tier `opus-high`) — Wired all seven components in-tree through src/lib/builtin-plugins.mjs in DAG order, exported submodules and componentNames, declared the same seven in package.json, and removed @sdlcforge/dev-core from explicitPlugins (both copies), dependencies, provision-local-deps.sh, and bun.lock as one unit. Neither pre-diagnosed failure mode occurred: validatePluginSet returns exactly the predicted ok/exitCode 0/{error:0,warning:0,info:1}. Running server serves 165 routes, 118 under core-server, zero under dev-core. builtin-plugins.test.js's adapted expectations derived from a measured run. Phase 4's handoff is narrower than predicted (3 suites/snapshots predicted to fail actually pass); project-lifecycle.test.mjs fails for a pre-existing, absorption-inherited reason proven independent of this diff and left unfixed per task scope.
   Commit `a4cd7ab`, merged at `0e83876`.

2. **Assert Component Order Agreement** (`002-assert-component-order-agreement.md`, tier `sonnet-high`) — Added the missing runtime-vs-declared component-order drift guard to host-declaration.test.js as three independent Jest tests (ordered agreement, literal DAG-order pin, non-vacuity/index-alignment). All three mutations performed, confirmed to produce exactly the predicted failure, and fully reverted. No production-file edit needed since task 001 already left the builtin-plugins.mjs comment naming this mechanism correctly.
   Commit `7966e1a`, merged at `6ad758c`.

3. **Port Donor Aggregate Assertions** (`003-port-donor-aggregate-assertions.md`, tier `sonnet-high`) — Ported the five categories of donor aggregate assertions (handler-array identity freshness, no-duplicate-(method,path), the four projects-audit routes, projects-audit's absent setup, app.ext contract-freeze checks) into the existing builtin-plugins.test.js, plus a comment recording the registered path-var sequence pins runtime order. All new assertions proved non-vacuous by mutation. No production code changes; make test and make lint both clean relative to baseline.
   Commit `6dc5bad`, merged at `2faac43`.

### Phase 04 — Verify Parity And Tighten Gate

1. **Measure Post-Merge Plugin Graph** (`001-measure-post-merge-plugin-graph.md`, tier `sonnet-high`) — Prediction matched cleanly on every observable. Both hazards checked and found absent: explicitPlugins carries exactly the four sdlc-projects-* packages with no live dev-core declaration anywhere, and all four dev-core-sourced component bodies are byte-identical to dev-core's main-HEAD source including orgs' three source-only markers. validatePluginSet() returned outcome:'ok', exitCode:0, counts{error:0,warning:0,info:1}, exactly 5 findings matching prediction verbatim, 12 resolved nodes with seven builtins at contiguous loadIndex 0-6 in correct DAG order, 42 edges, coverage fields exact. No source file touched.
   No commit or merge SHA recorded.

2. **Rebaseline Full-Tier Snapshots** (`002-rebaseline-full-tier-snapshots.md`, tier `sonnet-high`) — Ran the scripted rebaseline and mechanically justified every line of the diff against the parity contract: route count held at 165, npmName-stripped/sorted identity diff empty (no route path/method/matcher/help/parameters moved), route block order traced exactly to predicted DAG order. full-tier-plugins-list.json dropped 6->5 as predicted. full-tier-integrations-list.json and both golden-* snapshots confirmed byte-identical to Phase 1's pre-merge blobs. None of the halt-and-report regression triggers fired. Only the two snapshot files changed -- the one comment-fix requirement had already landed in an earlier commit.
   Commit `deef90e`, merged at `99c04f7`.

3. **Delete Error Allowlist And Tighten Gate** (`003-delete-error-allowlist-and-tighten-gate.md`, tier `sonnet-high`) — Deleted ALLOWLISTED_ERROR_FINDINGS/isAllowlisted outright and replaced the two validation-failure/exitCode:1 assertions with unconditional outcome==='ok', exitCode===0, and explicit counts/full-finding-set assertions matching task 001's measured record exactly. Repointed the two chartered edges onto their core-server successors while preserving orderVerdict===null/providerPhase==='framework' for the cross-phase edge. Extended non-trivial-graph test to all seven components. No error findings survived. All 4 tests pass, exactly one file changed.
   Commit `bad6451`, merged at `00a4200`.

4. **Repoint Sibling Plugin-Graph Tests** (`004-repoint-sibling-plugin-graph-tests.md`, tier `sonnet-med`) — Repointed the two dev-core-referencing sibling plugin-graph test files onto their in-tree core-server successor node IDs and rewrote the stale third-party framing. Third file verified unchanged and correct. Also self-fixed a pre-existing beforeAll no-undef lint error in the two touched files. Diff scoped to exactly the two owned files.
   Commit `0b58a51`, merged at `9cc477a`.

5. **Verify Parity Contract And Green Run** (`005-verify-parity-contract-and-green-run.md`, tier `opus-med`) — Every parity-contract item held, verified end-to-end against a live running server: 165 routes/118 core-server/0 dev-core, plugins list 5 entries, integrations-list confirmed non-event, plugin-details resolves correctly for both packages, golden snapshots byte-identical at every checkpoint across the whole plan, all negative-space observables unchanged, all five inherited defects (uROI/b3hk/mLm3/NEJt/N7cz) confirmed still present and unrepaired. make test is green apart from N7cz (a fifth genuinely pre-existing inherited defect the task document's original enumeration omitted, now corrected and independently confirmed absorption-unrelated three times). make lint introduces zero new findings (net -2). No source file was changed; nothing was fixed, everything was recorded per the task's own verify-not-fix mandate. Full record at plan/resources/dev-core-absorption-parity-verification.md.
   Commit `9cc477a`.

### Phase 05 — Component Boundary Hardening

1. **Add Component Boundary Eslint Config** (`001-add-component-boundary-eslint-config.md`, tier `sonnet-med`) — Added .eslintrc.cjs at the repo root verbatim per the research note's verified file, applying both open scope decisions per their stated defaults. Confirmed zero new lint findings, confirmed the rule fires on a planted cross-component import and clears on revert, confirmed src/lib structural exemption holds, confirmed the config lints clean under the Catalyst config directly.
   Commit `5cc9c64`, merged at `506f959`.

2. **Add Component Boundary Drift Guard Test** (`002-add-component-boundary-drift-guard-test.md`, tier `sonnet-med`) — Added src/lib/test/component-boundary.test.js with the two required assertions: an ESLint Node API liveness probe confirming import/no-restricted-paths still fires through the real .eslintrc.cjs cascade, and a drift assertion comparing COMPONENT_DIRS against the actual src/ directory set. The preferred export approach required Object.defineProperty with enumerable:false to stay invisible to ESLint's own config validation while remaining readable via require() in the test. All four validation steps passed with no regressions; the one pre-existing failing suite (project-lifecycle.test.js) confirmed unrelated via git stash.
   Commit `d1ff6db`, merged at `655b308`.

### Phase 06 — Documentation Updates

1. **Update Architecture Docs** (`001-update-architecture-docs.md`, tier `sonnet-high`) — Brought docs/architecture.md, docs/core-server-spec.md, docs/architecture/plugin-loading-tiers.md, and docs/project-structure.md in line with the seven-component in-tree builtin set, folding in dev-core's own submodule-decomposition/composite-setup-ordering/app.ext-contract substance and documenting the new mechanically-enforced component-boundary invariant. Also resolved three standing documentation followups encountered in scope. Removed the two dev-core-specific docs as deliberate dispositions -- both now describe a package that no longer exists separately. make lint confirmed byte-identical before and after.
   Commit `db29166`, merged at `fa7b33c`.

2. **Update Project Onboarding Docs** (`002-update-project-onboarding-docs.md`, tier `sonnet-med`) — Updated README.md, AGENTS.md, CLAUDE.md to describe the seven-component built-in aggregate in DAG order and the four-package explicit-plugin tier, replacing every stale three-component/dev-core-as-dependency statement. Authored a new README.md Built-in components section folding in dev-core's per-submodule route tables as compact summaries, and documented the new component-boundary ESLint rule and its Jest drift guard. No source files touched, make lint unaffected by construction.
   Commit `7f122b1`, merged at `a607324`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`M3sG`** — **The main checkout's .yalc/@sdlcforge/dev-core** — The main checkout's .yalc/@sdlcforge/dev-core snapshot needs a fresh yalc push from /Users/zane/playground/sdlcforge/dev-core's current main before this task can be re-attempted successfully — outside any task worktree's boundary, needs to happen in/via the main checkout.

- **`RxGk`** — **This task's Assumptions section (.yalc/@sdlcf** — This task's Assumptions section (.yalc/@sdlcforge/dev-core already reflects dev-core main HEAD) is now factually false and should be corrected before re-dispatch.

- **`bsRs`** — **Manager judgment needed: proceed with only wo** — Manager judgment needed: proceed with only worktree-local refresh (drift stays uncleared) vs also refresh main checkout's .yalc snapshot first (out of this task's stated scope, touches files outside the worktree).

- **`qRrl`** — **Prior halted attempt's commit 71fccaf's messa** — Prior halted attempt's commit 71fccaf's message says drift is NOT cleared -- now stale since drift IS cleared as of commit dca4ec5; not rewritten per git-history norms, current task doc Status section has the up-to-date narrative.

- **`TEO9`** — **provision-local-deps.sh's leave-.yalc-as-is-i** — provision-local-deps.sh's leave-.yalc-as-is-if-present behavior means a worktree with an already-stale .yalc copy will silently keep it on a bare --refresh-lock rerun unless .yalc is removed first -- informational, could affect a future retry in this repo if not recognized.

- **`UlYf`** — **STALE PLAN DOC (not edited, manager-owned): p** — STALE PLAN DOC (not edited, manager-owned): plan/notes/merge-arrival-inventory.md still records 13 conflicts and classifies plan/manifest.yaml as a silent identical merge needing no handling -- now contradicts the corrected task doc and the merge that actually ran. Suggest the same 5d5c2a3->914f951 correction header.

- **`mWgu`** — **Cosmetic, already in permanent history: commi** — Cosmetic, already in permanent history: commit message says 20 absorbed suites land 'on top of core-server's existing 17' but measured at the actual merge base 08e5ee1 the pre-existing count is 18 (Phase 1 added a suite). Task 004 should expect 38 suites total, not 37.

- **`2qB6`** — **Carried-forward obligations now live and unow** — Carried-forward obligations now live and unowned in-tree until their tasks run: package.json's 32-name dependency union (task 003), 22 dev-core followups dropped by --ours resolution of plan/followups.yaml (task 002), README.md + docs/architecture.md donor content (Phase 6), src/test/index.test.mjs's assertions (Phase 3).

- **`1o1M`** — **make/55-test.mk resolved --ours drops dev-cor** — make/55-test.mk resolved --ours drops dev-core's Babel --ignore flags for test-data fixture trees now in-tree; task 004's check per the doc.

- **`li0t`** — **Command injection risk in work shell-outs** — Automated security review flagged 7 pre-existing command-injection-capable patterns in code migrated verbatim from liq-work: src/work/handlers/_lib/save-lib.mjs (git commit -m built via tryExec, partial escaping via replaceAll but not fully safe), src/work/handlers/_lib/work-db.mjs (git remote add with ghUser/projectBasename interpolation), src/work/handlers/resume.mjs (git checkout ${workKey}), src/work/handlers/issues/_lib/list-lib.mjs (open with ghOrg/project/number interpolation), src/work/handlers/_lib/submit-lib.mjs (open ${url} unquoted), src/work/handlers/_lib/pause-lib.mjs (git checkout ${main}), src/work/handlers/projects/_lib/list-lib.mjs (open with projectFQN interpolation). Confirmed via git log that these files' shell-out patterns predate the liq-work absorption (liq-work commits well before the absorption). Not introduced during absorption; now first-party @sdlcforge/core-server code rather than a vendored dependency. Same class of issue as the companion command-injection followup covering the projects shell-outs. Suggested remediation when next touched: replace shell-string interpolation with execFile/spawn argv-array invocation, and validate interpolated values (branch names, org/project names, URLs, issue numbers) against strict allowlist regexes before use.

  Originally filed against @sdlcforge/dev-core as followup AhMK; carried across when that package was absorbed into @sdlcforge/core-server.

- **`5F7r`** — **Command injection risk in projects shell-outs** — Automated security review flagged 4 pre-existing command-injection-capable patterns in code migrated verbatim from liq-projects: src/projects/handlers/_lib/create-lib.mjs (shell.exec building a `hub create` command from newProjectName/githubOwner/orgKey), src/projects/handlers/_lib/rename-lib.mjs (shell.exec building `git remote set-url` from newName/projectPath), src/projects/handlers/releases/_lib/do-npm-publish.mjs (tryExec building `npm publish` with an OTP/tag), and src/projects/handlers/releases/_lib/publish-lib.mjs (tryExec building `git checkout -b` from a release-branch name). Confirmed via git log that these patterns predate the liq-projects absorption (commits 841f543/69de4e7/bacc1f0 in liq-projects, well before the absorption) — the migration carried them across with zero content-line changes, i.e. no new behavior was introduced. Not introduced during absorption; now first-party @sdlcforge/core-server code rather than a vendored dependency. Suggested remediation when next touched: replace shell-string interpolation with execFile/spawn argv-array invocation, and validate the interpolated values (project names, branch names, OTP) against strict allowlist regexes before use.

  Originally filed against @sdlcforge/dev-core as followup g23a; carried across when that package was absorbed into @sdlcforge/core-server.

- **`CUZK`** — **Fix inherited projects-audit defects** — Four pre-existing defects inherited as-is (no behavior change during the projects-audit absorption) from @liquid-labs/plugable-projects-audit into @sdlcforge/core-server's src/projects-audit/ submodule: (1) the two implied endpoints advertise a projectName parameter they cannot use — getAuditEndpointParameters/getAuditFixEndpointParameters spread commonAuditPathParameters for both the named and implied variants, but the implied paths carry no :projectName; the project comes from the X-CWD header instead. (2) A typo drops one parameter's help text from the API spec: audit-fix-lib.mjs's removePackages parameter object spells its key "dascription" rather than "description". (3) An unknown project name yields a 500, not a 404 — both libs immediately destructure the result of getProjectData(projectName), which returns undefined for an unknown name, so the destructuring throws a TypeError. (4) Four prose typos are published in user-facing help text: "Auidts" (audit-lib.mjs's summary), and "reomved", "pacagkes", "specificatinos" (audit-fix-lib.mjs's description/parameter help), plus a double space in "${workDesc} project  security". A fifth, purely internal item: all four handlers assign reporter = reporter.isolate() and never read it — dead code, no user-visible effect. Fixing (1) or (2) changes the generated API spec, which is why these were left unfixed during absorption.

  Originally filed against @sdlcforge/dev-core as followup bTGn; carried across when that package was absorbed into @sdlcforge/core-server.

- **`bL7q`** — **parameters-set setUndefined/setNull error** — PUT /orgs/:orgKey/parameters/:parameterKey/set (src/orgs/handlers/parameters-set.mjs) exposes setUndefined and setNull parameters whose value ladder produces parsedValue === undefined or parsedValue === null respectively. updateSetting's checkValue (src/orgs/resources/lib/settings.mjs) only whitelists boolean/number/string and arrays of those, so both fall through the whitelist and checkValue throws — the documented setUndefined and setNull parameters always error instead of storing the value their own parameter description promises. Pre-existing contradiction between the endpoint's declared parameters and the settings library's storage constraints; deliberately left unfixed while the lookup/persistence path itself was repaired.

  Originally filed against @sdlcforge/dev-core as followup X7IU; carried across when that package was absorbed into @sdlcforge/core-server.

- **`AdFn`** — **orgs create.mjs creates directory only** — POST /orgs/create/:newOrgKey (src/orgs/handlers/create.mjs) creates only the org's data directory (fs.mkdir under &lt;localDataRoot&gt;/org); it writes no org.json or settings.yaml, constructs no Organization, and registers nothing into app.ext._liqOrgs.orgs, which is populated only by the "load orgs" setup method (src/orgs/setup.mjs) scanning the playground for a package.json carrying liq.packageType === 'org'. The endpoint's localDataRoot parameter's own description still reads "The local directory in which to save ./orgs/org.json...", which the handler never does — left inaccurate because the parameter list itself was treated as unchanged when help.description/help.summary were separately corrected to describe current behavior. A follow-on task should either complete org creation (write org.json/settings.yaml, construct an Organization, register it into the runtime registry) or correct the localDataRoot parameter description to match what the handler actually does.

  Originally filed against @sdlcforge/dev-core as followup ZkAv; carried across when that package was absorbed into @sdlcforge/core-server.

- **`rI6P`** — **orgs list.mjs mdFormatter field mismatch** — src/orgs/handlers/list.mjs's mdFormatter renders `* ${o.name}` while the handler's defaultFields is ['key', 'commonName', 'legalName'], and the JSON/terminal/text formatters for the same endpoint all render commonName/key. The Markdown rendering disagrees with every other format for the same endpoint. Low severity: name is still a defined Organization property so the output is not broken, only inconsistent across formats.

  Originally filed against @sdlcforge/dev-core as followup 2Zug; carried across when that package was absorbed into @sdlcforge/core-server.

- **`RuIZ`** — **parameters-list.mjs mdFormatter arg shape** — src/orgs/handlers/parameters-list.mjs's mdFormatter/terminalFormatter/textFormatter use positional args (parameters, title) but formatOutput invokes non-JSON formatters with a single {data, title, fields} object — the same category of pre-existing inconsistency as src/orgs/handlers/list.mjs's analogous mdFormatter (see the sibling list.mjs mdFormatter field-mismatch followup). Left untouched (JSON-path-only test coverage exercised it) but is a real bug if parameters-list is ever requested with format=md/txt/terminal.

  Originally filed against @sdlcforge/dev-core as followup Jbaz; carried across when that package was absorbed into @sdlcforge/core-server.

- **`N7cz`** — **project-lifecycle test pre-existing failure** — src/projects/handlers/_lib/test/project-lifecycle.test.mjs fails independently of credentials/network: its appMock supplies app.ext.serverHome while create-lib.mjs reads app.ext.serverConfigRoot (both files byte-identical to the liq-projects donor's blobs). A real pre-existing donor defect, not a regression from absorption. Keeps make test/make qa red in @sdlcforge/core-server until fixed; a future full-test-suite run should not expect a fully-green make qa because of this one suite. Also note: src/projects/handlers/test/close-implied.mjs is a misnamed test file (missing the .test infix) that Jest never collects — dead in both directions, migrated verbatim from liq-projects.

  Originally filed against @sdlcforge/dev-core as followup 2aMD; carried across when that package was absorbed into @sdlcforge/core-server.

- **`L5cp`** — **providerFor typo breaks pull-request hook** — src/work/handlers/_lib/answer-set-to-md.mjs:74 calls app.ext.integrations with providerFor: 'pull requests' (plural), while every other call site in the codebase uses the singular 'pull request'. IntegrationsManager.callHook/hasHook match on exact providerFor string, so this mismatched entry throws "No provider found" at request time instead of resolving the registered provider — a live, reachable defect, not merely cosmetic. Independent corroboration: @liquid-labs/plugable-express's own diff-manifest.js header cites this exact typo as its motivating example for why manifest-derivation tooling matters. Fix: change 'pull requests' to 'pull request' at that call site, plus a regression test asserting the hook resolves.

  Originally filed against @sdlcforge/dev-core as followup OmUC; carried across when that package was absorbed into @sdlcforge/core-server.

- **`8UB8`** — **resource-model Model.save() always rejects** — @liquid-labs/resource-model's Model.save() (src/Model.mjs:74-80, identical in the installed dist/) destructures errors off an un-awaited async validate() call, so errors.length throws and every save() call on a Model subclass rejects unconditionally. @sdlcforge/core-server's src/orgs/resources/organization.mjs works around this with its own async save() override that writes #settings directly rather than delegating to the base implementation; the upstream package itself is unfixed and remains broken for any other Model subclass, in this or any other consumer, that relies on the base save() without its own override.

  Originally filed against @sdlcforge/dev-core as followup Ymcf; carried across when that package was absorbed into @sdlcforge/core-server.

- **`qYuq`** — **create.mjs response discloses abs path** — POST /orgs/create/:newOrgKey's 2xx response body's directory field (src/orgs/handlers/create.mjs, response construction) echoes back the fully resolved absolute filesystem path (built from fsPath.resolve(localDataRoot)). When the caller supplies a relative localDataRoot, the response discloses the server's absolute directory layout (e.g. the playground root's absolute parent path) to the caller. Does not by itself enable an attack — the containment check restricts where the directory can actually be created regardless of what is echoed back — but is a minor server-filesystem-layout disclosure. If server filesystem layout is considered sensitive in this deployment context, return a playground-root-relative path instead, or omit the directory field and return only the caller-supplied newOrgKey.

  Originally filed against @sdlcforge/dev-core as followup Hwdp; carried across when that package was absorbed into @sdlcforge/core-server.

- **`l2Ly`** — **octocache/octokit chain high-sev advisory** — The liq-projects absorption's dependency union added @liquid-labs/octocache (^1.0.0-alpha.4, now @sdlcforge/core-server's own runtime dependency), which pins an octokit chain resolving to octokit&lt;=3.1.1. npm audit --package-lock-only confirmed an unpatched high-severity advisory GHSA-pwfr-8pq7-x9qv ("Unauthenticated Denial of Service in the octokit/webhooks library", CVSS 8.2) plus two moderate ReDoS advisories (GHSA-rmvr-2pp2-xj38 in @octokit/request, GHSA-xx4v-prfh-6cgc in @octokit/request-error). Also affects @liquid-labs/github-toolkit, @liquid-labs/credentials-db-plugin-github, and @liquid-labs/liq-credentials-db via the same root cause. Distinct from the separate serialize-javascript/rollup-terser RCE advisory, the sdlc-resource-babel-and-rollup deprecation note, and the command-injection followups covering the projects/work shell-outs — do not conflate. @liquid-labs/octocache does not control its own octokit pin directly; a fix requires a semver-major bump upstream. Reachability of the specific webhook-DoS code path from actual GitHub-integration usage (authenticated API calls, not inbound webhook processing) is unconfirmed and worth checking before prioritizing.

  Originally filed against @sdlcforge/dev-core as followup pWxw; carried across when that package was absorbed into @sdlcforge/core-server.

- **`VgqT`** — **condition-eval Function() eval pattern** — The dependency @liquid-labs/condition-eval (resolving to 1.0.0-alpha.19) evaluates expressions via Function(e(o))() gated by a regex allowlist (numeric literals, true/false, a fixed operator/paren set) — a regex-then-Function() pattern with a history of allowlist-bypass issues in other libraries, though this allowlist looks reasonably tight. It is imported at src/work/handlers/_lib/prepare-questions-from-controls.mjs. Reachability from externally-influenced input (issue title/body, GitHub label, user-supplied work parameter) has not been confirmed. Low confidence, minor severity. When src/work/'s handler source is next reviewed, grep for condition-eval/Evaluator/evalTruth/evalNumber call sites and confirm every expression string is either a fixed developer-authored template or built only from already-validated/typed values, never a raw external string concatenated into the expression shape.

  Originally filed against @sdlcforge/dev-core as followup 7ZF2; carried across when that package was absorbed into @sdlcforge/core-server.

- **`Yi1Y`** — **get-org.mjs comment names retired helper** — src/orgs/handlers/_lib/get-org.mjs's header comment (lines 3-4) names the retired getOrgFromKey helper for exposition ('rather than importing the shared handlers library's getOrgFromKey helper'), even though that helper no longer exists as a shared handlers-library export. Not code-level usage — the comment is documentation, not a live reference. Worth rewording so the comment does not name a retired symbol.

  Originally filed against @sdlcforge/dev-core as followup xehM; carried across when that package was absorbed into @sdlcforge/core-server.

- **`KGVq`** — **consumer-migration.md framing is stale** — docs/consumer-migration.md documents a planned edit path for @sdlcforge/core-server to add @sdlcforge/dev-core as an explicit-plugin dependency and swap out its four standalone donor plugin entries (@liquid-labs/liq-work, @liquid-labs/liq-projects, @liquid-labs/liq-orgs, @liquid-labs/plugable-projects-audit) for it. Its per-section "re-verified as of this writing" claims about core-server's package.json/explicitPlugins state (e.g. lines 55, 191, 262) predate a later core-server-side merge and no longer reflect current state; the document's own underlying premise — that core-server would consume dev-core as an npm plugin dependency — may itself be superseded now that dev-core's source has been absorbed directly into core-server's own src/ tree rather than being consumed as a plugin. Whether this document should be updated, superseded, or removed is expected to be decided in a later documentation-refresh pass, at which point this item may become moot.

  Originally filed against @sdlcforge/dev-core as followup hks9; carried across when that package was absorbed into @sdlcforge/core-server.

- **`HGBd`** — **consolidation-contract.md stale attribution** — docs/dev-core-consolidation-contract.md:128 attributes runtime reads of app.ext._liqProjects/app.ext._liqOrgs to liq-controls (naming src/lib/resources/load-controls.mjs and src/lib/integrations/get-question-controls.mjs) and to liq-integrations-issues-github (src/create-or-update-pull-request.mjs), describing both as external consumers reading the runtime contract from outside. The liq-controls half of that attribution is stale: the named files actually live at @sdlcforge/core-server's own src/controls/resources/load-controls.mjs and src/controls/integrations/get-question-controls.mjs — one of core-server's own built-in plugin submodules, not an external package. Whether this document should be corrected, superseded, or removed is expected to be decided in a later documentation-refresh pass, at which point this item may become moot.

  Originally filed against @sdlcforge/dev-core as followup dsdl; carried across when that package was absorbed into @sdlcforge/core-server.

- **`ZK0S`** — **serialize-javascript RCE via terser pin** — bun.lock resolves serialize-javascript@6.0.2 transitively via @rollup/plugin-terser@0.4.4 (a dependency of @sdlcforge/core-server's own devDependency @liquid-labs/catalyst-resource-babel-and-rollup@1.0.0-alpha.4, declared ^1.0.0-alpha.3 in package.json). serialize-javascript@6.0.2 carries an unpatched high-severity RCE advisory (GHSA-5c6j-r48x-rmvq, CVSS 8.1) plus a moderate DoS advisory (GHSA-qj8w-gfj5-8c6v); audit tooling should report findings rooted here. Dev/CI-only — @rollup/plugin-terser and its serialize-javascript dependency are never bundled into dist/sdlcforge-server.js, dist/sdlcforge-server-exec.js, or the published tarball — and core-server does not control @rollup/plugin-terser's own pin directly; a fix requires an upstream bump in either @rollup/plugin-terser or @liquid-labs/catalyst-resource-babel-and-rollup. Track rather than patch directly; worth re-checking whenever bun.lock is regenerated, since the same toolchain package resolves the pin again each time.

  Originally filed against @sdlcforge/dev-core as followup 0RpG (there rooted in dev-core's own devDependency @liquid-labs/sdlc-resource-babel-and-rollup, which core-server does not carry); reworded and carried across against @sdlcforge/core-server's own @liquid-labs/catalyst-resource-babel-and-rollup devDependency chain when dev-core was absorbed into core-server.

- **`RiTB`** — **Task document defect: the roster table and Va** — Task document defect: the roster table and Validation section 5's script both cite src/orgs/handlers/get-org.mjs for xehM; real path is src/orgs/handlers/_lib/get-org.mjs. Running Validation 5 literally will spuriously report MISSING for that one path -- not a merge defect.

- **`Hqj8`** — **Task document defect: dsdl's suggested title** — Task document defect: dsdl's suggested title ("consolidation-contract.md:128 stale attribution", 47 chars) exceeds the 45-char title limit; used a shortened 43-char title instead.

- **`iFJD`** — **hks9 and dsdl's carried text was substantiall** — hks9 and dsdl's carried text was substantially rewritten per the task doc's own explicit instruction, going beyond the donor's original fragment with directly-verified findings -- diverges from the donor more than the other 15 items; sanity-checked against the standards' 'substantially the donor's original text' expectation and judged acceptable given the explicit instruction to make them stand alone.

- **`ACYM`** — **Task document update could not be performed i** — Task document update could not be performed inside this task's own worktree since the assigned task doc does not exist there (branch cut from main, before this plan's phase-02 docs existed on that lineage) -- only at plan_worktree_path. Manager should apply the Status section to plan/phase-02-absorb-dev-core/003-union-runtime-dependencies.md directly.

- **`pO8X`** — **Suite-count baseline stale by one (same root** — Suite-count baseline stale by one (same root cause as the already-flagged conflict-count staleness): task doc says core-server ran 17 suites pre-merge, but direct measurement at $PRE shows 18 (three suites added by earlier phase-1/plan work after merge-arrival-inventory's '17' figure was captured). Net collected suites is 38, not 37 -- documentation staleness, not a merge defect.

- **`Hbhh`** — **plan/resources/pre-merge-root-blob-map.md cro** — plan/resources/pre-merge-root-blob-map.md cross-check disagreement resolved per the task doc's own tie-break rule: map pinned at cbd19fd8, actual $PRE is 08e5ee10 (task 003's work landed in between). Only the plan tree SHA differs (followups.yaml legitimately grew); all guarded critical paths matched exactly. Expected drift, not a hazard.

- **`s3T1`** — **Assumptions section expected absorbed source** — Assumptions section expected absorbed source to produce new ESLint findings; directly verified it does not (148 files, 0 findings) -- a pleasant surprise worth noting for Phase 5's component-boundary lint work.

- **`KWV0`** — **The task-001 merge commit message also carrie** — The task-001 merge commit message also carries the stale '17' suite-count figure forward.

- **`O9g2`** — **Stale README anchors in kept dev-core docs** — docs/consumer-migration.md (lines 247, 343) and docs/dev-core-consolidation-contract.md (lines 128, 157) contain ../README.md#<anchor> links (#repaired-defects-orgs-submodule, #projects-audit-submodule, #the-plugin-manifest) that resolve to core-server's own README.md, which has no such sections -- these anchors match sections that exist only in the donor @sdlcforge/dev-core's own README.md and were never repointed when the merge landed both files ('--ours' kept them verbatim per task 001). The link target file exists (not a dangling forward-link), but the fragments are broken. Both docs' disposition is already deferred to the doc-updates phase; when that phase touches these files, repoint the anchors to wherever the referenced content lands in core-server's docs, or drop the anchors if the content isn't carried over.

  Found during Phase 2's boundary-gate documentation link-chain check.

- **`X1KA`** — **Unexpected pre-existing test failure, out of** — Unexpected pre-existing test failure, out of scope and not fixed: src/projects/handlers/_lib/test/project-lifecycle.test.mjs (7 tests) -- proven independent of this task's diff. Root cause: appMock.ext.serverHome vs create-lib.mjs's app.ext.serverConfigRoot read, an inherited defect from Phase 2's absorption. Makes make test permanently red independent of Phase 4's work -- needs a followup and probably a phase assignment.

- **`uMj8`** — **make test's pass marker is filter-blind: TEST** — make test's pass marker is filter-blind: TEST=builtin-plugins make test touches qa/.unit-test.passed, and a subsequent unfiltered make test then reports Nothing to be done and exits 0 -- a filtered green run masquerading as a full green run. Worth a followup on make/55-test.mk.

- **`yipP`** — **bun run test:local cannot run in a bare workt** — bun run test:local cannot run in a bare worktree without a PATH shim: test/test-server.js spawns the bare binary name sdlcforge-server, not resolvable via node_modules/.bin or global install. Validation 6 is not reproducible in a fresh worktree as written.

- **`YQ8P`** — **Phase 4's handoff is narrower than the task d** — Phase 4's handoff is narrower than the task doc predicted: plugin-graph-absorbed-donor-conflicts.test.js, plugin-graph-serverconfigroot-rename.test.js, and full-tier-baseline.test.js's full-tier-integrations-list.json snapshot all pass unchanged. Phase 4 should re-scope rather than assume those need repointing.

- **`MXGO`** — **Stale dev-core references left in place per t** — Stale dev-core references left in place per task doc's own instruction: test/test-basic.js:52, test/test-integration-quick.js:59,83, test/README.md:109, plus AGENTS.md/CLAUDE.md/docs/architecture.md/docs/architecture/plugin-loading-tiers.md/docs/consumer-migration.md/docs/project-structure.md/docs/dev-core-consolidation-contract.md all still describe dev-core as an explicit npm plugin -- Phase 6's.

- **`phtr`** — **.yalc/@sdlcforge/dev-core and node_modules/@s** — .yalc/@sdlcforge/dev-core and node_modules/@sdlcforge/dev-core still physically present, deliberately left per task doc (optional/untracked), harmless per the 0-dev-core-route measurement.

- **`bz9g`** — **strictOptional must stay at default false for** — strictOptional must stay at default false for Phase 4 (surviving appExt:_liqOrgs.orgSetupMethods info promotes to error under strictOptional:true); conversely strictOrder:true is now free (ok, same counts) if Phase 4 wants to opt in.

- **`UqSX`** — **Assertion 4's 'setup absent'/'handlers length** — Assertion 4's 'setup absent'/'handlers length 4' checks, written at the source per the task doc's own instruction, do not turn red under the task doc's own named mutation ('remove projectsAudit from submodules') -- only assertion 3 and the pre-existing aggregation test do. The suite still goes red as the Validation section actually requires ('every mutation must turn the suite red'), just via a different assertion than the doc's per-mutation mapping predicted. No corrective action needed; flagging in case the manager wants the task doc's Validation wording corrected.

- **`WdhE`** — **project-lifecycle.test.js fails in this workt** — project-lifecycle.test.js fails in this worktree (7/7 tests), confirmed via A/B stash testing to be identical with/without this task's diff -- pre-existing, unrelated to component ordering, same root cause already flagged by task 001 (app.ext.serverConfigRoot). Not pre-declared in this task's own Assumptions section (unlike the plugin-graph-*/full-tier-baseline suites) -- may already be covered by task 001's flagged followup.

- **`f6AA`** — **Of the three sibling plugin-graph-*.test.js s** — Of the three sibling plugin-graph-*.test.js suites the Assumptions section expects red, only two were actually red (plugin-graph-gate.test.js, plugin-graph-third-party-ordering.test.js); plugin-graph-serverconfigroot-rename.test.js and plugin-graph-absorbed-donor-conflicts.test.js are green -- consistent with task 001's own flagged note that Phase 4's handoff is narrower than predicted.

- **`M21N`** — **Measured pre-existing lint baseline is 236, n** — Measured pre-existing lint baseline is 236, not the ~233 the task doc's Assumptions cite -- confirmed unaffected either way, informational only.

- **`LipN`** — **Phase 6 doc scope refinements** — Phase 3's boundary-gate architecture-conformance and documentation link-chain checks confirmed docs/architecture.md and docs/architecture/plugin-loading-tiers.md are now stale (still describe 3 built-in components and 5 npm-dependency packages including @sdlcforge/dev-core) -- this drift is expected and already scoped to plan/phase-06-doc-updates/001-update-architecture-docs.md. Three refinements surfaced that go beyond that task doc's current scope, worth folding in when Phase 6 runs:

  1. test/README.md (not currently named in Phase 6's document list) independently repeats the same stale @sdlcforge/dev-core-as-explicit-plugin claim ("Explicit Plugins Integration" section) -- add it to the doc-update sweep.
  2. docs/architecture/plugin-loading-tiers.md's Tier 2 section (around line 59) currently frames controls' dependency on orgs/projects as a latent startup-failure risk contingent on dev-core being loaded as an npm package ("nothing enforces the _liqProjects half at startup; it fails... if dev-core was never loaded"). Since orgs and projects are now built-in components ordered ahead of controls in the same submodules array (shipped inside core-server's own package), this risk is mechanically closed by the migration, not merely relocated -- the rewrite should credit this as a resolved risk rather than restating it under the new component names.
  3. docs/architecture.md's "Key decisions" section has no entry recording the decision to absorb the four dev-core-donor components into the built-in in-tree tier rather than continuing to load them as a separate npm package -- worth adding a bullet naming the rationale (eliminating an unpublished-package yalc workaround, closing the startup-failure risk in item 2) and the rejected alternative (publish/keep dev-core as a separate package).

  Found during Phase 3's boundary-gate review (architecture-conformance + doc link-chain checks).

- **`VAFc`** — **strictOrder:true confirmed independently to h** — strictOrder:true confirmed independently to have zero order-unprovable warnings in the default run, consistent with the note's claim it's a free improvement -- not enabled here (out of this phase's scope), flagging for a future phase decision per the task doc's own instruction.

- **`7LNl`** — **src/lib/test/full-tier-baseline.test.js line** — src/lib/test/full-tier-baseline.test.js line ~162 still contains a second, separate stale dev-core comment mention (distinct from line ~263 which was already fixed) -- task doc's requirement 6 explicitly scoped only line ~263, so left untouched per scope discipline; flagging for a later comment-hygiene pass.

- **`c5lf`** — **Explicit confirmation: none of the 'not predi** — Explicit confirmation: none of the 'not predicted' regression triggers (integrations-list diff, golden-snapshot diff, EXPECTED_* constant failure) fired -- reporting the absence explicitly per the dispatch's halt condition.

- **`fgaF`** — **make lint (whole-repo, read-only investigatio** — make lint (whole-repo, read-only investigation) reports 236 pre-existing errors including an identical pre-existing 'beforeAll is not defined (no-undef)' finding on this task's file plus task 004's two sibling files -- a repo-wide eslint-config gap (jest globals not recognized for plugin-graph test files) predating this task, reproduced identically against pre-change content via git show HEAD, unrelated to and unaffected by this task's edits. Worth a follow-up to add jest globals recognition for src/lib/test/**.

- **`PokV`** — **Per Requirement 6, strictOrder:true measured** — Per Requirement 6, strictOrder:true measured as a genuine free improvement (ok, zero order-unprovable edges) but deliberately not adopted here -- flagging per task doc's own instruction as a follow-up candidate.

- **`6bMp`** — **Filename mismatch (task doc's own flagged dec** — Filename mismatch (task doc's own flagged decision): plugin-graph-third-party-ordering.test.js's filename still says third-party though content no longer describes cross-package coupling. Renaming outside this task's sweep, left as-is per task doc instruction.

- **`U0Uc`** — **Scope-extension candidate (task doc's own fla** — Scope-extension candidate (task doc's own flag): plugin-graph-absorbed-donor-conflicts.test.js covers only the three predecessor-absorption donors; whether the four newly-absorbed dev-core components deserve their own donor-conflict cases is a scope extension not landed here.

- **`FNZJ`** — **Repo-wide dev-core# sweep had 7 residual matc** — Repo-wide dev-core# sweep had 7 residual matches confined to task 003's file at dispatch time -- task 003 has since landed (merge 00a4200), so the sweep should now be fully clean; confirm.

- **`g94K`** — **N7cz needs a manager decision: join it as a f** — N7cz needs a manager decision: join it as a fifth fenced-off inherited defect (making green-apart-from-N7cz this phase's bar) or schedule as its own repair task. Requirement 2 and requirement 6 as literally written cannot both be satisfied.

- **`R29f`** — **Validation item 4 fails literally on file att** — Validation item 4 fails literally on file attribution but requirement 3's substantive bar (no new lint finding) holds with a net -2; manager should decide which is authoritative.

- **`yMQe`** — **Phase and task documents state a non-existent** — Phase and task documents state a non-existent URL (/server/plugins/details/<name>); real route is /server/plugins/:serverPluginName/details -- the wrong form 404s for every package and would produce a false pass on the dev-core half alone.

- **`79J5`** — **Requirement 3's baseline attribution is wrong** — Requirement 3's baseline attribution is wrong: 233 = 230 across four test/ files + 3 under src/, not '233 across 5 files under test/'.

- **`7OZa`** — **Candidate followup: test:local portability --** — Candidate followup: test:local portability -- test/test-server.js spawns bare 'sdlcforge-server' from PATH, requiring an ad-hoc shim in any bare worktree; scripts/start.sh already resolves the binary correctly from package.json's bin.

- **`09Qe`** — **Observation: parameterKey is registered twice** — Observation: parameterKey is registered twice (two different orgs handlers), tolerated by the framework, unchanged donor behavior, no action needed.

- **`T55R`** — **NEJt could not be reproduced by 11 probe vari** — NEJt could not be reproduced by 11 probe variants under current dependency versions -- recorded as not-repaired-not-reproduced, not resolved.

- **`nxD5`** — **Task 004 validation bar vs task 003 comment** — src/lib/test/plugin-graph-gate.test.js:28's comment ("unsatisfied / ... @sdlcforge/dev-core#orgs -- cleared by Phase 1's drift clearance...") is a deliberate historical explanation of why a finding cleared -- exactly the kind of historical mention a sibling test-repointing procedure's own instructions explicitly carve out and allow to survive in a comment. A separately-authored, stricter grep-based check elsewhere in the same procedure's instructions has no such carve-out, creating an inconsistency between two closely related sets of instructions. The comment itself is fine and intentional; not a functional defect. If either set of instructions is revisited, align the wording: either add the same carve-out, or reword the comment to avoid the literal #-suffixed node ID.

- **`D7dK`** — **Task worktree's baseline lint run includes 3** — Task worktree's baseline lint run includes 3 extra findings from plan/resources/validate-check.mjs beyond the 231-finding corrected baseline -- an artifact of the plan worktree living inside this checkout, not a real movement, informational only.

- **`Xs6I`** — **AGENTS.md's explicit-plugin tier still never** — AGENTS.md's explicit-plugin tier still never enumerated by package name (pre-existing gap, not introduced by this task) -- worth a follow-up if the manager wants AGENTS.md to name the four sdlc-projects-* packages explicitly like CLAUDE.md/README.md now do.

- **`ILpy`** — **docs/architecture.md in this worktree was sti** — docs/architecture.md in this worktree was still the pre-plan version since task 001 ran in a sibling worktree not visible here -- validation check 4 was satisfied via the shared component-order-and-manifest-mechanics.md source rather than a direct cross-check against task 001's actual output; worth confirming consistency once both branches merge.

- **`gb7B`** — **Validation item 6's exact grep finds one non-** — Validation item 6's exact grep finds one non-excluded hit for dev-core-consolidation-contract.md in plan/resources/dev-core-absorption-dependency-union.md:7 -- a Phase-2 durable plan record outside this task's edit authority, judged equivalent to the plan-summary exclusion already carved out and treated as accepted historical reference; flagging for confirmation.

- **`53lP`** — **Task 002 (README/AGENTS/CLAUDE) ran concurren** — Task 002 (README/AGENTS/CLAUDE) ran concurrently in a sibling worktree -- confirmed no collision by grepping for references to the two removed files, none found.

- **`wmDU`** — **test/README.md still lists dev-core** — test/README.md line 109 still lists @sdlcforge/dev-core among the tested explicit plugins. dev-core's four submodules are now built-in (in-tree) components rather than a separate explicit-tier npm package -- this file was not in scope for either the architecture-docs pass (docs/*.md) or the onboarding-docs pass (README.md/AGENTS.md/CLAUDE.md), so it was never updated to reflect the seven-component built-in aggregate and four-package explicit tier.

  Found during the final phase-boundary gate's documentation link-chain check.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Pre-Merge Baseline And Drift Clearance

- [x] [001-fix-npm-toolkit-rename-break.md](./phase-01-pre-merge-baseline-and-drift-clearance/001-fix-npm-toolkit-rename-break.md) — tier `sonnet-med` · branch `plan/sdlc-core-unification-01-001` · commit `f7f5b79` · merge `e5c11f4`
- [x] [002-refresh-dev-core-snapshot-and-clear-yalc-drift.md](./phase-01-pre-merge-baseline-and-drift-clearance/002-refresh-dev-core-snapshot-and-clear-yalc-drift.md) — tier `sonnet-med` · branch `plan/sdlc-core-unification-01-002` · commit `dca4ec5` · merge `f40a459`
- [x] [003-capture-pre-merge-observable-baseline.md](./phase-01-pre-merge-baseline-and-drift-clearance/003-capture-pre-merge-observable-baseline.md) — tier `sonnet-med` · branch `plan/sdlc-core-unification-01-003` · commit `9a811f6` · merge `9d44718`
- [x] [004-author-dev-core-absorption-parity-contract.md](./phase-01-pre-merge-baseline-and-drift-clearance/004-author-dev-core-absorption-parity-contract.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-01-004` · commit `ede544a` · merge `957d0a8`
- [x] [005-record-pre-merge-root-blob-map.md](./phase-01-pre-merge-baseline-and-drift-clearance/005-record-pre-merge-root-blob-map.md) — tier `haiku-med` · branch `plan/sdlc-core-unification-01-005` · commit `55e5151` · merge `688a262`

### Phase 02 — Absorb Dev-Core

- [x] [001-execute-absorption-merge.md](./phase-02-absorb-dev-core/001-execute-absorption-merge.md) — tier `opus-med` · branch `plan/sdlc-core-unification-02-001` · commit `de663a7` · merge `ab7d443`
- [x] [002-refile-dev-core-followups.md](./phase-02-absorb-dev-core/002-refile-dev-core-followups.md) — tier `sonnet-high` · branch `…` · commit `…` · merge `…`
- [x] [003-union-runtime-dependencies.md](./phase-02-absorb-dev-core/003-union-runtime-dependencies.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-02-003` · commit `f7099c2` · merge `c4b5ab9`
- [x] [004-verify-merge-and-restore-green-build.md](./phase-02-absorb-dev-core/004-verify-merge-and-restore-green-build.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-02-004` · commit `c158ba7` · merge `3bb1c25`

### Phase 03 — Wire And Declare Seven Components

- [x] [001-wire-seven-components-and-retire-dev-core.md](./phase-03-wire-and-declare-seven-components/001-wire-seven-components-and-retire-dev-core.md) — tier `opus-high` · branch `plan/sdlc-core-unification-03-001` · commit `a4cd7ab` · merge `0e83876`
- [x] [002-assert-component-order-agreement.md](./phase-03-wire-and-declare-seven-components/002-assert-component-order-agreement.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-03-002` · commit `7966e1a` · merge `6ad758c`
- [x] [003-port-donor-aggregate-assertions.md](./phase-03-wire-and-declare-seven-components/003-port-donor-aggregate-assertions.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-03-003` · commit `6dc5bad` · merge `2faac43`

### Phase 04 — Verify Parity And Tighten Gate

- [x] [001-measure-post-merge-plugin-graph.md](./phase-04-verify-parity-and-tighten-gate/001-measure-post-merge-plugin-graph.md) — tier `sonnet-high` · branch `…` · commit `…` · merge `…`
- [x] [002-rebaseline-full-tier-snapshots.md](./phase-04-verify-parity-and-tighten-gate/002-rebaseline-full-tier-snapshots.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-04-002` · commit `deef90e` · merge `99c04f7`
- [x] [003-delete-error-allowlist-and-tighten-gate.md](./phase-04-verify-parity-and-tighten-gate/003-delete-error-allowlist-and-tighten-gate.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-04-003` · commit `bad6451` · merge `00a4200`
- [x] [004-repoint-sibling-plugin-graph-tests.md](./phase-04-verify-parity-and-tighten-gate/004-repoint-sibling-plugin-graph-tests.md) — tier `sonnet-med` · branch `plan/sdlc-core-unification-04-004` · commit `0b58a51` · merge `9cc477a`
- [x] [005-verify-parity-contract-and-green-run.md](./phase-04-verify-parity-and-tighten-gate/005-verify-parity-contract-and-green-run.md) — tier `opus-med` · branch `plan/sdlc-core-unification-04-005` · commit `9cc477a` · merge `…`

### Phase 05 — Component Boundary Hardening

- [x] [001-add-component-boundary-eslint-config.md](./phase-05-component-boundary-hardening/001-add-component-boundary-eslint-config.md) — tier `sonnet-med` · branch `plan/sdlc-core-unification-05-001` · commit `5cc9c64` · merge `506f959`
- [x] [002-add-component-boundary-drift-guard-test.md](./phase-05-component-boundary-hardening/002-add-component-boundary-drift-guard-test.md) — tier `sonnet-med` · branch `plan/sdlc-core-unification-05-002` · commit `d1ff6db` · merge `655b308`

### Phase 06 — Documentation Updates

- [x] [001-update-architecture-docs.md](./phase-06-doc-updates/001-update-architecture-docs.md) — tier `sonnet-high` · branch `plan/sdlc-core-unification-06-001` · commit `db29166` · merge `fa7b33c`
- [x] [002-update-project-onboarding-docs.md](./phase-06-doc-updates/002-update-project-onboarding-docs.md) — tier `sonnet-med` · branch `plan/sdlc-core-unification-06-002` · commit `7f122b1` · merge `a607324`
