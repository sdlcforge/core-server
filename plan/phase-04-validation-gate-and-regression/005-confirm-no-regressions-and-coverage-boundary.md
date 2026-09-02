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
