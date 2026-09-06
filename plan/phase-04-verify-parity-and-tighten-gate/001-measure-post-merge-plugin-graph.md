# Measure Post-Merge Plugin Graph

## Purpose and scope

The phase's preflight. Before any snapshot is rewritten or any assertion is loosened, confirm that Phase 3 actually landed what Phase 4 assumes it landed, then run the real `validatePluginSet()` once and record the exact result at every severity.

This task exists because two distinct, *measured* failure modes produce error findings that look merge-caused and are not. Both are recorded in [`notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#two-failure-modes-the-verification-phase-must-distinguish). If either is present, the correct response is to halt and report an incomplete Phase 3 — **not** to re-allowlist a finding, and **not** to conclude the merge's premise was wrong. Catching that here, once, keeps tasks 002/003/004 from each rediscovering it and from baking a wrong result into a snapshot or an assertion.

Changes no source file. Produces a measurement record only.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### 1. Provision dependencies

Dependencies are not installed in a fresh worktree. Run `scripts/provision-local-deps.sh` before anything else. Do **not** run a bare `bun install` after any yalc operation — this project's documented procedure is `rm -f bun.lock && bun install` (`AGENTS.md`/`CLAUDE.md`), and `finalize-task-commit.sh`'s yalc-override guard refuses to commit `bun.lock` (followups `Z2Ar`, `xsRt`, `K3cL`). This task should need no lockfile change at all; if it does, that is a finding to report, not a change to land.

### 2. Hazard A — `@sdlcforge/dev-core` must be gone from `explicitPlugins` *and* `dependencies`

Discovery is driven by `explicitPlugins` membership, not by `dependencies`. Removing the dependency alone leaves the package discovered and every absorbed capability provided twice. Confirm all of the following return no live reference:

```bash
grep -n 'dev-core' package.json
grep -n 'dev-core' src/lib/app-init.mjs
```

Both must be clean of any live `explicitPlugins` entry, `dependencies` entry, or `plugable.host.explicitPlugins` entry. A historical comment is acceptable; a live declaration is not. `explicitPlugins` must list exactly the four `@liquid-labs/sdlc-projects-*` packages.

The physical package may remain in `node_modules` — `@sdlcforge/dev-core` declares `"keywords": []`, so it is never keyword-discovered, and leaving it installed while both declarations are gone is harmless.

**Failure signature.** If this hazard is present the validator returns `validation-failure` with **21 errors and 2 warnings**: 18 `conflict` findings over 15 distinct capabilities, 1 `cycle` (`@sdlcforge/core-server#orgs` ↔ `@sdlcforge/dev-core#orgs` over `pathVar:parameterKey` at the `handlers` phase), a re-appearing `violated-by-source-order` on `appExt:_liqOrgs.orgs`, an `unsatisfied` on `appExt:_liqOrgs.orgSetupMethods` naming `@sdlcforge/dev-core#orgs`, and 2 `order-unprovable` warnings on `pathVar:parameterKey`. Read that as "the `explicitPlugins` entry was not removed", halt, and report.

### 3. Hazard B — the seven component bodies must carry dev-core's *source* declarations

The `.yalc`/`node_modules` copy of `@sdlcforge/dev-core` is stale relative to dev-core's own `main` HEAD, in exactly one place: the `orgs` component's `requires`. An implementer who transcribed the component bodies from `node_modules/@sdlcforge/dev-core/package.json` rather than from `/Users/zane/playground/sdlcforge/dev-core/package.json` reproduces that drift.

Inspect `package.json`'s `plugable.host.builtins[0].components[]` entry for `orgs` and confirm its `requires` array contains **all three** source-only markers:

- `appExt:_liqOrgs.orgSetupMethods` carrying `"optional": true`;
- `appExt:_liqProjects.playgroundPath` at phase `runtime`;
- `appExt:_liqOrgs.orgs` at phase `runtime`.

The stale copy lacks all three. Compare the merged `orgs` body directly against dev-core's source checkout (`/Users/zane/playground/sdlcforge/dev-core/package.json`, branch `main`) rather than eyeballing it. `projects`, `work`, and `projects-audit` were confirmed byte-identical between the two copies, so `orgs` is the only body this check needs to be careful about — but confirm the other three match their source anyway, since that is one cheap `diff` per component.

**Failure signature.** If this hazard is present the validator returns `validation-failure` with **exactly 1 error**: `unsatisfied` / `appExt:_liqOrgs.orgSetupMethods` / `@sdlcforge/core-server#orgs`. Note the trap: the *node ID is the same one the predicted `info` finding names*. The distinguishing feature is **severity**, `error` versus `info`, and it is caused solely by the missing `"optional": true`. The fix is to re-source the block from dev-core's source tree, not to re-allowlist the finding. Halt and report.

### 4. Measure the graph and compare against the prediction

Run `validatePluginSet()` once against the real package root and record the complete result. Any of these invocation shapes is fine as long as `packageRoot` is the real repository root, not `process.cwd()`:

```javascript
const { validatePluginSet } = require('@liquid-labs/plugable-express')
const result = await validatePluginSet({ packageRoot : '<abs repo root>' })
```

Record, verbatim: `outcome`, `exitCode`, `counts`, every entry of `engineResult.findings` at every severity (including `debug`), the resolved node ID list with `loadIndex` values, the total edge count, and `coverage.sourcesSearched` / `coverage.outOfScope`.

Compare against the measured prediction in [`notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#full-post-merge-finding-set-all-severities):

| Observable | Predicted |
| --- | --- |
| `outcome` | `'ok'` |
| `exitCode` | `0` |
| `counts` | `{ error: 0, warning: 0, info: 1 }` |
| Total findings | 5 — 1 `info`, 4 `debug` |
| The `info` finding | `unsatisfied` / `appExt:_liqOrgs.orgSetupMethods` / `@sdlcforge/core-server#orgs` |
| The 4 `debug` findings | `unmanifested-node` on each `@liquid-labs/sdlc-projects-*` explicit plugin |
| Resolved nodes | 12 — framework + 7 builtin at contiguous `loadIndex` 0–6 + 4 `serverPackageRoot` |
| Builtin order | `credentials, projects, orgs, controls, issues-github, work, projects-audit` |
| Edges | 42 |
| `coverage.sourcesSearched` | `['builtin', 'serverPackageRoot']` |

`debug` findings appear in `findings` but are **not** tallied in `counts`; a `counts` of `{ error: 0, warning: 0, info: 1 }` alongside 5 total findings is correct, not a contradiction.

Do **not** enable `strictOptional: true`. It was measured and it *fails* (`{ error: 1 }`, the `orgSetupMethods` info promoted). `strictOrder: true` was measured as still `ok` and is a genuine free improvement, but adopting it is not in this phase's outputs — if you think it is worth taking, flag it for the manager rather than landing it.

### 5. Write the measurement record

Write the recorded result to `plan/resources/post-merge-graph-measurement.md` in the plan worktree (`/Users/zane/playground/sdlcforge/core-server/worktrees/plan/sdlc-core-unification/`), alongside Phase 1's parity contract and baseline artifact. Tasks 002, 003, and 005 read it. It must contain the verbatim finding set (all severities), the node/edge/coverage figures, and an explicit statement of which of the three outcomes was observed: prediction matched, hazard A, or hazard B.

## Validation

1. `grep -n 'dev-core' package.json src/lib/app-init.mjs` shows no live `explicitPlugins`, `dependencies`, or `plugable.host.explicitPlugins` entry; `explicitPlugins` lists exactly the four `@liquid-labs/sdlc-projects-*` packages.
2. The merged `orgs` component's `requires` carries `"optional": true` on `appExt:_liqOrgs.orgSetupMethods`, plus the `appExt:_liqProjects.playgroundPath` and `appExt:_liqOrgs.orgs` runtime requirements; a `diff` against `/Users/zane/playground/sdlcforge/dev-core/package.json`'s corresponding block is recorded.
3. `validatePluginSet()` returns `outcome: 'ok'`, `exitCode: 0`, `counts: { error: 0, warning: 0, info: 1 }`, with 5 total findings matching the predicted set exactly.
4. Seven builtin nodes resolve at contiguous `loadIndex` 0–6 in the declared DAG order.
5. `plan/resources/post-merge-graph-measurement.md` exists in the plan worktree and records the full finding set verbatim plus the matched/hazard-A/hazard-B verdict.
6. `git status` shows no modification to any tracked source file, `package.json`, or `bun.lock` — this task measures, it does not change.

## Assumptions

- Phase 3 has landed: seven components wired in `src/lib/builtin-plugins.mjs` and declared in `package.json`, `@sdlcforge/dev-core` removed from both `explicitPlugins` and `dependencies`.
- `make test` is **not** green at task start. `full-tier-baseline.test.js` fails against stale snapshots (task 002 rebaselines them), and `plugin-graph-gate.test.js` fails because its allowlist expects findings that no longer exist (task 003 deletes it). Both are expected; do not fix them here.
- `make lint` is **not** green and has not been for the life of this plan: 233 pre-existing ESLint errors across 5 files under `test/`, byte-identical to `main` (followups `b3hk`, `mLm3`). Out of scope.

## References

- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the measured prediction this task checks against, the candidate manifest verbatim, and both hazard signatures with their full breakdowns.
- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md#confirmed-yalc-drift) — the confirmed yalc drift hazard B reproduces.
- [`plan/phases/verify-parity-and-tighten-gate.md`](../phases/verify-parity-and-tighten-gate.md) — the phase this task opens; goal 3 states both hazards.
- `src/lib/test/helpers/resolve-plugin-set.mjs` — the `packageRoot` resolution the existing gate tests use; the same `process.cwd()` hazard applies to any ad-hoc harness written here.
