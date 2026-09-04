# Plan Summary: sdlc-plugin-manifest

## What was planned and why

Declare `@sdlcforge/core-server`'s own plugin composition as **data the build can check**, using the compile-time manifest framework designed by `@liquid-labs/plugable-express`'s `compile-time-manifest` plan-group, and wire the framework's validator into `core-server`'s own `make test` / `make qa`.

Today the composition is two array literals — a five-name `explicitPlugins` array in `src/lib/app-init.mjs` and a three-member `submodules` array in `src/lib/builtin-plugins.mjs` — whose order is load-bearing and whose couplings are declared nowhere. This plan replaces the implicit ordering with a declared, checkable one, additively: the manifest sits on top of the existing four-source loading model rather than replacing it.

### Wave context

Plan-group `compile-time-manifest-sdlc-server` ("Define compile-time plugin manifest for core-server"), Wave "Compile-Time Plugin Manifest" of the `sdlcforge-modernization` wave plan (lead project `core-server`). `core-server` is the plan-group's sole participant. It depends on plan-group `compile-time-manifest-framework`.

**This plan-group does not modify `plugable-express`.** It is a pure consumer of that framework's contract. Where `core-server`'s real plugin set meets a limit in that contract, the limit is flagged for the manager rather than worked around — the upstream design is finalized, so a real gap goes back there rather than being patched here. One such limit was found and is stated below.

### What must change

1. A `plugable.host` block in `core-server`'s `package.json` declaring the two plugin tiers no scan can discover: the five `explicitPlugins` names, and one `builtins` entry for `@sdlcforge/core-server` carrying its three in-tree components in normative load order.
2. Capability declarations — `provides` / `requires` / `optional` — for the three components `core-server` owns: `src/controls/`, `src/credentials/`, `src/integrations-issues-github/`.
3. A drift guard calling the framework's `verifyHostDeclaration()` from `core-server`'s own Jest suite, so the declaration cannot silently diverge from the real arrays.
4. A `make/56-plugin-graph.mk` fragment appending the validator to `TEST_TARGETS`, reaching `make test`, `make qa`, `bun run test`, and `bun run qa`.
5. Regression coverage proving the gate detects the absorbed-donor conflict, the `ynGa` rename shape, and the `credentialsDB` load-order shape.
6. Verification that the two motivating couplings whose requiring half lives in a third-party package — `@sdlcforge/dev-core`'s `projects` and `work` components — now resolve `satisfied` against `core-server`'s own declarations, since `dev-core` has since authored and shipped its own manifest declaring both requiring edges. See Phase 3, below.

### What must not change

- **`core-server`'s plugin-loading behavior.** The four loading sources, their order, and their semantics stay exactly as they are. The upstream framework does not modify `appInit` at all, so nothing in `core-server`'s runtime path should change either. The golden API spec and full-tier baseline snapshots must not move; movement is a regression, not an expected diff.
- **`@liquid-labs/plugable-express`.** Read-only reference for this plan-group.
- **The `builtinPlugins` aggregation policy.** All three submodules register under `core-server`'s own npm identity so `GET /server/plugins/list` renders one row rather than three. A `component` is a declaration and diagnostic identity only — it never becomes a load unit, a `loadedPluginNames` entry, or a `handlerPlugins` row.
- **`submodules` order in `src/lib/builtin-plugins.mjs`**, which is load order and is append-only by that file's own documented convention.

### Success criteria

- `core-server`'s `package.json` carries a `plugable.host` block declaring all six graph participants it composes, with builtin load order normative.
- The three in-tree components declare their real provides and requires, each citing the mechanism that performs the act.
- `verifyHostDeclaration()` runs in `make test` and fails when the declaration and the real arrays disagree.
- `make test` and `make qa` run the validator; a deliberately broken declaration turns the build red.
- Re-introducing any of the three absorbed donors is detected as a `conflict` naming both providers — including `liq-integrations-issues-github`, whose double-load is silent today.
- A `serverConfigRoot`-style rename in the framework produces an `unsatisfied` finding naming `src/credentials/`, rather than the `undefined`-propagating crash `ynGa` produced.
- The gate reports its own coverage boundary, distinguishing what it checked from what it assumed and from what it cannot see.
- Existing snapshots, unit tests, and integration tests pass unchanged.

### Hard constraints

