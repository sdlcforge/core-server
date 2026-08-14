# Verify No Double-G References Remain

## Purpose and scope

`liq-work`'s `package.json` already depends on `@liquid-labs/plugable-defaults` (single-g) at `^1.0.0-alpha.4`, resolving successfully against a real npm publish. This plan-group's planning-time investigation (recorded in [double-g-sweep.md](../notes/double-g-sweep.md)) found no genuine double-g ("pluggable-defaults") content reference anywhere in this repo, and confirmed `liq-work`'s four `PLUGABLE_PLAYGROUND` import sites already match the resolved package's actual (correct, single-g) export names — only an incidental, expected bookkeeping artifact (this plan's own `.flow/plans/pluggable-defaults-rename.json`, plus this plan-group's own `plan/manifest.yaml`/`plan/TODO.yaml` entries and one already-merged historical sentence in `plan/plan-summary-modernization-foundation.md` referencing the unrelated `pluggable-express` package) carries the double-g spelling.

This task re-runs that sweep as a definitive, point-of-execution check — not a code-change task. No standard code-editing skill applies; this is a verification-only task using ordinary shell/grep tooling.

**Sequencing note**: this task depends on `pluggable-defaults`'s own phase 1 tasks (directory rename, GitHub repo rename via `gh`, `package.json` name/main/repository/bugs/homepage fixes, and the `src/locations.mjs` regression revert reinstating single-g `PLUGABLE_CLI_SETTINGS_PATH`/`PLUGABLE_PLAYGROUND`, their backing env vars, and the on-disk config-dir path segment) having landed first, so the "nothing to change" verdict is confirmed against the dependency's fully-corrected post-rename state. Do not dispatch this task until that upstream dependency has landed.

## Requirements

1. From the project root, re-run the full sweep documented in [double-g-sweep.md](../notes/double-g-sweep.md)'s Method section:

   ```bash
   git grep -ni 'pluggable' -- .
   git grep -ni 'liquid-labs/pluggable' -- .
   grep -rniI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=worktrees \
     --exclude-dir=.yalc --exclude-dir=dist --exclude-dir=test-staging --exclude-dir=qa \
     'pluggable' .
   grep -rniI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=worktrees \
     --exclude-dir=.yalc --exclude-dir=dist -E 'PLUG(G)?ABLE_(CLI_SETTINGS_PATH|PLAYGROUND)' .
   ```

2. Re-verify the naming-mismatch check: confirm which names `liq-work`'s `src/**` imports of `@liquid-labs/plugable-defaults` actually use (expected: `PLUGABLE_PLAYGROUND` only, at `src/handlers/work/resume.mjs`, `src/handlers/work/projects/_lib/remove-lib.mjs`, `src/handlers/work/_lib/pause-lib.mjs`, and `src/handlers/work/_lib/work-db.mjs`), and directly inspect the then-currently-installed `node_modules/@liquid-labs/plugable-defaults` package's actual exported names (e.g. via `grep -n "export const" node_modules/@liquid-labs/plugable-defaults/src/locations.mjs` or equivalent) to confirm they still match. If `liq-work`'s dependency spec (`^1.0.0-alpha.4` in `package.json`) has been bumped in the interim, note the new resolved version and re-confirm the exported names against it.
3. Re-verify the absence of any `PLUGABLE_*`/`PLUGGABLE_*` environment variable read/write or hardcoded config-directory path segment in this repo's own source, `README.md`, `Makefile`, or `package.json` (beyond the dependency spec itself).
4. Classify every match from steps 1–3:
   - **Bookkeeping artifact** (`.flow/plans/pluggable-defaults-rename.json`; this plan's own `plan/manifest.yaml`/`plan/TODO.yaml` entries; the already-merged historical `pluggable-express` mention in `plan/plan-summary-modernization-foundation.md:5`) — expected, not a defect, leave unchanged.
   - **Genuine content reference or naming mismatch** (a hardcoded link to `https://github.com/liquid-labs/pluggable-defaults`, prose spelling out "pluggable-defaults" double-g when naming the dependency, a `PLUGGABLE_*` double-g import/env-var usage, or an import name that no longer matches the resolved package's actual export name) — if any such match is found, this task must **not** silently fix it. Instead: stop, document the exact match(es) found (file, line, content) in this task document under a new `## Findings` subsection, and report the discrepancy back to the plan's manager/dispatcher as a flagged item rather than expanding scope unilaterally, since fixing it is outside what this task was scoped to change. Do not mark the task done with unresolved genuine matches unless directed otherwise.
5. If (as expected, per the planning-time investigation) no genuine content reference or naming mismatch is found: record that outcome plainly in this task document (a short `## Findings` note confirming "re-swept on <date>, no genuine double-g references or naming mismatches found, consistent with the planning-time investigation") and treat the task as complete with no code changes.
6. Make no source, doc, or config edits as part of this task unless step 4's genuine-match branch is triggered and a follow-up task is explicitly authorized — this task's default, expected outcome is a documented no-op.

## Validation

- All grep invocations from Requirements step 1, plus the import/export naming-mismatch check from step 2 and the env-var/config-path check from step 3, have been re-run at task execution time and their full output/results captured.
- Every match returned is classified per Requirements step 4; the classification and outcome are recorded in this task document's `## Findings` subsection.
- If zero genuine content or naming-mismatch matches were found: confirm no files were modified (`git status` shows no unexpected changes beyond this task document's own edit).
- If any genuine match was found: confirm it was documented, not silently fixed, and flagged back to the plan's manager rather than resolved in-task.

## Assumptions

- The planning-time investigation in [double-g-sweep.md](../notes/double-g-sweep.md) is expected to still hold at execution time; this task exists to confirm that expectation rather than because a change is anticipated.
- No `npm install`/build step is strictly required for this task's grep sweep, but step 2's naming-mismatch re-check does read the currently-installed `node_modules/@liquid-labs/plugable-defaults` package, so `node_modules/` must be present (installed) at execution time for that specific check to run against real, current package contents rather than being skipped.

## References

- [double-g-sweep.md](../notes/double-g-sweep.md) — the planning-time investigation this task re-verifies.
- `plan/manifest.yaml` (project root) — plan-group bookkeeping.
- `package.json` — the `@liquid-labs/plugable-defaults` dependency spec (`^1.0.0-alpha.4`).
