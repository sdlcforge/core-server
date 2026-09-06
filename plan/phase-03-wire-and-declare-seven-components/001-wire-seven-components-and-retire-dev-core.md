# Wire Seven Components And Retire Dev-Core

## Purpose and scope

The single atomic change that moves behavior: the four components Phase 2 merged into the tree stop being loaded as the `@sdlcforge/dev-core` npm plugin and start being loaded in-tree, and all seven components are declared to the compile-time plugin manifest in DAG order. `src/lib/builtin-plugins.mjs` aggregates seven submodules, `package.json`'s `plugable.host.builtins[0].components` declares the same seven in the same order, and `@sdlcforge/dev-core` disappears from `src/lib/app-init.mjs`'s `explicitPlugins`, from `package.json`'s `plugable.host.explicitPlugins` and `dependencies`, from `scripts/provision-local-deps.sh`, and from `bun.lock`.

**These edits are one unit and must land together.** Loading a component both in-tree and through npm is a hard startup crash for anything that registers a route (`Non-unique command path`) or a path variable (`Path variable 'X' is already registered.`) — dev-core registers five path variables from `setup` plus `parameterKey` from a handler — and for `projects-audit`, which registers nothing at setup, the double load is instead *silent*. There is no intermediate state in which half of this task is correct.

This task also carries the minimum expectation updates needed to keep `src/lib/test/builtin-plugins.test.js` and `src/lib/test/host-declaration.test.js` green across the change. The new component-order assertion is task 002 and the ported donor assertions are task 003; neither is in scope here.

