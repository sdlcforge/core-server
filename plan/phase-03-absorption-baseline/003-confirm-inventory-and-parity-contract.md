# Confirm Donor Inventory And Author Parity Contract

## Purpose and scope

Two deliverables, both documents rather than code, both needed before Phase 5's merges can be executed safely.

First, **close out the open items in the hand-taken donor inventory** — the dependency-union questions that determine what goes into `core-server`'s `package.json` and that, if guessed wrong, produce a build that is green locally and broken for a registry consumer.

Second, **author the parity contract**: the enumerated, agreed-in-advance list of every baseline observable expected to *change* after absorption, with the reason for each. Without it, Phase 5's verification degenerates into "the snapshot moved, is that fine?" answered one diff at a time by judgment. With it, any diff not on the list is a regression by definition.

This task touches no source and no test. It is analysis plus two written artifacts. It is independent of tasks 001 and 002 and may run in parallel with them.

## Requirements

1. **Confirm the `liq-controls` unused-dependency question.** `@liquid-labs/liq-qa-lib` and `@liquid-labs/http-smart-response` are declared in that donor's `package.json` but appear in no `import` statement under its `src/`. Verify against the donor's **current** `plan/core-server-domain-consolidation` branch (its source is being relocated in parallel, so `main` is not authoritative), covering both static `import` and any dynamic form. Decide, and record, whether each is carried into the union. Note that `@liquid-labs/http-smart-response` is already a `core-server` dependency at `^1.0.0-alpha.6` regardless, and `@liquid-labs/liq-qa-lib` is carried in on `issues-github`'s account regardless — so the only real decision is whether `controls` justifies either on its own.

2. **Confirm the `issues-github` `@liquid-labs/octocache` situation.** It is imported by that donor and declared by nothing, resolving transitively today. Verify the import still exists on the donor's current branch and resolve its correct version range from the installed tree. It **must** be declared explicitly in `core-server`'s `package.json` at absorption: `nodeExternals()` decides externality from `package.json`, so an undeclared bare specifier is not externalized, gets found in `node_modules`, and is silently inlined into `dist/sdlcforge-server.js` — a green build producing an artifact that breaks only for a consumer whose transitive graph differs.

3. **Sweep for any other undeclared bare specifier.** `octocache` is the known instance, not necessarily the only one. For each of the three donors, on its current branch, enumerate every bare-specifier import under `src/` (excluding test files) and diff that set against the donor's declared `dependencies` + `peerDependencies` + Node builtins. Report every discrepancy found.

4. **Determine the live state of the `determineCurrentMilestone` coupling.** `issues-github`'s `create-or-update-pull-request.mjs` imports `determineCurrentMilestone` from `@liquid-labs/liq-projects-lib`; a task in that donor's own plan slice inlines it. Record the state **as observed now**, and state plainly that Phase 5 task 003 must re-check at absorb time rather than trusting this reading — the donor is being edited in parallel and this fact can change between now and then. The consequence either way: `@liquid-labs/liq-projects-lib` enters the dependency union only if the inlining has *not* landed.

