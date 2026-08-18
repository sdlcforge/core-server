# Phase 5 — liq-orgs Migration

## Purpose and scope

Phase summary for the migration phase of the `dev-core-consolidation` plan-group's `liq-orgs` slice. Task 001 executes in `liq-orgs` (`/Users/zane/playground/liquid-labs/liq-orgs`); tasks 002 and 003 execute in `sdlcforge/dev-core` (`/Users/zane/playground/sdlcforge/dev-core`).

## Goals

Move liq-orgs's code into `@sdlcforge/dev-core` as the `src/orgs/` submodule with no behavior change and with its git history intact, document a subsystem that has never been documented, and specify — without executing — the consumer swap that `core-server` must perform.

The phase is split in two steps across two repositories on purpose. Restructuring inside liq-orgs first, to the exact paths the code will occupy in dev-core, is what makes the absorption a plain `git merge --allow-unrelated-histories` with no path rewriting: history survives, the diff is reviewable, and the donor stays green and publishable while the transition runs. It also proves the layout builds and tests under the real toolchain before any cross-repository step happens.

Two things make this slice materially different from the `liq-projects` slice that established the recipe, and both shape how the tasks are written:

- **The tests cannot catch a regression here.** liq-orgs's single suite covers one pure utility module; `setup.mjs`, all five handlers, `parameters-lib.mjs`, and `organization.mjs` sit at 0% coverage. A green `make test` after the move proves almost nothing about the migrated behavior. Validation therefore leans on static and structural checks — file census, route-array equality, path-var inventory, exported-shape and `app.ext`-key assertions against a stub app — and each task says so rather than letting a green suite imply safety it does not provide.
- **There is no documentation to port, only documentation to write.** liq-projects carried an accurate README route table into dev-core. liq-orgs has no README, no `docs/`, and an empty `description`. The `/orgs` route surface and the `app.ext._liqOrgs` contract that `liq-controls` and `liq-policy` depend on have never been written down anywhere. Authoring them is a deliverable of this phase, not an afterthought.

The consumer handoff is authored here rather than executed here because every consumer touch point lives in `core-server`, whose own plan-group (`core-server-domain-consolidation`) owns those edits. Writing the spec down — with exact files, exact lines, and the atomicity requirement — is what keeps the ownership split from becoming a dropped handoff.

## Inputs

- **`liq-projects` phase 1's outputs — a hard, cross-plan prerequisite for task 002.** dev-core's committed `docs/dev-core-consolidation-contract.md`, its authored `package.json` metadata and toolchain (`Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `.gitignore`), and `src/index.mjs`'s aggregator with its documented submodule-registration and setup-ordering shape. **This phase does not re-scaffold any of it.** Task 002 must verify these exist before merging and halt if they do not. Task 001 has no such dependency and may run at any time.
- `liq-orgs` at its current `main` (`eebf32f`), green as measured by running the toolchain: 1 test suite / 37 tests passing, lint clean, `dist/liq-orgs.js` building from `src/index.js`. Note that `/qa` is gitignored in this repo, so there are no committed QA reports — the baseline was measured, not read.
- **A dirty working tree that task 001 must resolve first**: an uncommitted `package.json` addition of `"@liquid-labs/playground-monitor": "file:.yalc/@liquid-labs/playground-monitor"`, unused by any source file and pointing at a gitignored directory.
- The exact old → new path mapping (13 files), the 4 runtime dependencies to union, the 5-route inventory with byte-exact `path` arrays, the three path vars, the three `app.ext.setupMethods` entries with their `deps` markers, the measured validation baseline, the full three-dependent consumer inventory, and the C1/C2/C3 corrections to the shared foundation — all in `plan/notes/liq-orgs-source-inventory.md`.
- `core-server`'s current state as read-only input for the handoff spec: `package.json:46`'s registry range `"@liquid-labs/liq-orgs": "^1.0.0-alpha.6"` (*not* a yalc link, unlike liq-projects), the `explicitPlugins` array at `src/lib/app-init.mjs:37`, `docs/architecture.md` and `docs/architecture/plugin-loading-tiers.md`, and the golden snapshots under `test/__snapshots__/`. liq-orgs appears in **no** core-server test fixture.
- `plugable-express` as read-only input for the contracts being preserved and for C1's evidence: `src/lib/load-plugins.js`, `src/lib/register-handlers.js`, `src/lib/path-var-registry.mjs`, `src/app.js`.

## Outputs

- In `liq-orgs`: a resolved working tree; all 12 surviving source files relocated to `src/orgs/…` per the mapping; a new `src/orgs/index.mjs` exporting `{ handlers, setup }`; a thin root `src/index.js` re-export keeping the package's own plugin contract identical; the trivial `src/handlers/index.js` gone; and build/test/lint still green at the same 1-suite / 37-test baseline.
- In `dev-core`: `src/orgs/**` carrying the complete relocated tree with pre-merge history reachable via `git log --follow`; liq-orgs's 4 runtime dependencies unioned into `package.json` with a refreshed `package-lock.json`; `src/index.mjs` wired to the `orgs` submodule second in the composite setup order; the `/orgs` route surface and the `app.ext._liqOrgs` contract documented for the first time; the C1 correction present in the contract doc; and green `make build` / `make test` / `make lint` with 5 routes, 3 path vars, 3 ordered setup methods, and the reproduced test baseline.
- In `dev-core`: the `liq-orgs` section of `docs/consumer-migration.md` — the executable-by-another-plan spec for repointing `core-server`, covering the registry dependency entry, the `explicitPlugins` swap, the atomicity requirement with the exact error strings a non-atomic swap produces, the endpoint-provenance change, the two architecture docs to update, and the `app.ext._liqOrgs` preservation guarantee that keeps `liq-controls` unaffected.
