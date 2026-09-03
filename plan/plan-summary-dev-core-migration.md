# Plan Summary: dev-core-migration

## What was planned and why

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

## What shipped

### Phase 01 — Dev-Core Swap

1. **Provision Dev-Core Yalc Link And Capture Pre-Swap Baseline** (`001-provision-dev-core-link-and-baseline.md`, tier `sonnet-med`) — Published @sdlcforge/dev-core@1.0.0-alpha.0 into the global yalc store (yalc publish --no-scripts), confirmed the source dev-core checkout stayed clean, and linked the package into this task worktree via yalc link (no package.json write). Provisioned the rest of .yalc/ by copying from the main checkout and running bun install directly after scripts/provision-local-deps.sh failed exactly as the drift note predicted (its REQUIRED_YALC_PACKAGES array is stale in both directions). Ran the one-time bun link per follow-up 8lmN. Captured a full pre-swap baseline in plan/notes/pre-swap-baseline.md: all three test tiers pass cleanly today (unit 40/40, local integration 7/7, Docker multi-Node 9 versions × 7/7 — Docker was available so this tier ran to completion, not "not runnable here"); liq-work loads without error on every Node version tested including several past the disclosed SlowBuffer line, a positive finding for task 004 to compare against; the yalc file: set and donor-provenance snapshot counts both matched the drift note's D2/D3 findings exactly; and a genuine 200 /projects/detail response (with the X-CWD header it requires) was captured as a before-shape for task 004. No file outside plan/ was touched — package.json, bun.lock, src/, and test/ remain exactly as they were.
   Commit `6d01bec`, merged at `d5cd54be3cad351623f91d1539f43028ae0d5c41`.

2. **Swap Four Donor Plugins For Dev-Core In One Atomic Commit** (`002-swap-explicit-plugins-atomically.md`, tier `opus-med`) — Replaced liq-orgs/liq-projects/liq-work/plugable-projects-audit with a single @sdlcforge/dev-core entry across package.json and app-init.mjs's explicitPlugins (8→5), regenerated bun.lock, resynchronized provision-local-deps.sh's REQUIRED_YALC_PACKAGES, updated 3 donor test-fixture occurrences, and regenerated both full-tier snapshots — landed as one commit 792a80a. Unit tier identical to baseline (12/12, 40/40); EXPECTED_SETUP_METHODS/EXPECTED_APP_EXT_KEYS pass unregenerated, strong evidence of contract-equivalence. Snapshot diff is provenance-only across all 165 entries after normalizing for the legitimate load-order shift caused by appending dev-core alphabetically. finalize-task-commit.sh's yalc-override guard fired as documented; pre-staging package.json/bun.lock defeated it and the commit carries all 9 files together.
   Commit `792a80a`, merged at `40f2531114cb372ee5fbb6c9c2d8197bb148f122`.

3. **Update Documentation And Stale In-Source Donor References** (`003-update-docs-and-stale-references.md`, tier `sonnet-high`) — Brought every prose/count/donor reference into line with task 002's landed swap (4 donors -> 1 @sdlcforge/dev-core, 8->5 explicit plugins) across docs/architecture.md, docs/architecture/plugin-loading-tiers.md (collapsed four-donor table into one dev-core row), docs/project-structure.md, test/README.md, CLAUDE.md, and AGENTS.md (re-derived CI-policy yalc bullet against regenerated bun.lock, dropped stale transitive clause). Corrected six stale in-source comments across three test files describing donors as still-external, comment-only (no code/assertion changes). All 12 suites / 40 tests passed identically; no snapshot moved.
   Commit `43c39ba`, merged at `09935dc26a7785408f095773a76d8286f0d8c025`.

4. **Verify Migration Against The Spec Checklist** (`004-verify-migration.md`, tier `sonnet-high`) — Ran the migration spec's full verification checklist against the running swapped server. Every requirement passed with zero deviation from task 001's baseline: clean startup, /projects/detail unchanged, full provenance correctness (112 routes under @sdlcforge/dev-core), GITHUB_API credential type still registers, all three test tiers green matching baseline counts exactly, and the full-tier-api-spec.json snapshot verified structurally as provenance-only across all 165 routes. Incidentally discovered a genuine, unrelated crash bug in /server/next-commands reaching credentials/:type/import (TypeError in liq-handlers-lib) -- confirmed to live entirely outside the four migrated donors and dev-core, flagged rather than fixed.
   Commit `38b2c47`, merged at `456a0e54ba9835ca6f883f290da1dc54cba08313`.

