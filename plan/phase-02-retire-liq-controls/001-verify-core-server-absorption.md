# Verify Core-Server Absorption

## Purpose and scope

Read-only verification gate. Confirms `@sdlcforge/core-server` has actually landed `liq-controls`'s absorption before any retirement documentation or metadata work proceeds. Mirrors `liq-orgs`'s own `plan/phase-06-retire-liq-orgs/001-verify-dev-core-absorption.md` precedent (see `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md`).

**This task must not be dispatched — and if dispatched, must not pass — until `core-server`'s own `core-server-domain-consolidation` absorption phase has merged.** That phase does not exist yet as of this plan's authoring; it is authored in a separate, later dispatch within this same multi-project federated-plan authoring pass, and its own execution happens on its own schedule. This plan's tooling (a single project's `TODO.yaml`) cannot itself express or enforce a cross-project phase dependency — the dispatching manager must hold this task until `core-server`'s absorption phase is confirmed landed. Halt with a clear "blocked: precondition not met" report rather than guessing or partially proceeding if dispatched early.

## Requirements

Once `core-server`'s absorption is believed to have landed, verify, against `core-server`'s own checkout (not this repository):

1. **File census.** Every one of the 19 relocated source files this plan's Phase 1 task moved to `src/controls/…` (see [`plan/notes/liq-controls-source-inventory.md`](../notes/liq-controls-source-inventory.md) for the full list) is present under `core-server`'s own absorbed path (expected `src/controls/…`, per this plan's own choice — confirm the actual path core-server's absorption phase used, which may differ if that phase's own planning revised the name; see the source inventory's flagged anomaly on this point).
2. **Route parity.** `core-server`'s built/aggregated handler set includes both `liq-controls` routes with byte-identical `path` arrays: `['orgs', ':orgKey', 'controls', 'list']` and `['orgs', 'controls', 'list']`. No duplicate registration (confirms no shim was left running alongside the absorption).
3. **Integration hook.** The `getQuestionControls` hook is still registered under provider name `'controls'` in `core-server`'s aggregated `app.ext.integrations`.
4. **`app.ext` contract intact.** `core-server`'s (or its absorbed `@sdlcforge/dev-core` dependency's) composite setup still publishes `app.ext._liqOrgs` and `app.ext._liqProjects` under their frozen names — the two keys `liq-controls`'s relocated `load-controls.mjs` and `get-question-controls.mjs` read.
5. **Dependency repointed.** `core-server`'s own `package.json` no longer lists `@liquid-labs/liq-controls` as a `dependencies` entry (or, if an interim state deliberately keeps both during a transition, confirm that transition state does not load both plugins simultaneously — a duplicate-registration crash risk, per this plan's `overview.md`).
6. **Build health.** `core-server`'s `make build`/`make test`/`make lint` (or its Bun-based equivalents per `core-server`'s own `AGENTS.md`/`CLAUDE.md`) are green.

## Validation

- Every check in Requirements above is independently confirmed against live source in `core-server`'s checkout, not inferred from this plan's own task documents or from `core-server`'s plan documents (which may describe intent that did not land exactly as written).
- If any check fails or cannot be confirmed (including "the absorption phase has not landed at all"), this task halts the phase: do not proceed to tasks 002–004, and report the specific gap(s) found.
- If all checks pass, record the confirmation (commit SHAs / paths checked) so tasks 002–004 can proceed without re-deriving it.
- This task makes no edits to any file in any repository — read-only by design (mirrors the `liq-orgs` precedent's own gate task, which edited nothing and reported PASS/FAIL against 8 requirement groups).

## Assumptions

- The exact absorbed path (`src/controls/…` vs. a name `core-server`'s own absorption-authoring phase may have revised) is not knowable at this plan's authoring time. Confirm the actual path from `core-server`'s own committed source rather than assuming this plan's own naming choice survived unchanged.

## References

- [`plan/notes/liq-controls-source-inventory.md`](../notes/liq-controls-source-inventory.md) — the pre-move baseline (route table, `app.ext` contract, file census) this task's post-absorption checks compare against.
- `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — the precedent this task's shape follows, including its 8-requirement-group gate structure.
