# Plan Summary: modernization-foundation

## What was planned and why

This is Phase 0 ("Preconditions and de-risking") of a larger, multi-phase SDLCForge/SDLCPilot modernization effort. Phase 0 spans five repositories under one shared plan slug (`modernization-foundation`): `@sdlcforge/core-server`, `@liquid-labs/pluggable-express`, `liq-projects`, `liq-work` (this repo), and `sdlcpilot-cli`. The overall modernization (documented in full at `/tmp/flow-sdlc-modernization/synthesis.md`, and rendered at `/tmp/flow-sdlc-modernization/synthesis-artifact.html`) will eventually consolidate ~13 small plugin packages into 4 — with `liq-work` the best-evidenced merge case in the whole set, given its pervasive, unconditional, undeclared runtime dependency on `liq-projects` — move plugin composition from runtime/reflective to compile-time, ship a self-contained single-binary CLI via Bun, and add an MCP frontend. Phase 0 only covers foundational de-risking and prerequisites for that later work.

This repo's slice of Phase 0: a documentation stopgap with a specific, higher-value purpose beyond hygiene. This package owns the "unit of work" concept (a cross-repo, branch-scoped bundle of effort) but has no README, and — more importantly — has **no plugable-express.yaml manifest declaring its real runtime dependencies** on `liq-projects`, `liq-credentials`, and `liq-integrations`, despite depending on all three at request time via the shared `app.ext` service registry. This plan's single task writes that dependency list down explicitly, because it is exactly the input a later modernization phase needs to build the compile-time plugin manifest (synthesis §3) that would turn this undeclared coupling into a build-time-checked one.

### Phase 1 — Documentation Stopgap

- **001 — Write README With Dependency Enumeration.** Fills the empty `package.json` description and adds a scope-and-routes README, plus a required "Runtime dependencies on other plugins" section naming all three undeclared `app.ext` dependencies (`liqProjects.playgroundMonitor` — unconditional/unguarded; `credentialsDB`; `integrations`/controls hook — guarded/optional) with the specific source modules that call each. Deliberately does not write architecture/spec docs — those wait for the consolidation decision.

## What shipped

### Phase 01 — Documentation Stopgap

1. **Write README With Dependency Enumeration** (`001-write-readme-with-dependency-enumeration.md`, tier `sonnet-med`) — Wrote README.md for liq-work covering the unit-of-work domain model, the 30-route surface, the plugable-express integration shape, and a mandatory Runtime dependencies on other plugins section enumerating three undeclared app.ext dependencies (_liqProjects.playgroundMonitor unconditional/unguarded, credentialsDB, integrations guarded via supportsControls===false fallback). Filled package.json's empty description field. Every file/line reference was independently re-verified against current source, not merely transcribed from the research note. No new Flow-standard doc beyond README was created.
   Commit `a17c88d`, merged at `0a77d06`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

_No follow-up items in `plan/followups.yaml` are tagged to this plan._

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Documentation Stopgap

- [x] [001-write-readme-with-dependency-enumeration.md](./phase-01-docs-stopgap/001-write-readme-with-dependency-enumeration.md) — tier `sonnet-med` · branch `plan/modernization-foundation-01-001` · commit `a17c88d` · merge `0a77d06`
