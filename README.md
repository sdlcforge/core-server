# dev-core

`@sdlcforge/dev-core` is the consolidated development-lifecycle plugin for `@sdlcforge/core-server`. It brings together project lifecycle management, work orchestration, organization settings, and project auditing into a single `plugable-express` plugin, in place of four packages that previously shipped these capabilities separately.

## Composition

`dev-core`'s internal shape is one top-level directory under `src/` per submodule:

- **`projects`** — *landed*, absorbed from `@liquid-labs/liq-projects`. Project lifecycle: creation, setup, detail, rename, update, documentation, close, archive, destroy, and release publishing. In this system a "project" is the union of three artifacts kept in sync: an NPM package (`package.json`), a local clone in the developer's playground directory (tracked via `@liquid-labs/playground-monitor`), and a GitHub repository — this submodule owns creating, inspecting, updating, and retiring that triad.
- **`work`** — *not yet absorbed.* Work-item orchestration on top of the project lifecycle.
- **`orgs`** — *landed*, absorbed from `@liquid-labs/liq-orgs`. Organization-level settings and configuration. **An "org" here is not a free-standing entity — it is a classification of a project.** At setup time, `orgs` scans the projects `projects` has already discovered (via `app.ext._liqProjects.playgroundMonitor.getProjectsData()`) and promotes any whose scanned `package.json` carries `liq.packageType === 'org'` into the org registry. There is no separate org-creation flow that isn't also a project; an org's settings (common name, legal name, and arbitrary dotted-key-path parameters) live in `data/org/settings.yaml` within that same project's directory.
- **`projects-audit`** — *not yet absorbed.* Auditing checks over existing projects.

Each submodule exposes only `handlers` and, where applicable, `setup` from its own `src/<submodule>/index.mjs` — no other file under a submodule directory is part of its public surface. The layout convention, the runtime contracts each submodule must preserve, and the procedure for bringing a submodule's source in are recorded in [`docs/dev-core-consolidation-contract.md`](./docs/dev-core-consolidation-contract.md).

### A note on package naming

`@liquid-labs/liq-projects` — the package the `projects` submodule was absorbed from, now superseded by this one — is **not** the same package as `@liquid-labs/liq-projects-lib`. They are different packages with different purposes, and the similar names have already caused confusion for at least one contributor investigating this codebase; the confusion outlives the rename, so double-check which package a dependency or import actually refers to:

- `@liquid-labs/liq-projects` was a `plugable-express` plugin exposing the `/projects/*` HTTP routes described below. Those routes are now served by `@sdlcforge/dev-core`.
- `@liquid-labs/liq-projects-lib` is a separate, lower-level library of framework-agnostic project utilities (e.g. milestone determination, `package.json` updates), consumed by other packages. It shares no code or dependency edge with the absorbed `projects` submodule, is **not** part of this consolidation, and stays where it is.

## Routes

### `projects` submodule

All routes below are mounted under `/projects`, registered in `src/projects/handlers/index.js` and, for releases, `src/projects/handlers/releases/index.js`. Most operations exist in two variants: an explicit form naming `:projectName`, and an "implied" form that infers the project from the caller's current working directory. Each handler declares its own route via a `path` export, so a handler's position in the source tree never determines the route it serves.

| Operation | Method | Explicit path | Implied path | Purpose |
|---|---|---|---|---|
| Create | POST | `/projects/create` | — | Initializes a local git repo, sets `package.json` fields, creates and pushes a GitHub repo, and moves the result into the playground. |
| Setup | POST | `/projects/:projectName/setup` | `/projects/setup` | Applies standard project configuration: origin/main branch naming, issue labels, and milestones. |
| Detail | GET | `/projects/:projectName/detail` | `/projects/detail` | Reports project inspection info. |
| Rename | POST | `/projects/:projectName/rename` | `/projects/rename` | Renames the package and moves the playground clone. |
| Update | PUT | `/projects/:projectName/update` | `/projects/update` | Updates `package.json`-level project data. |
| Document | PUT | `/projects/:projectName/document` | `/projects/document` | Generates/manages project documentation — a capability this submodule exposes *for other projects*, not for `dev-core`'s own docs. |
| Close | DELETE | `/projects/:projectName/close` | `/projects/close` | Closes out a project. |
| Archive | PUT | `/projects/:projectName/archive` | `/projects/archive` | Verifies a clean, up-to-date git state, then archives the GitHub repository. |
| Destroy | DELETE | `/projects/:projectName/destroy` | `/projects/destroy` | Deletes the GitHub repository and the local playground copy. |
| Publish a release | POST | `/projects/:projectName/releases/publish` | `/projects/releases/publish` | Runs `npm publish` and creates a matching GitHub release. |

