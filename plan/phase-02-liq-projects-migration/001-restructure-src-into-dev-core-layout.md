# Restructure Src Into Dev-Core Layout

## Purpose and scope

**Executes in the `liq-projects` repository** (`/Users/zane/playground/liquid-labs/liq-projects`) — this repo's own task worktree, the ordinary case.

Relocate liq-projects's entire source tree, in place, to the exact paths it will occupy inside `@sdlcforge/dev-core` (`src/projects/…`), while keeping `@liquid-labs/liq-projects` itself fully green and publishable. This is what makes the following task's absorption a plain unrelated-histories merge with no path rewriting and with git history preserved.

Pure relocation plus the minimum wiring that relocation forces. No behavior change, no refactoring, no dependency change, no route change.

## Requirements

1. **Move the tree with `git mv`** (so rename detection and `--follow` work), per this mapping:
   - `src/setup.mjs` → `src/projects/setup.mjs`
   - `src/handlers/projects/` → `src/projects/handlers/` (the whole subtree in one move: 17 top-level handler modules including `document.js`, plus `index.js`, `_lib/` with its 14 modules and `_lib/test/` with 2 test files and 7 data fixtures, `test/` with its 6 `.test.mjs` files, the stray `close-implied.mjs`, and `test/lib/`'s 2 helpers, and `releases/` with its 2 handlers, `index.js`, and 3 `_lib/` modules)
   - `src/handlers/index.js` → deleted (a two-line re-export of `./projects` plus two commented-out `orgs` lines; it has no place in the new layout)
2. **Add `src/projects/index.mjs`** exporting exactly `{ handlers, setup }` — `handlers` from `./handlers`, `setup` from `./setup`. This is the submodule interface dev-core's aggregator consumes. Do not re-export anything else and do not add `name`/`summary` exports.
3. **Reduce `src/index.js` to a thin re-export** of `./projects`, preserving the package's current external contract exactly: it must still `export` `handlers` and `setup`, and it should keep the existing `name = 'core-projects'` / `summary` exports so that nothing about this package's published surface changes in this task (they are inert to the loader, but removing them is a separate decision that belongs with retirement, not with relocation).
4. **Delete the 32 stale generated HTML files under `docs/`** and remove `README.md`'s link to `docs/index.html`. They are unmaintained output with no build target — `Makefile`'s `DOC_TARGETS` is empty and no `make/*.mk` regenerates them — and they are demonstrably stale (`docs/handlers/projects/releases/prepare-and-publish.mjs.html` documents a module that no longer exists; the `publish.mjs`/`publish-implied.mjs` that replaced it have no page). Keep the rest of `README.md` accurate: after this task the route table is still correct, but every `src/...` path it names has moved, so update those paths (`src/handlers/projects/index.js` → `src/projects/handlers/index.js`, `src/handlers/projects/releases/index.js` → `src/projects/handlers/releases/index.js`, `src/index.js` unchanged).
5. **Do not touch** `package.json` (name, version, `main`, dependencies all stay), `Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `.catalyst-data.yaml`, or `.gitignore`. The root entry point stays `src/index.js`, so `make/50-liq-projects-js.mk` needs no edit — verify that rather than assuming it.
6. **Do not fix the pre-existing defects** this move walks past — surface them in the report instead:
   - `src/handlers/projects/test/close-implied.mjs` (moving to `src/projects/handlers/test/close-implied.mjs`) is missing the `.test` infix, so Jest never runs it while the Make source-finder still excludes it from the bundle. Move it as-is under its current name.
   - `src/setup.mjs` carries roughly 35 lines of commented-out `installProjectPlugins` dead code referencing a no-longer-imported `LIQ_HOME()`. Move it verbatim.
7. **Keep the package green** at its current baseline: `make build` produces `dist/liq-projects.js`; `make test` runs 8 suites / 29 tests; `make lint` is clean.

## Validation

- `git status --short` (or better, `git diff --stat -M HEAD`) shows the changes as **renames**, not delete/add pairs, for every moved file. Spot-check with `git log --follow -- src/projects/setup.mjs` and confirm it reaches pre-move history.
- File census: `git ls-files src | wc -l` before and after differ by exactly the expected amount — one file deleted (`src/handlers/index.js`), one added (`src/projects/index.mjs`), everything else moved. No file content changed except `src/index.js`, `README.md`, and the new/deleted files: confirm with `git diff -M --stat` that no moved file shows content modifications.
- No path under `src/handlers/` remains: `find src -path 'src/handlers*'` returns nothing.
- Import integrity: `grep -rn "from '\.\./\.\./" src` still shows exactly the three pre-existing cross-directory imports, now under `src/projects/handlers/releases/_lib/`, and they resolve.
- `make build` succeeds; `dist/liq-projects.js` is produced from `src/index.js`; the bundle stays externals-only (grep it for a dependency name such as `shelljs` and expect no inlined source).
- `make test` reports **8 passed suites / 29 passed tests**, matching the pre-task baseline in `qa/unit-test.txt`. If the `project-lifecycle` suite fails on credentials or network — it is a live-GitHub integration test reading `$HOME/.config/comply-server/credentials/db.yaml` and creating real repositories under the `liquid-labs` org — record the failure mode explicitly and confirm the other 7 suites pass; a resolution/module-not-found failure in that suite is a real regression, an authentication or network failure is an environment condition. Scope with `make test TEST=<pattern>` when iterating so the live suite is not exercised repeatedly.
- `make lint` passes with no new findings.
- `docs/` is gone from the working tree and from git: `git ls-files docs | wc -l` returns 0.
- No reference to the removed generated docs survives: `grep -rn 'docs/index.html' --include='*.md' --include='*.json' . | grep -v node_modules | grep -v worktrees` returns nothing.
- `README.md` names only source paths that exist: check each `src/...` path it mentions with `test -e`.
- `package.json` is byte-identical to its pre-task state (`git diff package.json` is empty).
- The exported surface is unchanged: `node -e` (CommonJS require against `dist/liq-projects.js`) reports the same `typeof setup` and `handlers.length` (19) as before the move. Capture the handler count before starting so the comparison is real.

## Assumptions

- Phase 1 has landed, so the target layout is fixed by dev-core's committed contract. This task does not need the dev-core checkout, only the convention.
- `liq-projects`'s working tree starts clean and green at the recorded baseline (8 suites / 29 tests, lint clean).
- `node_modules` is already installed in the task worktree; if it is not, `npm install` first — the Make targets locate their tool configs through `npm explore`.
- The 19-handler count is 17 pushed by `src/handlers/projects/index.js` plus 2 from `releases/index.js`.

## References

- `plan/notes/liq-projects-source-inventory.md` — the full path-mapping table, the validation baseline, the pre-existing defects to surface rather than fix, and the reason the `test-calls-implied.mjs` `npmName` assertion must **not** change in this task (it is still correct while the code lives in liq-projects).
- `plan/notes/dev-core-target-shape.md` — decisions D2 (layout), D4 step A (restructure-in-place rationale).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the committed contract; the layout convention there is authoritative.
- `/Users/zane/playground/liquid-labs/liq-projects/qa/unit-test.txt`, `qa/lint.txt` — the committed baseline reports.

## Checkpoint hints

- After capturing the pre-move baseline (handler count, suite/test counts, lint state).
- After the `git mv` moves and the `src/handlers/index.js` deletion, before any content edits.
- After `src/projects/index.mjs` and the reduced `src/index.js` are written and `make build` succeeds.
- After the `docs/` removal and `README.md` path updates.
- After the full `make test` / `make lint` run reproduces the baseline.
