# Overview

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
