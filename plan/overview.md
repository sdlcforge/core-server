# Overview

## Purpose and scope

This is `@sdlcforge/core-server`'s own slice of the **`core-server-domain-consolidation`** plan-group, part of the `sdlcforge-modernization` wave plan (wave: "Plugin Consolidation — Framework and Dev-Core"; lead project: `core-server`). The plan-group federates four projects: three **donors** — `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-integrations-issues-github`, each of which relocates its own plugin source and then retires — and `core-server`, the **fold-in target**, which absorbs all three into its own codebase and drops them from its Tier-2 explicit npm-dependency plugin list.

The convention followed is the one two completed sibling plan-groups in this same wave already executed: `framework-consolidation` (folding `liq-integrations` and `plugable-server-documentation` into `plugable-express`) and `dev-core-consolidation` (folding `liq-projects`/`liq-work`/`liq-orgs`/`plugable-projects-audit` into the new `@sdlcforge/dev-core`). The latter's [`docs/dev-core-consolidation-contract.md`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md) is the canonical absorption recipe this plan applies: layout convention, root-file ownership, the six-step `git merge --allow-unrelated-histories` recipe against each donor's *relocated-tree branch* (not `main`), the `app.ext` contract freeze, and the source-package retirement policy.

### What must change

1. `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` become in-tree modules of `core-server`'s own source tree, absorbed by history-preserving merge from each donor's `plan/core-server-domain-consolidation` branch.
2. Those three entries are removed from the `explicitPlugins` array in `src/lib/app-init.mjs` and from `package.json`'s `dependencies`; their own runtime dependencies are unioned into `core-server`'s `package.json`.
3. Some mechanism registers the absorbed modules as plugins at the *same point in `appInit`'s sequence* the npm-dependency path occupies today. **No such mechanism exists in `@liquid-labs/plugable-express` today** — this is the plan's central open decision, recorded in [in-tree plugin registration](./notes/in-tree-plugin-registration.md).
4. `core-server`'s own documentation stops describing an 11-package explicit tier that includes these three.

### What must not change

- **The HTTP surface.** Every route, method, status code, and response shape the three donors provide today must behave identically afterwards. `liq-controls` contributes `GET /orgs/:orgKey/controls/list` and `GET /orgs/controls/list`; `liq-credentials` contributes `PUT /credentials/:credential/import` and `GET /credentials/list`; `liq-integrations-issues-github` contributes no routes at all (hooks only). Full inventory: [absorbed surface inventory](./notes/absorbed-surface-inventory.md).
- **The `app.ext` contract names.** `app.ext._liqOrgs`, `app.ext._liqProjects`, `app.ext.credentialsDB`, `app.ext.integrations`, `app.ext.setupMethods`, and `app.ext.serverConfigRoot` keep their exact current names, per the `dev-core-consolidation-contract`'s [`app.ext` contract freeze](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#appext-contract-freeze), which names `liq-controls` and `liq-integrations-issues-github` explicitly as outside readers.
- **The setup-method dependency names.** `'load orgs'` (from `liq-orgs`) and `'setup integrations'` (built into `plugable-express`) are matched by exact string by `@liquid-labs/dependency-runner`.
- **`liq-orgs` and `liq-projects`.** Both stay separate npm-dependency explicit plugins; neither is in scope here.
- **`@liquid-labs/liq-credentials-db`.** Stays an external dependency; it is not folded.

### Success criteria

- All three donors' functionality is served from `core-server`'s own bundle (`dist/sdlcforge-server.js`), with the same routes, path variables, setup methods, and integration providers/hooks as the pre-absorption baseline.
- No entry for the three packages remains in `explicitPlugins` or in `package.json` `dependencies`; `grep -n 'file:' package.json` finds no `file:` spec introduced by the dependency union.
- `make build`, `make test`, and `make lint` are green; the golden API spec and golden plugins list snapshots are updated with every accepted diff enumerated and justified.
- `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/core-server-spec.md`, `docs/project-structure.md`, `AGENTS.md`, and `README.md` describe the post-absorption tier accurately.

### Decisions already made from source

Two of the four design decisions the planning request posed are settled and need no further input; both are recorded in [absorption layout and merge hazards](./notes/absorption-layout-and-merge-hazards.md).

- **Layout.** The three absorbed submodules land at `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/` — top-level siblings of the existing `src/lib/` and `src/cli/`, matching `dev-core`'s "one top-level directory per source package, named for its domain" convention. This is forced rather than chosen: `liq-controls`' own Phase 1 has already committed to relocating to `src/controls/…` in its own repository, and a path-preserving merge lands it at exactly that path in `core-server`. The two donors whose plans are not yet authored must relocate to `src/credentials/…` and `src/integrations-issues-github/…` respectively.
- **Root files and merge hazards.** `core-server` owns every root-level file; donor copies are dropped. Two specific add/add collision hazards are identified by name in that note — `src/lib/index.js` (`liq-controls`' retained thin re-export versus `core-server`'s own library export surface) and `src/index.js` (arriving from both `liq-credentials` and `liq-integrations-issues-github`) — each of which merges *silently wrong* rather than failing loudly if resolved by reflex.

### Open decisions blocking task breakdown

