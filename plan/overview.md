# Modernization Foundation — Overview (liq-projects)

## Purpose and scope

This is Phase 0 ("Preconditions and de-risking") of a larger, multi-phase SDLCForge/SDLCPilot modernization effort. Phase 0 spans five repositories under one shared plan slug (`modernization-foundation`): `@sdlcforge/core-server`, `@liquid-labs/pluggable-express`, `liq-projects` (this repo), `liq-work`, and `sdlcpilot-cli`. The overall modernization (documented in full at `/tmp/flow-sdlc-modernization/synthesis.md`, and rendered at `/tmp/flow-sdlc-modernization/synthesis-artifact.html`) will eventually consolidate ~13 small plugin packages into 4 — with `liq-projects` a near-certain component of a consolidated `sdlc-core` package alongside `liq-work` and `liq-orgs` — move plugin composition from runtime/reflective to compile-time, ship a self-contained single-binary CLI via Bun, and add an MCP frontend. Phase 0 only covers foundational de-risking and prerequisites for that later work.

This repo's slice of Phase 0: a documentation stopgap only. This package owns the full lifecycle of a "project" (NPM package + playground clone + GitHub repo) but has no README and an empty `package.json` description — notable because it exposes a `/document` route that generates docs for *other* projects. The full standard doc set is deliberately deferred until the consolidation decision (whether/how this merges with `liq-work` and `liq-orgs`) lands, per the modernization synthesis §6.

## Current status

Plan created 2026-08-07. No tasks started. No cross-project dependency for this repo's single task.

## Overview

### Phase 1 — Documentation Stopgap

- **001 — Write Stopgap README and Description.** Fills the empty `package.json` description and adds a scope-and-routes README, including an explicit disambiguation from the similarly-named `liq-projects-lib` package (a real source of research confusion). Deliberately does not write architecture/spec docs — those wait for the consolidation decision.

## Open questions (not resolved by this plan)

- **Merge target and package naming.** The modernization synthesis recommends merging this package into a consolidated `sdlc-core` package (with `liq-work` and `liq-orgs`) — the user has not yet confirmed this specific consolidation, and `liq-orgs`'s placement in particular is flagged as the synthesis's least-certain call (synthesis §8, Open Question 3). This plan does not act on the merge; it only notes it in the stopgap README so future readers aren't surprised.
- **`liq-projects` vs. `liq-projects-lib` disambiguation/possible rename.** Beyond documentation, whether these two similarly-named packages should be renamed as part of modernization (independent of the merge question) is unresolved — flagged in the research note (`/tmp/flow-sdlc-modernization/liq-projects.md`, Open Question 3) as worth deciding regardless of the broader merge outcome.
