# Verify Third-Party Requiring Edges Satisfied

## Purpose and scope

Empirically confirm — with the framework's real validator, not by inspection of source alone — that the two couplings this plan-group was originally chartered to fix, whose *requiring* half lives in a package `core-server` does not own, now resolve cleanly once Phases 1 and 2 have landed. This phase was re-scoped from a scope-decision phase to a verification phase on 2026-09-01: the packages that carried the two requiring edges (`@liquid-labs/liq-projects`, `@liquid-labs/liq-work`) no longer exist as separate third-party plugins — they were absorbed into `@sdlcforge/dev-core`, which has since shipped its own compile-time manifest declaring both edges. Full background: [`plan/phases/third-party-coupling-coverage.md`](../phases/third-party-coupling-coverage.md) and [`plan/notes/2026-09-01-blocker-reverification.md`](../notes/2026-09-01-blocker-reverification.md).

No new capability declarations are authored by this task. This is a verification-and-evidence-capture task only.

## Requirements

1. Confirm the local environment actually carries the refreshed dependencies this check needs (Phase 1's prerequisite-verification task should already have done this, but do not assume — re-check rather than trust):
   - `node -e "const m = require('@liquid-labs/plugable-express'); console.log('validatePluginSet' in m)"` reports `true`.
   - `node_modules/@sdlcforge/dev-core/package.json` contains a `"plugable"` block (`grep -q '"plugable"' node_modules/@sdlcforge/dev-core/package.json`).
   - If either check fails, **halt and report** — this task cannot proceed against stale dependencies, and a stale-dependency finding here is a Phase 1 regression, not a Phase 3 finding.

2. Run the framework's validator against `core-server`'s real package root (not `test-staging/`; see the `packageRoot` hazard noted in [`plan/notes/build-wiring-and-dependency-refresh.md`](../notes/build-wiring-and-dependency-refresh.md)) — via `validatePluginSet({ packageRoot: <repo root> })` in a throwaway Node/Jest snippet, and/or the `plugable-express-validate` CLI if Phase 1 confirmed it usable. Use whichever entry point is actually present; do not block this task on Phase 4's own `make/56-plugin-graph.mk` wiring, which is not expected to exist yet at this point in the sequence.

3. From the validator's output, locate and record the verdicts for exactly these two edges:
   - `@sdlcforge/dev-core`'s `projects` component's `appExt:credentialsDB @ load` requirement, expected to resolve `satisfied` or `satisfied-by-source-order` against `src/credentials/`'s `appExt:credentialsDB @ load` provide (Phase 2 output). This is the requiring side of the GITHUB_API-ordering gap.
   - `@sdlcforge/dev-core`'s `work` component's `appExt:serverConfigRoot @ load` requirement, expected to resolve `satisfied` against the framework's intrinsic manifest. This is the third-party half of `ynGa`.

4. Record the validator's own stated coverage boundary (what it validated — `builtinPlugins` plus the Server Package Root — versus what it does not see, e.g. `dynamicPluginInstallDir`/`pluginPaths`) as part of the captured evidence.

5. Note, but do not treat as blocking, any other finding the same run surfaces inside `@sdlcforge/dev-core`'s `orgs` or `projects-audit` components — e.g. a requirement tracing to a package outside `core-server`'s own plugin set entirely (such as `liq-policy`). Those are `@sdlcforge/dev-core`'s own concern, outside this plan-group's `plans: {core-server: ...}` participant set per [`plan/notes/manifest-ownership-boundary.md`](../notes/manifest-ownership-boundary.md).

6. **If either of the two target edges (step 3) does not resolve as expected** — reports `unsatisfied`, `unsatisfied-phase`, `order-unprovable`, or any verdict other than `satisfied`/`satisfied-by-source-order` — **halt and report** rather than working around it. This would mean the ownership-boundary analysis in `manifest-ownership-boundary.md` was wrong about the mechanism closing the gap automatically, and reopens the four-option decision (A–D) that document originally laid out. Do not attempt to author a workaround declaration in `core-server`'s own manifest for a third-party package's `requires` — the upstream contract has no host-sited affordance for that, which is the whole reason this was a scope question in the first place.

7. Leave the literal captured evidence (validator output, or a faithful transcript of it) somewhere the next task (`002-record-third-party-coverage-outcome.md`) can read it — either in this task's own commit message/PR description, a scratch note under `plan/resources/`, or directly quoted in this task document's own `## Validation` section below once you fill it in. Do not lose the literal verdict strings; task 002 depends on them.

## Validation

- The validator ran successfully (exit `0` or `1` — a clean or a validation-failure result, both legible; exit `2` — resolution failure — means something else is wrong and should be diagnosed, not treated as a pass/fail verdict for the two target edges).
- Both target edges (step 3 above) are confirmed `satisfied`/`satisfied-by-source-order`, with the literal verdict text captured.
- The coverage-boundary statement from the validator's own output is captured.
- Any unrelated findings inside `orgs`/`projects-audit` are noted, with a one-line rationale for why they are out of scope (per step 5).

## Assumptions

- Phases 1 and 2 have already landed: the `plugable.host` block exists, `verifyHostDeclaration()` is wired, and `src/credentials/` declares `appExt:credentialsDB @ load`.
- `.yalc/` is populated in this task's worktree (provisioned per `create-worktree.sh --no-install-deps` + `scripts/provision-local-deps.sh`, per this plan's hard constraints in `plan/overview.md`).
- This task does not modify `core-server`'s own `package.json` `"plugable"` block — Phases 1 and 2 own that, and this task's job is verification only.

## References

- [`plan/phases/third-party-coupling-coverage.md`](../phases/third-party-coupling-coverage.md) — this phase's re-scoped goals, inputs, and outputs.
- [`plan/notes/2026-09-01-blocker-reverification.md`](../notes/2026-09-01-blocker-reverification.md) — the finding that re-scoped this phase, with the concrete command sequence for the dependency refresh and its verification.
- [`plan/notes/manifest-ownership-boundary.md`](../notes/manifest-ownership-boundary.md) — the original ownership-boundary analysis and the four-option decision this verification either confirms moot or reopens.
- [`plan/notes/build-wiring-and-dependency-refresh.md`](../notes/build-wiring-and-dependency-refresh.md) — the `packageRoot` hazard and the validator's exit-code contract.
- `/Users/zane/playground/sdlcforge/dev-core/package.json`'s `"plugable"` block — the real, shipped manifest this task verifies against (reference only; not modified by this task).
