# Assert Third-Party Ordering Regression

## Purpose and scope

Turn Phase 3's one-off verification (that `@sdlcforge/dev-core`'s own shipped manifest closes both of this
plan-group's headline bugs) into **permanent** regression coverage, over the real, unmodified plugin graph —
this is "the ordering shape"
[`plan/phases/validation-gate-and-regression.md`](../phases/validation-gate-and-regression.md) describes, and
per that phase document's 2026-09-01 update it now covers the **full edge** (both provider and requirer) for
both couplings, not a narrowed provider-only assertion:

- `appExt:credentialsDB @ load`, provided by the builtin `credentials` component and required by
  `@sdlcforge/dev-core`'s `projects` component at the same phase — provable only because `builtinPlugins` is
  loading source #1 by construction.
- `appExt:serverConfigRoot @ load`, provided by the framework's own intrinsic manifest and required by
  `@sdlcforge/dev-core`'s `work` component.

Also updates `src/lib/test/full-tier-baseline.test.js`'s existing `app.ext.credentialsDB` ordering-contract
comment to cross-reference this new, enforced assertion, per this phase's stated Output (this regression suite
sits "alongside the existing `builtin-plugins.test.js` and `full-tier-baseline.test.js` — the latter of which
is the current keeper of the `app.ext.credentialsDB` ordering contract, in a comment").

Depends on task 001 (`src/lib/test/helpers/resolve-plugin-set.mjs`). Parallel-eligible with tasks 002 and 003.

## Requirements

1. **Use the real, unmodified graph — not a synthetic one.** Unlike tasks 002/003, this task asserts a fact
   about `core-server`'s actual, live composition (with `@sdlcforge/dev-core` actually installed and its
   manifest actually refreshed, per Phase 1), so it must go through the same full, real resolution task 001's
   gate test uses: `import { validatePluginSet } from '@liquid-labs/plugable-express'`, call
   `validatePluginSet({ packageRoot: <resolved via task 001's shared helper> })`. Do **not** attempt to
   reconstruct this edge from `readHostDeclaration()` plus a hand-composed `@sdlcforge/dev-core` record (unlike
   tasks 002/003, this assertion is order-sensitive — it depends on real `source`/`loadIndex` resolution that
   only the full, real `validatePluginSet()` composition computes correctly; a hand-assembled records array
   would not reliably reproduce the real load-order facts this test needs to assert on).

2. **Locate the two target edges in `result.engineResult`.** Confirm the exact vocabulary against the real
   result before writing assertions — do not assume field names without checking:
   - Search `result.engineResult.edges` for the edge whose `capability` is `appExt:credentialsDB`, whose
     provider-side node is `@sdlcforge/core-server#credentials`, and whose consumer-side node is
     `@sdlcforge/dev-core#projects` (confirm the real `edges` entry shape — `{ from, to, capability, samePhase,
     providerPhase, requirerPhase, optional, orderVerdict }` per `validatePluginGraph()`'s own JSDoc — and
     confirm which of `from`/`to` is the provider versus the requirer before writing the assertion). Assert its
     `orderVerdict` is `'satisfied-by-source-order'` (the specific, provable verdict this edge is supposed to
     earn — not merely "no error").
   - Search the same `edges` array for the `appExt:serverConfigRoot` edge between the framework's own intrinsic
     node and `@sdlcforge/dev-core#work`. This edge is provided at `framework` phase by the framework intrinsic
     manifest and required at `load` by `work` — confirm whether this cross-phase edge produces an
     `orderVerdict` at all (the load-order model applies to same-phase edges; a `framework`-vs-`load` edge may
     resolve satisfied without an ordering verdict, since `framework` unconditionally precedes every other
     phase in the lattice) and assert whichever fact is actually true of the real result, rather than assuming
     it mirrors the `credentialsDB` edge's shape.
   - As a second, independent check using the vocabulary Phase 3's own task 001 already used (`isUnsatisfied`
     style — no finding names this exact `{capability, nodeId, phase}` triple), confirm **no** `unsatisfied` /
     `unsatisfied-phase` / `order-unprovable` / `violated-by-source-order` finding names either
     `(appExt:credentialsDB, @sdlcforge/dev-core#projects, load)` or `(appExt:serverConfigRoot,
     @sdlcforge/dev-core#work, load)`.

