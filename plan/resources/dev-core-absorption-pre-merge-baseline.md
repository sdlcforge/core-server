# Dev-Core Absorption Pre-Merge Baseline

## Purpose and scope

The durable, pre-merge observable baseline for the real, full explicit-plugin tier `src/lib/test/full-tier-baseline.test.js` already exercises, captured as it stands **after** phase-01 tasks 001 (npm-toolkit call-site rename fix) and 002 (dev-core yalc-snapshot refresh, `plugin-graph-gate.test.js` allowlist trim) have landed on this branch. This is the pre-merge counterpart to `plan/notes/merged-manifest-graph-projection.md`'s post-merge projection: task 004's parity contract, and Phase 4's verification, read both to know exactly what the manifest merge is predicted to change.

Captured on 2026-09-06, against commit `6521f80` (branch `plan/sdlc-core-unification-01-003`).

All observables below are restatements or direct captures of what the checked-in test harnesses (`full-tier-baseline.test.js`, `plugin-graph-gate.test.js`) already assert or what a fresh, ad hoc invocation in this same style produces — nothing here was inferred without a concrete command or file backing it.

## 1. Setup-method `{name, deps}` pairs

Copy-forward of `full-tier-baseline.test.js`'s own `EXPECTED_SETUP_METHODS` array (sorted by `name`), which `bun run test` confirms (Requirement/Validation item 2 below) still passes unchanged against the live `app.ext.setupMethods` produced by `appInit()` for the real, full explicit-plugin tier:

| name | deps |
|---|---|
| `load controls integrations` | `['setup integrations']` |
| `load org controls` | `['load orgs']` |
| `load orgs` | `[]` |
| `prepare org dependencies` | `['!']` |
| `process org setup` | `['*']` |
| `register github issues integrations` | `['setup integrations']` |
| `setup integrations` | `[]` |

## 2. `app.ext` key set

Copy-forward of `full-tier-baseline.test.js`'s own `EXPECTED_APP_EXT_KEYS` array (sorted), likewise confirmed still passing against the live `Object.keys(app.ext)`:

```text
_liqOrgs
_liqProjects
commandPaths
constants
credentialsDB
dynamicPluginInstallDir
errorsEphemeral
errorsRetained
handlerPlugins
handlers
integrations
localSettings
name
pendingHandlers
serverConfigRoot
serverSettings
serverVersion
setupMethods
teardownMethods
version
```

## 3. Registered path-variable set

`registerPathVar()`'s own registry is private to `@liquid-labs/plugable-express` and is not exposed on `app.ext`, so per the task's accepted derivation method, the practical proxy is the distinct `:paramName` segments across every route's `path` array in the checked-in `test/__snapshots__/full-tier-api-spec.json` snapshot (165 routes total, same `appInit()` configuration `full-tier-baseline.test.js` exercises).

Derivation command:

```bash
node -e "
const fs = require('fs');
const spec = JSON.parse(fs.readFileSync('test/__snapshots__/full-tier-api-spec.json', 'utf8'));
const paramSet = new Set();
for (const route of spec) {
  const paths = Array.isArray(route.path) ? route.path : [route.path];
  for (const p of paths) {
    if (typeof p !== 'string') continue;
    const matches = p.match(/:[A-Za-z0-9_]+/g) || [];
    for (const m of matches) paramSet.add(m.slice(1));
  }
}
console.log(JSON.stringify([...paramSet].sort(), null, 2));
"
```

Result — 9 distinct path variables observable via route paths:

```text
credential
errorKey
integrationPluginName
newOrgKey
orgKey
parameterKey
projectName
serverPluginName
workKey
```

### Cross-checks against known `registerPathVar()` call sites

Two entries were cross-checked directly against source, per the task's requirement to verify at least two independently:

- `credential` — `src/credentials/setup.mjs:25`: `registerPathVar('credential', { ... })`, called from `src/credentials/setup.mjs`'s own `setupPathResolvers()`.
- `serverPluginName` — registered by the framework itself (`@liquid-labs/plugable-express`), confirmed both in its bundled manifest (`pathVar:serverPluginName` listed among the framework's own `provides` in `node_modules/@liquid-labs/plugable-express/dist/plugable-express.js`) and at its literal `registerPathVar` call sites (`.../server/plugins/:serverPluginName/details` and `.../remove` route builders in the same bundle).

An exhaustive source-level enumeration of every `registerPathVar(` call site across the real, full explicit-plugin tier (`grep -rn "registerPathVar(" src/` in core-server and in `node_modules/@sdlcforge/dev-core/src/`) confirms all 9 derived names, plus surfaces:

| Call site | Name |
|---|---|
| `src/credentials/setup.mjs:25` (core-server) | `credential` |
| `node_modules/@sdlcforge/dev-core/src/projects/setup.mjs:16` | `newProjectName` |
| `node_modules/@sdlcforge/dev-core/src/projects/setup.mjs:21` | `projectName` |
| `node_modules/@sdlcforge/dev-core/src/orgs/setup.mjs:59` | `newOrgKey` |
| `node_modules/@sdlcforge/dev-core/src/orgs/setup.mjs:64` | `orgKey` |
| `node_modules/@sdlcforge/dev-core/src/orgs/handlers/parameters-set.mjs:57` | `parameterKey` |
| `node_modules/@sdlcforge/dev-core/src/orgs/handlers/parameters-detail.mjs:9` | `parameterKey` |
| `node_modules/@sdlcforge/dev-core/src/work/setup.mjs:8` | `workKey` |
| framework (`@liquid-labs/plugable-express` bundle) | `serverPluginName`, `integrationPluginName`, `errorKey` |

### Caveat: the route-derived proxy undercounts by one known entry

**`newProjectName` is registered via `registerPathVar()` at load time (`node_modules/@sdlcforge/dev-core/src/projects/setup.mjs:16`) but never appears as a literal `:paramName` segment in any route's `path` array** in `full-tier-api-spec.json` — it is used as a project-creation body-parameter name, not embedded in a URL path. This means the route-derived proxy (9 entries) is a **strict subset** of the true registered set (at least 10 distinct names, confirmed by direct source enumeration above). Per the task's own Assumptions section, this is recorded as an explicit caveat rather than treated as an exhaustiveness guarantee: the route-path derivation is an accepted, but not unconditionally authoritative, proxy for the framework's private `registerPathVar()` registry. A future reader relying on the 9-entry route-derived set for anything beyond "what appears in a URL" should instead use the 10-name source-enumeration table above (or an exhaustive `registerPathVar(` source grep repeated at the time of reading).

`src/lib/test/fixtures/probe-plugin.mjs`'s own `registerPathVar(PROBE_PATH_VAR, ...)` call is deliberately excluded from both sets above: it is a test-only fixture used by an isolated harness (`builtin-plugins.test.js`), not part of the real, full explicit-plugin tier `full-tier-baseline.test.js` exercises.

## 4. `validatePluginSet()` finding set, every severity

Captured by running `plan/resources/validate-check.mjs` (the same `validatePluginSet({ packageRoot })` invocation shape `src/lib/test/plugin-graph-gate.test.js` uses via `resolveCoreServerPackageRoot`) directly against the real package root — `node plan/resources/validate-check.mjs`, executed from the worktree root so `packageRoot === process.cwd()` is already the real repository root (no Babel/`test-staging/` `cwd` hazard applies outside Jest).

Top-level result:

```text
outcome  : 'validation-failure'
exitCode : 1
counts   : { error: 1, warning: 0, info: 1 }
```

(`debug`-severity findings are present in `findings` but, consistent with `merged-manifest-graph-projection.md`'s own observation, are not tallied in `counts`.)

Full finding set — 6 findings total, every severity, none summarized away:

| Severity | Kind | Capability / node | Requirer | Notes |
|---|---|---|---|---|
| `error` | `violated-by-source-order` | `appExt:_liqOrgs.orgs` | `@sdlcforge/core-server#controls` (source `builtin`, loadIndex 0) | Provider: `@sdlcforge/dev-core#orgs` (source `serverPackageRoot`, loadIndex 5), registered after the requirer. This is the sole entry in `plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` post-task-002 — matches exactly (`kind`, `capability.full`, `requirer.nodeId`). |
| `info` | `unsatisfied` | `appExt:_liqOrgs.orgSetupMethods` | `@sdlcforge/dev-core#orgs` (phase `setup`, `optional: true`) | Downgraded from `error` to `info` by task 002's yalc-snapshot refresh — the installed `.yalc` copy of `@sdlcforge/dev-core` now carries `"optional": true` on this requirement, matching dev-core's own `main` HEAD source declaration. No provider found among the 4 unmanifested `@liquid-labs/sdlc-projects-*` nodes (their manifests are unreadable, so they cannot be ruled in or out). |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-badges-coverage` | — | No readable plugin manifest; not an error. |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-badges-github-workflows` | — | No readable plugin manifest; not an error. |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | — | No readable plugin manifest; not an error. |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-workflow-local-node-build` | — | No readable plugin manifest; not an error. |

Rendered text report, verbatim:

```text
1 error(s), 0 warning(s), 1 info; 12 resolved plugin node(s), 4 unmanifested plugin node(s).
Searched: framework, builtin, serverPackageRoot. Note: 'dynamicPluginInstallDir' and 'pluginPaths' are outside this gate's guarantee - a plugin loaded only from one of those sources is not accounted for here.

ERROR (1):
- [violated-by-source-order] @sdlcforge/core-server#controls requires the `app.ext` key `_liqOrgs.orgs` from @sdlcforge/dev-core#orgs at the same phase ('setup'), but @sdlcforge/dev-core#orgs (source 'serverPackageRoot', load position 5) is registered after @sdlcforge/core-server#controls (source 'builtin', load position 0). Fix by moving @sdlcforge/dev-core#orgs into 'builtinPlugins' ahead of @sdlcforge/core-server#controls - the one source whose order is caller-controlled - changing its position within that array, or reordering the aggregating entry's components.

INFO (1):
- [unsatisfied] @sdlcforge/dev-core#orgs requires the `app.ext` key `_liqOrgs.orgSetupMethods` at phase 'setup', but no candidate provides it. Searched: framework, builtin, serverPackageRoot. Possible cause: @liquid-labs/sdlc-projects-badges-coverage, @liquid-labs/sdlc-projects-badges-github-workflows, @liquid-labs/sdlc-projects-workflow-github-node-jest-cicd, and @liquid-labs/sdlc-projects-workflow-local-node-build have no readable manifest and could not be checked for this capability.

DEBUG (4):
- [unmanifested-node] '@liquid-labs/sdlc-projects-badges-coverage' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-badges-github-workflows' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-workflow-local-node-build' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
```

Coverage boundary (unchanged from prior baselines, restated for completeness):

```text
sourcesSearched : ['builtin', 'serverPackageRoot']
outOfScope      : ['dynamicPluginInstallDir', 'pluginPaths']
```

Resolved node set — 12 nodes (7 builtin/serverPackageRoot plugin nodes plus the framework node itself; the remaining 4 are the unmanifested `debug`-severity nodes above):

```text
@liquid-labs/plugable-express            [framework]
@sdlcforge/core-server#controls          [builtin]
@sdlcforge/core-server#credentials       [builtin]
@sdlcforge/core-server#issues-github     [builtin]
@sdlcforge/dev-core#projects             [serverPackageRoot]
@sdlcforge/dev-core#orgs                 [serverPackageRoot]
@sdlcforge/dev-core#work                 [serverPackageRoot]
@sdlcforge/dev-core#projects-audit       [serverPackageRoot]
```

## 5. Sole-dependent confirmation

Command, run against the live playground:

```bash
grep -rln '"@sdlcforge/dev-core"' --include=package.json /Users/zane/playground
```

Verbatim output:

```text
/Users/zane/playground/sdlcforge/core-server/package.json
/Users/zane/playground/sdlcforge/core-server/worktrees/plan/sdlc-core-unification-01-003/package.json
/Users/zane/playground/sdlcforge/core-server/worktrees/plan/sdlc-core-unification-01-004/package.json
/Users/zane/playground/sdlcforge/core-server/worktrees/plan/sdlc-core-unification/package.json
/Users/zane/playground/sdlcforge/dev-core/package.json
/Users/zane/playground/sdlcforge/dev-core/worktrees/plan/sdlc-core-unification/package.json
```

All six hits confirmed by direct inspection:

- The four `core-server` hits (the main checkout plus three git worktrees of that same repository — this task's own worktree, the sibling phase-01 task 004 worktree, and the plan worktree) are all genuine dependency declarations of the identical two lines: `dependencies["@sdlcforge/dev-core"] = "file:.yalc/@sdlcforge/dev-core"` (`package.json:61`) and the `plugable.host.explicitPlugins` manifest-list entry (`package.json:76`). These are all the same repository at different worktree checkouts of the same branch family, not independent downstream consumers.
- The two `dev-core` hits are **not** dependency declarations at all — they are dev-core's own self-identity fields: `"name": "@sdlcforge/dev-core"` (`package.json:2`) and `"npmName": "@sdlcforge/dev-core"` (`package.json:67`, inside dev-core's own `plugable` manifest block). A literal string match on `"@sdlcforge/dev-core"` cannot distinguish a package declaring itself from a package depending on itself; verified by opening both lines directly.

**Conclusion: `@sdlcforge/core-server` (one repository, at whatever worktree checkout) is the sole dependent of `@sdlcforge/dev-core` anywhere in the playground.** No other package declares it as a dependency.

## Closing note: none of these observables moved as a result of tasks 001 or 002

`bun run test` (Validation item 1) passes green with **zero** diff against any checked-in file: `git status`/`git diff` show no changes under `test/__snapshots__/` and no diff in `full-tier-baseline.test.js`'s `EXPECTED_SETUP_METHODS` or `EXPECTED_APP_EXT_KEYS` arrays. Neither task 001's `@liquid-labs/npm-toolkit` call-site rename fix (an unrelated, unreached code path under `X-CWD`-gated `list-implied.mjs`) nor task 002's yalc-snapshot refresh moved any observable this file already asserts — both fixes landed exactly as scoped, without leaking into the surface this plan's parity contract (task 004) holds fixed.

This record therefore **is** the true pre-existing baseline — not one adjusted by this phase's own fixes — for tasks 001 and 002's *combined* effect on the observable surface: it captures what the surface looks like once both are in place, which is identical to what it looked like before either landed, for every observable checked here. The one delta task 002 *did* produce is visible only inside `validatePluginSet()`'s finding set (§4 above): the `appExt:_liqOrgs.orgSetupMethods` finding downgraded from `error` to `info` severity, which is exactly why `plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` could be trimmed from two entries to one in task 002 — that trim is a change to the test's own allowlist, not a change to any of the checked-in snapshots or `EXPECTED_*` arrays this task's Validation item 1 re-confirms untouched.

## References

- [`src/lib/test/full-tier-baseline.test.js`](../../src/lib/test/full-tier-baseline.test.js) — the existing harness this baseline restates rather than duplicates.
- [`src/lib/test/plugin-graph-gate.test.js`](../../src/lib/test/plugin-graph-gate.test.js) — the invocation shape §4's capture follows, and the current one-entry allowlist this baseline's finding set matches.
- [`plan/resources/validate-check.mjs`](./validate-check.mjs) — the ad hoc script used verbatim to produce §4's capture.
- [`plan/notes/dependency-union.md`](../notes/dependency-union.md) — the planning-time sole-dependent research §5's fresh grep cross-checks.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the post-merge finding-set projection this document is the pre-merge counterpart to.
