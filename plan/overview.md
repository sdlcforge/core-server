# Define Compile-Time Plugin Manifest For core-server

## Purpose and scope

Declare `@sdlcforge/core-server`'s own plugin composition as **data the build can check**, using the compile-time manifest framework designed by `@liquid-labs/plugable-express`'s `compile-time-manifest` plan-group, and wire the framework's validator into `core-server`'s own `make test` / `make qa`.

Today the composition is two array literals — an eight-name `explicitPlugins` array in `src/lib/app-init.mjs` and a three-member `submodules` array in `src/lib/builtin-plugins.mjs` — whose order is load-bearing and whose couplings are declared nowhere. This plan replaces the implicit ordering with a declared, checkable one, additively: the manifest sits on top of the existing four-source loading model rather than replacing it.

### Wave context

Plan-group `compile-time-manifest-sdlc-server` ("Define compile-time plugin manifest for core-server"), Wave "Compile-Time Plugin Manifest" of the `sdlcforge-modernization` wave plan (lead project `core-server`). `core-server` is the plan-group's sole participant. It depends on plan-group `compile-time-manifest-framework`.

**This plan-group does not modify `plugable-express`.** It is a pure consumer of that framework's contract. Where `core-server`'s real plugin set meets a limit in that contract, the limit is flagged for the manager rather than worked around — the upstream design is finalized, so a real gap goes back there rather than being patched here. One such limit was found and is stated below.

### What must change

1. A `plugable.host` block in `core-server`'s `package.json` declaring the two plugin tiers no scan can discover: the eight `explicitPlugins` names, and one `builtins` entry for `@sdlcforge/core-server` carrying its three in-tree components in normative load order.
2. Capability declarations — `provides` / `requires` / `optional` — for the three components `core-server` owns: `src/controls/`, `src/credentials/`, `src/integrations-issues-github/`.
3. A drift guard calling the framework's `verifyHostDeclaration()` from `core-server`'s own Jest suite, so the declaration cannot silently diverge from the real arrays.
4. A `make/56-plugin-graph.mk` fragment appending the validator to `TEST_TARGETS`, reaching `make test`, `make qa`, `bun run test`, and `bun run qa`.
5. Regression coverage proving the gate detects the absorbed-donor conflict, the `ynGa` rename shape, and the `credentialsDB` load-order shape.
6. Coverage for the two motivating couplings whose requiring half lives in third-party packages — **approach undecided**, see below.

### What must not change

- **`core-server`'s plugin-loading behavior.** The four loading sources, their order, and their semantics stay exactly as they are. The upstream framework does not modify `appInit` at all, so nothing in `core-server`'s runtime path should change either. The golden API spec and full-tier baseline snapshots must not move; movement is a regression, not an expected diff.
- **`@liquid-labs/plugable-express`.** Read-only reference for this plan-group.
- **The `builtinPlugins` aggregation policy.** All three submodules register under `core-server`'s own npm identity so `GET /server/plugins/list` renders one row rather than three. A `component` is a declaration and diagnostic identity only — it never becomes a load unit, a `loadedPluginNames` entry, or a `handlerPlugins` row.
- **`submodules` order in `src/lib/builtin-plugins.mjs`**, which is load order and is append-only by that file's own documented convention.

### Success criteria

- `core-server`'s `package.json` carries a `plugable.host` block declaring all nine graph participants it composes, with builtin load order normative.
- The three in-tree components declare their real provides and requires, each citing the mechanism that performs the act.
- `verifyHostDeclaration()` runs in `make test` and fails when the declaration and the real arrays disagree.
- `make test` and `make qa` run the validator; a deliberately broken declaration turns the build red.
- Re-introducing any of the three absorbed donors is detected as a `conflict` naming both providers — including `liq-integrations-issues-github`, whose double-load is silent today.
- A `serverConfigRoot`-style rename in the framework produces an `unsatisfied` finding naming `src/credentials/`, rather than the `undefined`-propagating crash `ynGa` produced.
- The gate reports its own coverage boundary, distinguishing what it checked from what it assumed and from what it cannot see.
- Existing snapshots, unit tests, and integration tests pass unchanged.

### Hard constraints

- **The upstream framework must exist before this plan can execute.** As of planning it does not — see below. Not a deadline or a budget constraint; a hard sequencing one.
- `@liquid-labs/plugable-express` reaches `core-server` through yalc, not npm. After the framework lands, uptake requires `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`), never a bare `bun install` — under Bun, a bare install re-copies a `file:` dependency's content without re-resolving its own dependency list, and a new transitive dependency silently never materializes while the install reports success.
- `.yalc/` is gitignored and absent from every fresh Flow task worktree. Tasks that run `bun install`, `make test`, or `make qa` need `create-worktree.sh --no-install-deps` followed by `scripts/provision-local-deps.sh`. That covers most tasks in this plan, since its validation steps are largely "run the gate" and the gate reads `node_modules`.

## Current status

**Planning incomplete — blocked on two decisions.** Phase structure is registered and the design work `core-server` owns is done and grounded in real source. Task breakdown is deferred pending answers to the questions below.

No source file in this project has been modified.

### The two blockers

**1. The upstream framework is designed but not built.** Its plan-group's *design* is final and consumable — three closed user decisions, a settled capability grammar, a pinned `plugable.host` schema. Its *implementation* has not started: 0 of 21 upstream tasks are done, its `src/lib/` contains no manifest reader or validator, its `package.json` has no `bin`, and `core-server`'s yalc snapshot is `alpha.58` with zero occurrences of `validatePluginSet`, `plugable-express-validate`, or `plugableManifestVersion`. Every task in this plan calls an API, a CLI, or a `package.json` block that framework must ship first. Evidence and the full dependency list: [upstream-framework-readiness.md](./notes/upstream-framework-readiness.md).

