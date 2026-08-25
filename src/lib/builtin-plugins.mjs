// `core-server`'s side of `@liquid-labs/plugable-express`'s `builtinPlugins` affordance: it
// presents this package's own in-tree, absorbed submodules to the framework as a single
// already-imported plugin module. `appInit` registers it through exactly the same code path, and
// at exactly the same point in its sequence, that an npm-discovered core plugin occupies -- so
// absorbed handlers land in `app.ext.pendingHandlers` *before* the error middleware is installed
// and before the API spec is written. That ordering is the entire reason this mechanism exists
// rather than post-`appInit()` registration.
//
// The `submodules` array is filled in as each donor plugin is absorbed. Nothing below changes
// shape when that happens.
//
// Three facts a future reader will otherwise rediscover the hard way:
//
// 1. Submodules must arrive as NAMESPACE imports -- `import * as controls from '../controls'` --
//    and must never be folded together with `export * from '../controls'`. All three absorbed
//    submodules export a symbol named `setup`, and two of them export `handlers`, so a star
//    re-export across them is an ambiguous-export collision. Namespace imports keep each
//    submodule's own `handlers`/`setup` individually addressable. Do not "simplify" this.
// 2. `submodules` order is load order. It fixes the position of the absorbed routes in
//    `app.ext.handlers`, and therefore their position in the API spec and its snapshots. Keep it
//    stable, and add to the end rather than reordering.
// 3. `plugable-express` threads a SINGLE `setupData` into every handler registered under one
//    `builtinPlugins` entry (`registerHandlers` passes it to each handler's
//    `func({ ..., setupData })`). A submodule that ever needs its own distinct `setupData` -- or
//    its own plugin identity in `app.ext.handlerPlugins` -- must become its own `builtinPlugins`
//    entry rather than being merged into this one. The array shape of `builtinPlugins` is what
//    preserves that escape hatch; `builtinPluginsFor` returning a single-element array is a
//    deliberate policy choice (plan/notes/plugin-list-visibility.md), not a structural limit.

// Namespace import, extensionless directory specifier -- both deliberate, per facts 1 and 2
// above. `'../controls'` resolves to `src/controls/index.js` under Rollup and, after Babel emits
// `test-staging/controls/index.js`, under Jest as well; an explicit `.mjs`/`/index.js` specifier
// would build cleanly and then fail module resolution in the test path.
import * as controls from '../controls'

// Absorbed from `@liquid-labs/liq-controls` (phase-05 task 001). Append-only: see fact 2.
const submodules = [controls]

const handlers = submodules.flatMap(({ handlers: submoduleHandlers = [] }) => submoduleHandlers)

const setup = async(setupArgs) => {
  // Sequential (`for...of` with `await`), never `Promise.all`: this mirrors `loadPlugins`' own
  // one-plugin-at-a-time await, and keeps a submodule that writes to `app.ext` visible to a later
  // one. `setupArgs` -- the framework's own five-member
  // `{ app, cache, reporter, registerPathVar, serverConfigRoot }` object -- is forwarded
  // unchanged, so no submodule can observe any difference from being called through this
  // aggregator rather than directly by the framework.
  for (const submodule of submodules) {
    await submodule.setup?.(setupArgs)
  }
  // Returns undefined. No submodule produces `setupData` today. If one ever does, merge the
  // results here and return the merged object -- subject to fact 3 above.
}

// Cannot come from `package.json`, whose `description` is the empty string. Deliberately *not*
// imported from `src/lib/index.js`'s near-identical `summary` constant: that would create an
// `index.js -> app-init.mjs -> builtin-plugins.mjs -> index.js` cycle. Consolidating the two is a
// follow-up, not part of this mechanism.
const summary = 'Built-in SDLC controls, credentials, and GitHub issues integration.'

// One entry for all submodules, carrying the host package's own identity: three entries sharing
// one `npmName` would render three identical rows from `GET /server/plugins/list` and three
// identical options from the `serverPluginName` path variable's `optionsFetcher`. The framework
// stays dumb about this; the aggregation policy lives here.
const builtinPluginsFor = ({ npmName, version }) => ([{ npmName, version, summary, module : { handlers, setup } }])

export { builtinPluginsFor, handlers, setup, summary }
