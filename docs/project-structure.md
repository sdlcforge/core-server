# Project Structure

## Purpose and scope

This document is a layout reference for `liq-credentials`: what each significant directory contains and what key root-level files do, so a contributor or agent can orient without exploring the whole tree. Build, test, and contribution conventions belong in `AGENTS.md` (not yet present in this repository) rather than here; this doc covers layout only.

## Directory tree

```text
liq-credentials/
├── src/                          # plugin source (handlers, setup, exports)
│   ├── index.js                  # plugin entry point (name, summary, exports)
│   ├── setup.mjs                 # plugable-express setup() hook
│   └── handlers/                 # HTTP handler implementations
│       ├── index.js               # re-exports the credentials handler group
│       └── credentials/           # import/list handlers + their tests
├── docs/                         # project documentation
│   ├── liq-credentials-spec.md   # canonical spec: what the plugin must do
│   └── project-structure.md      # this file
├── plan/                         # Flow implementation-plan tracking (manifest.yaml)
├── dist/                         # build output  (generated — omitted from source control review)
├── test-staging/                 # transpiled test build output  (generated)
├── qa/                           # lint/test pass markers  (generated)
├── worktrees/                    # Flow task/plan git worktrees  (generated, per-machine)
├── node_modules/                 # installed dependencies  (generated)
├── Makefile                      # build/lint/test/qa entry points
├── package.json                  # npm package manifest and script aliases
└── package-lock.json             # locked dependency versions
```

## `src/`

`src/` holds the plugin's implementation. `src/index.js` is the plugin's entry point — it re-exports the handlers and setup function and declares the plugin's registration `name` (`core-credentials`) and `summary`. `src/setup.mjs` implements the `setup()` hook a `@liquid-labs/plugable-express` host calls at plugin load time: it ensures the credentials storage directory exists, instantiates a `CredentialsDB` bound to the host, and registers the `credential` path variable. `src/handlers/` contains the HTTP handler implementations, one subdirectory per resource group; `src/handlers/credentials/` holds the `import` and `list` handlers described in [docs/liq-credentials-spec.md](./liq-credentials-spec.md#api-definition), each paired with its own `test/` directory of unit tests and fixture data.

## `docs/`

`docs/` holds project documentation beyond `README.md`. [`liq-credentials-spec.md`](./liq-credentials-spec.md) is the canonical statement of what the plugin does and is required to do — use it to check requirements or scope a change. This file, `project-structure.md`, is the layout reference you are reading now.

## `plan/`

`plan/` carries Flow's implementation-plan tracking state for this repository (currently `manifest.yaml`, recording the plan(s) registered against this project). The full plan documents (overview, task breakdown, `TODO.yaml`) live in an isolated plan worktree while a plan is active rather than in this directory; `plan/followups.yaml` and completed-plan summaries land here between sessions.

## Key root-level files

| File | Role |
|------|------|
| `Makefile` | Build/lint/test/qa entry points, built on the shared `@liquid-labs/catalyst-scripts-node-project` conventions. |
| `package.json` | npm package manifest; declares the plugin's dependencies (`@liquid-labs/liq-credentials-db`, `@liquid-labs/liq-handlers-lib`, `@liquid-labs/http-smart-response`) and aliases its npm scripts to the `Makefile` targets. |
| `package-lock.json` | Locked dependency versions for reproducible installs. |

## Related documents

- [README.md](../README.md) — consumer-facing overview, installation, and quick usage.
- [docs/liq-credentials-spec.md](./liq-credentials-spec.md) — canonical specification of the plugin's required behavior.
