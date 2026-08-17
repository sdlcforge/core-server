# Plan Overview — dev-core-consolidation (liq-projects slice)

## Purpose and scope

This plan is `liq-projects`'s own contribution to the federated `dev-core-consolidation` plan-group — Wave 2 ("Plugin Consolidation — Framework and Dev-Core") of the **SDLCForge Platform Modernization** wave plan, whose lead project is `core-server` and whose wave-plan slug is `sdlcforge-modernization`. The plan-group merges four functional repositories — `liq-projects`, `liq-work`, `liq-orgs`, and `plugable-projects-audit` — into a single new `@sdlcforge/dev-core` package, and retires `liq-projects-lib` once its one surviving real usage is absorbed elsewhere. All five participants share the plan slug `dev-core-consolidation`.

`liq-projects` is the lead slice: it is the most conceptually foundational of the four functional repos (it owns the "project" concept — the NPM package / playground clone / GitHub repo triad — that `liq-work` orchestrates atop and that `liq-orgs`, `plugable-projects-audit`, `liq-controls`, and `liq-integrations-issues-github` all read through `app.ext._liqProjects`). Because it plans first, this plan does two jobs:

1. **Establish the shared foundation** every other participant builds on: the concrete target shape of `@sdlcforge/dev-core`, its internal layout convention, the plugin/`setup`/`app.ext` contracts that must survive the merge, the history-preserving absorption mechanic, the toolchain choice, and the donor-retirement policy. All of it is recorded as decisions **D1–D11** in [dev-core target shape](./notes/dev-core-target-shape.md), and re-authored as a committed contract document inside the dev-core repository itself by phase 1.
2. **Execute liq-projects's own migration and retirement**: relocate its source, tests, and documented route surface into the dev-core structure with no behavior change, absorb it into dev-core with history preserved, hand off a precise consumer-update spec for `core-server`, and retire the standalone package.

### What must change

- `@sdlcforge/dev-core` gains a working package skeleton: authored `package.json` metadata, the donors' Make/Babel/Rollup/Jest toolchain, a `src/index.mjs` plugin entry point that merges submodule handlers and composes submodule `setup` functions in a defined order, and a committed consolidation contract doc.
- `liq-projects`'s `src/` tree relocates in place to its final dev-core-relative path (`src/projects/…`), staying green and publishable throughout.
- That tree is absorbed into dev-core by an unrelated-histories merge, so `git log --follow` still reaches liq-projects's original commits afterward.
- `liq-projects` ends as a final, clearly-labelled superseded release: README notice, deprecation-bearing description, version bump, publish/deprecate attempted and handed to the user if blocked.

### What must not change

- **The HTTP surface.** All 19 handlers keep their exact `path`/`paths`, methods, parameters, and `help` text. Routes are declared in module exports, never derived from file position.
- **The `app.ext` contracts.** `app.ext._liqProjects` (and, for sibling participants, `app.ext._liqOrgs`, `app.ext.constants.WORK_DB_PATH`, `app.ext.setupMethods`) keep their exact names, because consumers outside this plan-group read them.
- **The GitHub credential registration.** liq-projects's `setup` is what registers the `GITHUB_API` credential that `liq-integrations-issues-github` later consumes; the provider package changes name, the mechanism does not, and the swap must be atomic.
- **Behavior.** No refactoring, no dependency upgrades, no `shelljs` replacement, no Bun conversion, no `app.ext` redesign. Those are Wave 3 and Wave 4 concerns.
- **`liq-projects-lib`.** Explicitly out of scope for this slice: liq-projects has no dependency on it (verified — no `package.json` entry, no import anywhere in `src/`). Its absorption belongs to `liq-work` and, separately, to the sibling `core-server-domain-consolidation` plan-group.

### Success criteria

