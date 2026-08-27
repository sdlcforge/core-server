# Phase — Third-Party Coupling Coverage

## Goals

Close the two couplings this plan-group is chartered to fix whose **requiring** half lives in a package `core-server` does not own:

- `@liquid-labs/liq-projects` requires `app.ext.credentialsDB` at plugin-`setup` phase — a hard `TypeError` during `appInit` if unmet, satisfied today only because `builtinPlugins` is loading source #1 by construction and `credentials` precedes everything else in the entry. Nothing declares it anywhere; a test comment in `core-server` is the only place in either repository where the contract is written down.
- `@liquid-labs/liq-work` requires `app.ext.serverConfigRoot` inside its own `setup()` — the third-party half of `ynGa`, and one of the four readers the original `serverHome` → `serverConfigRoot` rename broke.

Both providers are already declarable: the framework's intrinsic manifest covers `appExt:serverConfigRoot`, and the preceding phase declares `appExt:credentialsDB @ load` from `src/credentials/`. What is missing in both cases is the requirement. A provide with nothing requiring it emits no finding, so without this phase the gate runs green over exactly the two edges that motivated the work.

**This phase's approach is an open decision, and its task breakdown is deferred until that decision is made.** [manifest-ownership-boundary.md](../notes/manifest-ownership-boundary.md) works out why: a manifest lives with the package it describes, `node_modules/` is install output and `.yalc/` is a gitignored snapshot, and the upstream `plugable.host` block's two host-sited capability lists — `providedCapabilities` and `assumeProvided` — are both **provider-side**. There is no host-sited affordance for declaring a third party's `requires`, and the engine's satisfaction pass only ever matches a `requires` against the union of provides. That is a coherent design choice upstream, not a defect; it is nonetheless the reason this phase cannot be planned in detail from `core-server` alone.

The four candidate approaches (a host-sited overlay added upstream; manifesting the third-party plugins in their own repositories; accepting partial coverage; or manifesting `liq-projects` alone, since it is already yalc-linked from a local checkout) differ in scope, participant set, and cost, and choosing among them is a scope decision rather than an implementation one.

## Inputs

- The user's or manager's decision on approach, and — if the answer involves an upstream schema addition — a resolution from the `compile-time-manifest-framework` plan-group, whose design is finalized and whose implementation had not started as of planning.
- The declared `appExt:credentialsDB @ load` provide and its resolved load position, from the preceding phase. The ordering verdict depends on it: builtins are source #1 and `credentials` is component index 1 within the entry, which is what makes this particular same-phase edge *provable* rather than `order-unprovable`.
- The framework intrinsic manifest's `appExt:serverConfigRoot` and `setupArg:serverConfigRoot` declarations, and the `supersedes:` affordance that lets a future rename report *"`appExt:serverHome` was renamed to `appExt:serverConfigRoot`"* rather than *"no provider."*
- The wave manifest's `dev-core-consolidation` plan-group, which merges `liq-projects`, `liq-work`, `liq-orgs`, and `plugable-projects-audit` into a new `sdlcforge/dev-core` package. Any approach that manifests those repositories individually risks doing work that consolidation redoes, and that interaction has to be weighed rather than discovered.

## Outputs

Determined by the decision. Under every approach the phase must produce two things:

- **A stated, verifiable coverage boundary.** Which couplings the gate checks, which it assumes, and which it does not see at all — carried in the gate's own output rather than in prose someone has to go find. Upstream requires a run resting on `assumeProvided` to say so in its coverage statement even when otherwise clean, precisely so a green run is never silently read as broader than it is. Whatever this phase produces must meet that bar.
- **An honest statement of which of the two named bugs is actually closed**, recorded where the plan summary will pick it up. If the answer is partial coverage, saying so plainly is the output; a plan that claims to have fixed `ynGa` when it has declared one of its four readers would be worse than one that closed nothing.