- `@liquid-labs/plugable-express` reaches `core-server` through yalc, not npm. Uptake requires `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`), never a bare `bun install` — under Bun, a bare install re-copies a `file:` dependency's content without re-resolving its own dependency list, and a new transitive dependency silently never materializes while the install reports success. The same rule applies to `@sdlcforge/dev-core`, also yalc-linked.
- `.yalc/` is gitignored and absent from every fresh Flow task worktree. Tasks that run `bun install`, `make test`, or `make qa` need `create-worktree.sh --no-install-deps` followed by `scripts/provision-local-deps.sh`. That covers most tasks in this plan, since its validation steps are largely "run the gate" and the gate reads `node_modules`.

Four phases, 13 tasks total. The sequence `1 → 2 → 3 → 4` is hard: phase 2 populates the block phase 1 creates, phase 3 verifies the graph phase 2 declares, and phase 4 enforces the result. The phase summaries below carry each phase's goals, inputs, and outputs; task-level detail lives in each phase's own task documents under `plan/phase-0N-<slug>/`.

### Phase 1 — Framework uptake and host declaration (3 tasks)

Verify and refresh both stale yalc-linked packages (`@liquid-labs/plugable-express` alpha.58→alpha.59, `@sdlcforge/dev-core` pre-manifest→manifested) with a regenerated lockfile; add the `plugable.host` block declaring the five explicit plugins and the three ordered builtin components, structure only; wire `verifyHostDeclaration()` into the Jest suite so the declaration cannot drift before anyone trusts it. Sequential — each task depends on the prior one's output.

Detail: [`phases/framework-uptake-and-host-declaration.md`](./phases/framework-uptake-and-host-declaration.md).

### Phase 2 — Declare the in-tree component manifests (3 tasks)

Populate the three components' provides and requires from real source: `src/credentials/`'s `setupArg:serverConfigRoot` requirement (the in-tree half of `ynGa`), its `appExt:credentialsDB @ load` provide (the provider half of the ordering gap), `src/controls/`'s two setup methods and their `deps`, and `src/integrations-issues-github/`'s setup method and its two `conditional: true` integration provides. All three tasks are parallel-eligible (distinct components, no inter-dependency).

Detail: [`phases/declare-in-tree-components.md`](./phases/declare-in-tree-components.md).

### Phase 3 — Third-party coupling coverage (2 tasks)

Verify — not decide — that `@sdlcforge/dev-core`'s own already-shipped requiring edges (`projects` → `appExt:credentialsDB @ load`, `work` → `appExt:serverConfigRoot @ load`) resolve `satisfied` against core-server's Phase 1/2 declarations, using the framework's real validator; record the outcome. Sequential — task 2 records what task 1 verifies.

Detail: [`phases/third-party-coupling-coverage.md`](./phases/third-party-coupling-coverage.md).

### Phase 4 — Validation gate and regression coverage (5 tasks)

Add `make/56-plugin-graph.mk` appending to `TEST_TARGETS`; assert the regression shapes (absorbed-donor conflict, the `ynGa` rename shape, the third-party ordering edges); confirm the existing snapshots and runtime behavior are untouched; state the gate's coverage boundary in its own output. Task 1 (build gate) blocks tasks 2-4 (parallel-eligible regression assertions), which block task 5 (final confirmation).

Detail: [`phases/validation-gate-and-regression.md`](./phases/validation-gate-and-regression.md).

### Dependencies and parallelism

| Phase | Blocks | Notes |
|---|---|---|
| 1 | 2, 3, 4 | Sequential internally; first task is a mechanical two-package yalc refresh |
| 2 | 3, 4 | Three tasks parallel-eligible within the phase |
| 3 | 4 | Verification phase; sequential internally |
| 4 | — | Enforces everything above; tasks 2-4 parallel-eligible within the phase |

No cross-phase parallelism. Within-phase parallelism: Phase 2 (all 3 tasks) and Phase 4 (tasks 2-4, after task 1).

## What shipped

### Phase 01 — Framework Uptake And Host Declaration

