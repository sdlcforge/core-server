# Phase 1 — dev-core Package Foundation

## Purpose and scope

Phase summary for the foundation phase of the `dev-core-consolidation` plan-group's `liq-projects` slice. Executes in the `sdlcforge/dev-core` repository (`/Users/zane/playground/sdlcforge/dev-core`).

## Goals

Turn the one-file `sdlcforge/dev-core` repository into a working, loadable-but-empty plugable-express plugin package, and commit the consolidation contract that all five participants of this plan-group build against.

This comes first because nothing else in the plan-group has anywhere to land until it does: three sibling participants (`liq-work`, `liq-orgs`, `plugable-projects-audit`) each absorb into the same package, and all four donors need the same answers about layout, root-file ownership, dependency union, and the plugin/`setup` contracts before any of them touches code. Landing those answers as a committed document inside dev-core — rather than only in an ephemeral plan note — is what lets a task agent in any of the five repos, at any later point in the wave, act without re-deriving them.

Nothing donor-specific lands in this phase. The package builds and tests green with an empty submodule set, which keeps the phase's blast radius on packaging alone and gives a clean before/after signal for the first absorption.

## Inputs

- The existing `sdlcforge/dev-core` repository: one commit (`07d7f0e`), one tracked file (`package.json` at `@sdlcforge/dev-core@1.0.0-alpha.0`, `main: dist/dev-core.js`, `type: commonjs`, empty `description`, `repository`/`bugs`/`homepage` already pointing at `sdlcforge/dev-core`).
- Decisions D1–D11 in `plan/notes/dev-core-target-shape.md`, which this phase transcribes into dev-core's own committed contract doc.
- `liq-projects`'s current `Makefile`, `make/*.mk` (builder `@liquid-labs/sdlc-projects-workflow-local-node-build@1.0.0-alpha.5`), `.sdlc-data.yaml`, `.gitignore`, and `package.json` script/devDependency set — the template dev-core's own toolchain is seeded from.
- `plugable-express`'s `src/lib/load-plugins.js` and `src/lib/register-handlers.js` — the authority on what a plugin module must export.

## Outputs

- `docs/dev-core-consolidation-contract.md` in dev-core — the durable, citable statement of the layout convention, submodule interface, root-file ownership, absorption recipe, dependency-union rule, plugin contract, composite-setup ordering, `app.ext` freeze, toolchain, versioning/consumption model, retirement policy, and scope fences.
- `README.md` in dev-core describing the package's purpose and the four submodules it will hold.
- An authored `package.json`: real `description` (the server-visible plugin summary), `engines`, `author`, `license`, `keywords`, the donors' script set (`build`, `lint`, `lint:fix`, `test`, `qa`, `prepack`, `preversion`), and the three `@liquid-labs/sdlc-resource-*` devDependencies.
- `Makefile`, `make/*.mk` (including `make/50-dev-core-js.mk` producing `dist/dev-core.js` from `src/index.mjs`), `.sdlc-data.yaml` recording those generated artifacts, and `.gitignore`.
- `src/index.mjs` — the plugin entry point: a merged `handlers` array built by spreading submodule handler arrays, and an `async setup` composing submodule setups in the D6 order, both written so a donor absorption adds exactly one import and one list entry.
- A smoke test asserting the exported plugin shape (`handlers` is an array, `setup` is a function, `setup` runs against a stub `app`).
- A green `make build` / `make test` / `make lint` in dev-core.
