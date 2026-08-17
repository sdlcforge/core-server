# Rewrite Readme As Superseded Notice

## Purpose and scope

**Executes in the `liq-projects` repository.** Touches `README.md` only.

Rewrite `liq-projects`'s `README.md` as a superseded notice pointing at `@sdlcforge/dev-core`, so that anyone arriving at this package — from npm, from GitHub, or from a stale dependency reference — immediately learns it is retired, what replaced it, and what to do about it. The package keeps working and keeps its source; retirement here is a labelling change, matching the policy the sibling `@liquid-labs/liq-integrations` retirement established.

## Requirements

1. **Lead with the superseded notice**, immediately after the title, before anything else: `@liquid-labs/liq-projects` is superseded by `@sdlcforge/dev-core`, which absorbed this package's full `/projects` route surface and its plugin `setup` unchanged. Name the dev-core repository (`sdlcforge/dev-core`) so a reader can navigate there.
2. **Migration instructions** for both consumption paths:
   - *npm dependency:* remove `@liquid-labs/liq-projects` and add `@sdlcforge/dev-core`, in a single change. State the atomicity requirement and both of its reasons in brief — all 19 `/projects` routes would otherwise register twice (Express silently shadows duplicates; there is no duplicate-path detection), and the `GITHUB_API` credential registration must never be absent between the two steps. Point at dev-core's own `docs/consumer-migration.md` for the exact edit list rather than duplicating it here.
   - *plugable-express plugin registration:* the entry in a server's explicit-plugin list changes from `@liquid-labs/liq-projects` to `@sdlcforge/dev-core`; the route surface, methods, parameters, and responses are unchanged, and only the per-endpoint provenance name changes.
3. **Known-consumer inventory**, stated as fact with the verification method named (a playground-wide `package.json` and source grep):
   - `@sdlcforge/core-server` — the only npm dependent: one `dependencies` entry (a local `file:.yalc/…` link), one explicit-plugin entry, and three test fixtures.
   - Explicitly **cleared as non-dependents**, needing no change: `liq-controls` and `liq-integrations-issues-github` (they couple only to the runtime `app.ext._liqProjects` contract, which dev-core preserves verbatim), and `liq-work`, `liq-orgs`, `plugable-projects-audit` (same contract, and all three end up inside dev-core themselves).
4. **Preserve, reframed, what is still true and useful**: the description of what a "project" is in this system (the NPM package / playground clone / GitHub repository triad), the route table (as the record of what moved, explicitly labelled as now served by dev-core), and — in substance — the `liq-projects` vs `liq-projects-lib` disambiguation note. That confusion is real, has already cost a contributor time, and outlives this package: `@liquid-labs/liq-projects-lib` is a different package with a different purpose and is **not** superseded by this notice.
5. **Remove what is no longer true**: any link to the deleted generated API reference (`docs/index.html`), and the "modernization status / likely merge candidate" framing, which this notice replaces with the completed outcome.
6. **Do not** touch `package.json`, `src/`, `Makefile`, `make/`, or any other file. Version and description changes belong to task 003, which runs in parallel with this one against a disjoint file.

## Validation

- `git status --short` shows `README.md` as the only modified file, and `git diff --stat` reports exactly one changed file.
- The superseded notice is the first content after the title — verify by reading the rendered order, not just by grepping for the word.
- `@sdlcforge/dev-core` and `sdlcforge/dev-core` both appear; the replacement is unambiguous.
- Both migration paths (npm dependency, explicit-plugin registration) are present, and the atomicity requirement appears with both of its reasons.
- The known-consumer inventory names `@sdlcforge/core-server` as the sole npm dependent and explicitly clears the five non-dependents by name.
- The `liq-projects-lib` disambiguation survives and does **not** imply that package is also retired.
- No link to `docs/index.html` (or any other `docs/` path) remains: `grep -n 'docs/' README.md` returns nothing pointing at the deleted tree.
- Every `src/...` path the README still mentions exists in the current tree (`test -e` each one) — the paths moved in phase 2, so a stale path here is a real error.
- `make lint` passes (it lints the repository, and a README edit must not disturb it).
- No claim in the README contradicts `package.json`: the package name and the fact that `src/` is still shipped and functional.

## Assumptions

- Task 001 (the verification gate) has passed. If it has not, this task must not run — a superseded notice naming a replacement that does not yet fully exist is exactly the failure the gate prevents.
- Task 003 runs in parallel against `package.json`; do not anticipate its version number or description text here. Refer to the replacement package, not to a specific final version of this one.
- `README.md`'s current route table is accurate as of phase 2 task 001 (which updated its source paths); re-verify the paths rather than trusting them.

## References

- `plan/notes/liq-projects-source-inventory.md` — the consumer inventory (including the cleared non-dependents), the 19-route table, and the atomicity reasoning.
- `plan/notes/dev-core-target-shape.md` — decision D10 (retirement policy, and why no shim is published).
- `/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md` — the exact edit list this notice points to instead of duplicating.
- `/Users/zane/playground/liquid-labs/liq-integrations/README.md` — the sibling package's completed superseded notice; a good structural model.

## Checkpoint hints

- After the superseded notice and migration instructions are written.
- After the consumer inventory and the reframed "what a project is" / route-table sections are in place.
- After the stale links and modernization-status framing are removed and `make lint` passes.
