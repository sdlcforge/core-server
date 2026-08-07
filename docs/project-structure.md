# Project Structure

## Purpose and scope

This document is the repository layout reference for `@sdlcforge/core-server`: what each significant directory contains and what the key root-level files do, so a contributor or agent can locate any part of the codebase without exploring the whole tree. It does not cover build/test/lint commands or development conventions — those live in [`AGENTS.md`](../AGENTS.md) — nor architectural rationale, which belongs in `docs/architecture.md`.

## Table of contents

1. [Directory tree](#directory-tree)
2. [`src/`](#src)
3. [`test/`](#test)
4. [`make/`](#make)
5. [`scripts/`](#scripts)
6. [`docs/`](#docs)
7. [`.readme-assets/`](#readme-assets)
8. [Key root-level files](#key-root-level-files)
9. [Related documents](#related-documents)

## Directory tree

```text
.
├── src/                     # Server source (ES6+, transpiled to CommonJS via Babel/Rollup)
│   ├── cli/                 #   CLI entry point — starts the server as an executable
│   │   └── index.js
│   └── lib/                 #   Core library: app init, plugin wiring, library exports
│       ├── app-init.mjs     #     Configures explicit plugins, delegates to plugable-express
│       ├── index.js         #     Library exports (appInit, Reporter, name, summary)
│       └── test/            #     Jest unit tests for the lib
├── test/                    # Local and Docker-based multi-version integration tests
│   ├── run-integration-tests.sh
│   ├── test-server.js
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── …                    #   CI/quick-test scripts, node-version helper, own README.md
├── make/                    # Modular Makefile includes (Catalyst build framework)
│   ├── 10-locations.mk
│   ├── 20-js-src-finder.mk
│   ├── 50-sdlcforge-server-js.mk
│   ├── 50-sdlcforge-server-exec-js.mk
│   ├── 55-lint.mk
│   ├── 55-test.mk
│   └── 95-final-targets.mk
├── scripts/                 # Operational scripts run outside the Make build
│   ├── start.sh              #   `npm start`
│   ├── stop.sh               #   `npm stop`
│   ├── test.sh               #   `npm run test:local`
│   └── test-for-platform-binaries.sh
├── docs/                    # Project documentation (this file, the spec, architecture)
│   └── core-server-spec.md
├── .readme-assets/          # Static assets referenced from README.md
│   └── coverage.svg
├── dist/                    # (generated, gitignored) build output — library + executable bundles
├── qa/                      # (generated, gitignored) coverage output from `make test` / `npm run qa`
├── test-staging/            # (generated, gitignored) Docker integration test results and server logs
├── Makefile
├── package.json
├── package-lock.json
├── server-settings.yaml
├── .catalyst-data.yaml
├── .gitignore
├── .dockerignore
└── README.md
```

`node_modules/` and `.yalc/` (a local yalc-linked copy of `@liquid-labs/plugable-express`, used for parallel local development) are also generated and gitignored; both are omitted from the tree above as build/dependency noise.

## `src/`

The server's own source, intentionally minimal since nearly all behavior is delegated to `@liquid-labs/plugable-express`. `src/cli/index.js` is the CLI entry point that starts the server as a standalone executable. `src/lib/app-init.mjs` is the core initialization module — it assembles the explicit-plugin list and configuration and hands off to `plugable-express`. `src/lib/index.js` is the library's public export surface (`appInit`, `Reporter`, `name`, `summary`). `src/lib/test/` holds the Jest unit tests for this library code. Written in ES6+ and transpiled to CommonJS at build time; the resulting dual artifacts land in `dist/`.

## `test/`

Integration test infrastructure, distinct from the unit tests colocated under `src/lib/test/`. Contains a quick local test path (`test-server.js`, invoked via `scripts/test.sh`) and the Docker-based multi-version suite (`run-integration-tests.sh`, `Dockerfile`, `docker-compose.yml`, `get-node-versions.js`) that verifies explicit-plugin loading across every supported Node.js version. `test/README.md` documents this directory's own files and usage in detail; `test-staging/` (generated, gitignored) is where the Docker suite writes its per-version JSON results and server logs.

## `make/`

Modular, priority-numbered Makefile includes generated and maintained by the Catalyst build framework (`@liquid-labs/catalyst-lib-makefiles` and related `catalyst-builder-*`/`catalyst-resource-*` packages, declared in `.catalyst-data.yaml`). The root `Makefile` includes every `make/*.mk` file; each numbered file owns one concern — locating resources, finding source/test files, building the library and executable Rollup artifacts, linting, and testing. These files are framework-generated rather than hand-authored; changes to the build workflow are typically made by updating the Catalyst dependency versions in `.catalyst-data.yaml` rather than editing `make/*.mk` directly.

## `scripts/`

Small operational shell scripts invoked via `npm` scripts rather than through the Make build: `start.sh`/`stop.sh` run and stop the server locally, `test.sh` drives the quick local integration pass, and `test-for-platform-binaries.sh` supports platform-binary verification.

## `docs/`

Project documentation beyond `README.md` and `AGENTS.md`: this file and [`core-server-spec.md`](./core-server-spec.md), the project specification. `docs/architecture.md`, when present, covers the plugin system and build pipeline internals.

## `.readme-assets/`

Static assets referenced from `README.md` — currently the coverage badge SVG shown in the project status section.

## Key root-level files

| File | Purpose |
|------|---------|
| `Makefile` | Entry point for the Catalyst-based build; includes every `make/*.mk` module in priority order. |
| `package.json` | npm manifest — scripts (`build`, `test`, `lint`, `start`/`stop`, `qa`), the three-tier plugin dependency list, and `prepack`/`preversion` publish hooks. |
| `package-lock.json` | Pinned dependency graph for reproducible installs. |
| `.catalyst-data.yaml` | Catalyst framework configuration declaring the project's build workflow — which `make/*.mk` builders run, at what priority, and their purpose. |
| `.gitignore` | Excludes generated and local-only directories (`dist`, `node_modules`, `qa`, `test-staging`, `.yalc`, etc.) from version control. |
| `.dockerignore` | Controls what's copied into the integration-test Docker build context; deliberately *includes* `dist` and `node_modules` since the Docker tests need the exact built output and dependency set. |
| `server-settings.yaml` | Server-side registry configuration — the plugin registry URL `plugable-express` uses to resolve plugin packages. |

## Related documents

- [README.md](../README.md) — consumer-facing overview and entry point.
- [AGENTS.md](../AGENTS.md) — build, test, and lint commands, plus other working-on-the-project notes for developers and AI agents.
- [docs/core-server-spec.md](./core-server-spec.md) — the project specification.
- [docs/architecture.md](./architecture.md) — architecture overview, including the plugin system and build pipeline.
