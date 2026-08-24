# Absorption Parity Contract

## Purpose and scope

The enumerated, agreed-in-advance list of every baseline observable expected to *change* between the pre-absorption baseline ([`parity-baseline.md`](../notes/parity-baseline.md)'s research findings, and the Phase 3 tasks 001/002 harness that mechanizes them) and the post-absorption capture, with the reason for each. **Anything not on this list is a regression.**

This exists so Phase 5's verification is a checklist against an agreed contract rather than "the snapshot moved, is that fine?" answered one diff at a time by judgment. It draws from, and must stay cross-checked against, three settled-decision notes: [`in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#3-plugin-identity-supply--one-entry-sdlcforgecore-server-s-own-identity), [`plugin-list-visibility.md`](../notes/plugin-list-visibility.md), and [`parity-baseline.md`](../notes/parity-baseline.md#research-findings).

## 1. `full-tier-api-spec.json` — route identity and provenance

- **The six absorbed routes** change `npmName` from their donor package name to `@sdlcforge/core-server`:
  - `GET /orgs/:orgKey/controls/list` — `@liquid-labs/liq-controls` → `@sdlcforge/core-server`
  - `GET /orgs/controls/list` — `@liquid-labs/liq-controls` → `@sdlcforge/core-server`
  - `PUT /credentials/:credential/import` — `@liquid-labs/liq-credentials` → `@sdlcforge/core-server`
  - `GET /credentials/list` — `@liquid-labs/liq-credentials` → `@sdlcforge/core-server`
  - (`liq-integrations-issues-github` contributes **zero** routes — hooks only, per the inventory — so it contributes no route-`npmName` diff here.)
- **Route count stays 165.** No route is added or removed by absorption; only `npmName` provenance changes on the four routes above.
- **No `path`, `method`, `matcher`, `help`, or `parameters` value changes** on any of the 165 routes, absorbed or not.
- **Ordering:** the absorbed routes move to the **front** of the plugin-contributed section of `app.ext.handlers` — immediately after the framework's own core handlers, in the fixed order **controls → credentials** (issues-github contributes no routes, so it has no position here) — rather than being interleaved at `find-plugins` scan order among the remaining eight explicit plugins. This is a direct consequence of `loadBuiltinPlugins` running *before* `loadPlugins` inside `appInit` (per the mechanism design in `in-tree-plugin-registration.md`). If Phase 5's comparison of `app.ext.handlers` (or the API spec's route array, which reflects the same order) is order-sensitive, it must either normalize for order before comparing, or treat this reordering as an expected, accepted diff rather than a regression.

## 2. `full-tier-plugins-list.json` — 11 entries become 9, via an intermediate 12

- **Final state: 11 → 9.** The three donor entries (`@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, `@liquid-labs/liq-integrations-issues-github`) disappear from `handlerPlugins`, and exactly **one** new entry appears for `@sdlcforge/core-server`, carrying:
  - `npmName`: `@sdlcforge/core-server`
  - `version`: `package.json`'s `version` (`pkgVersion`, already read in `app-init.mjs`)
  - `summary`: the literal string `Built-in SDLC controls, credentials, and GitHub issues integration.` (from `builtin-plugins.mjs`; not derived from `package.json`'s `description`, which is empty)

  Net: 11 − 3 + 1 = **9**.
- **Intermediate states the contract must also tolerate**, since this project's own phases land the change incrementally rather than atomically:
  - **Phase 4 task 003** (`Wire Builtin-Plugins Aggregator And Prove With Probe`) takes the list to **12**: the `@sdlcforge/core-server` builtin entry appears (empty-but-shaped `builtin-plugins.mjs`, zero submodules) while all three donors are *still* separately discovered via `explicitPlugins`. This is not a regression — it is the mechanism proving itself against a plugin that changes nothing yet.
  - **Each Phase 5 absorb task then drops one donor entry** as that donor's code is merged in and removed from `explicitPlugins`: 12 → 11 (after `liq-controls`) → 10 (after `liq-credentials`) → 9 (after `liq-integrations-issues-github`). A verification run against an intermediate Phase 5 checkpoint (after only one or two donors have landed) should expect 11 or 10, not jump straight to comparing against 9.

## 3. `full-tier-integrations-list.json` and the `register()` capture

- **`npmName` re-identification.** The `controls` provider's `npmName`, and both `issues-github` providers' (`tickets`, `pull request`) `npmName`, all become `@sdlcforge/core-server` — the same re-identification as the route provenance above, and for the same reason (option 3 of `plugin-list-visibility.md`: report absorbed capability under `@sdlcforge/core-server`'s own identity rather than a name that will soon belong to no installed package).
- **Everything else about the three provider registrations is unchanged:**
  - `providerFor` values stay exactly `controls`, `tickets`, `pull request`.
  - Hook names stay exactly as captured by Phase 3 task 002's `register()` wrap: `getQuestionControls` (controls); `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` (tickets); `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` (pull request).
  - The pre-existing `name`-omission defect on the two `issues-github` registrations stays exactly as-is — both `register()` calls still omit `name`, so `IntegrationsManager.listInstalledPlugins()`'s `name`-keyed de-duplication still collapses `tickets` and `pull request` into one merged entry on `GET /server/plugins/integrations/list`. This is a pre-existing donor defect, explicitly out of scope for this consolidation (per `parity-baseline.md`'s research findings); absorption must not accidentally "fix" it by adding a `name`.

## 4. `GET /server/plugins/details/@liquid-labs%2F<donor>` — stops resolving

`GET /server/plugins/details/@liquid-labs%2Fliq-controls`, `GET /server/plugins/details/@liquid-labs%2Fliq-credentials`, and `GET /server/plugins/details/@liquid-labs%2Fliq-integrations-issues-github` all **stop resolving** after their respective donor's absorption lands. The `serverPluginName` path variable's option set is derived from `app.ext.handlerPlugins` (`app.js`'s `optionsFetcher`, mapping entries to `npmName`); once a donor's `handlerPlugins` entry is gone (per item 2 above), its name is no longer a valid value for that path variable. Conversely, `GET /server/plugins/details/@sdlcforge%2Fcore-server` becomes a **newly valid** value where it previously was not — this is the direct converse of the same mechanism, not a separate diff.

## 5. Setup-method names and `deps` — unchanged

All seven setup methods captured by Phase 3 task 001, and their exact `{name, deps}` pairs, are **unchanged** by absorption:

| name | `deps` | source |
| --- | --- | --- |
| `setup integrations` | — | `plugable-express` |
| `load org controls` | `['load orgs']` | `liq-controls` (absorbed) |
| `load controls integrations` | `['setup integrations']` | `liq-controls` (absorbed) |
| `register github issues integrations` | `['setup integrations']` | `liq-integrations-issues-github` (absorbed) |
| `prepare org dependencies` | `['!']` | `liq-orgs` |
| `load orgs` | — | `liq-orgs` |
| `process org setup` | `['*']` | `liq-orgs` |

This includes `'load org controls'` / `deps: ['load orgs']` specifically — the absorbed code keeps the donor's exact strings, because `@liquid-labs/dependency-runner` matches dependency names by exact string, and `'load orgs'` is a method name contributed by `liq-orgs` (which stays a separate, unabsorbed explicit plugin). Nothing about the cross-package dependency graph changes; only *where* the `'load org controls'`/`'load controls integrations'`/`'register github issues integrations'` methods are enqueued from changes (in-tree `builtinPlugins` registration instead of npm-package discovery), which is not observable in this table.

(`liq-credentials`' `setup` is not a queued setup method at all — it is an ordinary async `setup` export run directly, unaffected by this table.)

## 6. `app.ext` key set and `credentialsDB` — unchanged

The full `app.ext` key set captured by Phase 3 task 001 is **unchanged**:

```text
_liqOrgs, _liqProjects, commandPaths, constants, credentialsDB, dynamicPluginInstallDir,
errorsEphemeral, errorsRetained, handlerPlugins, handlers, integrations, localSettings,
name, pendingHandlers, serverConfigRoot, serverSettings, setupMethods, serverVersion,
teardownMethods, version
```

`app.ext.credentialsDB` specifically — installed by `liq-credentials`' absorbed `setup()`, unchanged in mechanism (`registerPluginModule` calls `setup()` identically regardless of npm-discovery vs. `builtinPlugins` origin) — keeps its exact current method set: `detail`, `getCredSpec`, `getToken`, `import`, `list`, `listSupported`, `registerCredentialType`, `resetDB`, `verifyCreds`, `writeDB`. No key is added, removed, or renamed by absorption.

## 7. `golden-api-spec.json` (35 entries) and `golden-plugins-list.json` (`[]`) — unchanged

Both existing framework-surface golden snapshots stay **byte-identical for the whole life of this plan**, because `builtinPlugins` registration is gated **inside** the `skipCorePlugins` guard in `appInit`, exactly like npm-discovered core-tier plugins — so `skipCorePlugins: true` suppresses absorbed in-tree code exactly as it suppresses the three donors today. `src/lib/test/golden-api-spec.test.js` and `src/lib/test/app-init.test.js` both pass `skipCorePlugins: true` and are not edited by this plan before Phase 6 (and even then, only the now-false in-source comment claiming the real explicit tier throws is corrected — not the `skipCorePlugins: true` line itself, and not either snapshot). Any diff on either of these two files at any point in this plan is a regression, not an accepted change.

## 8. The `liq-projects` / `liq-credentials` setup-ordering coupling — preserved, and made more robust

**The hazard.** `liq-projects`' `setup()` calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })` at plugin-load time — it needs `liq-credentials`' `setup()` to have already run and installed `app.ext.credentialsDB`. Today, that ordering is satisfied **incidentally**, not by design: plugin `setup()` calls run in `find-plugins` discovery order, which is alphabetical by package directory name, and `"liq-credentials"` happens to sort before `"liq-projects"`. This ordering is **not** mediated by `@liquid-labs/dependency-runner` at all — `dependency-runner` only orders `setupMethods` (queued, deferred work with `deps`), and a plugin's own top-level `setup()` call is neither queued nor deferred. Nothing today would catch a reordering that broke this; it works by construction of the alphabet, not by an enforced contract.

**Why absorption preserves it, and improves it.** Once `liq-credentials` is absorbed, its `setup()` runs as part of `builtinPlugins` registration, which the mechanism design places **before** core-tier discovery (`loadBuiltinPlugins` is called, then `loadPlugins` — see `in-tree-plugin-registration.md`'s "Sequencing the framework change" and part 3 of the framework change). `liq-projects` remains a separate, unabsorbed explicit npm-dependency plugin, discovered and `setup()`-run afterward, in the ordinary `loadPlugins` pass. So the ordering `credentials setup() → projects setup()` is preserved — and made **more robust** than before: it no longer depends on `"liq-credentials"` happening to alphabetically precede `"liq-projects"` among discovered packages (a fact that was never guaranteed to survive a directory rename or a new plugin sorting between them); it now holds unconditionally, because all `builtinPlugins` registration is structurally sequenced before all core-tier discovery, regardless of any package name.

**What Phase 5 task 002 (`Absorb Liq-Credentials`) must verify**, rather than rediscover: after `liq-credentials`' merge lands, confirm `app.ext.credentialsDB` is present and populated by the time `liq-projects`' `setup()` runs — i.e. that `setupCredentials` inside `liq-projects` does not receive an `undefined` `credentialsDB`. A passing `appInit()` (no thrown error, `app.ext.credentialsDB` functional afterward per item 6 above) is sufficient evidence; no new instrumentation is required, because the ordering is now structural rather than incidental.

**Forward-looking note, for whoever next reorders `builtinPlugins` relative to `loadPlugins` inside `appInit`** (in `plugable-express`, not in this project): that relative order is now load-bearing for this specific cross-plugin coupling, not merely for the route-ordering property in item 1 above. A future change that moves `loadBuiltinPlugins` to run *after* `loadPlugins` would silently reintroduce the original hazard — this time hard against `builtinPlugins`' own submodule execution order (controls → credentials → issuesGitHub, per `builtin-plugins.mjs`'s `setup` aggregator), which happens to still put credentials before whatever runs `liq-projects`' `setup()`. Whether that would still resolve correctly depends on where `liq-projects` sits in the (now-shortened) `explicitPlugins` discovery order at that future time — worth re-verifying explicitly rather than assumed, should that reordering ever happen.

## Anything not on this list is a regression

Every observable named in `parity-baseline.md`'s "What the baseline must capture" section, and not called out as an expected diff above, must match the pre-absorption baseline exactly: registered endpoints other than the six named in item 1, registered path variables (unchanged — no absorbed donor registers a new path variable beyond what `liq-credentials`' `registerPathVar('credential', …)` already does today), the `deps` graph for `setupMethods` beyond the identity-relabeling non-event covered in item 5, and both plugin-list endpoints' response *shapes* (route, status code — only *content* changes, per items 2–4).

## Related documents

- [`absorption-dependency-union.md`](./absorption-dependency-union.md) — the companion document; the dependency-side half of this task.
- [`absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — the underlying donor inventory.
- [`in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#3-plugin-identity-supply--one-entry-sdlcforgecore-server-s-own-identity) — the identity decision and mechanism design behind items 1–4.
- [`plugin-list-visibility.md`](../notes/plugin-list-visibility.md) — why the identity diff (items 2–4) is accepted rather than avoided.
- [`parity-baseline.md`](../notes/parity-baseline.md#research-findings) — the measured pre-absorption baseline this contract is written against.
