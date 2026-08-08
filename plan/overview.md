# Modernization Foundation — Overview (liq-work)

## Purpose and scope

This is Phase 0 ("Preconditions and de-risking") of a larger, multi-phase SDLCForge/SDLCPilot modernization effort. Phase 0 spans five repositories under one shared plan slug (`modernization-foundation`): `@sdlcforge/core-server`, `@liquid-labs/pluggable-express`, `liq-projects`, `liq-work` (this repo), and `sdlcpilot-cli`. The overall modernization (documented in full at `/tmp/flow-sdlc-modernization/synthesis.md`, and rendered at `/tmp/flow-sdlc-modernization/synthesis-artifact.html`) will eventually consolidate ~13 small plugin packages into 4 — with `liq-work` the best-evidenced merge case in the whole set, given its pervasive, unconditional, undeclared runtime dependency on `liq-projects` — move plugin composition from runtime/reflective to compile-time, ship a self-contained single-binary CLI via Bun, and add an MCP frontend. Phase 0 only covers foundational de-risking and prerequisites for that later work.

This repo's slice of Phase 0: a documentation stopgap with a specific, higher-value purpose beyond hygiene. This package owns the "unit of work" concept (a cross-repo, branch-scoped bundle of effort) but has no README, and — more importantly — has **no plugable-express.yaml manifest declaring its real runtime dependencies** on `liq-projects`, `liq-credentials`, and `liq-integrations`, despite depending on all three at request time via the shared `app.ext` service registry. This plan's single task writes that dependency list down explicitly, because it is exactly the input a later modernization phase needs to build the compile-time plugin manifest (synthesis §3) that would turn this undeclared coupling into a build-time-checked one.

## Current status

Plan created 2026-08-07. No tasks started. No cross-project dependency for this repo's single task.

## Overview

### Phase 1 — Documentation Stopgap

- **001 — Write README With Dependency Enumeration.** Fills the empty `package.json` description and adds a scope-and-routes README, plus a required "Runtime dependencies on other plugins" section naming all three undeclared `app.ext` dependencies (`liqProjects.playgroundMonitor` — unconditional/unguarded; `credentialsDB`; `integrations`/controls hook — guarded/optional) with the specific source modules that call each. Deliberately does not write architecture/spec docs — those wait for the consolidation decision.

## Open questions (not resolved by this plan)

- **Merge target and timing.** The modernization synthesis recommends merging this package into a consolidated `sdlc-core` package (with `liq-projects` and possibly `liq-orgs`) — not yet confirmed by the user as a specific, scheduled decision. This plan does not act on the merge; it produces the dependency-enumeration evidence a later decision and later manifest work will need.
- **Thin test coverage.** Only 2 test files exist against ~3,423 LOC and 30 routes, and the package is a year stale. The synthesis (§7, Phase 2 risk notes) recommends adding route-level smoke tests *before* any merge lands — out of scope for this plan, flagged here for the manager to track into whichever later plan executes the actual consolidation.
