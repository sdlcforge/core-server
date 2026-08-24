# Project Structure

## Purpose and scope

This document is the repository layout reference for `@liquid-labs/liq-controls`: what every significant directory is for and what the key root-level files do, so a contributor or agent can orient without exploring the whole tree. It does not cover build, test, or contribution conventions — those belong in `AGENTS.md` once that document exists — and it does not cover internal module design, which belongs in `docs/architecture.md` once that document exists.

## Table of contents

1. [Directory tree](#directory-tree)
2. [`src/`](#src)
3. [`docs/`](#docs)
4. [`plan/`](#plan)
5. [`make/`](#make)
6. [`worktrees/`](#worktrees)
7. [`.flow/`](#flow)
8. [Key root-level files](#key-root-level-files)
9. [Related documents](#related-documents)

## Directory tree

```text
liq-controls/
├── src/                          # plugin source, compiled into dist/liq-controls.js
│   ├── lib/                      # plugin implementation
│   │   ├── index.js              # plugin entry point (setup registration)
│   │   ├── setup.mjs             # setup-pipeline method definitions
│   │   ├── resources/            # control/control-set models (Item/ItemManager-based)
│   │   ├── integrations/         # getQuestionControls integration hook registration
│   │   └── handlers/             # HTTP route handlers (orgs/controls/list, list-implied)
│   └── schema/                   # audit.schema.json — control-set file format schema
├── docs/                         # project documentation
│   ├── liq-controls-spec.md      # project specification
│   └── project-structure.md      # this document
├── plan/                         # Flow plan-tracking metadata
│   └── manifest.yaml
├── make/                         # supplementary Makefile includes
│   └── 01-schema.mk
├── worktrees/                    # Flow-managed git worktree checkouts for active plan work
│   └── plan/core-server-domain-consolidation/  # nested full checkout, omitted below
├── .flow/                        # per-machine Flow session/plan-tracking state
│   ├── plans/
│   └── launchers/
├── dist/                         # (omitted — generated build output)
├── node_modules/                 # (omitted — generated)
├── qa/                           # (omitted — generated QA pass markers/reports)
├── test-staging/                 # (omitted — generated, transpiled test copy of src/)
├── Makefile                      # build/lint/test/qa orchestration entry point
├── package.json                  # npm package manifest
├── package-lock.json             # npm dependency lockfile
├── plugable-express.yaml         # plugable-express plugin-dependency declaration
└── .gitignore
```

## `src/`

The plugin's source implementation, compiled by the Makefile into the single bundled `dist/liq-controls.js` that consumers actually load. `src/lib/index.js` is the plugin's entry point; `src/lib/setup.mjs` defines the two setup-pipeline contributions (`load org controls`, `load controls integrations`); `src/lib/resources/` holds the models for control sets and individual controls; `src/lib/integrations/` registers the `getQuestionControls` hook other plugins call; `src/lib/handlers/` implements the HTTP route handlers backing the two `controls/list` endpoints. `src/schema/audit.schema.json` is the control-set file format's structural reference schema, published unchanged to `dist/audit.schema.json`. Test files live alongside the code they cover (e.g. `src/lib/resources/test/`).

## `docs/`

Project documentation: the specification ([`docs/liq-controls-spec.md`](./liq-controls-spec.md)) and this structure reference. Build, test, and contribution conventions will live in `AGENTS.md` at the repository root once that document is written; this directory does not duplicate that content.

## `plan/`

Flow implementation-plan tracking. Holds `plan/manifest.yaml`; while a plan is active, its full documents (overview, `TODO.yaml`, task docs) live in an isolated plan worktree under `worktrees/plan/<slug>/` rather than directly under this directory.

## `make/`

Supplementary Makefile includes pulled in by the root `Makefile` via its `include make/*.mk` line. Currently holds one file (`01-schema.mk`) contributing the build rule that publishes the control-set schema.

## `worktrees/`

Git worktree checkouts Flow provisions for active plan and task work, kept isolated from the main checkout so in-progress branch work doesn't disturb it. `worktrees/plan/core-server-domain-consolidation/` is a full nested checkout backing that in-progress plan.

## `.flow/`

Per-machine, disposable Flow session and plan-tracking state — active plan pointers under `plans/` and launcher registry entries under `launchers/`. Not authored project content; excluded from prose detail beyond this note.

## Key root-level files

| File | Purpose |
|------|---------|
| `Makefile` | Orchestrates `build`/`lint`/`lint-fix`/`test`/`qa`; includes `make/*.mk` and delegates most rule logic to the `@liquid-labs/catalyst-scripts-node-project` toolchain. |
| `package.json` | npm package manifest; its `build`, `lint`, `test`, and `qa` scripts all delegate straight to the `Makefile`. |
| `package-lock.json` | npm dependency lockfile. |
| `plugable-express.yaml` | Declares this plugin's plugable-express plugin dependencies (`@liquid-labs/liq-projects`, `@liquid-labs/liq-orgs`), resolved automatically by the host server's plugin loader. |
| `.gitignore` | Excludes generated output (`dist/`, `test-staging/`, `qa/`, `node_modules/`) and machine-local Flow cache entries from version control. |

## Related documents

- [README.md](../README.md) — project pitch, installation, and quick usage.
- [AGENTS.md](../AGENTS.md) — build, test, and contributor conventions *(not yet written)*.
- [docs/liq-controls-spec.md](./liq-controls-spec.md) — the project specification.
