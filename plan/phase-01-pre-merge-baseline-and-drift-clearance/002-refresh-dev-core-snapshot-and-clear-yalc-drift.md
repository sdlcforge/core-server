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
