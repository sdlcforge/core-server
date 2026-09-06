# Delete Error Allowlist And Tighten Gate

## Purpose and scope

Remove `ALLOWLISTED_ERROR_FINDINGS` and its filtering logic from `src/lib/test/plugin-graph-gate.test.js` outright — not shrink the array, **delete it** — and replace the deliberately-recorded `'validation-failure'` / `exitCode: 1` assertions with unconditional `outcome === 'ok'`, `exitCode === 0`, `counts.error === 0`. Repoint the file's two `@sdlcforge/dev-core#…` edge assertions onto their in-tree successors, and rewrite the scope comment that justified the allowlist.

This is the deliverable the whole merge exists to make possible. The allowlist was never a policy choice — it was a workaround for a cross-package ordering problem and a stale manifest copy, and both causes are gone.

Scope boundary: this task owns `src/lib/test/plugin-graph-gate.test.js` and nothing else. The sibling graph tests are task 004; the snapshots are task 002.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### 1. Delete the allowlist and its machinery

Remove the `ALLOWLISTED_ERROR_FINDINGS` const (lines ~31–42), the `isAllowlisted` helper (~44–48), and every use of both in the first test. The `errorFindings.length !== ALLOWLISTED_ERROR_FINDINGS.length` branch and its `console.log` escape hatch go with them — keep a diagnostic dump, but key it on "any error finding at all" rather than on allowlist mismatch, so a future failure still prints the findings that caused it.

Both current entries disappear, for two different reasons worth stating in the rewritten comment:

- `violated-by-source-order` / `appExt:_liqOrgs.orgs` / `@sdlcforge/core-server#controls` — **resolved by Phase 3's reordering**. The edge flips to `orderVerdict: 'satisfied-by-source-order'`.
- `unsatisfied` / `appExt:_liqOrgs.orgSetupMethods` / `@sdlcforge/dev-core#orgs` — **cleared by Phase 1's drift clearance and downgraded to `info`** by carrying dev-core's *source* declaration (which has `"optional": true`) rather than the stale `.yalc` copy's. It also renames, to `@sdlcforge/core-server#orgs`.

### 2. Assert the predicted finding set, not merely "no errors"

Replace the removed assertions with:

- `expect(result.outcome).toBe('ok')`
- `expect(result.exitCode).toBe(0)`
- `expect(result.engineResult.counts.error).toBe(0)` — and, since they were measured, `counts.warning === 0` and `counts.info === 1` as well. Assert these as individual key reads; do **not** deep-equal the whole `counts` object unless you have first confirmed its exact key set against the live result.
- The full five-finding set: exactly **1 `info`** and **4 `debug`**, five findings total. The `info` is `kind: 'unsatisfied'`, capability `appExt:_liqOrgs.orgSetupMethods`, requirer `@sdlcforge/core-server#orgs`, at phase `setup`, and it is optional. The four `debug` findings are `kind: 'unmanifested-node'`, one per `@liquid-labs/sdlc-projects-*` explicit plugin.

`debug` findings are present in `findings` but are **not** tallied in `counts` — a `counts.info` of `1` alongside a `findings.length` of `5` is correct, not a contradiction. Do not "fix" that apparent mismatch.

Preserve the scoping discipline the dropped donor suite embodied: the rewritten comment must **name the one expected out-of-package gap explicitly** — `_liqOrgs.orgSetupMethods` is written only by `liq-policy`, which is not installed, and `orgs`' own setup unconditionally initializes the array empty so the requirement is genuinely optional — rather than asserting an unqualified "the graph is clean".

### 3. Repoint the two chartered edge assertions

The second test's two edges still exist and still deserve assertions; only their requirer node IDs move.

- `appExt:credentialsDB` — `edge.to` becomes `'@sdlcforge/core-server#projects'`. Its `orderVerdict` remains the literal `'satisfied-by-source-order'`. Consider also asserting `edge.from === '@sdlcforge/core-server#credentials'`, which the sibling third-party-ordering test already does and which is now an intra-builtin edge.
- `appExt:serverConfigRoot` — `edge.to` becomes `'@sdlcforge/core-server#work'`. Its provider is the framework's own intrinsic manifest, so `providerPhase === 'framework'`, `samePhase === false`, and `orderVerdict === null` **by schema design**, not by failure. Do **not** flatten this into a literal `'satisfied'` string during the rename; that distinction must survive.

