# Post-Merge Graph Measurement

## Purpose and scope

Records the exact result of task 001 (`phase-04-verify-parity-and-tighten-gate/001-measure-post-merge-plugin-graph.md`): dependency provisioning, both hazard checks, and the real `validatePluginSet()` run against the real post-Phase-3 repository root. Read by tasks 002, 003, and 005.

## Verdict

**Prediction matched.** Neither Hazard A nor Hazard B was present. The measured result is identical to the prediction in `plan/notes/merged-manifest-graph-projection.md#full-post-merge-finding-set-all-severities` on every observable.

## Dependency provisioning

`scripts/provision-local-deps.sh` run from a fresh worktree (dependencies not previously installed): copied `.yalc/` from the main checkout, ran `bun install`, installed 881 packages. `@liquid-labs/plugable-express` resolved to the `.yalc` link at `1.0.0-alpha.59` — the same version the projection note's harness used. `git status --porcelain` was empty immediately afterward; no `bun.lock` change was produced (no lockfile-change finding to report).

## Hazard A check — dev-core absence from explicitPlugins and dependencies

```
$ grep -n 'dev-core' package.json
(no matches)

$ grep -n 'dev-core' src/lib/app-init.mjs
41:// `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`,
41:// `@liquid-labs/liq-integrations-issues-github`, and the `sdlcforge` `dev-core` package are
43:// `src/integrations-issues-github/` and -- dev-core's four components -- `src/projects/`,
49:// registers `newProjectName` and `projectName` from `projects`, `newOrgKey` and `orgKey` from
```
(All matches in app-init.mjs are inside a historical/explanatory comment block; no live declaration.)

`package.json`'s `plugable.host.explicitPlugins`:
```json
[
  "@liquid-labs/sdlc-projects-badges-coverage",
  "@liquid-labs/sdlc-projects-badges-github-workflows",
  "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd",
  "@liquid-labs/sdlc-projects-workflow-local-node-build"
]
```
Exactly the four `@liquid-labs/sdlc-projects-*` packages, no `@sdlcforge/dev-core`. `package.json`'s `dependencies` likewise carries no `@sdlcforge/dev-core` entry.

**Hazard A: not present.**

## Hazard B check — orgs component source-fidelity

Merged `package.json`'s `plugable.host.builtins[0].components[]` `orgs` entry's `requires` array, diffed against `/Users/zane/playground/sdlcforge/dev-core/package.json` (branch `main`, HEAD `914f9515dbaa1c17e3d0144ccd7fa4a6e2d14362`, clean working tree) `plugable.components[]` `orgs` entry:

```
$ diff <(merged orgs component JSON) <(dev-core source orgs component JSON)
(no differences)
```

The merged `orgs.requires` array contains, verbatim, matching source:
```json
[
  { "capability": "appExt:setupMethods", "phase": "load", "reason": "..." },
  { "capability": "appExt:_liqProjects.playgroundMonitor", "phase": "setup", "reason": "..." },
  {
    "capability": "appExt:_liqOrgs.orgSetupMethods",
    "phase": "setup",
    "optional": true,
    "reason": "..."
  },
  { "capability": "appExt:_liqProjects.playgroundPath", "phase": "runtime", "reason": "..." },
  { "capability": "appExt:_liqOrgs.orgs", "phase": "runtime", "reason": "..." },
  "pathVar:parameterKey",
  "setupArg:registerPathVar",
  "setupArg:app",
  "setupArg:reporter"
]
```

All three required source-only markers are present: `"optional": true` on `appExt:_liqOrgs.orgSetupMethods`; `appExt:_liqProjects.playgroundPath` at phase `runtime`; `appExt:_liqOrgs.orgs` at phase `runtime`.

The other three dev-core-sourced components (`projects`, `work`, `projects-audit`) were also diffed against dev-core's source checkout and are byte-identical (as `merged-manifest-graph-projection.md` had already confirmed for these three).

**Hazard B: not present.**

## `validatePluginSet()` — full measured result

Invocation:
```javascript
const { validatePluginSet } = require('./node_modules/@liquid-labs/plugable-express/dist/plugable-express.js')
const result = await validatePluginSet({ packageRoot: process.cwd() })  // process.cwd() was the real repo root at invocation time
```
Run from a task worktree cut from core-server's real `main` post-Phase-3 (the real, post-Phase-3 package root).

### Top-level result

```
outcome  : 'ok'
exitCode : 0
counts   : { error: 0, warning: 0, info: 1 }
```

### Resolved nodes (12 total)

```text
@liquid-labs/plugable-express                              [framework]
@sdlcforge/core-server#credentials                         [builtin loadIndex 0]
@sdlcforge/core-server#projects                            [builtin loadIndex 1]
@sdlcforge/core-server#orgs                                [builtin loadIndex 2]
@sdlcforge/core-server#controls                            [builtin loadIndex 3]
@sdlcforge/core-server#issues-github                       [builtin loadIndex 4]
@sdlcforge/core-server#work                                [builtin loadIndex 5]
@sdlcforge/core-server#projects-audit                      [builtin loadIndex 6]
@liquid-labs/sdlc-projects-badges-coverage                 [serverPackageRoot loadIndex 0]
@liquid-labs/sdlc-projects-badges-github-workflows         [serverPackageRoot loadIndex 1]
@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd  [serverPackageRoot loadIndex 2]
@liquid-labs/sdlc-projects-workflow-local-node-build       [serverPackageRoot loadIndex 3]
```

Seven builtin nodes resolve at contiguous `loadIndex` 0–6, in the declared order `credentials, projects, orgs, controls, issues-github, work, projects-audit` — matching the DAG order exactly.

### Edges

