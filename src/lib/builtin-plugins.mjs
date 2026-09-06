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
//    and must never be folded together with `export * from '../controls'`. Six of the seven
//    absorbed submodules export a symbol named `setup` and most export `handlers`, so a star
//    re-export across them is an ambiguous-export collision. Namespace imports keep each
//    submodule's own `handlers`/`setup` individually addressable. Do not "simplify" this. The
//    seventh, `projects-audit`, exports no `setup` at all -- it is pure handlers -- which is why
//    the `setup?.()` optional call below is load-bearing rather than defensive: drop the `?.` and
//    the composite `setup` throws on the last submodule.
// 2. `submodules` order is load order. It fixes the position of the absorbed routes in
//    `app.ext.handlers`, and therefore their position in the API spec and its snapshots. The
//    array is in dependency (DAG) order, NOT append order: a new component goes wherever its
//    dependencies put it, not at the end, and `package.json`'s
//    `plugable.host.builtins[0].components` array moves with it in the same change. (`controls`
//    sits fourth rather than first for exactly this reason -- it requires
//    `appExt:_liqOrgs.orgs @ setup`, which `orgs` provides at the same phase, and same-phase
//    satisfaction is decided by declared source order.) `package.json` is static data with no
//    computation, so that agreement cannot be structurally derived from this source.
//
//    The enforcement mechanism is `componentNames` below, asserted element-for-element against
//    `package.json`'s `components.map(({ component }) => component)` in
//    `src/lib/test/host-declaration.test.js`. It is specifically NOT `verifyHostDeclaration()`,
//    which an earlier version of this comment wrongly named: that function's order check compares
//    the `npmName` sequence across `builtinPlugins` ENTRIES (this host has exactly one, so the
//    check is trivially satisfied and can never fail here), and its component check is a *set*
//    comparison against an entry's own inline `manifest` key, which `builtinPluginsFor` does not
//    supply -- so it is skipped entirely.
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
// would build cleanly and then fail module resolution in the test path. That applies equally to
// the four `index.mjs`-carrying directories below: `'../projects'`, not `'../projects/index.mjs'`.
import * as controls from '../controls'
import * as credentials from '../credentials'
import * as issuesGitHub from '../integrations-issues-github'
import * as orgs from '../orgs'
import * as projects from '../projects'
import * as projectsAudit from '../projects-audit'
import * as work from '../work'

// Absorbed from `@liquid-labs/liq-controls` (phase-05 task 001),
// `@liquid-labs/liq-credentials` (phase-05 task 002),
// `@liquid-labs/liq-integrations-issues-github` (phase-05 task 003), and -- `projects`, `orgs`,
// `work`, `projects-audit` -- from `@sdlcforge/dev-core`. Dependency (DAG) order, per fact 2; the
// positions that are load-bearing rather than conventional:
//
// - `credentials` before `projects`: `projects`' `setup()` eagerly calls
//   `setupCredentials({ credentialsDB : app.ext.credentialsDB })`, and `credentials`' `setup()` is
//   what assigns `app.ext.credentialsDB`. This array is now the only thing preserving that; before
//   the absorption the two lived in different plugin tiers.
// - `projects` before `orgs`: `projects`' setup installs `app.ext._liqProjects` eagerly, and the
//   `load orgs` setup method `orgs` defers onto `app.ext.setupMethods` reads it.
// - `orgs` before `controls`: `controls` requires `appExt:_liqOrgs.orgs @ setup`; same-phase
//   satisfaction is decided by declared source order, so the reverse reads
//   `violated-by-source-order` to the compile-time graph validator.
//
// `issuesGitHub` contributes no `handlers` at all -- its entire surface is the two integration
// providers its `setup` registers -- so the `handlers` aggregation below relies on the
// `handlers: submoduleHandlers = []` default for it. That is also why no route snapshot can
// witness this submodule's presence; `full-tier-baseline.test.js`' `register()` capture is what
// does. `projectsAudit` is the mirror image: handlers only, no `setup` (fact 1).
const submodules = [credentials, projects, orgs, controls, issuesGitHub, work, projectsAudit]

// The declared manifest component names, index-aligned with `submodules`. Exported because the
// namespace imports above carry no name of their own to introspect, so this list cannot be
// derived -- and `src/lib/test/host-declaration.test.js` needs it to assert, element for element,
// that the runtime order above and `package.json`'s declared `components` order have not drifted
// apart (fact 2). Note `'issues-github'` deliberately differs from its directory name,
// `src/integrations-issues-github/`: these are declared component names, not directory names.
const componentNames = [
  'credentials',
  'projects',
  'orgs',
  'controls',
  'issues-github',
  'work',
  'projects-audit'
]

const handlers = submodules.flatMap(({ handlers: submoduleHandlers = [] }) => submoduleHandlers)

const setup = async(setupArgs) => {
  // Sequential (`for...of` with `await`), never `Promise.all`: this mirrors `loadPlugins`' own
  // one-plugin-at-a-time await, and keeps a submodule that writes to `app.ext` visible to a later
  // one. The ordering constraints listed above are carried by position in `submodules` and by
  // nothing else. `setupArgs` -- the framework's own five-member
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
const summary =
  'Built-in SDLC credentials, projects, orgs, controls, GitHub issues integration, work, and '
  + 'project audit components.'

// One entry for all submodules, carrying the host package's own identity: seven entries sharing
// one `npmName` would render seven identical rows from `GET /server/plugins/list` and seven
// identical options from the `serverPluginName` path variable's `optionsFetcher`. The framework
// stays dumb about this; the aggregation policy lives here.
const builtinPluginsFor = ({ npmName, version }) => ([{ npmName, version, summary, module : { handlers, setup } }])

export { builtinPluginsFor, componentNames, handlers, setup, submodules, summary }
