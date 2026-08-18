# Restructure Src Into Dev-Core Layout

## Purpose and scope

**Executes in the `liq-work` repository** (`/Users/zane/playground/liquid-labs/liq-work`), in this task's own worktree.

Move liq-work's entire `src/` tree in place so it already sits at the exact path it will occupy inside `@sdlcforge/dev-core` (`src/work/…`, per D2), add the `src/work/index.mjs` submodule entry point, and keep `@liquid-labs/liq-work` itself buildable, loadable, and publishable throughout by reducing its root `src/index.js` to a thin re-export.

This is a **near-pure relocation**: every file under `src/` except the root `src/index.js` moves, and **exactly one import specifier changes**. That discipline is not laziness — it is what makes the next task's `git merge --allow-unrelated-histories` a no-path-rewriting operation with history intact, and it is what keeps this task's diff reviewable as "files moved, one line changed."

This task depends on **both phase 7 tasks** having landed. It has **no dependency on `liq-projects` phase 1** and no dependency on dev-core.

## Requirements

1. **Verify phase 7 landed on your base.** Both are load-bearing for the file mapping below, and merging a half-remediated tree produces a mapping mismatch that phase 8 task 002 will trip over:
   - `git ls-files -s src | grep '^160000'` returns **nothing** (task 7-001), and `src/handlers/work/_lib/test/data/playground/orgA/proj1/package.json` is tracked.
   - `src/handlers/work/_lib/cross-link-dev-projects.mjs` exists, `src/handlers/work/_lib/test/cross-link-dev-projects.test.js` exists, and `grep -rn "liq-projects-lib" src/ package.json` returns **nothing** (task 7-002).

   If either is missing, **halt and report** which phase 7 task has not merged.

