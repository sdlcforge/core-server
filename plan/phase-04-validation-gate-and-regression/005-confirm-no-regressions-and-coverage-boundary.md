# Confirm No Regressions And State Coverage Boundary

## Purpose and scope

Close out this phase's remaining two Outputs, both of which are cross-cutting and best verified once all of
tasks 001-004 are landed rather than piecemeal inside any one of them:
["Confirmation that existing behavior is untouched"](../phases/validation-gate-and-regression.md) (the golden
API spec and full-tier baseline snapshots unchanged, `appInit()` byte-identical) and the requirement that "a
stated coverage boundary" appear "in the gate's own output." This task also performs the mutation-style
self-check the dispatch context for this phase calls for: deliberately breaking each new regression assertion
in turn and confirming it — and only it — goes red, proving the four new test files this phase added
(tasks 001-004) each actually test what they claim to, rather than passing vacuously.

Depends on tasks 001, 002, 003, and 004 all being landed.

## Requirements

1. **Full-suite regression confirmation.** Run the complete `make qa` (which runs `make test` — including the
   new `make/56-plugin-graph.mk` gate — plus `make lint`) from a freshly provisioned worktree (per
   `scripts/provision-local-deps.sh`, this plan's standing requirement for any task that runs `bun install`,
   `make test`, or `make qa`). Confirm:
   - `test/__snapshots__/golden-api-spec.json`, `test/__snapshots__/full-tier-api-spec.json`,
     `test/__snapshots__/full-tier-plugins-list.json`, and `test/__snapshots__/full-tier-integrations-list.json`
     are all byte-identical to their pre-this-plan state (`git diff --stat test/__snapshots__/` shows no
     changes from this whole plan-group's work, not just this task) — any movement is a regression per this
     phase's own stated Output, not an expected diff.
   - `src/lib/test/golden-api-spec.test.js`, `src/lib/test/full-tier-baseline.test.js` (aside from the one-line
     comment task 004 added), `src/lib/test/app-init.test.js`, `src/lib/test/builtin-plugins.test.js`, and
     `src/lib/test/index.test.js` all still pass unchanged — `appInit()`'s observable behavior is untouched by
     this whole plan-group, since the upstream framework does not modify `appInit` at all and nothing in
     `core-server`'s own runtime path (`src/lib/app-init.mjs`, `src/lib/builtin-plugins.mjs`) should have
     changed either. Confirm via `git diff --stat` scoped to `src/lib/app-init.mjs`/`src/lib/builtin-plugins.mjs`
     across this whole plan-group's commits — expect no changes to either file's runtime logic (comment-only
     changes, if any, are acceptable; behavioral changes are not).

2. **Coverage-boundary statement, in the gate's own output.** Re-run the gate directly (e.g. re-run task 001's
   `plugin-graph-gate.test.js` with a temporary `console.log(result.report)`, or run
   `node -e "..."` against `validatePluginSet({ packageRoot: '.' })` from the repo root) and capture the
   rendered text report (`result.report`, `format: 'text'` default). Confirm it states, in its own words (per
   `@liquid-labs/plugable-express`'s `plugin-graph-renderer.js`, which is expected to render a coverage section
   from `result.coverage`), which loading sources were validated (`builtinPlugins`, Server Package Root) and
   that `dynamicPluginInstallDir`/`pluginPaths` are outside the guarantee. If the framework's own renderer does
   not already say this plainly for a host whose real `dynamicPluginInstallDir` differs from the Server Package
   Root (`core-server` passes `dynamicPluginInstallDir: COMPLY_HOME()`, a live, non-hypothetical distinction —
   see `src/lib/app-init.mjs`), that is a gap worth flagging in this task's report rather than silently
   papering over with an assertion that doesn't actually confirm the boundary is *stated*, not merely *true*.
   Do not modify the upstream renderer — if the statement is missing or unclear, note it as a flagged item for
   the manager rather than patching `@liquid-labs/plugable-express` from within this plan-group.

