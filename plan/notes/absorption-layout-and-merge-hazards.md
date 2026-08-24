# Absorption Layout And Merge Hazards

## Purpose and scope

Records the two design decisions this plan settled directly from source — where the three absorbed submodules land inside `core-server`'s `src/` tree, and which files each merge must not be allowed to bring in — together with the specific add/add collisions those merges will produce. Unlike the other notes in this directory, nothing here is an open question; these are decisions, stated so the not-yet-authored donor plans and the eventual absorb tasks can be written against them.

## Layout decision

The three absorbed submodules land as **top-level directories under `core-server/src/`**, siblings of the existing `src/lib/` and `src/cli/`:

```text
src/
  cli/                          # core-server's own CLI entry point (unchanged)
  lib/                          # core-server's own app-init, library exports, unit tests (unchanged)
    app-init.mjs
    index.js
    test/
  controls/                     # <- absorbed from @liquid-labs/liq-controls
  credentials/                  # <- absorbed from @liquid-labs/liq-credentials
  integrations-issues-github/   # <- absorbed from @liquid-labs/liq-integrations-issues-github
```

This matches `dev-core`'s [layout convention](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#layout-convention) — one top-level directory per source package, named for its domain — adapted to a `src/` that already carries two `core-server`-owned directories rather than being empty.

**This is forced, not preferred.** `liq-controls`' own Phase 1 task (`001-restructure-src-into-core-server-layout.md`, already authored and committed on that repository's plan branch) relocates its entire tree to `src/controls/…` *within its own repository*. A `git merge --allow-unrelated-histories` preserves paths exactly — that path-preservation is the whole reason the recipe puts relocation in the donor rather than doing a `git subtree`-style rewrite at absorb time — so the tree arrives in `core-server` at `src/controls/…` and nowhere else. Any alternative scheme (`src/lib/plugins/controls/`, `src/plugins/controls/`) would require either amending a committed donor plan or a post-merge `git mv`, and the latter would defeat `liq-controls`' Phase 2 verification gate, which checks for the relocated tree at its expected path.

**Consequence for the two unauthored donor plans.** `liq-credentials` must relocate its tree to `src/credentials/…` and `liq-integrations-issues-github` to `src/integrations-issues-github/…`, each within its own repository, on its own `plan/core-server-domain-consolidation` branch. Both currently root their source directly at `src/` (unlike `liq-controls`, which roots at `src/lib/`), so for both the relocation is a `git mv` of everything under `src/` into the new subdirectory, with the root `src/index.js` reduced to a thin re-export so the package stays independently buildable.

A nested `src/integrations/issues-github/` was considered for the third donor and rejected: it implies a shared `src/integrations/` namespace that nothing else populates, and it diverges from the flat one-directory-per-source-package rule for no gain. The flat name is long but unambiguous.

## Root-file ownership

`core-server` owns, and keeps its own version of, every package-level file. A merge from a donor must not carry any of these in:

`package.json`, `package-lock.json`, `bun.lock`, `Makefile`, `make/`, `.gitignore`, `.eslintrc*`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `dist/`, `qa/`, `test-staging/`, `node_modules/`, and **every file the donor carries under `plan/`**.

Two `core-server`-specific additions to the `dev-core` list:

- **`docs/`.** Each donor carries a `docs/<donor>-spec.md`. `core-server` already has exactly one `docs/*-spec.md`, and Flow's own project-doc discovery assumes that glob matches one file. Donor spec docs are dropped; the donor repository retains its own copy, which its retirement phase leaves in place alongside the rewritten superseded-notice `README.md`.
- **`plugable-express.yaml`.** `liq-controls` carries one, declaring `dependencies: ['@liquid-labs/liq-projects', '@liquid-labs/liq-orgs']`. Nothing in `plugable-express` reads it; it is the manual precursor of Wave 3's compile-time manifest. Drop it, but preserve the load-order fact it records — `controls` genuinely needs both plugins loaded — in whatever the absorption's own documentation ends up being.

Per the contract's own warning, **do not treat git's conflict list as the list of root files to review.** All three donors and `core-server` share generated `Makefile`/`make/*.mk` content from the same `@liquid-labs/sdlc-projects-workflow-local-node-build` generator, so byte-identical copies merge silently with no conflict at all. Verify afterwards, by blob comparison against the pre-merge commit, that `core-server`'s version of every root-level path is what survived.

