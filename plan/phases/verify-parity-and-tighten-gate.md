# Verify Parity And Tighten Gate

## Purpose and scope

Phase 4 of the `sdlc-core-unification` plan. Checks the merged server against Phase 1's parity contract item by item, rebaselines the snapshots the contract says should move, and removes the allowlist the merge exists to make unnecessary.

## Goals

1. **Verify against the contract, not against judgment.** Phase 1's parity contract enumerates every observable expected to change and why; anything not on it is a regression. This phase walks that list rather than diffing snapshots and asking, one hunk at a time, whether a change looks acceptable.

   The core expectations: route count stays **165**; `npmName` provenance moves for dev-core's **112** routes, taking `@sdlcforge/core-server`'s own total to **118**; no `path`, `method`, `matcher`, `help`, or `parameters` value changes on any route; route *ordering* changes as the absorbed components move into the builtin block ahead of the explicit tier and as `controls` moves behind `credentials`/`projects`/`orgs`; the plugins list goes **6 → 5**; the integrations list re-identifies its providers under `@sdlcforge/core-server`; and `GET /server/plugins/details/@sdlcforge%2Fdev-core` stops resolving while `…%2Fcore-server` remains valid.

2. **Confirm the negative space explicitly.** `test/__snapshots__/golden-api-spec.json` and `golden-plugins-list.json` must be **byte-identical** to their pre-merge state. Both are captured with `skipCorePlugins: true`, which gates out the entire builtin tier, so absorbing four more components into that tier cannot legitimately move either. Any diff on either file is a regression, not an accepted change — this is the single cheapest signal that the absorbed code landed in the tier it was supposed to.

   Likewise unchanged: setup-method `{ name, deps }` pairs (`@liquid-labs/dependency-runner` matches by exact string), the `app.ext` key set, and the registered path-variable set — the merged set of `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `parameterKey`, `workKey`, and `credential` has no collision, and a collision would not shadow silently but throw at startup.

3. **Empty the allowlist and assert `outcome: 'ok'`.** `ALLOWLISTED_ERROR_FINDINGS` in `src/lib/test/plugin-graph-gate.test.js` should reach zero entries — Phase 1 drops the stale `unsatisfied` entry, and this phase's DAG-ordered declaration is what resolves the `violated-by-source-order` entry on `appExt:_liqOrgs.orgs`. The test's assertions invert accordingly: `outcome === 'ok'` and `exitCode === 0`, replacing today's deliberately-recorded `'validation-failure'` / `1`.

   **If a finding genuinely survives**, keep exactly that one allowlisted with a fresh justification comment explaining why it is not resolvable here, and report which of the two it was. Do not weaken the assertion to pass an unexamined set, and do not allowlist a finding the merge introduced without saying so.

4. **Repair the tests that name a package that no longer exists.** `plugin-graph-gate.test.js` asserts against `@sdlcforge/dev-core#projects` and `@sdlcforge/dev-core#work` node IDs in two of its four tests, and its non-trivial-graph test lists `@sdlcforge/dev-core#projects` among expected nodes. Those node IDs become `@sdlcforge/core-server#projects` and `#work`. The two edges those tests were chartered to prove (`appExt:credentialsDB` into `projects`, `appExt:serverConfigRoot` into `work`) still exist and still deserve assertions — but `serverConfigRoot`'s provider is the framework's own intrinsic manifest, so its `orderVerdict` is `null` by schema design rather than a satisfaction literal, and that distinction must survive the rename rather than being flattened.

   The sibling `plugin-graph-absorbed-donor-conflicts.test.js`, `plugin-graph-third-party-ordering.test.js`, and `plugin-graph-serverconfigroot-rename.test.js` need the same sweep for stale `@sdlcforge/dev-core` node IDs.

5. **Do not silently repair inherited defects.** Followup `uROI` — `IntegrationsManager.listInstalledPlugins()` collapsing the `tickets` and `pull request` providers because both `register()` calls omit `name` — is captured in the baseline as deliberately-preserved behavior and lives in `@liquid-labs/plugable-express`, out of scope. Absorption must not accidentally "fix" it by supplying a `name`. Followups `b3hk`/`mLm3` (~233 pre-existing ESLint errors) and `NEJt` (the `liq-handlers-lib` next-commands crash) are likewise pre-existing and out of scope.

## Inputs

- Phase 3's output: seven components wired and declared, `@sdlcforge/dev-core` fully removed, and snapshot diffs handed forward unresolved.
- Phase 1's parity contract (`plan/resources/dev-core-absorption-parity-contract.md`), recorded baseline artifact, and the pre-merge `validatePluginSet()` finding set.
- The merged-manifest graph projection research, whose predicted post-merge finding set this phase measures against.
- `bun run test:update-full-tier-baseline` (`UPDATE_FULL_TIER_BASELINE=true TEST=full-tier-baseline make test`) — the existing, scripted rebaseline path.
- `make/56-plugin-graph.mk` — the build wiring that makes the graph gate part of `make test`/`make qa`, unchanged by this phase.

## Outputs

- Rebaselined `test/__snapshots__/full-tier-{api-spec,plugins-list,integrations-list}.json`, with the diff justified line-of-argument by line-of-argument against the parity contract, and 118 routes attributed to `@sdlcforge/core-server`.
- `golden-api-spec.json` and `golden-plugins-list.json` verified byte-identical.
- `src/lib/test/plugin-graph-gate.test.js` asserting `outcome === 'ok'`, `exitCode === 0`, and zero error-severity findings — or exactly one, justified and reported.
- All plugin-graph tests repointed off `@sdlcforge/dev-core#…` node IDs.
- `make build`, `make test`, `make lint`, and `bun run test:local` green.
- A written parity-verification record naming any contract item that did not hold, for the manager to triage.
- The document set the `doc-updates` phase must cover, carried forward so it survives to plan re-invocation: `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`, and `docs/core-server-spec.md`. That pass should also decide the fate of the still-relevant substance in `dev-core`'s own `docs/dev-core-consolidation-contract.md` (component-boundary contract, composite setup ordering, root-file ownership), which loses its home when dev-core retires. Related standing followups for that pass to consider: `yIza` (stale "expected to eventually supersede" framing in `plugin-loading-tiers.md`), `tonW` (architecture.md's test-infrastructure section omits the full-tier baseline), and `oY63` (project-structure.md's `docs/` prose omits `docs/architecture.md`).
