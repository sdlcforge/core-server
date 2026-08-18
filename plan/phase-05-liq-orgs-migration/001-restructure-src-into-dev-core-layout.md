# Restructure Src Into Dev-Core Layout

## Purpose and scope

**Executes in the `liq-orgs` repository** (`/Users/zane/playground/liquid-labs/liq-orgs`), in this task's own worktree.

Move liq-orgs's entire `src/` tree in place so it already sits at the exact path it will occupy inside `@sdlcforge/dev-core` (`src/orgs/…`, per D2), add the `src/orgs/index.mjs` submodule entry point, and keep `@liquid-labs/liq-orgs` itself green, loadable, and publishable throughout by reducing its root `src/index.js` to a thin re-export.

This is a **pure relocation**. No import is rewritten, no logic is touched, no defect is fixed. That is not laziness — it is what makes the next task's `git merge --allow-unrelated-histories` a no-conflict, no-path-rewriting operation with history intact, and it is what keeps this task's diff reviewable as "files moved, nothing changed."

This task has **no dependency on `liq-projects` phase 1** and can run at any time.

## Requirements

1. **Resolve the dirty working tree first, and do not silently discard it.** `git status` currently shows an uncommitted `package.json` modification adding:

   ```
   "@liquid-labs/playground-monitor": "file:.yalc/@liquid-labs/playground-monitor",
   ```

   The plan's finding, verified: nothing in `src/` imports `@liquid-labs/playground-monitor` (liq-orgs reaches the playground monitor only through `app.ext._liqProjects.playgroundMonitor`, which needs no dependency), and `.yalc/` is gitignored so the entry could never resolve for a registry consumer. It is `yalc add` residue.

   **Recommended action: revert it** (`git checkout -- package.json`) and note the revert in the task report. If your own re-verification contradicts the finding — i.e. you find a real import — **halt and report** instead. Either way, state explicitly in the report what you did to this file, because it is a user working-tree change and the user is entitled to know it was touched. Do **not** commit the entry as-is: an unresolvable `file:` dependency in a package about to be published as a final release is a defect.

   Untracked `.flow/`, `worktrees/`, `.yalc/`, and `yalc.lock` are expected and must be left alone.

2. **Relocate all 12 surviving source files with `git mv`,** preserving rename detection. The redundant `handlers/orgs/` nesting flattens to `handlers/` because the domain is now the submodule directory (D2 rule 2); `resources/` rides along unchanged.

   | From | To |
   |---|---|
   | `src/setup.mjs` | `src/orgs/setup.mjs` |
   | `src/handlers/orgs/index.js` | `src/orgs/handlers/index.js` |
   | `src/handlers/orgs/create.mjs` | `src/orgs/handlers/create.mjs` |
   | `src/handlers/orgs/list.mjs` | `src/orgs/handlers/list.mjs` |
   | `src/handlers/orgs/parameters-detail.mjs` | `src/orgs/handlers/parameters-detail.mjs` |
   | `src/handlers/orgs/parameters-list.mjs` | `src/orgs/handlers/parameters-list.mjs` |
   | `src/handlers/orgs/parameters-set.mjs` | `src/orgs/handlers/parameters-set.mjs` |
   | `src/handlers/orgs/_lib/parameters-lib.mjs` | `src/orgs/handlers/_lib/parameters-lib.mjs` |
   | `src/resources/organization.mjs` | `src/orgs/resources/organization.mjs` |
   | `src/resources/lib/settings.mjs` | `src/orgs/resources/lib/settings.mjs` |
   | `src/resources/lib/test/settings.test.mjs` | `src/orgs/resources/lib/test/settings.test.mjs` |

   Use `git mv` rather than `mv` so the moves are staged as renames.

3. **Delete `src/handlers/index.js`.** It is the one-line `export * from './orgs'` shim; the submodule directory replaces it (D3). `git rm` it.

4. **Add `src/orgs/index.mjs`** — the submodule public surface required by D2 rule 3. It exports exactly `handlers` and `setup`, nothing else:

   ```js
   import { handlers } from './handlers'
   import { setup } from './setup'

   export { handlers, setup }
   ```

   Match the surrounding code's style (no semicolons are used inconsistently here — follow what `src/handlers/orgs/index.js` does; ESLint is authoritative and `make lint` must stay clean). Do **not** re-export the inert `name`/`summary` — they are not part of a submodule's public surface under D2 rule 3, and per D5 the loader never reads them.

5. **Reduce the root `src/index.js` to a thin re-export**, so `@liquid-labs/liq-orgs` keeps its own plugin contract byte-identical while the transition runs — same `handlers`, same `setup`, same inert `name`/`summary`, same Rollup entry point, same `dist/liq-orgs.js`:

   ```js
   export * from './orgs'

   const name = 'core-orgs'
   const summary = 'Manage org level settings.'

   export { name, summary }
   ```

   Keep `name` and `summary` here even though they are inert — this file's job in this task is to change nothing observable about the standalone package. The file is dropped entirely at absorb time (D3), where dev-core's own `src/index.mjs` supersedes it.

6. **Rewrite no imports.** Verified in the plan: every intra-package import is relative and the whole subtree moves uniformly, so all four resolve unchanged (`./resources/organization` from `setup.mjs`, `./lib/settings` from `organization.mjs`, `../settings` from the test, `./_lib/parameters-lib` from the two `parameters-*` handlers). If you find yourself editing an import specifier inside a moved file, something has diverged from the mapping — stop and re-check rather than "fixing" it.

