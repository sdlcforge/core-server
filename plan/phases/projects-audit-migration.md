# Phase 12 — projects-audit Migration Into dev-core

## Purpose and scope

Phase summary for the migration phase of the `dev-core-consolidation` plan-group's `plugable-projects-audit` slice. **Task 001 executes in `plugable-projects-audit`** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`); **tasks 002 and 003 execute in `sdlcforge/dev-core`** (`/Users/zane/playground/sdlcforge/dev-core`).

## Goals

Relocate this donor's tree into the dev-core layout, absorb it with history preserved, and specify the consumer swap — following D2, D4, and D5 exactly, and adapting them in the three places where this donor differs from its siblings.

The absorption itself is the smallest in the plan-group: nine relocated files, four handlers, **one** new dependency, **no** `setup`, no fixtures, no import rewrites, and a `Makefile`/`make/*.mk` set already byte-identical to what dev-core is seeded from. What makes this phase non-trivial is not volume but three specific hazards, each of which is invisible unless looked for:

1. **`src/index.mjs` collides with dev-core's aggregator (correction C17).** Every other donor's root entry is `src/index.js` and arrives as a clean file to `git rm`; D3's drop list says "the donor's root `src/index.*`". This donor's arrives as a **conflict on dev-core's own entry point**, and taking the donor's side replaces the merged-handler aggregator and the composite `setup` with a one-line re-export — which still builds, still lints, and still produces a valid-looking bundle. This is the highest-blast-radius step in the slice and it gets its own requirement and its own hard post-condition.
2. **A `file:` spec must not be unioned in (correction C13).** D4 step 3's rule is "on an overlap, take the higher range", which has no meaning for a `file:` spec and would make `@sdlcforge/dev-core` uninstallable. Phase 11 removes the spec at the source; the absorb task still checks, and halts if it sees one.
3. **This donor depends on another donor at handler-registration time (correction C14).** Two of its four paths use the `projectName` path var, which only the `projects` submodule's `setup` registers; `plugable-express`'s `pathToRe` **throws** when it is missing. Content-independence (D4) is unaffected — but a registration-based route check in dev-core is unavailable until `src/projects/` lands, so the parity check reads `path` arrays off the built bundle instead, which needs no registry.

The donor's `plan/manifest.yaml` arrives **cleanly** — the `liq-work` slice's correction C4 applies verbatim — and is dropped explicitly.

## Inputs

- Phase 11 having landed: `package.json` free of `file:` specs, and the package green from a fresh clone.
- `liq-projects` **phase 1** having landed in dev-core (hard cross-plan gate for task 002 only): `docs/dev-core-consolidation-contract.md`, authored `package.json` metadata, the Make/Babel/Rollup/Jest toolchain including `make/50-dev-core-js.mk`, and `src/index.mjs` with its aggregator and ordered-setup shape.
- `plan/notes/plugable-projects-audit-source-inventory.md` — **A4** the exact path mapping, **A1** the route table and the verified no-collision result against `liq-projects`'s 19 paths, **A2** the dependency union, **A5** the `src/index.mjs` collision, **A8** the inherited defects, **A6** the consumer inventory.
- The status notes of the `liq-projects`, `liq-orgs`, and `liq-work` absorb tasks — three prior runs of this recipe, any of which may have corrected it.
- The route-list JSON and file census that task 001 produces, which task 002 diffs against.

## Outputs

- `plugable-projects-audit` with its tree at `src/projects-audit/…`, a new `src/projects-audit/index.mjs` exporting `handlers` (and deliberately **no** `setup`), a root `src/index.mjs` reduced to a thin re-export, the trivial `src/handlers/index.mjs` deleted, and the package still green and publishable at 1 suite / 1 test.
- `@sdlcforge/dev-core` carrying `src/projects-audit/**` with `git log --follow` reaching pre-plan commits, `npm-check-plus ^1.0.0-alpha.5` as its single added dependency, no `file:` spec anywhere, the four handlers spread into the aggregator array, the composite setup list **unchanged**, and a demonstrated post-condition that `src/index.mjs` still imports every landed submodule.
- dev-core documentation for the audit surface — the first this subsystem has ever had: the 4-route table, what "audit" means here (npm dependency auditing, not policy/compliance), the `X-CWD` mechanism, the no-`setup`/`projectName` cross-submodule dependency, and the four inherited defects disclosed rather than buried.
- `docs/consumer-migration.md` in dev-core extended with this donor's section: the seven `core-server` touch-points, the atomicity requirement with **both** exact error strings, the endpoint-provenance change, the honest single-npm-dependent inventory, and the two edits that **remove** work from core-server (`REQUIRED_YALC_PACKAGES` and `AGENTS.md`'s yalc snapshot) — a simplification no sibling's handoff covers.
- No edit in any consumer repository. Executing the swap belongs to `core-server-domain-consolidation` (D9, D11).
