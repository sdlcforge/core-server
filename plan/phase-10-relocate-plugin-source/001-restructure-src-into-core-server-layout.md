# Restructure Src Into Core-Server Layout

## Purpose and scope

Relocate `liq-credentials`'s entire `src/` tree in place, within this repository, to `src/credentials/…` — the shape the eventual `git merge --allow-unrelated-histories` absorption into `@sdlcforge/core-server` will preserve unchanged. This is step 1 of the absorption recipe documented at [`dev-core-consolidation-contract.md#absorption-recipe`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe), applied to this donor. No route, handler, `setup()`, or `app.ext` behavior changes; no import rewriting is required (verified: every import in this tree is either a bare package specifier or a relative path within the tree — none is rooted at `src/`).

Read [`plan/notes/liq-credentials-source-inventory.md`](../notes/liq-credentials-source-inventory.md) first — it is the ground-truth file census, route table, `app.ext` contract, and build-wiring analysis this task's validation checks against.

## Requirements

1. **Resolve any dirty/uncommitted working-tree state before starting.** Confirm `git status` is clean in this task's own worktree before making changes. Record the pre-move baselines this task's validation compares against: the `make test` test count, the built `dist/liq-credentials.js`, and the exported route `path` arrays.

2. **`git mv` every file under `src/` into `src/credentials/`, preserving internal structure exactly.** No flattening. The complete old-path → new-path mapping:

   | Old path | New path |
   |---|---|
   | `src/index.js` | `src/credentials/index.js` |
   | `src/setup.mjs` | `src/credentials/setup.mjs` |
   | `src/handlers/index.js` | `src/credentials/handlers/index.js` |
   | `src/handlers/credentials/index.js` | `src/credentials/handlers/credentials/index.js` |
   | `src/handlers/credentials/import.mjs` | `src/credentials/handlers/credentials/import.mjs` |
   | `src/handlers/credentials/list.mjs` | `src/credentials/handlers/credentials/list.mjs` |
   | `src/handlers/credentials/test/list.test.js` | `src/credentials/handlers/credentials/test/list.test.js` |
   | `src/handlers/credentials/test/data/creds-db.yaml` | `src/credentials/handlers/credentials/test/data/creds-db.yaml` |

   Use `git mv` (not delete + create) so `git log --follow` reaches pre-move history — the absorption merge depends on that history surviving. Do not edit file contents during the move; every import stays valid once the whole subtree moves together as a unit. Verify that holds after the move rather than assuming it.

   **Do not apply the "one collapse" exception** from [`dev-core-consolidation-contract.md#layout-convention`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#layout-convention) to `handlers/credentials/`, even though it reads as if it applies here. `core-server`'s own absorb task for this donor prescribes the straight move, and collapsing would require merging `src/handlers/index.js` into `src/handlers/credentials/index.js` — a content edit inside what must remain a pure relocation. Anomaly 4 of the source inventory records the full reasoning.

3. **Reduce `src/index.js` to a thin re-export.** After its original content has moved to `src/credentials/index.js` (which now carries, verbatim and unchanged, the two `export * from` lines plus the `name`/`summary` declarations and their `export { name, summary }`), create a new `src/index.js` whose entire content is:

   ```javascript
   export * from './credentials'
   ```

   (plus a trailing newline). This is the only content edit in this task. `src/index.js` **must exist** when this lands — it is the build entry point (`CATALYST_NODE_PROJECT_LIB_ENTRY_POINT=$(CATALYST_JS_LIB_SRC_PATH)/index.js`, with `CATALYST_JS_LIB_SRC_PATH:=src`), and it is what keeps the package independently buildable and publishable through the interim. `core-server`'s absorb task `git rm`s it after merging; do **not** delete it here.

   Confirm the single re-export line actually re-exports everything the old file did: `handlers`, `setup`, `name`, and `summary`. If `export * from './credentials'` does not carry all four (it should — `export *` re-exports every named export), adjust to whatever form does, and say so in the report rather than silently dropping an export.

4. **Make no `Makefile` change.** Unlike the sibling `liq-controls` donor, no build variable needs repointing: `SRC:=src` and `CATALYST_JS_LIB_SRC_PATH:=$(SRC)` mean the `find`-based file discovery already covers `src/credentials/`, and the entry point is already `src/index.js`. Confirm this empirically via a green `make build` rather than assuming it; if a build variable *does* turn out to need repointing, make the minimal change and report it.

5. **Do not touch `package.json`, `README.md`, `AGENTS.md`, `docs/`, or any route/handler/setup logic.** This task is a pure relocation. Specifically preserve, byte-identical:
   - Both route `path` exports: `['credentials', ':credential', 'import']` and `['credentials', 'list']`.
   - `src/credentials/setup.mjs`'s assignment of `app.ext.credentialsDB` and its `registerPathVar('credential', { validationRe, optionsFetcher })` call.
   - `setup()`'s read of `serverConfigRoot` **from its argument object**, not from `app.ext` directly (commit `cab8a77`'s fix — do not "harmonize" it with `import.mjs`'s separate, legitimate request-time `app.ext.serverConfigRoot` read).
   - The two pre-existing defects recorded in the source inventory (the broken `textFormatter`, the empty `package.json` `description`). Document, do not fix.

6. **Ensure the relocation is reachable from the branch `core-server` will verify.** `core-server`'s absorb task runs `git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- src` and merges that same branch — not `main`. Anomaly 5 of the source inventory explains the discrepancy. This task must not perform branch surgery on its own; instead, report explicitly which branch(es) carry the relocated `src/credentials/…` tree once the work lands, so the dispatching manager can reconcile before `core-server`'s absorb task is dispatched. Halt and report rather than force-updating any protected or plan branch.

## Validation

- `git mv` was used for every relocated file: `git log --follow src/credentials/setup.mjs` reaches its pre-move history, and `git diff --stat` (or `git status`) shows renames (`R`) rather than paired deletions/additions.
- File census: exactly the seven source files plus the one fixture listed in requirement 2 now live under `src/credentials/`; `find src -maxdepth 1 -type f` shows only `src/index.js`, and `find src -maxdepth 1 -type d` shows only `src/credentials`. Nothing remains at `src/setup.mjs` or `src/handlers/`.
- `src/credentials/index.js` content is byte-identical to the pre-move `src/index.js` content.
- `src/index.js`'s new content is exactly `export * from './credentials'` plus a trailing newline.
- `grep -rn "from '\.\./\.\./\.\." src/` and a scan of every `import` statement under `src/` confirm no import resolves outside the moved subtree.
- `make build` succeeds and produces `dist/liq-credentials.js`. Diff the built bundle against the pre-move build output: the only acceptable differences are path/source-map artifacts introduced by the move; the exported `handlers`, `setup`, `name`, and `summary` surface must be unchanged. Report any other diff rather than accepting it.
- `make test` passes at the pre-move baseline test count (no test added, removed, newly failing, or newly passing). Confirm the relocated test and its fixture both transpiled into `test-staging/credentials/handlers/credentials/test/…` and that the fixture is present alongside the test.
- `make lint` passes clean.
- Route parity: the built bundle's exported `handlers` array still contains exactly 2 entries, with `path` arrays `['credentials', ':credential', 'import']` and `['credentials', 'list']` and methods `put` and `get` respectively — unchanged from the pre-move baseline.
- `setup` export shape unchanged: still a single async `setup` that sets `app.ext.credentialsDB` and registers exactly one path variable, `credential`, with `validationRe: '(?:[A-Z0-9][A-Z0-9_]*)'`.
- `git diff` shows exactly one content-changed file (`src/index.js`) plus the eight renames; `package.json`, `Makefile`, `README.md`, `AGENTS.md`, and `docs/` are untouched.
- Working tree is otherwise clean (`git status`) after the move and edit.

## Assumptions

- The target directory name `src/credentials/` is fixed by `core-server`'s own absorb task (`plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md`), which names it explicitly — unlike the sibling `liq-controls` donor, this is not this plan's own unilateral naming choice.
- `SRC:=src` and `CATALYST_JS_LIB_SRC_PATH:=$(SRC)` in the root `Makefile` are not changed; the build entry point remains `src/index.js`.
- The generated `Makefile`'s `find`-based `CATALYST_JS_*_SRC` variables re-evaluate at each `make` invocation, so the moved files are discovered with no cached-path staleness. A stale `test-staging/` or `dist/` from a pre-move build may need clearing before the post-move build/test comparison is meaningful.

## References

- [`plan/notes/liq-credentials-source-inventory.md`](../notes/liq-credentials-source-inventory.md) — file census, route table, `app.ext` contract, build/test wiring, and the five recorded anomalies.
- [`dev-core-consolidation-contract.md#absorption-recipe`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe) — the six-step recipe this task implements step 1 of; its [layout convention](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#layout-convention) section carries the "one collapse" exception requirement 2 deliberately does not apply.
- [`core-server`'s absorb task for this donor](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md) — names the target path, the `src/index.js` handling after merge, and the `credentialsDB`/`serverConfigRoot` invariants this relocation must not disturb.
- `/Users/zane/playground/liquid-labs/liq-controls/worktrees/plan/core-server-domain-consolidation/plan/phase-01-relocate-plugin-source/001-restructure-src-into-core-server-layout.md` — the sibling donor's equivalent task, already authored; the closest precedent for this task's shape.

## Checkpoint hints

- After the `git mv` of the whole tree, before the `src/index.js` edit.
- After `src/index.js` is reduced to the thin re-export and `make build` is green.
- After `make test` and `make lint` are green and route/setup parity is confirmed.
