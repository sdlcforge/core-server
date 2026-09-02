# Define Compile-Time Plugin Manifest For core-server

## Purpose and scope

Declare `@sdlcforge/core-server`'s own plugin composition as **data the build can check**, using the compile-time manifest framework designed by `@liquid-labs/plugable-express`'s `compile-time-manifest` plan-group, and wire the framework's validator into `core-server`'s own `make test` / `make qa`.

Today the composition is two array literals — a five-name `explicitPlugins` array in `src/lib/app-init.mjs` and a three-member `submodules` array in `src/lib/builtin-plugins.mjs` — whose order is load-bearing and whose couplings are declared nowhere. This plan replaces the implicit ordering with a declared, checkable one, additively: the manifest sits on top of the existing four-source loading model rather than replacing it.

### Wave context

Plan-group `compile-time-manifest-sdlc-server` ("Define compile-time plugin manifest for core-server"), Wave "Compile-Time Plugin Manifest" of the `sdlcforge-modernization` wave plan (lead project `core-server`). `core-server` is the plan-group's sole participant. It depends on plan-group `compile-time-manifest-framework`.

**This plan-group does not modify `plugable-express`.** It is a pure consumer of that framework's contract. Where `core-server`'s real plugin set meets a limit in that contract, the limit is flagged for the manager rather than worked around — the upstream design is finalized, so a real gap goes back there rather than being patched here. One such limit was found and is stated below.

### What must change

1. A `plugable.host` block in `core-server`'s `package.json` declaring the two plugin tiers no scan can discover: the five `explicitPlugins` names, and one `builtins` entry for `@sdlcforge/core-server` carrying its three in-tree components in normative load order.
2. Capability declarations — `provides` / `requires` / `optional` — for the three components `core-server` owns: `src/controls/`, `src/credentials/`, `src/integrations-issues-github/`.
3. A drift guard calling the framework's `verifyHostDeclaration()` from `core-server`'s own Jest suite, so the declaration cannot silently diverge from the real arrays.
4. A `make/56-plugin-graph.mk` fragment appending the validator to `TEST_TARGETS`, reaching `make test`, `make qa`, `bun run test`, and `bun run qa`.
5. Regression coverage proving the gate detects the absorbed-donor conflict, the `ynGa` rename shape, and the `credentialsDB` load-order shape.
6. Verification that the two motivating couplings whose requiring half lives in a third-party package — `@sdlcforge/dev-core`'s `projects` and `work` components — now resolve `satisfied` against `core-server`'s own declarations, since `dev-core` has since authored and shipped its own manifest declaring both requiring edges. See Phase 3, below.

### What must not change

- **`core-server`'s plugin-loading behavior.** The four loading sources, their order, and their semantics stay exactly as they are. The upstream framework does not modify `appInit` at all, so nothing in `core-server`'s runtime path should change either. The golden API spec and full-tier baseline snapshots must not move; movement is a regression, not an expected diff.
- **`@liquid-labs/plugable-express`.** Read-only reference for this plan-group.
- **The `builtinPlugins` aggregation policy.** All three submodules register under `core-server`'s own npm identity so `GET /server/plugins/list` renders one row rather than three. A `component` is a declaration and diagnostic identity only — it never becomes a load unit, a `loadedPluginNames` entry, or a `handlerPlugins` row.
- **`submodules` order in `src/lib/builtin-plugins.mjs`**, which is load order and is append-only by that file's own documented convention.

### Success criteria

- `core-server`'s `package.json` carries a `plugable.host` block declaring all six graph participants it composes, with builtin load order normative.
- The three in-tree components declare their real provides and requires, each citing the mechanism that performs the act.
- `verifyHostDeclaration()` runs in `make test` and fails when the declaration and the real arrays disagree.
- `make test` and `make qa` run the validator; a deliberately broken declaration turns the build red.
- Re-introducing any of the three absorbed donors is detected as a `conflict` naming both providers — including `liq-integrations-issues-github`, whose double-load is silent today.
- A `serverConfigRoot`-style rename in the framework produces an `unsatisfied` finding naming `src/credentials/`, rather than the `undefined`-propagating crash `ynGa` produced.
- The gate reports its own coverage boundary, distinguishing what it checked from what it assumed and from what it cannot see.
- Existing snapshots, unit tests, and integration tests pass unchanged.

### Hard constraints

