# In-Tree Plugin Mechanism

## Goals

Establish the mechanism by which a module living in `core-server`'s own `src/` tree is registered as a `@liquid-labs/plugable-express` plugin at the **identical point in `appInit`'s sequence** that an installed npm-dependency plugin occupies today, and prove it works before any absorbed donor code depends on it.

This phase exists because no such mechanism exists. `plugable-express`'s loader discovers plugins by scanning `node_modules`, identifies them by `package.json` `name`, and loads them by dynamic-importing `<dir>/<pkg.main>` — every step assumes an installed package on disk. And `appInit` gives a caller no seam: it constructs `app.ext` as a fresh object literal (so nothing can be pre-seeded), drains `app.ext.pendingHandlers` *before* installing its two error-handling `app.use(…)` layers (so a route registered afterwards falls through to Express's default error handler instead of the server's), runs the `DependencyRunner` over `app.ext.setupMethods` after that, and writes the API spec last. Registering absorbed routes after `appInit` returns would change their error responses and leave them out of the written API spec — exactly the consumer-facing change this plan forbids. `registerPathVar`, which `liq-credentials`' setup requires, is not exported from the package at all.

The phase is sequenced between the baseline and the merges deliberately. Landing the mechanism on its own — proven by a trivial in-tree probe plugin rather than by real donor code — means that when a merge later goes wrong, the failure is unambiguously in the merge and not in the registration path.

Blocked on the mechanism decision recorded in [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md). The recommendation there is a small new `appInit` affordance in `plugable-express`, which requires adding that repository as a fifth participant of this plan-group.

## Inputs

- The mechanism decision — a user/manager call, since the recommended option expands the plan-group's project set.
- The plugin-identity decision from [`plan/notes/plugin-list-visibility.md`](../notes/plugin-list-visibility.md), which determines what `npmName`/`summary`/`version` the mechanism attaches and therefore what `GET /server/plugins/list`, `GET /server/plugins/integrations/list`, and every absorbed endpoint's recorded provenance report.
- Phase 3's baseline artifact, so the probe plugin can be shown to register through the same path as a real plugin.
- `plugable-express`'s `src/app.js`, `src/lib/load-plugins.js`, `src/lib/register-handlers.js`, and `src/lib/path-var-registry.mjs`.
- The six open sub-questions enumerated at the end of [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md), each of which must be answered before task breakdown.

## Outputs

- A supported way for `core-server` to register an in-tree module as a plugin, with `setup` invoked at the same moment and with the same argument object (`{ app, cache, reporter, registerPathVar, serverConfigRoot }`) the npm path supplies, and with handlers deferred onto `app.ext.pendingHandlers` rather than registered directly.
- A resolution to the `'load orgs'` hazard: `liq-controls`' setup enqueues a method with `deps: ['load orgs']`, a name contributed by `liq-orgs`. Today that method is only enqueued when the `liq-controls` package is discovered, so a `skipCorePlugins: true` run enqueues nothing and `@liquid-labs/dependency-runner` never sees an unsatisfiable dependency. Unconditional in-tree registration would enqueue it in runs where `liq-orgs` was never loaded — both existing `core-server` unit tests — producing `There are non-runnable candidates in the queue` at startup. Either in-tree registration is gated the way explicit-tier discovery is, or the dependency is made conditional, or the tests stop using `skipCorePlugins: true`.
- A trivial in-tree probe plugin, landed and tested, demonstrating a registered route, a registered path variable, and an enqueued setup method — with the probe's route confirmed to hit the server's own error middleware rather than Express's default.
- If the chosen option changes `plugable-express`: that change landed and released to `core-server` via `yalc push` plus `rm -f bun.lock && bun install`, with `core-server`'s existing suite re-verified green against the refreshed snapshot (the refresh also pulls in whatever else has landed in `plugable-express` since the current one).
- Confirmation that Rollup inlines an in-tree plugin module into `dist/sdlcforge-server.js` and that `dist/sdlcforge-server-exec.js` still starts.
