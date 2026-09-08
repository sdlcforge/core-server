# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@sdlcforge/core-server** is an Express-based HTTP server with a plugin system. It works as a companion to `@sdlcforge/core-cli`, managing SDLC tools, integrations, and workflow automation. The codebase delegates heavily to `@liquid-labs/plugable-express`; its own capability is delivered through a seven-component built-in (in-tree) plugin aggregate (see Architecture below) plus four explicit npm-dependency plugins.

## Common Commands

### Building
```bash
bun run build           # Build via Make (creates dist/sdlcforge-server.js and dist/sdlcforge-server-exec.js)
make                    # Direct build
```

### Testing
```bash
bun run test                      # Unit tests (Jest)
bun run test:integration          # Full Docker-based multi-version tests (18-26)
TEST_SINGLE_VERSION=22 bun run test:integration  # Test single Node version
bun run test:local                # Quick local integration test
./test/test-ci.sh                 # CI-style test
```

### Linting
```bash
bun run lint            # Run ESLint
bun run lint:fix        # Auto-fix linting issues
```

### Quality Assurance
```bash
bun run qa              # Full QA suite (tests + lint)
```

### Local Development
```bash
bun run start            # Start server locally (via scripts/start.sh)
bun run stop             # Stop server (via scripts/stop.sh)
```

## Architecture

### Plugin System
The server uses a layered plugin architecture:

1. **Core Server** (`src/lib/app-init.mjs`) configures a built-in (in-tree) plugin aggregate plus 4 explicit npm-dependency plugins, and delegates initialization to `@liquid-labs/plugable-express`
2. **Built-in Plugins** (in-tree, aggregated by `src/lib/builtin-plugins.mjs` and registered under `@sdlcforge/core-server`'s own package identity via `plugable-express`'s `builtinPlugins` option): seven components, in DAG (dependency) load order — `credentials`, `projects`, `orgs`, `controls`, `issues-github` (directory `src/integrations-issues-github/`), `work`, `projects-audit`. The order is load-bearing: it fixes absorbed routes' positions in the API spec and satisfies same-phase `app.ext` dependencies between components (e.g. `controls` requires `orgs` to have run first). `package.json`'s `plugable.host.builtins[0].components` must declare the identical order; `src/lib/test/host-declaration.test.js` asserts the two agree element-for-element. `projects`, `orgs`, `work`, and `projects-audit` were absorbed from the former `@sdlcforge/dev-core` package.
3. **Explicit Plugins** (installed as npm dependencies): the four `@liquid-labs/sdlc-projects-*` workflow/badges packages. `@sdlcforge/dev-core` is no longer a dependency — its four submodules are now built-in components (row 2).
4. **User Plugins** loaded from `${COMPLY_HOME}/plugins/server/`

A root `.eslintrc.cjs` enforces the component boundary: `import/no-restricted-paths` forbids a direct import from one of the seven `src/<component>/` directories into another (cross-component coordination is `app.ext`-only), and `src/lib/test/component-boundary.test.js` guards against that rule going silently inert.

**Important**: During test runs with `NODE_ENV=test`, consider whether explicit plugin loading should be skipped to avoid network dependencies and timeouts.

### Build System
Uses **Makefile-based builds** with the Catalyst framework:
- Modular makefiles in `make/` directory (numbered by priority: 10, 20, 50, 55, 95)
- Rollup bundles two artifacts:
  - `dist/sdlcforge-server.js` - Library export
  - `dist/sdlcforge-server-exec.js` - Executable CLI (with shebang)
- Babel transpiles ES6+ to CommonJS
- Source maps enabled for debugging

### Yalc Local Development
The project uses **yalc** for local development of `@liquid-labs/plugable-express`:
- Local copy in `.yalc/@liquid-labs/plugable-express/`
- Allows parallel development of core-server and plugable-express
- Under Bun, a bare `bun install` does not re-resolve a linked package's own dependency list once `bun.lock` holds a resolved `file:` entry — it re-copies the linked package's content but silently skips re-resolving new transitive dependencies. After any `yalc push`, run `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`) instead of a bare `bun install`

