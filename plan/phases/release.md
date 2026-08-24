# Release

## Goals

Cut a released `@sdlcforge/core-server` carrying the absorbed capability, so the three donor repositories' own retirement phases have something to retire *into*.

This is the plan's final phase and it exists because of a scheduling hazard rather than a technical one. Each donor's retirement phase — deprecating its npm package and rewriting its `README.md` as a superseded notice — is gated on this project's absorption landing. If a donor is deprecated on npm while `core-server`'s replacement is unpublished, there is a window in which neither the donor nor its replacement is installable by a consumer resolving from the registry. Publishing here closes that window before any donor's retirement is dispatched. The decision to include it is recorded in [`plan/notes/scope-confirmation.md`](../notes/scope-confirmation.md).

It runs after the documentation phase, not before, so the published tarball carries documentation that matches the code inside it.

## Inputs

- Phase 5's aggregate parity gate, passed — the absorbed surface verified against Phase 3's baseline.
- Phase 6's documentation updates, landed.
- A green `make build`, `make test`, and `make lint`, which `package.json`'s own `preversion` and `prepack` hooks re-run anyway.
- The precedent from this wave's `sdlcpilot-cli-rename` and `framework-consolidation` plan-groups: `npm publish` is reliably blocked in this environment by the Bash-permission classifier and, separately, has hit a registry 401 — so the task is written to expect a blocked publish and to hand the exact command to the user rather than to treat the block as a failure.

## Outputs

- `@sdlcforge/core-server`'s version bumped from `1.0.0-alpha.15` to the next alpha, with `package.json` and `bun.lock` consistent.
- A publish attempt made, and one of two outcomes recorded unambiguously: the package published, or the exact verbatim command handed to the user for manual execution together with a note in `plan/followups.yaml` so the outstanding action survives the session.
- A clear statement in the task report of whether the donors' retirement phases are now unblocked, which is the single fact the dispatching manager needs from this phase.
