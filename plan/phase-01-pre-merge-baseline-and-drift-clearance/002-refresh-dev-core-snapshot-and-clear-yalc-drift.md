# Refresh Dev-Core Snapshot And Clear Yalc Drift

## Purpose and scope

Clear the yalc drift in the installed `node_modules/@sdlcforge/dev-core` snapshot — it currently lacks `optional: true` on the `orgs` component's `appExt:_liqOrgs.orgSetupMethods` requirement, which `@sdlcforge/dev-core`'s own `main` HEAD carries (dev-core followup `x6x1`) — by refreshing the snapshot per this project's documented Bun procedure, then re-run the plugin-graph gate and tighten `src/lib/test/plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` from two entries to one, since the drift's finding downgrades from `error` to `info` once cleared. Depends on task 001 landing first: this task's lockfile refresh is exactly the operation that would otherwise first surface the npm-toolkit rename break as a live crash, and task 001 must already be in place so that does not happen.

## Requirements

role_doc: plugins/flow/roles/developer-node.md

1. Confirm task 001's commit is already present on this branch before starting.
2. Refresh the local dependency snapshot using this project's documented Bun procedure: `scripts/provision-local-deps.sh --refresh-lock` (equivalent to `rm -f bun.lock && bun install`, per `AGENTS.md`/`CLAUDE.md`'s Yalc Local Development section). This re-copies `.yalc/@sdlcforge/dev-core` from the main checkout — already confirmed to point at dev-core's current `main`, which carries `optional: true` on the `orgSetupMethods` requirement — and regenerates `bun.lock`.

   **`bun.lock` commit note:** `finalize-task-commit.sh`'s yalc-override guard refuses to commit `bun.lock` in this repository (followups `Z2Ar`, `xsRt`, `K3cL`). The accepted pattern is a documented manual commit: stage and commit `bun.lock` yourself with a plain `git commit` rather than relying on the automated commit path, and state explicitly in your task report that you did so.