1. `sdlcforge/dev-core` builds (`make build` → `dist/dev-core.js`), tests, and lints green, and exports a `handlers` array plus a composite `async setup` that plugable-express's loader accepts.
2. `docs/dev-core-consolidation-contract.md` exists in dev-core and states the layout convention, root-file ownership, absorption recipe, `app.ext` freeze, setup ordering, and dependency-union rule that the other three donors follow.
3. dev-core carries liq-projects's complete tree under `src/projects/`, with the 8-suite / 29-test baseline reproduced (allowing for the one live-GitHub suite's environment dependence) and all 19 routes present.
4. `git log --follow` on a relocated file inside dev-core reaches its pre-merge liq-projects history.
5. A consumer-migration handoff spec in dev-core names every exact edit `core-server` must make, including the atomicity requirement.
6. `liq-projects` is labelled superseded and deprecated, with archival left as an explicit user decision.

### Key decisions taken here (full rationale in [dev-core target shape](./notes/dev-core-target-shape.md))

- **Layout: one submodule directory per donor** — `src/projects/`, `src/work/`, `src/orgs/`, `src/projects-audit/`, each exposing `index.mjs` with `handlers` and (where the donor has one) `setup`; the redundant `handlers/<domain>/` nesting flattens to `handlers/`. Chosen because one prefix per donor makes the four absorptions independent and conflict-free, and because the move is then a pure `git mv` with every relative import still resolving. **The other four participants follow this convention.**
- **One package means one plugin.** plugable-express's loader imports a single module per package and reads only `handlers` and `setup`, taking the plugin's name and summary from `package.json`. Four plugin registrations therefore collapse into one merged handler array and one composite setup, and dev-core's currently-empty `description` becomes the server-visible plugin summary.
- **Absorption by `git merge --allow-unrelated-histories` after an in-place restructure**, with dev-core's root files authoritative — history-preserving, needs no path rewriting, and lets donors land in any order.
- **The standalone `liq-projects` package is fully retired — no re-export shim.** A shim would double-register all 19 routes (there is no duplicate-path detection in `registerHandlers`, so Express would silently shadow), and the only npm dependent is core-server, which repoints atomically. Retirement is a labelled final release, not a code deletion; repository archival stays a user decision.
- **Toolchain unchanged**: npm plus the donors' `sdlc-projects-workflow-local-node-build` Make/Babel/Rollup/Jest stack. Bun and the `shelljs` replacement are Wave 4.

## Current status

Plan created; no phase has started. Starting phase: **phase 1 — dev-core Package Foundation**.

Pre-conditions verified at plan-authoring time:

- The `sdlcforge/dev-core` repository already exists and is initialized: `/Users/zane/playground/sdlcforge/dev-core`, one commit (`07d7f0e`), `main` tracking `origin/main`, one tracked file (`package.json` at `@sdlcforge/dev-core@1.0.0-alpha.0`, `main: dist/dev-core.js`). Nothing in this plan creates a repository.
- `liq-projects` is green at its current `main`: `make test` 8 suites / 29 tests passing, `make lint` clean, per the committed `qa/` reports.
- `@sdlcforge/core-server` is the only npm dependent of `@liquid-labs/liq-projects`, via a `file:.yalc/…` link plus one `explicitPlugins` entry and three test fixtures.
- This plan consumes **phases 1–4**; the next participant planned in this plan-group starts at phase 5.

Cross-repository execution: phase 1, phase 2 tasks 002–003, and phase 4 execute in the `sdlcforge/dev-core` checkout; phase 2 task 001 and all of phase 3 execute in `liq-projects`. Each task document names its executing repository in its `## Purpose and scope`. This mirrors the established precedent of core-server's completed `bun-conversion` task `003`, which executed in the `comply-defaults` repository.

Open item for the manager (does not block execution): dev-core is not listed as a participant in the wave manifest's `dev-core-consolidation` plan-group — the manifest notes it did not exist as an indexed project at wave-authoring time — so the dev-core-side work is carried here, in the lead slice's plan. If the manager would rather dev-core own its own plan-group, phase 1 and phase 2's task 002 transplant into it verbatim; nothing else in this plan changes.

