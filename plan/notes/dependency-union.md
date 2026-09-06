# Dependency Union

## Purpose and scope

The resolved runtime-`dependencies` union for merging `@sdlcforge/dev-core` into `@sdlcforge/core-server`, plus the risk assessment behind each entry that moves. Every figure below was read from the live checkouts, the live `bun.lock`, the installed `node_modules` trees, and (where a version claim needed proving) the npm registry — none of it is inferred from the ranges alone. Investigation only; no `package.json` or lockfile was edited.

The governing rule is step 5 of the "Absorption recipe" section in the dev-core repository's `docs/dev-core-consolidation-contract.md`: union the source package's runtime `dependencies` into the target's, take the higher range on any overlap, then refresh the lockfile — adapted to core-server's Bun toolchain as `rm -f bun.lock && bun install`. (Linked as a path rather than a relative Markdown link because it lives in a sibling checkout, outside this repository.)

## Counts and shape

| Quantity | Value |
|---|---|
| `core-server` runtime `dependencies` | **22** |
| `dev-core` runtime `dependencies` | **23** |
| Overlapping names | 12 |
| `core-server`-only names | 10 (incl. `@sdlcforge/dev-core` itself) |
| `dev-core`-only names | 11 |
| Union after dropping `@sdlcforge/dev-core` | **32** |

The task brief said 21 and 24. Both are off by one in opposite directions; the counted values are 22 and 23 (`core-server/package.json:42-63`, `dev-core/package.json:34-56`). The 22 includes `@sdlcforge/dev-core` itself, so "21 dependencies plus the one being dissolved" is a defensible reading of the first figure; the 24 has no such reading and is simply high by one.

## The resolved union table

`↑` marks a range whose floor moves upward for core-server. `=` marks an identical range on both sides. `→` marks an overlap core-server already wins.

### Overlapping (12)

| Dependency | core-server | dev-core | Union result | |
|---|---|---|---|---|
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.16` | `^1.0.0-alpha.16` | ↑ |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.16` | `^1.0.0-alpha.25` | `^1.0.0-alpha.25` | ↑ |
| `@liquid-labs/http-smart-response` | `^1.0.0-alpha.6` | `^1.0.0-alpha.6` | `^1.0.0-alpha.6` | = |
| `@liquid-labs/liq-credentials-db` | `^1.0.0-alpha.9` | `^1.0.0-alpha.7` | `^1.0.0-alpha.9` | → |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.16` | `^1.0.0-alpha.17` | `^1.0.0-alpha.17` | ↑ |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.8` | `^1.0.0-alpha.9` | `^1.0.0-alpha.9` | ↑ |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.21` | `^1.0.0-alpha.21` | ↑ |
| `@liquid-labs/octocache` | `^1.0.0-alpha.4` | `^1.0.0-alpha.4` | `^1.0.0-alpha.4` | = |
| `@liquid-labs/resource-model` | `^1.0.0-alpha.10` | `^1.0.0-alpha.10` | `^1.0.0-alpha.10` | = |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.7` | `^1.0.0-alpha.10` | `^1.0.0-alpha.10` | ↑ |
| `http-errors` | `^2.0.0` | `^2.0.0` | `^2.0.0` | = |
| `js-yaml` | `^4.1.0` | `^4.1.0` | `^4.1.0` | = |

Six ranges move up; one (`liq-credentials-db`) core-server already leads; five are identical.

### core-server-only (10)

