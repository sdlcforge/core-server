# Verify Parity And Tighten Gate

## Purpose and scope

Phase 4 of the `sdlc-core-unification` plan. Checks the merged server against Phase 1's parity contract item by item, rebaselines the snapshots the contract says should move, and removes the allowlist the merge exists to make unnecessary.

## Goals

1. **Verify against the contract, not against judgment.** Phase 1's parity contract enumerates every observable expected to change and why; anything not on it is a regression. This phase walks that list rather than diffing snapshots and asking, one hunk at a time, whether a change looks acceptable.

   The core expectations: route count stays **165**; `npmName` provenance moves for dev-core's **112** routes, taking `@sdlcforge/core-server`'s own total to **118**; no `path`, `method`, `matcher`, `help`, or `parameters` value changes on any route; route *ordering* changes as the absorbed components move into the builtin block ahead of the explicit tier and as `controls` moves behind `credentials`/`projects`/`orgs`; the plugins list goes **6 → 5**; the integrations list re-identifies its providers under `@sdlcforge/core-server`; and `GET /server/plugins/details/@sdlcforge%2Fdev-core` stops resolving while `…%2Fcore-server` remains valid.

2. **Confirm the negative space explicitly.** `test/__snapshots__/golden-api-spec.json` and `golden-plugins-list.json` must be **byte-identical** to their pre-merge state. Both are captured with `skipCorePlugins: true`, which gates out the entire builtin tier, so absorbing four more components into that tier cannot legitimately move either. Any diff on either file is a regression, not an accepted change — this is the single cheapest signal that the absorbed code landed in the tier it was supposed to.

   Likewise unchanged: setup-method `{ name, deps }` pairs (`@liquid-labs/dependency-runner` matches by exact string), the `app.ext` key set, and the registered path-variable set — the merged set of `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `parameterKey`, `workKey`, and `credential` has no collision, and a collision would not shadow silently but throw at startup.

3. **Delete `ALLOWLISTED_ERROR_FINDINGS` outright and assert `outcome: 'ok'`.** Not "shrink the array" — **delete it**, along with the filtering logic that consumes it. The [merged-manifest graph projection](../notes/merged-manifest-graph-projection.md#headline-result) ran the real `validatePluginSet()` against the real candidate manifest and returned `outcome: 'ok'`, `exitCode: 0`, `counts: { error: 0, warning: 0, info: 1 }`. Both current entries disappear, for two different reasons: the `violated-by-source-order` entry is resolved by Phase 3's reordering (the edge flips to `satisfied-by-source-order`), and the `unsatisfied` entry is cleared by Phase 1's drift clearance and then downgraded to `info` by carrying dev-core's source declaration. The assertions become `outcome === 'ok'`, `exitCode === 0`, and `counts.error === 0`, replacing today's deliberately-recorded `'validation-failure'` / `1`.

   The full post-merge finding set is predicted concretely enough to assert against — **five findings, no more and no fewer**: one `info` `unsatisfied` on `appExt:_liqOrgs.orgSetupMethods` for `@sdlcforge/core-server#orgs` (`optional: true`, phase `setup`), and four `debug` `unmanifested-node` findings for the untouched `@liquid-labs/sdlc-projects-*` explicit plugins. `debug` findings are present in `findings` but not tallied in `counts`. Coverage is unchanged (`sourcesSearched: ['builtin', 'serverPackageRoot']`), so the existing coverage-boundary test needs no change.

   **Two hazards to distinguish before concluding the merge did not help.** Both were measured, and both produce error findings that look merge-caused and are not:

   - **21 errors and 2 warnings** means `@sdlcforge/dev-core` was left in `explicitPlugins`. Removing it from `dependencies` alone is not sufficient — discovery is driven by `explicitPlugins` membership. Read this as an incomplete Phase 3, not as a wrong manifest.
   - **Exactly 1 `unsatisfied` error on `appExt:_liqOrgs.orgSetupMethods`** means the four absorbed component bodies were transcribed from `node_modules/@sdlcforge/dev-core/package.json` rather than from dev-core's source tree — the known yalc drift, transcribed. The fix is to re-source the block, not to re-allowlist the finding.

   **Strictness flags.** `strictOrder: true` was measured as still `ok` on the merged set — there is not one `order-unprovable` edge left, a genuine improvement the merge buys and one the gate could opt into for free. `strictOptional: true` **fails** (`{ error: 1 }`, the `orgSetupMethods` info promoted); the gate must keep it at its default `false` and no task should enable it opportunistically.

   **If a finding genuinely survives anyway**, keep exactly that one allowlisted with a fresh justification comment explaining why it is not resolvable here, and report which it was. Do not weaken the assertion to pass an unexamined set, and do not allowlist a finding the merge introduced without saying so. Preserve the scoping discipline the dropped donor suite embodied — name the expected out-of-package gaps explicitly rather than asserting an unqualified clean graph.

