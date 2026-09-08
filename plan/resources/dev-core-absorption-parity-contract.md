# Dev-Core Absorption Parity Contract

## Purpose and scope

The enumerated, agreed-in-advance list of every baseline observable expected to *change* once `@sdlcforge/dev-core` is absorbed into `@sdlcforge/core-server` as four additional in-tree builtin components (`projects`, `orgs`, `work`, `projects-audit`), with the reason for each. **Anything not on this list is a regression Phase 4 must catch.**

This is modelled directly on the predecessor plan-group's [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md), which served the identical purpose for the `liq-controls`/`liq-credentials`/`liq-integrations-issues-github` absorption that produced today's three-component builtin aggregate. That absorption has already landed — `src/lib/builtin-plugins.mjs` already aggregates `controls`, `credentials`, and `issuesGitHub` under `@sdlcforge/core-server`'s own identity — so this document's "current state" baseline is the *post*-that-absorption, *pre*-this-absorption state, drift-cleared by task 002.

Task 003's own artifact, `plan/resources/dev-core-absorption-pre-merge-baseline.md`, is the authoritative source for the pre-merge setup-method table (item 7) and `app.ext` key set (item 8) per this task's own `## Assumptions`. That artifact had not yet landed at the time this document was authored, so items 7 and 8 pull the same figures directly from `plan/notes/pre-merge-state.md`, `plan/notes/merged-manifest-graph-projection.md`, and the predecessor `absorption-parity-contract.md`'s own recorded baseline (still accurate today, since nothing has touched those observables since it was captured) — noted inline at each point of substitution.

## 1. `full-tier-api-spec.json` — route re-attribution