### Phase 02 — Documentation Updates

1. **Update Architecture Docs** (`001-update-architecture-docs.md`, tier `sonnet-high`) — Pure conformance-verification pass. Phase 1 task 003 plus the phase-boundary gate-fix commit had already brought docs/architecture.md and docs/architecture/plugin-loading-tiers.md fully into line with the five-package, dev-core-fronted explicit tier, including the subtler items (table row order, the two-package yalc Key-Decisions bullet, literal _liqOrgs/_liqProjects key names). docs/core-server-spec.md, the file this sweep uniquely covers, needed no edit -- it never named a donor package. No source, docs, or test file changed; only the task document's own Status section was added.
   Commit `02bb83e`, merged at `3e21cd747ba17fecde92e4f067cafb38c763f4f3`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`NEJt`** — **New finding, not a documented pre-existing de** — New finding, not a documented pre-existing defect: GET /server/next-commands?command=credentials/ (and any completion path reaching the credentials/:type/import path variable) crashes the running server process with TypeError: e.map is not a function at node_modules/@liquid-labs/liq-handlers-lib/dist/liq-handlers-lib.js:570, reached via plugable-express's next-commands.mjs -> _lib/next-options.mjs. Confirmed unrelated to this migration -- the crashing code lives in liq-handlers-lib and liq-credentials-db/credentials-db-plugin-github, none of which are among the four swapped donors or dev-core. Recommend a follow-up item to investigate/fix in liq-handlers-lib or the credentials plugin's optionsFetcher.

- **`uJIy`** — **docs/core-server-spec.md and docs/architectur** — docs/core-server-spec.md and docs/architecture.md both state Node.js 18-24 support; this host runs v26.5.0, and the migration spec discloses a pre-existing SlowBuffer load failure on Node >= 24 that dev-core inherits. Real doc-vs-reality gap, pre-existing, out of this plan-group's scope.

- **`tonW`** — **docs/architecture.md's Test infrastructure se** — docs/architecture.md's Test infrastructure section describes three test levels and omits full-tier-baseline.test.js/its checked-in snapshots, added by a later plan. Judgment call for a future doc pass; not acted on here.

- **`862M`** — **This task's own Validation grep bullet is wor** — This task's own Validation grep bullet is worded more strictly than task 003's equivalent (which carved out legitimate historical-context hits); recommend future plan-doc-authoring carry the same carve-out phrasing to avoid a false validation-miss read.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Dev-Core Swap

- [x] [001-provision-dev-core-link-and-baseline.md](./phase-01-dev-core-swap/001-provision-dev-core-link-and-baseline.md) — tier `sonnet-med` · branch `plan/dev-core-migration-01-001` · commit `6d01bec` · merge `d5cd54be3cad351623f91d1539f43028ae0d5c41`
- [x] [002-swap-explicit-plugins-atomically.md](./phase-01-dev-core-swap/002-swap-explicit-plugins-atomically.md) — tier `opus-med` · branch `plan/dev-core-migration-01-002` · commit `792a80a` · merge `40f2531114cb372ee5fbb6c9c2d8197bb148f122`
- [x] [003-update-docs-and-stale-references.md](./phase-01-dev-core-swap/003-update-docs-and-stale-references.md) — tier `sonnet-high` · branch `plan/dev-core-migration-01-003` · commit `43c39ba` · merge `09935dc26a7785408f095773a76d8286f0d8c025`
- [x] [004-verify-migration.md](./phase-01-dev-core-swap/004-verify-migration.md) — tier `sonnet-high` · branch `plan/dev-core-migration-01-004` · commit `38b2c47` · merge `456a0e54ba9835ca6f883f290da1dc54cba08313`

### Phase 02 — Documentation Updates

- [x] [001-update-architecture-docs.md](./phase-02-doc-updates/001-update-architecture-docs.md) — tier `sonnet-high` · branch `plan/dev-core-migration-02-001` · commit `02bb83e` · merge `3e21cd747ba17fecde92e4f067cafb38c763f4f3`