3. **Mutation-style self-check of the four new regression test files** (tasks 001-004's `plugin-graph-*.test.js`
   files). For each of the following, one at a time — make the change, run the specific test file alone (not
   the whole suite, to keep this fast), confirm it fails, then revert before moving to the next:
   - `plugin-graph-gate.test.js` (task 001): temporarily comment out one real `provides`/`requires` entry in
     `package.json`'s `plugable.host.builtins` (a different entry than task 001's own already-recorded
     demonstrated-red proof, if practical, to broaden coverage rather than repeat it) — confirm the test fails.
   - `plugin-graph-absorbed-donor-conflicts.test.js` (task 002): change one donor's synthetic colliding
     `provides` capability name to a non-colliding one — confirm the corresponding parameterized case fails.
   - `plugin-graph-serverconfigroot-rename.test.js` (task 003): remove the `supersedes:` entry from the
     synthetic clone (if task 003's own validation didn't already leave this as a permanent negative-control
     assertion — check first) — confirm the `supersededBy` assertion fails.
   - `plugin-graph-third-party-ordering.test.js` (task 004): temporarily change one target edge's expected
     `orderVerdict` string to an incorrect value — confirm the assertion fails.
   Record each mutation, the observed failure, and the revert in this task document's `## Validation` section.
   This is a manual, one-time verification, not a permanent code change or a new dependency (no mutation-testing
   framework such as Stryker is introduced — none exists in this codebase today, and this task does not add
   one; "mutation-tested" here means the self-check performed manually per this requirement).

4. **Final housekeeping check.** Confirm `git status` in the task's own worktree shows no unintended leftover
   changes from the mutation self-checks in Requirement 3 (every temporary break was reverted) before this
   task's own commit.

## Validation

- `make qa` passes cleanly on a freshly provisioned worktree, including the plugin-graph gate.
- All four checked-in golden/baseline snapshot files are byte-identical to their state before this plan-group's
  work began (`git diff` against the pre-plan commit, or equivalent evidence, shows no changes).
- `src/lib/app-init.mjs` and `src/lib/builtin-plugins.mjs` carry no behavioral changes across this whole
  plan-group (comment-only changes acceptable).
- The captured gate report text (Requirement 2) is quoted or attached in this task's own commit
  message/PR description, along with a one-line verdict on whether it adequately states the coverage boundary
  — and, if not, a flagged item is raised for the manager rather than silently accepted.
- All four mutation self-checks (Requirement 3) are recorded with their observed failures and confirmed
  reverts.
- `git status` is clean of any leftover mutation artifacts before this task's final commit.

## Assumptions

- Tasks 001-004 are all landed and green individually before this task starts.
- This task does not add, remove, or modify any regression assertion itself — it only exercises and confirms
  the ones tasks 001-004 already added. If a mutation self-check (Requirement 3) reveals that an existing
  assertion does *not* fail when it should, that is a defect in the corresponding task's own test, not
  something to silently patch here — flag it and, if small enough to fix inline without expanding this task's
  scope, fix it in the affected test file directly; if not, report it rather than guessing at a fix.

## References

- [`plan/phases/validation-gate-and-regression.md`](../phases/validation-gate-and-regression.md) — the
  "Confirmation that existing behavior is untouched" and "stated coverage boundary" Outputs this task closes
  out.
- [`001-wire-plugin-graph-build-gate.md`](./001-wire-plugin-graph-build-gate.md),
  [`002-assert-absorbed-donor-conflict-regression.md`](./002-assert-absorbed-donor-conflict-regression.md),
  [`003-assert-serverconfigroot-rename-regression.md`](./003-assert-serverconfigroot-rename-regression.md),
  [`004-assert-third-party-ordering-regression.md`](./004-assert-third-party-ordering-regression.md) — the
  four sibling tasks whose output this task confirms.
- `test/__snapshots__/` and `src/lib/test/full-tier-baseline.test.js` — the snapshot/baseline files this task
  confirms are unmoved.
- `@liquid-labs/plugable-express`'s `src/lib/plugin-graph-renderer.js` — the renderer whose coverage-boundary
  output this task inspects (read-only; not modified by this plan-group).

