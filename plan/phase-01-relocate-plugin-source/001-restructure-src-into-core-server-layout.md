# Restructure Src Into Core-Server Layout

## Purpose and scope

Relocate `liq-controls`'s entire `src/` tree in place, within this repository, to `src/controls/…` — the shape the eventual `git merge --allow-unrelated-histories` absorption into `@sdlcforge/core-server` will preserve unchanged (per the absorption recipe: "relocate its tree in place to its final `src/<submodule>/…` path... and keep that repository green and independently buildable throughout"). This is step 1 of the absorption recipe documented in `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe`, applied to this donor. No route, handler, or `app.ext` behavior changes; no import rewriting is required (verified: every import in this tree is relative, none is rooted at `src/lib`). Read [`plan/notes/liq-controls-source-inventory.md`](../notes/liq-controls-source-inventory.md) first — it is the ground-truth file census, route table, and `app.ext` contract this task's validation checks against.

## Requirements

1. **Resolve any dirty/uncommitted working-tree state before starting.** Confirm `git status` is clean in this task's own worktree before making changes (mirrors the `liq-orgs` sibling precedent's own first step; the untracked `README.md`/`docs/liq-controls-spec.md` files flagged in the source inventory live only in the separate main checkout and are not expected to appear in this task's worktree, but verify).

2. **`git mv` every file under `src/lib/` and `src/schema/` to its new path under `src/controls/`**, preserving each file's position relative to the others exactly (no flattening — the current nesting reflects route/domain structure, not a redundant package-name folder, so the "one collapse" exception in the contract's layout convention does not apply here). The full old-path → new-path mapping:

   | Old path | New path |
   |---|---|
   | `src/lib/index.js` | `src/controls/index.js` |
   | `src/lib/setup.mjs` | `src/controls/setup.mjs` |
   | `src/lib/handlers/index.js` | `src/controls/handlers/index.js` |
   | `src/lib/handlers/orgs/index.js` | `src/controls/handlers/orgs/index.js` |
   | `src/lib/handlers/orgs/controls/index.js` | `src/controls/handlers/orgs/controls/index.js` |
   | `src/lib/handlers/orgs/controls/list.mjs` | `src/controls/handlers/orgs/controls/list.mjs` |
   | `src/lib/handlers/orgs/controls/list-implied.mjs` | `src/controls/handlers/orgs/controls/list-implied.mjs` |
   | `src/lib/handlers/orgs/controls/_lib/list-lib.mjs` | `src/controls/handlers/orgs/controls/_lib/list-lib.mjs` |
   | `src/lib/handlers/orgs/controls/_lib/test/list-lib.test.mjs` | `src/controls/handlers/orgs/controls/_lib/test/list-lib.test.mjs` |
   | `src/lib/handlers/orgs/controls/test/list.test.js` | `src/controls/handlers/orgs/controls/test/list.test.js` |
   | `src/lib/handlers/orgs/controls/test/data/**` (5 fixture files under `playgroundA/`) | `src/controls/handlers/orgs/controls/test/data/**` (same relative subpaths) |
   | `src/lib/integrations/get-question-controls.mjs` | `src/controls/integrations/get-question-controls.mjs` |
   | `src/lib/integrations/register-controls-integrations.mjs` | `src/controls/integrations/register-controls-integrations.mjs` |
   | `src/lib/resources/control.mjs` | `src/controls/resources/control.mjs` |
   | `src/lib/resources/controls.mjs` | `src/controls/resources/controls.mjs` |
   | `src/lib/resources/question-control.mjs` | `src/controls/resources/question-control.mjs` |
   | `src/lib/resources/load-controls.mjs` | `src/controls/resources/load-controls.mjs` |
   | `src/lib/resources/test/controls.test.mjs` | `src/controls/resources/test/controls.test.mjs` |
   | `src/lib/resources/test/question-controls.test.mjs` | `src/controls/resources/test/question-controls.test.mjs` |
   | `src/lib/resources/test/data/orgRootA/data/org/controls/test-controls.qcontrols.yaml` | `src/controls/resources/test/data/orgRootA/data/org/controls/test-controls.qcontrols.yaml` |
   | `src/schema/audit.schema.json` | `src/controls/schema/audit.schema.json` |

   Do not edit file contents during the move — every import in this tree is a relative path (`./`, `../`) and remains valid once the whole subtree moves together as a unit. Verify this holds after the move rather than assuming it (grep for any import that resolves outside the moved subtree).