Measured directly against the live `test/__snapshots__/full-tier-api-spec.json` (165 total routes; provenance tally: `@liquid-labs/plugable-express` 35, `@sdlcforge/core-server` 6, `@sdlcforge/dev-core` 112, the four `sdlc-projects-*` packages 6+2+2+2), matching [`pre-merge-state.md`](../notes/pre-merge-state.md#route-and-plugin-surface) exactly:

- **All 112 routes currently attributed to `@sdlcforge/dev-core` change `npmName` to `@sdlcforge/core-server`**, once the four submodules (`projects`, `orgs`, `work`, `projects-audit`) are wired in as builtins. `@sdlcforge/core-server`'s own route count rises from 6 to **118** (6 + 112).
- **Route count stays 165.** No route is added or removed by absorption; only `npmName` provenance changes on the 112 routes above.
- **No `path`, `method`, `matcher`, `help`, or `parameters` value changes** on any of the 165 routes, absorbed or not.

## 2. Route reordering within `app.ext.handlers`

Per [`component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md#this-reorders-the-existing-three-components), the seven-component DAG order — `credentials → projects → orgs → controls → issues-github → work → projects-audit` — fixes where each component's routes land in the builtin block. This is **order-only**; no route identity changes.

- `credentials`' 2 routes move ahead of `controls`' 2 routes within the builtin block (`credentials` moves from position 2 to position 1 of the three pre-existing components).
- dev-core's 112 routes move from *after* the four `sdlc-projects-*` explicit plugins (today's position, since `loadBuiltinPlugins` runs before `loadPlugins` and dev-core is currently discovered via `explicitPlugins`) to *inside* the builtin block, interleaved among the existing six routes contributed by `controls`/`credentials`/`issues-github`.
- Any comparison of `app.ext.handlers` or the API spec's route array must either normalize for order before comparing, or treat this reordering itself as an accepted diff rather than a regression.

## 3. The plugins-list 6 → 5 transition

Measured directly against `test/__snapshots__/full-tier-plugins-list.json` (6 entries today: the four `sdlc-projects-*` packages, `@sdlcforge/core-server`, `@sdlcforge/dev-core`), matching [`pre-merge-state.md`](../notes/pre-merge-state.md#route-and-plugin-surface).

- `@sdlcforge/dev-core`'s entry **disappears** from `full-tier-plugins-list.json`, dropping the count to **5**.
- `@sdlcforge/core-server`'s existing entry is **rewritten** to reflect the seven-component set rather than three. Its `summary` field changes from the current three-component string — read directly from `src/lib/builtin-plugins.mjs`:

  > `Built-in SDLC controls, credentials, and GitHub issues integration.`

  — to a seven-component string. **Phase 3's own task commits to the exact post-merge text; this contract does not invent one.** Any other field the merged builtin aggregate changes (e.g. if `version` tracking shifts) is likewise Phase 3's call, not predicted here.

## 4. Integrations-list `npmName` re-identification — confirmed non-event

`full-tier-baseline.test.js`'s current `EXPECTED_INTEGRATION_PROVIDERS` baseline lists two providers, `controls` and `issues-github`'s `tickets`/`pull request` pair, both already re-attributed to `@sdlcforge/core-server` from the prior absorption — none attributed to `@sdlcforge/dev-core` today (confirmed by reading `test/__snapshots__/full-tier-integrations-list.json` and `src/lib/test/full-tier-baseline.test.js:108-125`).

Determined by reading dev-core's own `src/` directly: **none of the four absorbed submodules registers an integration provider.** A repository-wide search for `IntegrationsManager`/`integrations.register`/`integration:` usage under `dev-core/src/` returns no hits at all. The only `app.ext.integrations` usage anywhere in the four submodules is in `work` (`src/work/handlers/_lib/submit-lib.mjs`, `src/work/handlers/_lib/answer-set-to-md.mjs`), and every site is a **consumer** call — `hasHook`/`callHook` — never a `.register()` call. `projects`, `orgs`, and `projects-audit` touch `app.ext.integrations` nowhere at all.

**This item is a confirmed non-event: absorption introduces no integrations-list diff of any kind.** `full-tier-integrations-list.json` and `EXPECTED_INTEGRATION_PROVIDERS` are both unaffected by this merge.

## 5. `GET /server/plugins/details/@sdlcforge%2Fdev-core` ceases to resolve

Once the `handlerPlugins` entry for `@sdlcforge/dev-core` disappears (per item 3), `GET /server/plugins/details/@sdlcforge%2Fdev-core` **stops resolving** — the `serverPluginName` path variable's option set is derived from `app.ext.handlerPlugins` (`app.js`'s `optionsFetcher`, mapping entries to `npmName`), and once a name is no longer present in that set, it is no longer a valid value for that path variable.

**Converse:** `GET /server/plugins/details/@sdlcforge%2Fcore-server` **continues to resolve**, now describing the seven-component aggregate rather than three.

## 6. `golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical throughout

Both existing framework-surface golden snapshots (`test/__snapshots__/golden-api-spec.json`, `test/__snapshots__/golden-plugins-list.json`) stay **byte-identical for the whole life of this plan**, because both are captured with `skipCorePlugins: true` (confirmed at `src/lib/test/golden-api-spec.test.js`), which suppresses the entire builtin tier — three components today, seven after this plan. The absorption is invisible to either snapshot at every intermediate checkpoint, not only at completion, because the suppression is unconditional on component count. Any diff on either file at any point in this plan is a regression, not an accepted change — per [`plan/overview.md`](../overview.md)'s "What must not change" section.

## 7. Setup-method names and `deps` — unchanged

**Source note:** task 003's `plan/resources/dev-core-absorption-pre-merge-baseline.md` had not yet landed when this document was authored; the figures below are pulled directly from the predecessor [`absorption-parity-contract.md`](../resources/absorption-parity-contract.md#5-setup-method-names-and-deps--unchanged)'s own recorded setup-method table (still accurate today — nothing has touched these observables since it was captured) and cross-checked against [`merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#the-candidate-merged-manifest)'s candidate manifest, which carries the `orgs`/`controls`/`issues-github` `provides` entries over verbatim from `core-server`'s current builtins and dev-core's own source tree.

The full seven-entry setup-method table, unchanged by this absorption:

| name | `deps` | source |
| --- | --- | --- |
| `setup integrations` | — | `plugable-express` (framework) |
| `load org controls` | `['load orgs']` | `controls` (already absorbed) |
| `load controls integrations` | `['setup integrations']` | `controls` (already absorbed) |
| `register github issues integrations` | `['setup integrations']` | `issues-github` (already absorbed) |
| `prepare org dependencies` | `['!']` | `orgs` (this plan's absorption target) |
| `load orgs` | — | `orgs` (this plan's absorption target) |
| `process org setup` | `['*']` | `orgs` (this plan's absorption target) |

Names and `deps` strings for the three `orgs`-sourced methods carry over verbatim from dev-core's source, since `@liquid-labs/dependency-runner` matches dependency names by exact string — most notably `'load org controls'`'s `deps: ['load orgs']`, which depends on the exact string `'load orgs'` continuing to be the name of the method `orgs` provides. Nothing about *what* enqueues these methods changes (in-tree `builtinPlugins` registration rather than npm-package discovery via `explicitPlugins`); only *where* they are enqueued from, which is not observable in this table.

(`liq-credentials`'/`credentials`' `setup` is not a queued setup method at all — an ordinary async `setup` export run directly — unaffected by this table, per the predecessor contract's own note.)

## 8. `app.ext` key set — unchanged

**Source note:** as with item 7, task 003's baseline artifact had not yet landed; the key set below is pulled directly from the predecessor [`absorption-parity-contract.md`](../resources/absorption-parity-contract.md#6-appext-key-set-and-credentialsdb--unchanged)'s own recorded key set. That set was captured *while `@sdlcforge/dev-core` was already installed as an explicit plugin* contributing `_liqOrgs`/`_liqProjects` at runtime, so it already reflects the full key set this plan's absorption must preserve — cross-checked against the seven-component candidate manifest's `provides` entries in [`merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#the-candidate-merged-manifest), none of which introduces an `app.ext` key beyond `_liqOrgs`, `_liqProjects`, `constants` (via `constants.WORK_DB_PATH`), `setupMethods`, `credentialsDB`, and `integrations` — all already present in the set below.

```text
_liqOrgs, _liqProjects, commandPaths, constants, credentialsDB, dynamicPluginInstallDir,
errorsEphemeral, errorsRetained, handlerPlugins, handlers, integrations, localSettings,
name, pendingHandlers, serverConfigRoot, serverSettings, setupMethods, serverVersion,
teardownMethods, version
```

**No absorbed component adds, removes, or renames an `app.ext` key beyond what is already present pre-merge.** This holds per [`plan/overview.md`](../overview.md#what-must-not-change)'s explicit freeze on `_liqProjects`, `_liqOrgs`, `constants.WORK_DB_PATH`, `setupMethods`, and `credentialsDB`.

## 9. The plugin-graph finding set

Current state, measured directly against the live `ALLOWLISTED_ERROR_FINDINGS` in `src/lib/test/plugin-graph-gate.test.js` (post task 002's drift clearance and allowlist trim): **exactly one** allowlisted error —

```text
kind: violated-by-source-order | capability: appExt:_liqOrgs.orgs | requirer: @sdlcforge/core-server#controls
```

— plus whatever `info`/`debug` findings the real graph currently produces (the downgraded `unsatisfied`/`appExt:_liqOrgs.orgSetupMethods` finding, now `info`-severity per the cleared yalc drift, plus 4 `debug`-severity `unmanifested-node` findings for the four un-manifested `sdlc-projects-*` plugins).

Post-merge, per [`merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#full-post-merge-finding-set-all-severities) — measured by running the real `validatePluginSet()` against a candidate merged manifest, not projected — the finding set becomes:

| Severity | Kind | Capability / node | Requirer |
| --- | --- | --- | --- |
| `info` | `unsatisfied` | `appExt:_liqOrgs.orgSetupMethods` | `@sdlcforge/core-server#orgs` (`optional: true`, phase `setup`) |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-badges-coverage` | — |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-badges-github-workflows` | — |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | — |
| `debug` | `unmanifested-node` | `@liquid-labs/sdlc-projects-workflow-local-node-build` | — |

`outcome: 'ok'`, `exitCode: 0`, `counts: { error: 0, warning: 0, info: 1 }` (`debug` findings are present in `findings` but not tallied in `counts`). The currently-allowlisted `violated-by-source-order` finding **resolves via the reordering** (the DAG order places `orgs` ahead of `controls`, flipping the edge to `satisfied-by-source-order`) — this is the finding the whole reordering exists to eliminate. The `unsatisfied`/`orgSetupMethods` finding stays `info`-severity, simply re-keyed from `@sdlcforge/dev-core#orgs` to `@sdlcforge/core-server#orgs`.

**`ALLOWLISTED_ERROR_FINDINGS` is deleted outright in Phase 4, not merely trimmed further** — per `plan/overview.md`'s success criterion 3, the gate asserts unconditional `outcome === 'ok'` and `counts.error === 0` once zero error-severity findings survive.

## 10. Anything not on this list is a regression

Matching the predecessor contract's own closing section: every observable named in the plan's baseline documents and not called out as an expected diff above must match the pre-absorption baseline exactly. Named explicitly, stays fixed:

- **Registered path variables** beyond what item 5 covers — no absorbed component adds a new path-variable name; `orgs` (`orgKey`, `newOrgKey`, `parameterKey`), `projects` (`newProjectName`, `projectName`), and `work` (`workKey`) all register path variables that are already part of dev-core's current, unabsorbed registration and simply move ownership, not identity.
- **`app.ext.credentialsDB`'s method set** — `detail`, `getCredSpec`, `getToken`, `import`, `list`, `listSupported`, `registerCredentialType`, `resetDB`, `verifyCreds`, `writeDB` (per the predecessor contract's item 6) — unchanged; `credentialsDB` is installed by the already-absorbed `credentials` component, untouched by this plan.
- **Any snapshot or golden file not named above** — including `golden-api-spec.json` and `golden-plugins-list.json` (item 6), and any snapshot this document does not enumerate a diff for.
- **Setup-method `deps` graph** beyond the identity-relabeling non-event covered in item 7.
- **`full-tier-integrations-list.json`**, per item 4's confirmed non-event.

## Related documents

- [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md) — the predecessor plan-group's parity contract; the structural model for this document.
- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md) — route/plugin surface counts.
- [`plan/notes/dependency-union.md`](../notes/dependency-union.md) — dependency-side context, cross-referenced for the `file:` and sole-dependent facts.
- [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — the DAG order and its route-reordering consequence.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the measured post-merge finding set and candidate manifest.
- [`plan/overview.md`](../overview.md) — the plan's "What must not change" and success criteria this contract must stay consistent with.