2. **Relocate the tree with `git mv`,** preserving rename detection. Two rules produce the whole mapping (D2 rule 2):

   | Rule | From | To | Count |
   |---|---|---|---|
   | Flatten — the redundant `handlers/work/` nesting collapses to `handlers/`, because the domain is now the submodule directory | `src/handlers/work/**` | `src/work/handlers/**` | **68** (65 today + phase 7 task 002's three additions) |
   | Move | `src/setup.mjs` | `src/work/setup.mjs` | 1 |
   | Move | `src/docs/Issues.md` | `src/work/docs/Issues.md` | 1 |

   **Measure the counts yourself rather than trusting this table** — phase 7 changed them, and phase 7 task 001's exact fixture-file additions are its own to decide. Capture `git ls-files src` before you start; it is the only baseline the census check below can honestly use.

   Concretely, `src/handlers/work/_lib/save-lib.mjs` → `src/work/handlers/_lib/save-lib.mjs`; `src/handlers/work/issues/_lib/add-lib.mjs` → `src/work/handlers/issues/_lib/add-lib.mjs`; `src/handlers/work/_lib/test/data/work-db-a/work-db.yaml` → `src/work/handlers/_lib/test/data/work-db-a/work-db.yaml`. Move whole directories where you can (`git mv src/handlers/work src/work-handlers-tmp` then into place, or `mkdir -p src/work && git mv src/handlers/work src/work/handlers`) rather than 66 individual moves.

   `src/docs/Issues.md` goes under the submodule, **not** into a root `docs/` — D3 reserves dev-core's root `docs/` for dev-core, and `src/docs/` is not that. It is inert to the build either way (the Make JS finder selects only `*.js`/`*.cjs`/`*.mjs`; the data finder selects only `*/test/data*`).

3. **Delete `src/handlers/index.js`.** It is the one-line `export * from './work'` shim; the submodule directory replaces it (D3). `git rm` it.

4. **Make the one required import rewrite.** In the relocated `src/work/setup.mjs`, line 3:

   ```
   -import { WorkDB } from './handlers/work/_lib/work-db'
   +import { WorkDB } from './handlers/_lib/work-db'
   ```

   This is the **only** import specifier in the entire package that the move invalidates, because `setup.mjs` is the only file that reached *across* the `handlers/work/` boundary. Everything else is verified safe:

   - All 11 `../../_lib/…` imports (in `handlers/work/{issues,projects}/_lib/`) still resolve, because the whole subtree moves uniformly — they now point at `src/work/handlers/_lib/…`.
   - Every other relative import is `./…` within a single directory.

   **If you find yourself editing a second import specifier, stop.** Something has diverged from the mapping; re-check rather than "fixing" it.

5. **Add `src/work/index.mjs`** — the submodule public surface required by D2 rule 3. It exports exactly `handlers` and `setup`, nothing else:

   ```js
   import { handlers } from './handlers'
   import { setup } from './setup'

   export { handlers, setup }
   ```

   Do **not** re-export the inert `name`/`summary`: per D5, `plugable-express`'s loader takes the plugin's identity from `package.json` and never reads those module exports, and per D2 rule 3 they are not part of a submodule's surface. Match the surrounding style (no semicolons); `make lint` is authoritative.

   Note for the next task: `src/work/handlers/index.js` builds its array with a plain literal and spreads (`[...issueHandlers, ...projectHandlers]`), with **no `handlers.push(...)` side-effect style** — so unlike liq-projects's `handlers/projects/index.js`, it composes cleanly into dev-core's fresh aggregator array with nothing to fix. Confirm this is still true and say so in the report.

6. **Reduce the root `src/index.js` to a thin re-export**, so `@liquid-labs/liq-work` keeps its own plugin contract byte-identical while the transition runs — same `handlers`, same `setup`, same inert `name`/`summary`, same Rollup entry, same `dist/liq-work.js`:

   ```js
   export * from './work'

   const name = 'core-work'
   const summary = 'Manages SDLC workflow as units of work.'

   export { name, summary }
   ```

   Keep `name` and `summary` here even though they are inert — this file's job in this task is to change nothing observable about the standalone package. The file is dropped entirely at absorb time (D3), where dev-core's own `src/index.mjs` supersedes it.

7. **Do not touch anything else.** No `package.json` change of any kind, no version bump, no `Makefile` edit, no `README.md` change (that is task 9-002), no dependency change, no lint-driven refactor of moved files, and no fix for any defect the source inventory records. The `Makefile`'s `CATALYST_NODE_PROJECT_LIB_ENTRY_POINT` still points at `$(SRC)/index.js`, which is still correct after requirement 6.

8. **Record the post-restructure file census in the task report**: the output of `git ls-files src | wc -l` and the full `git ls-files src` listing. Task 8-002's parity check needs this as a real measured baseline rather than a number derived from a plan document.

## Validation

- **File census.** `git ls-files src | wc -l` is **unchanged from the pre-task count you captured** — the relocation is count-neutral, and the one deletion (`src/handlers/index.js`) is exactly offset by the one creation (`src/work/index.mjs`). Derived from today's tree that number is **72**; confirm it against your own measurement rather than trusting the derivation. `git ls-files src/handlers` returns **nothing**. `find src -path 'src/handlers/*' -not -path '*/node_modules/*'` returns **nothing**. `git ls-files src/docs` returns nothing; `git ls-files src/work/docs/Issues.md` returns the file.
- **Moves are recorded as renames.** `git diff --cached -M --stat` (or `git show --stat -M` after committing) shows the relocations as renames at 100% similarity, **not** as delete+add pairs. This is precisely what makes task 8-002's `git log --follow` history check succeed, so treat a rename-detection failure as a blocker, not a cosmetic issue.
- **Content drift is exactly one line.** `git diff --cached -M` shows **zero** content changes inside relocated files **except** `src/work/setup.mjs`'s single import line. The only other content-bearing changes in this commit are: `src/index.js` reduced, `src/handlers/index.js` deleted, `src/work/index.mjs` added. Verify mechanically: `git diff --cached -M --numstat` should show `1 1` for `setup.mjs` and `0 0` for every other moved path.
- **Plugin contract unchanged — 30 routes.** Build, then load `dist/liq-work.js` with the `SlowBuffer` preload shim (see `## Assumptions`) and assert `handlers.length === 30`, `typeof setup === 'function'`, `name === 'core-work'`, `summary === 'Manages SDLC workflow as units of work.'`. Write the `(method, path)` pairs to a file and `diff` it against the same list captured **before** the move. The diff must be empty. **This check, not the test suite, is what actually protects the relocation** — coverage is 3.2% and every one of the 30 handlers is at 0%.
- **`setup` still behaves.** Against a stub `app` (`{ ext: { constants: {}, serverConfigRoot: '/tmp/x' } }`) and a recording `registerPathVar`, calling `setup` sets `app.ext.constants.WORK_DB_PATH` to `/tmp/x/work/work-db.yaml` and registers exactly one path var named `workKey` with `validationRe` `work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+`. Assert the key name is exactly `WORK_DB_PATH` and the var name exactly `workKey` — both D7-frozen.
- **The build artifact is unchanged in name and entry.** `make build` still produces `dist/liq-work.js` from `src/index.js`. Compare the new bundle's byte size against the pre-move one and explain any difference beyond noise — a relocation should produce a functionally identical bundle.
- **Tests are discovered at their new depth.** After a build, `test-staging/work/handlers/_lib/test/determine-projects.test.js` exists, proving the depth-agnostic `*/test/*` classification still works. `test-staging/work/handlers/_lib/test/data/playground/orgA/proj1/package.json` exists, proving the data finder still copies the fixture at its new depth.
- **The known failure set is unchanged.** `make test` reports the same suite and test counts as phase 7 left, with the **only** failure being `work-db.test.js`'s `SlowBuffer` `TypeError`. Record the exact summary line and compare it to phase 7's. Any new failure is a regression from this task.
- **Lint stays clean.** `make lint` passes with `src/work/index.mjs` present and every file at its new path.
- **No stray edits.** `git status --porcelain` shows nothing modified beyond this task's intended changes; `package.json`, `package-lock.json`, `Makefile`, and `README.md` are untouched.

## Metadata

architectural_impact: true

## Assumptions

- **A `SlowBuffer` preload shim is required to load `dist/liq-work.js` at all** on Node v26.5.0 — `buffer-equal-constant-time` dereferences the removed `SlowBuffer`. Write it to a scratch path outside the repository and use `node --require <shim> -e "…"`:

  ```js
  const buffer = require('node:buffer')
  if (buffer.SlowBuffer === undefined) {
    buffer.SlowBuffer = function SlowBuffer (n) { return Buffer.allocUnsafeSlow(n) }
    buffer.SlowBuffer.prototype = Object.create(Buffer.prototype)
  }
  ```

  **Measurement aid only — never commit it,** never put it in `src/`, never reference it from `package.json` or the `Makefile`. The defect is pre-existing and environment-wide (it breaks 5 of `liq-projects`'s 8 suites too) and is flagged to the manager; see the source inventory's W5/D1.
- **`make test` is not green and will not be green.** `work-db.test.js` fails to load for the reason above. The gate for this task is *"the failure set is unchanged"*, not *"green"*. Do not add an `overrides` entry, a `setupFiles` polyfill, or a `jest.mock` to make it pass — D11 forbids the dependency change and the remedy is a plan-group-level decision.
- **The test suite cannot detect a relocation regression** in anything except `determine-projects.mjs`, a sliver of `work-db.mjs`, and `crossLinkDevProjects`. Treat the 30-route parity diff and the `setup`-shape assertion as the real gate.
- **No defect is fixed here.** The undeclared `http-errors`, the unused `terminal-text`/`octokit` dependencies, `WorkDB#playgroundPath` (assigned, never read), and the two competing playground-resolution paths all migrate verbatim. Fixing any of them would also invalidate this task's "one line of content drift" validation.
- The `catalyst-scripts-node-project` devDependency stays exactly as it is. dev-core's toolchain is dev-core's business (D3, D8); liq-work contributes no `make/*.mk`, no `.sdlc-data.yaml`, and no `.catalyst-data.yaml` to conflict over.
- This task needs neither `liq-projects` phase 1 nor the dev-core checkout. Do not wait on them.

## References

- `plan/notes/liq-work-source-inventory.md` — section **W2** for the complete path mapping and the import-rewrite analysis proving exactly one specifier changes; **W1** for the 30-route table to diff against; **W7** for the `setup` contract to assert.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D2** (layout), **D3** (root-file ownership), **D4** (why restructure-then-merge), **D5** (plugin contract), **D11** (scope fences).
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-05-liq-orgs-migration/001-restructure-src-into-dev-core-layout.md` — the sibling task that ran this recipe on the smallest donor; consult it for anything left ambiguous.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js` — how `path` exports become Express routes, for the parity check.

## Checkpoint hints

- After requirement 1's phase-7 verification and after capturing the **pre-move** 30-route list, before any `git mv`.
- After all moves and the `src/handlers/index.js` deletion, with `git diff --cached -M --stat` showing pure renames.
- After the `setup.mjs` import rewrite, `src/work/index.mjs`, and the reduced root `src/index.js`, with `make build` green.
- After the route-parity diff, the `setup`-shape assertion, `make lint`, and the `make test` failure-set comparison, with the census recorded.
