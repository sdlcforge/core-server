# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@sdlcforge/core-server** is an Express-based HTTP server with a plugin system. It works as a companion to `@sdlcforge/core-cli`, managing SDLC tools, integrations, and workflow automation. The codebase is intentionally minimal (66 source lines) and delegates heavily to `@liquid-labs/plugable-express`.

## Common Commands

### Building
```bash
npm run build           # Build via Make (creates dist/sdlcforge-server.js and dist/sdlcforge-server-exec.js)
make                    # Direct build
```

### Testing
```bash
npm test                          # Unit tests (Jest)
npm run test:integration          # Full Docker-based multi-version tests (18-24)
TEST_SINGLE_VERSION=22 npm run test:integration  # Test single Node version
npm run test:local                # Quick local integration test
./test/test-ci.sh                 # CI-style test
```

### Linting
```bash
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix linting issues
```

### Quality Assurance
```bash
npm run qa              # Full QA suite (tests + lint)
```

### Local Development
```bash
npm start               # Start server locally (via scripts/start.sh)
npm stop                # Stop server (via scripts/stop.sh)
```

## Architecture

### Plugin System
The server uses a layered plugin architecture:

1. **Core Server** (`src/lib/app-init.mjs`) configures 13 explicit plugins and delegates initialization to `@liquid-labs/plugable-express`
2. **Explicit Plugins** (installed as npm dependencies): liq-controls, liq-credentials, liq-integrations, liq-projects, liq-work, and various SDLC workflows
3. **User Plugins** loaded from `${COMPLY_HOME}/plugins/server/`

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
- Run `npm install` to ensure transitive dependencies are installed

### Configuration Pattern
Configuration via `@liquid-labs/comply-defaults`:
- `COMPLY_SERVER_CLI_NAME()` - Server name
- `COMPLY_PORT()` - Port (default: env.PORT or hardcoded)
- `COMPLY_API_SPEC_PATH()` - API spec output location
- `COMPLY_SERVER_PLUGIN_DIR()` - Plugin directory path
- `COMPLY_HOME()` - Server home directory

## Testing Infrastructure

### Three Test Levels:

1. **Unit Tests** (`src/lib/test/*.test.js`)
   - Jest with Supertest
   - Coverage output to `qa/coverage/`
   - Tests app initialization and library exports

2. **Local Integration Tests** (`test/test-server.js`)
   - Quick validation on current Node version
   - Tests 7 endpoints: /heartbeat, /server/version, /server/api, /server/plugins/list, etc.
   - Run with `npm run test:local`

3. **Docker Multi-Version Tests** (`test/run-integration-tests.sh`)
   - **Primary Purpose**: Verify that explicitPlugins are automatically loaded on first server startup
   - Tests across Node 18-24
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
- `src/lib/app-init.mjs` - Core initialization, delegates to plugable-express with explicitPlugins configuration
- `src/lib/index.js` - Library exports (appInit, Reporter, name, summary)

## Important Development Notes

### Integration Test Issues
If integration tests hang during "Loading explicit plugins", the server is likely stuck fetching package metadata from GitHub or running npm install. Common causes:
- Network issues in Docker container
- Missing transitive dependencies (run `npm install` on host)
- Explicit plugins being loaded in test environment (consider skipping for tests)

### Dependency Updates
When updating `@liquid-labs/plugable-express`:
1. Update in local yalc repo
2. Run `yalc push` from plugable-express
3. Run `npm install` in core-server to update transitive deps
4. Rebuild: `npm run build`

### Build Artifacts
Two distribution files generated:
- `dist/sdlcforge-server.js` - Importable library
- `dist/sdlcforge-server-exec.js` - Executable with `#!/usr/bin/env -S node --enable-source-maps`

Both have corresponding `.js.map` source map files.

## Prepack/Preversion Hooks
- **prepack**: Runs `make build` before publishing
- **preversion**: Runs `make test && make lint` before version bump
