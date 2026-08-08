# Golden API-Spec Baseline

## Purpose and scope

Working notes for the golden API-spec characterization test added in
`src/lib/test/golden-api-spec.test.js` (phase-01 task 001). This test snapshots the
server's registered API surface (`GET /server/api`) and its loaded-plugin list
(`GET /server/plugins/list`) into checked-in JSON files under
`test/__snapshots__/`, so later modernization phases can verify they have not
silently changed the server's externally-visible behavior.

## Snapshot files

- `test/__snapshots__/golden-api-spec.json` — the full `GET /server/api` response.
- `test/__snapshots__/golden-plugins-list.json` — the `GET /server/plugins/list` response.

Both are plain, checked-in JSON (not Jest's own `.snap` mechanism), so they are easy
to diff by hand or by a downstream agent outside of Jest.

## Commands

- **Check (default):** `npm test` runs `src/lib/test/golden-api-spec.test.js` as part
  of the normal Jest suite and asserts the live response deep-equals the checked-in
  snapshot files. No opt-in flag is needed — this is the default, always-on
  regression guard.
- **Regenerate (explicit opt-in only):**
  ```bash
  npm run test:update-golden-api-spec
  ```
  This sets `UPDATE_GOLDEN_API_SPEC=true` and scopes the Jest run to the
  `golden-api-spec` test file (`TEST=golden-api-spec`, matched against the compiled
  test path under `test-staging/`), so it does not need to touch the rest of the
  suite. Run this only for a deliberate, reviewed API-surface change in a later
  modernization phase; inspect the resulting `git diff` on the two snapshot files
  before committing.

## Scope of the snapshot

The test isolates itself to core-server's own framework-level API surface via
`skipCorePlugins: true` (the same option `src/lib/test/app-init.test.js` already
uses): it exercises only the routes `@liquid-labs/plugable-express` registers
intrinsically (heartbeat, `/server/version`, `/server/api`, `/server/plugins/*`,
`/server/next-commands`, and their generated `/help/*` counterparts), not the routes
contributed by the 13 real explicit npm plugins (`liq-controls`,
`liq-credentials`, etc.) core-server declares as dependencies.

This is a deliberate, in-scope limitation, not an oversight: loading the real
explicit-plugin set in-process currently throws during `appInit()`. Several
explicit plugins — `liq-credentials`, `liq-credentials-db`, `liq-integrations`, and
`liq-work` — still read `app.ext.serverHome`, a property
`@liquid-labs/plugable-express` no longer sets after its `serverHome` ->
`serverConfigRoot` rename (the same rename `src/lib/app-init.mjs` and
`app-init.test.js` were updated for, per plan branch commit `24630c7`). That is a
pre-existing, cross-package incompatibility unrelated to this test-only task, and
out of scope to fix here (the task explicitly disallows modifying plugin, app-init,
or build logic). It is flagged separately for the manager as a candidate follow-up:
until it is resolved, `appInit()` cannot successfully load the real explicit-plugin
set at all — not just under test, in any environment — which would also block a
literal "full API surface including every loaded plugin's routes" golden snapshot
for this repo.

## Normalization

No field normalization is applied. The `/server/api` and `/server/plugins/list`
responses were inspected directly (see task notes) and contain no timestamps,
random identifiers, or other non-deterministic fields under `skipCorePlugins: true`
— repeated calls within the same process produce byte-identical JSON — so an exact
`toEqual` comparison is used as-is.
