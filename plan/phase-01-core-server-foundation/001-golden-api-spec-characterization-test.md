# Golden API-Spec Characterization Test

## Purpose and scope

The modernization synthesis (`/tmp/flow-sdlc-modernization/synthesis.md` §7, Phase 0 item 3) identifies a golden API-spec characterization test as "the single highest-value artifact in the entire plan" — the mechanical guarantee behind "retain all capabilities" across every later modernization phase (compile-time composition, plugin consolidation, transport decoupling, single-binary packaging). Without it, Phases 1 through 4 of the broader modernization are flying blind on whether they've preserved the server's actual behavior.

This task authors that test now, against the server's *current* behavior, before any other Phase 0 change lands (including this same phase's own task 002 dependency-bump and task 003 cleanups) — the golden snapshot must represent the pre-Phase-0 baseline, then subsequent tasks re-run it as their own regression check.

## Requirements

- Add a test (Jest, colocated with the existing integration suite in `test/`, or as a new `test/golden-api-spec.test.js` — follow the existing test layout convention in this repo, see `AGENTS.md` and `docs/project-structure.md`) that:
  1. Starts the server (reuse the existing local-integration-test server-start mechanism from `test/test-server.js` if practical, to avoid duplicating startup logic).
  2. Calls `GET /server/api` and captures the full registered API surface (core routes plus every loaded plugin's routes).
  3. Serializes the result to a checked-in snapshot file (e.g. `test/__snapshots__/golden-api-spec.json` or Jest's own snapshot mechanism — prefer a plain checked-in JSON file over a Jest inline/`.snap` file if the output is large or if a human/agent should be able to diff it easily outside Jest).
  4. On subsequent runs, asserts the live `/server/api` response matches the checked-in snapshot exactly (or with an explicit, documented normalization for any known-nondeterministic fields, e.g. timestamps — inspect the actual response shape first; do not assume nondeterminism that may not exist).
- Also snapshot `GET /server/plugins/list` (the loaded-plugin list) as a secondary signal — smaller and easier to reason about when the full API-spec diff is noisy, and independently useful since Phase 1's `plugins/list` re-implementation (a later phase, not this one) is explicitly required to preserve this endpoint's behavior per the synthesis.
- Record, in this task's own notes or a short `plan/resources/golden-api-spec-baseline.md`, the exact command to regenerate the snapshot (for legitimate, deliberate API-surface changes in later phases) versus the command to just check it (`npm test` should run the check-mode by default; regeneration should be an explicit opt-in flag or separate npm script, e.g. `npm run test:update-golden-api-spec`).
- Do not modify any plugin, app-init, or build logic — this is a test-only addition.

## Validation

- The new test passes against the server's current (pre-Phase-0) state.
- `npm test` runs the new test as part of the default suite.
- The checked-in snapshot file is committed.
- A deliberate, throwaway change to a route (e.g. temporarily commenting out a handler registration) causes the test to fail with a clear diff — confirm this manually, then revert the throwaway change before finishing (do not leave the throwaway change in the commit).

## Metadata

architectural_impact: false