3. **Reduce `src/lib/index.js` to a thin re-export.** After moving its original content to `src/controls/index.js` (which now reads `export * from './handlers'` + `export * from './setup'`, unchanged), replace `src/lib/index.js`'s content with a single re-export line: `export * from '../controls'`. This is the only content edit in this task (mirrors the `dev-core-consolidation-contract.md` root-entry pattern, and the `liq-orgs` precedent's own `src/index.js` reduction) — the build entry point stays at `src/lib/index.js` because `Makefile`'s `CATALYST_JS_LIB_SRC_PATH := $(SRC)/lib` is hardcoded and out of scope to change in this task.

4. **Delete the now-empty `src/schema/` directory** once `audit.schema.json` has moved.

5. **Update `make/01-schema.mk`'s `SCHEMA_SRC`** from `$(SRC)/schema` to `$(SRC)/controls/schema`, so the build's schema-copy rule (`$(SCHEMA_DIST): $(DIST)% : $(SCHEMA_SRC)%`) still finds `audit.schema.json` at its new path and still produces a byte-identical `dist/audit.schema.json`.

6. **Do not touch `plugable-express.yaml`, `package.json`'s `dependencies`, or any route/handler/setup logic.** This task is a pure relocation; behavior, HTTP surface, and the `app.ext._liqOrgs`/`app.ext._liqProjects` reads in `get-question-controls.mjs` and `load-controls.mjs` must be byte-identical to before the move (comment-only or whitespace-only differences are not expected here, unlike some sibling donors — verify with a diff rather than assuming).

## Validation

- `git mv` was used for every relocated file (not delete + create) — verify via `git log --follow` on at least one relocated file (e.g. `src/controls/resources/load-controls.mjs`) reaching its pre-move history, and via `git diff --stat` showing renames (`R`) rather than paired deletions/additions.
- File census: exactly 19 source files (excluding fixture/test-data) now live under `src/controls/`, none remain under the old `src/lib/` or `src/schema/` paths (`find src/lib src/schema -type f` after the move should show only `src/lib/index.js`, since `src/schema/` is deleted).
- `src/controls/index.js` content is byte-identical to the pre-move `src/lib/index.js` content; `src/lib/index.js`'s new content is exactly `export * from '../controls'` (plus trailing newline).
- `grep -rn "src/lib" src/` (excluding the retained `src/lib/index.js` file itself) returns nothing — confirms no stray reference to the old path survives.
- `make build` succeeds and produces `dist/liq-controls.js` and `dist/audit.schema.json`; diff `dist/audit.schema.json` against its pre-move build output to confirm byte-identical content.
- `make test` passes at the pre-move baseline test count (no test added, none removed, none newly failing or newly passing).
- `make lint` passes clean.
- Route parity: the built `dist/liq-controls.js`'s exported `handlers` array still contains exactly 2 entries with `path` arrays `['orgs', ':orgKey', 'controls', 'list']` and `['orgs', 'controls', 'list']`, unchanged from the pre-move baseline.
- `setup` export shape unchanged: still pushes exactly 2 `app.ext.setupMethods` entries with `deps: ['load orgs']` and `deps: ['setup integrations']` respectively, in that order.
- Working tree is otherwise clean (`git status`) after the move and edits, aside from the intended relocation and the two edited files (`src/lib/index.js`, `make/01-schema.mk`).

## Assumptions

- The target directory name `src/controls/` is this plan's own choice (no existing core-server document mandates a specific name for this donor) — see the source inventory's [Anomalies and flags](../notes/liq-controls-source-inventory.md#anomalies-and-flags) section for the reasoning and the open confirmation this depends on from core-server's own later absorption-authoring phase. If that phase later decides on a different directory name, this task's relocation still stands (the recipe relocates "in place to its final path" once, at donor-authoring time) — a rename at that point would be an addendum to this task, not a redo of it.
- `CATALYST_JS_LIB_SRC_PATH` in the root `Makefile` is not changed — it stays `$(SRC)/lib`, so the build's root entry point remains `src/lib/index.js`.

## References

- [`plan/notes/liq-controls-source-inventory.md`](../notes/liq-controls-source-inventory.md) — full file census, route table, `app.ext` contract, and pre-existing defects.
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe` — the six-step absorption recipe this task implements step 1 of.
- `liq-orgs`'s own `plan/plan-summary-dev-core-consolidation.md` (in `/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — the closest available precedent for this exact task shape, including its own confirmation that no import rewriting was needed.