## Status

**Outcome: succeeded (2026-09-04).**

**Requirement 1 (full-suite regression confirmation).** `make test` (fresh, markers cleared first): 17 test
suites / 55 tests, all pass, including all four of this phase's new `plugin-graph-*.test.js` files.
`git diff --stat 79b318f..HEAD -- test/__snapshots__/golden-api-spec.json test/__snapshots__/full-tier-api-spec.json
test/__snapshots__/full-tier-plugins-list.json test/__snapshots__/full-tier-integrations-list.json` (79b318f is
this plan branch's merge-base with `main`) shows **no output** — all four checked-in golden/baseline snapshots
are byte-identical to their pre-plan state. `src/lib/test/golden-api-spec.test.js`, `app-init.test.js`,
`builtin-plugins.test.js`, and `index.test.js` carry zero diff across the whole plan-group;
`full-tier-baseline.test.js` carries exactly task 004's own recorded one-comment addition (confirmed
comment-only via `git diff`). `src/lib/builtin-plugins.mjs`'s only diff across the plan-group is a
comment-only expansion (confirmed via `git diff`) explaining the `submodules`/`plugable.host.builtins`
ordering-agreement contract task 003 (phase 1) enforces. `src/lib/app-init.mjs`'s diff is one line:
`export { appInit }` → `export { appInit, explicitPlugins }`, landed by phase-01 task-003
("add-host-declaration-drift-guard") so `src/lib/test/host-declaration.test.js` can import the real
`explicitPlugins` array to verify it against `package.json`'s declarations. `appInit()`'s own function body is
byte-identical; only the module's export list gained one additional named export. This is additive-only (no
existing caller's behavior changes) but is not literally "comment-only" as this Requirement's validation text
states — flagged below for the manager's awareness rather than silently waved through.

**Requirement 2 (coverage-boundary statement).** Ran `validatePluginSet({ packageRoot: '.' })` directly
against this worktree's real, full graph and captured `result.report` (text format, the default):

```
2 error(s), 0 warning(s), 0 info; 12 resolved plugin node(s), 4 unmanifested plugin node(s).
Searched: framework, builtin, serverPackageRoot. Note: 'dynamicPluginInstallDir' and 'pluginPaths' are outside this gate's guarantee - a plugin loaded only from one of those sources is not accounted for here.
```

`result.coverage` (JSON): `sourcesSearched: ["builtin", "serverPackageRoot"]`,
`outOfScope: ["dynamicPluginInstallDir", "pluginPaths"]`, plus a `notes` entry restating the boundary in
prose. **Verdict: the statement adequately states the coverage boundary.** It plainly names the sources
searched (`framework`, `builtin`, `serverPackageRoot`) and explicitly calls out `dynamicPluginInstallDir` and
`pluginPaths` as outside the gate's guarantee, in prose a reader does not have to infer — a live,
non-hypothetical distinction for `core-server`, which passes `dynamicPluginInstallDir: COMPLY_HOME()`
(`src/lib/app-init.mjs`). No gap to flag; the upstream renderer already says this plainly.

**Requirement 3 (mutation self-check, all four, one at a time, each reverted before the next):**

