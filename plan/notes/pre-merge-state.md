# Pre-Merge State

## Purpose and scope

The measured, verified state of `@sdlcforge/core-server` and `@sdlcforge/dev-core` as of 2026-09-05, captured during plan authoring so that later phases compare against a recorded fact rather than re-deriving one. Every figure below was read from the live checkouts, not inferred. Phase 1 mechanizes these into a durable, re-runnable baseline; this note is the planning-time snapshot that justifies the phase structure.

## Route and plugin surface

`test/__snapshots__/full-tier-api-spec.json` holds **165 routes**. Provenance tally by `npmName`:

| `npmName` | Routes |
|---|---|
| `@liquid-labs/plugable-express` | 35 |
| `@sdlcforge/dev-core` | 112 |
| `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | 6 |
| `@sdlcforge/core-server` | 6 |
| `@liquid-labs/sdlc-projects-badges-coverage` | 2 |
| `@liquid-labs/sdlc-projects-badges-github-workflows` | 2 |
| `@liquid-labs/sdlc-projects-workflow-local-node-build` | 2 |

This matches the architecture analysis's 35 / 6 / 112 split exactly. `test/__snapshots__/full-tier-plugins-list.json` holds **6 entries** (the four `sdlc-projects-*` packages, `@sdlcforge/core-server`, `@sdlcforge/dev-core`).

Expected post-merge: still 165 routes, with dev-core's 112 re-attributed to `@sdlcforge/core-server` (**118 total** under that name), and the plugins list dropping to **5 entries** as the `@sdlcforge/dev-core` row disappears. No route is added or removed; only provenance and ordering change.

## Confirmed yalc drift

`node_modules/@sdlcforge/dev-core` (via the `.yalc/@sdlcforge/dev-core` symlink) declares its `orgs` component's `appExt:_liqOrgs.orgSetupMethods` requirement **without** `optional: true`:

```json
{
  "capability": "appExt:_liqOrgs.orgSetupMethods",
  "phase": "setup",
  "reason": "src/orgs/setup.mjs:46, inside 'process org setup'; the array is populated by liq-policy, outside this package"
}
```

`@sdlcforge/dev-core`'s own `main` HEAD carries `"optional": true` on that same entry. The drift is real and matches dev-core's followup `x6x1`. It is what keeps the first entry of `ALLOWLISTED_ERROR_FINDINGS` in `src/lib/test/plugin-graph-gate.test.js` looking live: with the drift cleared, that requirement downgrades from an `error`-severity `unsatisfied` finding to an `info` finding, and the allowlist should already drop to one entry **before** any merge happens. Clearing this first is what keeps a pre-existing condition from being misread as merge-introduced.

## `@sdlcforge/dev-core`'s tree, as it stands on `main`

`git ls-tree -r --name-only main -- src` shows the tree **already** in its final absorbed layout — `src/{projects,orgs,work,projects-audit}/…` — so the recipe's step-1 donor-side relocation is not needed and the merge can source directly from `main` rather than a plan branch. 162 tracked paths under `src/`.

Beyond the four submodule directories, `src/` also carries two paths that are **dev-core package-level artifacts, not submodule content**:

- `src/index.mjs` — dev-core's own plugin aggregator (merged `handlers` + composite `setup`). `core-server` has no file at this path, so this arrives as a **clean add, not an add/add conflict** — the inverse of the hazard `docs/dev-core-consolidation-contract.md` warns about for the `projects-audit` absorption. Its role in the merged package is taken by `src/lib/builtin-plugins.mjs`, so it must be removed explicitly; nothing in git will flag it.
- `src/test/index.test.mjs`, `src/test/plugin-manifest.test.mjs` — dev-core's package-level tests, asserting against dev-core's own `package.json` `plugable` block and `src/index.mjs`. Both will be Babel-transpiled into `test-staging/` and executed by `core-server`'s Jest run, where their premises no longer hold.

Non-`src/` tracked paths on `dev-core/main`, all of which arrive at the merge:

```text
.gitignore              .sdlc-data.yaml         Makefile                README.md
docs/architecture.md    docs/consumer-migration.md
docs/dev-core-consolidation-contract.md
make/10-locations.mk    make/10-resources.mk    make/15-data-finder.mk
make/20-js-src-finder.mk  make/50-dev-core-js.mk  make/55-lint.mk
make/55-test.mk         make/95-final-targets.mk
package-lock.json       package.json
plan/followups.yaml     plan/manifest.yaml
plan/plan-summary-dev-core-plugin-manifest.md
plan/plan-summary-orgs-defects-remediation.md
```

Two of these are worth naming specifically:

- `make/50-dev-core-js.mk` has **no counterpart path** in `core-server` (whose Rollup fragments are `50-sdlcforge-server-js.mk` and `50-sdlcforge-server-exec-js.mk`), so it arrives clean and, left in place, would add a third Rollup target building a `dist/dev-core.js` artifact into the merged package. `Makefile`'s `include make/*.mk` picks it up with no further edit.
- `.sdlc-data.yaml` is dev-core's Catalyst-generator inventory; `core-server`'s equivalent is `.catalyst-data.yaml`. Different filenames, so no conflict, and the arriving file is silently additive.

`package-lock.json` likewise has no counterpart (`core-server` is on Bun and tracks `bun.lock`), so it too arrives clean and must be removed rather than resolved.

The recipe's own warning applies with full force here: **git's conflict list is not the list of files to review.** Only `README.md`, `Makefile`, `package.json`, `docs/architecture.md`, `plan/followups.yaml`, `plan/manifest.yaml`, `.gitignore`, and the identically-named `make/*.mk` fragments can possibly conflict, and an identical generated fragment merges silently with no conflict at all. Verification must be a blob comparison of every root-level path against its pre-merge commit.

## Dependency shape

`core-server` declares 21 runtime dependencies; `dev-core` declares 24. The overlap is substantial, and on most overlapping entries **`dev-core`'s range is the higher one**:

| Dependency | `core-server` | `dev-core` | Higher |
|---|---|---|---|
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.16` | dev-core |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.16` | `^1.0.0-alpha.25` | dev-core |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.16` | `^1.0.0-alpha.17` | dev-core |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.8` | `^1.0.0-alpha.9` | dev-core |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.21` | dev-core |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.7` | `^1.0.0-alpha.10` | dev-core |
| `@liquid-labs/liq-credentials-db` | `^1.0.0-alpha.9` | `^1.0.0-alpha.7` | **core-server** |
| `@liquid-labs/http-smart-response` | `^1.0.0-alpha.6` | `^1.0.0-alpha.6` | tie |
| `@liquid-labs/resource-model` | `^1.0.0-alpha.10` | `^1.0.0-alpha.10` | tie |
| `@liquid-labs/octocache` | `^1.0.0-alpha.4` | `^1.0.0-alpha.4` | tie |
| `http-errors`, `js-yaml` | `^2.0.0`, `^4.1.0` | same | tie |

This matters more than the mechanical "higher range wins" rule suggests: applying it upgrades six ranges that `core-server`'s **own already-absorbed** `controls`/`credentials`/`issues-github` code currently resolves against. The consolidation contract's scope fence says the consolidation "does not upgrade any dependency beyond the version-range union" — but the union itself is the upgrade here, and it lands under absorbed code that was never tested against those ranges. That risk is real and belongs in the dependency-union research, not in an implementer's judgment at merge time.

Wholly new to `core-server`: `@liquid-labs/condition-eval`, `@liquid-labs/credentials-db-plugin-github`, `@liquid-labs/dependency-runner`, `@liquid-labs/federated-json`, `@liquid-labs/playground-monitor`, `@liquid-labs/plugable-defaults`, `@liquid-labs/semver-plus`, `highlight.js`, `natural-sort`, `npm-check-plus`, `shelljs`.

Two of those deserve a second look during the union rather than a mechanical copy:

- **`npm-check-plus`** sits in dev-core's runtime `dependencies` but reads as tooling; dev-core's own `_npm-check-plus.depcheck.ignoreMatches` block hints at the same. If it is not imported from `src/`, it does not belong in the merged runtime set.
- **`shelljs`** is the subject of wave-plan followup `hwbY` — found incompatible with bundled Bun output during the `sdlcpilot-cli` single-binary spike, and recommended for replacement with `node:child_process` before the downstream `cli-mcp-binary-generation` plan-group. Absorbing dev-core moves that liability into `core-server`. Out of scope to fix here; worth recording as an inherited item.

`core-server`'s two `file:` specs (`@liquid-labs/plugable-express`, `@sdlcforge/dev-core`) are pre-existing. The second one **leaves** at absorption. `dev-core` declares no `file:` spec of its own, so the union introduces none — but the recipe's `grep -n 'file:' package.json` check still applies, and should show exactly one surviving entry (`plugable-express`).

`@sdlcforge/core-server` is the **only** dependent of `@sdlcforge/dev-core` anywhere in the playground (`grep -rln '"@sdlcforge/dev-core"' --include=package.json`), so no consumer repointing work exists on this side of the merge.

## Toolchain divergence

`dev-core` is npm + `@liquid-labs/sdlc-resource-*` Catalyst resources; `core-server` is Bun + `@liquid-labs/catalyst-resource-*`. The merged package keeps `core-server`'s toolchain wholesale — Bun for package management, `catalyst-resource-babel-and-rollup`/`-eslint`/`-jest` for the build. Nothing of dev-core's build configuration is carried forward, which is why every one of its `make/*.mk` fragments, its `.sdlc-data.yaml`, and its `package-lock.json` are drops rather than merges. The lockfile refresh follows this project's own documented Bun procedure (`rm -f bun.lock && bun install`), never `npm install`.

## Related documents

- [`component-order-and-manifest-mechanics.md`](./component-order-and-manifest-mechanics.md) — why the seven components are declared in the order they are, and what that order changes.
- [`../resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md) — the predecessor plan-group's parity contract; the model for Phase 1's own.
- [`../resources/absorption-dependency-union.md`](../resources/absorption-dependency-union.md) — the predecessor plan-group's dependency-union document; the model for this plan's.
