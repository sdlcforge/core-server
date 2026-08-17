# Absorb Projects Into Dev-Core

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `liq-projects`.

Bring the restructured `liq-projects` tree into `@sdlcforge/dev-core` as the `src/projects/` submodule, with liq-projects's git history preserved, its 16 runtime dependencies unioned in, the aggregator wired, and dev-core's full build/test/lint green with all 19 `/projects` routes present.

This is the first execution of the absorption recipe the other three donors follow, so the observed behavior of each step — especially the conflict set and the resolution — must be recorded in the task document's status notes for their benefit. If the recipe as written in dev-core's contract does not survive contact with reality, correct the contract document in the same change and say so prominently in the report.

## Requirements

1. **Establish the merge.** From the dev-core task worktree:
   - `git remote add liq-projects /Users/zane/playground/liquid-labs/liq-projects` (a local path remote; no network involved) and `git fetch liq-projects`.
   - Confirm the fetched branch actually contains the restructured tree (`git ls-tree -r --name-only liq-projects/main -- src | head`) **before** merging. If it still shows `src/handlers/projects/...`, phase 2 task 001 has not merged to that branch yet — halt and report rather than merging a pre-restructure tree.
   - `git merge --allow-unrelated-histories --no-commit liq-projects/main`, then resolve deliberately. `-X ours` would auto-resolve the root-file conflicts in dev-core's favor and is acceptable, but `--no-commit` plus explicit resolution is preferred here because this is the first run of the recipe and the conflict set itself is information the other three donors need.
2. **Resolve root-level paths in dev-core's favor, and drop donor package-level files.** Expected conflicts (dev-core's version wins, byte-for-byte): `package.json` (before the dependency union in requirement 3), `package-lock.json`, `.gitignore`, `Makefile`, `make/10-locations.mk`, `make/10-resources.mk`, `make/15-data-finder.mk`, `make/20-js-src-finder.mk`, `make/55-lint.mk`, `make/55-test.mk`, `make/95-final-targets.mk`, `.sdlc-data.yaml`, `README.md`. Expected clean arrivals that must be removed with `git rm`: `src/index.js` (liq-projects's thin re-export — dev-core's `src/index.mjs` supersedes it), `make/50-liq-projects-js.mk`, `.catalyst-data.yaml`. Verify the actual conflict/arrival set against this list and report any difference; do not silently accept an unexpected file.
3. **Union the dependencies.** Add all 16 of liq-projects's runtime `dependencies` to dev-core's `package.json`, preserving the exact ranges: `@liquid-labs/credentials-db-plugin-github ^1.0.0-alpha.5`, `@liquid-labs/federated-json ^1.0.0-alpha.34`, `@liquid-labs/git-toolkit ^1.0.0-alpha.16`, `@liquid-labs/github-toolkit ^1.0.0-alpha.20`, `@liquid-labs/http-smart-response ^1.0.0-alpha.6`, `@liquid-labs/liq-credentials-db ^1.0.0-alpha.7`, `@liquid-labs/liq-qa-lib ^1.0.0-alpha.9`, `@liquid-labs/npm-toolkit ^1.0.0-alpha.21`, `@liquid-labs/octocache ^1.0.0-alpha.4`, `@liquid-labs/playground-monitor ^1.0.0-beta.4`, `@liquid-labs/semver-plus ^1.0.0-alpha.11`, `@liquid-labs/shell-toolkit ^1.0.0-alpha.10`, `highlight.js ^11.9.0`, `http-errors ^2.0.0`, `natural-sort ^1.0.0`, `shelljs ^0.8.5`. Then `npm install` to refresh `package-lock.json`. Do not upgrade anything; do not add `@liquid-labs/liq-projects-lib` (this submodule has no dependency on it).
4. **Wire the aggregator.** In `src/index.mjs`: import `./projects`, spread its `handlers` into the exported array, and register its `setup` first in the ordered setup list — the position the contract requires, because it is what establishes `app.ext._liqProjects` and the GitHub credential registration for everything else.
5. **Fix the one relocation-forced content edit.** `src/projects/handlers/test/lib/test-calls-implied.mjs` asserts `expect(result).toBe('@liquid-labs/liq-projects')`. That value is derived at runtime from the nearest `package.json` relative to the test's own directory, which is now dev-core's, so the expectation becomes `@sdlcforge/dev-core`. Do not hardcode a second copy of the name elsewhere; change only the expectation.
6. **Port the documentation, do not copy the package's identity.** Bring liq-projects's accurate route table and plugable-express-integration description into dev-core (`README.md` and/or a `docs/` page — the README route table is the accurate artifact; the generated HTML was already discarded as stale). Rewrite it in dev-core's voice: routes are now served by `@sdlcforge/dev-core`, the `src/...` paths are the new submodule paths, and the `liq-projects` / `liq-projects-lib` disambiguation note is preserved in substance because that confusion is real and outlives the rename.
7. **Delete the carried-over dead code** in `src/projects/setup.mjs`: the ~35-line commented-out `installProjectPlugins` block referencing a no-longer-imported `LIQ_HOME()`. This is the one deliberate content cleanup in the absorption; it removes only comments, so behavior cannot change. Leave the misnamed `src/projects/handlers/test/close-implied.mjs` alone and surface it in the report.
8. **Verify green and record the numbers.** `npm install`, `make build`, `make test`, `make lint`, `make qa` — with the observed suite/test counts written into the task document's status notes alongside the pre-absorption baseline they are compared against.

