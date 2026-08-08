# @sdlcforge/core-server

Working notes for developers and AI agents contributing to `@sdlcforge/core-server`, an Express-based HTTP server with a plugin system that installs optimized lint/test/build/CI-CD scripts and manages SDLC tools, integrations, and workflow automation for teams using the companion SDLC CLI (currently `@liquid-labs/sdlcpilot-cli`, migrating to `@sdlcforge/sdlc-cli`).

## Build and test

The build is Makefile-driven (Catalyst framework, modular makefiles under `make/`), transpiling ES6+ source to CommonJS via Babel and bundling two Rollup artifacts.

```bash
npm run build              # runs `make`; produces dist/sdlcforge-server.js (library) and
                            # dist/sdlcforge-server-exec.js (executable), each with a source map
```

```bash
npm test                   # unit tests (Jest + Supertest), coverage to qa/coverage/
npm run test:local         # quick local integration pass against the current Node version
npm run test:integration   # full Docker-based multi-version pass (Node 18-24)
TEST_SINGLE_VERSION=22 npm run test:integration   # test a single Node version
./test/test-ci.sh          # CI-style test
```

```bash
npm run lint                # ESLint
npm run lint:fix            # auto-fix lint issues
npm run qa                  # full QA suite (tests + lint)
```

`prepack` runs `make build` before publishing; `preversion` runs `make test && make lint` before a version bump.

## Run

```bash
npm start   # start the server locally, via scripts/start.sh
npm stop    # stop the server, via scripts/stop.sh
```

On startup the server loads its plugin set — core plugins built into `@liquid-labs/plugable-express`, explicit npm-dependency plugins declared in `package.json`, and any user-supplied plugins from `${COMPLY_HOME}/plugins/server/` — then listens for HTTP requests.

## Code organization

- `src/cli/index.js` — CLI entry point that starts the server.
- `src/lib/app-init.mjs` — core initialization; configures the explicit-plugin list and delegates to `@liquid-labs/plugable-express`.
- `src/lib/index.js` — library exports (`appInit`, `Reporter`, `name`, `summary`).
- `src/lib/test/*.test.js` — unit tests (Jest).
- `make/` — modular makefiles, numbered by build priority (`10-locations.mk`, `20-js-src-finder.mk`, `50-sdlcforge-server-js.mk`, `55-lint.mk`, `95-final-targets.mk`, etc.).
- `test/` — integration test scripts: `test-server.js` (local integration), `run-integration-tests.sh` (Docker multi-version), `test-ci.sh` (CI-style).
- `scripts/` — operational scripts (`start.sh`, `stop.sh`, `test.sh`).
- `dist/` — build output: `sdlcforge-server.js` (importable library) and `sdlcforge-server-exec.js` (standalone executable with a `#!/usr/bin/env -S node --enable-source-maps` shebang). Not checked in; produced by `npm run build`.

## Conventions

- ES6+ module source, transpiled to CommonJS via Babel; source maps enabled for debugging.
- The codebase is intentionally minimal and delegates almost all behavior to `@liquid-labs/plugable-express`; new capability is generally added as a plugin rather than as core-server code.
- Configuration is centralized through `@liquid-labs/comply-defaults` rather than scattered across the codebase — see [Environment variables and configuration](#environment-variables-and-configuration).
- Local development against an unreleased `@liquid-labs/plugable-express` uses **yalc**: a local copy lives in `.yalc/@liquid-labs/plugable-express/`, allowing parallel development of `core-server` and `plugable-express`. Run `npm install` after any yalc push to ensure transitive dependencies stay in sync.

## Environment variables and configuration

Configuration is resolved through `@liquid-labs/comply-defaults`:

| Function | Purpose |
|----------|---------|
| `COMPLY_SERVER_CLI_NAME()` | Server name |
| `COMPLY_PORT()` | Port (default: `env.PORT` or a hardcoded fallback) |
| `COMPLY_API_SPEC_PATH()` | API spec output location |
| `COMPLY_SERVER_PLUGIN_DIR()` | User-supplied plugin directory path |
| `COMPLY_HOME()` | Server home directory |

`${COMPLY_HOME}/plugins/server/` is where the third (user-supplied) plugin tier is loaded from; if unset or empty, only the core and explicit-npm tiers load.

## Common tasks

**Updating `@liquid-labs/plugable-express`** (the yalc-linked local dependency):

1. Update the package in the local yalc repo.
2. Run `yalc push` from `plugable-express`.
3. Run `npm install` in `core-server` to pick up the pushed changes and update transitive deps.
4. Rebuild: `npm run build`.

## Troubleshooting

**Integration tests hang during "Loading explicit plugins".** The server is likely stuck fetching package metadata or running `npm install` over the network. Common causes and checks:

- Network issues inside the Docker container.
- Missing transitive dependencies — run `npm install` on the host first.
- Explicit plugins loading in the test environment; consider whether they should be skipped when `NODE_ENV=test`.

Debugging aids: server logs at `test-staging/integration-results/server-log-vX_X_X.txt`, integration test logs at `test-staging/integration-test-log.txt`, and `docker exec -it comply-server-integration-test /bin/bash` for a shell in the debug container. Use `NO_CLEANUP=1` with `npm run test:integration` to keep the container alive for inspection.

## Documentation

- [README.md](./README.md) — consumer-facing overview and entry point.
- [docs/core-server-spec.md](./docs/core-server-spec.md) — the project specification: use cases, general features, and the fixed HTTP API surface.
- [docs/architecture.md](./docs/architecture.md) — architecture overview, including the plugin system and build pipeline.
- [docs/project-structure.md](./docs/project-structure.md) — repository layout reference.
