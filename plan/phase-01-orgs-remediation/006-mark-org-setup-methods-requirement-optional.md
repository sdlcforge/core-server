# Mark orgSetupMethods Requirement Optional

## Purpose and scope

Declare `orgs`' `appExt:_liqOrgs.orgSetupMethods` requirement `optional: true` in `package.json`'s `plugable` manifest block, update the drift-guard suite that pins the resulting finding set, and correct the README prose that currently presents this requirement as a permanently-unsatisfiable hard requirement.

Files:

- `package.json` (the `plugable` block only)
- `src/test/plugin-manifest.test.mjs`
- `README.md` — the `## The plugin manifest` section only

`README.md`'s `orgs` submodule / `Known defects` sections belong to task 007; coordinate by section, not by file, and expect to rebase if both land close together.

This task shares no source file with tasks 001-005, so it is parallel-eligible with all of them.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

### 1. The manifest edit

In `package.json` → `plugable` → `components` → the `orgs` component → `requires`, the entry currently reads:

```json
{
  "capability": "appExt:_liqOrgs.orgSetupMethods",
  "phase": "setup",
  "reason": "src/orgs/setup.mjs:46, inside 'process org setup'; the array is populated by liq-policy, outside this package"
}
```

Add `"optional": true`, placed to mirror the existing precedent in the same block — the `work` component's `integrationHook:controls/getQuestionControls` entry, whose key order is `capability`, `phase`, `optional`, `reason`. Rewrite the `reason` so it states *why* the requirement is optional, not only where it is read, again mirroring the precedent's phrasing ("... gates the call behind `hasHook` and skips the submitter-attestation step when no controls provider is registered").

The justification the new `reason` should encode: `src/orgs/setup.mjs:6-10`'s `prepare org dependencies` setup method (`deps: ['!']`, run-first) unconditionally initializes `app.ext._liqOrgs = { orgSetupMethods : [] }`, and `process org setup` (`deps: ['*']`, run-last, lines 15-19 and 43-54) iterates that array; an empty array enqueues nothing and the `DependencyRunner` completes as a no-op. The array is only ever populated by the external, unmanifested `liq-policy` package, which need not be installed.

Change nothing else in the block. In particular the two `appExt:credentialsDB` requirements stay non-optional — their absence is a real, unclearable gap, not a graceful degradation.

Keep `package.json` valid JSON with the file's existing indentation, and do not let an editor reorder or reformat unrelated keys.

### 2. The drift-guard suite

`src/test/plugin-manifest.test.mjs` pins the exact finding set at lines 128-141:

```js
expect(findingsShape).toEqual([
  'appExt:_liqOrgs.orgSetupMethods <- @sdlcforge/dev-core#orgs@setup (error)',
  'appExt:credentialsDB <- @sdlcforge/dev-core#projects@load (error)',
  'appExt:credentialsDB <- @sdlcforge/dev-core#work@runtime (error)',
  'integrationHook:controls/getQuestionControls <- @sdlcforge/dev-core#work@runtime (info)'
])
expect(result.counts).toEqual({ error : 3, warning : 0, info : 1 })
```

- The first entry's severity becomes `info`. The array is `.sort()`ed and the string still sorts first, so only that token moves.
- `result.counts` becomes `{ error : 2, warning : 0, info : 2 }`.
- `result.ok` stays `false` (two `error` findings remain), so the `'the graph is not overall-clean'` test at line 124 is unchanged. Do **not** "tidy" it into an overall-clean assertion — the suite's own comment forbids exactly that, and the `credentialsDB` gap is real.

**The prose comment at lines 112-122 must be rewritten, not just the assertion.** It currently names `appExt:_liqOrgs.orgSetupMethods` among the requirements that "legitimately report unsatisfied at `error` severity" and calls `integrationHook:controls/getQuestionControls` "the one optional hook". Both statements become false. The rewritten comment should say that two requirements report at `error` (both `appExt:credentialsDB`), that two report at `info` because they are declared `optional: true`, and that the `describe` block's purpose — do not tighten this into an overall-clean assertion — is unchanged. That comment is the part that protects the suite from a future reader; it is load-bearing.

Also re-read the earlier `test.each` blocks (lines 72-92) and the four-record assertion (lines 41-46) and confirm none of them depends on the changed severity. They should not; verify rather than assume.

### 3. The README manifest section

`README.md`'s `## The plugin manifest` section carries two statements this change falsifies:

- The bullet beginning "**The one *guarded* hook, `integrationHook:controls/getQuestionControls`, is declared — as `optional: true` with a `reason`.**" is no longer describing the only such declaration.
- The paragraph beginning "Three declared requirements are *expected* to report unsatisfied until the packages on their other side are manifested" lists `appExt:credentialsDB` twice plus `appExt:_liqOrgs.orgSetupMethods` — after this change only the two `credentialsDB` requirements belong in that count, and the sentence's own "Three" is wrong.

Rewrite both so the section reads truthfully:

- Two requirements are declared `optional: true` — `integrationHook:controls/getQuestionControls` (guarded by `hasHook`) and `appExt:_liqOrgs.orgSetupMethods` (an unconditionally-initialized empty array that a missing provider simply leaves empty) — and each reports at `info`.
- Two requirements remain expected `error`-severity findings, both `appExt:credentialsDB`.
- The "Two deliberate omissions" framing above them still holds for the six undeclared `integrationHook:` requirements in `work`; do not disturb it beyond what the changed facts require.

