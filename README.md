# dev-core

`@sdlcforge/dev-core` is the consolidated development-lifecycle plugin for `@sdlcforge/core-server`. It brings together project lifecycle management, work orchestration, organization settings, and project auditing into a single `plugable-express` plugin, in place of four packages that previously shipped these capabilities separately.

## Composition

`dev-core`'s internal shape is one top-level directory under `src/` per submodule:

- **`projects`** — *landed*, absorbed from `@liquid-labs/liq-projects`. Project lifecycle: creation, setup, detail, rename, update, documentation, close, archive, destroy, and release publishing. In this system a "project" is the union of three artifacts kept in sync: an NPM package (`package.json`), a local clone in the developer's playground directory (tracked via `@liquid-labs/playground-monitor`), and a GitHub repository — this submodule owns creating, inspecting, updating, and retiring that triad.
- **`work`** — *landed*, absorbed from `@liquid-labs/liq-work`. Work orchestration on top of the project lifecycle. A **unit of work** is a cross-repo, git-branch-scoped bundle of effort that ties GitHub issues and projects together through a lifecycle from creation to submission and merge. This submodule orchestrates issues and projects rather than defining either: it owns the unit-of-work record and its lifecycle operations, and reaches into the `projects` submodule's runtime state for everything about a project itself.
- **`orgs`** — *landed*, absorbed from `@liquid-labs/liq-orgs`. Organization-level settings and configuration. **An "org" here is not a free-standing entity — it is a classification of a project.** At setup time, `orgs` scans the projects `projects` has already discovered (via `app.ext._liqProjects.playgroundMonitor.getProjectsData()`) and promotes any whose scanned `package.json` carries `liq.packageType === 'org'` into the org registry. There is no separate org-creation flow that isn't also a project; an org's settings (common name, legal name, and arbitrary dotted-key-path parameters) live in `data/org/settings.yaml` within that same project's directory.
- **`projects-audit`** — *not yet absorbed.* Auditing checks over existing projects.

Each submodule exposes only `handlers` and, where applicable, `setup` from its own `src/<submodule>/index.mjs` — no other file under a submodule directory is part of its public surface. The layout convention, the runtime contracts each submodule must preserve, and the procedure for bringing a submodule's source in are recorded in [`docs/dev-core-consolidation-contract.md`](./docs/dev-core-consolidation-contract.md).

### A note on package naming

`@liquid-labs/liq-projects` — the package the `projects` submodule was absorbed from, now superseded by this one — is **not** the same package as `@liquid-labs/liq-projects-lib`. They are different packages with different purposes, and the similar names have already caused confusion for at least one contributor investigating this codebase; the confusion outlives the rename, so double-check which package a dependency or import actually refers to:

- `@liquid-labs/liq-projects` was a `plugable-express` plugin exposing the `/projects/*` HTTP routes described below. Those routes are now served by `@sdlcforge/dev-core`.
- `@liquid-labs/liq-projects-lib` is a separate, lower-level library of framework-agnostic project utilities (e.g. milestone determination, `package.json` updates), consumed by other packages. It shares no code or dependency edge with the absorbed `projects` submodule, is **not** part of this consolidation, and stays where it is. `dev-core` declares no dependency on it: the one function the absorbed `work` submodule used from it, `crossLinkDevProjects`, was inlined (with its test) before that absorption and now lives at `src/work/handlers/_lib/cross-link-dev-projects.mjs`.

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

### `work` submodule

All routes below are mounted under `/work`, registered in `src/work/handlers/index.js` and, for the two nested collections, `src/work/handlers/issues/index.js` and `src/work/handlers/projects/index.js`. As with `projects`, most operations exist in two variants: an **explicit** form naming `:workKey`, and an **implied** form that operates on whatever unit of work is current for the caller. Every handler declares a singular `path` (none uses `paths`).

| Operation | Method | Explicit path | Implied path | Purpose |
|---|---|---|---|---|
| Start | POST | `/work/start` (single form) | — | Creates a unit of work: assigns the `workBranch`, attaches the primary issue and projects, forks/branches each attached project, sets up the `workspace` git remote, and pushes. |
| Resume | PUT | `/work/:workKey/resume` | — | Switches every attached project back onto the work branch and re-installs the package. All-or-nothing: it fails without changing anything unless every attached project is clean and sitting on either its main branch or the work branch. |
| Pause | PUT | `/work/:workKey/pause` | `/work/pause` | The inverse of `resume` — verifies each attached project on the work branch is clean, then switches it back to its main branch. |
| Status | PUT | `/work/:workKey/status` | `/work/status` | Reports on the state of the unit of work. |
| Build | PUT | `/work/:workKey/build` | `/work/build` | Runs the build for each attached project. |
| Clean | PUT | `/work/:workKey/clean` | `/work/clean` | Cleans up the work branches and the `work-db.yaml` record for work that is finished. |
| QA | PUT | `/work/:workKey/qa` | `/work/qa` | Runs QA for each attached project and collects the reports. |
| Save | PUT | `/work/:workKey/save` | `/work/save` | Commits and pushes work-branch changes across the attached projects. |
| Submit | POST | `/work/:workKey/submit` | `/work/submit` | Submits the changes for review and merging — opening/updating the pull requests, optionally gathering submitter attestations first. |
| Close | PUT | `/work/:workKey/close` | `/work/close` | Closes the unit of work: releases its attached issues and deletes the work branches. |