The follow-on filter at ~103–106 (`finding.capability?.full === 'appExt:serverConfigRoot' || finding.requirer?.nodeId === '@sdlcforge/dev-core#work'`) repoints to `@sdlcforge/core-server#work` and must still resolve to `[]` — the only non-`debug` finding in the merged set names `#orgs`, not `#work`.

### 4. Update the non-trivial-graph test

The fourth test's expected node list contains `'@sdlcforge/dev-core#projects'`, which no longer exists. It becomes `'@sdlcforge/core-server#projects'`. Since the builtin block is now the whole absorbed set, extend the list to name all seven components — `credentials`, `projects`, `orgs`, `controls`, `issues-github`, `work`, `projects-audit`, each under `@sdlcforge/core-server#` — so the test proves the merged aggregate resolved rather than just that *some* nodes did.

### 5. Leave the coverage-boundary test alone

Coverage is unchanged by the merge: `sourcesSearched` is still `['builtin', 'serverPackageRoot']` and `outOfScope` still `['dynamicPluginInstallDir', 'pluginPaths']`. The third test needs no edit.

### 6. Strictness flags stay at their defaults

Do **not** pass `strictOptional: true`. It was measured and it *fails* (`{ error: 1 }` — the `orgSetupMethods` info promoted to an error). `strictOrder: true` was measured as still `ok`, with not one `order-unprovable` edge left, and is a genuine free improvement — but adopting it is not among this phase's outputs. If you judge it worth taking, flag it for the manager as a follow-up; do not land it here.

### 7. If a finding genuinely survives

The predicted result was measured against the real validator, so a surviving error finding most likely means one of task 001's two hazards. Re-read task 001's measurement record and `notes/merged-manifest-graph-projection.md`'s failure-mode section before concluding otherwise.

If a finding genuinely survives after both hazards are ruled out: keep **exactly that one** allowlisted, with a fresh justification comment explaining specifically why it is not resolvable in this phase, and report which finding it was and why. Do not weaken the assertion to pass an unexamined set, and do not silently re-allowlist a finding the merge introduced.

## Validation

1. `grep -n 'ALLOWLISTED_ERROR_FINDINGS\|isAllowlisted' src/lib/test/plugin-graph-gate.test.js` returns nothing (or, in the surviving-finding branch, exactly one deliberately-reintroduced allowlist entry carrying a fresh justification comment).
2. `grep -n 'dev-core' src/lib/test/plugin-graph-gate.test.js` returns nothing — including in comments, except a deliberate historical mention of the retired package.
3. The file asserts `outcome === 'ok'`, `exitCode === 0`, `counts.error === 0`, `counts.warning === 0`, `counts.info === 1`, and a total finding count of 5 (1 `info`, 4 `debug` `unmanifested-node`).
4. The `appExt:serverConfigRoot` edge assertion still asserts `providerPhase === 'framework'` and `orderVerdict === null`, not a literal `'satisfied'`.
5. The non-trivial-graph test names all seven `@sdlcforge/core-server#<component>` node IDs.
6. `grep -n 'strictOptional\|strictOrder' src/lib/test/plugin-graph-gate.test.js` returns nothing.
7. `TEST=plugin-graph-gate make test` passes.
8. `git diff --stat` shows exactly one changed file, `src/lib/test/plugin-graph-gate.test.js`.

## Assumptions

- Task 001 has run, confirmed neither hazard, and recorded the live finding set at `plan/resources/post-merge-graph-measurement.md` in the plan worktree. Assert against that measured record, not against this document's restatement of it, if the two ever disagree.
- `make test` as a whole is not green at task start (task 002 rebaselines the snapshots; task 004 repoints the sibling graph tests). Scope runs with `TEST=plugin-graph-gate`.
- A `TEST=`-scoped `make test` still touches `qa/.unit-test.passed` and `qa/.plugin-graph.passed`; task 005 clears both before its full run.
- `make/56-plugin-graph.mk` needs no change — it depends on the shared unit-test pass marker, and this task does not move the wiring.

## References

- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#headline-result) — the measured `outcome: 'ok'` result, the verbatim rendered report, the full five-finding table, and both strictness-flag measurements.
- `plan/resources/post-merge-graph-measurement.md` — task 001's live measurement in this worktree; the authority if it diverges from the projection.
- [`plan/phases/verify-parity-and-tighten-gate.md`](../phases/verify-parity-and-tighten-gate.md) — goals 3 and 4, including the "if a finding genuinely survives" branch.
- `src/lib/test/plugin-graph-gate.test.js` — the file this task rewrites; its `packageRoot`-via-helper requirement and its `beforeAll` single-resolution shape both stay as they are.
