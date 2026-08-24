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

## Answer

Yes — add `@liquid-labs/plugable-express` to this plan-group as a fifth participant, and proceed with **Option A** (a new, minimally-scoped `appInit` affordance) as recommended. The user accepted this recommendation directly.

## Mechanism design (research pass)

Option A is settled. This section is the concrete design: the exact framework change, the exact `core-server` change, and a decisive answer to each of the six open sub-questions. It is written to be implementable directly — the code blocks below are the proposed source, not sketches.

Everything here was checked against source at the following states: `@liquid-labs/plugable-express` at `8c90be7` (`1.0.0-alpha.58`, working tree clean apart from an untracked `.flow/`), and `core-server`'s plan worktree at its current `HEAD`. Note in passing that `core-server/.yalc/@liquid-labs/plugable-express/package.json` is *also* at `1.0.0-alpha.58` and the yalc snapshot is current with the producer's `HEAD`, so the "a refresh pulls in whatever else has landed since the current snapshot" integration risk named in [Recommendation](#recommendation) is, as of this pass, approximately zero. That will not stay true indefinitely; re-check before the refresh runs.

### The framework change, part 1 — split `loadPlugin` in `src/lib/load-plugins.js`

`loadPlugin` (lines 18–41) separates at exactly one seam: everything from line 24 down is independent of *how* the module was obtained. Lines 19–23 (identity from `pkg`, dynamic `import`) stay in `loadPlugin`; lines 24–40 move verbatim into a new `registerPluginModule`, which `loadPlugin` then calls.

```javascript
/**
 * Registers an already-resolved plugin module: validates its exports, runs its 'setup' (awaiting a thenable
 * 'setupData'), and queues handler registration. Shared by the npm-package load path and the 'builtinPlugins' path so
 * both are, by construction, identical from 'setup()' onward.
 */
const registerPluginModule = async({ app, cache, reporter, registerPathVar, npmName, summary, version, module }) => {
  const { handlers, setup } = module || {}
  if (handlers === undefined && setup === undefined) {
    throw new Error(`Plugin from '${npmName}' does not export 'handlers' or 'setup'; bailing out.`)
  }

  if (setup !== undefined) reporter.log(`Running setup for ${npmName}@${version} plugin...`)
  let setupData = setup?.({ app, cache, reporter, registerPathVar, serverConfigRoot : app.ext.serverConfigRoot })
  if (setupData?.then !== undefined) {
    setupData = await setupData
  }

  app.ext.pendingHandlers.push(() => {
    if (handlers !== undefined) {
      registerHandlers(app, { npmName, handlers, reporter, setupData, cache })
    }

    app.ext.handlerPlugins.push({ summary, npmName, version })
  })
}

/**
 * Loads a single plugin from an installed npm package.
 */
const loadPlugin = async({ app, cache, reporter, registerPathVar, dir, pkg }) => {
  const { main, name: npmName, description, version } = pkg
  // Since we pull the 'summary' from the package.json description, there may be unecessary context which is clear when
  // asking 'describe this plugin'. So, we look for this specific phrase and remove it.
  const summary = description?.replace(/ +(?:for|in) a @liquid-labs\/plugable-express server/, '')
  const module = await import(`${dir}/${main}`)

  return registerPluginModule({ app, cache, reporter, registerPathVar, npmName, summary, version, module })
}
```

The `|| {}` guard on line 24's destructuring is preserved (as `module || {}`) rather than dropped; it is unreachable on the `await import()` path but becomes meaningful on the caller-supplied path.

`loadPlugins` (lines 115–185) is **not touched**.

### The framework change, part 2 — `loadBuiltinPlugins`, same file

```javascript
/**
 * Registers already-imported, in-tree plugin modules supplied by the host server, at the same point in appInit's
 * sequence that npm-discovered core plugins occupy.
 * @param {Object} app - Express app instance
 * @param {Array<Object>} options.builtinPlugins - entries of { npmName, module, summary?, version? }
 * @param {Set<string>} options.loadedPluginNames - shared duplicate-tracking set
 */
const loadBuiltinPlugins = async(app, { cache, reporter, registerPathVar, builtinPlugins, loadedPluginNames }) => {
  if (!(builtinPlugins?.length > 0)) return

  const pluginNames = loadedPluginNames || new Set()

  reporter.log(`Registering ${builtinPlugins.length} built-in plugin(s)...`)

  for (const { npmName, summary, version, module } of builtinPlugins) {
    if (npmName === undefined || module === undefined) {
      throw new Error("Each 'builtinPlugins' entry must define both 'npmName' and 'module'.")
    }

    if (pluginNames.has(npmName)) {
      reporter.log(`Warning: Plugin '${npmName}' was already loaded from another source, skipping duplicate built-in registration.`)
      continue
    }

    await registerPluginModule({ app, cache, reporter, registerPathVar, npmName, summary, version, module })
    pluginNames.add(npmName)
  }
}

export { loadBuiltinPlugins, loadPlugins }
```

Deliberate non-features, each with a reason:

- **No `supersededPlugins` check.** That set exists to protect a consumer from *discovering* a package whose capability moved into the framework. A `builtinPlugins` entry is an explicit act by the host server, never a discovery result; silently dropping one would be a footgun.
- **No `summary` normalization.** `loadPlugin` strips `" for a @liquid-labs/plugable-express server"` off a package `description` because a `description` is written for npm, not for `/server/plugins/list`. A `builtinPlugins` caller supplies the final display string directly, so the regex must not run on it.
- **No `handlerPlugins` de-duplication.** Two entries sharing one `npmName` would produce two identical `/server/plugins/list` rows. The framework does not police that; the *caller* decides how many entries to pass, which is exactly where the [plugin list visibility](./plugin-list-visibility.md) decision lives. `core-server` passes one (below).
- **`loadBuiltinPlugins` is not added to the package's public `src/index.js`.** `src/lib/index.js` already carries `export * from './load-plugins'`, which is enough for `src/app.js` to import it and for the framework's own tests to reach it. `core-server` needs only `appInit`. Public surface unchanged.

### The framework change, part 3 — `src/app.js`

Four edits, all mechanical:

1. Line 18 — `import { loadBuiltinPlugins, loadPlugins, registerHandlers } from './lib'`.
2. The `appInit` jsdoc (lines 30–44) — a `builtinPlugins` entry, worded to state the gating:

   ```text
   * - `builtinPlugins` (opt): array of already-imported, in-tree plugin modules contributed by the host server, each
   *    `{ npmName, module, summary, version }` where `module` exports `handlers` and/or `setup`. Registered at the
   *    same point, and by the same code, as an npm-discovered core plugin — and, being part of the server package
   *    itself, suppressed by `skipCorePlugins: true` exactly as core-plugin discovery is.
   ```

3. The destructure at lines 47–58 — add `builtinPlugins,` between `apiSpecPath,` and `explicitPlugins,` (the list is alphabetical).
4. Lines 141–144 — the call, **inside** the `skipCorePlugins` guard and **before** the core `loadPlugins`:

   ```javascript
   if (skipCorePlugins !== true) {
     await loadBuiltinPlugins(app, { cache, reporter, registerPathVar, builtinPlugins, loadedPluginNames })

     reporter.log(`Loading core plugins from '${serverPackageRoot}'...`)
     await loadPlugins(app, { cache, reporter, searchPath : serverPackageRoot, explicitPlugins, loadedPluginNames, registerPathVar })
   }
   ```

Why *before* rather than after: `findPlugins` result order is filesystem-scan order and is not caller-controllable, whereas `builtinPlugins` order is the array the caller wrote. Registering builtins first puts them at a stable, deterministic position immediately after the framework's own core handlers, so the golden API spec's diff is one contiguous insertion rather than a scatter through the plugin section. It also seeds `loadedPluginNames` before discovery runs, so a discovered package colliding with a builtin `npmName` is skipped as the duplicate rather than the other way round.

Nothing else in `appInit` moves. The four-stage sequence the plan's hard constraint depends on — `pendingHandlers` drain (159–161) → the two error middlewares (164–219) → `DependencyRunner` over `setupMethods` (223–228) → the `apiSpecPath` write (230–234) — is untouched, and builtin handlers land in `app.ext.pendingHandlers` before the drain like every other plugin's. The reload path (`app.reload()` at line 124, re-invoking `appInit(Object.assign({}, initArgs, { app }))`) carries `builtinPlugins` through unchanged because it lives in `initArgs`.

### The `core-server` change

New file `src/lib/builtin-plugins.mjs`:

```javascript
import * as controls from '../controls'
import * as credentials from '../credentials'
import * as issuesGitHub from '../integrations-issues-github'

// Order is load order: it fixes the position of the absorbed routes in `app.ext.handlers` and therefore in the
// golden API spec. Keep it stable.
const submodules = [controls, credentials, issuesGitHub]

const handlers = submodules.flatMap(({ handlers = [] }) => handlers)

const setup = async(setupArgs) => {
  // Sequential, not Promise.all: mirrors `loadPlugins`' own one-plugin-at-a-time await, and keeps a submodule that
  // writes to `app.ext` visible to a later one.
  for (const submodule of submodules) {
    await submodule.setup?.(setupArgs)
  }
  // Returns undefined. No submodule produces `setupData` today. If one ever does, merge it here and return the
  // merged object -- plugable-express threads a single `setupData` into every handler registered under this entry.
}

const summary = 'Built-in SDLC controls, credentials, and GitHub issues integration.'

const builtinPluginsFor = ({ npmName, version }) => ([{ npmName, version, summary, module : { handlers, setup } }])

export { builtinPluginsFor, handlers, setup, summary }
```

`import * as <ns>` is load-bearing and must not be relaxed to `export * from`: all three submodules export a symbol named `setup`, and two export a symbol named `handlers`, so a star re-export across them is an ambiguous-export collision. Namespace imports keep each submodule's `handlers`/`setup` addressable.

`src/lib/app-init.mjs` then changes in three places:

- `const { version: pkgVersion } = pkgJSON` becomes `const { name: pkgName, version: pkgVersion } = pkgJSON`.
- `import { builtinPluginsFor } from './builtin-plugins'`, and `const builtinPlugins = builtinPluginsFor({ npmName : pkgName, version : pkgVersion })` at module scope.
- `builtinPlugins,` added to the `superInit({ … })` argument object, before the `...options` spread so a caller can still override it (the same position and rationale as every other default there).
- The three donors are removed from the `explicitPlugins` array, leaving eight entries.

Note that `pkgName` resolves to `@sdlcforge/core-server` from `package.json`, rather than being hardcoded — the identity follows the package if it is ever renamed. `summary` cannot come from `package.json`, whose `description` is the empty string; it is a literal in `builtin-plugins.mjs`. `src/lib/index.js` declares its own near-identical `summary` constant today; leaving that duplication alone is fine (importing it into `app-init.mjs` would create a `index.js → app-init.mjs → index.js` cycle), and consolidating it is a follow-up, not part of this mechanism.

### Answers to the six sub-questions

#### 1. `skipCorePlugins` interaction — suppressed, same as explicit-tier discovery

`builtinPlugins` is processed **inside** the `if (skipCorePlugins !== true)` guard, so `skipCorePlugins: true` suppresses in-tree plugins exactly as it suppresses core-tier npm discovery.

This is the semantically consistent reading rather than a convenience: `appInit`'s own jsdoc defines the flag as "the plugins in the server package directory are NOT loaded," and an in-tree plugin is in the server package directory more literally than a `node_modules` one is. A caller passing `skipCorePlugins: true` is asking for the bare framework plus whatever it points at with `pluginPaths`; handing it the host server's entire absorbed domain surface anyway would make the flag mean something new.

Two consequences worth stating explicitly:

- Handlers and `setup` are gated **together**, always, because `registerPluginModule` is one function. That is not incidental. `liq-credentials`' `setup` calls `registerPathVar('credential', …)` and its `PUT /credentials/:credential/import` route consumes that variable; `pathToRe` throws `Unknown variable path element type 'credential'` if the route registers without the var. A design that gated one and not the other would produce exactly that crash.
- The `dynamicPluginInstallDir` and `pluginPaths` `loadPlugins` calls are *not* gated by `skipCorePlugins` today and are not changed. `builtinPlugins` is core-tier only; it is never re-offered to those calls.

#### 2. The `load orgs` hazard — resolved by the gating in (1); no other change

The hazard is real and was re-confirmed against `@liquid-labs/dependency-runner`'s actual source (`src/dependency-runner.mjs`). `#checkStuck()` throws `There are non-runnable candidates in the queue` whenever any entry is `PENDING` and none is `RUNNING`, and it is called at the tail of every `#run()`. Traced concretely for a `skipCorePlugins: true` run with controls registered and `liq-orgs` absent: `complete()` starts `'setup integrations'` (no deps) so the first `#checkStuck` passes; that completes and unlocks `'load controls integrations'` so the second passes; that completes, `'load org controls'` is still un-runnable, nothing is `RUNNING`, and the third `#checkStuck` throws — from inside a promise in `#promises`, so `await depRunner.await()` rejects and `appInit` throws. Both unit tests would fail in `beforeAll`.

**Resolution: gate in-tree registration the same way explicit-tier discovery is gated.** Justified against the two test files as they actually stand:

- `src/lib/test/app-init.test.js` asserts only `existsSync(COMPLY_API_SPEC_PATH())` and the body of `GET /server/version`. Neither assertion is sensitive to extra routes — but both die anyway, because the `DependencyRunner` throw happens in the shared `beforeAll`. Gating keeps the file passing with **zero edits**.
- `src/lib/test/golden-api-spec.test.js` deep-equals `GET /server/api` against `test/__snapshots__/golden-api-spec.json` (verified: 35 entries, every one `npmName: '@liquid-labs/plugable-express'`) and `GET /server/plugins/list` against `golden-plugins-list.json` (verified: `[]`). Loading builtins there would require regenerating both — and would contradict the file's own in-source statement of intent, which says `skipCorePlugins: true` "isolates this test to core-server's own framework-level API surface (the routes `plugable-express` registers intrinsically, independent of any loaded plugin)." The problem would not be stale data; it would be that the test stopped testing what it says it tests.
- Critically, **gating costs this plan nothing**, because the parity baseline does not run here. [`parity-baseline.md`](./parity-baseline.md) already commits to capturing the baseline against the real explicit tier — a `skipCorePlugins: false` configuration in which `@liquid-labs/liq-orgs` *is* loaded and `deps: ['load orgs']` *is* satisfiable. The absorbed surface is exercised in exactly the configuration where the dependency resolves, and nowhere else. The two framework-surface tests and the one absorbed-surface baseline want different configurations, and the flag already distinguishes them.

The other two candidate resolutions are rejected on concrete grounds:

- **Make the dependency conditional.** There is no reliable moment at which controls' `setup()` can know whether `liq-orgs` will load. `setup()` runs eagerly during `loadPlugins`, and explicit-plugin order is `findPlugins` scan order, not the order of `core-server`'s `explicitPlugins` array — so probing `app.ext.setupMethods.some(({ name }) => name === 'load orgs')` at controls' setup time is a race that silently skips control loading in production whenever controls happens to be discovered first. Dropping to `deps: ['*']` plus a nullish guard in `loadControls` would work mechanically, but it changes absorbed code's semantics away from the donor's, which is precisely what this plan's "registered identically" constraint is trying to avoid, and it hides a genuine misconfiguration (controls installed without orgs) that today fails loudly.
- **Change the tests.** `golden-api-spec.test.js` documents in-source that loading the real explicit-plugin set *currently throws* — the `serverHome` → `serverConfigRoot` rename bug (`ynGa` in the wave manifest), still live in `liq-credentials-db`/`liq-integrations`/`liq-work`. Removing `skipCorePlugins: true` therefore does not merely invalidate snapshots; it makes both files fail against a pre-existing cross-package defect this plan does not undertake to fix. Non-starter, and the plan already routes around it by scheduling the baseline work in Phase 3 rather than by editing these files.

**Testing the new affordance inside `plugable-express` without a core scan.** The framework's own suite defaults to `skipCorePlugins: true` (`src/test/lib/test-utils.js`'s `defaultTestOptions`), and no existing test exercises the core-plugin path at all — introducing one would mean a `scanAllDirs` walk rooted at whatever `findOwnHome(process.argv[1])` resolves to under Jest. Avoid it with a three-part strategy: (a) unit-test `loadBuiltinPlugins` directly against a stub `app` (`{ ext : { handlers : [], handlerPlugins : [], pendingHandlers : [], setupMethods : [], serverConfigRoot } }`), asserting the setup argument object, `setupData` threading, the `pendingHandlers` push, and the `handlerPlugins` entry; (b) one `appInit`-level *negative* test that a `builtinPlugins` entry whose `setup` sets a sentinel is **not** run under `skipCorePlugins: true` — which needs no scan precisely because the flag is true; (c) leave the positive `appInit` wiring to `core-server`'s own integration pass, which already starts a real server.

