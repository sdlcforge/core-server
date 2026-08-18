# Restructure Src Into Dev-Core Layout

## Purpose and scope

**Executes in the `plugable-projects-audit` repository** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`), not in dev-core.

Move this package's source tree in place so it already sits at its final dev-core-relative path (`src/projects-audit/…`, per **D2**), while keeping the package green, buildable, and publishable throughout. This is **D4 step A** — the restructure that makes the later merge a path-rewrite-free operation.

The move is a pure `git mv`: **no import in this package needs rewriting** (verified across all 11 files — every import is either a bare package specifier or a same-directory-relative path), and there is no gitlink or fixture directory to complicate it (**C16**).

## Requirements

1. **Confirm phase 11 has landed on your base**, and confirm the pre-conditions the mapping assumes:
   - `git grep -n 'file:' -- package.json` returns nothing. If it does not, phase 11 has not merged — **halt**; `make test` cannot pass in this worktree and every gate below is meaningless.
   - `git ls-files -s | grep '^160000'` returns nothing (re-confirm **C16**; a gitlink appearing since plan-authoring would change this task).
   - `git ls-files src | wc -l` is **11**.

2. **Record the pre-move baseline** before touching anything: `npm install && make build && make test && make lint`, plus the route list captured from the built bundle exactly as phase 11 did:

   ```bash
   node -e "const m=require('./dist/plugable-projects-audit.js');
     console.log(JSON.stringify(m.handlers.map(h=>({m:h.method,p:h.path,n:h.help.name,pa:h.parameters})),null,1))" > /tmp/ppa-routes-pre-move.json
   ```

   Expected: 1 suite / 1 test passing, lint clean, bundle produced, 4 handlers, `setup` undefined. Keep `/tmp/ppa-routes-pre-move.json` — task 002 in dev-core needs the same shape to diff against.

3. **`git mv` the nine surviving source files to their final paths.** Use `git mv` (not `mv` + `git add`) so rename detection is unambiguous:

   | from | to |
   |---|---|
   | `src/handlers/projects/index.mjs` | `src/projects-audit/handlers/index.mjs` |
   | `src/handlers/projects/audit.mjs` | `src/projects-audit/handlers/audit.mjs` |
   | `src/handlers/projects/audit-implied.mjs` | `src/projects-audit/handlers/audit-implied.mjs` |
   | `src/handlers/projects/audit-fix.mjs` | `src/projects-audit/handlers/audit-fix.mjs` |
   | `src/handlers/projects/audit-fix-implied.mjs` | `src/projects-audit/handlers/audit-fix-implied.mjs` |
   | `src/handlers/projects/_lib/audit-lib.mjs` | `src/projects-audit/handlers/_lib/audit-lib.mjs` |
   | `src/handlers/projects/_lib/audit-fix-lib.mjs` | `src/projects-audit/handlers/_lib/audit-fix-lib.mjs` |
   | `src/handlers/projects/_lib/audit-lib.test.mjs` | `src/projects-audit/handlers/_lib/audit-lib.test.mjs` |
   | `src/handlers/projects/_lib/common-audit-path-parameters.mjs` | `src/projects-audit/handlers/_lib/common-audit-path-parameters.mjs` |

   The `handlers/projects/` → `handlers/` collapse is D2 rule 2: the domain is the submodule directory, so the intermediate level is redundant. **The route namespace is unaffected** — every handler declares `const path = ['projects', …]` in its own module, and `registerHandlers` reads that export, never the file's position.

4. **Delete `src/handlers/index.mjs`** (`git rm`). It is the trivial `export * from './projects'` re-export shim D3 names; the new submodule index replaces it.

5. **Create `src/projects-audit/index.mjs`** with exactly:

   ```js
   export * from './handlers'
   ```

   This makes the submodule's public surface `handlers` and nothing else, per D2 rule 3. **Do not add a `setup` export, and do not add a stub one** — this donor has none, D6 item 4 depends on that, and inventing an empty `setup` would change what dev-core's composite setup does.

6. **Reduce the root `src/index.mjs`** to exactly:

   ```js
   export * from './projects-audit'
   ```

   This keeps the package's `main`, its Rollup entry (`make/50-plugable-projects-audit-js.mk` builds from `$(SRC)/index.mjs`), its route surface, and its module shape all unchanged, so the package stays green and publishable while the transition runs — D4 step A.

   **Leave the filename as `src/index.mjs`. Do not rename it to `src/index.js`** to match the other three donors. It is tempting, because that would make it a clean arrival in the merge instead of a conflict — but it would change the `main` entry filename of a published package, and would require editing generated `make/*.mk` and `.sdlc-data.yaml` artifacts. The collision is handled in task 002 instead, deliberately and with a hard post-condition. **See C17, and say in your report that you left it alone on purpose**, so the next agent does not "fix" it.

7. **Do not touch anything else.** No `package.json`, no `package-lock.json`, no `Makefile`, no `make/*.mk`, no `.sdlc-data.yaml`, no `.gitignore`, no content edit inside any moved file. The only non-move changes are the two one-line files in requirements 5 and 6 and the deletion in requirement 4.

8. **Re-run the full toolchain and record the numbers** in this task document's status notes, alongside the pre-move baseline.

## Validation

- **File census.** `git ls-files src` returns exactly **11** paths and exactly this set:

  ```
  src/index.mjs
  src/projects-audit/index.mjs
  src/projects-audit/handlers/index.mjs
  src/projects-audit/handlers/audit.mjs
  src/projects-audit/handlers/audit-fix.mjs
  src/projects-audit/handlers/audit-fix-implied.mjs
  src/projects-audit/handlers/audit-implied.mjs
  src/projects-audit/handlers/_lib/audit-fix-lib.mjs
  src/projects-audit/handlers/_lib/audit-lib.mjs
  src/projects-audit/handlers/_lib/audit-lib.test.mjs
  src/projects-audit/handlers/_lib/common-audit-path-parameters.mjs
  ```

  `git ls-files 'src/handlers/*'` returns nothing. **Write this list to a file and hand it to task 002 in the report** — that task's census check compares against it, minus the root `src/index.mjs`, i.e. **10**.
- **Renames are recorded as renames.** `git diff --find-renames --name-status <base> HEAD` shows nine `R100` entries (100% similarity — no content changed), one `D` for `src/handlers/index.mjs`, one `A` for `src/projects-audit/index.mjs`, and one `M` for `src/index.mjs`. Any `R` below 100% means a file was edited during the move; investigate before proceeding.
- **No content drift in the moved files.** For each of the nine, `git show <base>:<old-path> | diff - <new-path>` is empty.
- **No import needed rewriting, and none was.** `grep -rn "^import\|from '" src` shows only bare specifiers (`@liquid-labs/http-smart-response`, `@liquid-labs/npm-toolkit`, `npm-check-plus`, `http-errors`) and same-directory-relative paths (`./audit-fix`, `./_lib/audit-lib`, `./common-audit-path-parameters`, `./handlers`, `./projects-audit`). No `../` appears anywhere in `src/`.
- **Green, at the same numbers.** `make build` produces `dist/plugable-projects-audit.js`; `make test` → **1 suite passed, 1 test passed** (the test moved with its subject and is still collected — `make/20-js-src-finder.mk` classifies by the `*.test.*js` filename pattern, which is depth-agnostic); `make lint` → clean. Per **C15**, the gate is green, not "no new failures".
- **Route surface byte-identical.** Re-extract the route list from the rebuilt bundle into `/tmp/ppa-routes-post-move.json` and `diff` it against `/tmp/ppa-routes-pre-move.json`. **Empty.** Same 4 entries, same order, same `method`/`path`/`help.name`/`parameters`.
- **Module shape unchanged.** `node -e "const m=require('./dist/plugable-projects-audit.js'); console.log(Object.keys(m), m.handlers.length, typeof m.setup)"` prints `[ 'handlers' ] 4 undefined`. The `undefined` is load-bearing: it is what D6 item 4 asserts.
- **Still publishable.** `npm pack --dry-run` succeeds (its `prepack` runs `make build`) and its `src/` entries are the new paths. The pack list is still polluted with `.flow/`, `plan/`, and `worktrees/` — that is **C9**, fixed in phase 13 task 003, and is **not** this task's to fix.
- **The root entry is still `src/index.mjs`.** `git ls-files src/index.js` returns nothing; `git ls-files src/index.mjs` returns it. Deliberate — see requirement 6 and C17.
- **Nothing outside `src/` changed.** `git diff --name-only <base> HEAD -- . ':(exclude)src'` is empty.

## Assumptions

- Phase 11 task 001 has landed and merged to this repository's working branch. Without it `make test` fails in a fresh worktree and requirement 2's baseline cannot be established.
- This task has **no** dependency on `liq-projects` phase 1 or on the existence of anything in `sdlcforge/dev-core`. It is unblocked as soon as phase 11 lands.
- `dist/` is gitignored and untracked here, so a rebuilt bundle differing cosmetically from a previously built one has no effect on the repository. The route-list diff, not a byte comparison, is the behavioral gate.
- No other task is editing this repository concurrently.

## References

- `plan/notes/plugable-projects-audit-source-inventory.md` — **A4** (the full path mapping and why zero import rewrites are needed), **A1** (the file census and route table), **A5**/**C17** (why the root entry filename is left alone), **A9** (the baseline), **C16**.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D2** (layout convention and its rationale, including why test/fixture discovery survives), **D3**, **D4 step A**, **D6**.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-05-liq-orgs-migration/001-restructure-src-into-dev-core-layout.md` — the closest sibling in size and shape; read its status notes for anything the recipe got wrong in practice.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js` — confirms routes come from each module's `path` export, never from file position.

## Checkpoint hints

- After the pre-move baseline and route list are captured, before any `git mv`.
- After all nine moves, the deletion, and the two one-line files, before running the toolchain.
- After `make build`/`make test`/`make lint` are green and the route-list diff is empty, with the file census written down for task 002.