5. **Produce the final dependency-union table** at `plan/resources/absorption-dependency-union.md`: every dependency each donor contributes, the range chosen, and the reason on any overlap (per the contract's rule: take the higher range and record the choice). Start from the table in [`plan/notes/absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md#dependency-union) and correct it against what is actually observed. Include the standing constraint that the union must introduce **no new `file:` spec** (two pre-existing ones, `@liquid-labs/liq-projects` and `@liquid-labs/plugable-express`, are out of scope and stay).

6. **Author the parity contract** at `plan/resources/absorption-parity-contract.md`, enumerating every expected diff between the pre-absorption baseline and the post-absorption capture. At minimum it must state:
   - `full-tier-api-spec.json`: the **six** absorbed routes (four from `liq-controls`, two from `liq-credentials`) change `npmName` from their donor package name to `@sdlcforge/core-server`. Route count stays **165**; no `path`, `method`, `matcher`, `help`, or `parameters` value changes.
   - Absorbed routes move to the **front** of the plugin-contributed section of `app.ext.handlers` — immediately after the framework's own core handlers, in the fixed order controls → credentials — rather than being interleaved at `find-plugins` scan order. If the comparison is order-sensitive, it must normalize for order or record this as expected.
   - `full-tier-plugins-list.json`: **11 entries become 9** — the three donor entries disappear and one `@sdlcforge/core-server` entry appears, carrying `package.json`'s `name` and `version` plus the literal summary `Built-in SDLC controls, credentials, and GitHub issues integration.` Note the intermediate states the contract must also tolerate: Phase 4 task 003 takes the list to **12** (the `@sdlcforge/core-server` builtin entry appears while all three donors are still discovered), and each Phase 5 absorb task then drops one donor entry — 12 → 11 → 10 → 9.
   - `full-tier-integrations-list.json` and the `register()` capture: the `controls` provider's `npmName` and both `issues-github` providers' `npmName` become `@sdlcforge/core-server`. `providerFor` values (`controls`, `tickets`, `pull request`), hook names, and the `name`-omission defect all stay exactly as captured.
   - `GET /server/plugins/details/@liquid-labs%2Fliq-controls` and its two siblings **stop resolving**, because the `serverPluginName` path variable's option set is derived from `handlerPlugins`; `@sdlcforge/core-server` becomes a valid value where it previously was not.
   - Setup-method names and `deps` are **unchanged** — all seven, including `load org controls` / `['load orgs']`. Absorbed setup code keeps the donor's exact strings; `@liquid-labs/dependency-runner` matches by exact string.
   - `app.ext` key set is **unchanged**, including `credentialsDB`, and `credentialsDB`'s method set is unchanged.
   - `golden-api-spec.json` (35 entries) and `golden-plugins-list.json` (`[]`) are **unchanged**, because `builtinPlugins` is suppressed under `skipCorePlugins: true`.
   - Anything not on this list is a regression.

7. **Record the incidental setup-ordering coupling as a hazard.** `liq-projects`' `setup()` calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })` at plugin-load time, so it requires `liq-credentials`' `setup()` to have already run. That ordering is **not** mediated by `dependency-runner` — it is incidental to `find-plugins`' alphabetical scan order happening to put `liq-credentials` before `liq-projects`. Once credentials is absorbed, its `setup` runs from `builtinPlugins`, which registers **before** core discovery — so the ordering is preserved and in fact made more robust. State this explicitly in the contract, with the reasoning, so Phase 5 task 002 can verify it rather than rediscover it, and so a future reordering of `builtinPlugins` relative to `loadPlugins` is understood to be load-bearing.

## Validation

- `plan/resources/absorption-dependency-union.md` and `plan/resources/absorption-parity-contract.md` both exist, are committed, and are linked from `plan/overview.md`.
- Every **TO CONFIRM** marker in [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) is resolved with a stated answer and the evidence (file and line) it was resolved from.
- Every claim in the dependency-union table cites the donor branch and commit it was read from, so Phase 5 can tell whether it has gone stale.
- The undeclared-bare-specifier sweep is reported per donor with an explicit "none found" where that is the answer, not by omission.
- No source, test, snapshot, or `package.json` file is modified by this task. `git diff --stat` shows only the two new `plan/resources/` documents.

## Assumptions

- Each donor's `plan/core-server-domain-consolidation` branch exists and is fetchable from its checkout under `/Users/zane/playground/liquid-labs/`. `liq-credentials` and `liq-integrations-issues-github` may have branches with no authored plan and no relocation landed yet — read their source from whatever the branch currently holds, and say so.
- The dependency ranges recorded here are a snapshot, not a guarantee. Phase 5's absorb tasks re-check rather than trusting them blindly; this document exists to make the re-check cheap and to make a discrepancy visible, not to remove it.

## References

- [`plan/notes/absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md#dependency-union) — the starting dependency-union table and the `file:`-spec constraint.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — the inventory whose **TO CONFIRM** markers this task closes.
- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#3-plugin-identity-supply--one-entry-sdlcforgecore-server-s-own-identity) — the identity decision and the three additional accepted-diff items the contract must carry.
- [`plan/notes/plugin-list-visibility.md`](../notes/plugin-list-visibility.md) — why the identity diff is accepted rather than avoided.
- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md#research-findings) — the measured baseline the contract is written against, including the `liq-projects`/`liq-credentials` ordering coupling.

## Checkpoint hints

- After the three donors' import sweeps are complete and the undeclared-specifier findings are written down.
- After `plan/resources/absorption-dependency-union.md` is authored.
- After `plan/resources/absorption-parity-contract.md` is authored and cross-checked against the three notes it draws from.

## Status

**Outcome:** succeeded, with one validation item the task agent could not itself satisfy (see below). Date: 2026-08-24.

Both deliverables were authored and committed: [`plan/resources/absorption-dependency-union.md`](../resources/absorption-dependency-union.md) and [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md). All source reads for the three donors were taken live from their `plan/core-server-domain-consolidation` branch tips, cited by branch and commit in the dependency-union document: `liq-controls@3030cdab991fadab6fee8d50e27ae244ab2051de`, `liq-credentials@fc72da1dc483c8cfff7f303d391f71741297e866`, `liq-integrations-issues-github@e5240c1a5773a3153fe42c1311c9b04a48e6d488`.

Findings summary:
- `liq-controls`' `@liquid-labs/liq-qa-lib` and `@liquid-labs/http-smart-response` declarations are confirmed genuinely unused (zero static or dynamic imports across all 8 non-test source files under `src/lib/`); neither is carried into the union on `controls`' own account.
- `issues-github`'s `@liquid-labs/octocache` import is confirmed live and undeclared; resolved version `^1.0.0-alpha.4` from `core-server`'s installed tree (`node_modules` + `bun.lock`), to be declared explicitly.
- The undeclared-bare-specifier sweep found exactly one discrepancy across all three donors: the `octocache` case above. `liq-controls` and `liq-credentials` both report "none found."
- The `determineCurrentMilestone` / `@liquid-labs/liq-projects-lib` inlining has **not** landed as of the cited `issues-github` commit; the import is live at `src/create-or-update-pull-request.mjs:3`. Flagged explicitly for Phase 5 task 003 to re-check at absorb time.

**One validation item not satisfied by this task agent, by design:** the task's `## Validation` section requires the two new documents to be "linked from `plan/overview.md`," but also requires `git diff --stat` to show only the two new `plan/resources/` documents — and the dispatching manager's operating-contract instructions to this task agent explicitly forbid editing `plan/overview.md` (a master plan doc owned by the manager, per [Plan documents handling protocol](flow-mcp:s/Vl)). These two validation clauses are in direct tension for this task, and the master-plan-doc ownership boundary is a hard contract this agent does not cross. **The two documents are not yet linked from `plan/overview.md`.** The manager (who owns that file) should add two links — e.g. alongside the existing prose mention of both paths in the Phase 3 task 003 bullet — as a follow-up when applying this report. See the structured report's `flagged_for_manager` for the exact suggested edit.