**2. Both headline bugs have their requiring half in a package `core-server` does not own.** A manifest lives with the package it describes; `node_modules/` is install output and `.yalc/` is a gitignored snapshot regenerated from another repository. The upstream `plugable.host` block's two host-sited capability lists — `providedCapabilities` and `assumeProvided` — are both **provider-side**, and the engine matches a `requires` only against the union of provides. So `core-server` can declare that `src/credentials/` *provides* `appExt:credentialsDB @ load`, but not that `@liquid-labs/liq-projects` *requires* it; and it can declare its own in-tree `serverConfigRoot` readers, but not `@liquid-labs/liq-work`'s. A provide with nothing requiring it emits no finding. This is a coherent upstream design choice rather than a defect, and it is flagged rather than worked around per the change request's own instruction. The ownership analysis and four candidate approaches: [manifest-ownership-boundary.md](./notes/manifest-ownership-boundary.md).

### What this plan does deliver regardless

The majority of the work is unaffected by either blocker's resolution, and one result is substantial and independent: **the three absorbed donors become detected conflicts.** `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` are installed but inert, and each duplicates an exclusive `provides` of an in-tree component. Today re-introducing the first two fails late and cryptically and the third fails *silently and permanently* — both integration providers register twice with no error ever emitted, as `src/lib/app-init.mjs:40-51` documents. All three become pre-flight conflicts naming both providers.

### Grounding research

- [Upstream framework readiness](./notes/upstream-framework-readiness.md) — the delivery-state finding, the named dependency list, and the yalc uptake path.
- [Plugin set inventory and derived declarations](./notes/plugin-set-inventory.md) — the verified composition, and the declarations for all three in-tree components derived from real source in the upstream's decided vocabulary.
- [Manifest ownership boundary](./notes/manifest-ownership-boundary.md) — who may manifest what, the four `ynGa` consumers classified, and the contract limit with its four candidate resolutions.
- [Build wiring and dependency refresh](./notes/build-wiring-and-dependency-refresh.md) — the `make/56-plugin-graph.mk` recipe against this repository's real Catalyst tree, and the yalc refresh rule.

### Corrected inventory

Re-derived from this worktree on 2026-08-26, because the change request asked for confirmation rather than assumption:

| Figure | Verified |
|---|---|
| Explicit-tier plugins | **Eight**, not the eleven earlier wave notes assumed. The other three are the absorbed donors, now in-tree and deliberately unlisted. |
| `builtinPlugins` entries | **One**, aggregating **three** components under `core-server`'s own npm identity. |
| Keyword-discovered plugins | **Zero.** Every explicit-tier package declares `"keywords": []`, so the array literals are the entire resolver input. |
| Graph participants `core-server` owns | **Three of twelve** — one npm identity's three components, against eight third-party plugins plus one non-plugin credential registrar. |
| `explicitPlugins` array order | **Not load order.** `findPlugins` returns filesystem scan order, so any same-phase edge between two explicit-tier plugins is `order-unprovable` by construction. |
| `submodules` array order | **Is** load order, enforced by a sequential `for...of` with `await`, and normative for `components:`. |

## Overview

Four phases. The sequence `1 → 2 → 3 → 4` is hard: phase 2 populates the block phase 1 creates, phase 3 extends the graph phase 2 declares, and phase 4 enforces the result. Task breakdown is deferred until the outstanding decisions are answered; the phase summaries below carry each phase's goals, inputs, and outputs.

### Phase 1 — Framework uptake and host declaration

Verify the framework prerequisite is actually met and halt if it is not; refresh the yalc link with a regenerated lockfile; add the `plugable.host` block declaring the eight explicit plugins and the three ordered builtin components, structure only; wire `verifyHostDeclaration()` into the Jest suite so the declaration cannot drift before anyone trusts it.

Detail: [`phases/framework-uptake-and-host-declaration.md`](./phases/framework-uptake-and-host-declaration.md).

### Phase 2 — Declare the in-tree component manifests

Populate the three components' provides and requires from real source: `src/credentials/`'s `setupArg:serverConfigRoot` requirement (the in-tree half of `ynGa`), its `appExt:credentialsDB @ load` provide (the provider half of the ordering gap), `src/controls/`'s two setup methods and their `deps`, and `src/integrations-issues-github/`'s setup method, integration providers, and hooks.

Detail: [`phases/declare-in-tree-components.md`](./phases/declare-in-tree-components.md).

### Phase 3 — Third-party coupling coverage

Close the two couplings whose requiring half is third-party: `liq-projects`' `appExt:credentialsDB @ load` and `liq-work`'s `appExt:serverConfigRoot @ load`. **Approach undecided**; the phase's task breakdown is deferred pending that decision.

Detail: [`phases/third-party-coupling-coverage.md`](./phases/third-party-coupling-coverage.md).

### Phase 4 — Validation gate and regression coverage

Add `make/56-plugin-graph.mk` appending to `TEST_TARGETS`; assert the three regression shapes; confirm the existing snapshots and runtime behavior are untouched; state the gate's coverage boundary in its own output.

Detail: [`phases/validation-gate-and-regression.md`](./phases/validation-gate-and-regression.md).

### Dependencies and parallelism

| Phase | Blocks | Notes |
|---|---|---|
| 1 | 2, 3, 4 | Hard external prerequisite on the upstream framework |
| 2 | 3, 4 | Phase 3's ordering verdict depends on phase 2's declared provider position |
| 3 | 4 | Breakdown deferred pending a scope decision |
| 4 | — | Enforces everything above |

No cross-phase parallelism is available. Parallel opportunities within phases will be identified when the breakdown is authored.
