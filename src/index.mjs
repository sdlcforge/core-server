// dev-core plugin entry point. plugable-express's loader (see
// docs/dev-core-consolidation-contract.md#plugin-contract) dynamic-imports this module and
// reads only `handlers` and `setup` from it -- nothing else exported here is read.
//
// Absorbing a submodule is a two-line change: add its import below, in the documented order,
// then add its handlers to the spread in `handlers` and, if it has one, its setup function to
// `submoduleSetups` in `setup` below.
//
// Expected submodules, in the order their setup must run (see the ordering note on `setup`
// below): projects, orgs, work, projects-audit (handlers only, no setup).
//
// Submodule imports are extensionless directory imports (`./orgs`, not `./orgs/index.mjs`):
// Babel rewrites `.mjs` sources to `.js` in `test-staging/` without rewriting import
// specifiers, so an explicit `.mjs` specifier resolves under Rollup but not under Jest.
import { handlers as projectsHandlers, setup as projectsSetup } from './projects'
import { handlers as orgsHandlers, setup as orgsSetup } from './orgs'
// import { handlers as workHandlers, setup as workSetup } from './work'
// import { handlers as projectsAuditHandlers } from './projects-audit'

// A fresh array built by spreading each submodule's own handlers array (e.g.
// `[...projectsHandlers, ...orgsHandlers, ...workHandlers, ...projectsAuditHandlers]`) --
// never by `push`ing into an imported array, since two submodules mutating a shared array would
// be a latent aliasing bug once they share this one package.
const handlers = [...projectsHandlers, ...orgsHandlers]

// Ordered list of submodule setup functions (e.g. `[projectsSetup, orgsSetup, workSetup]`;
// `projects-audit` has no setup). `setup` below awaits each in this fixed order because
// `projects`' setup is eager and installs `app.ext._liqProjects` synchronously before
// returning; `orgs` defers its own work onto `app.ext.setupMethods`, but that deferred work
// reads `app.ext._liqProjects` and therefore needs it to already exist by the time it runs;
// `work` only needs `app.ext.serverConfigRoot`, which is present from server initialization
// regardless of submodule order. See
// docs/dev-core-consolidation-contract.md#composite-setup-ordering.
const submoduleSetups = [projectsSetup, orgsSetup]

const setup = async(setupArgs) => {
  for (const submoduleSetup of submoduleSetups) {
    await submoduleSetup(setupArgs)
  }
}

export { handlers, setup }