4. **Repair the tests that name a package that no longer exists.** `plugin-graph-gate.test.js` asserts against `@sdlcforge/dev-core#projects` and `@sdlcforge/dev-core#work` node IDs in two of its four tests, and its non-trivial-graph test lists `@sdlcforge/dev-core#projects` among expected nodes. Those node IDs become `@sdlcforge/core-server#projects` and `#work`. The two edges those tests were chartered to prove (`appExt:credentialsDB` into `projects`, `appExt:serverConfigRoot` into `work`) still exist and still deserve assertions — but `serverConfigRoot`'s provider is the framework's own intrinsic manifest, so its `orderVerdict` is `null` by schema design rather than a satisfaction literal, and that distinction must survive the rename rather than being flattened.

   The sibling `plugin-graph-absorbed-donor-conflicts.test.js`, `plugin-graph-third-party-ordering.test.js`, and `plugin-graph-serverconfigroot-rename.test.js` need the same sweep for stale `@sdlcforge/dev-core` node IDs.

5. **Do not silently repair inherited defects.** Followup `uROI` — `IntegrationsManager.listInstalledPlugins()` collapsing the `tickets` and `pull request` providers because both `register()` calls omit `name` — is captured in the baseline as deliberately-preserved behavior and lives in `@liquid-labs/plugable-express`, out of scope. Absorption must not accidentally "fix" it by supplying a `name`. Followups `b3hk`/`mLm3` (~233 pre-existing ESLint errors) and `NEJt` (the `liq-handlers-lib` next-commands crash) are likewise pre-existing and out of scope.

## Inputs

- Phase 3's output: seven components wired and declared, `@sdlcforge/dev-core` fully removed, and snapshot diffs handed forward unresolved.
- Phase 1's parity contract (`plan/resources/dev-core-absorption-parity-contract.md`), recorded baseline artifact, and the pre-merge `validatePluginSet()` finding set.
- [`notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — **complete**. Its ["Full post-merge finding set"](../notes/merged-manifest-graph-projection.md#full-post-merge-finding-set-all-severities) table and verbatim rendered report are the concrete prediction this phase measures against, and its two failure modes are goal 3's hazards.
- `bun run test:update-full-tier-baseline` (`UPDATE_FULL_TIER_BASELINE=true TEST=full-tier-baseline make test`) — the existing, scripted rebaseline path.
- `make/56-plugin-graph.mk` — the build wiring that makes the graph gate part of `make test`/`make qa`, unchanged by this phase.

## Outputs

- Rebaselined `test/__snapshots__/full-tier-{api-spec,plugins-list,integrations-list}.json`, with the diff justified line-of-argument by line-of-argument against the parity contract, and 118 routes attributed to `@sdlcforge/core-server`.
- `golden-api-spec.json` and `golden-plugins-list.json` verified byte-identical.
- `src/lib/test/plugin-graph-gate.test.js` with `ALLOWLISTED_ERROR_FINDINGS` and its filtering logic **deleted**, asserting `outcome === 'ok'`, `exitCode === 0`, and `counts.error === 0` — or, if a finding genuinely survives, exactly one allowlisted entry with fresh justification and an explicit report of which.
- All plugin-graph tests repointed off `@sdlcforge/dev-core#…` node IDs.
- `make build`, `make test`, `make lint`, and `bun run test:local` green.
- A written parity-verification record naming any contract item that did not hold, for the manager to triage.
- The document set the now-registered Phase 6 `doc-updates` must cover — including the `README.md` route tables and the `docs/architecture.md` submodule-decomposition, composite-`setup`-ordering, and `app.ext` service-contract material that Phase 2's `--ours` resolutions deliberately deferred, plus the disposition of the two kept arrivals (`docs/consumer-migration.md`, `docs/dev-core-consolidation-contract.md`): `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`, and `docs/core-server-spec.md`. That pass should also decide the fate of the still-relevant substance in `dev-core`'s own `docs/dev-core-consolidation-contract.md` (component-boundary contract, composite setup ordering, root-file ownership), which loses its home when dev-core retires. Related standing followups for that pass to consider: `yIza` (stale "expected to eventually supersede" framing in `plugin-loading-tiers.md`), `tonW` (architecture.md's test-infrastructure section omits the full-tier baseline), and `oY63` (project-structure.md's `docs/` prose omits `docs/architecture.md`).
