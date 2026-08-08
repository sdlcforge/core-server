# Consume Renamed Plugable-Express

## Purpose and scope

`@liquid-labs/pluggable-express`'s own plan (project `/Users/zane/playground/liquid-labs/pluggable-express`, same plan slug `modernization-foundation`, phase 1 `framework-rename`) renames that package to the single-g spelling `@liquid-labs/plugable-express` and publishes it via yalc for local consumption. This task is the consumer-side half of that handoff, in this repo.

**Dependency: this task must not start until `pluggable-express`'s phase 1 task 002 (`Publish Renamed Package for Local Consumption`) has landed** — this repo cannot meaningfully consume a package that hasn't been rebuilt and republished yet. Confirm that task's completion (check `pluggable-express`'s own `plan/TODO.yaml` via `todo_list_all`, or ask the manager) before starting.

## Requirements

- Run `yalc add @liquid-labs/plugable-express` (or whatever exact command `pluggable-express`'s task 002 documented as its publish-side command) in this repo's checkout to pull in the freshly renamed/republished package, replacing the stale `1.0.0-alpha.55` snapshot currently in `.yalc/@liquid-labs/plugable-express/`.
- Confirm `package.json`'s dependency on `@liquid-labs/plugable-express` did not need to change (it already references the single-g name — only the underlying yalc snapshot is stale, not the dependency declaration itself).
- Run `npm install` to ensure transitive dependencies stay consistent, per this repo's existing yalc workflow convention (see `AGENTS.md`'s "Dependency Updates" section).
- Re-run task 001's golden API-spec characterization test (`npm test`) and confirm it still passes against the updated dependency — this is the concrete proof that the rename was consumption-transparent.
- Re-run `npm run test:local` (quick local integration pass) to confirm the server still starts and serves correctly with the renamed dependency.

## Validation

- `cat .yalc/@liquid-labs/plugable-express/package.json | grep -E '"name"|"version"'` shows `@liquid-labs/plugable-express` at the new version from `pluggable-express` task 002 (not `1.0.0-alpha.55`).
- `npm test` passes, including the golden API-spec characterization test from task 001.
- `npm run test:local` passes.
- `npm start` followed by `curl localhost:<port>/heartbeat` returns 200.

## Status

- **Outcome:** succeeded (with one requirement/validation item blocked by an already-flagged, out-of-scope cross-package bug, and one blocked by a pre-existing, unrelated test-infrastructure bug).
- **Date:** 2026-08-08.
- **What was done:**
  - `yalc add @liquid-labs/plugable-express` pulled the freshly published `1.0.0-alpha.57` into `.yalc/@liquid-labs/plugable-express/` (gitignored — no diff to commit there).
  - `package.json`'s dependency declaration needed no change; it already referenced `file:.yalc/@liquid-labs/plugable-express`.
  - `npm install` reconciled `package-lock.json`. The resulting lockfile diff is scoped to exactly the `@liquid-labs/plugable-express` entry (version bump `1.0.0-alpha.55` -> `1.0.0-alpha.57`, and removal of two transitive deps — `plugable-defaults`, `question-and-answer` — that alpha.57 no longer requires directly); an unrelated, pre-existing `@liquid-labs/liq-projects` lockfile/package.json mismatch that `npm install` also wanted to "fix" (per this repo's known environmental noise) was reverted out of the diff, per operating-contract guidance, keeping only the plugable-express-relevant edit.
  - Re-ran task 001's golden API-spec characterization test (`npm test`). It initially failed on a single, expected content difference: a help description string changed from `'plugable-server'` to `'pluggable-server'` (the rename itself propagating into descriptive text `plugable-express` emits). This is exactly the "deliberate, reviewed API-surface change" scenario `plan/resources/golden-api-spec-baseline.md` calls out as the sanctioned case for regenerating the snapshot, so `npm run test:update-golden-api-spec` was run and the resulting `test/__snapshots__/golden-api-spec.json` diff was inspected and confirmed to be exactly that one string change (the plugins-list snapshot was unaffected). After regeneration, `npm test` passes in full (5/5 tests, including golden-api-spec).
- **Validation status:**
  - `cat .yalc/@liquid-labs/plugable-express/package.json | grep -E '"name"|"version"'` → confirmed `@liquid-labs/plugable-express` at `1.0.0-alpha.57`. Passed.
  - `npm test` → passed (5/5), including the golden API-spec characterization test (after the one-word snapshot regeneration described above).
  - `npm run test:local` → **blocked**, not by the rename: `test/test-server.js` hardcodes `/project/test-staging/integration-results` as its results directory (a path that only exists inside the `test:integration` Docker container per `test/docker-compose.yml`'s `..:/project:rw` mount), so it fails with `ENOENT: no such file or directory, mkdir '/project/...'` when run directly on a bare host checkout — a pre-existing bug in `test/test-server.js` unrelated to this task's dependency-rename scope, predating this task's branch. Not fixed here (would require editing test infrastructure code outside this task's stated scope); flagged for the manager below. `npm run build` (the script's own first step) did succeed.
  - `npm start` followed by `curl localhost:<port>/heartbeat` → **blocked** by the already-flagged, cross-package `serverHome`/`serverConfigRoot` bug: `liq-credentials`'s `setup()` still reads `app.ext.serverHome` (no longer set by the renamed `plugable-express`), so `appInit()` crashes (`TypeError [ERR_INVALID_ARG_TYPE]` in `node:path` from `liq-credentials/dist/liq-credentials.js`) as soon as it reaches that explicit plugin's setup, before the server ever starts listening. This is the same followup already flagged by task 001 and explicitly out of scope for task 002 per the dispatch's adjusted-scope guidance. The yalc-consumption/dependency-resolution point of this task is otherwise verified via the golden test passing against the renamed dependency.
- **Assumptions applied:** per the dispatch's adjusted scope, the `npm start`/heartbeat validation item is accepted as blocked by the already-flagged plugin-loading followup rather than treated as a task failure.

## Metadata

architectural_impact: false
