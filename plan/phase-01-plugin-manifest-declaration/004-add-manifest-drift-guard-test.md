# Add Manifest Drift Guard Test

## Purpose and scope

Add a dev-core-owned Jest suite that asserts the authored manifest against `plugable-express`'s real, current capability surface — so a future framework-side rename (the exact bug class this plan exists to catch) fails dev-core's own CI, rather than waiting for a downstream host's gate to notice.

**There is no plugin-side equivalent of `verifyHostDeclaration()`, and none should be invented.** That helper cross-checks a *host's* declared `plugable.host.builtins` against its real `builtinPlugins` array; a plain plugin has neither. What *is* available — and is a better-targeted guard than the host-side check, not a weaker substitute — is a composition of four published exports of `@liquid-labs/plugable-express`: `resolvePluginManifest`, `validatePluginGraph`, `PHASE_ORDER`, and `FRAMEWORK_MANIFEST`.

Scope is one new test file plus whatever minimal helper it needs. No change to any existing source module, no change to the `"plugable"` block, no change to build config.

## Requirements

### What the suite asserts

Three assertions, in increasing strength:

1. **The manifest parses.** `resolvePluginManifest({ dir, pkg })` over dev-core's own `package.json` returns exactly four normalized records whose `component` names are `projects`, `orgs`, `work`, `projects-audit`, **in that order**. This alone catches a malformed, truncated, or accidentally-deleted block, and catches a `components:` reorder that no longer matches `src/index.mjs`.

2. **Framework-facing requirements are satisfied against the framework's real surface.** Feed dev-core's records plus `FRAMEWORK_MANIFEST` into `validatePluginGraph()` and assert that every requirement whose provider is `@liquid-labs/plugable-express` itself resolves satisfied. `FRAMEWORK_MANIFEST` is verified by `plugable-express`'s own self-consistency test against its real booted source, so this asserts dev-core's framework-facing couplings against the framework's *actual* current capability surface — which is what makes a future `serverConfigRoot`-style rename fail here.

   The capabilities in this set, per the census: `appExt:serverConfigRoot`, `appExt:constants`, `appExt:setupMethods`, `appExt:integrations`, and `setupArg:registerPathVar`.

3. **Intra-package edges are satisfied.** The same graph result must show dev-core's own component-to-component requirements satisfied — `appExt:_liqProjects.playgroundMonitor` (required by `orgs` at `setup` and `projects-audit` at `runtime`, provided by `projects` at `load`), `pathVar:projectName` (required by `projects-audit` at `handlers`), and `pathVar:parameterKey` (same-plugin, `handlers`/`handlers`). These are provable from the declared `components:` order, which is exactly what the `components:` form exists to make possible.

### The critical scoping rule

**Do not assert that the overall graph result is clean.** Requirements whose providers live outside dev-core will legitimately report unsatisfied against a dev-core-plus-framework graph:

- `appExt:credentialsDB` — provided by `@sdlcforge/core-server`'s in-tree `src/credentials/` component, which is unmanifested today.
- `appExt:_liqOrgs.orgSetupMethods` — written by `liq-policy`, outside dev-core.
- `integrationHook:controls/getQuestionControls` — declared `optional: true`, so it reports at `info` severity.

An overall-clean assertion would either fail immediately or force someone to suppress exactly the cross-package gap this plan wants left visible. **Scope the assertions to the framework-provided and intra-package capability sets named above**, enumerated explicitly in the test rather than derived by exclusion — and add a comment in the test saying why the out-of-package requirements are deliberately not asserted, so a future reader does not "fix" the test by tightening it.

A second, weaker assertion is worth adding alongside: that the out-of-package unsatisfied set is *exactly* the expected three capabilities above and nothing else. That turns an accidental new external coupling into a test failure without asserting the graph is clean.

### Placement and toolchain fit

