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

## Status

**Outcome:** succeeded (2026-09-02). Verification-only; no `package.json`/`"plugable"` block was touched.

**Requirement 1 (dependency prerequisite re-check):** both checks passed fresh in this worktree —
- `node -e "const m = require('@liquid-labs/plugable-express'); console.log('validatePluginSet' in m)"` → `true`
- `grep -q '"plugable"' node_modules/@sdlcforge/dev-core/package.json` → present

**Requirement 2 (run the validator):** ran `validatePluginSet({ packageRoot: process.cwd() })` (repo root, not `test-staging/`) via a throwaway script committed as evidence at [`plan/resources/validate-check.mjs`](../resources/validate-check.mjs), with full raw output captured at [`plan/resources/validator-output.json`](../resources/validator-output.json). Top-level result: `"outcome": "validation-failure"`, `"exitCode": 1` — a legible, non-crashing result per this task's own `## Validation` contract (exit `0`/`1` both legible; only exit `2` — resolution failure — would need separate diagnosis, and did not occur).

**Requirement 3 (the two target edges) — both confirmed satisfied:**

1. `@sdlcforge/dev-core#projects` requires `appExt:credentialsDB @ load` (the GITHUB_API-ordering gap's requiring side). Matched edge in the validator's raw `engineResult.edges`:
   ```json
   {
     "from": "@sdlcforge/core-server#credentials",
     "to": "@sdlcforge/dev-core#projects",
     "capability": "appExt:credentialsDB",
     "samePhase": true,
     "providerPhase": "load",
     "requirerPhase": "load",
     "optional": false,
     "orderVerdict": "satisfied-by-source-order"
   }
   ```
   Literal verdict: `"satisfied-by-source-order"` — matches the task doc's expected verdict exactly.

2. `@sdlcforge/dev-core#work` requires `appExt:serverConfigRoot @ load` (`ynGa`'s third-party half). Matched edge:
   ```json
   {
     "from": "@liquid-labs/plugable-express",
     "to": "@sdlcforge/dev-core#work",
     "capability": "appExt:serverConfigRoot",
     "samePhase": false,
     "providerPhase": "framework",
     "requirerPhase": "load",
     "optional": false,
     "orderVerdict": null
   }
   ```
   Note on literal text for this one: the validator's schema only writes a string `orderVerdict` (`satisfied-by-source-order`, `satisfied-by-setup-queue-simulation`, `violated-by-source-order`, etc.) when the provider and requirer share the same phase and an order check is meaningful. Here `samePhase: false` (provider is at the `framework` phase, which unconditionally precedes every plugin phase including `load`), so no order-check literal applies — the field is `null` by schema design, not a failure marker. Satisfaction is confirmed by two facts taken together, both checked directly against the raw output: (a) the edge exists at all — plugable-express's framework manifest is a recognized provider for this exact capability/phase pair, appearing in `engineResult.nodes` as `"nodeId": "@liquid-labs/plugable-express", "source": "framework", "manifested": true`; (b) `engineResult.findings` (the complete list of every error/warning/info/debug the run produced) contains no entry naming `appExt:serverConfigRoot` or `@sdlcforge/dev-core#work` as `unsatisfied`, `unsatisfied-phase`, or `order-unprovable` — the only two `error`-severity findings in the whole run concern an unrelated capability (`_liqOrgs.orgSetupMethods`) and an unrelated order violation between `@sdlcforge/core-server#controls` and `@sdlcforge/dev-core#orgs`; see below. No verdict other than satisfaction was reported for this edge, so Requirement 6's halt condition does not apply, but the exact string differs from a literal `"satisfied"` token and that distinction is recorded here verbatim rather than papered over, since task 002 depends on reading it precisely.

**Requirement 4 (coverage-boundary statement):** captured verbatim from the run's `coverage` object (full text in `validator-output.json`):
- `sourcesSearched`: `["builtin", "serverPackageRoot"]` (searched); `outOfScope`: `["dynamicPluginInstallDir", "pluginPaths"]`.
- Note field, quoted exactly: `"'dynamicPluginInstallDir' and 'pluginPaths' (the runtime options, distinct from a host-declared 'searchPaths' entry) are outside this gate's guarantee - a plugin loaded only from one of those sources at runtime is not accounted for here."`

**Requirement 5 (unrelated `orgs`/`projects-audit` findings, noted not blocking):** the run's only two `error`-severity findings, both inside `@sdlcforge/dev-core`'s `orgs` component and both out of this plan-group's `plans: {core-server: ...}` participant set per `manifest-ownership-boundary.md`:
1. `[unsatisfied]` — `@sdlcforge/dev-core#orgs` requires `appExt:_liqOrgs.orgSetupMethods @ setup`, with no candidate provider; dev-core's own manifest comment traces this array's population to `liq-policy`, a package entirely outside `core-server`'s plugin set — exactly the "traces to a package outside core-server's own plugin set" example this task's Requirement 5 names.
2. `[violated-by-source-order]` — `@sdlcforge/core-server#controls` requires `appExt:_liqOrgs.orgs` from `@sdlcforge/dev-core#orgs` at the same phase (`setup`), but `dev-core#orgs` (source `serverPackageRoot`, load position 5) loads after `core-server#controls` (source `builtin`, load position 0). This is a load-order question between an in-tree builtin and dev-core's own `orgs` component; it does not touch either of this task's two target edges (`projects`/`credentialsDB` or `work`/`serverConfigRoot`) and is `@sdlcforge/dev-core`'s own concern per the same ownership-boundary rationale.

Four further `debug`-severity findings note the four `sdlc-projects-*` packages as unmanifested nodes — expected, pre-existing, and covered by the coverage-boundary statement above, not new to this task.

**Requirement 6 (halt condition):** did not trigger. Neither target edge reported `unsatisfied`, `unsatisfied-phase`, `order-unprovable`, or any verdict other than `satisfied`/`satisfied-by-source-order` (see Requirement 3 above for the literal-text caveat on the second edge, which is a schema-representation nuance, not a reported failure verdict).

**Requirement 7 (evidence left for task 002):** the throwaway script and its full raw JSON output are committed at `plan/resources/validate-check.mjs` and `plan/resources/validator-output.json`; this `## Status` section quotes the load-bearing excerpts directly.

Affected files: this task document (`## Status` addition), `plan/resources/validate-check.mjs` (new), `plan/resources/validator-output.json` (new). No source file under `src/` and no `package.json` `"plugable"` block were modified.
