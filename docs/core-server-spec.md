# @sdlcforge/core-server Specification

## Purpose and scope

This document is the canonical statement of what `@sdlcforge/core-server` does and is required to do. It is written for developers and AI agents implementing or modifying the server, for reviewers checking proposed changes against requirements, and for integrators building against the server's HTTP API — principally the companion SDLC CLI (currently `@liquid-labs/sdlcpilot-cli`, migrating to `@sdlcforge/sdlc-cli`).

It covers the server's use cases, cross-cutting behavioral requirements, and external HTTP surface. It does not cover *how* the server is built internally — that is [`docs/architecture.md`](./architecture.md) — nor developer build/test/lint workflow, which is [`AGENTS.md`](../AGENTS.md).

## Table of contents

1. [Key use cases](#key-use-cases)
2. [General features](#general-features)
3. [API definition](#api-definition)
4. [Constraints and assumptions](#constraints-and-assumptions)
5. [Pointers to deeper docs](#pointers-to-deeper-docs)

## Key use cases

### Start the server and load its plugin set

- **Actor:** a developer or operator, directly or via the companion SDLC CLI.
- **Action:** starts the server (`npm start`, or the packaged executable).
- **Outcome:** the server initializes and loads its full plugin set across three tiers, in order — core plugins built into `@liquid-labs/plugable-express`, explicit plugins declared by `core-server` itself (its own built-in in-tree submodules, then npm-dependency packages), and user-supplied plugins from `${COMPLY_HOME}/plugins/server/` — then begins listening for HTTP requests exposing the combined capability surface.

### Companion CLI drives SDLC tooling through the server's HTTP API

- **Actor:** the companion SDLC CLI, on behalf of a developer.
- **Action:** issues HTTP requests against the running server.
- **Outcome:** the CLI discovers the server's version, registered API surface, installed plugins, and available next commands, and invokes plugin-provided operations to manage SDLC tools, integrations, and workflow automation for the team's project.

### Install optimized lint/test/build/CI-CD scripts into a project

- **Actor:** a developer, via the companion CLI acting against the server.
- **Action:** invokes plugin-provided workflow operations (e.g. the `sdlc-projects-workflow-*` plugin family).
- **Outcome:** the target project receives optimized, opinionated lint, test, build, and CI/CD scripts and configuration, without the developer having to hand-author or maintain them directly.

### Manage integrations and credentials for the team

- **Actor:** a developer or team administrator, via the companion CLI.
- **Action:** invokes integration and credential operations — third-party issue-tracker integration (e.g. GitHub) and credential storage/retrieval are `core-server`'s own built-in (in-tree) capability; further integrations arrive as explicit-tier plugins.
- **Outcome:** the server mediates third-party integrations (e.g. GitHub issue tracking) and credential storage/retrieval on behalf of the team's tooling, without each client needing direct access to the underlying secrets or third-party APIs.

### Extend server capability with user-supplied plugins

- **Actor:** a project maintainer.
- **Action:** places a plugin package under `${COMPLY_HOME}/plugins/server/`.
- **Outcome:** on the next server start, the plugin is loaded as the third (user-supplied) tier, and its contributed capabilities appear in the server's discoverable API surface alongside the core and explicit-npm tiers — without modifying `core-server`'s own source or dependency set.

### Build and publish the package

- **Actor:** a maintainer, via `bun run build` / `make` (and `prepack`/`preversion` hooks on publish).
- **Action:** runs the Makefile-driven build.
- **Outcome:** the build transpiles the ES6+ source to CommonJS via Babel and bundles two Rollup artifacts — an importable library (`dist/sdlcforge-server.js`) and a standalone executable (`dist/sdlcforge-server-exec.js`) — each with a source map, ready for npm publication.

### Verify server correctness across supported Node.js versions

- **Actor:** a developer or CI system.
- **Action:** runs the project's test suites (`bun run test` for unit tests; `bun run test:local` for a quick local integration pass; `bun run test:integration` for the full Docker-based multi-version pass).
- **Outcome:** unit tests validate app initialization and library exports; local integration tests validate the running server's endpoints on the current Node version; Docker multi-version tests validate — primarily — that explicit plugins load correctly on first server startup across every supported Node version (18 through 24).

## General features

- **All capability is plugin-delivered.** The core codebase is intentionally minimal and delegates initialization and request handling to `@liquid-labs/plugable-express`; `core-server`'s own responsibility is to assemble configuration, its own built-in-plugin aggregate, and the explicit-plugin list, and hand off to that library.
- **Three-tier plugin loading, in a fixed order.** Core plugins (built into `@liquid-labs/plugable-express`) load first; explicit plugins declared by `core-server` — its own built-in (in-tree) submodules, then npm-dependency packages — load second; user-supplied plugins from `${COMPLY_HOME}/plugins/server/` load third. A plugin in a later tier can extend or override capability without requiring a change to an earlier tier.
- **The server is self-describing.** `/server/version`, `/server/api`, `/server/plugins/list`, and `/server/next-commands` let a client (principally the companion CLI) discover the server's version, its full registered API surface (including plugin-contributed routes), which plugins are loaded, and what commands are currently available — without the client hardcoding server internals.
- **Built-in capability is attributed to `@sdlcforge/core-server`'s own package identity.** Not every capability arrives as a separate npm-dependency package: policy controls, credential management, and GitHub issue-tracking integration are `core-server`'s own built-in (in-tree) submodules. `GET /server/plugins/list`, `GET /server/plugins/integrations/list`, and the framework's `GET /server/plugins/:serverPluginName/details` all attribute this capability to `@sdlcforge/core-server` itself rather than to a separate package name.
- **Configuration is centralized.** Server name, port, API spec output path, plugin directory, server configuration root, and home directory are all resolved through `@liquid-labs/comply-defaults` (`COMPLY_SERVER_CLI_NAME`, `COMPLY_PORT`, `COMPLY_API_SPEC_PATH`, `COMPLY_SERVER_PLUGIN_DIR`, `COMPLY_SERVER_CONFIG_ROOT`, `COMPLY_HOME`) rather than scattered across the codebase. The server configuration root — where `server-settings.yaml` and other server-managed configuration state are kept — resolves to `${XDG_DATA_HOME}/sdlcforge-core/` (defaulting `XDG_DATA_HOME` to `${HOME}/.local/share`), a user-level data location rather than a path inside the installed package; the packaged `server-settings.yaml` defaults are seeded there on first run so they are not silently lost by that location choice.
- **Every unregistered route returns 404.** Requests to paths not registered by any loaded plugin or the core server receive a 404 response rather than falling through silently.
- **Dual build artifacts from one source tree.** The same source produces both a library export and a standalone executable, keeping ES6+ module authoring while shipping CommonJS-compatible artifacts for both consumption modes.

## API definition

The server's HTTP surface is a **combination** of a small, fixed set of core endpoints and a dynamic set of endpoints contributed by whichever plugins are loaded (core, explicit-npm, and user-supplied tiers). The full live surface for a given running instance is only knowable at runtime via `GET /server/api`; this section defines the fixed core endpoints only.

| Endpoint | Method | Requirement |
|----------|--------|-------------|
| `/heartbeat` | GET | Must return a 200 response usable as a liveness check once the server has finished starting. |
| `/server/version` | GET | Must return the running server's version information. |
| `/server/api` | GET | Must return the full registered API surface (core plus every loaded plugin's routes) as an array, so a client can discover capability without prior knowledge. |
| `/server/plugins/list` | GET | Must return the list of currently loaded plugins. |
| `/server/next-commands` | GET | Must return the set of commands currently available to the client, given server/plugin state. |
| *(any unregistered path)* | any | Must return 404. |

Beyond the fixed core endpoints above, every loaded plugin is expected to register its own routes for the SDLC tooling, integration, and workflow-automation operations it provides (e.g. project script installation, credential management, third-party issue-tracker integration). Per-plugin endpoint detail is out of scope for this document; a project with a large enough combined surface to warrant one may add `docs/api-reference.md` as a companion document.

## Constraints and assumptions

- **Node.js `>=18.0.0`** is the minimum supported runtime, per the package's declared `engines` constraint; the Docker multi-version test suite validates behavior across Node 18 through 24.
- **Explicit and dynamic plugin installation may require network access** (fetching plugin packages), and a network-constrained environment (e.g. a sandboxed CI container) can affect first-startup plugin loading.
- **User-supplied plugins depend on a configured `${COMPLY_HOME}`.** The third plugin tier only loads plugins found under `${COMPLY_HOME}/plugins/server/`; if that location is unset or empty, only the core and explicit-npm tiers are active.
- **Designed as a companion to the SDLC CLI.** While the HTTP API is usable by any client, the server's capability set and command-discovery endpoints (`/server/next-commands`, `/server/api`) are shaped around driving the companion CLI's workflow.

## Pointers to deeper docs

- [`docs/architecture.md`](./architecture.md) — how the plugin system, build pipeline, and configuration layer are structured internally (the *how* behind this spec's *what*).
- [`docs/project-structure.md`](./project-structure.md) — repository layout reference.
- [`AGENTS.md`](../AGENTS.md) — build, test, and lint commands, plus other working-on-the-project notes for developers and AI agents.
- [`README.md`](../README.md) — consumer-facing project overview and entry point.
