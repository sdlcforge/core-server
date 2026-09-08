# @sdlcforge/core-server

Express-based HTTP server with a plugin system that installs optimized lint, test, build, and CI/CD scripts, and manages SDLC tools, integrations, and workflow automation for a team. It is the companion server to the SDLC CLI (currently `@liquid-labs/sdlcpilot-cli`, migrating to `@sdlcforge/sdlc-cli`).

## Status

[![coverage: 74%](./.readme-assets/coverage.svg)](https://google.com)

## Installation

```bash
npm install @sdlcforge/core-server
```

It is typically installed and provisioned automatically as part of setting up a project with the companion SDLC CLI, rather than installed directly.

## Usage

```bash
npm start
```

This starts the server locally (via `scripts/start.sh`). On startup, the server loads its plugin set — core plugins, its own built-in (in-tree) plugins, explicit npm-dependency plugins, and any user-supplied plugins from `${COMPLY_HOME}/plugins/server/` — and exposes SDLC tooling, integrations, and workflow automation to the companion CLI. Stop it with `npm stop`.

## Built-in components

`core-server`'s built-in (in-tree) plugin aggregate is seven components, registered under the package's own identity (`@sdlcforge/core-server`) rather than as separate npm packages. They load in the order below — dependency order, not alphabetical — because several of them share state through `app.ext` at setup time:

| Component | Routes | Purpose |
|---|---|---|
| `credentials` | `/credentials/import`, `/credentials/list` | Stores and retrieves team credentials (e.g. API tokens) other components read at setup or request time. |
| `projects` | `/projects/*` (create, setup, detail, rename, update, document, close, archive, destroy, and release publishing — each in an explicit `:projectName` form and an implied, cwd-inferred form) | Project lifecycle. A "project" here is the union of an npm package, a local playground clone, and a GitHub repository, kept in sync. |
| `orgs` | `/orgs/*` (create, list, and per-org parameter detail/list/set) | Organization-level settings. An "org" is not a free-standing entity — it's a project whose `package.json` declares `liq.packageType === 'org'`. |
| `controls` | `/orgs/:orgKey/controls/list` (and an implied form) | Organization-level policy controls. |
| `issues-github` | *(none — integration hooks only)* | GitHub issue-tracker and pull-request integration, consumed by `work` and other components through the framework's integration-hook mechanism; registers no HTTP routes of its own. |
| `work` | `/work/*` (start, resume, pause, status, build, clean, qa, save, submit, close, plus nested `issues`/`projects` add/list/remove) | Cross-repo, git-branch-scoped units of work tying GitHub issues and projects together from creation through submission and merge. |
| `projects-audit` | `/projects/:projectName/audit`, `/projects/:projectName/audit-fix` (and implied forms) | npm dependency auditing (security findings plus outdated/missing/extraneous analysis) and an automatic-fix counterpart for a project. Contributes handlers only — no `setup` — and depends on `projects`' setup having already resolved the project's on-disk location; loading it without `projects` present is a startup-time crash, not a request-time one. |

Beyond the built-in aggregate, four `@liquid-labs/sdlc-projects-*` packages load as explicit npm-dependency plugins, providing workflow/CI-CD scripting and badge generation. The full live route surface (165 endpoints as of this writing) is discoverable at runtime via `GET /server/api`, and [docs/core-server-spec.md](./docs/core-server-spec.md) defines the server's fixed core-endpoint contract.

## Additional documentation

- [AGENTS.md](./AGENTS.md) — build, test, and lint commands, plus other working-on-the-project notes for developers and AI agents.
- [docs/core-server-spec.md](./docs/core-server-spec.md) — the project specification.
- [docs/architecture.md](./docs/architecture.md) — architecture overview, including the plugin system and build pipeline.
- [docs/project-structure.md](./docs/project-structure.md) — repository layout reference.