Donor `plan/` trees likewise arrive as clean, non-conflicting merges that git never flags. `core-server` maintains its own `plan/` directory, so scope the removal to the arriving paths (`git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- plan`) rather than reaching for `git rm -r plan/`.

## Two add/add collisions that merge silently wrong

Both are the direct `core-server` analogue of the `src/index.mjs` hazard `dev-core` hit on its `plugable-projects-audit` absorption — a donor's thin root re-export landing on a path the absorbing repository already occupies with something load-bearing.

### `src/lib/index.js` — the `liq-controls` merge

After `liq-controls`' Phase 1, its `src/lib/` holds exactly one file: `index.js`, reduced to `export * from '../controls'`. `core-server`'s `src/lib/index.js` is its **public library export surface** (`appInit`, `Reporter`, `name`, `summary`) — the thing `dist/sdlcforge-server.js` is built from and the thing `src/lib/test/index.test.js` asserts against.

The merge produces an add/add conflict on that path. The resolution is `core-server`'s copy:

```bash
git checkout --ours -- src/lib/index.js && git add src/lib/index.js
```

Never `git rm` it and never take `--theirs`. Taking `--theirs` replaces `core-server`'s entire library export surface with a one-line re-export of the controls submodule — still a valid module, so `make build` stays green and `dist/sdlcforge-server.js` is still produced, while `appInit` itself silently disappears from the package's exports. Verify after the merge, before editing anything, that `git diff <pre-merge-commit> -- src/lib/index.js` is empty.

### `src/index.js` — the `liq-credentials` and `liq-integrations-issues-github` merges

`core-server` has no `src/index.js` today, so the *first* of these two merges brings one in as a clean, non-conflicting add — invisible unless looked for. The *second* then hits an add/add conflict against the first donor's leftover.

Neither belongs in `core-server`: each is a donor's own package entry point, meaningful only in the donor's own build. `git rm src/index.js` after the first merge, and the second merge produces no conflict at all. If the removal is skipped, the second merge's conflict is the signal that it was — resolve by removing the path outright rather than choosing a side.

## Dependency union

Per the contract's [absorption recipe](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe) step 5, each donor's runtime `dependencies` are unioned into `core-server`'s `package.json`, taking the higher range on overlap and recording the choice. Applied to the three donors' declared sets:

| Dependency | From | Note |
|---|---|---|
| `@liquid-labs/find-plus` | controls | new to `core-server` |
| `@liquid-labs/http-smart-response` | controls, credentials | already a `core-server` dependency at `^1.0.0-alpha.6`, higher than either donor's `^1.0.0-alpha.3` — keep `core-server`'s |
| `@liquid-labs/liq-handlers-lib` | controls (`^1.0.0-alpha.15`), credentials (`^1.0.0-alpha.16`) | take `^1.0.0-alpha.16` |
| `@liquid-labs/liq-qa-lib` | controls, issues-github | see the unused-import check below |
| `@liquid-labs/npm-toolkit` | controls | new |
| `@liquid-labs/resource-item`, `@liquid-labs/resource-model` | controls | new |
| `http-errors`, `js-yaml` | controls | new |
| `@liquid-labs/liq-credentials-db` | credentials | **stays external — not folded** |
| `@liquid-labs/git-toolkit`, `@liquid-labs/github-toolkit`, `@liquid-labs/shell-toolkit` | issues-github | new |
| `@liquid-labs/liq-projects-lib` | issues-github | only if that donor's own `determineCurrentMilestone` inlining task has *not* landed by absorb time — check, do not assume |
| `@liquid-labs/octocache` | issues-github | **imported but not declared** by the donor; resolves transitively today. Declare it explicitly. |

Two ranges named in `liq-controls`' manifest — `@liquid-labs/liq-qa-lib` and `@liquid-labs/http-smart-response` — appear in no `import` statement under that donor's `src/`. Confirm before carrying `liq-qa-lib` in on `controls`' account; it is carried in on `issues-github`'s account regardless.

Two `file:` specs already exist in `core-server`'s `package.json` (`@liquid-labs/liq-projects` and `@liquid-labs/plugable-express`, both yalc links). Those are pre-existing and out of scope, but the union must not *add* a `file:` spec: verify no new one appears.

## Related documents

- [`in-tree-plugin-registration.md`](./in-tree-plugin-registration.md) — the registration mechanism these merges depend on.
- [`absorbed-surface-inventory.md`](./absorbed-surface-inventory.md) — what each donor contributes.
- [`parity-baseline.md`](./parity-baseline.md) — how the result is verified.
