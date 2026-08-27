# Dev-Core Consumer Migration

## Purpose and scope

Repoint `@sdlcforge/core-server` from the four separately-published `plugable-express` plugin packages it loads today — `@liquid-labs/liq-orgs`, `@liquid-labs/liq-projects`, `@liquid-labs/liq-work`, and `@liquid-labs/plugable-projects-audit` — onto the single consolidated package that already absorbed all four, `@sdlcforge/dev-core`.

The absorption itself is done: the `dev-core-consolidation` plan-group completed, all four donors landed in `dev-core`, and each donor's published `summary` already reads `DEPRECATED — superseded by @sdlcforge/dev-core`. `core-server` — the one npm consumer of all four — was never repointed. This plan-group closes that gap and nothing else.

**This is execution against a finished specification, not design work.** `dev-core`'s own [`docs/consumer-migration.md`](/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md) enumerates every required edit per donor, with exact current content, the atomicity requirement and the verbatim crash strings that enforce it, the provenance implications for API-spec snapshots, and a verification checklist. Tasks below reference that document rather than restating it.

The spec's own line numbers are timestamped against `core-server` commit `54b06d0` (2026-08-17) and have drifted. A fresh re-verification against today's tree is recorded in [current-state drift](./notes/current-state-drift.md); it confirms every substantive claim still holds while identifying three load-bearing changes (an 8-entry rather than 11-entry plugin array, a materially different `bun.lock` yalc picture, and a new full-tier snapshot suite the spec predates) plus three execution hazards. Task documents work from that note, not from the spec's line numbers.

### In scope

- Swapping the four donor entries for one `@sdlcforge/dev-core` entry in `package.json` and `src/lib/app-init.mjs`, **in a single atomic commit**, consuming `dev-core` through a yalc local link (`file:.yalc/@sdlcforge/dev-core`) since it is not yet published to npm.
- Regenerating `bun.lock` (never hand-editing it) and resynchronizing `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` against it.
- Updating the three donor test-fixture occurrences and regenerating the full-tier characterization snapshots.
- Updating every documentation touch-point: `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`, `test/README.md`, `CLAUDE.md`, `AGENTS.md`, plus stale in-source comments naming the donors as still-external.
- Verifying the swap against the spec's own checklist.

### Out of scope

- **Publishing `@sdlcforge/dev-core` to npm.** It stays yalc-linked for this transition. Repointing `package.json` at a registry range is a later, separate change.
- **Fixing the pre-existing defects the spec documents as migrating unchanged**: the four broken `/orgs` endpoints, the four `projects-audit` defects, and the `liq-work` Node ≥ 24 `SlowBuffer` load failure. These travel with the migration as documented pre-existing behavior. A post-swap bug report matching one of them is not a regression this plan introduced.
- **Deprecating, unpublishing, or otherwise retiring the four donor packages.** The spec records a real second dependent for `liq-orgs` (`liq-roles`, `liq-test-lib`); neither is this plan-group's to handle.
- **Anything about the compile-time plugin manifest.** That is the downstream `compile-time-manifest-sdlc-server` plan-group, which depends on this one landing so it can author its manifest against `core-server`'s final plugin set.

### Success criteria

1. `core-server` declares and loads `@sdlcforge/dev-core` and none of the four donors, with the swap landing as **one commit** containing `package.json`, `bun.lock`, and `src/lib/app-init.mjs` together.
2. `grep -n 'file:\.yalc' bun.lock` and `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` agree with each other, and `scripts/provision-local-deps.sh` succeeds in a fresh worktree.
3. The server starts with no `Path variable '…' is already registered.` and no `Non-unique command path: …` error, and no `Unknown variable path element type 'projectName' …` error.
4. Every route the four donors used to serve reports `npmName: "@sdlcforge/dev-core"` in `GET /server/api` and `GET /server/plugins/list`.
5. `credentialsDB.getToken('GITHUB_API')` still resolves — confirming `dev-core`'s composite `setup` registered the credential type `liq-projects` used to.
6. The unit suite passes, with `full-tier-baseline.test.js`'s non-snapshot assertions (setup-method names/deps, `app.ext` key set) passing **unregenerated**; the local integration smoke test passes; the Docker multi-Node integration suite is run or its non-runnability in this environment is explicitly recorded.
7. No documentation or in-source comment still describes `core-server` as loading any of the four donors.

### Hard constraints