That is 19 registered endpoints — the same set, at the same paths, that `@liquid-labs/liq-projects` served before the absorption.

### `orgs` submodule

All routes below are mounted under `/orgs`, registered in `src/orgs/handlers/index.js`. Each handler declares its own route via a `path` export, so a handler's position in the source tree never determines the route it serves.

| Operation | Method | Path | Purpose |
|---|---|---|---|
| Create | POST | `/orgs/create/:newOrgKey` | Creates a new organization's local data directory. |
| List | GET | `/orgs` (and `/orgs/list`) | Lists known organizations. |
| Parameter detail | GET | `/orgs/:orgKey/parameters/:parameterKey/detail` | Reports a single org setting's current value. |
| Parameter list | GET | `/orgs/:orgKey/parameters` (and `/orgs/:orgKey/parameters/list`) | Lists an org's settings. |
| Parameter set | PUT | `/orgs/:orgKey/parameters/:parameterKey/set` | Updates a single org setting. |

That is 5 registered endpoints — the same set, at the same paths, that `@liquid-labs/liq-orgs` served before the absorption. **All 5 are pre-existing, non-functional defects, migrated as-is (see [Known defects](#known-defects-orgs-submodule) below) rather than fixed as part of the consolidation.**

#### Known defects (`orgs` submodule)

Every endpoint `orgs` contributes is currently broken at runtime, inherited unchanged from `@liquid-labs/liq-orgs`:

- **`list`, `parameters-detail`, `parameters-list`, `parameters-set`** all throw `TypeError: Cannot read properties of undefined (reading 'orgs')` on their first request. Each reads a `model` argument directly (`Object.values(model.orgs)`) or via `getOrgFromKey({ model, ... })` from `@liquid-labs/liq-handlers-lib` (`model.orgs[orgKey]`), but `plugable-express`'s loader never passes a `model` argument to plugin handlers — only `{ npmName, handlers, reporter, setupData, cache }` — so `model` is always `undefined`. The org registry these handlers are trying to reach actually lives at `app.ext._liqOrgs.orgs` (see [The `app.ext._liqOrgs` contract](#the-appext_liqorgs-contract) below), which `liq-controls` reads correctly today; these four handlers were simply never updated to look there.
- **`create`** never sends a response: its handler creates the org's local data directory (`fs.mkdir`) and then falls off the end of the function at a bare `// TODO`, so a request hangs until the client times out.

Each of the 5 affected handler source files carries an inline comment identifying its specific failure mode, added during this absorption (`src/orgs/handlers/{list,parameters-detail,parameters-list,parameters-set,create}.mjs`). Fixing them is tracked as `sdlcforge/dev-core` `plan/followups.yaml` id `jY7C` — not attempted here, since a real fix also requires changing `getOrgFromKey`'s signature in `@liquid-labs/liq-handlers-lib`, a package outside this consolidation's scope, and this consolidation does not change behavior beyond what collapsing four packages into one unavoidably requires.

#### The `app.ext._liqOrgs` contract

`orgs`' `setup` installs and maintains `app.ext._liqOrgs`, one of the frozen `app.ext` keys per [the contract's `app.ext` freeze](./docs/dev-core-consolidation-contract.md#appext-contract-freeze):

- **`app.ext._liqOrgs.orgs`** — a `key` → `Organization` map, the org registry. **Written** by `orgs`' own deferred `load orgs` setup method; **read** by `liq-controls` in three modules (`src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`, and `src/lib/handlers/orgs/controls/_lib/list-lib.mjs`).
- **`app.ext._liqOrgs.orgSetupMethods`** — an array of per-org setup callbacks. **Written** by `liq-policy` (`src/liq-policy/setup.mjs`), which pushes an entry per policy it wants applied to every loaded org; **read and run** by `orgs`' own deferred `process org setup` setup method.

`orgs`' `setup` function itself is synchronous and pushes three entries onto `app.ext.setupMethods` — plugable-express's own deferred-work queue, drained by its `DependencyRunner` after every plugin's `setup` has returned — rather than doing any of this work inline:

1. **`prepare org dependencies`** (`deps: ['!']`, runs first of all deferred setup methods) — assigns `app.ext._liqOrgs = { orgSetupMethods: [] }`.
2. **`load orgs`** (no `deps`) — awaits `app.ext._liqProjects.playgroundMonitor.getProjectsData()` and populates `app.ext._liqOrgs.orgs` from every scanned project whose `package.json` carries `liq.packageType === 'org'`.
3. **`process org setup`** (`deps: ['*']`, runs last of all deferred setup methods) — runs each `app.ext._liqOrgs.orgSetupMethods` entry once per loaded org, via a nested `DependencyRunner`.

The `'!'`/`'*'` markers are load-bearing `DependencyRunner` run-first/run-last semantics: `load orgs` depends on `prepare org dependencies` having already created the object it writes into, and `process org setup` depends on every other plugin's deferred setup work (including `liq-policy`'s own, which populates `orgSetupMethods`) having already run. `orgs`' composite-`setup` position (second, after `projects`) is unrelated to this deferred chain — `orgs`' own `setup` call touches only `app.ext.setupMethods` and `registerPathVar`, and is safe to run at any point after `app.ext.setupMethods` exists; it is `load orgs`, running much later via the `DependencyRunner`, that actually depends on `app.ext._liqProjects` already being populated.

Two other things worth knowing about the path-variable surface this submodule contributes:

- `orgs`' `setup` registers **`orgKey`** and **`newOrgKey`** directly (both validated against `(?:@|%40)[a-z][a-zA-Z0-9-]*`, `orgKey`'s `optionsFetcher` enumerating `app.ext._liqOrgs.orgs`).
- **`parameterKey`** is registered from `src/orgs/handlers/parameters-detail.mjs`'s handler `func` instead — `plugable-express` invokes a handler's `func` at route-registration time specifically to give it the chance to register its own path variables, so the full merged path-variable surface across every submodule is not determined by reading each submodule's `setup` function alone. `parameters-set.mjs` carries the identical registration commented out, because registering the same path-variable name twice throws (`plugable-express`'s `registerPathVar` rejects a duplicate registration outright).

