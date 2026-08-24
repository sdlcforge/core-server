# In-Tree Plugin Mechanism

## Goals

Bring `core-server` onto the `builtinPlugins` registration affordance — the mechanism by which a module living in `core-server`'s own `src/` tree is registered as a `@liquid-labs/plugable-express` plugin at the **identical point in `appInit`'s sequence** an installed npm-dependency plugin occupies today — and prove it works end to end before any absorbed donor code depends on it.

**The mechanism itself is built elsewhere.** [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md) records the settled decision: Option A, a small new `appInit` option in `@liquid-labs/plugable-express`, and that repository joins this plan-group as a **fifth federated participant with its own plan slice, its own plan worktree, and its own phase numbers**. The `src/lib/load-plugins.js` split into `registerPluginModule` + `loadBuiltinPlugins`, the `src/app.js` wiring inside the `skipCorePlugins` guard, the jsdoc, and the framework's own unit tests are all authored and executed under `plugable-express`'s slice — **not here**. This phase carries only `core-server`'s own side of that boundary.

Accordingly this phase has three jobs, in order: **gate** on the framework change having actually landed (a read-only cross-project verification, mirroring `liq-controls`' own Phase 2 gate task against this project); **refresh** the yalc-linked `plugable-express` snapshot in `core-server` and re-verify the existing suite so an unrelated regression from that refresh is attributed correctly rather than blamed on the absorption; and **wire** `core-server`'s own aggregator (`src/lib/builtin-plugins.mjs`) and `app-init.mjs` in an empty-but-shaped form, proven by a test-injected probe plugin, so the registration path is known-good before a single donor's code sits on it.

The phase is sequenced between the baseline and the merges deliberately. Landing the wiring on its own — proven by a probe rather than by real donor code — means that when a merge later goes wrong, the failure is unambiguously in the merge and not in the registration path.

## Inputs

- **`@liquid-labs/plugable-express`'s own `builtinPlugins` slice, landed and yalc-pushed.** A hard cross-project gate this plan cannot enforce through its own tooling; recorded in `plan/manifest.yaml`'s `dependencies` map and enforced by this phase's first task, which halts rather than proceeding when the framework change is absent or shaped differently than designed.
- The design in [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#mechanism-design-research-pass) — the exact framework split, the `app.js` call site, `core-server`'s own `builtin-plugins.mjs` and `app-init.mjs` edits, and the decisive answers to all six formerly-open sub-questions.
- The identity decision from [`plan/notes/plugin-list-visibility.md`](../notes/plugin-list-visibility.md): exactly one `builtinPlugins` entry, carrying `@sdlcforge/core-server`'s own `name`/`version` from `package.json` plus a literal `summary`.
- Phase 3's full-tier baseline harness — the only configuration in which `builtinPlugins` actually registers, since the settled gating suppresses it under `skipCorePlugins: true`.

## Outputs

- A confirmed, documented finding that `plugable-express`'s `builtinPlugins` affordance is present in the linked snapshot, is shaped as designed (registration runs inside the `skipCorePlugins !== true` guard, before core `loadPlugins`, through a single shared `registerPluginModule`), and that the framework's own suite is green.
- `core-server`'s `bun.lock` regenerated (`rm -f bun.lock && bun install`, **never** a bare `bun install`) against the refreshed snapshot, with `make build`, `make test`, `bun run test:local`, and Phase 3's full-tier harness all re-verified so that any drift introduced by the framework refresh is attributed to it and not to the absorption.
- `src/lib/builtin-plugins.mjs` present in empty-but-shaped form (an empty `submodules` array, yielding a zero-handler entry whose composed `setup` is a no-op) and `src/lib/app-init.mjs` wired to pass it, with `pkgName` read from `package.json` alongside the existing `pkgVersion` and `builtinPlugins` positioned before the `...options` spread so a caller can still override it.
- A test-injected probe plugin proving the whole path end to end: `setup` invoked with the identical five-member argument object (`{ app, cache, reporter, registerPathVar, serverConfigRoot }`), a `registerPathVar` call succeeding, an enqueued setup method running under `dependency-runner`, a registered route serving, that route's thrown error producing the **server's own** error-response shape rather than Express's default, and the route appearing in the written API spec.
- Confirmation that the existing `skipCorePlugins: true` tests (`app-init.test.js`, `golden-api-spec.test.js`) still pass with **zero edits** and both existing golden snapshots byte-identical — the observable proof that the gating decision holds.
- Confirmation that Rollup inlines the aggregator chain into `dist/sdlcforge-server.js` and that `dist/sdlcforge-server-exec.js` still starts.
