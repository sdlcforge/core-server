# Restructure Src Into Core-Server Layout

## Purpose and scope

Relocate `liq-integrations-issues-github`'s entire `src/` tree in place, within this repository, to `src/integrations-issues-github/…` — the shape the eventual `git merge --allow-unrelated-histories` absorption into `@sdlcforge/core-server` will preserve unchanged. This is step 1 of the absorption recipe documented at [`dev-core-consolidation-contract.md#absorption-recipe`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe), applied to this donor. No hook, `setup()`, provider-registration, or `app.ext` behavior changes, and no import rewriting is required — every import in this tree is either a bare package specifier or a relative path within the tree, so the whole subtree moves as a unit.

Read [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) first — it is the ground-truth file census, provider/hook table, and build-wiring analysis this task's validation checks against.

## Requirements

1. **Resolve any dirty/uncommitted working-tree state before starting.** Confirm `git status` is clean in this task's own worktree. Record the pre-move baselines this task's validation compares against: the `make test` test count, the built `dist/liq-integrations-issues-github.js`, and the provider/hook registration surface exported by `src/index.js`.

2. **`git mv` every file under `src/` into `src/integrations-issues-github/`, preserving internal structure exactly.** No flattening. Expected mapping, assuming Phase 12 has landed:

   | Old path | New path |
   |---|---|
   | `src/index.js` | `src/integrations-issues-github/index.js` |
   | `src/constants.mjs` | `src/integrations-issues-github/constants.mjs` |
   | `src/create-or-update-pull-request.mjs` | `src/integrations-issues-github/create-or-update-pull-request.mjs` |
   | `src/determine-current-milestone.mjs` | `src/integrations-issues-github/determine-current-milestone.mjs` |
   | `src/get-current-integration-user.mjs` | `src/integrations-issues-github/get-current-integration-user.mjs` |
   | `src/get-issue-url.mjs` | `src/integrations-issues-github/get-issue-url.mjs` |
   | `src/get-project-url.mjs` | `src/integrations-issues-github/get-project-url.mjs` |
   | `src/get-pull-request-urls-by-head.mjs` | `src/integrations-issues-github/get-pull-request-urls-by-head.mjs` |
   | `src/get-qa-link-file-index.mjs` | `src/integrations-issues-github/get-qa-link-file-index.mjs` |
   | `src/uses-github-issues.mjs` | `src/integrations-issues-github/uses-github-issues.mjs` |
   | `src/test/uses-github-issues.test.js` | `src/integrations-issues-github/test/uses-github-issues.test.js` |
   | `src/test/determine-current-milestone.test.js` | `src/integrations-issues-github/test/determine-current-milestone.test.js` |

   The table is a description of the expected tree, not an allowlist. **Move everything actually present under `src/`**, and reconcile any difference against the table in the report. The last row in particular exists only if Phase 12 task 001's requirement 6 landed its test; its absence is not an error. There is no test-data fixture directory in this repository.

   Use `git mv` (not delete + create) so `git log --follow` reaches pre-move history — the absorption merge depends on that history surviving. Do not edit file contents during the move; every import stays valid once the whole subtree moves together (`src/test/uses-github-issues.test.js`'s `'../uses-github-issues'` still resolves, and every intra-`src/` import is a same-directory `'./…'` reference). Verify that holds after the move rather than assuming it.

3. **Reduce `src/index.js` to a thin re-export.** After its original content has moved to `src/integrations-issues-github/index.js` — carrying, verbatim and unchanged, the seven hook imports, the `setup` const with its `setupMethods.push`, both `app.ext.integrations.register()` calls, and `export { setup }` — create a new `src/index.js` whose entire content is:

   ```javascript
   export * from './integrations-issues-github'
   ```

   (plus a trailing newline). This is the only content edit in this task. `src/index.js` **must exist** when this lands — it is the build entry point (`CATALYST_NODE_PROJECT_LIB_ENTRY_POINT=$(CATALYST_JS_LIB_SRC_PATH)/index.js`, with `CATALYST_JS_LIB_SRC_PATH:=src`), and it is what keeps the package independently buildable and publishable through the interim. `core-server`'s absorb task `git rm`s it after merging; do **not** delete it here.

   Confirm the single re-export line actually re-exports everything the old file did — for this donor that is one name, `setup`. If `export * from './integrations-issues-github'` does not carry it (it should — `export *` re-exports every named export), adjust to whatever form does, and say so in the report rather than silently dropping the export.

4. **Make no `Makefile` change.** `SRC:=src` and `CATALYST_JS_LIB_SRC_PATH:=$(SRC)` mean the `find`-based file discovery already covers `src/integrations-issues-github/`, and the entry point is already `src/index.js`. Confirm this empirically via a green `make build` rather than assuming it; if a build variable *does* turn out to need repointing, make the minimal change and report it. The sibling `liq-credentials` donor — structurally identical in this respect — verified that no change is needed.

5. **Do not touch `package.json`, `README.md`, `AGENTS.md`, `docs/`, or any hook/setup logic.** This task is a pure relocation. Specifically preserve, byte-identical:
   - The setup method's `name: 'register github issues integrations'` and `deps: ['setup integrations']`. `@liquid-labs/dependency-runner` matches these by exact string and `'setup integrations'` is a `plugable-express` framework built-in; a typo here is a silent registration failure, not a build error.
   - Both `app.ext.integrations.register()` calls in full: `providerFor` values `'tickets'` and `'pull request'`, `providerTest: usesGitHubIssues` on both, all seven hook registrations across the two, and `npmName: '@liquid-labs/liq-integrations-issues-github'` on both. `npmName` becomes `@sdlcforge/core-server` in `core-server`'s own absorb task, **not here**.
   - **The known defect: both `register()` calls omit `name`.** This collapses the two providers into a single entry in `IntegrationsManager.listInstalledPlugins()`. Do **not** fix it. `core-server`'s absorb task captures the current two-entry `GET /server/plugins/integrations/list` body as a parity baseline (its requirement 10); a fix landing here would make a real behavior change indistinguishable from an absorption regression when that baseline is compared. Anomaly 4 of the source inventory records the full reasoning.
   - The other pre-existing conditions recorded in the source inventory — the empty `package.json` `description`, the missing `files` allowlist, and (from Phase 12) the inlined function's unused `cache` parameter and redundant `Octocache` construction. Document, do not fix.

6. **Ensure the relocation is reachable from the branch `core-server` will verify.** `core-server`'s absorb task runs `git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- src` and expects to see `src/integrations-issues-github/…`, then merges that same branch — not `main`. Anomaly 5 of the source inventory explains the discrepancy, which applies to Phase 12's inlining as well as to this move. This task must not perform branch surgery on its own; instead, report explicitly which branch(es) carry the relocated `src/integrations-issues-github/…` tree once the work lands, and whether Phase 12's inlining is reachable from the same place, so the dispatching manager can reconcile before `core-server`'s absorb task is dispatched. Halt and report rather than force-updating any protected or plan branch.

## Validation

- `git mv` was used for every relocated file: `git log --follow src/integrations-issues-github/create-or-update-pull-request.mjs` reaches its pre-move history, and `git diff --stat` (or `git status`) shows renames (`R`) rather than paired deletions/additions.
- File census: every file that was under `src/` now lives under `src/integrations-issues-github/`; `find src -maxdepth 1 -type f` shows only `src/index.js`, and `find src -maxdepth 1 -type d` shows only `src/integrations-issues-github`. Nothing remains at `src/*.mjs` or `src/test/`.
- `src/integrations-issues-github/index.js` content is byte-identical to the pre-move `src/index.js` content.
- `src/index.js`'s new content is exactly `export * from './integrations-issues-github'` plus a trailing newline.
- Every `import` statement under `src/` resolves inside the moved subtree or to a declared package: `grep -rn "from '\.\./\.\./" src/` returns nothing, and a scan of the full import set confirms no path escapes the subtree.
- `make build` succeeds and produces `dist/liq-integrations-issues-github.js`. Diff the built bundle against the pre-move build output: the only acceptable differences are path/source-map artifacts introduced by the move; the exported `setup` surface must be unchanged. Report any other diff rather than accepting it.
- `make test` passes at the pre-move baseline test count (no test added, removed, newly failing, or newly passing). Confirm the relocated test(s) transpiled into `test-staging/integrations-issues-github/test/…` and actually executed, rather than being silently skipped because Jest no longer matches the path.
- `make lint` passes clean.
- Provider parity, checked against the built bundle or by reading the relocated `index.js`: exactly two `register()` calls, `providerFor` values `'tickets'` and `'pull request'`, `providerTest` `usesGitHubIssues` on both, seven hook registrations total (`getCurrentIntegrationUser` in both), `npmName` still `'@liquid-labs/liq-integrations-issues-github'` on both, and `name` still absent from both.
- Setup-method parity: still a single `setupMethods.push` with `name: 'register github issues integrations'` and `deps: ['setup integrations']`, both byte-identical to the baseline.
- No HTTP route or path variable is introduced by this move — this donor registers none, and it must still register none.
- `git diff` shows exactly one content-changed file (`src/index.js`) plus the renames; `package.json`, `Makefile`, `README.md`, `AGENTS.md`, and `docs/` are untouched.
- Working tree is otherwise clean (`git status`) after the move and edit.

## Assumptions

- The target directory name `src/integrations-issues-github/` is fixed by `core-server`'s own absorb task (`plan/phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md`), which names it explicitly. This is not this plan's unilateral naming choice.
- Phase 12 has landed, so `src/determine-current-milestone.mjs` (and possibly its test) is part of what moves. If Phase 12 has **not** landed, the move still works — just move what is there and report the discrepancy; nothing in this task depends on the inlining having happened.
- `SRC:=src` and `CATALYST_JS_LIB_SRC_PATH:=$(SRC)` in the root `Makefile` are not changed; the build entry point remains `src/index.js`.
- The generated `Makefile`'s `find`-based `CATALYST_JS_*_SRC` variables re-evaluate at each `make` invocation, so the moved files are discovered with no cached-path staleness. A stale `test-staging/` or `dist/` from a pre-move build may need clearing before the post-move build/test comparison is meaningful.
- This donor has no test-data fixture directory, so the `CATALYST_NODE_PROJECT_DATA_SELECTOR` fixture-copy path in the `Makefile` is not exercised by the move.

## References

- [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) — file census, provider/hook table, host contract, build/test wiring, and the eight recorded anomalies.
- [`dev-core-consolidation-contract.md#absorption-recipe`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe) — the recipe this task implements step 1 of, and its [layout convention](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#layout-convention).
- [`core-server`'s absorb task for this donor](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md) — names the target path, the `src/index.js` handling after merge, the setup-method name/deps invariant, and the deliberate preservation of the missing-`name` defect.
- `/Users/zane/playground/liquid-labs/liq-credentials/worktrees/plan/core-server-domain-consolidation/plan/phase-10-relocate-plugin-source/001-restructure-src-into-core-server-layout.md` — the sibling donor's equivalent task; the closest precedent, since its source also roots directly at `src/`.

## Checkpoint hints

- After the `git mv` of the whole tree, before the `src/index.js` edit.
- After `src/index.js` is reduced to the thin re-export and `make build` is green.
- After `make test` and `make lint` are green and provider/setup parity is confirmed.