## Overview

Four phases. Phases 1 → 2 → 3 are strictly sequential at the phase level; phase 4 documents the result. Within phases, parallel-eligible task groups are called out.

### Phase 1 — dev-core Package Foundation (executes in `sdlcforge/dev-core`)

Turns the one-file dev-core repository into a working, empty-but-loadable plugin package, and commits the contract the other four participants build against. Nothing donor-specific lands here.

1. **[001 — Author Consolidation Contract](./phase-01-dev-core-package-foundation/001-author-consolidation-contract.md)** (tier `sonnet-high`) — writes `docs/dev-core-consolidation-contract.md` and `README.md` in dev-core, carrying decisions D1–D11: layout convention, submodule interface, root-file ownership, absorption recipe, dependency-union rule, plugin contract, setup ordering, `app.ext` freeze, toolchain, versioning/consumption, retirement policy, scope fences. This is the gate task — everything else in the plan-group cites it.
2. **[002 — Scaffold Build And Entry Point](./phase-01-dev-core-package-foundation/002-scaffold-build-and-entry-point.md)** (tier `sonnet-high`) — authors dev-core's `package.json` metadata/scripts/devDependencies, `.gitignore`, `Makefile`, `make/*.mk` (with `make/50-dev-core-js.mk` building `dist/dev-core.js` from `src/index.mjs`), `.sdlc-data.yaml`, the `src/index.mjs` aggregator with its documented submodule-registration and setup-ordering shape, and a smoke test asserting the exported plugin shape. Ends with `make build`, `make test`, `make lint` green on an empty submodule set.

**Dependencies:** 002 depends on 001 (it implements the contract 001 states). Not parallel-eligible.

**Exit state:** dev-core builds, tests, and lints; `dist/dev-core.js` exists; the contract doc is committed and citable; every other participant is unblocked.

### Phase 2 — liq-projects Migration (task 001 in `liq-projects`; tasks 002–003 in `sdlcforge/dev-core`)

Relocates liq-projects into the dev-core layout, absorbs it with history preserved, and specifies the consumer swap.

1. **[001 — Restructure Src Into Dev-Core Layout](./phase-02-liq-projects-migration/001-restructure-src-into-dev-core-layout.md)** (tier `sonnet-high`) — in `liq-projects`: `git mv` the whole tree to its final dev-core-relative paths (`src/projects/…`), add `src/projects/index.mjs`, reduce the root `src/index.js` to a thin re-export so the package stays green and publishable, delete the trivial `src/handlers/index.js` and the 32 stale generated `docs/*.html` files, and keep `make build`/`make test`/`make lint` green with the 8-suite / 29-test baseline intact.
2. **[002 — Absorb Projects Into Dev-Core](./phase-02-liq-projects-migration/002-absorb-projects-into-dev-core.md)** (tier `opus-high`) — in `dev-core`: unrelated-histories merge of the restructured liq-projects, root-file conflicts resolved in dev-core's favor, liq-projects's 16 runtime dependencies unioned in, `src/index.mjs` wired to the `projects` submodule, the `npmName` expectation in `handlers/test/lib/test-calls-implied.mjs` updated to `@sdlcforge/dev-core`, the README route table ported, and the full build/test/lint suite plus route-parity and history-preservation checks green.
3. **[003 — Author Consumer Migration Handoff](./phase-02-liq-projects-migration/003-author-consumer-migration-handoff.md)** (tier `sonnet-med`) — in `dev-core`: `docs/consumer-migration.md` naming every exact edit core-server must make (dependency entry and yalc link, the `explicitPlugins` entry in `src/lib/app-init.mjs`, the three test fixtures), the atomic-swap requirement for both routes and the `GITHUB_API` credential registration, the endpoint-provenance change, the golden-snapshot re-verification, and the `app.ext._liqProjects` preservation guarantee for `liq-controls` and `liq-integrations-issues-github`. Executing those edits belongs to `core-server-domain-consolidation`, not to this plan.

