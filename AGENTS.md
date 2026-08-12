# @sdlcforge/core-server

Working notes for developers and AI agents contributing to `@sdlcforge/core-server`, an Express-based HTTP server with a plugin system that installs optimized lint/test/build/CI-CD scripts and manages SDLC tools, integrations, and workflow automation for teams using the companion SDLC CLI (currently `@liquid-labs/sdlcpilot-cli`, migrating to `@sdlcforge/sdlc-cli`).

## Build and test

Dependencies are installed with `bun install`. A checkout without `.yalc/` present — a fresh clone, or a freshly created Flow task worktree — needs `./scripts/provision-local-deps.sh` first; the [Conventions](#conventions) section below has the full yalc provisioning sequence.

Bun installs the dependency tree, but **Node and the `npm` binary must still be on `PATH`**: every Catalyst build tool is a Node-targeted CLI, and `make/10-resources.mk` resolves its four tool configs (Babel, Rollup, Jest, ESLint) through `npm explore … -- pwd`. "Bun conversion" here means Bun installs the dependency tree; it does not remove npm from the developer toolchain.

The build is Makefile-driven (Catalyst framework, modular makefiles under `make/`), transpiling ES6+ source to CommonJS via Babel and bundling two Rollup artifacts.

```bash
bun run build               # runs `make`; produces dist/sdlcforge-server.js (library) and
                             # dist/sdlcforge-server-exec.js (executable), each with a source map
```

```bash
bun run test                        # unit tests (Jest + Supertest), coverage to qa/coverage/ (or `make test`)
bun run test:local                  # quick local integration pass against the current Node version
bun run test:integration            # full Docker-based multi-version pass (Node 18-24)
TEST_SINGLE_VERSION=22 bun run test:integration   # test a single Node version
./test/test-ci.sh                   # CI-style test
```

```bash
bun run lint                # ESLint
bun run lint:fix            # auto-fix lint issues
bun run qa                  # full QA suite (tests + lint)
```

`prepack` runs `make build` before publishing; `preversion` runs `make test && make lint` before a version bump.

## Run

```bash
bun run start   # start the server locally, via scripts/start.sh
bun run stop    # stop the server, via scripts/stop.sh
```

On startup the server loads its plugin set — core plugins built into `@liquid-labs/plugable-express`, explicit npm-dependency plugins declared in `package.json`, and any user-supplied plugins from `${COMPLY_HOME}/plugins/server/` — then listens for HTTP requests.

## Code organization

- `src/cli/index.js` — CLI entry point that starts the server.
- `src/lib/app-init.mjs` — core initialization; configures the explicit-plugin list and delegates to `@liquid-labs/plugable-express`.
- `src/lib/index.js` — library exports (`appInit`, `Reporter`, `name`, `summary`).
- `src/lib/test/*.test.js` — unit tests (Jest).
- `make/` — modular makefiles, numbered by build priority (`10-locations.mk`, `20-js-src-finder.mk`, `50-sdlcforge-server-js.mk`, `55-lint.mk`, `95-final-targets.mk`, etc.).
- `test/` — integration test scripts: `test-server.js` (local integration), `run-integration-tests.sh` (Docker multi-version), `test-ci.sh` (CI-style).
- `scripts/` — operational scripts (`start.sh`, `stop.sh`, `test.sh`, `provision-local-deps.sh` — provisions `.yalc/` and runs `bun install` for a fresh checkout or task worktree).
- `dist/` — build output: `sdlcforge-server.js` (importable library) and `sdlcforge-server-exec.js` (standalone executable with a `#!/usr/bin/env -S node --enable-source-maps` shebang). Not checked in; produced by `bun run build`.

## Conventions

- ES6+ module source, transpiled to CommonJS via Babel; source maps enabled for debugging.
- The codebase is intentionally minimal and delegates almost all behavior to `@liquid-labs/plugable-express`; new capability is generally added as a plugin rather than as core-server code.
- Configuration is centralized through `@liquid-labs/comply-defaults` rather than scattered across the codebase — see [Environment variables and configuration](#environment-variables-and-configuration).
- Local development against an unreleased `@liquid-labs/plugable-express` uses **yalc**: a local copy lives in `.yalc/@liquid-labs/plugable-express/`, allowing parallel development of `core-server` and `plugable-express`. Under Bun, a bare `bun install` re-copies the linked package's **content** but does not re-resolve its **own dependency list** once `bun.lock` holds a resolved entry for the `file:` spec. `--force`, `--no-cache`, and a version bump are all equally ineffective. A newly-added transitive dependency simply never materializes, while `bun install` reports success. After any `yalc push` that changed the linked package's own `dependencies`, run `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`). Bun always *copies* a `file:` dependency and never symlinks it, regardless of `--backend`, so edits made directly under `.yalc/…` are invisible until the next install.
- **CI policy:** yalc is a strictly local-development mechanism. CI, when introduced, installs against published versions and does not attempt to resolve `file:.yalc/…` links; it does not check out the upstream `plugable-express` / `liq-projects` repositories. A CI runner has neither those repos nor the developer's global yalc store, so `.yalc/` cannot be regenerated there from nothing.
- **Task worktree provisioning:** a Flow task worktree must be created with dependency installation suppressed and then provisioned separately, since `.yalc/` is gitignored and absent from every fresh worktree:

  ```bash
  create-worktree.sh --no-install-deps …
  cd "$WORKTREE_PATH" && /path/to/main-checkout/scripts/provision-local-deps.sh
  ```

## Environment variables and configuration

Configuration is resolved through `@liquid-labs/comply-defaults`:

| Function | Purpose |
|----------|---------|
| `COMPLY_SERVER_CLI_NAME()` | Server name |
| `COMPLY_PORT()` | Port (default: `env.PORT` or a hardcoded fallback) |
| `COMPLY_API_SPEC_PATH()` | API spec output location |
| `COMPLY_SERVER_PLUGIN_DIR()` | User-supplied plugin directory path |
| `COMPLY_HOME()` | Server home directory |
| `COMPLY_SERVER_CONFIG_ROOT()` | Server configuration root: `${XDG_DATA_HOME:-$HOME/.local/share}/sdlcforge-core`. The packaged `server-settings.yaml` defaults are seeded here on first run. |

`${COMPLY_HOME}/plugins/server/` is where the third (user-supplied) plugin tier is loaded from; if unset or empty, only the core and explicit-npm tiers load.

## Common tasks

**Updating `@liquid-labs/plugable-express`** (the yalc-linked local dependency):

1. Update the package in the local yalc repo.
2. Run `yalc push` from `plugable-express`.
3. Run `rm -f bun.lock && bun install` in `core-server` (or `./scripts/provision-local-deps.sh --refresh-lock`) to pick up the pushed changes and update transitive deps. A bare `bun install` is **not** sufficient here: under Bun, once `bun.lock` holds a resolved entry for the `file:` spec, a bare `bun install` re-copies the linked package's content but does not re-resolve its own dependency list — `--force`, `--no-cache`, and a version bump are all equally ineffective, and a newly-added transitive dependency simply never materializes while `bun install` reports success.
4. Rebuild: `npm run build`.

## Troubleshooting

**Integration tests hang during "Loading explicit plugins".** The server is likely stuck fetching package metadata or running `bun install` over the network. Common causes and checks:

- Network issues inside the Docker container.
- Missing transitive dependencies — run `bun install` on the host first; if a `file:.yalc/…` dependency was pushed with new dependencies of its own, a bare `bun install` won't pick them up — run `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`) instead.
- Explicit plugins loading in the test environment; consider whether they should be skipped when `NODE_ENV=test`.

Debugging aids: server logs at `test-staging/integration-results/server-log-vX_X_X.txt`, integration test logs at `test-staging/integration-test-log.txt`, and `docker exec -it comply-server-integration-test /bin/bash` for a shell in the debug container. Use `NO_CLEANUP=1` with `bun run test:integration` to keep the container alive for inspection.

## Documentation

- [README.md](./README.md) — consumer-facing overview and entry point.
- [docs/core-server-spec.md](./docs/core-server-spec.md) — the project specification: use cases, general features, and the fixed HTTP API surface.
- [docs/architecture.md](./docs/architecture.md) — architecture overview, including the plugin system and build pipeline.
- [docs/project-structure.md](./docs/project-structure.md) — repository layout reference.
