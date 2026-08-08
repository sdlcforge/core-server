# Plan Summary: modernization-foundation

## What was planned and why

This is Phase 0 ("Preconditions and de-risking") of a larger, multi-phase SDLCForge/SDLCPilot modernization effort. Phase 0 spans five repositories under one shared plan slug (`modernization-foundation`): `@sdlcforge/core-server` (this repo), `@liquid-labs/pluggable-express`, `liq-projects`, `liq-work`, and `sdlcpilot-cli`. The overall modernization (documented in full at `/tmp/flow-sdlc-modernization/synthesis.md`, and rendered at `/tmp/flow-sdlc-modernization/synthesis-artifact.html`) will eventually consolidate ~13 small plugin packages into 4, move plugin composition from runtime/reflective to compile-time, ship a self-contained single-binary CLI via Bun, and add an MCP frontend. Phase 0 only covers foundational de-risking and prerequisites for that later work — it does not implement any of the consolidation, compile-time composition, or binary packaging itself.

This repo's slice of Phase 0: establish the regression safety net (a golden API-spec characterization test) that every later modernization phase depends on to prove "all capabilities retained," pick up the framework rename from `pluggable-express`'s own plan once that lands, and clear two small pieces of accumulated cruft.

### Phase 1 — Core-Server Foundation Work

- **001 — Golden API-Spec Characterization Test.** Snapshots the server's current `/server/api` and `/server/plugins/list` responses as a regression baseline before any other Phase 0 (or later-phase) change lands. No dependency on other tasks or projects; do this first.
- **002 — Consume Renamed Plugable-Express.** Picks up the renamed `@liquid-labs/plugable-express` package from `pluggable-express`'s own plan via yalc, and re-runs task 001's golden test to prove the rename was consumption-transparent. **Blocked on `pluggable-express` phase 1 task 002.**
- **003 — Trivial Cleanups.** Two small, unrelated hygiene fixes (a stale library export name, a version-pin typo). Independent of the other two tasks; can run in any order relative to them.

Suggested execution order: 001 (baseline) → 003 (independent, small) → 002 (once unblocked by `pluggable-express`).

## What shipped

### Phase 01 — Core-Server Foundation Work

1. **Golden API-Spec Characterization Test** (`001-golden-api-spec-characterization-test.md`, tier `sonnet-med`) — Added src/lib/test/golden-api-spec.test.js, a Jest+Supertest test that boots the server in-process via appInit() and snapshots GET /server/api and GET /server/plugins/list against checked-in JSON fixtures. Placed under src/lib/test/ since that's the only location npm test actually executes. Scoped to skipCorePlugins: true since the real 13-plugin explicit set currently crashes appInit() (see flagged item) - documented in plan/resources/golden-api-spec-baseline.md along with check/regenerate commands. Verified the regression-detection mechanism by removing a route from the checked-in snapshot and confirming a clear Jest diff, then restoring it. npm test and lint on the new file are both clean.
   Commit `f31deb9`, merged at `616e4d2`.

2. **Consume Renamed Plugable-Express** (`002-consume-renamed-plugable-express.md`, tier `sonnet-low`) — Pulled the freshly published @liquid-labs/plugable-express@1.0.0-alpha.57 into the worktree via yalc add, replacing the stale 1.0.0-alpha.55 snapshot; package.json needed no change. npm install produced a lockfile diff hand-scoped to only the plugable-express entry. Re-running task 001's golden API-spec test initially failed on one expected content difference (help-text 'plugable-server'->'pluggable-server', an old pre-existing Oct-2025 framework typo unrelated to this rename, inherited only because alpha.55 was itself a year-stale build predating that unrelated change) - manager independently verified this via git archaeology in the pluggable-express repo before accepting, confirming it is not a regression. Resolved via the project's sanctioned snapshot-regeneration path. npm test now passes in full.
   Commit `32837cc`, merged at `a382e3d`.

3. **Trivial Cleanups** (`003-trivial-cleanups.md`, tier `haiku-low`) — Updated stale placeholder exports in src/lib/index.js from 'snippets'/'Snippet handling.' to '@sdlcforge/core-server' and a descriptive summary. package.json required no changes — grep confirmed no 'alpah' typo present. All validation checks pass.
   Commit `1da55f6`, merged at `dbbea33`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`ynGa`** — **Real bug discovered, out of scope to fix in t** — Real bug discovered, out of scope to fix in this task: loading the actual explicit-plugin set (skipCorePlugins: false, the production default) throws inside appInit() - liq-credentials, liq-credentials-db, liq-integrations, and liq-work still read app.ext.serverHome, which @liquid-labs/plugable-express no longer sets after its serverHome->serverConfigRoot rename. appInit() currently cannot successfully load the real explicit-plugin set at all, in any environment - not just under test. Candidate follow-up task; until resolved, no test (and arguably no real server run) can exercise the full core-routes-plus-every-loaded-plugin surface. Full write-up in plan/resources/golden-api-spec-baseline.md.

- **`mT02`** — **GET /server/plugins/list currently snapshots** — GET /server/plugins/list currently snapshots to [] under the skipCorePlugins: true scoping (no plugins loaded) - valid but low-signal until the plugin-loading bug above is fixed.

- **`u6gW`** — **npm run test:local is blocked by a pre-existi** — npm run test:local is blocked by a pre-existing, unrelated bug: test/test-server.js hardcodes the Docker-only /project/test-staging/integration-results path, so it cannot run on a bare host checkout outside the test:integration container. Predates this task. Candidate follow-up: give test/test-server.js a host-relative fallback.

- **`26sW`** — **npm start + heartbeat validation remains bloc** — npm start + heartbeat validation remains blocked by the already-known, already-flagged serverHome/serverConfigRoot cross-package incompatibility in liq-credentials (and presumably liq-credentials-db, liq-integrations, liq-work) - confirmed reproduced here, no new information beyond what task 001 already flagged.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Core-Server Foundation Work

- [x] [001-golden-api-spec-characterization-test.md](./phase-01-core-server-foundation/001-golden-api-spec-characterization-test.md) — tier `sonnet-med` · branch `plan/modernization-foundation-01-001` · commit `f31deb9` · merge `616e4d2`
- [x] [002-consume-renamed-plugable-express.md](./phase-01-core-server-foundation/002-consume-renamed-plugable-express.md) — tier `sonnet-low` · branch `plan/modernization-foundation-01-002` · commit `32837cc` · merge `a382e3d`
- [x] [003-trivial-cleanups.md](./phase-01-core-server-foundation/003-trivial-cleanups.md) — tier `haiku-low` · branch `plan/modernization-foundation-01-003` · commit `1da55f6` · merge `dbbea33`
