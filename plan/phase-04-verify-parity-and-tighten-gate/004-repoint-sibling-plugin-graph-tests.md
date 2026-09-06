# Repoint Sibling Plugin-Graph Tests

## Purpose and scope

Sweep the three plugin-graph test files task 003 does not own for `@sdlcforge/dev-core` node IDs and stale premises, and repoint them onto their in-tree successors. `@sdlcforge/dev-core` no longer exists as an installed package, so every `@sdlcforge/dev-core#<component>` node ID in a test either matches nothing (a silently vacuous assertion) or fails outright.

Scope boundary: this task owns `src/lib/test/plugin-graph-third-party-ordering.test.js`, `src/lib/test/plugin-graph-serverconfigroot-rename.test.js`, and `src/lib/test/plugin-graph-absorbed-donor-conflicts.test.js`. It must not touch `plugin-graph-gate.test.js` (task 003), `full-tier-baseline.test.js`, or any snapshot (task 002).

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### 1. `plugin-graph-third-party-ordering.test.js` — the substantive one

Four live node-ID references and a stale premise throughout.

**Node IDs.** `'@sdlcforge/dev-core#projects'` → `'@sdlcforge/core-server#projects'` (the `e.to` in the `appExt:credentialsDB` edge lookup, and the `TARGET_TRIPLES` entry). `'@sdlcforge/dev-core#work'` → `'@sdlcforge/core-server#work'` (the `e.to` in the `appExt:serverConfigRoot` edge lookup, and its `TARGET_TRIPLES` entry).

**The edge shapes are unchanged and must stay asserted as they are.** `appExt:credentialsDB` remains `samePhase: true`, both phases `load`, `orderVerdict: 'satisfied-by-source-order'` — now provable because both nodes sit in the same builtin block at comparable `loadIndex` positions rather than across a builtin/explicit boundary. `appExt:serverConfigRoot` remains `samePhase: false`, `providerPhase: 'framework'`, `requirerPhase: 'load'`, `orderVerdict: null` by schema design. Do **not** flatten the `null` verdict into a literal `'satisfied'` while renaming.

**The stale premise.** The file's whole framing — its `describe` title, its header comment, and its test names ("third-party ordering", "dev-core#projects' … requirement", "against the real, unmodified graph") — describes a coupling *across a package boundary* that no longer exists. Both edges are now intra-builtin (or framework-to-builtin). Rewrite the header comment and the test names so they describe what is actually asserted; the regression coverage remains valuable, the "third-party" characterization does not.

The third test's closing comment ("the run's only 2 error-severity findings are both inside `@sdlcforge/dev-core#orgs`") is now false — the merged run has **zero** error-severity findings. Correct it rather than deleting it: it is the comment that tells a future reader why `matchingFailures` being empty is meaningful.

**Flagged decision, not a licence.** Renaming the *file* off `third-party` is arguably the honest end state, but a file rename is outside this task's stated sweep and would churn `make/56-plugin-graph.mk`-adjacent expectations and task-doc references. Keep the filename; record the mismatch and flag it for the manager as a possible follow-up.

### 2. `plugin-graph-serverconfigroot-rename.test.js` — comment only

One reference, in the header comment: "The third-party (`@sdlcforge/dev-core`) half of this same rename shape is covered separately by task 004 (`004-assert-third-party-ordering-regression.md`)". Both the package name and the referenced task path are stale (the task path belongs to a completed, torn-down plan). Update it to point at the sibling file by path (`src/lib/test/plugin-graph-third-party-ordering.test.js`) rather than at a plan document, and drop the "third-party" characterization.

The test body itself is unaffected: it is scoped to the in-tree `hostDeclaration.builtins` half of the graph, asserts against `@sdlcforge/core-server#credentials`, and clones `FRAMEWORK_MANIFEST`. `credentials`' `requires` still names both `setupArg:serverConfigRoot` and `appExt:serverConfigRoot`, so `loadCredentialsRenameTargets()`'s halt-rather-than-invent guard should not fire — if it does, report it rather than relaxing the guard.

