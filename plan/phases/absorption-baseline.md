# Absorption Baseline

## Goals

Produce an executable, checked-in record of what `@sdlcforge/core-server`'s loaded plugin surface actually is *today*, with `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-integrations-issues-github` still present as Tier-2 explicit npm-dependency plugins.

This phase comes first because the plan's central constraint — no consumer-facing behavior change — is currently unverifiable. `core-server` has no test that loads any donor: both unit tests pass `skipCorePlugins: true`, `test/__snapshots__/golden-plugins-list.json` is `[]`, and `test/__snapshots__/golden-api-spec.json` holds 35 `plugable-express` core routes and nothing else. Absorbing three plugins against no baseline would mean discovering regressions only if someone happened to exercise the affected route by hand.

It is also the only phase of this project's slice that is independent of every settled decision and of `plugable-express`'s own work. It observes the current npm-dependency world, so it can proceed concurrently with `plugable-express`'s mechanism slice and with the donors' own relocation phases.

**The feasibility question this phase was originally chartered to answer is already answered.** [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md)'s research pass established empirically that the `ynGa` `serverHome`/`serverConfigRoot` bug is fixed in every package that carried it, that `appInit()` loads all eleven explicit plugins without throwing, and that the resulting surface is 165 routes / 11 plugin-list entries / 7 setup methods / 3 integration-provider registrations / 3 donor-installed `app.ext` keys. This phase is therefore **"add assertions to an already-working path,"** not "make the path work first," and its tasks are written on that basis rather than carrying a diagnostic branch.

**The existing `golden-api-spec.test.js` is not repurposed.** That file's `skipCorePlugins: true` is load-bearing for two independent reasons — its own in-source statement of intent (isolating `core-server`'s framework-level API surface, independent of any loaded plugin), and the [`load orgs` hazard](../notes/in-tree-plugin-registration.md#2-the-load-orgs-hazard--resolved-by-the-gating-in-1-no-other-change) resolution, which relies on `builtinPlugins` being suppressed under that flag so the file keeps passing with zero edits after absorption. The full-tier baseline therefore lands as a **new, separate harness** with its own snapshots, leaving both existing golden snapshots untouched for the whole life of this plan.

## Inputs

- `core-server`'s current `src/lib/app-init.mjs`, its eleven-entry `explicitPlugins` array, and its installed `node_modules` tree at the current `bun.lock`.
- The existing test infrastructure: `src/lib/test/*.test.js` (Jest + Supertest, compiled through `test-staging/` by `make/55-test.mk`), the `UPDATE_GOLDEN_API_SPEC` regeneration opt-in and its `test:update-golden-api-spec` script, and the two golden snapshots under `test/__snapshots__/`.
- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md) — the measured baseline numbers, the exact capture recipe, the `PLUGABLE_PLAYGROUND` isolation requirement, and the three observables no existing snapshot covers.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — the hand-taken inventory of routes, setup methods, providers, hooks, and dependencies this phase mechanizes and confirms.
- [`plan/notes/plugin-list-visibility.md`](../notes/plugin-list-visibility.md) and [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#3-plugin-identity-supply--one-entry-sdlcforgecore-server-s-own-identity) — the settled identity decision, which fixes in advance exactly which baseline entries are *expected* to differ after absorption.

## Outputs

- A committed, regenerable full-tier baseline harness covering registered endpoints (method, `path`/`paths`, `npmName` provenance), enqueued setup methods with their `deps`, the `app.ext` key set and `app.ext.credentialsDB`'s method surface, and both plugin-list endpoint bodies — with the existing 35-route framework-surface golden snapshot left byte-identical.
- A faithful integration-provider and hook baseline taken by observing `IntegrationsManager.prototype.register` calls rather than by reading `GET /server/plugins/integrations/list`, whose response is de-duplicated by a pre-existing donor defect and must be snapshotted as-is rather than accidentally corrected.
- A written parity contract enumerating, in advance, every baseline entry expected to change after absorption and the reason, so Phase 5 can distinguish an accepted diff from a regression per donor rather than only in aggregate at the end.
- Confirmation or correction of the hand-taken dependency inventory, including the items it marks **TO CONFIRM** (`liq-controls`' apparently-unused `@liquid-labs/liq-qa-lib` and `@liquid-labs/http-smart-response` declarations, `issues-github`'s undeclared-but-imported `@liquid-labs/octocache`, and the live state of its `@liquid-labs/liq-projects-lib` coupling).
