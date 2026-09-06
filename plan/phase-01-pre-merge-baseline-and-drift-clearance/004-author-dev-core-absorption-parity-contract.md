# Author Dev-Core Absorption Parity Contract

## Purpose and scope

Author this merge's own parity contract — `plan/resources/dev-core-absorption-parity-contract.md` — the enumerated, agreed-in-advance list of every baseline observable expected to *change* once the `@sdlcforge/dev-core` absorption lands, with the reason for each, modelled directly on the predecessor plan-group's [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md). Anything not on this list is a regression Phase 4 must catch. Depends on task 002 for an accurate drift-cleared "current state" starting point; independent of task 003's artifact and may run in parallel with it — both are documentation-only tasks writing to different new files under `plan/resources/`.

## Requirements

role_doc: plugins/flow/roles/architect-backend.md

Author `plan/resources/dev-core-absorption-parity-contract.md`, structured like the predecessor `plan/resources/absorption-parity-contract.md` (numbered sections, one per class of expected diff, each stating what changes, what stays fixed, and why), covering **at minimum**:

1. **Route re-attribution.** All 112 routes currently attributed to `@sdlcforge/dev-core` in `full-tier-api-spec.json` change `npmName` to `@sdlcforge/core-server` once the four submodules are wired in as builtins (bringing `@sdlcforge/core-server`'s total to 118). State explicitly that route **count** stays 165 and that no `path`, `method`, `matcher`, `help`, or `parameters` value changes on any route.
2. **Route reordering within `app.ext.handlers`.** Per `plan/notes/component-order-and-manifest-mechanics.md`, the seven-component DAG order (`credentials → projects → orgs → controls → issues-github → work → projects-audit`) fixes where each component's routes land in the builtin block, moving dev-core's 112 routes from *after* the four `sdlc-projects-*` explicit plugins to *inside* the builtin block, interleaved among the existing six. State that this is order-only — no route identity changes — and that any comparison must either normalize for order before comparing or treat the reordering itself as an accepted diff.
3. **The plugins-list 6 → 5 transition.** `full-tier-plugins-list.json`'s `@sdlcforge/dev-core` entry disappears; `@sdlcforge/core-server`'s existing entry is rewritten (`summary`, and any other field the merged builtin aggregate changes) to reflect the seven-component set rather than three. State the current three-component `summary` string (read it from `src/lib/builtin-plugins.mjs`) as the "changes from" baseline, and state plainly that Phase 3's task commits to the exact post-merge text — do not invent a summary string Phase 3 has not yet written.
4. **Integrations-list `npmName` re-identification.** Determine, by reading dev-core's `src/` for `IntegrationsManager`/integration-hook usage, whether any of the four absorbed submodules registers an integration provider. `full-tier-baseline.test.js`'s current `EXPECTED_INTEGRATION_PROVIDERS` baseline shows only `controls`/`tickets`/`pull request`, none attributed to `@sdlcforge/dev-core` today — if dev-core registers no providers, state that explicitly as a confirmed non-event rather than omitting the section; if it does, describe the re-identification on the same terms as items 1–2.
5. **`GET /server/plugins/details/@sdlcforge%2Fdev-core` ceases to resolve** once the `handlerPlugins` entry for `@sdlcforge/dev-core` disappears (the `serverPluginName` path variable's option set is derived from `app.ext.handlerPlugins`). State the converse explicitly: `GET /server/plugins/details/@sdlcforge%2Fcore-server` continues to resolve, now describing the seven-component aggregate.
6. **`golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical throughout.** State explicitly why: both are captured with `skipCorePlugins: true`, which suppresses the entire builtin tier (three components today, seven after this plan), so the absorption is invisible to either snapshot at every intermediate checkpoint, not only at completion.
7. **Setup-method names and `deps` — unchanged.** Draw from `plan/resources/dev-core-absorption-pre-merge-baseline.md`'s recorded pre-merge setup-method table (task 003) and the four absorbed submodules' own setup contributions per `plan/notes/merged-manifest-graph-projection.md`'s candidate manifest. State that names and `deps` strings for absorbed methods carry over verbatim, since `@liquid-labs/dependency-runner` matches dependency names by exact string.
8. **`app.ext` key set — unchanged.** No absorbed component adds, removes, or renames an `app.ext` key beyond what is already present pre-merge, per `plan/notes/pre-merge-state.md` and `plan/resources/dev-core-absorption-pre-merge-baseline.md`'s recorded key set. Cross-check against the seven-component candidate manifest's `provides` entries in `plan/notes/merged-manifest-graph-projection.md`.
9. **The plugin-graph finding set.** From task 003's recorded pre-merge finding set (one allowlisted error, plus whatever `info`/`debug` findings the real graph currently produces) to the measured post-merge set in `plan/notes/merged-manifest-graph-projection.md` (`outcome: 'ok'`, zero errors; the currently-allowlisted finding resolves via the reordering, and the yalc-drift finding downgrades to `info`, per that note). State the final expected post-merge finding set explicitly (1 `info` plus the `debug`-severity `unmanifested-node` findings for the untouched `sdlc-projects-*` plugins) and state that `ALLOWLISTED_ERROR_FINDINGS` is **deleted outright** in Phase 4, not merely trimmed further.
10. **A closing statement** — "anything not on this list is a regression" — matching the predecessor contract's own closing section, naming explicitly what stays fixed: registered path variables beyond what item 5 covers, the `app.ext.credentialsDB` method set, and any snapshot or golden file not named above.

## Validation

1. `plan/resources/dev-core-absorption-parity-contract.md` exists, opens with `## Purpose and scope`, and covers all ten items above — or states explicitly, with cited evidence, why a given item does not apply (e.g. item 4, if dev-core registers no integration providers).
2. Every numeric claim (165 routes, 112 → 118, 6 → 5, etc.) is traceable to a cited source document — `plan/notes/pre-merge-state.md`, `plan/notes/dependency-union.md`, `plan/notes/merged-manifest-graph-projection.md`, `plan/notes/component-order-and-manifest-mechanics.md`, or `plan/resources/dev-core-absorption-pre-merge-baseline.md` — rather than restated from memory.
3. No claim contradicts `plan/overview.md`'s "What must not change" section (route count, golden snapshots, `app.ext` key names, setup-method names/`deps`, the `plugable-express` yalc link, no rename, no release).
4. The document closes with an explicit "anything not on this list is a regression" statement, per item 10.
5. `git diff --stat` shows only the new `plan/resources/dev-core-absorption-parity-contract.md` file — this is a documentation-only task with no source or test change.

## Assumptions

- Item 4 (integrations-list re-identification) may resolve to "no change" if dev-core registers no `IntegrationsManager` providers; confirm this by reading `dev-core`'s own `src/` rather than assuming from the current `EXPECTED_INTEGRATION_PROVIDERS` baseline, which only reflects already-absorbed components from an earlier plan.
- The exact `summary` string Phase 3 will assign the merged `@sdlcforge/core-server` builtin entry (item 3) is not yet committed; state the current three-component summary as the "changes from" reference point and flag that Phase 3's own task must confirm/finalize the literal post-merge text.
- Task 003's baseline artifact (`plan/resources/dev-core-absorption-pre-merge-baseline.md`) is the authoritative source for items 7–9's pre-merge figures; if this task runs before task 003 completes, pull the same figures directly from `plan/notes/pre-merge-state.md` and `plan/notes/merged-manifest-graph-projection.md` instead and note the substitution.

## References

- [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md) — the predecessor plan-group's parity contract; the structural model for this document.
- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md) — route/plugin surface counts.
- [`plan/notes/dependency-union.md`](../notes/dependency-union.md) — dependency-side context, cross-referenced for the `file:` and sole-dependent facts.
- [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — the DAG order and its route-reordering consequence.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the measured post-merge finding set and candidate manifest.
- [`plan/overview.md`](../overview.md) — the plan's "What must not change" and success criteria this contract must stay consistent with.

## Status

**Outcome: succeeded.** 2026-09-06.

Authored `plan/resources/dev-core-absorption-parity-contract.md`, covering all ten required items. Items 1–3 and 9 were verified directly against the live repository state rather than only against the planning-time notes: `test/__snapshots__/full-tier-api-spec.json` (165 routes, 112 attributed to `@sdlcforge/dev-core`), `test/__snapshots__/full-tier-plugins-list.json` (6 entries), the current three-component `summary` string in `src/lib/builtin-plugins.mjs`, and the current (post-task-002) `ALLOWLISTED_ERROR_FINDINGS` array in `src/lib/test/plugin-graph-gate.test.js` (now exactly one entry, confirming the drift-cleared starting state item 9 describes).

Item 4 (integrations-list re-identification) resolved to a confirmed non-event: a direct read of `@sdlcforge/dev-core`'s `src/` (checkout at `/Users/zane/playground/sdlcforge/dev-core`) found no `IntegrationsManager`/`integrations.register()` usage anywhere in the four absorbed submodules; the only `app.ext.integrations` usage is in `work`, and every site is a `hasHook`/`callHook` consumer call, never a `.register()` provider call.

Per this task's own `## Assumptions`, task 003's baseline artifact (`plan/resources/dev-core-absorption-pre-merge-baseline.md`) had not yet landed when this task ran (it was executing concurrently in a sibling worktree). Items 7 (setup-method table) and 8 (`app.ext` key set) therefore pull their figures directly from the predecessor `plan/resources/absorption-parity-contract.md`'s own recorded tables (still accurate today, since nothing has touched those observables since capture) cross-checked against `plan/notes/merged-manifest-graph-projection.md`'s candidate manifest — noted explicitly inline at each point of substitution, per the assumption's own instruction.

Validation: all five checks passed. `git diff --stat` (via `git status --porcelain`) shows only the one new file, `plan/resources/dev-core-absorption-parity-contract.md` — no source or test change. Affected file: `plan/resources/dev-core-absorption-parity-contract.md`.