- **Atomicity.** No commit anywhere on the plan branch may contain a half-migrated state — donors partly removed, or `dev-core` added without the donors removed. Every such intermediate state is a startup crash, documented per-donor in the spec with verbatim error strings. This forces the `package.json`/`app-init.mjs`/`bun.lock` swap into one task and one commit.
- **`bun.lock` is regenerated, never hand-edited** — `rm -f bun.lock && bun install`, or `./scripts/provision-local-deps.sh --refresh-lock`. A bare `bun install` will not re-resolve a changed `file:` spec.
- **`dev-core` is a read-only reference.** No task modifies anything git-tracked in that checkout. The one write it needs is `yalc publish`, which touches only the machine-global yalc store.

## Current status

Planning complete; no implementation work has started. Phase 1 begins first.

The tree is verified unswapped: all four donors are present in `package.json` and are the first four entries of `explicitPlugins`, and `@sdlcforge/dev-core` appears nowhere.

Two pre-conditions gate the first task and are why Phase 1 opens with a provisioning-and-baseline task rather than the swap itself:

- `@sdlcforge/dev-core` is **not** in the machine's global yalc store, so nothing can install until it is published there from the `dev-core` checkout.
- This host runs Node v26.5.0, past the `liq-work` `SlowBuffer` line the spec discloses. Which test tiers pass *before* the swap must be recorded, or a red suite afterward cannot be attributed.

One mechanical hazard applies to Phase 1 task 002 specifically: Flow's `finalize-task-commit.sh` carries a yalc-override guard that excludes a modified `package.json`/`bun.lock` whose diff adds a `.yalc/` line — exactly what this migration adds. Unhandled, it commits `app-init.mjs` without `package.json`, producing the forbidden half-migrated state. The workaround (stage both explicitly first) is spelled out in the task doc and in [current-state drift](./notes/current-state-drift.md).

## Overview

Two phases, five tasks. The shape is dictated by the atomicity constraint rather than by breadth: the swap cannot be subdivided, so Phase 1 is a short serial chain around one indivisible central task.

### Phase 1 — Dev-Core Swap

Everything that changes `core-server`'s behavior, plus the documentation touch-points the migration spec enumerates.

1. **`001-provision-dev-core-link-and-baseline`** *(sonnet-med)* — Publish `@sdlcforge/dev-core` into the global yalc store from its checkout, confirm it resolves, and record a pre-swap baseline: which test tiers currently pass on this Node version, the current `file:.yalc` set in `bun.lock`, and the current donor provenance counts in the full-tier snapshots. Produces `plan/notes/pre-swap-baseline.md`. Changes no `core-server` source.

2. **`002-swap-explicit-plugins-atomically`** *(opus-med)* — The indivisible core. Removes all four donor entries from `package.json` and `explicitPlugins`, adds the single `@sdlcforge/dev-core` entry, regenerates `bun.lock`, resynchronizes `REQUIRED_YALC_PACKAGES` from the regenerated lock, updates the three donor test fixtures, and regenerates the full-tier snapshots — landing as **one commit**. Blocked by 001.

3. **`003-update-docs-and-stale-references`** *(sonnet-high)* — Every documentation touch-point plus the stale in-source comments: the architecture diagram and prose, the plugin-loading-tiers table (four donor rows collapse to one `dev-core` row, and the package count goes 8 → 5), `docs/project-structure.md`, `test/README.md`, `CLAUDE.md`, and `AGENTS.md`'s yalc/CI-policy paragraph. Blocked by 002 — these docs describe the post-swap state.

4. **`004-verify-migration`** *(sonnet-high)* — Runs the spec's own verification checklist against the running server: clean startup, a live `/projects` route, `dev-core` provenance in the plugin list, `GITHUB_API` credential resolution, and all three test tiers compared against 001's baseline. Blocked by 002; may run concurrently with 003, which touches only documentation.

Tasks 003 and 004 are the plan's only parallel-eligible pair.

### Phase 2 — Documentation Updates

5. **`001-update-architecture-docs`** *(sonnet-high)* — The standard architecture-conformance sweep, warranted here because collapsing four documented tier-2 components into one is a topology change. Reviews `docs/architecture.md` and `docs/core-server-spec.md` against the landed state and repairs anything Phase 1's enumerated touch-point list missed. That list is known to have been incomplete once already — the migration spec omitted `docs/project-structure.md`, `plugin-loading-tiers.md`'s in-tree-`controls` dependency prose, and the full-tier snapshot suite entirely — which is the concrete reason this sweep is not redundant with task 003.

### Dependency summary

```text
001-provision → 002-swap → ┬→ 003-update-docs ─┐
                           └→ 004-verify ──────┴→ phase-02/001-update-architecture-docs
```
