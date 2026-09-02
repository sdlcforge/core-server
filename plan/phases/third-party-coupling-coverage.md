# Phase — Third-Party Coupling Coverage

## Goals

Confirm — empirically, with the real validator, not by inspection alone — that the two couplings this plan-group was chartered to fix whose **requiring** half lives in a package `core-server` does not own now resolve cleanly, and record an honest statement of what closed and by what mechanism.

- `@liquid-labs/liq-projects` required `app.ext.credentialsDB` at plugin-`setup`/`load` phase — a hard `TypeError` during `appInit` if unmet, satisfied historically only because `builtinPlugins` is loading source #1 by construction and `credentials` precedes everything else in the entry.
- `@liquid-labs/liq-work` required `app.ext.serverConfigRoot` inside its own `setup()` — the third-party half of `ynGa`, and one of the four readers the original `serverHome` → `serverConfigRoot` rename broke.

**This phase was originally scoped as a scope-decision phase, blocked pending a choice among four candidate approaches (A–D) for declaring a third party's `requires` on its behalf — see [manifest-ownership-boundary.md](../notes/manifest-ownership-boundary.md) for that original analysis, which is now superseded for the two named bugs and kept only as historical record of the ownership-boundary reasoning.** That decision is now **moot**, not because an option was chosen, but because the two packages that carried those two requirements — `liq-projects` and `liq-work` — no longer exist as separate third-party plugins in `core-server`'s real composition. Both were absorbed into `@sdlcforge/dev-core` by the wave's sibling `dev-core-consolidation` plan-group (already complete); `core-server`'s real `explicitPlugins` array now reads five entries, one of which is `@sdlcforge/dev-core`, and none of the four absorbed names (`liq-orgs`, `liq-projects`, `liq-work`, `plugable-projects-audit`) appear any longer.

A further sibling plan-group, `dev-core-plugin-manifest`, then authored and merged `@sdlcforge/dev-core`'s own compile-time manifest (2026-09-01). Read directly from `@sdlcforge/dev-core`'s `package.json` `"plugable"` block, it declares exactly the two previously-missing requiring edges:

- its `projects` component requires `appExt:credentialsDB @ load` — closes the GITHUB_API-ordering gap's requiring side.
- its `work` component requires `appExt:serverConfigRoot @ load` — closes `ynGa`'s third-party half.

Both providers are — or will be, once the two preceding phases land — declarable from `core-server` alone: the framework's intrinsic manifest covers `appExt:serverConfigRoot`, and Phase 2 declares `appExt:credentialsDB @ load` from `src/credentials/`. Since `@sdlcforge/dev-core` is an ordinary `explicitPlugins`-listed package, the framework's static plugin-set resolver reads its `package.json` `"plugable"` block the same way it reads any other manifested plugin — the ordinary mechanism, not a special case. **No cross-repo manifest-authoring work is needed from `core-server` for this phase.** What remains is to run the resolver for real and confirm the two edges actually report `satisfied` (or the applicable same-phase verdict) rather than assume it from static reading — full detail and evidence trail in [2026-09-01-blocker-reverification.md](../notes/2026-09-01-blocker-reverification.md).

## Inputs

- The declared `appExt:credentialsDB @ load` provide and its resolved load position, from Phase 2. The ordering verdict depends on it: builtins are source #1 and `credentials` is component index 1 within the entry, which is what makes this particular same-phase edge *provable* rather than `order-unprovable`.
- The framework intrinsic manifest's `appExt:serverConfigRoot` declaration.
- `@sdlcforge/dev-core`'s own shipped `package.json` `"plugable"` block, reachable in `core-server`'s tree only once its yalc snapshot is refreshed (Phase 1's prerequisite-verification task covers both `plugable-express` and `@sdlcforge/dev-core`, per [2026-09-01-blocker-reverification.md](../notes/2026-09-01-blocker-reverification.md)).
- The framework's validator — `validatePluginSet()` and/or the `plugable-express-validate` CLI, whichever entry point Phase 1 confirmed present — and its exit-code/verdict-string contract (`satisfied`, `satisfied-by-source-order`, `unsatisfied`, `unsatisfied-phase`, `order-unprovable`).

## Outputs

- **A verified resolution outcome** for both previously-open findings: confirmation that `@sdlcforge/dev-core`'s `projects` component's `appExt:credentialsDB @ load` requirement and its `work` component's `appExt:serverConfigRoot @ load` requirement both resolve to `satisfied` (or `satisfied-by-source-order` for the same-phase `credentialsDB` edge) once Phases 1 and 2 have landed — captured as literal validator output, not inferred from static reading alone.
- **A stated, verifiable coverage boundary.** Which couplings the run actually checked, which it assumed, and which it does not see at all — carried in the validator's own output rather than in prose someone has to go find.
- **An honest statement of which of the two named bugs is actually closed**, and by what mechanism (`@sdlcforge/dev-core`'s own shipped manifest resolving against `core-server`'s declared providers — not authored by `core-server`), recorded where the plan summary will pick it up. If either edge does *not* resolve as expected, that is a genuine, unresolved gap in the ownership-boundary analysis and must be halted and reported rather than worked around — it would reopen the four-option decision this phase's original framing deferred.
- Any unrelated findings the same validator run surfaces inside `@sdlcforge/dev-core`'s other two absorbed components (`orgs`, `projects-audit`) — e.g. a requirement tracing to a package outside `core-server`'s own plugin set entirely, such as `liq-policy` — are `@sdlcforge/dev-core`'s own concern, out of this plan-group's `plans: {core-server: ...}` participant set, and should be recorded but not treated as blocking this phase.