1. `plugin-graph-gate.test.js` (task 001): in `package.json`, renamed `controls`'s `requires` entry
   `"pathVar:orgKey"` → `"pathVar:orgKey_BROKEN_FOR_DEMO"` (a `requires`-side mutation, deliberately different
   from task 001's own recorded `provides`-side break, to broaden coverage). Ran `TEST=plugin-graph-gate make
   test`: the allowlist-count assertion failed as expected (`Expected: 2, Received: 3` error-severity
   findings; 1 failed / 3 passed of 4 tests), traceable specifically to `plugin-graph-gate.test.js`. Reverted
   via `git checkout -- package.json`; re-ran `TEST=plugin-graph-gate make test`: 4/4 pass again.
2. `plugin-graph-absorbed-donor-conflicts.test.js` (task 002): changed the `liq-controls` case's
   `collidingCapability` from `'setupMethod:load org controls'` to a non-colliding
   `'setupMethod:load org controls_MUTATION_SELF_CHECK_NONCOLLIDING'`. Ran
   `TEST=plugin-graph-absorbed-donor-conflicts make test`: exactly that parameterized case failed (1 failed / 2
   passed of 3). Reverted via `git checkout --`; re-ran: 3/3 pass again.
3. `plugin-graph-serverconfigroot-rename.test.js` (task 003): the task doc's own permanent-negative-control
   check (verifying task 003 didn't already leave this as a standing assertion) — none exists; the `supersedes:`
   line lives only inside the file's `cloneFrameworkManifestWithRename()` helper, added fresh at test-run time,
   not as a separate always-on negative-control test. Temporarily removed the `supersedes: [renameEntry.removed]`
   field from that helper's generated clone entry. Ran `TEST=plugin-graph-serverconfigroot-rename make test`:
   the `supersededBy` assertion failed specifically (`expect(finding.supersededBy).toBeTruthy()` → received
   `null`), while `result.ok === false` and the negative control both still passed (1 failed / 3 passed of 4) —
   exactly the isolated failure this assertion is supposed to guard against being vacuous. Reverted; re-ran:
   4/4 pass again.
4. `plugin-graph-third-party-ordering.test.js` (task 004): changed the `appExt:credentialsDB` edge's expected
   `orderVerdict` from `'satisfied-by-source-order'` to an incorrect
   `'satisfied-by-source-order-MUTATION_SELF_CHECK_WRONG'`. Ran `TEST=plugin-graph-third-party-ordering make
   test`: exactly that assertion failed (`Expected: "...WRONG", Received: "satisfied-by-source-order"`; 1
   failed / 2 passed of 3). Reverted; re-ran: 3/3 pass again.

**No defect found in any of the four sibling tasks' own tests** — every mutation produced the expected,
specific failure and only that failure; per this task's own Assumptions, there is nothing to fix inline.

**Requirement 4 (final housekeeping).** After all four mutate/revert cycles, `git status --short` produced no
output (confirmed twice — once immediately after the fourth revert, and again after the final fresh `make
test` run below) — no leftover mutation artifacts.

**Final validation run:** cleared `qa/.unit-test.passed`/`qa/.plugin-graph.passed`/`qa/unit-test.txt` and ran
`make test` fresh: 17 suites / 55 tests, all pass, `qa/.plugin-graph.passed` present. `bun run test`: passes
(no-op on the immediately-following invocation since the marker was already fresh). `bun run qa`: **fails**,
but only at the `lint` stage — `make lint` reports the same 233 pre-existing errors tasks 001/002/004 already
flagged, confined to `test/test-basic.js`, `test/test-server.js`, `test/test-integration-quick.js`,
`test/get-node-versions.js`, and `plan/resources/validate-check.mjs`, none of which this task touches. This
matches the dispatch context's own confirmed-pre-existing, tracked-as-followup condition; not treated as a
Requirement-1 failure of `make qa`, per that context. `git status --short` is clean at the end of this run.

Affected files: this task document (`## Status` addition) only. No source, test, or `package.json` file
carries any net change from this task — every mutation performed for Requirement 3 was reverted before the
next step, and Requirement 1's confirmed diffs (`app-init.mjs`, `builtin-plugins.mjs`,
`full-tier-baseline.test.js`) all predate this task, landed by phase-01 task-003 and phase-04 task-004
respectively.

**Flagged for the manager:**
- `src/lib/app-init.mjs`'s export-list change (`export { appInit }` → `export { appInit, explicitPlugins }`,
  landed by phase-01 task-003) is not literally "comment-only" as this task's own Requirement 1 / Validation
  text specifies, though it does not alter `appInit()`'s own observable behavior (function body byte-identical)
  and is required plumbing for `host-declaration.test.js`'s drift guard. Worth a one-time acknowledgment that
  this task's Requirement 1 wording was slightly stricter than what the plan-group's own prior, legitimate work
  actually produced.
