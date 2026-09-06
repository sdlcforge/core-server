# Pre-Merge Baseline And Drift Clearance

## Purpose and scope

Phase 1 of the `sdlc-core-unification` plan. Establishes what "unchanged" means before anything changes, and clears the one known pre-existing drift so it cannot later be misattributed to the merge.

## Goals

This phase comes first because the absorption's central verification question — "did anything move that should not have?" — is unanswerable after the fact. The predecessor plan-group (`core-server-domain-consolidation`) learned this at three components; at seven, with 112 routes changing provenance in one step, an unrecorded baseline makes Phase 4 a series of judgment calls instead of a checklist.

1. **Clear the yalc drift first.** The installed `node_modules/@sdlcforge/dev-core` snapshot lacks `optional: true` on the `orgs` component's `appExt:_liqOrgs.orgSetupMethods` requirement, which `dev-core`'s own `main` HEAD carries (dev-core followup `x6x1`). Refresh the snapshot per this project's documented Bun procedure and re-run the plugin-graph gate. The expected result is that `ALLOWLISTED_ERROR_FINDINGS`' first entry becomes stale immediately — the `unsatisfied` finding downgrades to `info` — leaving exactly one error-severity finding (`violated-by-source-order` on `appExt:_liqOrgs.orgs` for `@sdlcforge/core-server#controls`) *before* any merge. Dropping that first allowlist entry is legitimate work for this phase, not Phase 4's: it is a pre-existing correction, and doing it here keeps Phase 4's own tightening attributable purely to the merge.
2. **Capture a re-runnable baseline** of every observable the merge could move — not a prose description of one. The predecessor's `full-tier-baseline.test.js` harness and its three checked-in snapshots already mechanize most of this; the gap is the non-snapshot observables (setup-method name/`deps` pairs, the `app.ext` key set, the registered path-variable set, the live plugin-graph finding set).
3. **Author this merge's parity contract** — the enumerated, agreed-in-advance list of every baseline observable expected to change, with the reason for each, so that *anything not on the list is a regression*. Modelled directly on [`resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md), which is the same document written for the same repository one absorption earlier.
4. **Record the pre-merge blob identity of every root-level tracked path.** The recipe's most-repeated warning is that git's conflict list is not the review list: a generated file that is byte-identical on both sides merges silently, and the first absorption in the predecessor plan saw only 6 of 13 expected root-file conflicts for exactly that reason. A recorded blob map turns Phase 2's root-file verification from "did git ask me about it?" into a mechanical comparison.

## Inputs

- The current working branch state of `@sdlcforge/core-server`: 3 in-tree components, `@sdlcforge/dev-core` as an explicit npm plugin, 165 routes, 6 plugins-list entries.
- `@sdlcforge/dev-core` at `/Users/zane/playground/sdlcforge/dev-core`, branch `main` — read-only in this phase; the source of the manifest content whose drift is being cleared.
- `scripts/provision-local-deps.sh` and this project's documented Bun refresh procedure (`rm -f bun.lock && bun install`) from `AGENTS.md`/`CLAUDE.md`. Dependencies are **not installed** in the plan worktree at phase start.
- Existing harness and snapshots: `src/lib/test/full-tier-baseline.test.js`, `src/lib/test/plugin-graph-gate.test.js`, `test/__snapshots__/full-tier-{api-spec,plugins-list,integrations-list}.json`, `test/__snapshots__/golden-{api-spec,plugins-list}.json`, and the `bun run test:update-full-tier-baseline` script.
- [`notes/pre-merge-state.md`](../notes/pre-merge-state.md) — the planning-time reading of all of the above, to be confirmed rather than trusted.
- Known inherited findings that must be recorded as pre-existing rather than fixed: followups `uROI` (IntegrationsManager `name`-keyed dedup collapsing the `tickets` provider), `b3hk`/`mLm3` (~233 pre-existing ESLint errors), `NEJt` (`GET /server/next-commands?command=credentials/` crash in `liq-handlers-lib`).

## Outputs

- A refreshed `node_modules/@sdlcforge/dev-core` snapshot matching dev-core's `main` HEAD, with the drift confirmed cleared by inspection of the installed `package.json`'s `plugable` block — and a regenerated `bun.lock`. Note followups `Z2Ar`, `xsRt`, and `K3cL`: `finalize-task-commit.sh`'s yalc-override guard refuses to commit `bun.lock` in this repository, and the accepted pattern is a documented manual commit.
- `src/lib/test/plugin-graph-gate.test.js` with `ALLOWLISTED_ERROR_FINDINGS` reduced from two entries to one, its scope comment updated to say why, and the test still passing at `outcome: 'validation-failure'` / `exitCode: 1`.
- A recorded baseline artifact under `plan/resources/` covering the observables the checked-in snapshots do not: setup-method `{ name, deps }` pairs, the `app.ext` key set, the registered path-variable set, and the full pre-merge `validatePluginSet()` finding set at every severity.
- `plan/resources/dev-core-absorption-parity-contract.md` — the enumerated expected-diff contract Phase 4 verifies against, covering at minimum: the 112-route `npmName` re-attribution, route reordering within `app.ext.handlers`, the plugins-list 6 → 5 transition and the `@sdlcforge/core-server` summary rewrite, the integrations-list `npmName` re-identification, `GET /server/plugins/details/@sdlcforge%2Fdev-core` ceasing to resolve, and the explicit statement that `golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical throughout.
- A recorded map of pre-merge blob SHAs for every root-level tracked path, for Phase 2's root-file survival check.
- Confirmation that `@sdlcforge/core-server` is the sole dependent of `@sdlcforge/dev-core`, so no consumer repointing work exists.