1. **Verify And Refresh Framework Dependencies** (`001-verify-and-refresh-framework-dependencies.md`, tier `sonnet-med`) — Retry succeeded after manager merged main forward into the plan branch and re-cut the worktree. Re-verified dev-core dependency presence, ran yalc push from both sibling repos (plugable-express 1.0.0-alpha.59, dev-core 1.0.0-alpha.0), refreshed .yalc/ and bun.lock via provision-local-deps.sh --refresh-lock, verified uptake for both packages (previously-failing check now passes), and confirmed bun run build succeeds. Two commits on task branch; only bun.lock and the task doc's own Status note changed; no src/ file touched.
   Commit `f3f5527`, merged at `ae7c5d1`.

2. **Declare Plugable Host Block** (`002-declare-plugable-host-block.md`, tier `sonnet-med`) — Added plugable.host block to package.json declaring 5-name explicitPlugins and one builtins entry with 3 components (controls, credentials, issues-github) mirroring submodules order exactly, empty provides/requires. Extended builtin-plugins.mjs comment noting task 003's verifyHostDeclaration() as enforcement. Sanity-check against real readHostDeclaration reader passed exactly. Full Jest suite (40 tests) passes unchanged.
   Commit `2bf870a`, merged at `d09cfa9`.

3. **Add Host Declaration Drift Guard** (`003-add-host-declaration-drift-guard.md`, tier `sonnet-med`) — Exported explicitPlugins from app-init.mjs and added host-declaration.test.js wiring verifyHostDeclaration() against real explicitPlugins/builtinPlugins vs package.json's plugable.host block. Verified guard is non-tautological via a deliberate-mismatch check that correctly failed with host-declaration-explicit-stale, then reverted. Full suite passes (41 tests, 13 suites); diffs scoped exactly as required.
   Commit `62c494f`, merged at `3784924`.

### Phase 02 — Declare The In-Tree Component Manifests

1. **Declare Controls Component Manifest** (`001-declare-controls-component-manifest.md`, tier `sonnet-med`) — Populated controls component entry with 4 provides and 8 requires, all traced to real source. JSON valid, plugable-express-validate passes the task's own success criterion (no manifest-invalid naming controls). One cross-package violated-by-source-order finding surfaced against dev-core#orgs, correctly reflecting real load-order composition; out of this task's scope to fix.
   Commit `923eaf7`, merged at `af3aaab`.

2. **Declare Credentials Component Manifest** (`002-declare-credentials-component-manifest.md`, tier `sonnet-med`) — Populated credentials component entry: 2 provides (appExt:credentialsDB @ load, pathVar:credential @ load), 5 requires (setupArg:app/cache/registerPathVar/serverConfigRoot, appExt:serverConfigRoot @ runtime). Deliberately omitted credential:GITHUB_API and appExt:serverConfigRoot provides per task doc's ownership analysis. Added CredentialsDB construction-site comment documenting liq-credentials-db transitive coverage. Validated via plugable-express-validate; only unrelated dev-core findings surfaced.
   Commit `825fee6`, merged at `676aa76`.

3. **Declare Issues-Github Component Manifest** (`003-declare-issues-github-component-manifest.md`, tier `sonnet-med`) — Populated issues-github component entry with 10 provides, 6 requires, re-derived from src/integrations-issues-github/index.js and handler modules. Both integration:tickets and integration:pull request declared conditional:true per now-settled schema. credential:GITHUB_API requirement uses correct spelling, optional:true with reason. Only issues-github entry touched; sibling stub entries left untouched. plugable-express-validate surfaced only expected findings.
   Commit `12e4371`, merged at `6d1b14d`.

### Phase 03 — Third-Party Coupling Coverage

1. **Verify Dev-Core's Third-Party Requiring Edges Resolve Satisfied** (`001-verify-third-party-requiring-edges-satisfied.md`, tier `sonnet-med`) — Ran validatePluginSet against real package root. Both target edges resolved cleanly: dev-core#projects requires appExt:credentialsDB @ load -> satisfied-by-source-order; dev-core#work requires appExt:serverConfigRoot @ load -> satisfied via edge-present + no-failure-finding inference (orderVerdict null due to cross-phase precedence). No halt condition triggered. Verification-only task; no package.json or source file modified.
   Commit `09028a6`, merged at `bcf814f`.

2. **Record Third-Party Coupling Coverage Outcome** (`002-record-third-party-coverage-outcome.md`, tier `sonnet-low`) — Wrote up task 001's validator evidence as durable outputs: third-party-coupling-coverage.md gained Verified outcome section (literal verdicts, closes both headline bugs, mechanism explanation, coverage boundary, unrelated findings noted); manifest-ownership-boundary.md gained closing Resolution note, A-D analysis untouched. No source file outside plan/ touched.
   Commit `15cdda1`, merged at `e3fe558`.