| Dependency | Range | Union result |
|---|---|---|
| `@liquid-labs/comply-defaults` | `^1.0.0-alpha.8` | unchanged |
| `@liquid-labs/find-plus` | `^1.0.1` | unchanged |
| `@liquid-labs/plugable-express` | `file:.yalc/@liquid-labs/plugable-express` | unchanged — see below |
| `@liquid-labs/resource-item` | `^1.0.0-alpha.4` | unchanged |
| `@liquid-labs/sdlc-projects-badges-coverage` | `^1.0.0-alpha.2` | unchanged |
| `@liquid-labs/sdlc-projects-badges-github-workflows` | `^1.0.0-alpha.2` | unchanged |
| `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | `^1.0.0-alpha.2` | unchanged |
| `@liquid-labs/sdlc-projects-workflow-local-node-build` | `^1.0.0-alpha.7` | unchanged |
| `@liquid-labs/versioning` | `^1.0.0-alpha.4` | unchanged |
| `@sdlcforge/dev-core` | `file:.yalc/@sdlcforge/dev-core` | **removed** |

### dev-core-only (11)

| Dependency | Range | Union result |
|---|---|---|
| `@liquid-labs/condition-eval` | `^1.0.0-alpha.17` | added |
| `@liquid-labs/credentials-db-plugin-github` | `^1.0.0-alpha.5` | added |
| `@liquid-labs/dependency-runner` | `^1.0.0-alpha.8` | added |
| `@liquid-labs/federated-json` | `^1.0.0-alpha.34` | added |
| `@liquid-labs/playground-monitor` | `^1.0.0-beta.4` | added |
| `@liquid-labs/plugable-defaults` | `^1.0.0-alpha.4` | added |
| `@liquid-labs/semver-plus` | `^1.0.0-alpha.11` | added |
| `highlight.js` | `^11.9.0` | added |
| `natural-sort` | `^1.0.0` | added |
| `npm-check-plus` | `^1.0.0-alpha.5` | added |
| `shelljs` | `^0.8.5` | added |

### The `file:` rule, and where it does and does not apply

The contract's `file:` prohibition bites exactly once here, and benignly: `@sdlcforge/dev-core` (`core-server/package.json:61`) is a `file:.yalc/…` spec, and it is being *deleted*, not unioned — so there is no registry range to substitute and nothing to decide.

The contract's own verification step for that rule — "verify afterwards that `grep -n 'file:' package.json` returns nothing" — **must not be applied literally to core-server**. `@liquid-labs/plugable-express` (`core-server/package.json:52`) is a pre-existing `file:.yalc/…` link that this union neither creates nor touches, and it is core-server's documented local-development mechanism. Anyone running that grep as a mechanical gate will find one hit and be tempted to "fix" it; the correct post-union expectation is **exactly one** `file:` line, for `plugable-express`.

`dev-core` declares `@liquid-labs/plugable-express` only as a `devDependency` at `^1.0.0-alpha.59` (`dev-core/package.json:28`). core-server's yalc copy is `1.0.0-alpha.59` on the nose, so the range is satisfied and nothing needs adding — this matters for finding 3 below.

### Two non-dependency removals that travel with this one

Dropping `@sdlcforge/dev-core` from `dependencies` is not the whole removal. The same name also appears in:

- `core-server/package.json:76` — the `plugable.host.explicitPlugins` manifest list.
- `core-server/src/lib/app-init.mjs:57` — the runtime `explicitPlugins` array.

The comment block immediately above that array (`src/lib/app-init.mjs:45-51`) already records why a stale entry left alongside an absorbed in-tree copy is dangerous: duplicate route or path-var registration is a hard startup crash, and for a component registering neither it is a *silent* double-registration. These three edits land together or not at all.

## Finding 1 — the twelve overlaps are all mechanically max()-able

All twelve overlapping dependencies sit on a single, comparable version line. Nine are `1.0.0-alpha.N` prereleases differing only in `N`; three (`http-errors`, `js-yaml`, and the identical `resource-model`/`octocache`/`http-smart-response` trio) are byte-identical ranges. **No overlap is a divergent major line**, so none of them needs a compatibility judgment in place of `max()`.

Two mechanics are worth stating because getting either wrong silently produces a wrong table.

**Prerelease identifiers compare numerically, not lexically.** Verified against the `semver` package in core-server's own tree:

```text
1.0.0-alpha.7 vs 1.0.0-alpha.10 -> higher: 1.0.0-alpha.10 | string-cmp would say: 1.0.0-alpha.7
```

`@liquid-labs/shell-toolkit` is the one row where a naive string comparison inverts the answer (`"^1.0.0-alpha.7" > "^1.0.0-alpha.10"` lexically). Every other pair happens to agree between the two comparison methods, so a string-sorted union would produce eleven correct rows and one wrong one — the worst possible failure shape.

**A caret on a prerelease is far wider than it looks.** `semver.validRange('^1.0.0-alpha.15')` expands to `>=1.0.0-alpha.15 <2.0.0-0`, which admits `1.0.0-alpha.21`, `1.0.0-alpha.25`, and even `1.0.0-beta.4`. Every one of these ranges therefore already permits every version any of them permits, on the whole `1.0.0-*` line. This is what makes finding 2's conclusion come out the way it does.

## Finding 2 — the six upward moves, and the one real problem they expose

The headline: **all six upward-moving dependencies are already installed at the higher version in core-server's current tree.** The union's floor bumps are documentation catching up to reality, not a change in what gets resolved.

The reason is structural. `@sdlcforge/dev-core` is already a `file:` dependency of core-server, so `bun.lock` already carries dev-core's full dependency list (`core-server/bun.lock:528`) and Bun already resolved the union against the caret semantics above. Measured, top-level, in both trees:

| Dependency | core-server union floor | Resolved in `bun.lock` | On disk, `core-server/node_modules` | Registry latest |
|---|---|---|---|---|
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.16` | `1.0.0-alpha.17` | `1.0.0-alpha.17` | `1.0.0-alpha.17` |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.25` | `1.0.0-alpha.25` | `1.0.0-alpha.25` | `1.0.0-alpha.25` |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.17` | `1.0.0-alpha.17` | `1.0.0-alpha.17` | `1.0.0-alpha.17` |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.9` | `1.0.0-alpha.9` | `1.0.0-alpha.9` | `1.0.0-alpha.9` |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.21` | `1.0.0-alpha.21` | `1.0.0-alpha.21` | `1.0.0-alpha.21` |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.10` | `1.0.0-alpha.11` | `1.0.0-alpha.11` | `1.0.0-alpha.11` |

So the union introduces **zero** new resolved versions for its six upward moves. The risk question is therefore not "will the newer range break core-server's in-tree components?" but "is core-server *already* broken against the versions it is already running?" — and the answer is yes, once.

### Confirmed break: `getPackageOrgAndBasename` no longer exists

`core-server/src/controls/handlers/orgs/controls/list-implied.mjs:3`:

```javascript
import { getPackageOrgAndBasename } from '@liquid-labs/npm-toolkit'
```

used at line 18:

```javascript
const { org: orgKey } = getPackageOrgAndBasename({ pkgDir : cwd })
```

`@liquid-labs/npm-toolkit@1.0.0-alpha.21`, the version installed and locked right now, exports:

```text
getPackageJSON, getPackageOrgBasenameAndVersion, getVersion, install, update, validatePackageSpec, view
```

`getPackageOrgAndBasename` is `undefined` there — verified by `require()` against core-server's own `node_modules`. Registry bisection pins the rename precisely: `1.0.0-alpha.16` still exports `getPackageOrgAndBasename`; `1.0.0-alpha.17` exports `getPackageOrgBasenameAndVersion` instead. core-server's *current* declared range, `^1.0.0-alpha.15`, already admits alpha.17+, so this is a **pre-existing, live, in-tree break, not one the union creates**. It has simply been invisible because the handler is `list-implied`, reached only via an `X-CWD` header, and nothing in the unit-test suite calls it.

Two details make the fix non-trivial, so it should not be filed as a rename:

- The replacement is `async`. Its body begins `async e=>{let t,r …`, so `list-implied.mjs:18`'s synchronous destructure would destructure a `Promise` and yield `orgKey === undefined` rather than throwing. The call site needs an `await` as well as a new name (the enclosing `func` is already `async`).
- The replacement's argument contract is stricter: it throws `getPackageOrgBasenameAndVersion: accepts a string 'package spec' or an object with exactly one of 'pkgDir', 'pkgJSON', or 'pkgSpec'.` when given an object with zero or more than one key. The existing `{ pkgDir : cwd }` call satisfies that, so only the name and the `await` need to change.

`@sdlcforge/dev-core` already uses the post-rename API at all four of its call sites that need it (`dev-core/src/projects/handlers/_lib/create-lib.mjs:14`, `destroy-lib.mjs:10`, `rename-lib.mjs:10`, plus `update-lib.mjs:2` for `update`), which is exactly why nothing has surfaced: the only stale caller in the merged tree will be core-server's own `controls` component.

**Recommendation:** fix `list-implied.mjs` as a standalone pre-merge correction, so the union commit is not the commit that appears to have broken it.

### Everything else clears

An exhaustive check of every named import in `core-server/src/` against the package actually installed for it — all 18 distinct bare specifiers, resolved via `require()` and checked symbol-by-symbol — produced exactly one failure, the one above. Specifically, for the five other upward-moving dependencies:

| Import site | Symbol | Present at installed version |
|---|---|---|
| `src/integrations-issues-github/create-or-update-pull-request.mjs:1` | `determineOriginAndMain` (`git-toolkit`) | yes |
| `src/integrations-issues-github/create-or-update-pull-request.mjs:2` | `determineGitHubLogin`, `getGitHubOrgAndProjectBasename` (`github-toolkit`) | yes |
| `src/integrations-issues-github/get-current-integration-user.mjs:1` | `determineGitHubLogin` | yes |
| `src/integrations-issues-github/get-qa-link-file-index.mjs:1` | `getGitHubOrgAndProjectBasename` | yes |
| `src/integrations-issues-github/create-or-update-pull-request.mjs:3`, `get-qa-link-file-index.mjs:2` | `getGitHubQAFileLinks` (`liq-qa-lib`) | yes |
| `src/integrations-issues-github/create-or-update-pull-request.mjs:5` | `tryExec` (`shell-toolkit`) | yes |
| `src/controls/handlers/orgs/controls/_lib/list-lib.mjs:3`, `src/credentials/handlers/credentials/list.mjs:1` | `commonOutputParams`, `formatOutput` (`liq-handlers-lib`) | yes |

The `liq-credentials-db` row (the one overlap core-server wins, alpha.9 over dev-core's alpha.7) is likewise clear: dev-core's tree already has alpha.9 installed and its single import site resolves against it.

### The real risk is the lockfile refresh, not the union

`rm -f bun.lock && bun install` re-resolves **every** dependency, not just the six that move. Because all of these are caret-on-prerelease ranges, that is an unpinned float across the whole `1.0.0-*` line for 20-odd packages. Measured drift between the current on-disk tree and the current registry latest:

- `@liquid-labs/plugable-defaults` — `bun.lock` says `1.0.0-alpha.7`, disk has `1.0.0-alpha.4`. A refresh lands alpha.7. Both versions export `PLUGABLE_CLI_SETTINGS_PATH` and `PLUGABLE_PLAYGROUND`, and dev-core uses only `PLUGABLE_PLAYGROUND` (`src/work/handlers/resume.mjs:7`, `projects/_lib/remove-lib.mjs:7`, `_lib/pause-lib.mjs:7`, `_lib/work-db.mjs:14`), so this one is verified safe.
- Every other union member's registry latest already equals what `bun.lock` resolves, so nothing else drifts *today*.

That "today" is the point. The refresh is a wider-blast-radius operation than the union it serves, and it should be run once, immediately, with the resulting `bun.lock` diff reviewed as its own reviewable artifact rather than folded into the `package.json` union commit.

## Finding 3 — undeclared-bare-specifier sweep: clean

Every bare specifier in `dev-core/src/` resolves to something declared in dev-core's own runtime `dependencies`. The sweep covered all 151 `.mjs`/`.js` files under `src/`, matching `from '…'`, `require('…')`, and dynamic `import('…')` on every line (not only lines beginning with `import`, so multi-line import statements are caught), then excluding relative and `node:` specifiers.

The sweep found 25 distinct bare specifier strings. Two of them (`highlight.js/lib/core` and `highlight.js/lib/languages/javascript`) are subpaths of one package, and one is `@liquid-labs/plugable-express`, discussed below. The remaining 24 resolve to 23 packages that map exactly one-to-one onto dev-core's 23 declared runtime dependencies — no undeclared imports, and, symmetrically, **no declared-but-unimported dependencies either**. Import counts, for reference: `http-errors` 39, `http-smart-response` 25, `npm-toolkit` 19, `git-toolkit` 19, `shell-toolkit` 17, `github-toolkit` 13, `octocache` 10, down to a single site each for `condition-eval`, `dependency-runner`, `playground-monitor`, `liq-credentials-db`, `resource-model`, and `natural-sort`.

Four sweep hits are false positives from prose inside string literals, confirmed by inspection and not real specifiers: `#orgs` (`src/test/plugin-manifest.test.mjs:60,98,138`, a manifest component key), `newProjectName` (`src/projects/handlers/_lib/create-lib.mjs:49`, inside an error message reading "… could not be determined from 'newProjectName'."), and `${currVer}` / `${workKey}` (template interpolations).

There are **no** dynamic or computed `require()` calls in `dev-core/src/` — a grep for `require(` followed by anything other than a quote returns nothing — so the static sweep is complete rather than merely indicative.

### The one specifier that is not in `dependencies`, and why it is fine

`dev-core/src/test/plugin-manifest.test.mjs:14`:

```javascript
import { FRAMEWORK_MANIFEST, resolvePluginManifest, validatePluginGraph } from '@liquid-labs/plugable-express'
```

`@liquid-labs/plugable-express` is a dev-core `devDependency` (`dev-core/package.json:28`), not a runtime one — and the file's own comment at line 12 says so deliberately: "`@liquid-labs/plugable-express` is a devDependency (test-only import); it must never be …".

This is precisely the `nodeExternals()` shape that lost `@liquid-labs/octocache` in a prior absorption (recorded in this plan-group's own history at `plan/followups.yaml`, followups `BPvA` and the `@liquid-labs/versioning` note above it). The mechanism is real and worth restating: `@liquid-labs/catalyst-resource-babel-and-rollup/dist/rollup/rollup.config.mjs:80` calls `nodeExternals()`, whose own inline comment reads "this will bundle devDependencies and nothing else; also marks node builtins as external". A package imported from bundled source but declared only in `devDependencies` is therefore **inlined into `dist/` silently** — no error, at build or at runtime.

It does not bite here, for two independent reasons, either of which alone is sufficient:

1. The import is unreachable from the bundle entry. `dev-core/src/index.mjs` imports only `./projects`, `./orgs`, `./work`, `./projects-audit`; `src/test/` is not in the graph. Confirmed empirically — `grep -c 'resolvePluginManifest\|validatePluginGraph' dev-core/dist/dev-core.js` returns `0`.
2. After the merge, the file lands in a tree where `@liquid-labs/plugable-express` is a *runtime* dependency (`core-server/package.json:52`), so even if it were reachable it would be correctly externalized.

One incidental observation, not a union concern: `@liquid-labs/plugable-express` is currently **absent from `dev-core/node_modules/`** despite being present in `dev-core/package-lock.json:2926-2932` (marked `"dev": true`). That checkout's `node_modules` looks to have been installed with dev dependencies omitted, or is simply stale. `plugin-manifest.test.mjs` cannot resolve its import in that tree as it stands. Post-merge this resolves itself, since core-server's tree has the package; flagging it only so nobody diagnoses a dev-core-side test failure as merge-induced.

### Corresponding sweep on the receiving side

Running the identical check against `core-server/src/` found no undeclared bare specifiers either: all 18 distinct specifiers are declared, with `supertest` the only `devDependencies`-only one — correctly so, since it appears exclusively in `src/lib/test/`.

## Finding 4 — `npm-check-plus` is correctly a runtime dependency

`npm-check-plus` is **genuinely imported from runtime handler code** and belongs in `dependencies`. It is not misfiled tooling. Two import sites, both in the `projects-audit` submodule:

- `dev-core/src/projects-audit/handlers/_lib/audit-lib.mjs:2` — `import { generateReport, npmCheck } from 'npm-check-plus'`
- `dev-core/src/projects-audit/handlers/_lib/audit-fix-lib.mjs:2` — `import { fixReport, npmAutoFix, npmCheck } from 'npm-check-plus'`

These back the `/projects/.../audit` and `/projects/.../audit-fix` routes. It is absent from core-server's `package.json` entirely, so it joins the union unopposed at `^1.0.0-alpha.5`. That is also the registry latest, and it is already hoisted into `core-server/node_modules` at `1.0.0-alpha.5` via the existing `file:` dev-core link.

Nothing else in either dependency block is misfiled. Checked exhaustively:

- Every one of dev-core's 23 runtime dependencies has at least one import site in `dev-core/src/` (finding 3's one-to-one mapping).
- Every one of core-server's runtime dependencies is either imported from `src/` or is a plugin package loaded by name. The four `@liquid-labs/sdlc-projects-*` entries have **no import sites at all** and are nonetheless correctly runtime dependencies: they are named as strings in the `explicitPlugins` array at `core-server/src/lib/app-init.mjs:53-56` and mirrored in `core-server/package.json:72-75`, and `plugable-express`'s loader dynamic-imports them by package name at startup. They must not be mistaken for orphans by a mechanical "is it imported?" check.

### One adjacent item that does need adapting

`dev-core/package.json:58-64` carries a tooling-config block keyed to dev-core's own toolchain:

```json
"_npm-check-plus": {
  "depcheck": {
    "ignoreMatches": [
      "@liquid-labs/sdlc-resource-*"
    ]
  }
}
```

This is not a dependency and so is outside the union proper, but it travels with the same decision. core-server has no such block, and its build/test resources are the `@liquid-labs/catalyst-resource-*` family (`core-server/package.json:36-38`), not `@liquid-labs/sdlc-resource-*` (`dev-core/package.json:29-31`). If the block is carried across verbatim it will be inert — it would suppress depcheck false positives for packages core-server does not have, while leaving core-server's actual `catalyst-resource-*` devDependencies unsuppressed. Carry it across with the glob rewritten to `@liquid-labs/catalyst-resource-*`, or drop it deliberately; do not copy it unchanged.

The broader devDependency question is out of the union's scope by the recipe's own terms (it unions *runtime* dependencies only), but is worth naming for whoever plans the build-toolchain task: dev-core builds under `sdlc-resource-*` with npm, core-server under `catalyst-resource-*` with Bun, and the absorbed source has to come up green under the latter.

## Finding 5 — nothing is orphaned

Confirmed by enumeration rather than assumed. Removing `@sdlcforge/dev-core` orphans **zero** of core-server's current dependencies. Every remaining entry is independently justified by code core-server keeps:

| Dependency | Kept because |
|---|---|
| `@liquid-labs/comply-defaults` | `src/cli/index.js:1`, `src/lib/app-init.mjs:11` |
| `@liquid-labs/find-plus` | `src/controls/resources/controls.mjs:1` |
| `@liquid-labs/git-toolkit` | `src/integrations-issues-github/create-or-update-pull-request.mjs:1` |
| `@liquid-labs/github-toolkit` | `src/integrations-issues-github/{create-or-update-pull-request.mjs:2, get-current-integration-user.mjs:1, get-qa-link-file-index.mjs:1}` |
| `@liquid-labs/http-smart-response` | `src/credentials/handlers/credentials/import.mjs:4` |
| `@liquid-labs/liq-credentials-db` | `src/credentials/setup.mjs:4`, `handlers/credentials/list.mjs:2`, `handlers/credentials/import.mjs:3` |
| `@liquid-labs/liq-handlers-lib` | `src/controls/handlers/orgs/controls/_lib/list-lib.mjs:3`, `src/credentials/handlers/credentials/list.mjs:1` |
| `@liquid-labs/liq-qa-lib` | `src/integrations-issues-github/{create-or-update-pull-request.mjs:3, get-qa-link-file-index.mjs:2}` |
| `@liquid-labs/npm-toolkit` | `src/controls/handlers/orgs/controls/list-implied.mjs:3` (the broken site from finding 2 — still a real dependency once fixed) |
| `@liquid-labs/octocache` | `src/integrations-issues-github/{create-or-update-pull-request.mjs:4, determine-current-milestone.mjs:1}` |
| `@liquid-labs/plugable-express` | 12 sites, incl. `src/cli/index.js:2`, `src/lib/index.js:1`, `src/lib/app-init.mjs:12` |
| `@liquid-labs/resource-item` | `src/controls/resources/{question-control.mjs:3, control.mjs:1}` |
| `@liquid-labs/resource-model` | `src/controls/resources/controls.mjs:2` |
| `@liquid-labs/shell-toolkit` | `src/integrations-issues-github/create-or-update-pull-request.mjs:5` |
| `@liquid-labs/versioning` | `src/integrations-issues-github/determine-current-milestone.mjs:2` |
| `http-errors` | `src/controls/handlers/orgs/controls/{list-implied.mjs:1, _lib/list-lib.mjs:1}` |
| `js-yaml` | `src/controls/resources/question-control.mjs:5`, `src/controls/integrations/get-question-controls.mjs:4` |
| 4× `@liquid-labs/sdlc-projects-*` | Named as `explicitPlugins` strings, `src/lib/app-init.mjs:53-56` |

The structural reason there is nothing to orphan: this merge is purely **additive to core-server's source tree**. core-server keeps all three of its own in-tree components — `controls`, `credentials`, `integrations-issues-github` (absorbed in the prior `core-server-domain-consolidation` plan) — untouched, and gains four more (`projects`, `orgs`, `work`, `projects-audit`). No core-server code is replaced by dev-core code, so no core-server dependency loses its last consumer. Every one of the eleven dev-core-only additions is likewise load-bearing for arriving source, per finding 3's one-to-one mapping.

Worth noting for the lockfile step: because dev-core is already linked in via `file:`, **all eleven dev-core-only packages are already hoisted into `core-server/node_modules` at satisfying versions** (`condition-eval@1.0.0-alpha.19`, `credentials-db-plugin-github@1.0.0-alpha.5`, `dependency-runner@1.0.0-alpha.8`, `federated-json@1.0.0-alpha.34`, `playground-monitor@1.0.0-beta.4`, `plugable-defaults@1.0.0-alpha.4`, `semver-plus@1.0.0-alpha.11`, `highlight.js@11.12.0`, `natural-sort@1.0.0`, `npm-check-plus@1.0.0-alpha.5`, `shelljs@0.8.5`). Promoting them from transitive to direct changes the declaration, not the installed tree.

## Summary of things to act on

1. **Pre-merge, standalone:** fix `core-server/src/controls/handlers/orgs/controls/list-implied.mjs:3,18` — `getPackageOrgAndBasename` → `await getPackageOrgBasenameAndVersion`. Already broken today; the union should not be the commit that owns it.
2. **During the union:** apply the 32-row table above; the six upward moves are safe and already resolved that way.
3. **Do not** apply the contract's `grep -n 'file:' package.json` gate literally — expect exactly one surviving hit, `@liquid-labs/plugable-express`.
4. **Remove `@sdlcforge/dev-core` in all three places:** `package.json:61` (dependency), `package.json:76` (manifest `explicitPlugins`), `src/lib/app-init.mjs:57` (runtime `explicitPlugins`).
5. **Treat `rm -f bun.lock && bun install` as its own reviewable step,** with the resulting lock diff read deliberately — it floats ~20 caret-on-prerelease ranges, a far wider change than the union itself.
6. **Rewrite or drop** dev-core's `_npm-check-plus.depcheck.ignoreMatches` glob (`sdlc-resource-*` → `catalyst-resource-*`) rather than carrying it across verbatim.
7. No orphan cleanup is needed, and no undeclared-bare-specifier remediation is needed.
