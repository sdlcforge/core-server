# Overview

## Purpose and scope

This is the `core-server-domain-consolidation` plan-group of the `sdlcforge-modernization` wave plan (wave: "Plugin Consolidation — Framework and Dev-Core", lead project: `core-server`). It federates four projects under one plan slug — `liq-controls`, `liq-credentials` (this project), `liq-integrations-issues-github` (each a donor, originating a relocation of its own plugin source), and `core-server` (the fold-in target, which absorbs all three via git-history-preserving merge and retires each donor). The plan-group follows the absorption convention already used by two completed sibling plan-groups in the same wave: `dev-core-consolidation` (whose [`docs/dev-core-consolidation-contract.md`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md) is the canonical model for the absorption recipe, layout convention, root-file ownership rules, retirement policy, and publishing hygiene) and `framework-consolidation`. Behavior is preserved throughout; pre-existing defects are documented rather than silently fixed.

### This project's slice (liq-credentials)

`@liquid-labs/liq-credentials` (currently `1.0.0-alpha.4`) is a `@liquid-labs/plugable-express` plugin that manages storage and retrieval of credentials for a plugable-express server. Its complete surface — confirmed from source, not from older planning text — is **two handlers**: `PUT /credentials/:credential/import` and `GET /credentials/list`. **No credential scoping and no credential rotation exist anywhere in the source**; the committed [`docs/liq-credentials-spec.md`](../docs/liq-credentials-spec.md) records the same finding under its Non-goals section. Its `setup()` is the one among this plan-group's three donors that actually exercises the plugin mechanism's affordances: it constructs `app.ext.credentialsDB` (a cross-package contract read by `@sdlcforge/dev-core` and by `liq-integrations-issues-github`) and calls `registerPathVar('credential', …)` using the function `plugable-express` passes into `setup()`. It reads `serverConfigRoot` from that same `setup()` argument object rather than from `app.ext` directly — a fix already landed in commit `cab8a77` that must survive both the relocation and the eventual absorption. Its sole npm dependent, confirmed by a playground-wide grep, is `@sdlcforge/core-server`.

Structurally this donor differs from its sibling `liq-controls` in one load-bearing way: **its source roots directly at `src/`, not at `src/lib/`**. The relocation is therefore a `git mv` of everything under `src/` into `src/credentials/`, with the root `src/index.js` reduced to a thin re-export — kept, not deleted, so the package stays independently buildable and publishable in the interim. `core-server`'s own absorb task `git rm`s that file after merging; it must exist as a thin re-export at merge time.

This plan's scope is `liq-credentials`'s own slice only: relocate its plugin source in place to the shape `core-server`'s absorption will merge, keep the package green throughout, and prepare (but gate) its own retirement. It does **not** plan `core-server`'s merge-and-wire phase — that is `core-server`'s own slice of this same federated plan, authored separately at [`plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md`](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md), which names the target path and every invariant the relocation must satisfy.

Full findings — file census, route table, `app.ext` contract, build/test wiring, consumer inventory, and the five recorded anomalies — are in the [source inventory](./notes/liq-credentials-source-inventory.md).

## Current status

No prior plan phases exist for `liq-credentials` under this plan slug; this is the plan's first authoring pass (`is_reinvocation: false`). Phase 10 (relocate) is unblocked and may begin immediately. Phase 11 (retire) is gated: its first task is a read-only verification gate that must fail — halting the phase — until `core-server`'s own `core-server-domain-consolidation` absorption phase has actually landed this donor's relocated tree. That ordering is cross-project and cannot be expressed or enforced by a single project's `TODO.yaml`; the dispatching manager must hold Phase 11 until `core-server`'s absorption is confirmed landed, even though both live under this same plan slug.

Two execution-time preconditions the manager should be aware of before dispatching:

- **Branch reachability.** `core-server`'s absorb task verifies and merges the donor's **`plan/core-server-domain-consolidation` branch, not `main`**. That branch currently sits at `e346649`, the merge-base with `main`, predating the committed `README.md`/`docs/`. Phase 10's relocation must end up reachable from whichever branch `core-server` actually verifies. This is recorded as anomaly 5 in the [source inventory](./notes/liq-credentials-source-inventory.md#anomalies-and-flags) and as a requirement of Phase 10's task.
- **Documentation already exists.** Unlike `liq-controls`'s original state, `README.md`, `AGENTS.md`, `docs/liq-credentials-spec.md`, and `docs/project-structure.md` are committed to `main` (commit `6ef7645`). Phase 11 task 2 **rewrites** the existing `README.md` as a superseded notice; it does not author one from scratch.

## Overview

Two phases, strictly sequential.

### Phase 10 — Relocate Plugin Source

Relocates `liq-credentials`'s entire `src/` tree in place to `src/credentials/…`, reduces the root build-entry file (`src/index.js`) to a thin re-export, and keeps the package independently green (`make build`/`make test`/`make lint`) throughout. One task:

1. **`001-restructure-src-into-core-server-layout.md`** (tier `sonnet-high`) — `git mv` all seven source files plus the one test-data fixture into `src/credentials/…` preserving internal structure exactly, replace `src/index.js` with `export * from './credentials'`, and verify route parity, `setup()` behavior, build, test, and lint at the pre-move baseline. No `Makefile` change is required (the build's source path is `src` itself, so the moved files are still discovered).

### Phase 11 — Retire Liq-Credentials

Implements `dev-core-consolidation-contract.md`'s [source-package retirement policy](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy): verify the absorption first, then documentation and metadata, then the publish attempt. No code deletion, and no re-export shim left registered as a live plugin — the Phase 10 build-entry-point re-export is not one, and is required. Four tasks, task 1 gating the rest:

1. **`001-verify-core-server-absorption.md`** (tier `sonnet-med`) — read-only gate: confirms `core-server` actually carries this donor's complete relocated tree, byte-identical route `path` arrays, the `app.ext.credentialsDB` wiring and the `credential` path variable registered exactly once, `core-server`'s own `package.json` and `explicitPlugins` no longer carrying `@liquid-labs/liq-credentials`, and `core-server`'s build/test/lint green. Halts the phase on any gap; edits nothing.
2. **`002-author-readme-superseded-notice.md`** (tier `sonnet-med`) — rewrites the committed `README.md` as the final superseded notice: supersession banner naming `@sdlcforge/core-server`, an accurate two-handler statement of what the package did, the confirmed single-consumer inventory, and disclosure of the pre-existing defects recorded in the source inventory.
3. **`003-mark-package-deprecated-and-bump-version.md`** (tier `sonnet-low`) — `package.json` only: deprecation-leading `description` (currently the empty string), version bump `1.0.0-alpha.4` → `1.0.0-alpha.5`, publishing-hygiene check on what `npm pack` actually ships, `make qa` green.
4. **`004-publish-final-and-deprecate-on-npm.md`** (tier `sonnet-low`) — attempts `npm publish` and `npm deprecate`; hands the exact commands to the user verbatim if the environment blocks either. GitHub repository archival is left as an explicit, separate human decision.

**Dependencies.** Phase 10 → Phase 11. Within Phase 11, task 1 gates tasks 2–4; tasks 2 and 3 are parallel-eligible once task 1 passes (disjoint files: `README.md` vs. `package.json`); task 4 runs last, after both 2 and 3 have landed, so the published tarball carries both. Phase 11 as a whole is additionally gated on `core-server`'s own absorption phase landing — a cross-project ordering constraint this plan cannot enforce through its own tooling, flagged to the dispatching manager.

No `## Metadata` / `architectural_impact` flag applies to any task in this plan: no public API or component boundary changes (routes, `setup()` behavior, and the `app.ext` contract are explicitly unchanged), no new subsystem, no spec-defined behavior change, and no tracked-state addition or removal. The architectural implications check accordingly registers no `doc-updates` phase.