- **The registration mechanism** — [in-tree plugin registration](./notes/in-tree-plugin-registration.md). Confirmed from source: `plugable-express`'s loader discovers, identifies, and imports plugins purely as installed npm packages, and every ordering-sensitive step (`setup`, `pendingHandlers`, error middleware, `dependency-runner`, API-spec write) happens inside `appInit` with no caller hook. The clean fix is a small new `appInit` affordance in `plugable-express` — a repository that is **not** a participant of this plan-group. That is a scope decision only the user can make.
- **Plugin-list identity** — [plugin list visibility](./notes/plugin-list-visibility.md). `GET /server/plugins/list` and `GET /server/plugins/integrations/list` report loaded plugins *by npm package name*. Three package identities necessarily change; which of three treatments applies is a product decision that the parity baseline must know in advance.
- **Two scope items** — [scope confirmation](./notes/scope-confirmation.md): whether the `GITHUB_API` credential-contract hardening named in the wave manifest belongs here or defers to Wave 3, and whether this plan ends with a `@sdlcforge/core-server` version bump and publish attempt.
- **Baseline feasibility** — [parity baseline](./notes/parity-baseline.md). `core-server`'s current tests all pass `skipCorePlugins: true` and its golden plugins list is empty, so no baseline of the real loaded surface exists yet. Whether one can be captured at all depends on whether `appInit` currently succeeds against the full 11-package explicit tier.

## Current status

First authoring pass for `core-server`'s slice (`is_reinvocation: false`), seeded at `phase_number_start: 3` — phases 1 and 2 belong to `liq-controls`' already-authored and committed slice of this same federated plan.

Three phases are registered with their task breakdown **deferred**: the registration mechanism is undecided, and it determines the shape of nearly every task in phases 4 and 5. Phase 3 (baseline) is decision-independent and could be broken down immediately, but is held with the others so a single re-invocation authors a coherent set.

`plan/manifest.yaml` currently records no entry for this plan slug and `plan/TODO.yaml` did not exist before this pass. `plan/phases/` carries four stale summary files (`bun-*.md`, `doc-updates.md`) left over from the completed `bun-conversion` plan; they are unrelated residue, left untouched here.

**Cross-project gating.** Each of Phase 5's three absorb tasks is blocked until its donor's own Phase 1 (relocation) has landed on that donor's `plan/core-server-domain-consolidation` branch. Only `liq-controls`' relocation is planned as of this writing; `liq-credentials` and `liq-integrations-issues-github` have plan branches but no authored plans. Conversely, each donor's own retirement phase is gated on this project's Phase 5 landing. Neither direction is enforceable by this plan's own tooling; both are the dispatching manager's scheduling responsibility.

## Overview

Three phases, strictly sequential. Task breakdown for all three is deferred pending the decisions above.

### Phase 3 — Absorption Baseline And Parity Harness

Captures, as an executable artifact, exactly what the server's loaded surface looks like *today* with the three donors present as npm-dependency plugins: registered routes and their `path`/`paths` arrays, registered path variables, enqueued setup methods and their `deps`, registered integration providers and hooks, and the reported plugin lists. Without this, "no consumer-facing behavior change" is unverifiable — `core-server` has no current test that loads any donor. Decision-independent and unblocked; sequenced first so phases 4 and 5 have something to check against. See [phase summary](./phases/absorption-baseline.md).

### Phase 4 — In-Tree Plugin Registration Mechanism

Establishes the mechanism by which a module living in `core-server`'s own `src/` tree is registered as a `plugable-express` plugin at the identical point in `appInit`'s sequence an npm-dependency plugin occupies today — including `registerPathVar` supply, plugin identity metadata, and a resolution for the `'load orgs'` dependency-runner hazard that unconditional in-tree registration introduces under `skipCorePlugins: true`. Blocked on the mechanism decision. Lands with a trivial in-tree probe plugin proving the mechanism before any donor code depends on it. See [phase summary](./phases/in-tree-plugin-mechanism.md).

### Phase 5 — Absorb Donor Plugins And Retire Explicit-Tier Entries

Performs the three history-preserving merges, wires each absorbed submodule through the Phase 4 mechanism, removes each donor from `explicitPlugins` and from `package.json` `dependencies` in the same landing that wires it in (a donor loaded both ways at once crashes startup with `Non-unique command path`), unions each donor's runtime dependencies, and verifies the result against Phase 3's baseline. Each donor's task is independently gated on that donor's own relocation landing, so the three are sequenced by donor readiness rather than by any dependency between them. See [phase summary](./phases/absorb-donor-plugins.md).

### Documentation updates

Not yet registered as a phase. `core-server`'s docs must not be left describing a stale 11-package explicit tier, and the changes plainly meet the architectural-implications criteria (a documented component boundary moves, and spec-described behavior about where capability comes from changes), so a `doc-updates` phase will be registered on the completing re-invocation of this plan's authoring. The files it must cover — `docs/architecture/plugin-loading-tiers.md` (Tier-2 table and the mermaid diagram's `11 npm-dependency packages` label), `docs/architecture.md` (which is *already* stale, saying 13 packages against an array of 11), `docs/core-server-spec.md`, `docs/project-structure.md`, `AGENTS.md`, and `README.md` — are enumerated here so the deliverable is not lost between invocations.