### Configuration Pattern
Configuration via `@liquid-labs/comply-defaults`:
- `COMPLY_SERVER_CLI_NAME()` - Server name
- `COMPLY_PORT()` - Port (default: env.PORT or hardcoded)
- `COMPLY_API_SPEC_PATH()` - API spec output location
- `COMPLY_SERVER_PLUGIN_DIR()` - Plugin directory path
- `COMPLY_HOME()` - Server home directory
- `COMPLY_SERVER_CONFIG_ROOT()` - Server configuration root: `${XDG_DATA_HOME:-$HOME/.local/share}/sdlcforge-core` (packaged `server-settings.yaml` defaults seeded here on first run)

## Testing Infrastructure

### Three Test Levels:

1. **Unit Tests** (`src/lib/test/*.test.js`)
   - Jest with Supertest
   - Coverage output to `qa/coverage/`
   - Tests app initialization and library exports

2. **Local Integration Tests** (`test/test-server.js`)
   - Quick validation on current Node version
   - Tests 7 endpoints: /heartbeat, /server/version, /server/api, /server/plugins/list, etc.
   - Run with `bun run test:local`

3. **Docker Multi-Version Tests** (`test/run-integration-tests.sh`)
   - **Primary Purpose**: Verify that explicitPlugins are automatically loaded on first server startup
   - Tests across Node 18-26
   - Ubuntu container with nvm pre-installed
   - Results in `test-staging/integration-results/test-results-node-*.json`
   - Use `TEST_SINGLE_VERSION=X` to test specific version
   - Use `NO_CLEANUP=1` to keep container alive for debugging

### Test Debugging
- Server logs saved to `test-staging/integration-results/server-log-vX_X_X.txt`
- Integration test logs in `test-staging/integration-test-log.txt`
- Access debug container: `docker exec -it comply-server-integration-test /bin/bash`

## Key Source Files

- `src/cli/index.js` - CLI entry point (starts server)
- `src/lib/app-init.mjs` - Core initialization, delegates to plugable-express with builtinPlugins and explicitPlugins configuration
- `src/lib/builtin-plugins.mjs` - Aggregates all seven built-in (in-tree) submodules, in DAG order, into one plugin; exports `componentNames` so the order can be asserted against `package.json`'s declared component list
- `src/controls/`, `src/credentials/`, `src/integrations-issues-github/`, `src/orgs/`, `src/projects/`, `src/projects-audit/`, `src/work/` - Built-in (in-tree) plugin submodules, siblings of `src/lib/` and `src/cli/`; cross-imports between them are lint-forbidden (`import/no-restricted-paths` in the root `.eslintrc.cjs`)
- `src/lib/index.js` - Library exports (appInit, explicitPlugins, Reporter, name, summary)

## Important Development Notes

### Integration Test Issues
If integration tests hang during "Loading explicit plugins", the server is likely stuck fetching package metadata from GitHub or running `bun install`. Common causes:
- Network issues in Docker container
- Missing transitive dependencies (run `bun install` on host; use `rm -f bun.lock && bun install` if a `file:.yalc/…` dependency's own dependencies changed since the lockfile was last regenerated)
- Explicit plugins being loaded in test environment (consider skipping for tests)

### Dependency Updates
When updating `@liquid-labs/plugable-express`:
1. Update in local yalc repo
2. Run `yalc push` from plugable-express
3. Run `rm -f bun.lock && bun install` in core-server to update transitive deps (a bare `bun install` will not pick up a new transitive dependency once `bun.lock` holds a resolved `file:` entry)
4. Rebuild: `bun run build`

### Build Artifacts
Two distribution files generated:
- `dist/sdlcforge-server.js` - Importable library
- `dist/sdlcforge-server-exec.js` - Executable with `#!/usr/bin/env -S node --enable-source-maps`

Both have corresponding `.js.map` source map files.

## Prepack/Preversion Hooks
- **prepack**: Runs `make build` before publishing
- **preversion**: Runs `make test && make lint` before version bump
