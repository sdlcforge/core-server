# Phase — Framework Uptake And Host Declaration

## Goals

Make `core-server`'s plugin set **statically visible** to the upstream validator, and prove the framework it depends on is actually present before anything is built on top of it.

Two things have to be true before a single capability can be declared. The framework must be installed in a build that carries the manifest surface — which, as of planning, it is not ([upstream-framework-readiness.md](../notes/upstream-framework-readiness.md)) — and `core-server`'s two undiscoverable plugin tiers must be declared as data. Neither the `builtinPlugins` entry nor the eight-name `explicitPlugins` array literal can be found by any scan: keyword discovery contributes exactly zero plugins to this project, so the array literals in `src/lib/app-init.mjs` and `src/lib/builtin-plugins.mjs` are the entire input a resolver has. Until they exist as a `plugable.host` block, the validator sees an empty set and reports a clean graph over nothing.

This phase comes first because it is the precondition for every other phase, and because it converts the plan's one external dependency from an assumption into a checked, halt-on-failure condition at the point where acting on it is cheapest.

It deliberately declares **structure without semantics**: the identity and load order of the participants, and nothing about what they provide or require. That keeps the drift guard (`verifyHostDeclaration()`, which compares the declaration against the real `builtinPlugins`/`explicitPlugins` arrays) meaningful from the first commit, before anyone starts trusting a declaration that could already have drifted. The upstream contract's own recommended migration order puts these two steps first for the same reason.

## Inputs

- A `@liquid-labs/plugable-express` build carrying the manifest framework, reachable through `core-server`'s yalc link — specifically the plugin-manifest reader, the host-declaration reader, the framework intrinsic manifest, `validatePluginSet()`, `verifyHostDeclaration()`, and the `plugable-express-validate` bin. **This is a hard external prerequisite and it is not satisfied today.**
- The upstream `docs/plugin-manifest-contract.md`, or the finalized design notes standing in for it.
- `src/lib/app-init.mjs` — the `explicitPlugins` array literal and the `package.json` object it already parses at module scope.
- `src/lib/builtin-plugins.mjs` — the `submodules` array whose order is normative load order, and the `builtinPluginsFor` aggregation policy.
- This project's documented yalc refresh workflow, and the task-worktree provisioning sequence that goes with it ([build-wiring-and-dependency-refresh.md](../notes/build-wiring-and-dependency-refresh.md)).

## Outputs

- A refreshed, verified dependency: the framework's manifest surface resolvable from `core-server`, with `bun.lock` regenerated rather than reused, and `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` list reconciled if the yalc-resolved set changed.
- A `plugable.host` block in `core-server`'s `package.json` carrying `plugableManifestVersion`, the eight `explicitPlugins` names, and one `builtins` entry for `@sdlcforge/core-server` with its three components in `submodules` order — capability lists still empty.
- A drift guard in the Jest suite calling `verifyHostDeclaration()` against the real arrays, so a future edit to `explicitPlugins` or `submodules` that forgets the declaration fails `make test` rather than silently narrowing the validated set.
- A recorded statement of the derivation relationship between `submodules` and `components:`. Upstream flagged this as the residual hazard of the aggregated form — two transcriptions of one fact with nothing tying them together — and recommended deriving rather than restating. Whether that is achievable given the block lives in `package.json` (data) while `submodules` lives in `builtin-plugins.mjs` (code) is this phase's to settle; if it cannot be derived, the drift guard is the whole answer and must be treated as load-bearing.
- A resolution outcome for the plan as a whole if the prerequisite is unmet: the phase halts and reports rather than proceeding against a stub.