### Phase 04 — Validation Gate And Regression Coverage

1. **Wire Plugin Graph Build Gate** (`001-wire-plugin-graph-build-gate.md`, tier `sonnet-med`) — Authored make/56-plugin-graph.mk and plugin-graph-gate.test.js implementing the manager's revised explicit-allowlist gate: exactly 2 known dev-core#orgs findings permitted, both chartered edges (credentialsDB, serverConfigRoot) asserted satisfied per Phase 3's exact verdict shapes, exitCode===1 asserted as expected steady state, coverage boundary and non-trivial node set asserted. Demonstrated-red proof performed and recorded. make test/bun run test fully green (14 suites/45 tests); make qa/bun run qa fail only at pre-existing unrelated lint stage.
   Commit `98ca0fa`, merged at `0a88625`.

2. **Assert Absorbed-Donor Conflict Regression** (`002-assert-absorbed-donor-conflict-regression.md`, tier `sonnet-med`) — Added plugin-graph-absorbed-donor-conflicts.test.js, test.each regression proving all 3 absorbed donors caught as conflict findings via synthetic donor records built from exported framework functions only. Discovered and corrected a factually-wrong cardinality assumption in the task doc (setupMethod: donors produce 2 conflict findings, not 1) while preserving full intent. Non-vacuousness verified. Full suite passes (15 suites/48 tests), new file lint-clean.
   Commit `11d4e1d`, merged at `3c4e80b`.

3. **Assert ServerConfigRoot Rename Regression** (`003-assert-serverconfigroot-rename-regression.md`, tier `sonnet-med`) — Added plugin-graph-serverconfigroot-rename.test.js proving supersedes: rename-affordance fires for a future serverConfigRoot rename. Deep-clones real FRAMEWORK_MANIFEST via structuredClone, renames both capability forms to synthetic V2 with supersedes: back to originals, asserts unsatisfied findings with supersededBy naming new capability, plus negative control on unmodified manifest, plus unmutated-source assertion. Non-vacuousness verified manually. Full suite passes (15 suites/49 tests).
   Commit `1a6f372`, merged at `41e9031`.

4. **Assert Third-Party Ordering Regression** (`004-assert-third-party-ordering-regression.md`, tier `sonnet-med`) — Added plugin-graph-third-party-ordering.test.js with 3 tests asserting the full edge (provider+requirer) for both chartered couplings against the real, unmodified graph. credentialsDB edge: satisfied-by-source-order. serverConfigRoot edge: orderVerdict null by schema design, confirmed via edge-presence + no-failure-finding. Third test independently confirms no failure finding names either triple. Added cross-reference comment in full-tier-baseline.test.js. No runtime source touched. make test passes (15 suites/48 tests).
   Commit `9233bea`, merged at `d997f7b`.