3. Confirm the drift is cleared by inspecting the installed snapshot directly: `node_modules/@sdlcforge/dev-core/package.json`'s `plugable` block should now show `"optional": true` on the `orgs` component's `appExt:_liqOrgs.orgSetupMethods` requirement. Compare against the pre-refresh text quoted in `plan/notes/pre-merge-state.md`'s "Confirmed yalc drift" section.
4. Before editing any test file, invoke `validatePluginSet()` directly against the refreshed snapshot (a short throwaway script mirroring `plan/resources/validate-check.mjs`'s pattern, or the same `resolveCoreServerPackageRoot` helper `plugin-graph-gate.test.js` uses) and inspect the raw finding set. Confirm the finding previously keyed `kind: 'unsatisfied'`, `capabilityFull: 'appExt:_liqOrgs.orgSetupMethods'`, `requirerNodeId: '@sdlcforge/dev-core#orgs'` no longer appears at `error` severity — expect it to surface, if at all, as an `info`-severity finding instead. Do this before touching the allowlist so you are editing against an observed result, not an assumed one; running the existing Jest test unmodified at this point is expected to fail (it still expects two allowlisted entries against a graph that now produces one), which is normal and not a regression to chase.
5. Edit `src/lib/test/plugin-graph-gate.test.js`:
   - Remove the first entry from `ALLOWLISTED_ERROR_FINDINGS` (the `unsatisfied` / `orgSetupMethods` / `@sdlcforge/dev-core#orgs` entry), leaving exactly the second entry (`violated-by-source-order` / `appExt:_liqOrgs.orgs` / `@sdlcforge/core-server#controls`).
   - Update the file's scope-decision comment block above `ALLOWLISTED_ERROR_FINDINGS` (currently stating the real graph "returns exactly 2 error-severity findings") to state that exactly **one** allowlisted error-severity finding remains as of this phase, and record briefly why the first was dropped — the yalc snapshot drift was cleared, and the requirement's own source declaration already marks it `optional`.
   - Do not touch the second (`violated-by-source-order`) entry, or the test's assertions, beyond the array and its comment. That finding is a real, still-live pre-merge condition Phase 3/4 resolves, not this task.
6. Confirm the test now passes at `outcome: 'validation-failure'` / `exitCode: 1` with exactly one allowlisted error-severity finding, matching this phase's stated expected result.

## Validation

1. Direct inspection of `node_modules/@sdlcforge/dev-core/package.json`'s `plugable` block shows `"optional": true` now present on the `orgSetupMethods` requirement.
2. `src/lib/test/plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` array has exactly one entry (the `violated-by-source-order` one), and its scope comment reflects the new count and the reason for the drop.
3. `bun run test` (the plugin-graph gate suite) passes, reporting `outcome: 'validation-failure'`, `exitCode: 1`, and exactly one error-severity finding.
4. `bun.lock` is regenerated and manually committed per the commit note above — `git log --stat -- bun.lock` shows it committed on this branch, and the commit message states plainly that this is a documented manual commit working around the yalc-override guard.
5. `bun run lint` and the rest of `bun run test` remain green against the standing baseline (no new findings beyond followups `b3hk`/`mLm3`).
6. No `src/` file other than `src/lib/test/plugin-graph-gate.test.js` is touched by this task (task 001 already landed its own fix in a separate commit).

## Assumptions

- `.yalc/@sdlcforge/dev-core` in the main checkout already reflects `@sdlcforge/dev-core`'s `main` HEAD (confirmed by planning-time research); this task refreshes the *plan worktree's* copy from the main checkout via `provision-local-deps.sh`, it does not run `yalc push` from `dev-core` itself.
- If dependencies were already provisioned by task 001 (without `--refresh-lock`), this task's `--refresh-lock` run supersedes that installation regardless.

## References

- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md#confirmed-yalc-drift) — the drift's exact text, before and after.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — confirms the downgrade to `info` empirically once the source declaration is carried over.
- [`plan/resources/validate-check.mjs`](../resources/validate-check.mjs) — a prior ad hoc script in the same invocation style, usable as a starting point for the direct `validatePluginSet()` check in Requirements item 4.
- `../../scripts/provision-local-deps.sh` — the documented refresh procedure and its `--refresh-lock` flag.
- `plan/followups.yaml` items `Z2Ar`, `xsRt`, `K3cL` — the `bun.lock` manual-commit precedent.

## Status

**Outcome: contradiction (halted before editing `plugin-graph-gate.test.js`). Date: 2026-09-06.**

Confirmed task 001's commit (`f7f5b79`, "fix npm-toolkit `getPackageOrgAndBasename` rename break") is present on this branch's ancestry before starting.

Ran `scripts/provision-local-deps.sh --refresh-lock` (Requirement 2) — it completed successfully: it copied `.yalc/` from the main checkout (`/Users/zane/playground/sdlcforge/core-server`), removed `bun.lock`, and ran `bun install` cleanly (7 packages installed, lockfile regenerated). The resulting `bun.lock` diff is limited to ordinary transitive-dependency version bumps (`baseline-browser-mapping`, `browserslist`, `electron-to-chromium`, `postcss`, `undici`) — no `@sdlcforge/dev-core` content changed, because the *source* snapshot itself hadn't changed (see below).

**Requirement 3/4 could not be satisfied: the drift is not cleared.** Direct inspection of the refreshed `node_modules/@sdlcforge/dev-core/package.json`'s `plugable.components[orgs].requires` entry for `appExt:_liqOrgs.orgSetupMethods` shows it still **lacks** `"optional": true`, byte-identical to the pre-refresh text quoted in `plan/notes/pre-merge-state.md`'s "Confirmed yalc drift" section. Running `validatePluginSet()` directly against the refreshed snapshot (mirroring `plan/resources/validate-check.mjs`) confirms this empirically: the finding `[unsatisfied] @sdlcforge/dev-core#orgs requires ... _liqOrgs.orgSetupMethods ...` is still present at **`error`** severity (2 error-severity findings total, `counts: {error: 2, warning: 0, info: 0}`), not downgraded to `info` as Requirement 4 and the referenced `merged-manifest-graph-projection.md` note both expect.

**Root cause:** this task's `## Assumptions` states "`.yalc/@sdlcforge/dev-core` in the main checkout already reflects `@sdlcforge/dev-core`'s `main` HEAD (confirmed by planning-time research)". That is no longer true. Direct comparison shows:
- The main checkout's `.yalc/@sdlcforge/dev-core/package.json` (mtime 2026-09-02) lacks `optional: true` on the `orgSetupMethods` requirement.
- `/Users/zane/playground/sdlcforge/dev-core`'s actual `main` HEAD `package.json` (mtime 2026-09-04, commit `3cfb60a` "manifest optional:true edit + drift-guard suite update, green", further amended by `21b0926`) **does** carry `optional: true` on that same requirement.
- The two `plugable` blocks are not byte-identical beyond that one field either (confirmed via structural diff), consistent with `dev-core` having moved on since whatever `yalc push` last populated the main checkout's `.yalc/` copy.

So the main checkout's `.yalc/@sdlcforge/dev-core` snapshot is itself stale relative to `dev-core`'s current `main` — it was apparently never re-`yalc push`ed after `dev-core` commit `3cfb60a` landed the `optional: true` fix. `provision-local-deps.sh --refresh-lock` only re-copies from the main checkout's own `.yalc/`; per this task's own `## Assumptions`, refreshing `.yalc/@sdlcforge/dev-core` itself (running `yalc push` from `dev-core`) is explicitly **not** this task's job, and doing so would also mean writing into the main checkout, which is outside this worktree's boundary.

**Halted rather than guessing** which of two readings to honor:
1. Run only the documented worktree-local procedure (`provision-local-deps.sh --refresh-lock`) as literally specified — the drift is not cleared, so Requirements 3–6 / Validation checks 1–3 cannot be satisfied.
2. Also refresh the main checkout's `.yalc/@sdlcforge/dev-core` from `dev-core`'s current `main` (e.g. a fresh `yalc push` from the `dev-core` checkout) before re-running the provisioning script — this would likely clear the drift, but is explicitly out of scope per this task's own `## Assumptions` and would require writing outside this task's worktree.

No `src/` file was edited (Requirement 5/6 not attempted, per Requirement 4's own instruction to check the raw finding set before touching the allowlist). `bun.lock`'s regenerated content (harmless transitive-dependency bumps only) was committed manually per the task's documented `bun.lock` commit-note pattern, since `finalize-task-commit.sh`'s yalc-override guard excludes it from the automated commit; see the commit for that file. `node_modules` and `.yalc/` are gitignored and untouched by the commit.
