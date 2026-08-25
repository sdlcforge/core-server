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

## Additional documentation

- [AGENTS.md](./AGENTS.md) — build, test, and lint commands, plus other working-on-the-project notes for developers and AI agents.
- [docs/core-server-spec.md](./docs/core-server-spec.md) — the project specification.
- [docs/architecture.md](./docs/architecture.md) — architecture overview, including the plugin system and build pipeline.
- [docs/project-structure.md](./docs/project-structure.md) — repository layout reference.