## Validation

- **History preserved.** `git log --follow -- src/projects/setup.mjs` reaches commits authored in liq-projects before this plan (e.g. the pre-existing `registerPathVar` migration commit). Same check for one handler and one `_lib` module. A `--follow` that stops at the merge means the absorption lost history and must be redone.
- **File census.** Every path in the mapping is present: `git ls-files src/projects | wc -l` equals the count of files liq-projects had under `src/` after its restructure, minus the root `src/index.js` that was removed (capture liq-projects's post-restructure count first so this is a real comparison, not a guess). `find . -path './src/handlers*' -not -path './node_modules/*'` returns nothing.
- **No donor package-level file survived.** All of these return nothing: `git ls-files | grep -x '.catalyst-data.yaml'`, `git ls-files | grep -x 'src/index.js'`, `git ls-files | grep 'make/50-liq-projects-js.mk'`. `git ls-files Makefile make .sdlc-data.yaml .gitignore` shows exactly dev-core's own set.
- **Package identity intact.** `package.json` `name` is `@sdlcforge/dev-core`, `version` is unchanged from phase 1, `main` is `dist/dev-core.js`, `description` is dev-core's. `git diff` on those lines relative to phase 1's state is empty.
- **Dependency union complete.** All 16 ranges are present and byte-identical to liq-projects's; `npm ls --depth=0` resolves with no missing peer/unmet dependency errors; `package-lock.json` is committed and consistent (`npm ci --dry-run` or an equivalent check succeeds).
- **Build.** `make build` produces `dist/dev-core.js`; the bundle is externals-only (grep for `shelljs` source, expect none).
- **Route parity — 19 routes.** Load the built bundle and count: `handlers.length` is 19, and the set of `path`/`paths` arrays is identical to the pre-absorption liq-projects set. Diff the two lists mechanically (write both to files and `diff` them) rather than eyeballing. Confirm all ten operations from the README table appear in both explicit and implied form where the table says they should.
- **Setup shape and ordering.** `typeof setup === 'function'`; calling it against a stub `app` runs the `projects` setup first and leaves `app.ext._liqProjects` populated with `playgroundMonitor` and `playgroundPath`. Assert the `app.ext` key name is exactly `_liqProjects` — the frozen contract external consumers read.
- **Tests.** `make test` reproduces the liq-projects baseline: the same 8 suites and 29 tests, now under `src/projects/`, plus phase 1's smoke suite. Confirm the suite count actually rose by the smoke suite rather than a test silently going uncollected. The `project-lifecycle` suite's live-GitHub credential/network dependence is an environment condition to report, not a regression — but a module-resolution failure there **is** a regression.
- **`npmName` expectation.** `grep -rn '@liquid-labs/liq-projects' src` returns nothing; `grep -rn '@sdlcforge/dev-core' src/projects/handlers/test/lib/test-calls-implied.mjs` returns the corrected expectation.
- **Lint.** `make lint` and `make qa` pass with no new findings.
- **Dead-code removal is comment-only.** `git diff` on `src/projects/setup.mjs` (relative to the merged-in version) shows only removed comment lines — no executable line added, changed, or removed.
- **Old-path sweep.** `grep -rn --include='*.md' -E '(^|[/(])liq-projects\.js' . | grep -v node_modules` returns nothing in dev-core (the old build artifact name), and no dev-core doc claims to be `@liquid-labs/liq-projects`.

## Metadata

architectural_impact: true

## Assumptions

- Phase 1 (both tasks) and phase 2 task 001 have landed and been merged to their repositories' working branches. This task reads `liq-projects/main` (or whatever branch the manager names), not a task branch.
- `liq-projects`'s post-restructure file census and handler count were recorded by task 001 and are available; if they are not, derive them from `liq-projects` directly before merging so the parity checks have a baseline.
- The dev-core checkout can `npm install` from the registry for the 16 runtime dependencies. `@liquid-labs/playground-monitor` is at a `beta` range and the rest at `alpha` ranges; all resolve today for liq-projects, so a resolution failure here is an environment problem to report, not a range to "fix".
- `git merge --allow-unrelated-histories` is the sanctioned mechanic per dev-core's contract. Do not substitute a file copy, a `git subtree` split, or `git filter-repo` — losing history silently is the failure this recipe exists to prevent.
- No other absorption is running against dev-core concurrently.

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the absorption recipe (authoritative), root-file ownership, dependency-union rule, plugin contract, setup ordering.
- `plan/notes/liq-projects-source-inventory.md` — path mapping, the 16 dependencies, the 19-route table, the validation baseline, the `test-calls-implied.mjs` edit and why it belongs to this task, the dead-code and misnamed-test findings.
- `plan/notes/dev-core-target-shape.md` — decisions D3, D4, D5, D6, D7.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js` — how `path`/`paths` become Express routes, for the parity check.
- `/Users/zane/playground/liquid-labs/liq-projects/README.md` — the accurate route table and integration description to port.

## Checkpoint hints

- After the remote is added, fetched, and the fetched tree verified as restructured (before any merge).
- After the merge is resolved and the file census/no-donor-root-file checks pass, before touching `package.json`.
- After the dependency union and a successful `npm install` + `make build`.
- After the aggregator wiring and the `test-calls-implied.mjs` fix, with `make test` green.
- After the documentation port and the dead-code removal, with `make lint`/`make qa` green and the observed counts recorded.