7. **Do not touch anything else.** No `package.json` metadata change (beyond requirement 1's revert), no version bump, no `.catalyst-data.yaml` edit, no `make/*.mk` edit, no README creation (that is phase 6 task 002), no dependency change, and — explicitly — **no fix for the four `model`-reading handlers or the `create` stub**. Those defects migrate verbatim; see `## Assumptions`.

8. **Record the post-restructure file census in the task report**: the output of `git ls-files src | wc -l` and the full `git ls-files src` listing. Task 002's parity check needs this as a real measured baseline rather than a number derived from the plan document.

## Validation

- **Green at the same baseline.** `make build`, `make test`, `make lint`, `make qa` all pass. `make test` reports **1 test suite, 37 tests passing** — identical to the pre-move baseline. A changed test count means a suite was silently dropped or double-collected by the Make source-finder and must be investigated, not accepted.
- **The build artifact is unchanged in name and entry.** `make build` still produces `dist/liq-orgs.js` from `src/index.js` via `make/50-liq-orgs-js.mk`. That file is untouched by this task.
- **The relocated test is still discovered.** Confirm `test-staging/orgs/resources/lib/test/settings.test.js` exists after a build (the Babel stage mirrors `src/` into `test-staging/`), proving the depth-agnostic `*/test/*` finder in `make/20-js-src-finder.mk` still classifies it as a test at its new depth.
- **File census.** `git ls-files src` lists exactly 13 paths: `src/index.js`, `src/orgs/index.mjs`, and the 11 relocated files. `git ls-files src/handlers` returns nothing. `find src -path 'src/handlers/*'` returns nothing.
- **Moves are recorded as renames.** `git diff --cached -M --stat` (or `git show --stat` after committing) shows the relocations as renames with 100% similarity, not as delete+add pairs. This is what makes the next task's history-preservation check succeed.
- **No content drift in moved files.** `git diff --cached -M` shows **zero** content changes inside any of the 11 relocated files — every hunk is a pure rename. The only content-bearing changes in this commit are: `src/index.js` reduced, `src/handlers/index.js` deleted, `src/orgs/index.mjs` added, and (if reverted) `package.json` restored to its committed state.
- **Plugin contract unchanged.** Load the built bundle (`node -e "import('./dist/liq-orgs.js').then(m => …)"` or equivalent for the CommonJS artifact) and assert: `handlers` is an array of length **5**; `typeof setup === 'function'`; and the set of `path` arrays is exactly, byte-for-byte:
  - `['orgs', 'create', ':newOrgKey']`
  - `['orgs', 'list?']`
  - `['orgs', ':orgKey', 'parameters', ':parameterKey', 'detail']`
  - `['orgs', ':orgKey', 'parameters', 'list?']`
  - `['orgs', ':orgKey', 'parameters', ':parameterKey', 'set']`

  Write the observed list to a file and `diff` it against the expected list mechanically rather than eyeballing it. **This check, not the test suite, is what actually protects the relocation** — the suite covers only `settings.mjs`.
- **Working tree resolved.** `git status --porcelain` shows no modified tracked files other than those this task intentionally changed. `package.json` is either at its committed state (recommended) or carries a change the report explains.
- **Lint is clean, including the new file.** `make lint` passes with `src/orgs/index.mjs` present.

## Metadata

architectural_impact: true

## Assumptions

- **The four dead handlers and the `create` stub are migrated as-is.** `list`, `parameters-detail`, `parameters-list`, and `parameters-set` read a `model` argument that `plugable-express` no longer passes to plugin handlers, so they throw on first request; `create` never sends a response. D11 forbids behavior changes, and the plausible fix would require changing `getOrgFromKey` in `@liquid-labs/liq-handlers-lib`, outside this plan-group. **Do not fix them here.** If you notice them, that is expected — they are documented in `plan/notes/liq-orgs-source-inventory.md` and flagged to the manager. Fixing them would also invalidate this task's "zero content drift" validation.
- **The test suite cannot detect a relocation regression** in anything except `settings.mjs`. Treat the route-array and exported-shape assertions above as the real gate; a green `make test` alone is not evidence the move was correct.
- `make` and `npx` work in this checkout against the existing `node_modules` (verified at plan-authoring time: build, test, and lint all pass today). A toolchain failure here is an environment problem to report, not a reason to reinstall or upgrade anything.
- The `catalyst-resource-*` devDependencies stay exactly as they are. dev-core's `sdlc-resource-*` toolchain is dev-core's business (D3, D8), and the two were measured to be equivalent for this source; migrating them here would be scope creep with no benefit.

## References

- `plan/notes/liq-orgs-source-inventory.md` — the full path mapping, the import-resolution table proving no rewriting is needed, the measured baseline, and the pre-existing defects.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — decisions D2 (layout), D3 (root-file ownership), D4 (why restructure-then-merge), D5 (plugin contract), D11 (scope fences).
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-02-liq-projects-migration/001-restructure-src-into-dev-core-layout.md` — the sibling task that ran this same recipe first; consult it for anything the recipe left ambiguous.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js` — how `path` exports become Express routes, for the route-parity check.

## Checkpoint hints

- After the working-tree decision in requirement 1, before any `git mv`.
- After all `git mv` operations and the `src/handlers/index.js` deletion, with `git diff --cached -M --stat` showing pure renames and before writing any new file.
- After `src/orgs/index.mjs` and the reduced root `src/index.js` are written, with `make build` green.
- After `make test`/`make lint`/`make qa` are green and the route-array parity check has been run and its output recorded.
