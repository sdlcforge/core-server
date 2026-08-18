# Architecture

## Purpose and scope

This document describes the structural shape of `@sdlcforge/dev-core`: what the package is in the wider system, how its submodules decompose, the single aggregation boundary they compose through, the composite-`setup` ordering contract, the runtime `app.ext` service contracts that couple submodules to each other and to code outside this package, the route namespaces each submodule owns, and the build/artifact pipeline that turns the source tree into the published bundle.

It does not cover per-endpoint parameter reference (that lives in the route tables in [`README.md`](../README.md)), the absorption *procedure* for bringing a new submodule in (that is [`docs/dev-core-consolidation-contract.md`](./dev-core-consolidation-contract.md)), or the specific edits a consumer must make to repoint from a superseded donor package (that is [`docs/consumer-migration.md`](./consumer-migration.md)).

## System overview

`@sdlcforge/dev-core` is a `plugable-express` plugin for `@sdlcforge/core-server`. It consolidates development-lifecycle capability that previously shipped as four separate `plugable-express` plugin packages — `@liquid-labs/liq-projects`, `@liquid-labs/liq-orgs`, `@liquid-labs/liq-work`, and `@liquid-labs/plugable-projects-audit` — into one package with one build, one release cycle, and one explicit statement of the runtime contracts those four packages used to share implicitly across separate repositories.

As of this writing, three of the four donors have landed: `projects`, `orgs`, and `work` are absorbed and live under `src/`. `projects-audit` has not yet been absorbed. `core-server`'s own `explicitPlugins` list has not yet been repointed from the four donor packages to `@sdlcforge/dev-core` — that repointing is a separate, later step, specified per-donor in [`docs/consumer-migration.md`](./consumer-migration.md), not performed by this package itself.

```mermaid
graph TD
    CoreServer["@sdlcforge/core-server<br/>(explicitPlugins, once repointed)"] -->|dynamic-imports dist/dev-core.js| Aggregator["src/index.mjs<br/>single plugin surface"]

    Aggregator --> Projects["src/projects/<br/>handlers + setup<br/>(landed)"]
    Aggregator --> Orgs["src/orgs/<br/>handlers + setup<br/>(landed)"]
    Aggregator --> Work["src/work/<br/>handlers + setup<br/>(landed)"]
    Aggregator -.->|not yet absorbed| ProjectsAudit["src/projects-audit/<br/>handlers only"]

    Projects -->|installs, 1st in setup order| LiqProjects["app.ext._liqProjects"]
    Orgs -->|reads/writes, 2nd in setup order| LiqOrgs["app.ext._liqOrgs"]
    Work -->|writes, 3rd in setup order| WorkDbPath["app.ext.constants.WORK_DB_PATH"]

    LiqProjects --> LiqControlsExt["liq-controls (external package)"]
    LiqOrgs --> LiqControlsExt
    LiqProjects --> LiqIntegrationsExt["liq-integrations-issues-github (external package)"]
```

<!-- For AI agents and non-visual readers: the diagram above shows core-server dynamic-importing dist/dev-core.js, which resolves to the single aggregator src/index.mjs. The aggregator composes three landed submodules (projects, orgs, work) and one not-yet-absorbed submodule (projects-audit, dashed edge). Each landed submodule's setup installs or maintains its own app.ext key, in the fixed order projects, then orgs, then work; two of those keys (app.ext._liqProjects and app.ext._liqOrgs) are also read by external packages outside this consolidation, liq-controls and liq-integrations-issues-github. -->

The remaining sections detail each part of this picture: the submodule decomposition, the aggregation boundary, the setup-ordering contract, the `app.ext` service contracts (including the external consumers the diagram only names), the route namespaces, and the build/artifact topology.

## Submodule decomposition

Each absorbed package gets exactly one top-level directory under `src/`, named for its domain, exposing `handlers` and — where the donor had one — `setup` through its own `index.mjs`. No submodule imports another; the four donors never imported each other before consolidation, and that stays true after it (verified: `src/projects/`, `src/orgs/`, and `src/work/` each import only from their own subtree and from external npm dependencies).

