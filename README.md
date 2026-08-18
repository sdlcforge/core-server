# @liquid-labs/liq-projects

`liq-projects` is a [`plugable-express`](https://github.com/liquid-labs/plugable-express) plugin for `core-server` that manages the full lifecycle of a "project." In this system, a "project" is the union of three artifacts kept in sync: an NPM package (`package.json`), a local clone in the developer's playground directory (tracked via `@liquid-labs/playground-monitor`), and a GitHub repository. This plugin owns creating, inspecting, updating, and retiring that triad.

## Note on package naming

`@liquid-labs/liq-projects` (this package) is **not** the same package as `@liquid-labs/liq-projects-lib`. They are different packages with different purposes, and the similar names have already caused confusion for at least one contributor investigating this codebase — double-check which package a dependency or import actually refers to:

- `liq-projects` (this package) is a `plugable-express` plugin exposing the `/projects/*` HTTP routes described below.
- `liq-projects-lib` is a separate, lower-level library of framework-agnostic project utilities (e.g. milestone determination, package.json updates), consumed by `liq-work` and other packages. It shares no code or dependency edge with this package.

## Routes

All routes are mounted under `/projects` (registered in `src/projects/handlers/index.js` and, for releases, `src/projects/handlers/releases/index.js`). Most operations exist in two variants: an explicit form naming `:projectName`, and an "implied" form that infers the project from the current working directory.

| Operation | Method | Explicit path | Implied path | Purpose |
|---|---|---|---|---|
| Create | POST | `/projects/create` | — | Initializes a local git repo, sets `package.json` fields, creates and pushes a GitHub repo, and moves the result into the playground. |
| Setup | POST | `/projects/:projectName/setup` | `/projects/setup` | Applies standard project configuration: origin/main branch naming, issue labels, and milestones. |
| Detail | GET | `/projects/:projectName/detail` | `/projects/detail` | Reports project inspection info. |
| Rename | POST | `/projects/:projectName/rename` | `/projects/rename` | Renames the package and moves the playground clone. |
| Update | PUT | `/projects/:projectName/update` | `/projects/update` | Updates `package.json`-level project data. |
| Document | PUT | `/projects/:projectName/document` | `/projects/document` | Generates/manages project documentation — a capability this plugin exposes *for other projects* (see the naming note above for how that relates to this package's own docs). |
| Close | DELETE | `/projects/:projectName/close` | `/projects/close` | Closes out a project. |
| Archive | PUT | `/projects/:projectName/archive` | `/projects/archive` | Verifies a clean, up-to-date git state, then archives the GitHub repository. |
| Destroy | DELETE | `/projects/:projectName/destroy` | `/projects/destroy` | Deletes the GitHub repository and the local playground copy. |
| Publish a release | POST | `/projects/:projectName/releases/publish` | `/projects/releases/publish` | Runs `npm publish` and creates a matching GitHub release. |

## Plugable-express integration

This package is loaded into `core-server` as a `plugable-express` plugin: `src/index.js` exports `name` (registered as `core-projects`), `summary`, `handlers`, and `setup` — the shape `plugable-express` expects from a plugin module. Each handler module (one per row in the table above) exports `path`, `method`, `parameters`, `help`, and `func`, following `plugable-express`'s route-registration convention. `setup()` wires GitHub credentials, mounts a `PlaygroundMonitor` instance onto `app.ext._liqProjects`, and registers `projectName`/`newProjectName` path resolvers used for path-parameter validation.

## Modernization status

`liq-projects` is part of an active modernization effort and is a likely merge candidate into a future consolidated package alongside related project-lifecycle packages. Its package boundary, file layout, and possibly its name may change as that consolidation lands — the route surface and integration details documented here may move to a different package's docs at that point.
