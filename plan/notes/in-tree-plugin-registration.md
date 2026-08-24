# In-Tree Plugin Registration

## Purpose and scope

Records the central mechanism problem this plan has to solve before its tasks can be broken down: **`@liquid-labs/plugable-express` currently offers `core-server` no supported way to register a plugin that lives in `core-server`'s own source tree.** This note states the finding, the three candidate mechanisms, and what each costs. It is the target note for the mechanism research request and for the scope question put to the user; a research agent extends it rather than replacing it.

## The finding

`src/lib/app-init.mjs` passes `explicitPlugins` — an array of **npm package names** — through to `@liquid-labs/plugable-express`'s `appInit`. That array is consumed in `src/lib/load-plugins.js` (`discoverExplicitPlugins`), which calls `find-plugins` against `<searchPath>/package.json` and `<searchPath>/node_modules`, filters results by `pkg.name`, and loads each match with a dynamic `await import(\`${dir}/${main}\`)`.

Every step of that path assumes an installed npm package on disk:

- discovery is a `node_modules` scan,
- identity is `package.json:name`,
- loading is a dynamic import of the package's `main`.

There is no `appInit` option that accepts an already-imported module object, and the package's public export surface (`src/index.js`: `appInit`, `IntegrationsManager`, `Reporter`, `startServer`) exposes no lower-level composition entry point. `registerHandlers` is re-exported from `src/lib/index.js` but that is not the package `main`.

Two further properties of `appInit` constrain any workaround:

1. **`app.ext` is constructed inside `appInit`.** A caller cannot pre-seed `app.ext.setupMethods` or `app.ext.pendingHandlers`; passing an existing `app` in (the reload path) resets `app.ext` wholesale.
2. **Handler registration and the error middleware are ordered inside `appInit`.** `app.ext.pendingHandlers` are executed, and only then are the two error-handling `app.use(...)` layers installed, followed by the `DependencyRunner` pass over `app.ext.setupMethods` and the API-spec file write.

Property 2 is what rules out the "just register afterwards" workaround: an Express route registered after an error-handling layer sits later in the router stack, so a `next(err)` from that route searches *forward* and never reaches the earlier error handlers. The absorbed routes would fall through to Express's default error handler — a different status/content-type/body than every other route on the server. That is exactly the consumer-facing behavior change this plan's hard constraint forbids. The API-spec write (`apiSpecPath`) also happens inside `appInit`, so post-hoc registration would additionally leave the written spec incomplete.

## Candidate mechanisms

### A. New `appInit` affordance in `plugable-express`

Add an option (e.g. `builtinPlugins`) taking an array of already-imported plugin module objects plus identity metadata (`npmName`/`summary`/`version`), and process it at the same point in `appInit`'s sequence that `loadPlugins` occupies. Mechanically small: `loadPlugin()` in `src/lib/load-plugins.js` splits into "resolve the module" (dynamic import) and "register the module" (setup + `pendingHandlers` push), and the new option calls the second half directly.