## How it loads

`dev-core` is loaded by `@sdlcforge/core-server` as an explicit `plugable-express` plugin: the server dynamic-imports this package's `main` entry (`dist/dev-core.js`, built from `src/index.mjs`) and reads exactly two exports from it — a merged `handlers` array and a composite, asynchronous `setup` function. No other export is read; the plugin's own identity comes from `package.json` (`name` supplies the server-visible `npmName`, `description` the plugin summary), not from the module.

Each handler module exports `path`, `method`, `parameters`, `help`, and `func`, following `plugable-express`'s route-registration convention. The composite `setup` awaits each landed submodule's own setup in a fixed order; `projects`' setup runs first because it is the one that wires GitHub credentials, creates the playground directory, and installs `app.ext._liqProjects = { playgroundMonitor, playgroundPath }` — state that later submodules' setups depend on — as well as registering the `projectName`/`newProjectName` path resolvers used for path-parameter validation. `orgs`' setup runs second, after `projects`: its own `setup` call is synchronous and does not itself touch `app.ext._liqProjects`, but the deferred work it schedules onto `app.ext.setupMethods` does (see [The `app.ext._liqOrgs` contract](#the-appext_liqorgs-contract) above), so keeping `orgs` after `projects` in the composite order is correct even though it is not the strict dependency a passing composite-setup smoke test alone would suggest.

One consequence of the consolidation is visible to consumers: every endpoint's recorded provenance `npmName` is now `@sdlcforge/dev-core` rather than the name of the package it was absorbed from. This shows up in the server's generated API spec and `help` output. The `app.ext` key names themselves are unchanged and stay unchanged, per [the contract's `app.ext` freeze](./docs/dev-core-consolidation-contract.md#appext-contract-freeze).

## Build and test

`dev-core` builds and tests through the same Make-based toolchain its constituent submodules already use:

```bash
make build   # Babel + Rollup -> dist/dev-core.js
make test    # Jest, via a Babel-transpiled test-staging/ build
make lint    # ESLint
make qa      # test + lint
```

`src/projects/handlers/_lib/test/project-lifecycle.test.mjs` is a live integration test rather than a unit test: it reads real credentials and creates, renames, archives, and destroys **real GitHub repositories**. Scope Jest to the fast suites with `make test TEST=<pattern>` when that is not what you want.

## Additional documentation

- [`docs/dev-core-consolidation-contract.md`](./docs/dev-core-consolidation-contract.md) — the durable reference for this package's layout convention, submodule interface, root-file ownership, absorption recipe, and the runtime contracts it must preserve.
- [`docs/consumer-migration.md`](./docs/consumer-migration.md) — the per-donor specification of the exact edits `@sdlcforge/core-server` must make to repoint from each absorbed package to `@sdlcforge/dev-core`.

## License

UNLICENSED — see [`package.json`](./package.json).
