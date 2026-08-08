# Modernization Foundation — Overview (core-server)

## Purpose and scope

This is Phase 0 ("Preconditions and de-risking") of a larger, multi-phase SDLCForge/SDLCPilot modernization effort. Phase 0 spans five repositories under one shared plan slug (`modernization-foundation`): `@sdlcforge/core-server` (this repo), `@liquid-labs/pluggable-express`, `liq-projects`, `liq-work`, and `sdlcpilot-cli`. The overall modernization (documented in full at `/tmp/flow-sdlc-modernization/synthesis.md`, and rendered at `/tmp/flow-sdlc-modernization/synthesis-artifact.html`) will eventually consolidate ~13 small plugin packages into 4, move plugin composition from runtime/reflective to compile-time, ship a self-contained single-binary CLI via Bun, and add an MCP frontend. Phase 0 only covers foundational de-risking and prerequisites for that later work — it does not implement any of the consolidation, compile-time composition, or binary packaging itself.

This repo's slice of Phase 0: establish the regression safety net (a golden API-spec characterization test) that every later modernization phase depends on to prove "all capabilities retained," pick up the framework rename from `pluggable-express`'s own plan once that lands, and clear two small pieces of accumulated cruft.

## Current status

Plan created 2026-08-07. No tasks started. Task 002 (`consume-renamed-plugable-express`) has a **cross-project dependency**: it cannot start until `pluggable-express`'s own plan (same slug, phase 1, task 002 `publish-renamed-package-for-local-consumption`) has landed. This dependency is recorded in this project's `plan/manifest.yaml` via `manifest_patch`. Tasks 001 and 003 have no cross-project dependency and can proceed independently of `pluggable-express`'s plan.

## Overview

### Phase 1 — Core-Server Foundation Work

- **001 — Golden API-Spec Characterization Test.** Snapshots the server's current `/server/api` and `/server/plugins/list` responses as a regression baseline before any other Phase 0 (or later-phase) change lands. No dependency on other tasks or projects; do this first.
- **002 — Consume Renamed Plugable-Express.** Picks up the renamed `@liquid-labs/plugable-express` package from `pluggable-express`'s own plan via yalc, and re-runs task 001's golden test to prove the rename was consumption-transparent. **Blocked on `pluggable-express` phase 1 task 002.**
- **003 — Trivial Cleanups.** Two small, unrelated hygiene fixes (a stale library export name, a version-pin typo). Independent of the other two tasks; can run in any order relative to them.

Suggested execution order: 001 (baseline) → 003 (independent, small) → 002 (once unblocked by `pluggable-express`).

## Open questions (not resolved by this plan)

- **Monorepo layout, tooling, and location.** As with `pluggable-express`'s own plan: the user has decided *that* this repo, the framework, the future consolidated domain plugins, and the product package should eventually collapse into one workspace, but not the concrete tooling/name/location. This plan does not attempt that migration — it uses yalc as the Phase-0 interim mechanism.
- **Endpoint audit (synthesis §8, Open Question 7).** Whether all ~62 endpoints across the whole plugin set are actually used, or some are vestigial, remains unconfirmed. Not blocking for Phase 0, but relevant to how expensive "retain all capabilities" is in later phases.