**42 edges total** (`engineResult.edges.length === 42`).

### Findings — verbatim, all severities (5 total: 1 info, 4 debug)

```json
[
  {
    "kind": "unsatisfied",
    "severity": "info",
    "capability": {
      "full": "appExt:_liqOrgs.orgSetupMethods",
      "kind": "appExt",
      "name": "_liqOrgs.orgSetupMethods"
    },
    "requirer": {
      "nodeId": "@sdlcforge/core-server#orgs",
      "phase": "setup",
      "origin": {
        "form": "inline",
        "path": "<repo-root>/package.json"
      },
      "optional": true,
      "reason": "src/orgs/setup.mjs:6-10 unconditionally initializes the array empty, and 'process org setup' (src/orgs/setup.mjs:43-54) iterates it as a no-op enqueue when liq-policy -- the array's only writer, external to this package -- is not installed"
    },
    "providers": [],
    "supersededBy": null,
    "unmanifestedNodes": [
      "@liquid-labs/sdlc-projects-badges-coverage",
      "@liquid-labs/sdlc-projects-badges-github-workflows",
      "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd",
      "@liquid-labs/sdlc-projects-workflow-local-node-build"
    ],
    "sourcesSearched": ["framework", "builtin", "serverPackageRoot"],
    "orderVerdict": null,
    "cycle": null
  },
  {
    "kind": "unmanifested-node",
    "severity": "debug",
    "nodeId": "@liquid-labs/sdlc-projects-badges-coverage"
  },
  {
    "kind": "unmanifested-node",
    "severity": "debug",
    "nodeId": "@liquid-labs/sdlc-projects-badges-github-workflows"
  },
  {
    "kind": "unmanifested-node",
    "severity": "debug",
    "nodeId": "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd"
  },
  {
    "kind": "unmanifested-node",
    "severity": "debug",
    "nodeId": "@liquid-labs/sdlc-projects-workflow-local-node-build"
  }
]
```

### Rendered report string, verbatim

```text
0 error(s), 0 warning(s), 1 info; 12 resolved plugin node(s), 4 unmanifested plugin node(s).
Searched: framework, builtin, serverPackageRoot. Note: 'dynamicPluginInstallDir' and 'pluginPaths' are outside this gate's guarantee - a plugin loaded only from one of those sources is not accounted for here.

INFO (1):
- [unsatisfied] @sdlcforge/core-server#orgs requires the `app.ext` key `_liqOrgs.orgSetupMethods` at phase 'setup', but no candidate provides it. Searched: framework, builtin, serverPackageRoot. Possible cause: @liquid-labs/sdlc-projects-badges-coverage, @liquid-labs/sdlc-projects-badges-github-workflows, @liquid-labs/sdlc-projects-workflow-github-node-jest-cicd, and @liquid-labs/sdlc-projects-workflow-local-node-build have no readable manifest and could not be checked for this capability.

DEBUG (4):
- [unmanifested-node] '@liquid-labs/sdlc-projects-badges-coverage' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-badges-github-workflows' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
- [unmanifested-node] '@liquid-labs/sdlc-projects-workflow-local-node-build' carries no readable plugin manifest; its declarations, if any (it may have none), are invisible to this validator. Not an error - manifest it when convenient. See docs/plugin-manifest-schema.md#the-transition-window.
```

### Coverage

```json
{
  "hostDeclared": true,
  "sourcesSearched": ["builtin", "serverPackageRoot"],
  "searchPathsWalked": [
    {
      "source": "serverPackageRoot",
      "path": "<repo-root>",
      "explicitCandidateCount": 4,
      "keywordCandidateCount": 0
    }
  ],
  "unmanifestedNodes": [
    "@liquid-labs/sdlc-projects-badges-coverage",
    "@liquid-labs/sdlc-projects-badges-github-workflows",
    "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd",
    "@liquid-labs/sdlc-projects-workflow-local-node-build"
  ],
  "outOfScope": ["dynamicPluginInstallDir", "pluginPaths"],
  "notes": [
    "'dynamicPluginInstallDir' and 'pluginPaths' (the runtime options, distinct from a host-declared 'searchPaths' entry) are outside this gate's guarantee - a plugin loaded only from one of those sources at runtime is not accounted for here."
  ]
}
```

## Comparison table against the prediction

| Observable | Predicted | Measured | Match |
| --- | --- | --- | --- |
| `outcome` | `'ok'` | `'ok'` | yes |
| `exitCode` | `0` | `0` | yes |
| `counts` | `{ error: 0, warning: 0, info: 1 }` | `{ error: 0, warning: 0, info: 1 }` | yes |
| Total findings | 5 (1 info, 4 debug) | 5 (1 info, 4 debug) | yes |
| The `info` finding | `unsatisfied` / `appExt:_liqOrgs.orgSetupMethods` / `@sdlcforge/core-server#orgs` | identical | yes |
| The 4 `debug` findings | `unmanifested-node` on each `sdlc-projects-*` plugin | identical | yes |
| Resolved nodes | 12 (framework + 7 builtin loadIndex 0-6 + 4 serverPackageRoot) | 12, identical | yes |
| Builtin order | credentials, projects, orgs, controls, issues-github, work, projects-audit | identical | yes |
| Edges | 42 | 42 | yes |
| `coverage.sourcesSearched` | `['builtin', 'serverPackageRoot']` | `['builtin', 'serverPackageRoot']` | yes |

## Not exercised this task

`strictOptional: true` and `strictOrder: true` were not re-measured (already measured and recorded in `merged-manifest-graph-projection.md`; not required by this task's Requirements). Their prior measured results (`strictOptional` fails with `{error:1}`; `strictOrder` still `ok`) stand unchanged.