Note that the builtin block now holds seven records rather than three, so `validatePluginGraph({ records: hostDeclaration.builtins })` in the negative-control test runs against a larger set. Its filter is scoped to `CREDENTIALS_NODE_ID` plus the two renamed capabilities, so the assertion should still resolve to `[]`; confirm it does rather than assuming.

### 3. `plugin-graph-absorbed-donor-conflicts.test.js` — verify, expect no change

This file carries no `@sdlcforge/dev-core` reference. Its three synthetic donors are the *predecessor* absorption's donors (`@liquid-labs/liq-credentials`, `@liquid-labs/liq-controls`, `@liquid-labs/liq-integrations-issues-github`), all still correct.

Two things to confirm rather than assume, since the builtin block grew from three records to seven:

- The `hostDeclaration.builtins.length === 0` guard at module scope still passes.
- Each case's `expectedFindingCount` (1 for the `pathVar:` case, 2 for the two `setupMethod:` cases) still holds, and `providerNodeIds` still has length 2. A newly-absorbed component providing one of the three colliding capabilities would break this — none does, per the merged manifest, but verify against the live run.

If all three cases pass unchanged, leave the file alone and record it as reviewed-and-correct. Consider whether the four newly-absorbed components deserve their own donor cases; that is a scope *extension*, so flag it rather than landing it.

### 4. Repo-wide sweep

Finish with a sweep for surviving node-ID references anywhere under `src/`:

```bash
grep -rn '@sdlcforge/dev-core#' src/
```

This must return nothing. A bare `@sdlcforge/dev-core` mention (no `#`) may legitimately survive in a historical comment; a `#`-suffixed node ID cannot, since no such node exists in the resolved graph.

## Validation

1. `grep -rn '@sdlcforge/dev-core#' src/` returns nothing.
2. `grep -n 'dev-core' src/lib/test/plugin-graph-third-party-ordering.test.js src/lib/test/plugin-graph-serverconfigroot-rename.test.js` returns only deliberate historical mentions, never a live node ID or a live claim about the current graph.
3. `TEST=plugin-graph make test` passes — this pattern covers all four `plugin-graph-*.test.js` files, so run it only after task 003 has landed; before that, scope to `TEST=plugin-graph-third-party-ordering` and `TEST=plugin-graph-serverconfigroot-rename` and `TEST=plugin-graph-absorbed-donor-conflicts` individually.
4. `plugin-graph-third-party-ordering.test.js`'s `appExt:serverConfigRoot` test still asserts `samePhase === false`, `providerPhase === 'framework'`, and `orderVerdict === null`; its `appExt:credentialsDB` test still asserts the literal `'satisfied-by-source-order'`.
5. `plugin-graph-absorbed-donor-conflicts.test.js` is either unchanged and recorded as reviewed-and-correct, or its change is explained.
6. `git diff --stat` shows at most three changed files, all under `src/lib/test/`, and none of them `plugin-graph-gate.test.js` or `full-tier-baseline.test.js`.

## Assumptions

- Task 001 has run and confirmed the merged graph resolves as predicted. These tests read the same real graph.
- Tasks 002 and 003 may be in flight concurrently; they own disjoint files, so no coordination is needed beyond not editing theirs.
- `make test` as a whole is not green at task start. A `TEST=`-scoped run touches `qa/.unit-test.passed`; task 005 clears it before its full run.
- The `resolveCoreServerPackageRoot(__dirname)` helper and its `walkUpCount` default of 3 are correct for every file in this task; none moves directory depth.

## References

- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#the-exact-outcome) — the resolved node list, the 42 edges, and every same-phase edge's verdict; the authority for what each repointed assertion should now find.
- `plan/resources/post-merge-graph-measurement.md` — task 001's live measurement in this worktree.
- [`plan/phases/verify-parity-and-tighten-gate.md`](../phases/verify-parity-and-tighten-gate.md) — goal 4, which charters this sweep.
- `src/lib/test/helpers/resolve-plugin-set.mjs` — the shared `packageRoot`/`package.json` helper all three files use.