| Submodule | Status | Absorbed from | `index.mjs` exports |
|---|---|---|---|
| `src/projects/` | Landed | `@liquid-labs/liq-projects` | `handlers`, `setup` |
| `src/orgs/` | Landed | `@liquid-labs/liq-orgs` | `handlers`, `setup` |
| `src/work/` | Landed | `@liquid-labs/liq-work` | `handlers`, `setup` |
| `src/projects-audit/` | Not yet absorbed | `@liquid-labs/plugable-projects-audit` | — (planned: `handlers` only, no `setup`) |

`projects-audit` is planned to stay a separate top-level directory from `projects` even though both will mount under the `/projects` route namespace — folding them together would re-couple two independently-absorbed submodules for no structural benefit, per [the consolidation contract's layout convention](./dev-core-consolidation-contract.md#layout-convention).

## The aggregation boundary

`src/index.mjs` is this package's single plugin surface — the one place all submodules compose. That is a direct consequence of how `plugable-express`'s loader (`load-plugins.js`) works: it dynamic-imports exactly one module per package (`<pluginDir>/<package.json main>`) and reads only two exports from it, `handlers` and `setup` — nothing else the module exports is read. A package cannot register more than one plugin's worth of routes and setup by exporting more from other files; everything has to fold into the one module the loader actually imports.

The aggregator therefore builds one fresh, merged `handlers` array by spreading each landed submodule's own `handlers` array (never by `push`ing into an imported array, since two submodules mutating a shared array would be a latent aliasing bug once they share one package), and one composite `setup` function that awaits each landed submodule's own `setup` in a fixed order (see [The composite-setup ordering contract](#the-composite-setup-ordering-contract) below).

The plugin's identity in the server comes from the package manifest, not the module: `plugable-express`'s loader reads `npmName` from `package.json`'s `name` and the server-visible plugin `summary` from `package.json`'s `description`. One consequence follows directly: every endpoint's recorded provenance `npmName` is `@sdlcforge/dev-core`, regardless of which submodule it came from — a visible, permanent change in the server's generated API spec and `help` output relative to when each submodule shipped as its own plugin.

## The composite-setup ordering contract

`src/index.mjs`'s `setup` is `async` and awaits each landed submodule's own setup, in this fixed order: **`projects` first, then `orgs`, then `work`.** (`projects-audit`, once absorbed, will contribute no `setup` at all — handlers only.)

The ordering is load-bearing in exactly one place, not uniformly:

- **`projects` must run first.** Its setup is eager — it registers GitHub credentials via `@liquid-labs/credentials-db-plugin-github`'s `setupCredentials`, creates the developer's playground directory, and installs `app.ext._liqProjects = { playgroundMonitor, playgroundPath }` — synchronously, before returning. `orgs`' deferred `load orgs` setup method (see below) reads `app.ext._liqProjects.playgroundMonitor` once the framework runs it, so that key must already exist by then.
- **`orgs`' own `setup` call does not itself depend on `projects`.** It is synchronous, returns `undefined`, and only pushes three entries onto `app.ext.setupMethods` (`plugable-express`'s own deferred-work queue, drained by its `DependencyRunner` after every plugin's `setup` has returned) plus registers the `orgKey`/`newOrgKey` path variables. It is the *deferred* `load orgs` method — not `orgs`' `setup` call itself — that actually reads `app.ext._liqProjects`. Keeping `orgs` second is still correct, since the deferred method still needs `projects`' installation to have already happened by the time it runs; a passing composite-setup smoke test alone does not, on its own, prove this dependency, because it does not exercise the deferred `load orgs` method.
- **`work`'s third position is a fixed convention, not a dependency it satisfies.** `work`'s setup reads only `app.ext.serverConfigRoot`, which `plugable-express` itself supplies to every plugin's `setup` regardless of submodule order — nothing about `work`'s setup requires `projects` or `orgs` to have run first. `work`'s setup is synchronous and returns `undefined`, exactly like `orgs`'.

`registerPathVar` is forwarded to each landed submodule's setup unchanged. The merged set of path variables the three landed submodules register — `projectName`, `newProjectName` (from `projects`), `orgKey`, `newOrgKey` (from `orgs`), `workKey` (from `work`) — has no name collisions, which matters because a collision does not fail gracefully: `registerPathVar` **throws** `Path variable '<name>' is already registered.` on a second registration for the same name, crashing server startup. A sixth name, `parameterKey`, is registered not from any submodule's `setup` but from `orgs`' `parameters-detail.mjs` handler's `func`, at route-registration time — `plugable-express` invokes a handler's `func` once at registration specifically to give it the chance to register its own path variables, so the full merged path-variable surface is not determined by reading each submodule's `setup` function alone.

## Runtime service contracts (`app.ext`)

The submodules that live in this one package still share no import edge with each other — exactly as their donor packages shared none before consolidation. Their coupling is, and remains, entirely through runtime state hung off `app.ext`. Making that coupling *declared* rather than implicit — visible in a manifest rather than discoverable only by reading source — is explicitly the job of a planned compile-time plugin manifest, not something this consolidation attempts. **The couplings below are described as they exist today; nothing in this section should be read as endorsing implicit runtime coupling as the intended long-term shape.**

| `app.ext` key | Set by (this package) | Read by (this package) | Read by (outside this package) |
|---|---|---|---|
| `app.ext._liqProjects` (`{ playgroundMonitor, playgroundPath }`) | `src/projects/setup.mjs`, synchronously, before `setup` returns | `src/orgs/setup.mjs`'s deferred `load orgs` method; 24 call sites across 12 modules under `src/work/`, all unconditional and unguarded | `liq-controls` (`src/lib/integrations/get-question-controls.mjs`); `liq-integrations-issues-github` (`src/create-or-update-pull-request.mjs`) |
| `app.ext._liqOrgs` (`{ orgs, orgSetupMethods }`) | `src/orgs/setup.mjs`'s deferred `load orgs`/`prepare org dependencies` methods | — | `liq-controls` (`src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`, `src/lib/handlers/orgs/controls/_lib/list-lib.mjs`) |
| `app.ext.constants.WORK_DB_PATH` (`<serverConfigRoot>/work/work-db.yaml`) | `src/work/setup.mjs`, from `app.ext.serverConfigRoot` | `src/work/handlers/_lib/work-db.mjs` (via `WorkDB`) | — |
| `app.ext.setupMethods` | `plugable-express` itself (the deferred-work queue) | `src/orgs/setup.mjs` pushes three entries onto it | `liq-policy` (`src/liq-policy/setup.mjs`) pushes entries `orgs`' deferred `process org setup` method later drains |

One further coupling has no `app.ext` key at all, which is exactly why it is easy to miss: `src/projects/setup.mjs` calls `setupCredentials({ credentialsDB })` from `@liquid-labs/credentials-db-plugin-github`, registering a `GITHUB_API` credential type on the shared `credentialsDB`. `liq-integrations-issues-github` (`src/create-or-update-pull-request.mjs`) later calls `credentialsDB.getToken('GITHUB_API')`, an undeclared, load-order-dependent contract that only works because `projects` runs first in the composite `setup` and registers that credential type before anything else's setup runs. Several handlers inside this package itself (`src/projects/handlers/_lib/{archive,rename,destroy}-lib.mjs`, `src/projects/handlers/releases/_lib/do-github-release.mjs`, and multiple `src/work/` handlers) also call `credDB.getToken('GITHUB_API')`, so the same undeclared registration backs both internal and external readers.

`app.ext._liqProjects`, `app.ext._liqOrgs`, and `app.ext.constants.WORK_DB_PATH` are frozen: no participant in this consolidation renames them, precisely because code outside this consolidation's own repositories reads them directly, as the table above shows. Renaming any of them would turn a self-contained internal restructuring into a breaking change for packages this consolidation does not otherwise touch — full detail in [the consolidation contract's `app.ext` freeze](./dev-core-consolidation-contract.md#appext-contract-freeze).

## Route namespaces

Each landed submodule declares its own routes via a `path` (or `paths`) export on each handler module — a handler's route is never derived from its position in the source tree, so the [layout convention](./dev-core-consolidation-contract.md#layout-convention)'s relocation of a donor's files into `src/<submodule>/` never changed the HTTP surface it exposes.

| Route namespace | Owning submodule(s) | Registered in |
|---|---|---|
| `/projects` | `projects` (landed); `projects-audit` (once absorbed) will share this namespace | `src/projects/handlers/index.js`, `src/projects/handlers/releases/index.js` |
| `/orgs` | `orgs` (landed) | `src/orgs/handlers/index.js` |
| `/work` | `work` (landed) | `src/work/handlers/index.js`, `src/work/handlers/issues/index.js`, `src/work/handlers/projects/index.js` |

`projects` and `projects-audit` sharing `/projects` is a deliberate outcome of the layout convention: they stay separate top-level `src/` directories even while sharing a route prefix, so folding them together later is optional cosmetic follow-up, never a consolidation requirement. The exact per-endpoint method/path tables for `projects`, `orgs`, and `work` — including the 19 + 5 + 30 = 54 endpoints currently registered — live in [`README.md`](../README.md#routes) rather than being duplicated here.

## Build and artifact topology

```mermaid
graph LR
    Source["src/index.mjs<br/>(+ submodule sources)"] -->|Rollup| Dist["dist/dev-core.js<br/>(externals-only bundle)"]
    Source -->|Babel| TestStaging["test-staging/"]
    TestStaging -->|Jest| TestResults["make test"]
```

<!-- For AI agents and non-visual readers: the diagram above shows one source tree feeding two independent build outputs — Rollup bundles src/index.mjs (and everything it imports) into dist/dev-core.js as an externals-only bundle (npm dependencies are not inlined), while Babel separately transpiles the same sources into test-staging/, which Jest runs against for make test. -->

`dev-core` builds through the same Make-based toolchain its submodules already used before absorption: Babel transpiles into `test-staging/` (Jest runs against that transpiled output, not the raw `.mjs` sources), Rollup bundles `src/index.mjs` into `dist/dev-core.js` as an externals-only build (this package's own npm dependencies are not inlined into the bundle), and ESLint lints. This is deliberately not Bun and not a toolchain redesign — full rationale in [the consolidation contract's toolchain section](./dev-core-consolidation-contract.md#toolchain).

One toolchain detail is load-bearing for how a submodule is wired into the aggregator: submodule imports in `src/index.mjs` must be extensionless directory imports (`from './orgs'`, never `from './orgs/index.mjs'`). Rollup resolves either form, but Babel emits `test-staging/<submodule>/index.js` from an `.mjs` source without rewriting import specifiers, so an explicit `.mjs` specifier builds cleanly under Rollup and then fails module resolution under Jest.

```bash
make build   # Babel + Rollup -> dist/dev-core.js
make test    # Jest, via a Babel-transpiled test-staging/ build
make lint    # ESLint
make qa      # test + lint
```

## Pointers

- [`README.md`](../README.md) — the consumer-facing overview, the per-submodule route tables, and the composition/loading narrative this document's structural account complements.
- [`docs/dev-core-consolidation-contract.md`](./dev-core-consolidation-contract.md) — the standing reference for the layout convention, submodule interface, root-file ownership, absorption recipe, and the `app.ext` freeze this document assumes throughout.
- [`docs/consumer-migration.md`](./consumer-migration.md) — the per-donor specification of the exact edits `@sdlcforge/core-server` must make to repoint from each absorbed donor package to this one, including why an unsynchronized swap crashes the server rather than silently shadowing routes.