#### 3. Plugin identity supply — one entry, `@sdlcforge/core-server`'s own identity

Per [plugin list visibility](./plugin-list-visibility.md)'s accepted option 3, `core-server` passes **exactly one** `builtinPlugins` entry for all three absorbed submodules:

| Field | Value | Source |
|---|---|---|
| `npmName` | `@sdlcforge/core-server` | `pkgJSON.name`, already read in `app-init.mjs` |
| `version` | e.g. `1.0.0-alpha.15` | `pkgJSON.version`, already read as `pkgVersion` |
| `summary` | `Built-in SDLC controls, credentials, and GitHub issues integration.` | literal in `builtin-plugins.mjs` (`package.json`'s `description` is `""`) |

One entry rather than three is a deliberate consequence of the identity decision: three entries sharing one `npmName` would render three identical rows from `GET /server/plugins/list` and three identical options from the `serverPluginName` path variable's `optionsFetcher` (`app.js` lines 71–76, which maps `handlerPlugins` to `npmName`). The framework stays dumb about this; the aggregation lives in `core-server`'s `builtin-plugins.mjs`, where the policy belongs. The array shape of `builtinPlugins` is what preserves the escape hatch — a future submodule needing its own identity, or its own `setupData`, becomes a second entry rather than a framework change.

The same `@sdlcforge/core-server` value is what `registerHandlers` stamps as `npmName` into every absorbed endpoint's `app.ext.handlers` entry, which is what `GET /server/api` and the golden API spec record. That is the already-accepted diff.

Three additional accepted-diff items the parity baseline must enumerate, beyond what the visibility note already lists:

- `GET /server/plugins/details/@liquid-labs%2Fliq-controls` (and the `liq-credentials` / `liq-integrations-issues-github` equivalents) stop resolving, since `serverPluginName`'s option set no longer contains those names; `@sdlcforge/core-server` becomes a valid value where it previously was not.
- `handlerPlugins` goes from three donor entries to one, so the list's length changes by −2 independently of its content.
- Absorbed routes move to the **front** of the plugin-contributed section of `app.ext.handlers` (immediately after the framework's own core handlers), in the fixed order controls → credentials, rather than being interleaved with the eight remaining explicit plugins at `findPlugins` scan order. If the baseline compares `app.ext.handlers` as an ordered array, it must normalize for order or record this as expected.

#### 4. `registerPathVar` and `serverConfigRoot` parity — identical by construction

The guarantee is structural rather than by inspection: `registerPluginModule` contains the *single* `setup?.(…)` call site in the whole package, and both paths reach it. The argument object is byte-for-byte the line moved from `load-plugins.js:29`:

```javascript
setup?.({ app, cache, reporter, registerPathVar, serverConfigRoot : app.ext.serverConfigRoot })
```

Verified for each of the five members on the builtin path:

- `app` — the same `app` the framework is initializing.
- `cache` — the `WeakCache` created at `app.js:131`, threaded through `loadBuiltinPlugins`' options exactly as it is through `loadPlugins`'.
- `reporter` — the `appInit`-scoped `Reporter`.
- `registerPathVar` — the module-level function `app.js` imports from `./lib/path-var-registry` (line 19) and already threads into every `loadPlugins` call; the builtin call passes the identical binding. This is the affordance option C could not obtain at all, since `path-var-registry.mjs` is re-exported by neither `src/index.js` nor `src/lib/index.js`. `clearRegistry()` at `app.js:61` runs before any of it, so `liq-credentials`' `registerPathVar('credential', …)` re-registers cleanly on the reload path instead of hitting `Path variable 'credential' is already registered.`
- `serverConfigRoot` — read off `app.ext.serverConfigRoot`, which is assigned in the `app.ext` initializer at `app.js:101`, before the `try` block and therefore before any plugin loading of either kind.

Of the three donors, only `liq-credentials`' `setup` consumes any of these beyond `app`: it uses `app`, `cache`, `registerPathVar`, and `serverConfigRoot` (four of five; the inventory note's "three of the five" undercounts — `cache` is passed to the `CredentialsDB` constructor). `liq-controls`' `setup` destructures `{ app }` only; `liq-integrations-issues-github`' destructures `{ app, reporter }`. All are satisfied.

One behavior note for `core-server`'s aggregator: the composed `setup` receives the framework's argument object and forwards it unchanged to each submodule (`await submodule.setup?.(setupArgs)`), so no submodule can observe a difference from being called through the aggregator.

#### 5. Setup return value — preserved, with one documented consequence of aggregation

Preserved by construction, for the same reason as (4): the thenable-detection and the `setupData` capture are the moved lines 29–32, and the `registerHandlers(app, { npmName, handlers, reporter, setupData, cache })` push is the moved line 36. Both paths run the same code.

Re-confirmed that none of the three donors returns a `setupData` today: `liq-controls`' `setup` is synchronous and returns `undefined`; `liq-credentials`' and `liq-integrations-issues-github`'s are `async` and return `Promise<undefined>` (which is a thenable, so the `await` branch does execute and yields `undefined` — the affordance is exercised, just to no effect).

The one consequence of aggregating three submodules under one entry: `registerHandlers` threads a **single** `setupData` into every handler registered under that entry (it reaches each handler's `func({ parameters, app, cache, model, reporter, registerPathVar, setupData })` in `register-handlers.js:166`). If a submodule ever needs distinct `setupData`, the aggregator cannot express that — the correct move is to split it into its own `builtinPlugins` entry with its own identity, which the array shape already permits. The comment in `builtin-plugins.mjs` records this so it is not rediscovered.

#### 6. Bundling — confirmed safe; one real hazard, which is about `package.json`, not Rollup

Verified against `@liquid-labs/catalyst-resource-babel-and-rollup`'s `dist/rollup/rollup.config.mjs` (the config both `make/50-sdlcforge-server-js.mk` and `make/50-sdlcforge-server-exec-js.mk` invoke) and against the donors' current source:

- **Relative in-tree imports are always inlined.** `nodeExternals()` externalizes `dependencies`/`peerDependencies`/`optionalDependencies` and Node builtins; relative specifiers are not package specifiers and are never externalized. The static chain `src/lib/index.js → ./app-init → ./builtin-plugins → ../controls | ../credentials | ../integrations-issues-github` is therefore fully inlined into `dist/sdlcforge-server.js`, and the parallel chain from `src/cli/index.js` into `dist/sdlcforge-server-exec.js`.
- **`.mjs` and directory-index resolution both already work here.** `@rollup/plugin-node-resolve`'s default extension list leads with `.mjs`, and `@rollup/plugin-babel`'s default extension list includes `.mjs`. The existing `src/lib/index.js`'s `export * from './app-init'` resolving `app-init.mjs` is the in-repo proof for the first; the donors' own `./handlers` → `handlers/index.js` imports, which their own Rollup builds already bundle successfully, are the proof for the second.
- **The CJS transform never sees the absorbed source.** `@rollup/plugin-commonjs` is scoped to an `include` of `node_modules`, and `babel` to a matching `exclude`, so absorbed ESM source takes the Babel path only. Output format is `cjs` (`package.json` carries no `"type": "module"`).
- **Nothing in the donors defeats bundling.** Grepped all three donors' non-test `src/`: zero `__dirname`, zero `import.meta`, zero `require(`, and zero imports of a non-JS asset (`.yaml`/`.yml`/`.json`/`.txt`/`.md`). Nothing resolves a path relative to its own module location, so relocating the code from `node_modules/<donor>/dist/` into `core-server/dist/` cannot break an asset path. (`liq-controls`' `schema/` directory and its `*.qcontrols.yaml` handling are runtime reads of *user data* paths, not bundled assets.)
- **The dynamic-import concern does not apply to this bundle at all.** `load-plugins.js`'s `await import(\`${dir}/${main}\`)` lives in `plugable-express`, which is an external dependency of `core-server` and is never bundled by it. Moving the absorbed code from that dynamic path to a static one removes a runtime `node_modules` resolution from `core-server`'s startup rather than adding a bundling problem.
- **`dist/sdlcforge-server-exec.js` keeps working.** Its entry `src/cli/index.js` calls `startServer({ appInit, … })` with `core-server`'s own `appInit`; `findOwnHome(process.argv[1])` still resolves the installed `@sdlcforge/core-server` package root, and with `skipCorePlugins` unset (production) builtins register and the eight remaining explicit plugins are discovered from `node_modules` exactly as before.

**The one real hazard is silent inlining of an undeclared dependency.** `nodeExternals()` decides externality from `package.json`. Any bare specifier the absorbed code imports that is *not* in `core-server`'s `dependencies` will not be externalized — `resolve()` will find it in `node_modules` (where it is present transitively) and Rollup will quietly inline it. The build stays green, `dist/` grows, and the artifact breaks in a way that only shows up for a registry consumer whose transitive graph differs. `@liquid-labs/octocache` is the named, known instance: imported by `liq-integrations-issues-github` and declared by nothing. The dependency-union step in [`absorption-layout-and-merge-hazards.md`](./absorption-layout-and-merge-hazards.md#dependency-union) is the fix; the *verification* belongs in each absorb task, as a mechanical check that every bare-specifier `require(…)` surviving in `dist/sdlcforge-server.js` appears in `package.json`'s `dependencies`, plus a bundle-size comparison against the pre-absorption artifact.

### Sequencing the framework change

The dependency between the two repositories is one-directional and gives a natural task order:

1. In `plugable-express`: the `load-plugins.js` split, `loadBuiltinPlugins`, the `app.js` wiring, the jsdoc, and the tests from (2)'s strategy. `make qa` must stay green — the change is additive and no existing test passes `builtinPlugins`.
2. Version-bump and `yalc push` from `plugable-express`; in `core-server`, `rm -f bun.lock && bun install` (**not** a bare `bun install` — the documented Bun `file:` caveat), then `bun run build` and `bun run test` to confirm the framework refresh alone changed nothing.
3. Only then the `core-server` side: `builtin-plugins.mjs`, the `app-init.mjs` wiring, and the per-donor absorptions. Until at least one donor's tree has been merged in, `builtin-plugins.mjs` cannot import it — so either the file is introduced empty-but-shaped (an empty `submodules` array, yielding a zero-`handlers` entry whose `setup` is a no-op) alongside step 2's verification, or it is introduced with the first donor. The empty-shaped variant is worth doing: it proves the whole registration path end-to-end against a plugin that changes nothing, and isolates any breakage in the mechanism from breakage in the absorbed code.

Step 2's `bun.lock` regeneration also re-resolves every other dependency; run `bun run test` and the local integration pass (`bun run test:local`) between steps 2 and 3 so an unrelated regression from that refresh is attributed correctly rather than blamed on the absorption.

## Related documents

- [`docs/architecture/plugin-loading-tiers.md`](../../docs/architecture/plugin-loading-tiers.md) — the tier model this plan reshapes.
- [`plan/notes/absorbed-surface-inventory.md`](./absorbed-surface-inventory.md) — what is being absorbed.
- [`plan/notes/plugin-list-visibility.md`](./plugin-list-visibility.md) — the one consumer-visible output this mechanism choice cannot fully preserve.
- [`plan/notes/absorption-layout-and-merge-hazards.md`](./absorption-layout-and-merge-hazards.md) — where the absorbed code lands, once a mechanism exists to register it.
- [`plan/notes/parity-baseline.md`](./parity-baseline.md) — how "registered identically" is actually checked.