- Place the suite where dev-core's existing test convention puts one — alongside the code it covers, matching the `src/**/test/` and `*.test.mjs` patterns already in the tree. Because the manifest is a package-level artifact rather than a submodule's, a top-level location such as `src/test/plugin-manifest.test.mjs` is the natural fit; confirm against `make/20-js-src-finder.mk`'s `SDLC_TEST_SELECTOR` (`\( -name "*.test.*js" -o -path "*/test/*" \)`) that whatever path you choose is actually collected.
- **The toolchain hazard to respect:** Babel transpiles `src/**/*.mjs` into `test-staging/**/*.js` **without rewriting import specifiers**. `src/index.mjs`'s own comments record the consequence — an explicit `.mjs` specifier resolves under Rollup but not under Jest, which is why the aggregator uses extensionless directory imports. Follow the same rule in this test for any intra-repo import.
- The test reads `package.json` from the repository root. Under Jest the working directory is `test-staging/`, so resolve the path deliberately (walk up from the test's own location, or use an explicit relative path) rather than assuming `process.cwd()` is the repo root. Verify empirically; do not guess.
- `@liquid-labs/plugable-express` is a `devDependency` after task 001, which is correct for a test-only import. **Do not** import it from any non-test module, and do not promote it to `dependencies`.

### Hard constraints

- **Runtime-inert.** Do not modify `src/index.mjs`, any submodule `setup.mjs` or handler, the composite setup order, module exports, or route registration. A new test file under `src/` is compiled into `test-staging/` and excluded from the Rollup bundle by `make/20-js-src-finder.mk`'s `SDLC_TEST_SELECTOR`; confirm `dist/dev-core.js` is byte-unaffected apart from any unrelated build nondeterminism.
- **Do not modify `@liquid-labs/plugable-express` or `@sdlcforge/core-server`.**
- **Do not modify `plan/followups.yaml`.**
- **Do not touch, fix, or work around `src/projects/handlers/_lib/test/project-lifecycle.test.mjs`.** It is known-red at baseline (followup `2aMD`) and out of scope, however tempting it is given that it fails on the very `serverHome`/`serverConfigRoot` mismatch this task's suite guards against.

## Validation

- The new suite passes in isolation: `make test TEST=<path-to-the-new-suite>` is green.
- **The suite genuinely guards.** Prove it with a temporary, reverted mutation — e.g. change one declared phase in the `"plugable"` block, or rename a capability string, and confirm the suite fails; then revert and confirm it passes again. A guard nobody has seen fail is not a guard. Record the mutation used and its observed failure in the task report.
- The suite does **not** assert an overall-clean graph, and carries an in-file comment explaining why the out-of-package requirements are deliberately unasserted.
- `make build` succeeds; `dist/dev-core.js` still exports both `handlers` and `setup`.
- **Baseline comparison, required for this task specifically** — it is the only task in the plan that adds executing code. Capture the full-suite failure list *before* the change (`make test 2>&1 | tee` a before-file) and *after*, and confirm the two are identical apart from the added passing suite. `make test` / `make qa` are known-red at baseline; the pre-existing `project-lifecycle.test.mjs` failure must still be present and unchanged afterward, and must not have been incidentally "fixed."
- `git diff --stat` shows only the new test file (plus any minimal helper it required). No existing `src/` module is modified.

## Assumptions

- Tasks 001 and 002 have landed: `@liquid-labs/plugable-express` is installed as a `devDependency`, and `package.json` carries a four-component `"plugable"` block.
- `validatePluginGraph` accepts a records array plus the framework record in a shape this test can construct without importing anything private. If its actual signature turns out to require a resolver-shaped input the test cannot reasonably build, **halt and report** rather than reaching into `src/lib/plugin-graph/` internals or reimplementing satisfaction logic locally — assertion 1 alone still has real value, and the manager should decide whether to ship the reduced guard.
- Task 003 may run concurrently with this task. If 003's reconciliation changes the `"plugable"` block, re-run this suite afterward.

## References

- [manifest scope and tooling](../notes/manifest-scope-and-tooling.md) — the finding that no plugin-side `verifyHostDeclaration()` equivalent exists, the four exports that compose into a better-targeted guard, and the scoping rule above.
- [capability census](../notes/capability-census.md) — the framework-provided, intra-package, and out-of-package capability sets the assertions enumerate.
- `@liquid-labs/plugable-express`'s `src/index.js` — the published export surface (`resolvePluginManifest`, `validatePluginGraph`, `PHASE_ORDER`, `FRAMEWORK_MANIFEST`). Read-only reference.
- `src/index.mjs`'s header comments and `docs/dev-core-consolidation-contract.md`'s [absorption recipe](../../docs/dev-core-consolidation-contract.md#absorption-recipe) — the extensionless-import rule and the Babel/Jest specifier hazard behind it.

## Checkpoint hints

- After assertion 1 (manifest parses to four ordered records) passes.
- After assertions 2 and 3 (framework-facing and intra-package satisfaction) pass with the scoping comment in place.
- After the deliberate-mutation proof that the guard actually fires.

## Status

**Outcome: succeeded.** Date: 2026-09-01.

Added [`src/test/plugin-manifest.test.mjs`](../../src/test/plugin-manifest.test.mjs) — the only file changed (`git diff --stat` against the task's start commit shows exactly this one file, 140 insertions; `src/` otherwise untouched). It composes `resolvePluginManifest`, `validatePluginGraph`, and `FRAMEWORK_MANIFEST` from `@liquid-labs/plugable-express` (a `devDependency`, imported only from this test):

- Assertion 1: `resolvePluginManifest({ dir, pkg })` returns exactly four records, `component` order `projects`, `orgs`, `work`, `projects-audit`.
- Assertion 2: every framework-facing requirement (`appExt:serverConfigRoot` ×2, `appExt:constants`, `appExt:setupMethods`, `appExt:integrations`, `setupArg:registerPathVar` ×3) resolves satisfied.
- Assertion 3: every intra-package requirement (`appExt:_liqProjects.playgroundMonitor` ×3, `pathVar:projectName`, `pathVar:parameterKey` same-plugin handlers/handlers) resolves satisfied.
- Scoping rule: the suite explicitly asserts `result.ok === false` and that the unsatisfied-findings set is *exactly* the three expected out-of-package capabilities (`appExt:credentialsDB` ×2, `appExt:_liqOrgs.orgSetupMethods`, plus the one `info`-severity optional `integrationHook:controls/getQuestionControls`) — never an overall-clean graph — with an in-file comment explaining why, per the task's hard scoping rule.

### Correction to the task doc's requirement 2, applied per dispatch guidance

The task doc's literal text says to "feed dev-core's records plus `FRAMEWORK_MANIFEST` into `validatePluginGraph()`." Empirically confirmed (and consistent with task 002's own report) that `validatePluginGraph({ records })` already implicitly folds `FRAMEWORK_MANIFEST` in — passing it a second time, concatenated into `records`, duplicates the framework node and produces ~18 spurious `exclusivity-disagreement` errors. The suite calls `validatePluginGraph({ records })` with only dev-core's own four records, and asserts the implicit fold-in directly (a dedicated test confirms the framework node appears in `result.nodes` even though it is never in `records`). This is recorded here since it corrects the task doc's own wording, not because a followup is required.

### Mutation proof that the guard actually fires

Temporarily renamed `work`'s `appExt:serverConfigRoot` requirement (in `package.json`'s `"plugable"` block) to `appExt:serverConfigRootMUTATED`, re-ran `make test TEST=test/plugin-manifest.test.js`: the suite went from 17/17 passing to 1 failing (`the unsatisfied set is exactly the three expected out-of-package capabilities, nothing else` — the findings list gained an unexpected fourth error, `appExt:serverConfigRootMUTATED <- @sdlcforge/dev-core#work@load (error)`, matching the exact `serverConfigRoot`-rename bug class this plan exists to catch). Reverted the mutation; `git diff --stat -- package.json` returned empty and the suite passed 17/17 again.

### Baseline comparison

Force-cleaned `test-staging`/`qa` (mtime-gated `make` otherwise silently reuses stale compiled output after a source file is removed/restored) and ran full `make test` both without and with the new test file:

- Before (new test file removed from the working tree): 14 suites (13 passed, 1 failed), 82 tests (75 passed, 7 failed).
- After (new test file restored): 15 suites (14 passed, 1 failed), 99 tests (92 passed, 7 failed) — 99 = 82 + 17 (the new suite).
- The 7 failing test names are byte-identical in both runs, all in `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` (followup `2aMD`, the known-red `serverHome`/`serverConfigRoot` mismatch) — untouched, not incidentally fixed, not newly broken.

### Validation results

| Check | Result |
|---|---|
| `make test TEST=test/plugin-manifest.test.js` green | passed — 17/17 |
| Guard genuinely guards (mutation-and-revert proof) | passed — see above |
| No overall-clean assertion; in-file scoping comment present | passed |
| `make build` succeeds; `dist/dev-core.js` exports `handlers` (58 entries, array) and `setup` (function) | passed |
| Baseline comparison (before/after full-suite failure lists identical apart from the added suite) | passed |
| `git diff --stat` shows only the new test file | passed |

### Assumptions applied

- Tasks 001 and 002 had landed before this task started (confirmed: `@liquid-labs/plugable-express@^1.0.0-alpha.59` is an installed `devDependency`, and `package.json` carries the four-component `"plugable"` block from task 002).
- Task 003 (validate manifest against source) was running concurrently in a sibling worktree against the same plan branch; this task's own worktree's `"plugable"` block was not observed to change during this task's execution (confirmed via `git status`/`git diff` immediately before finalizing — no incoming changes were present in this worktree at any point, since task 003 operates in its own separate worktree and had not yet been merged back to the plan branch as of this task's completion). Per the task doc's own Assumptions section, if task 003's reconciliation later changes the `"plugable"` block, this suite should be re-run — flagged for the manager below.
