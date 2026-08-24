# Capture Full-Tier Baseline Harness

## Purpose and scope

Add a new, regenerable Jest harness that starts `@sdlcforge/core-server` against its **real, full eleven-package explicit plugin tier** and records the resulting loaded surface as checked-in snapshots. This is the artifact every later phase checks itself against: without it, "the absorption changed no consumer-facing behavior" is an unverifiable claim, because no current test in this repository loads any of the three donors at all.

Scope is test infrastructure and snapshots only. **Do not modify `src/lib/app-init.mjs`, `src/lib/index.js`, the `explicitPlugins` array, any build file, or either existing golden snapshot.** This task observes; it changes nothing about how the server runs.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

1. **A new test file, not a repurposed one.** Add `src/lib/test/full-tier-baseline.test.js` (a sibling of the existing `app-init.test.js` / `golden-api-spec.test.js`, compiled through `test-staging/` by `make/55-test.mk` exactly as they are). It calls `appInit()` **without** `skipCorePlugins`, so the real tier loads.

   `src/lib/test/golden-api-spec.test.js` must be left **byte-identical**, including its `skipCorePlugins: true` line. Its `skipCorePlugins: true` is load-bearing twice over — for its own stated intent (isolating `core-server`'s framework-level API surface independent of any loaded plugin) and for the [`load orgs` hazard resolution](../notes/in-tree-plugin-registration.md#2-the-load-orgs-hazard--resolved-by-the-gating-in-1-no-other-change), which depends on that file continuing to pass with zero edits once `builtinPlugins` exists. Its in-source comment block claiming that loading the real explicit set "currently throws" is now factually stale, but correcting that comment belongs to Phase 6, not here — leave it.

2. **New snapshot files, not the existing ones.** Write under `test/__snapshots__/` with names that cannot be confused with the framework-surface pair: `full-tier-api-spec.json`, `full-tier-plugins-list.json`. `test/__snapshots__/golden-api-spec.json` (35 entries) and `test/__snapshots__/golden-plugins-list.json` (`[]`) must both end this task byte-identical to how they started.

3. **Regeneration is an explicit opt-in.** Mirror the existing `UPDATE_GOLDEN_API_SPEC` convention with a distinct variable (`UPDATE_FULL_TIER_BASELINE`) and add a `package.json` script alongside `test:update-golden-api-spec` — e.g. `"test:update-full-tier-baseline": "UPDATE_FULL_TIER_BASELINE=true TEST=full-tier-baseline make test"`. A default `make test` run must **compare**, never rewrite.

4. **`PLUGABLE_PLAYGROUND` isolation is mandatory, not optional.** Export it to a fresh empty temp directory for the harness's `appInit()` call. `liq-projects`' `setupPlayground()` otherwise defaults to `${HOME}/playground`, **creates it if absent**, and hands it to a `PlaygroundMonitor` that scans it — emitting roughly 9,500 lines of stray `console.log` output on a developer host and side-effecting the user's home directory. The observable surface is verified byte-identical either way, so this is purely an isolation and noise concern — but leaving it unset makes the harness slow, chatty, and destructive.

5. **Snapshot the two endpoint bodies.** `GET /server/api` and `GET /server/plugins/list`, both via `supertest`, both deep-equal-compared against their snapshot. Expect **165** entries and **11** entries respectively at capture time; treat a materially different count as a signal that the installed tree has drifted and report it rather than silently recording it.

6. **Assert, in the same file, the three observables no snapshot covers.** These are additive assertions on the `app` object the harness already holds:
   - **Setup methods** — assert the `{name, deps}` list off `app.ext.setupMethods` matches, exactly: `setup integrations` (no deps), `load org controls` (`['load orgs']`), `load controls integrations` (`['setup integrations']`), `register github issues integrations` (`['setup integrations']`), `prepare org dependencies` (`['!']`), `load orgs` (no deps), `process org setup` (`['*']`). Compare as a set or sort before comparing — enqueue order is `find-plugins` scan order and is not a contract.
   - **`app.ext` keys** — assert `Object.keys(app.ext).sort()` against the recorded set: `_liqOrgs`, `_liqProjects`, `commandPaths`, `constants`, `credentialsDB`, `dynamicPluginInstallDir`, `errorsEphemeral`, `errorsRetained`, `handlerPlugins`, `handlers`, `integrations`, `localSettings`, `name`, `pendingHandlers`, `serverConfigRoot`, `serverSettings`, `serverVersion`, `setupMethods`, `teardownMethods`, `version`.
   - **`app.ext.credentialsDB`** — assert it is present and exposes `detail`, `getCredSpec`, `getToken`, `import`, `list`, `listSupported`, `registerCredentialType`, `resetDB`, `verifyCreds`, `writeDB`.

7. **Verify the subset relationship once, as a written finding.** Confirm that all 35 entries of the existing `golden-api-spec.json` appear byte-identically inside the new 165-entry capture. This is what licenses leaving the framework-surface test untouched: the two snapshots are not rivals, one is a strict subset of the other. Record the result in the task document's own notes and in the task report; a one-off check is sufficient, it does not need to become a permanent assertion.

8. **Silence and cleanup.** Pass `new Reporter({ silent: true })` and a per-run temp `serverConfigRoot`, cleaned up in `afterAll`, exactly as the existing tests do. Release the returned `cache`.

## Validation

- `make test` is green with the new file included, and `make lint` is clean.
- `git diff --stat` shows `test/__snapshots__/golden-api-spec.json` and `test/__snapshots__/golden-plugins-list.json` **unchanged**, and `src/lib/test/golden-api-spec.test.js` and `src/lib/test/app-init.test.js` **unchanged**. Expected changed/added files: `src/lib/test/full-tier-baseline.test.js`, `test/__snapshots__/full-tier-api-spec.json`, `test/__snapshots__/full-tier-plugins-list.json`, `package.json`.
- Two consecutive runs of the regeneration script produce byte-identical snapshot output (the baseline was verified stable this way during research; `GET /server/version` embeds the Node version and is deliberately not snapshotted).
- The harness fails loudly, with a legible diff, when a snapshot does not match — confirm by hand-perturbing a snapshot entry, observing the failure, and restoring it.
- No file is written anywhere under `${HOME}` during the run; confirm `${HOME}/playground` is not created or modified by the test.
- The captured `full-tier-plugins-list.json` contains entries for `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-integrations-issues-github` — the three identities Phase 5 will replace. If any is missing, the installed tree is not the tree this plan was authored against; halt and report rather than snapshotting it.

## Assumptions

- The `ynGa` `serverHome`/`serverConfigRoot` bug is fixed in every package in the loaded tree and `appInit()` does **not** throw against the full tier. This was verified empirically two independent ways ([`plan/notes/parity-baseline.md`](../notes/parity-baseline.md#research-findings)). If `appInit()` nonetheless throws, that is a material change in the installed tree since planning — halt and report the exact failure rather than working around it.
- `find-root` correctly resolves `serverPackageRoot` to `core-server`'s own `package.json` under Jest (verified: `npx jest` puts `node_modules/.bin/jest` in `process.argv[1]` and the walk passes up through the manifest-less `.bin` and `node_modules` directories). No special handling is needed.
- Four of the loaded packages resolve through yalc links (`plugable-express`, `liq-projects`, `liq-work`, `sdlc-projects-workflow-local-node-build`), so this baseline is host-local. A CI capture from a clean registry install could legitimately differ; that is out of scope here.

## References

- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md) — the measured baseline (route counts per `npmName`, setup-method table, `app.ext` key list, `credentialsDB` method set), the exact capture recipe, and the verified-stable finding.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — the hand-taken per-donor inventory this harness mechanizes.
- `plan/resources/golden-api-spec-baseline.md` — the design rationale for the existing golden-snapshot mechanism this harness parallels.
- `src/lib/test/golden-api-spec.test.js` — the structural model to copy (snapshot dir traversal from `test-staging/`, `UPDATE_*` opt-in, `readGolden`/`writeGolden` helpers).

## Checkpoint hints

- After the new test file loads the full tier and prints its surface, before any snapshot is written.
- After the two endpoint snapshots are captured and compare green.
- After the three non-snapshot assertion groups (setup methods, `app.ext` keys, `credentialsDB`) are added.
- After the `package.json` regeneration script is added and both existing golden snapshots are confirmed untouched.
