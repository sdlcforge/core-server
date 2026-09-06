# Absorb Dev-Core

## Purpose and scope

Phase 2 of the `sdlc-core-unification` plan. Performs the git-history-preserving merge of `@sdlcforge/dev-core` into `@sdlcforge/core-server`, resolves package-level file ownership, and unions the dependency sets — without wiring anything, so the merge is independently reviewable and revertible before behavior moves.

## Goals

1. **Merge with history preserved.** `git merge --allow-unrelated-histories` keeps the donor's full history reachable under the absorbed paths, so `git log --follow src/projects/setup.mjs` still reaches the original commits. This is the whole reason a merge is used rather than a copy, and it is verifiable rather than assumed.

   The recipe's step-1 donor-side relocation is **not needed**: dev-core's `main` already carries `src/{projects,orgs,work,projects-audit}/…`. Confirm that with `git ls-tree -r --name-only dev-core-source/main -- src` before merging — merging a pre-restructure tree writes every file to the wrong path and has to be undone by hand.

2. **Resolve package-level file ownership in `core-server`'s favor, exhaustively.** `core-server` owns every root-level file. The hazard the consolidation contract states most emphatically applies in full here: **git's conflict list is not the list of files to review.** Both repositories' `Makefile`, `make/*.mk`, and `.gitignore` descend from the same Catalyst generator, so a byte-identical fragment merges silently with nothing to flag it.

   Four arriving paths have **no counterpart in `core-server` at all** and therefore produce no conflict whatsoever, yet all four must go:

   - `src/index.mjs` — dev-core's own plugin aggregator. Note this is the *inverse* of the contract's stated `projects-audit` hazard: because `core-server` has no file at that path, it arrives as a clean add rather than an add/add conflict, so `git rm` is correct here where it would have been catastrophic there. Its role is taken by `src/lib/builtin-plugins.mjs`.
   - `make/50-dev-core-js.mk` — would add a third Rollup target building a `dist/dev-core.js` artifact, picked up automatically by `Makefile`'s `include make/*.mk`.
   - `.sdlc-data.yaml` — dev-core's Catalyst inventory; `core-server`'s equivalent is the differently-named `.catalyst-data.yaml`.
   - `package-lock.json` — `core-server` is on Bun and tracks `bun.lock`.

   Also arriving clean: `docs/consumer-migration.md`, `docs/dev-core-consolidation-contract.md`, and dev-core's `plan/` residue (`followups.yaml`, `manifest.yaml`, and two `plan-summary-*.md` files). Scope the `plan/` removal to the arriving paths — never a blanket `git rm -r plan/`, which would delete `core-server`'s own tracked planning files.

   Verification is a blob comparison of every root-level path against Phase 1's recorded pre-merge map, not an inspection of what git asked about.

3. **Decide the disposition of dev-core's package-level tests.** `src/test/index.test.mjs` and `src/test/plugin-manifest.test.mjs` arrive clean and will be transpiled into `test-staging/` and executed by `core-server`'s Jest run, where they assert against a `src/index.mjs` and a `package.json` `plugable` block that no longer exist in that form. They are either dropped or ported to assert the merged aggregate; leaving them is not an option.

4. **Union the runtime dependencies, then regenerate the lockfile the Bun way.** Higher range wins on overlap, but with a live eye on the six overlapping entries where dev-core's range is higher and applying the rule therefore *upgrades* dependencies underneath `core-server`'s own already-absorbed `controls`/`credentials`/`issues-github` code. `@liquid-labs/liq-credentials-db` is the one entry where `core-server`'s range is higher and must be kept.

   The lockfile refresh is `rm -f bun.lock && bun install` (or `scripts/provision-local-deps.sh --refresh-lock`), never the recipe's literal `package-lock.json` step and never `npm install`: under Bun, a bare `bun install` does not re-resolve a linked package's transitive dependency list once `bun.lock` holds a resolved `file:` entry.

5. **Leave the system working and unchanged in behavior.** At phase end the absorbed source sits in tree but is inert: `builtin-plugins.mjs` still aggregates three components and `@sdlcforge/dev-core` is still an explicit npm plugin, so the server still registers 165 routes with the same provenance as before. Snapshots must not move in this phase.

## Inputs

- Phase 1's outputs: cleared yalc drift, recorded baseline, parity contract, and the pre-merge root-level blob map.
- `@sdlcforge/dev-core` at `/Users/zane/playground/sdlcforge/dev-core`, branch `main`, added as a local-filesystem git remote (both repositories are checked out side by side on this machine).
- The absorption recipe at [`dev-core`'s consolidation contract](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md), sections "Absorption recipe" and "Root-file ownership".
- The merge-arrival inventory research (`plan/notes/merge-arrival-inventory.md`) and dependency-union research (`plan/notes/dependency-union.md`), both outstanding at the time this summary was written.
- [`notes/pre-merge-state.md`](../notes/pre-merge-state.md) — the arriving-path and dependency-shape readings this phase acts on.

## Outputs

- A merge commit bringing dev-core's history into `core-server`, with `src/{projects,orgs,work,projects-audit}/` present and `git log --follow` verified to reach donor commits through at least one file per absorbed component.
- Every dev-core package-level file removed or resolved in `core-server`'s favor, verified by blob comparison against Phase 1's map rather than by git's conflict list.
- `package.json` carrying the unioned runtime `dependencies`, with the resolution recorded per overlapping entry, and a regenerated `bun.lock`. `grep -n 'file:' package.json` shows exactly two entries at this point (`@liquid-labs/plugable-express` and `@sdlcforge/dev-core`, the latter removed in Phase 3).
- `make build`, `make test`, `make lint` green, with `full-tier-*` and `golden-*` snapshots **unmoved** — the proof that the merge changed source layout and nothing observable.
- A written record of the dependency-union decisions (analogous to [`resources/absorption-dependency-union.md`](../resources/absorption-dependency-union.md)), including any dependency deliberately not carried across and why.