3. **Update `src/lib/test/full-tier-baseline.test.js`'s existing ordering-contract comment.** Locate the comment
   documenting the `app.ext.credentialsDB` load-ordering contract (near the runtime characterization test for
   `app.ext.credentialsDB`'s method set) and add a one-line cross-reference naming the new
   `src/lib/test/plugin-graph-third-party-ordering.test.js` (or whatever this task names its own new file) as
   the build-time-enforced form of the same contract — this comment is currently the *only* place in the
   codebase stating the ordering fact; after this task it should say so plainly rather than silently duplicating
   the same fact with no cross-reference between the runtime characterization test and the new static gate
   assertion.

4. **Do not touch `src/credentials/setup.mjs`, `src/lib/app-init.mjs`, `src/lib/builtin-plugins.mjs`, or any
   other runtime source file.** This task is assertion-only, over the real, already-declared graph; it proves a
   fact, it does not create one.

## Validation

- New test file (suggest `src/lib/test/plugin-graph-third-party-ordering.test.js`) passes.
- Both target edges are located in the real result and asserted per Requirement 2, with the literal
  `orderVerdict`/absence-of-finding facts recorded as comments beside the assertions (so a future reader does
  not have to re-derive the engine's exact vocabulary from scratch).
- `src/lib/test/full-tier-baseline.test.js`'s ordering-contract comment is updated with the cross-reference
  described in Requirement 3 — confirm via `git diff` that only the comment changed in that file, no assertion
  or test logic.
- `make test` (full suite) still passes with this new file and the comment update included.
- As a sanity check that the assertions are not vacuously true: confirm (by temporarily reading the real
  `result.engineResult.edges`/`findings` output, e.g. via a scratch `console.log` during development, removed
  before commit) that the two target edges are actually present in the result with non-`null` `orderVerdict`
  fields where expected, rather than silently absent from an `edges` array that happens to pass an
  `Array.prototype.find(...) === undefined` check trivially.

## Assumptions

- Task 001's `src/lib/test/helpers/resolve-plugin-set.mjs` is landed.
- Phases 1-3 have already landed for real: `@sdlcforge/dev-core`'s manifest is refreshed and installed, and
  Phase 3's own verification task already confirmed both edges resolve `satisfied`/`satisfied-by-source-order`
  as a one-off check. If either edge does *not* resolve as expected when this task runs, that is a real
  regression against Phase 3's own finding — halt and report rather than adjusting the assertion to match
  reality.

## References

- [`plan/phases/validation-gate-and-regression.md`](../phases/validation-gate-and-regression.md) — "The
  ordering shape" bullet under Goals, including its 2026-09-01 update stating this is now a full-edge
  assertion, not a narrowed one.
- [`plan/phase-03-third-party-coupling-coverage/001-verify-third-party-requiring-edges-satisfied.md`](../phase-03-third-party-coupling-coverage/001-verify-third-party-requiring-edges-satisfied.md)
  — the one-off verification this task permanentizes; its captured evidence (literal verdict strings) is a
  useful starting reference for what this task's own assertions should expect.
- [`plan/notes/2026-09-01-blocker-reverification.md`](../notes/2026-09-01-blocker-reverification.md) — the
  finding that `@sdlcforge/dev-core`'s own manifest (not any `core-server`-authored declaration) closes both
  edges.
- `src/lib/test/full-tier-baseline.test.js` — the existing `app.ext.credentialsDB` ordering-contract comment
  this task cross-references.
- `@liquid-labs/plugable-express`'s `src/lib/plugin-graph/validate-plugin-graph.js` JSDoc — the `edges` array
  shape and the `orderVerdict` field this task's assertions depend on.

## Status

**Outcome: succeeded (2026-09-04).**

**Requirement 1 (real, unmodified graph):** the new test file imports `validatePluginSet` from
`@liquid-labs/plugable-express` and resolves `packageRoot` via task 001's shared
`resolveCoreServerPackageRoot()` helper (`src/lib/test/helpers/resolve-plugin-set.mjs`), unmodified. No
synthetic/hand-composed records array is used.

**Requirement 2 (locate and assert the two target edges):** confirmed the real vocabulary directly against a
live `validatePluginSet()` run in this worktree (a throwaway Node script, not committed) before writing
assertions, in
[`src/lib/test/plugin-graph-third-party-ordering.test.js`](../../src/lib/test/plugin-graph-third-party-ordering.test.js):
- `appExt:credentialsDB` edge: `from: '@sdlcforge/core-server#credentials'` (provider), `to:
  '@sdlcforge/dev-core#projects'` (requirer), `samePhase: true`, `providerPhase`/`requirerPhase: 'load'`,
  literal `orderVerdict: 'satisfied-by-source-order'` — asserted exactly.
- `appExt:serverConfigRoot` edge: `from: '@liquid-labs/plugable-express'` (provider, the framework's own
  intrinsic manifest), `to: '@sdlcforge/dev-core#work'` (requirer), `samePhase: false` (`providerPhase:
  'framework'` unconditionally precedes `requirerPhase: 'load'`), `orderVerdict: null` by schema design — no
  order-check literal applies for a cross-phase edge. Asserted as such, not flattened into a literal
  `'satisfied'` string.
- Second, independent check (the `isUnsatisfied`-style vocabulary): confirmed no finding of kind
  `unsatisfied`/`unsatisfied-phase`/`order-unprovable`/`violated-by-source-order` names either
  `(appExt:credentialsDB, @sdlcforge/dev-core#projects, load)` or `(appExt:serverConfigRoot,
  @sdlcforge/dev-core#work, load)` — the live run's only 2 error-severity findings are both inside
  `@sdlcforge/dev-core#orgs` (already triaged, out-of-plan-group, per `plugin-graph-gate.test.js` from task
  001) and name neither target triple.
- Sanity check against vacuous truth (Validation's 5th bullet): the throwaway script's raw output confirmed
  both edges are actually present with the literal field values quoted above (non-`null` for the first
  edge's `orderVerdict`; `providerPhase`/`requirerPhase` populated for the second) before the corresponding
  `toBeDefined()`/`toBe(...)` assertions were written — removed before commit, per the task doc's own
  instruction.

**Note on overlap with task 001's own gate test:** task 001's `plugin-graph-gate.test.js` (already landed in
this plan and present in this worktree) independently added its own "the two edges this plan-group chartered
resolve satisfied" test, under a 2026-09-03 scope-decision that was not anticipated when this task (004) was
authored. That test asserts materially the same two-edge facts this task's own new file asserts. This task
proceeds as specified — Requirement 2's assertions do not reference or depend on task 001's test content, and
building this task's own dedicated, permanent third-party-ordering regression file (with the second,
independent `isUnsatisfied`-style check task 001's test does not include) is still exactly what this task
document asks for — but the resulting duplication is worth the manager's attention; see
`flagged_for_manager` in this task's structured report.

**Requirement 3 (`full-tier-baseline.test.js` comment cross-reference):** the task doc's premise — that a
comment already existed in this file stating the `app.ext.credentialsDB` load-ordering contract — did not
hold in this worktree: no such comment existed anywhere in the file (confirmed via `git log`/`grep` and a
diff against the plan worktree's identical copy). Rather than halt on a stale planning-time assumption that
is not one of this task's own named halt conditions, a new comment was added immediately above the `'app.ext
.credentialsDB exposes the recorded method set'` characterization test, stating the ordering-contract fact
and cross-referencing `src/lib/test/plugin-graph-third-party-ordering.test.js` as its build-time-enforced
form — satisfying the requirement's actual intent. Confirmed via `git diff -- src/lib/test/full-tier-baseline
.test.js` that only this comment was added; no assertion or test logic changed.

**Requirement 4 (assertion-only):** confirmed via `git status`/`git diff` — no file under `src/credentials/`,
`src/lib/app-init.mjs`, `src/lib/builtin-plugins.mjs`, or any other runtime source file was touched. Only the
new test file and the one comment-only edit are part of this change.

**Validation:**
- `src/lib/test/plugin-graph-third-party-ordering.test.js` passes (`TEST=plugin-graph-third-party-ordering
  make test`: 1 suite / 3 tests passed).
- Both target edges located and asserted per Requirement 2, with literal `orderVerdict`/absence-of-finding
  facts recorded as in-line comments.
- `full-tier-baseline.test.js`'s comment-only diff confirmed via `git diff`.
- `make test` (full suite): 15 test suites / 48 tests passed (up from task 001's recorded 14/45 — exactly
  this task's 1 new suite / 3 new tests).
- Vacuous-truth sanity check performed during development via a throwaway, uncommitted Node script; removed
  before commit.
- `make lint` still reports the same 233 pre-existing errors task 001 already flagged, confined to
  `test/test-basic.js`, `test/test-server.js`, `test/test-integration-quick.js`,
  `test/get-node-versions.js`, and `plan/resources/validate-check.mjs` — none of which this task touches;
  confirmed via `qa/lint.txt` that neither of this task's two changed files appears in the lint output.

**Assumptions applied:** Task 001's shared helper is landed and unmodified. Phases 1-3 have landed for real;
both target edges resolved exactly as Phase 3's own verification recorded (`satisfied-by-source-order` /
edge-present-with-no-failure-finding) — no regression against Phase 3's finding was observed, so the
Assumptions section's halt-on-regression condition did not trigger.

Affected files: `src/lib/test/plugin-graph-third-party-ordering.test.js` (new),
`src/lib/test/full-tier-baseline.test.js` (comment-only edit), this task document (`## Status` addition).