- `@liquid-labs/plugable-express` reaches `core-server` through yalc, not npm. Uptake requires `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`), never a bare `bun install` — under Bun, a bare install re-copies a `file:` dependency's content without re-resolving its own dependency list, and a new transitive dependency silently never materializes while the install reports success. The same rule applies to `@sdlcforge/dev-core`, also yalc-linked.
- `.yalc/` is gitignored and absent from every fresh Flow task worktree. Tasks that run `bun install`, `make test`, or `make qa` need `create-worktree.sh --no-install-deps` followed by `scripts/provision-local-deps.sh`. That covers most tasks in this plan, since its validation steps are largely "run the gate" and the gate reads `node_modules`.

## Current status

**Planning complete.** All four phases are decomposed into 13 registered tasks (`plan/TODO.yaml`), each with a full task document. Ready for execution via `execute-implementation-plan`. No source file in this project has been modified.

### The two original blockers — both resolved during re-verification (2026-09-01)

**1. The upstream framework is now built and published, but core-server's local link is stale — mechanical only.** `@liquid-labs/plugable-express`'s `compile-time-manifest` plan-group completed and merged 2026-08-29: it is tagged, published to the public npm registry at `1.0.0-alpha.59`, and ships `validatePluginSet`, `verifyHostDeclaration`, `FRAMEWORK_MANIFEST`, and the `plugable-express-validate` bin. `core-server`'s local `.yalc/@liquid-labs/plugable-express/` snapshot is still `alpha.58`, and a second, newly-found stale link exists for `@sdlcforge/dev-core` (whose own `"plugable"` manifest block landed today, 2026-09-01, after core-server's yalc snapshot was last refreshed). No upstream work remains; Phase 1's first task refreshes both links. Evidence: [upstream-framework-readiness.md](./notes/upstream-framework-readiness.md) and [2026-09-01-blocker-reverification.md](./notes/2026-09-01-blocker-reverification.md).

**2. The third-party requiring-side ownership problem is now moot, not resolved by a workaround.** The two packages that motivated it — `liq-projects` and `liq-work` — no longer exist as separate third-party plugins: the completed `dev-core-consolidation` plan-group folded them (with `liq-orgs` and `plugable-projects-audit`) into a single `@sdlcforge/dev-core` dependency. `@sdlcforge/dev-core` has since authored and shipped its own manifest declaring exactly the two previously-missing requiring edges — its `projects` component requires `appExt:credentialsDB @ load`; its `work` component requires `appExt:serverConfigRoot @ load` — using the framework's decided capability vocabulary. Once `core-server`'s own Phase 1/2 declarations land, the framework's ordinary static resolver reads `dev-core`'s `package.json` `"plugable"` block automatically and both edges resolve satisfied, with no cross-repo manifest-authoring work from `core-server`. Phase 3 accordingly is a **verification** phase, not a scope-decision phase. The now-closed ownership analysis: [manifest-ownership-boundary.md](./notes/manifest-ownership-boundary.md).

The open question **Q3** (whether the `integration:tickets`/`integration:pull request` provides carrying `providerTest: usesGitHubIssues` should be an accepted over-claim or omitted) is likewise resolved: `plugable-express`'s schema doc (merged 2026-08-28) documents a `conditional: true` field — with this exact case as its worked example — so both provides are declared `conditional: true` with a `via:` note, per Phase 2.

### What this plan delivers

One result is substantial and independent of anything above: **the three absorbed donors become detected conflicts.** `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` are installed but inert, and each duplicates an exclusive `provides` of an in-tree component. Today re-introducing the first two fails late and cryptically and the third fails *silently and permanently* — both integration providers register twice with no error ever emitted, as `src/lib/app-init.mjs:40-51` documents. All three become pre-flight conflicts naming both providers.

### Grounding research

- [Upstream framework readiness](./notes/upstream-framework-readiness.md) — the delivery-state finding, the named dependency list, and the yalc uptake path.
- [Plugin set inventory and derived declarations](./notes/plugin-set-inventory.md) — the verified composition, and the declarations for all three in-tree components derived from real source in the upstream's decided vocabulary.
- [Manifest ownership boundary](./notes/manifest-ownership-boundary.md) — who may manifest what, the four `ynGa` consumers classified, and the contract limit with its four candidate resolutions.
- [Build wiring and dependency refresh](./notes/build-wiring-and-dependency-refresh.md) — the `make/56-plugin-graph.mk` recipe against this repository's real Catalyst tree, and the yalc refresh rule.

### Corrected inventory

Re-derived from this worktree on 2026-08-26 (explicit-tier count corrected again on 2026-09-01 after the `dev-core-consolidation` plan-group completed), because the change request asked for confirmation rather than assumption:

| Figure | Verified |
|---|---|
| Explicit-tier plugins | **Five**, not eight, not the eleven earlier wave notes assumed. The completed `dev-core-consolidation` plan-group folded the prior four (`liq-orgs`, `liq-projects`, `liq-work`, `plugable-projects-audit`) into a single `@sdlcforge/dev-core` dependency. The three absorbed donors (`liq-controls`, `liq-credentials`, `liq-integrations-issues-github`) are now in-tree and deliberately unlisted. |
| `builtinPlugins` entries | **One**, aggregating **three** components under `core-server`'s own npm identity. |
| Keyword-discovered plugins | **Zero.** Every explicit-tier package declares `"keywords": []`, so the array literals are the entire resolver input. |
| Graph participants `core-server` owns | **Three of nine** — one npm identity's three components, against five third-party plugins plus one non-plugin credential registrar. |
| `explicitPlugins` array order | **Not load order.** `findPlugins` returns filesystem scan order, so any same-phase edge between two explicit-tier plugins is `order-unprovable` by construction. |
| `submodules` array order | **Is** load order, enforced by a sequential `for...of` with `await`, and normative for `components:`. |

## Overview

Four phases, 13 tasks total. The sequence `1 → 2 → 3 → 4` is hard: phase 2 populates the block phase 1 creates, phase 3 verifies the graph phase 2 declares, and phase 4 enforces the result. The phase summaries below carry each phase's goals, inputs, and outputs; task-level detail lives in each phase's own task documents under `plan/phase-0N-<slug>/`.

### Phase 1 — Framework uptake and host declaration (3 tasks)

Verify and refresh both stale yalc-linked packages (`@liquid-labs/plugable-express` alpha.58→alpha.59, `@sdlcforge/dev-core` pre-manifest→manifested) with a regenerated lockfile; add the `plugable.host` block declaring the five explicit plugins and the three ordered builtin components, structure only; wire `verifyHostDeclaration()` into the Jest suite so the declaration cannot drift before anyone trusts it. Sequential — each task depends on the prior one's output.

Detail: [`phases/framework-uptake-and-host-declaration.md`](./phases/framework-uptake-and-host-declaration.md).

### Phase 2 — Declare the in-tree component manifests (3 tasks)

Populate the three components' provides and requires from real source: `src/credentials/`'s `setupArg:serverConfigRoot` requirement (the in-tree half of `ynGa`), its `appExt:credentialsDB @ load` provide (the provider half of the ordering gap), `src/controls/`'s two setup methods and their `deps`, and `src/integrations-issues-github/`'s setup method and its two `conditional: true` integration provides. All three tasks are parallel-eligible (distinct components, no inter-dependency).

Detail: [`phases/declare-in-tree-components.md`](./phases/declare-in-tree-components.md).

### Phase 3 — Third-party coupling coverage (2 tasks)

Verify — not decide — that `@sdlcforge/dev-core`'s own already-shipped requiring edges (`projects` → `appExt:credentialsDB @ load`, `work` → `appExt:serverConfigRoot @ load`) resolve `satisfied` against core-server's Phase 1/2 declarations, using the framework's real validator; record the outcome. Sequential — task 2 records what task 1 verifies.

Detail: [`phases/third-party-coupling-coverage.md`](./phases/third-party-coupling-coverage.md).

### Phase 4 — Validation gate and regression coverage (5 tasks)

Add `make/56-plugin-graph.mk` appending to `TEST_TARGETS`; assert the regression shapes (absorbed-donor conflict, the `ynGa` rename shape, the third-party ordering edges); confirm the existing snapshots and runtime behavior are untouched; state the gate's coverage boundary in its own output. Task 1 (build gate) blocks tasks 2-4 (parallel-eligible regression assertions), which block task 5 (final confirmation).

Detail: [`phases/validation-gate-and-regression.md`](./phases/validation-gate-and-regression.md).

### Dependencies and parallelism

| Phase | Blocks | Notes |
|---|---|---|
| 1 | 2, 3, 4 | Sequential internally; first task is a mechanical two-package yalc refresh |
| 2 | 3, 4 | Three tasks parallel-eligible within the phase |
| 3 | 4 | Verification phase; sequential internally |
| 4 | — | Enforces everything above; tasks 2-4 parallel-eligible within the phase |

No cross-phase parallelism. Within-phase parallelism: Phase 2 (all 3 tasks) and Phase 4 (tasks 2-4, after task 1).
