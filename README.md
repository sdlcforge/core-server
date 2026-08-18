# dev-core

`@sdlcforge/dev-core` is the consolidated development-lifecycle plugin for `@sdlcforge/core-server`. It brings together project lifecycle management, work orchestration, organization settings, and project auditing into a single `plugable-express` plugin, in place of four packages that previously shipped these capabilities separately.

## Composition

`dev-core`'s internal shape is one top-level directory under `src/` per submodule:

- **`projects`** — *landed*, absorbed from `@liquid-labs/liq-projects`. Project lifecycle: creation, setup, detail, rename, update, documentation, close, archive, destroy, and release publishing. In this system a "project" is the union of three artifacts kept in sync: an NPM package (`package.json`), a local clone in the developer's playground directory (tracked via `@liquid-labs/playground-monitor`), and a GitHub repository — this submodule owns creating, inspecting, updating, and retiring that triad.
- **`work`** — *not yet absorbed.* Work-item orchestration on top of the project lifecycle.
- **`orgs`** — *not yet absorbed.* Organization-level settings and configuration.
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

## How it loads

`dev-core` is loaded by `@sdlcforge/core-server` as an explicit `plugable-express` plugin: the server dynamic-imports this package's `main` entry (`dist/dev-core.js`, built from `src/index.mjs`) and reads exactly two exports from it — a merged `handlers` array and a composite, asynchronous `setup` function. No other export is read; the plugin's own identity comes from `package.json` (`name` supplies the server-visible `npmName`, `description` the plugin summary), not from the module.

Each handler module exports `path`, `method`, `parameters`, `help`, and `func`, following `plugable-express`'s route-registration convention. The composite `setup` awaits each landed submodule's own setup in a fixed order; `projects`' setup runs first because it is the one that wires GitHub credentials, creates the playground directory, and installs `app.ext._liqProjects = { playgroundMonitor, playgroundPath }` — state that later submodules' setups depend on — as well as registering the `projectName`/`newProjectName` path resolvers used for path-parameter validation.

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

## License

UNLICENSED — see [`package.json`](./package.json).
