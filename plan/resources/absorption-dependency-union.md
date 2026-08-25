# Absorption Dependency Union

## Purpose and scope

The final, verified table of every runtime dependency the three donors contribute to `core-server`'s `package.json` at absorption, correcting the starting table in [`absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md#dependency-union) against what is actually observed on each donor's current `plan/core-server-domain-consolidation` branch. It closes the two open questions that table left standing (`liq-controls`' apparently-unused declarations, `issues-github`'s undeclared `@liquid-labs/octocache` import) and adds the undeclared-bare-specifier sweep the layout note did not attempt.

Every claim below cites the donor branch and commit it was read from, captured 2026-08-24:

| Donor | Branch | Commit |
|---|---|---|
| `@liquid-labs/liq-controls` | `plan/core-server-domain-consolidation` | `3030cdab991fadab6fee8d50e27ae244ab2051de` |
| `@liquid-labs/liq-credentials` | `plan/core-server-domain-consolidation` | `fc72da1dc483c8cfff7f303d391f71741297e866` |
| `@liquid-labs/liq-integrations-issues-github` | `plan/core-server-domain-consolidation` | `e5240c1a5773a3153fe42c1311c9b04a48e6d488` |

Per [Assumptions](../phase-03-absorption-baseline/003-confirm-inventory-and-parity-contract.md#assumptions), these are snapshots. Phase 5's absorb tasks must re-verify against the donor's branch tip at absorb time rather than trust this table blindly — it exists to make that re-check cheap and any discrepancy visible.

## Requirement 1 — the `liq-controls` unused-dependency question, resolved

`liq-controls`' `package.json` (commit `3030cdab9`) declares `@liquid-labs/liq-qa-lib` (`^1.0.0-alpha.8`) and `@liquid-labs/http-smart-response` (`^1.0.0-alpha.3`). A full sweep of every `import`/`from`/dynamic-`import(` statement under `src/lib/` (excluding `test/` — 8 non-test source files: `src/lib/index.js`, `src/lib/setup.mjs`, `src/lib/resources/{control,controls,question-control,load-controls}.mjs`, `src/lib/integrations/{register-controls-integrations,get-question-controls}.mjs`, `src/lib/handlers/index.js`, `src/lib/handlers/orgs/index.js`, `src/lib/handlers/orgs/controls/{index.js,list.mjs,list-implied.mjs}`, `src/lib/handlers/orgs/controls/_lib/list-lib.mjs`) finds:

- **`@liquid-labs/liq-qa-lib`: zero references**, static or dynamic. Confirmed unused.
- **`@liquid-labs/http-smart-response`: zero references**, static or dynamic. Confirmed unused.

**Decision:** neither is carried into the union on `controls`' own account.

- `@liquid-labs/http-smart-response` is moot regardless — it is already a `core-server` dependency at `^1.0.0-alpha.6`, higher than any donor's declared range (see the table below).
- `@liquid-labs/liq-qa-lib` is carried into the union on `issues-github`'s account instead (it genuinely imports from `@liquid-labs/liq-qa-lib` — see Requirement 3), so the net outcome is unchanged whether or not `controls` "justifies" it; `controls` alone does not.

## Requirement 2 — the `issues-github` `@liquid-labs/octocache` situation, resolved

`liq-integrations-issues-github`' `src/create-or-update-pull-request.mjs:5` (commit `e5240c1a5`) reads:

```javascript
import { Octocache } from '@liquid-labs/octocache'
```

`@liquid-labs/octocache` is **not** in that donor's declared `dependencies` (verified against its `package.json` at the same commit — the full declared set is `@liquid-labs/git-toolkit`, `@liquid-labs/github-toolkit`, `@liquid-labs/liq-projects-lib`, `@liquid-labs/liq-qa-lib`, `@liquid-labs/shell-toolkit`; `octocache` is absent). It resolves transitively today only because `@liquid-labs/liq-projects-lib`, `@liquid-labs/github-toolkit`, and `@liquid-labs/liq-work` all declare it as their own direct dependency, so it lands in `core-server`'s `node_modules` regardless of `issues-github`'s own manifest.

**Resolved version, from `core-server`'s installed tree** (`node_modules/@liquid-labs/octocache/package.json` and `bun.lock`, both agree): **`1.0.0-alpha.4`**. `bun.lock` shows every current declarer pinning `^1.0.0-alpha.4` (`@liquid-labs/liq-projects-lib`, `@liquid-labs/liq-work`) or a looser `^1.0.0-alpha.3` (`@liquid-labs/github-toolkit`) against the same resolved `1.0.0-alpha.4`.

**Decision:** declare `"@liquid-labs/octocache": "^1.0.0-alpha.4"` explicitly in `core-server`'s `package.json` at absorption — matching the range the tightest current transitive declarer (`liq-projects-lib`, `liq-work`) already uses, and consistent with the resolved installed version. This is not optional: `nodeExternals()` (the Rollup config both `make/50-sdlcforge-server-js.mk` and `make/50-sdlcforge-server-exec-js.mk` invoke) decides externality from `package.json`'s declared `dependencies`. An undeclared bare specifier is not externalized; Rollup finds it in `node_modules` and inlines it silently into `dist/sdlcforge-server.js`. The build stays green; the artifact is wrong for a registry consumer whose transitive graph does not happen to carry `octocache` some other way.

## Requirement 3 — undeclared-bare-specifier sweep, per donor

For each donor, every bare-specifier `import`/`from` under `src/` (excluding `test/`), diffed against that donor's declared `dependencies` + `peerDependencies` + Node builtins (`node:fs/promises`, `node:path` — both used and both builtins, never expected in `dependencies`).

### `liq-controls` (commit `3030cdab9`) — none found

Bare specifiers actually imported: `@liquid-labs/find-plus`, `@liquid-labs/liq-handlers-lib`, `@liquid-labs/npm-toolkit`, `@liquid-labs/resource-item`, `@liquid-labs/resource-model`, `http-errors`, `js-yaml`, plus the two Node builtins above. Every one of the seven package specifiers is declared in `package.json` (which also declares two more — `@liquid-labs/liq-qa-lib`, `@liquid-labs/http-smart-response` — that are unused; see Requirement 1, a "declared but unused" defect, not an "imported but undeclared" one). No discrepancy.

### `liq-credentials` (commit `fc72da1d`) — none found

Bare specifiers actually imported: `@liquid-labs/http-smart-response`, `@liquid-labs/liq-credentials-db`, `@liquid-labs/liq-handlers-lib`, plus the two Node builtins. All three package specifiers are declared. No discrepancy. (This donor has not yet relocated its tree to `src/credentials/` — it still roots at `src/` with its own `src/index.js` — per this task's Assumptions; the sweep was run against the tree as it currently stands.)

### `liq-integrations-issues-github` (commit `e5240c1a5`) — one found: `@liquid-labs/octocache`

Bare specifiers actually imported: `@liquid-labs/git-toolkit`, `@liquid-labs/github-toolkit`, `@liquid-labs/liq-projects-lib`, `@liquid-labs/liq-qa-lib`, `@liquid-labs/octocache`, `@liquid-labs/shell-toolkit`. Declared: `@liquid-labs/git-toolkit`, `@liquid-labs/github-toolkit`, `@liquid-labs/liq-projects-lib`, `@liquid-labs/liq-qa-lib`, `@liquid-labs/shell-toolkit`. The one discrepancy is `@liquid-labs/octocache` — already covered in full under Requirement 2. No other discrepancy.

## Requirement 4 — the `determineCurrentMilestone` coupling, current state

`liq-integrations-issues-github/src/create-or-update-pull-request.mjs:3` (commit `e5240c1a5`) reads:

```javascript
import { determineCurrentMilestone } from '@liquid-labs/liq-projects-lib'
```

**As observed now, the inlining task has not landed** — the import is live on the donor's current `plan/core-server-domain-consolidation` branch tip. `@liquid-labs/liq-projects-lib` therefore enters the dependency union below.

**This is a snapshot, not a guarantee.** The donor is being edited in parallel under its own plan slice; the inlining task could land at any point between now and Phase 5. **Phase 5 task 003 (`Absorb Liq-Integrations-Issues-Github`) must re-check `create-or-update-pull-request.mjs`'s import list against the donor's branch tip at absorb time rather than trust this reading.** If the inlining has landed by then, `@liquid-labs/liq-projects-lib` drops out of the union; every other dependency in this table is unaffected either way.

## Final dependency-union table

Starting from [`absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md#dependency-union)'s table, corrected against the findings above.

| Dependency | Range to declare | From | Note |
|---|---|---|---|
| `@liquid-labs/find-plus` | `^1.0.1` | controls | new to `core-server` |
| `@liquid-labs/http-smart-response` | `^1.0.0-alpha.6` (unchanged) | *(already present)* | controls (`^1.0.0-alpha.3`, unused — Requirement 1) and credentials (`^1.0.0-alpha.3`, used) both declare lower ranges than `core-server`'s existing `^1.0.0-alpha.6`; keep `core-server`'s |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.16` | controls (`^1.0.0-alpha.15`), credentials (`^1.0.0-alpha.16`) | higher range wins, per contract rule |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.8` | issues-github | genuinely imported by issues-github (Requirement 3); controls declares the same range but does not import it (Requirement 1) — carried in on issues-github's account, controls' declaration is moot |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.15` | controls | new |
| `@liquid-labs/resource-item` | `^1.0.0-alpha.4` | controls | new |
| `@liquid-labs/resource-model` | `^1.0.0-alpha.10` | controls | new |
| `http-errors` | `^2.0.0` | controls | new |
| `js-yaml` | `^4.1.0` | controls | new |
| `@liquid-labs/liq-credentials-db` | `^1.0.0-alpha.9` | credentials | **stays an external runtime dependency — not folded into `core-server`'s source tree**, but still enters `package.json` since credentials' own code (which is absorbed) imports it |
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.15` | issues-github | new |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.16` | issues-github | new |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.7` | issues-github | new |
| `@liquid-labs/liq-projects-lib` | `^1.0.0-alpha.11` | issues-github | **conditional — only if the `determineCurrentMilestone` inlining has *not* landed by absorb time** (Requirement 4; not landed as of this snapshot). Phase 5 task 003 must re-check. |
| `@liquid-labs/octocache` | `^1.0.0-alpha.4` | issues-github | **imported but not declared** by the donor (Requirement 2). Must be declared explicitly — `nodeExternals()` will otherwise silently inline it. |

Every dependency above was verified against the cited commit for the donor named in its "From" column; ranges for controls- and credentials-sourced entries are read directly from that donor's `package.json` at the commit in the table at the top of this document, and `octocache`'s range is read from `core-server`'s own installed tree (Requirement 2) rather than from any donor manifest, since no donor declares it.

## `file:` spec constraint

**No new `file:` spec is introduced.** Every range in the table above is a semver range (`^...`) or a plain version; none is a `file:` path. The two pre-existing `file:` specs in `core-server`'s `package.json` (`@liquid-labs/liq-projects`, `@liquid-labs/plugable-express`) are out of scope for this task and stay untouched.

## What is explicitly out of scope here

- The three donor packages themselves (`@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, `@liquid-labs/liq-integrations-issues-github`) are **removed** from `core-server`'s `dependencies` at absorption — they are not part of the union, they are what the union replaces. Not listed above; Phase 5's per-donor absorb tasks own that removal.
- `@liquid-labs/liq-orgs` and `@liquid-labs/liq-projects` stay separate, unaffected explicit-tier dependencies (per `plan/overview.md`'s "What must not change").

## Related documents

- [`absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md#dependency-union) — the starting table this corrects.
- [`absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — the inventory whose **TO CONFIRM** markers this document resolves (Requirements 1 and 4 above).
- [`absorption-parity-contract.md`](./absorption-parity-contract.md) — the companion document enumerating expected baseline diffs.