Two nested sub-resource collections manage what is attached to a unit of work, each operation carrying the same explicit/implied pairing:

| Collection | Operation | Method | Explicit path | Implied path |
|---|---|---|---|---|
| `issues` | Add | PUT | `/work/:workKey/issues/add` | `/work/issues/add` |
| `issues` | List | GET | `/work/:workKey/issues/list` | `/work/issues/list` |
| `issues` | Remove | DELETE | `/work/:workKey/issues/remove` | `/work/issues/remove` |
| `projects` | Add | PUT | `/work/:workKey/projects/add` | `/work/projects/add` |
| `projects` | List | GET | `/work/:workKey/projects/list` | `/work/projects/list` |
| `projects` | Remove | DELETE | `/work/:workKey/projects/remove` | `/work/projects/remove` |

`start` and `resume` are the two operations without a paired variant: `start` has a single unparameterized form, since there is no `workKey` until it returns one, and `resume` has only the explicit form, since there is no current unit of work to imply. That is 1 + 1 + 8×2 + 6×2 = **30 registered endpoints** — the same set, at the same paths, that `@liquid-labs/liq-work` served before the absorption.

#### The unit-of-work record and `WORK_DB_PATH`

A unit of work is keyed by `workKey`, which **is** its `workBranch` (derived from the primary issue's ID). Every unit of work is persisted by `WorkDB` (`src/work/handlers/_lib/work-db.mjs`) into a single YAML file, and the location of that file is published on the frozen `app.ext` surface:

> **`app.ext.constants.WORK_DB_PATH`** = `<app.ext.serverConfigRoot>/work/work-db.yaml`

The exact key path — `app.ext.constants.WORK_DB_PATH`, not a nearer or flatter spelling — is frozen by [the contract's `app.ext` freeze](./docs/dev-core-consolidation-contract.md#appext-contract-freeze) and is set by `work`'s `setup` (`src/work/setup.mjs`). It is the only thing `work`'s setup writes.

Each record in that file carries:

| Field | Meaning |
|---|---|
| `description` | Human-readable summary; auto-derived from the primary issue's title when not supplied. |
| `initiator` | The author who started the work. |
| `issues` | The attached GitHub issues, as `{ id, summary }`. |
| `projects` | The attached repos, as `{ name, private }`. |
| `started` / `startedEpoch` | When the unit of work was created. |
| `workBranch` | The git branch name shared across every attached project — identical to the record's `workKey`. |

Creating a unit of work has real side effects well beyond bookkeeping: it forks and branches the attached projects, sets up a `workspace` git remote, and pushes/pulls branches as needed.

#### The `workKey` path variable

`work`'s `setup` registers exactly one path variable, `workKey`:

- **`validationRe`**: `work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+` — a `work-`-prefixed org/project/issue-number triple, accepting either a literal `/` or its percent-encoding as the separator.
- **`optionsFetcher`**: a **lazy closure**. It constructs a `WorkDB` and returns `getWorkKeys()` *when the framework invokes it*, not when `setup` runs — so it reads neither `WORK_DB_PATH` nor the database at setup time. Nothing about `work`'s setup therefore requires any other submodule's setup to have run first.

`workKey` collides with no other path variable across the merged plugin; the full merged set is `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `workKey` (all from `setup`) plus `parameterKey` (registered by an `orgs` handler at route-registration time).

#### The `work` → `projects` coupling, and the `app.ext` keys `work` reads

**The single most important thing to know about this submodule:** `src/work/` reads `app.ext._liqProjects.playgroundMonitor` at **24 call sites across 12 modules, every one unconditional and unguarded** — no fallback, no capability check, no optional-dependency boundary. `work` cannot function at all unless `projects`' setup has run and installed `app.ext._liqProjects`. Before the consolidation this was an undeclared, `app.ext`-mediated runtime dependency between two separately-published plugins that nothing in either package declared. It is now a dependency *within one package*, between two submodules that — per [the contract's submodule interface](./docs/dev-core-consolidation-contract.md#submodule-interface) — still deliberately share no import edge. That asymmetry (hard runtime coupling, zero static coupling) is why unifying the two is worth doing later, and why nobody should assume the submodule boundary here is a seam that could be cut cheaply.

The complete census of `app.ext` keys `work` **reads** (it writes only `app.ext.constants.WORK_DB_PATH`):

| Key | Call sites | Set by | Guarded? |
|---|---|---|---|
| `app.ext._liqProjects.playgroundMonitor` | 24 (`getProjectData` ×21, `listProjects` ×2, `getProjectsData` ×1) | the `projects` submodule's `setup` | **No** — unconditional, no fallback. |
| `app.ext.credentialsDB` | 9 | `liq-credentials` / `liq-credentials-db` (outside this package) | No |
| `app.ext.integrations` | 9 (`callHook` ×8, `hasHook` ×1) | **`plugable-express` itself** (`src/app.js`, `app.ext.integrations = new IntegrationsManager()`) | Partially — see below |
| `app.ext.serverConfigRoot` | 1, in `setup` | `plugable-express` | n/a |

Two precisions worth stating, because the absorbed package's own README got both slightly wrong:

- `app.ext.integrations` is supplied by the **framework**, not by a co-loaded plugin. `@liquid-labs/liq-integrations` also used to set it, but that package was retired and is no longer among `@sdlcforge/core-server`'s explicit plugins, so this dependency is satisfied by the engine regardless of which plugins are loaded.
- The one genuine optional-capability boundary in this submodule guards a **hook**, not the manager. `src/work/handlers/_lib/submit-lib.mjs` dereferences `app.ext.integrations` unconditionally to call `hasHook({ providerFor: 'controls', hook: 'getQuestionControls' })`, and only *then* degrades gracefully — returning `{}` and skipping the submitter-attestation step — when no controls provider is registered. It is a good pattern, and it is narrower than "guards `app.ext.integrations`".

#### Two sources of truth for the playground path

`work` resolves the developer's playground directory two different ways: through `app.ext._liqProjects.playgroundMonitor` (the 24 sites above) and directly through `PLUGABLE_PLAYGROUND()` from `@liquid-labs/plugable-defaults` (4 sites: `handlers/resume.mjs`, `handlers/_lib/pause-lib.mjs`, `handlers/_lib/work-db.mjs`, `handlers/projects/_lib/remove-lib.mjs`). Before the consolidation these were two sources of truth in two packages; they are now two sources of truth inside one package, which is strictly worse to leave alone. Relatedly, `WorkDB`'s `playgroundPath` field is assigned and never read. Both are recorded rather than fixed here: this consolidation does not change behavior beyond what collapsing four packages into one unavoidably requires.

#### What happened to `@liquid-labs/liq-work`

Its own README used to close by predicting that the pervasive, unconditional coupling documented above made it "a likely merge candidate into a future consolidated package." That is what happened. Its entire `src/` tree moved here as `src/work/`, with its git history preserved through the merge, its runtime dependencies unioned into this package's manifest, and all 30 routes registered unchanged at the same paths. `@liquid-labs/liq-work` is superseded by `@sdlcforge/dev-core` and ships nothing in its place — no re-export shim, because loading both at once would crash the server outright rather than serve stale routes ([`registerPathVar`](./docs/dev-core-consolidation-contract.md#source-package-retirement-policy) throws `Path variable 'workKey' is already registered.` on the duplicate registration).

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

Each handler module exports `path`, `method`, `parameters`, `help`, and `func`, following `plugable-express`'s route-registration convention. The composite `setup` awaits each landed submodule's own setup in a fixed order; `projects`' setup runs first because it is the one that wires GitHub credentials, creates the playground directory, and installs `app.ext._liqProjects = { playgroundMonitor, playgroundPath }` — state that later submodules' setups depend on — as well as registering the `projectName`/`newProjectName` path resolvers used for path-parameter validation. `orgs`' setup runs second, after `projects`: its own `setup` call is synchronous and does not itself touch `app.ext._liqProjects`, but the deferred work it schedules onto `app.ext.setupMethods` does (see [The `app.ext._liqOrgs` contract](#the-appext_liqorgs-contract) above), so keeping `orgs` after `projects` in the composite order is correct even though it is not the strict dependency a passing composite-setup smoke test alone would suggest. `work`'s setup runs third, and — unlike `projects`' position — its own is a fixed convention rather than a dependency: it writes `app.ext.constants.WORK_DB_PATH` from `app.ext.serverConfigRoot`, which the framework supplies at server initialization, and registers `workKey` with a lazily-invoked `optionsFetcher`, so nothing it does at setup time needs `projects` or `orgs` to have run. (Its *handlers*, by contrast, depend on `projects` completely — see [The `work` → `projects` coupling](#the-work--projects-coupling-and-the-appext-keys-work-reads) above.) Both `orgs`' and `work`'s setups are synchronous and return `undefined`; the composite `await` is a harmless no-op for each.

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