State the `optional: true` justification the same way the precedent bullet does: as a true statement about the code, not a severity dodge. Preserve the section's existing voice and its heading structure; the surrounding markdown follows the repository's sentence-case heading convention.

Do not touch `README.md`'s `### orgs submodule`, `#### Known defects (orgs submodule)`, or `#### The app.ext._liqOrgs contract` subsections — task 007 owns those.

### 4. Do not edit any other project

`@sdlcforge/core-server`'s `src/lib/test/plugin-graph-gate.test.js` hard-codes a two-entry `ALLOWLISTED_ERROR_FINDINGS` array (lines 31-42) and asserts its length (line 69). Once dev-core publishes this change, that gate fails until core-server drops the `appExt:_liqOrgs.orgSetupMethods` entry — which is exactly the "fresh look" its own comment at lines 28-30 asks for. **That is core-server's change to make, in core-server's own plan. Do not edit it.** Task 008 files the follow-up that tells core-server's maintainer.

## Validation

- `make test TEST=plugin-manifest` passes. This requires `@liquid-labs/plugable-express` to be installed: it is a declared `devDependency` present in `package-lock.json` but **absent from the working checkout's `node_modules/@liquid-labs/`**, so run `npm install` first or the suite cannot run at all.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` succeeds, and `git diff package.json` shows only the one requires-entry change.
- `make lint` is clean.
- Full `make test` shows no new failures beyond the pre-existing `project-lifecycle.test.mjs` failure (follow-up `2aMD`).
- `grep -n "Three declared requirements\|the one optional hook\|the one \*guarded\* hook" README.md src/test/plugin-manifest.test.mjs` returns nothing stale.
- `grep -rn "orgSetupMethods" README.md docs/ package.json src/` — every remaining mention is consistent with the requirement now being optional.
- `git status` in the task worktree shows only dev-core paths; specifically, no path under `sdlcforge/core-server` or `liquid-labs/plugable-express`.

## Metadata

architectural_impact: true

## Assumptions

- `optional: true` demotes an unsatisfied requirement from `error` to `info`. Verified against `plugable-express`'s `src/lib/plugin-graph/validate-plugin-graph.js:69` and `src/lib/validate-plugin-set.js:85` (the `strictOptional` flag exists to promote it back), and empirically against the already-shipped `integrationHook:controls/getQuestionControls` entry, which the current suite asserts at `(info)`.
- `docs/architecture.md:86` mentions this requirement's declaration but not its severity, so it needs no edit here. Phase 02's architecture-doc task re-reads it; if that line reads as stale after this change, flag it there rather than editing it now.
- `docs/dev-core-consolidation-contract.md` references the `plugable` block generally but names no severity; no edit expected. Confirm with a grep rather than assuming.

## References

- [manifest optional requirement](../notes/manifest-optional-requirement.md) — the full analysis, including the exact before/after of the assertion block and the downstream core-server consequence.
- `src/orgs/setup.mjs:6-19` and `:43-54` — the code that makes the requirement provably optional.
- `package.json` → `plugable` → `components[2]` (`work`) → last `requires` entry — the shape precedent to mirror.
- [`README.md`](../../README.md#the-plugin-manifest) — the section to correct.

## Procedure

1. Run `npm install` if `node_modules/@liquid-labs/plugable-express` is missing.
2. Capture the current finding set: `make test TEST=plugin-manifest` and note the failure or pass baseline.
3. Edit the `package.json` requires entry.
4. Re-run the suite, read the actual new finding shape and counts from the failure output, and update the assertion to match what the validator really produces rather than to what this document predicts. If they differ, halt and report the discrepancy.
5. Rewrite the suite's prose comment block.
6. Rewrite the two README statements.
7. `make lint`, then full `make test`.

## Checkpoint hints

- After the `package.json` edit and the observed new finding set is recorded.
- After the suite assertion and comment are updated and green.
- After the README section rewrite.

## Status

- **Outcome:** succeeded
- **Date:** 2026-09-04
- **Validation summary:**
  - `make test TEST=plugin-manifest` — passed (17/17). `node_modules/@liquid-labs/plugable-express` was already present in this worktree (freshly provisioned), so no `npm install` was needed.
  - `node -e "JSON.parse(...)"` — passed; `git diff <task_start_sha> -- package.json` shows only the one `requires`-entry change (adds `optional: true`, rewrites `reason`).
  - `make lint` — clean. Fixed one pre-existing `operator-linebreak` violation (lines 55-56, present before this task at `task_start_sha`) via `eslint --fix` as a same-diff self-fix, since the file was already part of this task's diff.
  - Full `make test` — 1 failed suite / 7 failed tests, all in `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` (pre-existing, follow-up `2aMD`); no new failures.
  - `grep -n "Three declared requirements\|the one optional hook\|the one \*guarded\* hook" README.md src/test/plugin-manifest.test.mjs` — no matches (clean).
  - `grep -rn "orgSetupMethods" README.md docs/ package.json src/` — every remaining mention is consistent with the requirement now being optional (verified `docs/architecture.md:86` and `docs/consumer-migration.md:233` name no severity, per this task's Assumptions).
  - `git status` — only `README.md` and `src/test/plugin-manifest.test.mjs` modified; no `core-server` or `plugable-express` paths.
- **Files touched:** `package.json`, `src/test/plugin-manifest.test.mjs`, `README.md`.
- **Assumptions applied:** all three `## Assumptions` entries held as stated; `docs/architecture.md:86` and `docs/dev-core-consolidation-contract.md` needed no edit (confirmed by grep, not just assumed).