5. **Confirm No Regressions And State Coverage Boundary** (`005-confirm-no-regressions-and-coverage-boundary.md`, tier `sonnet-med`) — Confirmed no regressions across the whole plan-group: 17 suites/55 tests pass, all 4 golden/baseline snapshots byte-identical to pre-plan state, appInit()'s function body unchanged. Gate's real text report plainly states coverage boundary (framework/builtin/serverPackageRoot searched, dynamicPluginInstallDir/pluginPaths out of scope) - no gap to flag. All 4 mutation self-checks performed, each broke exactly the expected assertion, none vacuous, all reverted cleanly. git status clean before final commit.
   Commit `6300bb0`, merged at `9481bbb`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`YJdc`** — **[load-bearing/plan-scope] plan/sdlc-plugin-ma** — [load-bearing/plan-scope] plan/sdlc-plugin-manifest (and every task branch cut from it) was forked from main before the dev-core-migration plan-group merged into main. The task's premise (and plan/notes/2026-09-01-blocker-reverification.md) assumes @sdlcforge/dev-core is already core-server's real dependency/explicit-plugin — true on main, false on this plan branch. Manager needs to decide how to reconcile: rebase/merge main forward into plan/sdlc-plugin-manifest (and re-cut this task's worktree afterward), or some other resolution — before this task or any later task in the plan can proceed.

- **`K3cL`** — **bun.lock's regenerated content (from the succ** — bun.lock's regenerated content (from the successful Requirement 4 provisioning step) is sitting uncommitted in this worktree; finalize-task-commit.sh refused to commit it, citing a local yalc file: override mixed into the file. Whoever re-runs or continues this task after branch-reconciliation should be aware bun.lock will very likely need to be regenerated again anyway once the branch is brought current with main.

- **`xsRt`** — **finalize-task-commit.sh's yalc-override exclu** — finalize-task-commit.sh's yalc-override exclusion guard (check 3) is a generic heuristic assuming any package.json/lockfile diff adding a .yalc/ line is unwanted; this task's explicit purpose was committing exactly that. Consider a per-task/per-project opt-out for yalc-refresh-and-commit tasks so future agents don't need to work around it by hand.

- **`UPHX`** — **Pre-existing repo-wide bun run lint failures** — Pre-existing repo-wide bun run lint failures (230 problems, unrelated to any file this task touched) — not in this task's Validation scope, informational only.

- **`5jw7`** — **Task agent did not append a Status section to** — Task agent did not append a Status section to the task doc, believing it lived only in the plan worktree not the task worktree; task doc Status update may need separate handling.

- **`emWj`** — **Pre-existing unrelated make lint failures (23** — Pre-existing unrelated make lint failures (230 errors) elsewhere in repo, untouched by this task.

- **`CNMB`** — **plugable-express-validate surfaces one unsati** — plugable-express-validate surfaces one unsatisfied error and one info finding against dev-core#orgs/#work, pre-existing and outside this task's scope.

- **`Pwdb`** — **plugable-express-validate reports a real viol** — plugable-express-validate reports a real violated-by-source-order finding: @sdlcforge/core-server#controls requires appExt:_liqOrgs@setup from @sdlcforge/dev-core#orgs, but dev-core#orgs (Server Package Root, load position 5) loads after core-server's builtins (load position 0). Not resolvable within this task's scope; manager/plan should track whether a later phase (Phase 3 third-party coupling coverage, or the manifest-ownership-boundary note) is meant to address it.

- **`AkKx`** — **Task doc's own Validation section cites a non** — Task doc's own Validation section cites a nonexistent path src/controls/_lib/list-lib.mjs; real file is src/controls/handlers/orgs/controls/_lib/list-lib.mjs. Content traced correctly; only the doc citation is stale.

- **`bkRk`** — **Manifest-ownership-boundary four-option decis** — Manifest-ownership-boundary four-option decision (A-D) confirmed moot - both headline bugs closed via ordinary mechanism, no cross-repo manifest authoring needed.

- **`hXi1`** — **Task 002 should read the Status section's ful** — Task 002 should read the Status section's full explanation for the second edge rather than grep for a literal satisfied string.

- **`9PxP`** — **Two unrelated dev-core#orgs findings noted pe** — Two unrelated dev-core#orgs findings noted per Requirement 5, no action taken - out of this plan-group's participant set.

- **`sVnp`** — **plan/notes/plugin-set-inventory.md still read** — plan/notes/plugin-set-inventory.md still reads as an open question in two places; out of this task's edit scope per Requirement 3 which explicitly named it off-limits.

- **`mLm3`** — **bun run qa / make qa fail at lint stage due t** — bun run qa / make qa fail at lint stage due to 233 pre-existing ESLint errors across 5 files, confirmed byte-identical to main, unrelated to this task. This task's own new files introduce zero lint findings. Outside this task's scope to fix.

- **`W7f6`** — **Task 001's plugin-graph-gate.test.js already** — Task 001's plugin-graph-gate.test.js already asserts materially the same two-edge facts under its 2026-09-03 scope revision; not literally redundant but manager may want to note overlap or decide whether to trim later.

- **`oY1B`** — **Reconfirms task 001's already-flagged pre-exi** — Reconfirms task 001's already-flagged pre-existing lint failures, unaffected by this task.

- **`rB9S`** — **Task doc Requirement 3's exactly-one-finding** — Task doc Requirement 3's exactly-one-finding assertion is factually incorrect for setupMethod:-kind donors; manager may want to update wording for future readers.

- **`2wxr`** — **make lint-fix auto-modified 5 pre-existing un** — make lint-fix auto-modified 5 pre-existing unrelated files with residual errors; reverted, out of scope. Same pre-existing lint debt already tracked.

- **`KNaG`** — **make lint-fix surfaced pre-existing lint erro** — make lint-fix surfaced pre-existing lint errors in 5 unrelated files, reverted, out of scope. Same pre-existing lint debt already tracked from prior tasks.

- **`wSLZ`** — **app-init.mjs's export-list change is technica** — app-init.mjs's export-list change is technically not comment-only as Requirement 1 wording specifies, though it doesn't change appInit()'s observable behavior - minor wording-vs-reality gap, not a regression.

- **`yIza`** — **plugin-loading-tiers.md stale re manifest** — docs/architecture/plugin-loading-tiers.md:61 states the compile-time plugin manifest is "expected to eventually supersede the runtime explicitPlugins array" — this plan-group has now landed and enforced that manifest (package.json's plugable.host block, validated by make/56-plugin-graph.mk), but it coexists with explicitPlugins rather than superseding it. The "expected to eventually" framing is stale. Needs a decision on how to update this doc's status language (landed-and-enforced, not-yet-scheduled-to-supersede) — flagged by the Phase 4 gate reviewer as a plan-closeout judgment call, not a mechanical fix.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Framework Uptake And Host Declaration

- [x] [001-verify-and-refresh-framework-dependencies.md](./phase-01-framework-uptake-and-host-declaration/001-verify-and-refresh-framework-dependencies.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-01-001` · commit `f3f5527` · merge `ae7c5d1`
- [x] [002-declare-plugable-host-block.md](./phase-01-framework-uptake-and-host-declaration/002-declare-plugable-host-block.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-01-002` · commit `2bf870a` · merge `d09cfa9`
- [x] [003-add-host-declaration-drift-guard.md](./phase-01-framework-uptake-and-host-declaration/003-add-host-declaration-drift-guard.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-01-003` · commit `62c494f` · merge `3784924`

### Phase 02 — Declare The In-Tree Component Manifests

- [x] [001-declare-controls-component-manifest.md](./phase-02-declare-in-tree-components/001-declare-controls-component-manifest.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-02-001` · commit `923eaf7` · merge `af3aaab`
- [x] [002-declare-credentials-component-manifest.md](./phase-02-declare-in-tree-components/002-declare-credentials-component-manifest.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-02-002` · commit `825fee6` · merge `676aa76`
- [x] [003-declare-issues-github-component-manifest.md](./phase-02-declare-in-tree-components/003-declare-issues-github-component-manifest.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-02-003` · commit `12e4371` · merge `6d1b14d`

### Phase 03 — Third-Party Coupling Coverage

- [x] [001-verify-third-party-requiring-edges-satisfied.md](./phase-03-third-party-coupling-coverage/001-verify-third-party-requiring-edges-satisfied.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-03-001` · commit `09028a6` · merge `bcf814f`
- [x] [002-record-third-party-coverage-outcome.md](./phase-03-third-party-coupling-coverage/002-record-third-party-coverage-outcome.md) — tier `sonnet-low` · branch `plan/sdlc-plugin-manifest-03-002` · commit `15cdda1` · merge `e3fe558`

### Phase 04 — Validation Gate And Regression Coverage

- [x] [001-wire-plugin-graph-build-gate.md](./phase-04-validation-gate-and-regression/001-wire-plugin-graph-build-gate.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-04-001` · commit `98ca0fa` · merge `0a88625`
- [x] [002-assert-absorbed-donor-conflict-regression.md](./phase-04-validation-gate-and-regression/002-assert-absorbed-donor-conflict-regression.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-04-002` · commit `11d4e1d` · merge `3c4e80b`
- [x] [003-assert-serverconfigroot-rename-regression.md](./phase-04-validation-gate-and-regression/003-assert-serverconfigroot-rename-regression.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-04-003` · commit `1a6f372` · merge `41e9031`
- [x] [004-assert-third-party-ordering-regression.md](./phase-04-validation-gate-and-regression/004-assert-third-party-ordering-regression.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-04-004` · commit `9233bea` · merge `d997f7b`
- [x] [005-confirm-no-regressions-and-coverage-boundary.md](./phase-04-validation-gate-and-regression/005-confirm-no-regressions-and-coverage-boundary.md) — tier `sonnet-med` · branch `plan/sdlc-plugin-manifest-04-005` · commit `6300bb0` · merge `9481bbb`
