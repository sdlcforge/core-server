# Phase 2 — liq-projects Migration

## Purpose and scope

Phase summary for the migration phase of the `dev-core-consolidation` plan-group's `liq-projects` slice. Task 001 executes in `liq-projects` (`/Users/zane/playground/liquid-labs/liq-projects`); tasks 002 and 003 execute in `sdlcforge/dev-core` (`/Users/zane/playground/sdlcforge/dev-core`).

## Goals

Move liq-projects's code into `@sdlcforge/dev-core` with no behavior change and with its git history intact, and specify — without executing — the consumer swap that `core-server` must perform.

The phase is split in two steps across two repositories on purpose. Restructuring inside liq-projects first, to the exact paths the code will occupy in dev-core, is what makes the absorption a plain `git merge --allow-unrelated-histories` with no path rewriting: history survives, the diff is reviewable, and the donor stays green and publishable while the transition runs. It also proves the layout builds and tests under the real toolchain before any cross-repository step happens.

The consumer handoff is authored here rather than executed here because every consumer touch point lives in `core-server`, whose own plan-group (`core-server-domain-consolidation`) owns those edits. Writing the spec down — with exact files, exact lines, and the atomicity requirement — is what keeps the ownership split from becoming a dropped handoff.

## Inputs

- Phase 1's outputs: dev-core's contract doc, authored `package.json`, toolchain, and `src/index.mjs` aggregator with its documented submodule-registration shape.
- liq-projects at its current `main`, green: 8 test suites / 29 tests passing, lint clean, `dist/liq-projects.js` building from `src/index.js`.
- The exact old → new path mapping, the 16 runtime dependencies to union, the one required post-move content edit (the `npmName` expectation in `test/lib/test-calls-implied.mjs`), the 19-route inventory, and the full consumer inventory — all in `plan/notes/liq-projects-source-inventory.md`.
- `core-server`'s current state as read-only input for the handoff spec: `package.json`'s `file:.yalc/@liquid-labs/liq-projects` entry, the `explicitPlugins` array in `src/lib/app-init.mjs`, the fixtures in `test/test-basic.js` and `test/test-integration-quick.js`, and the golden snapshots under `test/__snapshots__/`.

## Outputs

- In `liq-projects`: the whole `src/` tree relocated to `src/projects/…` per the mapping, a new `src/projects/index.mjs` exporting `{ handlers, setup }`, a thin root `src/index.js` re-export keeping the package's own contract identical, the trivial `src/handlers/index.js` and the 32 stale generated `docs/*.html` files gone, and build/test/lint still green at the same baseline.
- In `dev-core`: `src/projects/**` carrying the complete relocated tree with pre-merge history reachable via `git log --follow`; liq-projects's 16 runtime dependencies unioned into `package.json` with a refreshed `package-lock.json`; `src/index.mjs` wired to the `projects` submodule; the corrected `npmName` expectation; the accurate route table ported into dev-core's docs; and green `make build` / `make test` / `make lint` with 19 routes and the reproduced test baseline.
- In `dev-core`: `docs/consumer-migration.md` — the executable-by-another-plan spec for repointing `core-server`, covering the dependency entry and yalc link, the `explicitPlugins` swap, the three test fixtures, the atomicity requirement for both route registration and the `GITHUB_API` credential provider, the endpoint-provenance change, the golden-snapshot re-verification, and the `app.ext._liqProjects` preservation guarantee that keeps `liq-controls` and `liq-integrations-issues-github` unaffected.