- **Preserves ordering exactly** — setup methods, handler registration, error middleware, and the API-spec write all keep their current relative positions.
- **Survives bundling** — the in-tree modules are ordinary static imports in `core-server`'s source, so Rollup bundles them into `dist/sdlcforge-server.js` like any other module.
- **Cost:** a change to a repository that is *not* a participant of this plan-group, plus a `yalc push` from `plugable-express` and a `rm -f bun.lock && bun install` refresh in `core-server` (the documented sequence in [`AGENTS.md`](../../AGENTS.md#common-tasks)). That refresh also pulls in whatever else has landed in `plugable-express` since the current snapshot, which is its own integration risk.
- **Open sub-question:** whether `skipCorePlugins: true` should suppress in-tree plugins too. Both of `core-server`'s unit test files pass `skipCorePlugins: true`; see [the `load orgs` hazard](#the-load-orgs-hazard) below.

### B. In-repo `file:` sub-packages inside `core-server`

Keep each absorbed plugin npm-package-shaped, but move the package into `core-server`'s own repository (e.g. `packages/core-controls/`), declared as `"@sdlcforge/core-controls": "file:./packages/core-controls"` and listed in `explicitPlugins` under its new name.

- **Zero framework change**, and the loading path stays byte-for-byte the one in use today — including `skipCorePlugins` semantics and `/server/plugins/list` visibility.
- **Cost:** they are still separate npm packages in shape, which sits awkwardly against this plan's stated goal ("no longer separate npm packages" / in-tree modules under `src/`). Publication needs `bundleDependencies` (or a workspace/publish step) for a consumer installing `@sdlcforge/core-server` from the registry to get them, and the Catalyst/Rollup build would need to leave them out of the bundle rather than inline them. Also multiplies `package.json` files inside one repo.

### C. Post-`appInit` registration from `core-server`

Call `appInit`, then register the absorbed handlers and run their setup functions against the returned `app`.

- **Not viable under this plan's hard constraint**, for the error-middleware ordering reason stated above, plus the incomplete API-spec write. Recorded here so the option is visibly rejected rather than silently unconsidered.

## The `load orgs` hazard

`@liquid-labs/liq-controls`'s `setup` enqueues two setup methods: `'load org controls'` with `deps: ['load orgs']` (a method contributed by `@liquid-labs/liq-orgs`, which stays an external explicit plugin), and `'load controls integrations'` with `deps: ['setup integrations']` (built into `plugable-express` since the `framework-consolidation` fold-in).

Today those setup methods are only enqueued when the `liq-controls` package is actually discovered — so a run with `skipCorePlugins: true` (both `src/lib/test/app-init.test.js` and `src/lib/test/golden-api-spec.test.js`) enqueues neither, and `@liquid-labs/dependency-runner` never sees an unsatisfiable dependency. Once the controls code is in-tree and registered unconditionally, its `deps: ['load orgs']` entry is enqueued in runs where `liq-orgs` was never loaded. `dependency-runner` reports `There are non-runnable candidates in the queue` in that situation, which would be a startup failure in exactly the configuration the existing unit tests use.

Whichever mechanism is chosen must answer this: either in-tree registration is gated the same way explicit-tier discovery is, or the controls setup dependency is made conditional, or the tests stop using `skipCorePlugins: true`.

## Re-verification against source (second planning pass)

Every claim above was re-checked against current source in a fresh pass and holds. The specific confirmations, with the lines that carry them:

- `discoverExplicitPlugins` (`load-plugins.js`) builds `findOptions` from `<searchPath>/package.json` and `<searchPath>/node_modules` and filters on `pluginSummary.pkg?.name`. Identity is an npm package name and nothing else.
- `loadPlugin` reads `const { main, name: npmName, description, version } = pkg` and then `await import(\`${dir}/${main}\`)`. Both the module location and the plugin's server-visible identity come from a `package.json` on disk.
- `appInit` (`plugable-express`'s `src/app.js`) assigns `app.ext = { … }` as a fresh object literal *after* an incoming `app` is accepted, so the reload path cannot pre-seed `setupMethods` or `pendingHandlers`.
- Ordering inside `appInit`, in source order: core handlers registered → `loadPlugins` (setup runs eagerly, handlers deferred onto `pendingHandlers`) → `pendingHandlers` drained → the two error-handling `app.use(…)` layers → `DependencyRunner` over `setupMethods` → the API-spec `fs.writeFile`. Nothing between `loadPlugins` and the error middleware is reachable from a caller.
- `registerPathVar` lives in `plugable-express`'s `src/lib/path-var-registry.mjs`, which is re-exported by **neither** `src/index.js` (`appInit`, `IntegrationsManager`, `Reporter`, `startServer`) **nor** `src/lib/index.js` (`configurables`, `integrations-manager`, `load-plugins`, `register-handlers`, `reporter`). `liq-credentials`' setup calls it, so option C is not merely mis-ordered — it has no way to obtain the function at all.

Two further findings this pass adds:

- **`plugable-express` is confirmed not a participant** of the `core-server-domain-consolidation` plan-group. `plan/waves/sdlcforge-modernization/manifest.yaml` lists its participants as `core-server`, `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github`. `plugable-express` participates in the sibling `framework-consolidation` group (complete) and in Wave 3's `compile-time-manifest-framework` (not started).
- **Wave 3 is chartered over this exact ground.** `compile-time-manifest-sdlc-server`'s description says it will "define core-server's own SDLC-specific plugin manifest declaring provides/requires/optional for its (by-then-consolidated) plugin set, **replacing the current `explicitPlugins` runtime array in `app-init.mjs`**." Whatever mechanism this plan adopts is explicitly expected to be superseded a wave later. That argues for the smallest mechanism that satisfies the constraint, and against building anything general here.

## Recommendation

**Option A, scoped as small as it can be made**, and therefore a request to add `@liquid-labs/plugable-express` to this plan-group as a fifth participant.

The reasoning:

- Option C is not a choice — it cannot obtain `registerPathVar`, and it registers routes after the error middleware, which is the consumer-facing behavior change the plan forbids.
- Option B works with zero framework change, but it does not deliver what the request asked for. The three donors would remain npm packages in every structural sense — own `package.json`, own build, own publish story, resolved through `node_modules` at runtime — merely relocated inside `core-server`'s repository. It also *adds* work Wave 3 will then have to undo: `bundleDependencies` or a workspace publish step, plus Rollup externals so the sub-packages stay out of `dist/sdlcforge-server.js`.
- Option A is a small, well-bounded split of an existing function: `loadPlugin()` already separates cleanly into "resolve the module" and "register the module," and the new option calls only the second half. It puts absorbed code into `dist/sdlcforge-server.js` as ordinary bundled modules, which is a simplification of `core-server`'s runtime rather than an addition to it. And it is the natural precursor of what Wave 3's compile-time manifest needs anyway — a way to register a plugin that is not an installed npm package.

The cost is real and should be stated plainly when the decision is put: it expands a four-project plan-group to five, it requires a `yalc push` plus `rm -f bun.lock && bun install` in `core-server` that will pull in whatever else has landed in `plugable-express` since the current snapshot, and it means this plan-group's completion now depends on a repository whose own plan slice does not exist.

If the answer is "do not touch `plugable-express`," option B is the fallback and the plan's stated goal has to be relaxed from "in-tree modules" to "first-party in-repo packages" — a relaxation worth making explicit rather than discovering during implementation.

## Open sub-questions for the mechanism research pass

Whichever option is chosen, these must be answered before Phase 4's tasks can be written:

1. **`skipCorePlugins` interaction.** Both `core-server` unit tests pass `skipCorePlugins: true`. Does an in-tree plugin load under it, or is it suppressed the same way explicit-tier discovery is? Answering this also resolves the `load orgs` hazard below.
2. **The `load orgs` hazard** — see the section above. Gate registration, make the dependency conditional, or change the tests. Pick one and say why.
3. **Plugin identity supply.** What `npmName`/`summary`/`version` (if any) the mechanism attaches, which drives both `app.ext.handlerPlugins` and the `npmName` provenance stamped into every `app.ext.handlers` entry. Depends on the [plugin list visibility](./plugin-list-visibility.md) decision.
4. **`registerPathVar` and `serverConfigRoot` supply.** `loadPlugin` passes `{ app, cache, reporter, registerPathVar, serverConfigRoot: app.ext.serverConfigRoot }` into every `setup()`. An in-tree mechanism must pass the identical argument object; `liq-credentials`' setup uses three of the five.
5. **Setup return value.** `loadPlugin` awaits a thenable `setupData` and threads it into `registerHandlers`. None of the three donors appears to return one, but the mechanism should preserve the affordance rather than silently drop it.
6. **Bundling.** Confirm Rollup inlines the absorbed submodules into `dist/sdlcforge-server.js` and that the executable artifact `dist/sdlcforge-server-exec.js` still works, given the absorbed code is now reached by static import rather than dynamic `import()`.

## Related documents

- [`docs/architecture/plugin-loading-tiers.md`](../../docs/architecture/plugin-loading-tiers.md) — the tier model this plan reshapes.
- [`plan/notes/absorbed-surface-inventory.md`](./absorbed-surface-inventory.md) — what is being absorbed.
- [`plan/notes/plugin-list-visibility.md`](./plugin-list-visibility.md) — the one consumer-visible output this mechanism choice cannot fully preserve.
- [`plan/notes/absorption-layout-and-merge-hazards.md`](./absorption-layout-and-merge-hazards.md) — where the absorbed code lands, once a mechanism exists to register it.
- [`plan/notes/parity-baseline.md`](./parity-baseline.md) — how "registered identically" is actually checked.