No standard skill covers this task; follow the [Procedure](#procedure).

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### 1. Wire seven components into `src/lib/builtin-plugins.mjs`

- Add four namespace imports alongside the three that exist, using **extensionless directory specifiers**: `import * as projects from '../projects'`, `'../orgs'`, `'../work'`, and `import * as projectsAudit from '../projects-audit'`. Each of those directories carries an `index.mjs`. Extensionless is not a style preference — Babel emits `test-staging/<component>/index.js` from an `.mjs` source without rewriting import specifiers, so an explicit `.mjs` specifier builds cleanly under Rollup and then fails module resolution under Jest.
- Namespace imports stay mandatory. Every one of the seven components exports a symbol named `setup` (except `projects-audit`, which exports none) and most export `handlers`, so a star re-export across them is an ambiguous-export collision.
- `submodules` becomes, exactly:

  ```javascript
  const submodules = [credentials, projects, orgs, controls, issuesGitHub, work, projectsAudit]
  ```

- `setup` stays a sequential `for…of` with `await`, never `Promise.all`. The ordering constraints the consolidation contract fixes (`projects` before `orgs` before `work`, `projects-audit` contributing no `setup` at all) are carried by position in this one array and by nothing else. `credentials` before `projects` joins them as a newly load-bearing constraint: `projects`' `setup()` eagerly calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })`, and until now that ordering held only because the two lived in different plugin tiers.
- **Export two new bindings** alongside the existing ones:
  - `submodules` — so a test can assert the declared-name list has exactly one entry per wired submodule. The namespace imports carry no name of their own to introspect, which is why the name list cannot be derived.
  - an ordered component-name list (suggested name `componentNames`), index-aligned with `submodules`, holding the **declared manifest component names**:

    ```javascript
    ['credentials', 'projects', 'orgs', 'controls', 'issues-github', 'work', 'projects-audit']
    ```

    Note `issues-github` deliberately differs from its directory name, `src/integrations-issues-github/`. This list is the declared-name list, not a directory list; getting it wrong here makes task 002's assertion fail against a correct manifest.
- **Correct the file's guidance comments in the same edit.** Three statements in the current header are now false and one is a standing instruction this change deliberately violates:
  - Fact 1 says "all three absorbed submodules"; there are seven. It should also record that `projects-audit` exports no `setup` at all, which is why the `setup?.()` optional call is load-bearing rather than defensive.
  - Fact 2's "Keep it stable, and add to the end rather than reordering" must be replaced. `controls` moves from first to fourth precisely so `orgs` can precede it, which is the entire mechanism by which the `violated-by-source-order` finding becomes provable rather than allowlisted. The replacement rule: the array is in dependency (DAG) order, a new component goes where its dependencies put it rather than at the end, and `package.json`'s `components` array moves with it in the same change. Leaving an instruction in the file that the file's own contents violate is worse than either alternative.
  - Fact 2's claim that "`verifyHostDeclaration()`'s Jest assertion (task 003) is the enforcement mechanism that keeps the two from silently drifting apart" is **not true** and never was. `verifyHostDeclaration()`'s order check compares `npmName` sequences across `builtinPlugins` entries, of which this host has exactly one, and its component check is a *set* comparison skipped entirely because `builtinPluginsFor()` supplies no inline `manifest` key. State the real mechanism: the ordered component-name export above, asserted element-for-element in `src/lib/test/host-declaration.test.js` (added by this phase's task 002).
- Update `summary`. It currently reads `'Built-in SDLC controls, credentials, and GitHub issues integration.'` and now describes seven components. It feeds `GET /server/plugins/list` and `app.ext.handlerPlugins`, so `test/__snapshots__/full-tier-plugins-list.json` moves — that rebaseline is Phase 4's, not this task's.

### 2. Declare the seven components in `package.json`

- Replace the three-entry `plugable.host.builtins[0].components` array with the seven-entry array, in the same order as `submodules`.
- **Copy source: [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#the-candidate-merged-manifest)'s "The candidate merged manifest" block.** That is not a projection: it was built and run through `@liquid-labs/plugable-express`'s real `validatePluginSet()`, returning `outcome: 'ok'`, `exitCode: 0`, `counts: { error: 0, warning: 0, info: 1 }`. Copy it verbatim; the `credentials`, `controls`, and `issues-github` bodies are `core-server`'s own current text, only reordered.
- **Cross-check the four absorbed bodies against dev-core's *source* declaration. Never against `node_modules/@sdlcforge/dev-core/package.json` or `.yalc/@sdlcforge/dev-core/package.json`.** Phase 2 resolved the `package.json` conflict `--ours`, so dev-core's `plugable.components` block is *not* present in the merged `package.json`; the two correct sources are:
  - the dev-core source checkout at `/Users/zane/playground/sdlcforge/dev-core/package.json` (`plugable.components`), or
  - the merge commit's second parent in this repository's own history: `git show <phase-2-merge-commit>^2:package.json`.

  The installed yalc copy differs in exactly one place, and it is exactly the place that matters: `orgs`' `requires` lacks `optional: true` on `appExt:_liqOrgs.orgSetupMethods` and lacks the two runtime requirements `appExt:_liqProjects.playgroundPath` and `appExt:_liqOrgs.orgs`. Transcribing it produces `validation-failure` with exactly one `unsatisfied` error on `appExt:_liqOrgs.orgSetupMethods`, which reads like "the plan's premise was wrong" and is in fact the [known yalc drift](../notes/pre-merge-state.md#confirmed-yalc-drift). `projects`, `work`, and `projects-audit` are byte-identical between the two copies, so `orgs` is the only body where the distinction is observable.
- Verify every `via` and `reason` string cites a path that exists in the merged tree — `src/credentials/setup.mjs`, `src/projects/setup.mjs`, `src/orgs/setup.mjs`, `src/work/setup.mjs`, `src/projects-audit/handlers/_lib/audit-lib.mjs`, and the rest. dev-core's tree already sat in its final absorbed layout, so most citations are already correct; repoint any that assumed dev-core's package root.
- Leave `plugableManifestVersion`, `providedCapabilities`, `assumeProvided`, and `searchPaths` untouched.

### 3. Remove `@sdlcforge/dev-core` completely

All five of these land with the wiring above, in the same task branch:

- `src/lib/app-init.mjs` — drop `'@sdlcforge/dev-core'` from `explicitPlugins`, leaving the four `@liquid-labs/sdlc-projects-*` packages. Extend the standing comment above that array (the one explaining why `@liquid-labs/liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` are deliberately absent) to name the four newly absorbed components and their in-tree paths `src/projects/`, `src/orgs/`, `src/work/`, `src/projects-audit/`, and to record that `projects-audit` registers neither a route conflict nor a path variable at setup, so *its* double load would be silent rather than a crash.
- `package.json` `plugable.host.explicitPlugins` — the same four. This list and `app-init.mjs`'s must agree exactly or `src/lib/test/host-declaration.test.js` fails.
- `package.json` `dependencies` — drop `"@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core"`. Dropping this alone is **not** sufficient to stop the double load: discovery is driven by `explicitPlugins` membership. Leaving the physical package in `node_modules` with both declarations gone is harmless, since dev-core declares `"keywords": []` and is never keyword-discovered.
- `scripts/provision-local-deps.sh` — drop `"@sdlcforge/dev-core"` from `REQUIRED_YALC_PACKAGES` and from the two prose blocks that name it (the header comment's "two, both direct" parenthetical and the no-`.yalc/`-found error message's package list). The script hard-fails when a required yalc package is absent, so leaving the entry makes a fresh worktree unprovisionable against a lockfile that no longer needs the link.
- `bun.lock` — regenerate with `rm -f bun.lock && bun install`, never `npm install` and never a bare `bun install` (Bun will not re-resolve a `file:` dependency's graph from a lockfile that already holds one).

Removing the `.yalc/@sdlcforge/dev-core` copy itself is optional and untracked; the tracked surface is the four files above plus `bun.lock`.

### 4. Keep the two suites that must not go red green

- `src/lib/test/host-declaration.test.js` should pass unchanged once both `explicitPlugins` lists agree. Verify; do not edit unless it genuinely needs it.
- `src/lib/test/builtin-plugins.test.js` needs adapting, because three of its existing expectations are written against three submodules:
  - `ABSORBED_SUBMODULES` grows to the seven, in the same DAG order, with its explanatory comment updated.
  - The composite-`setup` test's harness must grow. The current `app` stub is `{ ext: { setupMethods: [] } }`; the seven-component composite additionally needs `app.ext.constants` (an empty object — `work`'s setup writes `WORK_DB_PATH` into it), `app.ext.serverConfigRoot`, a `reporter` and `cache` in the forwarded `setupArgs`, and `process.env.PLUGABLE_PLAYGROUND` pointed at a temp directory for the duration, since `projects`' `setupPlayground()` otherwise defaults to `${HOME}/playground` and scans it. `src/lib/test/full-tier-baseline.test.js` and the donor's own suite (`@sdlcforge/dev-core`'s `src/test/index.test.mjs`, on dev-core's `main`) both show the working shape.
  - Change `registeredPathVars` from a `{ name: opts }` map to an **ordered array plus a separate options map**. `Object.keys()` on a map silently loses a duplicate registration, and the registration *sequence* is the one artifact that pins the runtime component order (`credential` from `credentials`, then `newProjectName`/`projectName` from `projects`, then `newOrgKey`/`orgKey` from `orgs`, then `workKey` from `work`; `parameterKey` is registered by an `orgs` handler at route-registration time, not from any `setup`, so it is deliberately absent).
  - Grow the expected `app.ext.setupMethods` list from `orgs`' three entries to include `controls`' two and `issues-github`' one, in submodule order. **Derive both adapted arrays from an actual run rather than transcribing them** — the donor suite recorded `{ name: 'load orgs', deps: undefined }` while `full-tier-baseline.test.js` records `deps: []` for the same method, and only a measured run settles which shape this harness observes.

  Scope fence: adapt the *existing* assertions only. The donor suite's additional assertions — handler-array freshness, the no-duplicate-`(method, path)` check, the four `projects-audit` routes, the `app.ext` contract-freeze checks — are task 003's.

### Out of scope

Snapshot rebaselining, `ALLOWLISTED_ERROR_FINDINGS` changes, and repointing the plugin-graph tests off `@sdlcforge/dev-core#…` node IDs are all Phase 4's. Documentation updates are Phase 6's. Do not fix inherited defects surfaced by the absorbed code.

## Validation

1. `grep -n 'file:' package.json` returns **exactly one** hit — the pre-existing `@liquid-labs/plugable-express` yalc link. Never zero, never two.
2. `grep -rn '@sdlcforge/dev-core' src/ package.json scripts/ Makefile make/` returns hits only in `src/lib/test/plugin-graph-*.test.js`, whose stale node IDs and comments are Phase 4's to repoint. Any hit in `package.json`, `src/lib/app-init.mjs`, or `scripts/` is a failure of this task.
3. `make build` is green, and `submodules` has length 7 with the exported component-name list equal, element for element, to `package.json`'s `plugable.host.builtins[0].components.map(({ component }) => component)`. Check this by hand here; the standing assertion is task 002's.
4. `make test`. These must pass, and a failure in any of them is this task's to fix: `host-declaration.test.js`, `builtin-plugins.test.js`, `app-init.test.js`, `golden-api-spec.test.js`, `index.test.js`, and `full-tier-baseline.test.js`'s **non-snapshot** assertions (`EXPECTED_SETUP_METHODS` and `EXPECTED_APP_EXT_KEYS` are both expected to be unchanged by the merge — a failure there is a real regression, not a handoff).

   These are expected to fail and are handed forward to Phase 4, which is chartered to fix exactly them: `plugin-graph-gate.test.js` (its allowlist and its recorded `'validation-failure'` / exit code `1` no longer describe a graph with zero error findings), `plugin-graph-third-party-ordering.test.js`, `plugin-graph-absorbed-donor-conflicts.test.js`, and `plugin-graph-serverconfigroot-rename.test.js` (stale `@sdlcforge/dev-core#…` node IDs), plus `full-tier-baseline.test.js`'s three JSON snapshot comparisons (`full-tier-api-spec.json`, `full-tier-plugins-list.json`, `full-tier-integrations-list.json`). **Record the exact failing set in the task report.** Any failure outside this list belongs to this task.
5. Run `validatePluginSet({ packageRoot })` against the real package root — the same invocation `src/lib/test/plugin-graph-gate.test.js` uses, via `resolveCoreServerPackageRoot` — and confirm `outcome: 'ok'`, `exitCode: 0`, `counts: { error: 0, warning: 0, info: 1 }`, the single `info` being the `unsatisfied` `appExt:_liqOrgs.orgSetupMethods` finding on `@sdlcforge/core-server#orgs`. Two failure modes are pre-diagnosed and neither is to be allowlisted:
   - **21 errors and 2 warnings** means an `explicitPlugins` entry survived (either `app-init.mjs`'s or `package.json`'s). Read it as an incomplete removal, not a wrong manifest.
   - **Exactly 1 `unsatisfied` error on `appExt:_liqOrgs.orgSetupMethods`** means the `orgs` body was transcribed from the stale `node_modules`/`.yalc` copy. Re-source it from dev-core's source declaration.
6. `bun run test:local` starts the server successfully. Against the running server, `GET /server/api` returns **165** routes with **118** attributed to `@sdlcforge/core-server` and **zero** to `@sdlcforge/dev-core`, and `GET /server/plugins/list` returns **5** entries.
7. `make lint` shows no new findings beyond the standing pre-existing ESLint baseline (~233 errors, followups `b3hk`/`mLm3`).

## Metadata

architectural_impact: true

## Assumptions

- Phase 2 has landed: `src/{projects,orgs,work,projects-audit}/` are in the tree, the dependency union is applied, `bun.lock` was regenerated, and dev-core's `src/index.mjs`, `src/test/index.test.mjs`, and `src/test/plugin-manifest.test.mjs` were removed.
- Phase 1 cleared the yalc drift, so `ALLOWLISTED_ERROR_FINDINGS` in `plugin-graph-gate.test.js` is down to its single `violated-by-source-order` entry before this task starts.
- The test failures enumerated in Validation step 4 are expected outputs of this task and are Phase 4's to resolve. They are not defects and must not be papered over here.
- ~233 pre-existing ESLint errors (`b3hk`/`mLm3`) and the `liq-handlers-lib` next-commands crash (`NEJt`) are pre-existing and out of scope.
- `test/test-basic.js`, `test/test-integration-quick.js`, and `test/README.md` carry stale expectations naming `@sdlcforge/dev-core`. None is wired into `make test`, `test-ci.sh`, or `bun run test:local`, and `test-basic.js`'s check only warns rather than exiting non-zero, so none blocks this task. Report them rather than fixing them here.

## Procedure

1. Wire `src/lib/builtin-plugins.mjs`: imports, `submodules`, the two new exports, the corrected comments, the updated `summary`.
2. Replace `package.json`'s `components` array from the note's candidate manifest; cross-check the four absorbed bodies against dev-core's source declaration, with particular attention to `orgs`' `requires`.
3. Remove `@sdlcforge/dev-core` from `package.json`'s `explicitPlugins` and `dependencies`, from `src/lib/app-init.mjs`, and from `scripts/provision-local-deps.sh`; then `rm -f bun.lock && bun install`.
4. Adapt `src/lib/test/builtin-plugins.test.js`'s existing expectations and harness; derive the two adapted arrays from a real run.
5. Run the full validation sweep and record the expected-versus-unexpected failure split for the report.

## Checkpoint hints

These are intra-branch checkpoints only. The branch merges as one unit; no intermediate commit here is separately mergeable, because a half-applied change double-loads four components.

- After the `src/lib/builtin-plugins.mjs` rewrite.
- After the `package.json` manifest declaration.
- After the `app-init.mjs` / `package.json` / `provision-local-deps.sh` removals and the lockfile regeneration.
- After `src/lib/test/builtin-plugins.test.js` is green again.

## References

- [`plan/phases/wire-and-declare-seven-components.md`](../phases/wire-and-declare-seven-components.md) — the phase this task carries most of; goals 1 through 5.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the measured `validatePluginSet()` result, the verbatim candidate manifest that is this task's copy source, the 5040-permutation sweep, and both pre-diagnosed failure modes.
- [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — why the DAG order is what it is, what each position is load-bearing for, and why the existing drift guard does not check what its comment claims.
- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md#confirmed-yalc-drift) — the yalc drift that makes the stale-copy failure mode look like a merge problem.
- [`plan/notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md#4-disposition-of-dev-cores-package-level-tests) — why `builtin-plugins.test.js` is the home for the aggregate assertions rather than a reconstituted `src/test/` tree.
- `/Users/zane/playground/sdlcforge/dev-core/package.json` — the source-checkout `plugable.components` array; the authoritative cross-check for the four absorbed component bodies.
