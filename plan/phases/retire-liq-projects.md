# Phase 3 — Retire liq-projects

## Purpose and scope

Phase summary for the retirement phase of the `dev-core-consolidation` plan-group's `liq-projects` slice. Executes in `liq-projects` (`/Users/zane/playground/liquid-labs/liq-projects`), apart from task 001's read-only reads of the dev-core checkout.

## Goals

End `@liquid-labs/liq-projects` as a final, working, clearly-labelled superseded release once dev-core carries its functionality — documentation and metadata, not code deletion, and no re-export shim.

The shape follows the completed sibling retirement of `@liquid-labs/liq-integrations` under this same wave's `framework-consolidation` plan-group, whose reasoning applies here unchanged: marking a package superseded is a one-way public statement, so a cheap read-only gate confirming the replacement really exists comes first; stripping `src/` would break any server still loading the package, so retirement is a labelled release rather than a deletion; and repository archival is a separate, irreversible decision that belongs to the user rather than to a task agent.

No shim is published. A shim re-exporting the handlers would register all 19 `/projects` routes a second time — `registerHandlers` has no duplicate-path detection, so Express would silently shadow the duplicates and the generated API spec would carry both — and the only npm dependent, `core-server`, repoints atomically anyway. Consumers that couple only to `app.ext._liqProjects` need nothing, because dev-core preserves that key exactly.

This phase does not wait on `core-server` repointing. A deprecation notice and a final publish break nothing while core-server is still linked to the old package; only archival (deliberately deferred to the user) genuinely requires the repoint to have landed.

## Inputs

- Phase 2's outputs: the `projects` submodule live in dev-core, green, with the consumer handoff spec authored.
- The consumer inventory and the route/dependency/test baselines in `plan/notes/liq-projects-source-inventory.md`, which task 001 verifies against dev-core rather than re-deriving.
- `liq-projects` at `1.0.0-alpha.15`, with `README.md` currently describing the live route surface and linking a stale generated API reference that phase 2 removed.
- The retirement precedent recorded in `liq-integrations`'s `plan/plan-summary-framework-consolidation.md`.

## Outputs

- A read-only verification record (in the task document) confirming, with file and line evidence, that dev-core carries every relocated module, all 19 routes, the composed `setup`, and all 16 dependencies, and that dev-core's own build/test/lint pass — or a halt, if anything is missing.
- `README.md` rewritten as a superseded notice: replacement package named, migration instructions for both the npm-dependency and the runtime-plugin paths, known-consumer inventory (core-server as the sole npm dependent; `liq-controls`, `liq-integrations-issues-github`, and the sibling donors explicitly cleared as non-dependents), and the dead generated-API-reference link gone.
- `package.json` at `1.0.0-alpha.16` with a deprecation-bearing `description`, `make qa` green, and `src/` and dependencies untouched.
- An attempted `npm publish` + `npm deprecate`, with both exact commands and their working directory recorded verbatim in the task document for manual execution when the environment blocks them, and repository archival recorded as an open user decision rather than performed.
