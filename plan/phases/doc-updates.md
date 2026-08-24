# Documentation Updates

## Goals

Bring `@sdlcforge/core-server`'s architecture, specification, and contributor documentation into line with the post-absorption reality, so nothing is left describing an eleven-package explicit tier that no longer exists.

This phase is required rather than discretionary: the change checks three of the architectural-implications criteria outright. A documented component boundary moves (three plugins stop being Tier-2 npm-dependency packages and become in-tree modules of the server itself); a public interface changes (`GET /server/plugins/list`, `GET /server/plugins/integrations/list`, and every absorbed endpoint's `npmName` provenance now report `@sdlcforge/core-server` in place of three donor package names); and spec-described behavior about where the server's capability comes from changes. `docs/architecture.md` is additionally *already* stale independent of this plan — it describes thirteen explicit plugins against an array that holds eleven — so the review has a pre-existing correction to make as well as a new one.

## Inputs

- Every implementation task document from Phases 4 and 5, which together define the new tier shape, the registration mechanism, and the accepted identity diffs.
- Phase 3's parity contract and Phase 5's aggregate verification result — the authoritative record of what actually changed observably, as opposed to what was planned.
- The current documentation set: `docs/architecture/plugin-loading-tiers.md` (its Tier-2 table and the `11 npm-dependency packages` label in its mermaid diagram), `docs/architecture.md`, `docs/core-server-spec.md`, `docs/project-structure.md`, `AGENTS.md`, and `README.md`.

## Outputs

- Each of the six named documents reviewed and, where it describes the pre-absorption tier, corrected: the explicit tier stated as eight packages, the new in-tree/built-in tier described alongside it, `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/` accounted for in the source-tree map, and the `builtinPlugins` registration path described where the loading sequence is described.
- The plugin-list identity change stated plainly as a deliberate, accepted consumer-visible diff rather than left for a consumer to discover.
- No document left asserting a package count, a plugin name, or a source-tree layout that the post-absorption source contradicts.