**Dependencies:** 001 depends on phase 1. 002 depends on 001 and on phase 1 task 002. 003 depends only on phase 1 task 001, so **{002, 003} are parallel-eligible** (disjoint files in the same repository) — with the caveat that both operate in the dev-core checkout, so they need separate task worktrees rather than simultaneous edits to one tree.

**Exit state:** dev-core serves the complete `/projects` surface from `src/projects/`; liq-projects's own tree is a relocated, still-green mirror; the consumer swap is fully specified.

### Phase 3 — Retire liq-projects (executes in `liq-projects`)

Modeled on the completed sibling retirement of `liq-integrations` under `framework-consolidation`: verify first, then documentation and metadata, then the publish attempt. No code deletion, no shim.

1. **[001 — Verify Dev-Core Absorption](./phase-03-retire-liq-projects/001-verify-dev-core-absorption.md)** (tier `sonnet-med`) — read-only gate across both repositories: every relocated file present under dev-core's `src/projects/`, all 19 routes registered, `setup` composed in the documented order, all 16 dependencies present, dev-core's test/lint/build green, history preserved. Halts the phase on any gap; edits nothing.
2. **[002 — Rewrite README As Superseded Notice](./phase-03-retire-liq-projects/002-rewrite-readme-as-superseded-notice.md)** (tier `sonnet-med`) — `README.md` only: superseded banner naming `@sdlcforge/dev-core`, migration instructions, known-consumer inventory, and removal of the now-dead generated-API-reference link.
3. **[003 — Mark Package Deprecated And Bump Version](./phase-03-retire-liq-projects/003-mark-package-deprecated-and-bump-version.md)** (tier `sonnet-low`) — `package.json` only: deprecation-bearing `description`, version `1.0.0-alpha.16`, `make qa` green.
4. **[004 — Publish Final And Deprecate On Npm](./phase-03-retire-liq-projects/004-publish-final-and-deprecate-on-npm.md)** (tier `sonnet-low`) — attempt `npm publish` and `npm deprecate`, expect the permission classifier to block both, and record the exact commands for the user. Repository archival is deliberately not attempted and is recorded as a user decision.

**Dependencies:** 001 gates the phase. **{002, 003} are parallel-eligible** (disjoint files). 004 runs last, after both have merged, so the published tarball carries both changes.

**Exit state:** `liq-projects` is a labelled, deprecated final release; archival awaits a user decision; core-server's repoint remains owned by its own plan-group.

### Phase 4 — Documentation Updates (executes in `sdlcforge/dev-core`)

1. **[001 — Update Architecture Docs](./phase-04-doc-updates/001-update-architecture-docs.md)** (tier `sonnet-high`) — authors dev-core's `docs/architecture.md` for the new subsystem: the submodule decomposition, the single-plugin aggregation boundary, the composite-setup ordering contract, the `app.ext` service contracts and who reads them, and the route namespaces each submodule owns.

**Dependencies:** depends on phases 1–3 having landed.

### Parallelism summary

- Sequential: phase 1 → phase 2 → phase 3 → phase 4.
- Parallel-eligible groups: `{phase 2 task 002, phase 2 task 003}` and `{phase 3 task 002, phase 3 task 003}`.
- Suggested dispatch order: `1-001`, `1-002`, `2-001`, `{2-002, 2-003}`, `3-001`, `{3-002, 3-003}`, `3-004`, `4-001`.

### Reference notes

- [dev-core target shape](./notes/dev-core-target-shape.md) — decisions D1–D11, the shared foundation for all five participants.
- [liq-projects source inventory](./notes/liq-projects-source-inventory.md) — package facts, route surface, exact path mapping, validation baseline, consumer inventory, surfaced pre-existing defects, and the cross-repository-task precedent.
