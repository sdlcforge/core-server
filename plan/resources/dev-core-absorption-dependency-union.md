# Dev-Core Absorption Dependency Union

## Purpose and scope

The durable record of the runtime-`dependencies` union applied to `@sdlcforge/core-server`'s `package.json` when absorbing `@sdlcforge/dev-core`'s source tree (`src/{projects,orgs,work,projects-audit}/`). Modelled on the predecessor absorption's [`plan/resources/absorption-dependency-union.md`](absorption-dependency-union.md). It transcribes and verifies the measured table from [`plan/notes/dependency-union.md`](../notes/dependency-union.md) — that document is the authority for how each range and classification was derived; this document is what outlives `plan/notes/` once the plan closes.

The union recipe (dev-core repository's `docs/dev-core-consolidation-contract.md`, step 5) is: union the source package's runtime `dependencies` into the target's, take the higher range on any overlap, then refresh the lockfile — adapted to `core-server`'s Bun toolchain as `scripts/provision-local-deps.sh --refresh-lock`.

## The 32-row resolved table

The union is 32 names after dropping `@sdlcforge/dev-core` (see [Deliberately not carried across](#deliberately-not-carried-across-and-why) for why the transient 33rd `package.json` entry is not counted here).

### Overlapping, moved up (6)

| Dependency | Before (`core-server`) | dev-core | After (union) |
|---|---|---|---|
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.16` | `^1.0.0-alpha.16` |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.16` | `^1.0.0-alpha.25` | `^1.0.0-alpha.25` |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.16` | `^1.0.0-alpha.17` | `^1.0.0-alpha.17` |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.8` | `^1.0.0-alpha.9` | `^1.0.0-alpha.9` |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.21` | `^1.0.0-alpha.21` |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.7` | `^1.0.0-alpha.10` | `^1.0.0-alpha.10` |

### Overlapping, `core-server` already wins (1)

| Dependency | Before (`core-server`) | dev-core | After (union) |
|---|---|---|---|
| `@liquid-labs/liq-credentials-db` | `^1.0.0-alpha.9` | `^1.0.0-alpha.7` | `^1.0.0-alpha.9` (unchanged) |

### Overlapping, identical (5)

| Dependency | Range (both sides) |
|---|---|
| `@liquid-labs/http-smart-response` | `^1.0.0-alpha.6` |
| `@liquid-labs/octocache` | `^1.0.0-alpha.4` |
| `@liquid-labs/resource-model` | `^1.0.0-alpha.10` |
| `http-errors` | `^2.0.0` |
| `js-yaml` | `^4.1.0` |

### New from dev-core (11)

| Dependency | Range |
|---|---|
| `@liquid-labs/condition-eval` | `^1.0.0-alpha.17` |
| `@liquid-labs/credentials-db-plugin-github` | `^1.0.0-alpha.5` |
| `@liquid-labs/dependency-runner` | `^1.0.0-alpha.8` |
| `@liquid-labs/federated-json` | `^1.0.0-alpha.34` |
| `@liquid-labs/playground-monitor` | `^1.0.0-beta.4` |
| `@liquid-labs/plugable-defaults` | `^1.0.0-alpha.4` |
| `@liquid-labs/semver-plus` | `^1.0.0-alpha.11` |
| `highlight.js` | `^11.9.0` |
| `natural-sort` | `^1.0.0` |
| `npm-check-plus` | `^1.0.0-alpha.5` |
| `shelljs` | `^0.8.5` |

Every one of these eleven is load-bearing for the arriving source: the undeclared-bare-specifier sweep in `plan/notes/dependency-union.md` (Finding 3) found dev-core's 23 declared runtime dependencies map one-to-one onto its actual imports, with no undeclared imports and no declared-but-unimported entries.

### `core-server`-only, unchanged (9)

| Dependency | Range |
|---|---|
| `@liquid-labs/comply-defaults` | `^1.0.0-alpha.8` |
| `@liquid-labs/find-plus` | `^1.0.1` |
| `@liquid-labs/plugable-express` | `file:.yalc/@liquid-labs/plugable-express` |
| `@liquid-labs/resource-item` | `^1.0.0-alpha.4` |
| `@liquid-labs/sdlc-projects-badges-coverage` | `^1.0.0-alpha.2` |
| `@liquid-labs/sdlc-projects-badges-github-workflows` | `^1.0.0-alpha.2` |
| `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | `^1.0.0-alpha.2` |
| `@liquid-labs/sdlc-projects-workflow-local-node-build` | `^1.0.0-alpha.7` |
| `@liquid-labs/versioning` | `^1.0.0-alpha.4` |

6 + 1 + 5 + 11 + 9 = 32, matching the count `plan/notes/dependency-union.md` measured.

## Why the six upward moves are safe: zero new resolved versions

`@sdlcforge/dev-core` was already consumed through a `file:` yalc link before this task, so `bun.lock` already carried dev-core's full dependency list and Bun had already resolved the union's caret semantics against it. Measured before this task's lockfile refresh (`plan/notes/dependency-union.md`, Finding 2):

| Dependency | Union floor | Resolved in `bun.lock` (pre-refresh) | On disk (pre-refresh) |
|---|---|---|---|
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.16` | `1.0.0-alpha.17` | `1.0.0-alpha.17` |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.25` | `1.0.0-alpha.25` | `1.0.0-alpha.25` |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.17` | `1.0.0-alpha.17` | `1.0.0-alpha.17` |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.9` | `1.0.0-alpha.9` | `1.0.0-alpha.9` |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.21` | `1.0.0-alpha.21` | `1.0.0-alpha.21` |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.10` | `1.0.0-alpha.11` | `1.0.0-alpha.11` |

The union's floor bumps in `package.json` are documentation catching up to a resolution Bun had already made — they introduce **zero** new resolved versions. Confirmed empirically post-refresh: none of these six packages' resolved (top-level) `bun.lock` entries changed as part of this task's lockfile refresh (see [The `bun.lock` refresh outcome](#the-bunlock-refresh-outcome) below).

An exhaustive symbol-by-symbol check of all 18 bare specifiers in `core-server/src/` against the packages actually installed for them (`plan/notes/dependency-union.md`, Finding 2's "Everything else clears" subsection) produced exactly one failure, and Phase 1 already landed the fix: `src/controls/handlers/orgs/controls/list-implied.mjs`, `getPackageOrgAndBasename` → `await getPackageOrgBasenameAndVersion`. Verified present in this task's branch before making any change here.

## The `_npm-check-plus` decision

dev-core's `package.json` carries:

```json
"_npm-check-plus": {
  "depcheck": { "ignoreMatches": ["@liquid-labs/sdlc-resource-*"] }
}
```

**Decision: do not add it.** Carried across verbatim it would be inert — it suppresses depcheck false positives for `@liquid-labs/sdlc-resource-*` packages `core-server` does not have, while leaving `core-server`'s actual `@liquid-labs/catalyst-resource-{babel-and-rollup,eslint,jest}` devDependencies unsuppressed. `core-server` has never carried this block; `npm-check-plus` arrives here as a *runtime* dependency of `src/projects-audit/handlers/_lib/{audit-lib,audit-fix-lib}.mjs` rather than as a build tool, and nothing in `core-server`'s toolchain runs `depcheck`. Rewriting the glob to `@liquid-labs/catalyst-resource-*` and adding it was the alternative; it was not taken because there is no active `depcheck` consumer in this repo for it to configure.

## The `bun.lock` refresh outcome

`scripts/provision-local-deps.sh --refresh-lock` was run as its own step, separate from the `package.json` union commit (per the checkpoint hints). It copied `.yalc/` in from the main checkout (absent in the fresh worktree), removed `bun.lock`, and ran `bun install`, which resolved and installed 792 packages, downloading/extracting 14 new top-level entries — the eleven newly-direct dev-core packages plus the two `file:` yalc links.

Reading the resulting diff deliberately:

- **The top-level `dependencies` block in `bun.lock`'s manifest section** changed to mirror the new `package.json` union exactly — the 33-entry declared block (32-row union plus the transient `@sdlcforge/dev-core` row).
- **`@liquid-labs/plugable-defaults`: pre-cleared, no new drift.** `bun.lock` already resolved it to `1.0.0-alpha.7` *before* this task's refresh (confirmed by diffing this task's pre-refresh `bun.lock` against the post-refresh one — the resolved entry for `@liquid-labs/plugable-defaults` is unchanged at `1.0.0-alpha.7` across the refresh). The only thing that moved is the *declared* range, newly added to the top-level `dependencies` block by the union; the resolved version was already alpha.7 beforehand, drifted ahead of the alpha.4 the disk tree previously reported in `plan/notes/dependency-union.md`'s measurement. Both alpha.4 and alpha.7 export `PLUGABLE_CLI_SETTINGS_PATH` and `PLUGABLE_PLAYGROUND`, and the absorbed code uses only `PLUGABLE_PLAYGROUND` (`src/work/handlers/resume.mjs:7`, `src/projects/_lib/remove-lib.mjs:7`, `src/work/handlers/_lib/pause-lib.mjs:7`, `src/work/handlers/_lib/work-db.mjs:14`) — safe either way.
- **No other top-level resolved version changed for any of the 32 union members or the 11 newly-direct packages.** Every one of their resolved `bun.lock` entries (checked individually: `@liquid-labs/condition-eval@1.0.0-alpha.19`, `@liquid-labs/credentials-db-plugin-github@1.0.0-alpha.5`, `@liquid-labs/dependency-runner@1.0.0-alpha.8`, `@liquid-labs/federated-json@1.0.0-alpha.34`, `@liquid-labs/playground-monitor@1.0.0-beta.4`, `@liquid-labs/semver-plus@1.0.0-alpha.11`, `highlight.js@11.12.0`, `natural-sort@1.0.0`, `npm-check-plus@1.0.0-alpha.5`, `shelljs@0.8.5`, plus the six upward movers named above) is identical before and after the refresh.
- **The only other diff content is transitive-dependency hoisting reshuffle**, not a version change of any package this union cares about: `bun.lock`'s flat nested-dependency listing re-files a handful of shared sub-dependencies (`cliui`, `entities`, `regex-repo`, `resolve-from`, `yargs`, `yargs-parser`) under different parent paths (e.g. `depcheck/yargs` → `jest-cli/yargs`) because promoting the eleven dev-core packages from transitive to direct changed which parent "wins" the top-level hoist slot for these shared, multiply-resolved packages. Every specific version already present in the graph before the refresh is still present after it — nothing was added, removed, or bumped among these; only which top-level slot in the flat listing points at which nested duplicate. Confirmed by symbol-availability reasoning is unnecessary here since no importer of these packages is on the union's own import list — they are indirect build/test-tool transitives (`depcheck`, `jest`, yargs-family CLIs), not runtime code any absorbed handler touches.

No additional drift beyond the pre-cleared `plugable-defaults` declaration-vs-resolved-version note above was found.

## Deliberately not carried across, and why

- **The `_npm-check-plus` block** — dropped; see [The `_npm-check-plus` decision](#the-_npm-check-plus-decision) above.
- **dev-core's devDependencies** — out of the recipe's scope (the recipe unions *runtime* dependencies only). `core-server` keeps its `@liquid-labs/catalyst-resource-*` devDependency toolchain wholesale; dev-core's own `@liquid-labs/sdlc-resource-*`-based devDependency toolchain is not merged in any form.
- **The `@sdlcforge/dev-core` row itself** — not counted among the 32 union rows above. It remains a 33rd, transient entry in `package.json`'s `dependencies` (and in `plugable.host.explicitPlugins` and `src/lib/app-init.mjs`'s runtime `explicitPlugins` array) only because `@sdlcforge/dev-core` is still an explicit npm plugin at this point in the plan — nothing in-tree yet provides its 112 routes independent of the installed package. Phase 3 removes it from all three places at once, atomically with the `explicitPlugins` removal; this task removes it from none of them.

## The `file:` expectation: exactly two entries

`grep -n 'file:' package.json` returns **exactly two** lines at the end of this task, not zero:

- `@liquid-labs/plugable-express` — a pre-existing yalc link, `core-server`'s documented local-development mechanism (see this repo's `CLAUDE.md` / `AGENTS.md`), permanent, neither created nor touched by this plan.
- `@sdlcforge/dev-core` — transient, the 33rd entry discussed above, removed in Phase 3.

The consolidation contract's own verification step ("verify afterwards that `grep -n 'file:' package.json` returns nothing") is **not applicable to `core-server` as written** and must not be applied literally here. Recorded so the next reader does not re-litigate it or attempt to "fix" the permanent `plugable-express` link.

## Inherited liability: `shelljs`

Absorbing dev-core makes `shelljs` a direct runtime dependency of `core-server` for the first time (it arrives via the `projects`/`orgs`/`work`/`projects-audit` absorption). `shelljs` is the subject of wave-plan followup `hwbY`: it was found incompatible with bundled Bun output during the `sdlcpilot-cli` single-binary spike, and is recommended for replacement with `node:child_process` before the downstream `cli-mcp-binary-generation` plan-group. This task moves that liability into `core-server`'s own dependency tree. It is out of this task's scope to fix — recorded here so it is not rediscovered as a surprise later.
