# Absorption Baseline

## Goals

Produce an executable, checked-in record of what `@sdlcforge/core-server`'s loaded plugin surface actually is *today*, with `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-integrations-issues-github` still present as Tier-2 explicit npm-dependency plugins.

This phase comes first because the plan's central constraint — no consumer-facing behavior change — is currently unverifiable. `core-server` has no test that loads any donor: both unit tests pass `skipCorePlugins: true`, `test/__snapshots__/golden-plugins-list.json` is `[]`, and `test/__snapshots__/golden-api-spec.json` holds 35 `plugable-express` core routes and nothing else. Absorbing three plugins against no baseline would mean discovering regressions only if someone happened to exercise the affected route by hand.

It is also the only phase of this project's slice that is independent of every open decision. It observes the current npm-dependency world, which neither the registration-mechanism choice nor the plugin-identity choice changes, so it can proceed while those are settled.

A secondary goal is diagnostic: establishing whether `appInit` succeeds at all against the full 11-package explicit tier. Bug `ynGa` (recorded in the wave manifest) reports an `appInit` crash caused by packages still reading the pre-rename `serverHome` key. If that is still live, it is better surfaced here — where it is a scoped, understood obstacle — than in the middle of a merge.

## Inputs

- `core-server`'s current `src/lib/app-init.mjs`, its `explicitPlugins` array, and its installed `node_modules` tree at the current `bun.lock`.
- The existing test infrastructure: `src/lib/test/*.test.js` (Jest + Supertest), `test/test-server.js` (local integration), `test/run-integration-tests.sh` (Docker multi-version), and the two golden snapshots under `test/__snapshots__/`.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — the hand-taken inventory of routes, setup methods, providers, and hooks this phase mechanizes and confirms.
- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md) — what the baseline must cover and why each observable matters.
- [`plan/notes/plugin-list-visibility.md`](../notes/plugin-list-visibility.md) — the one part of the baseline expected to differ after absorption, which must be recorded as an enumerated accepted diff rather than as a regression.

## Outputs

- A committed baseline artifact covering registered endpoints (method, `path`/`paths`, `npmName` provenance), registered path variables, enqueued setup methods with their `deps`, registered integration providers and their hooks, the `app.ext` keys installed by donor setup (notably `app.ext.credentialsDB`), and both plugin-list endpoint bodies.
- A repeatable way to regenerate and diff that artifact, so Phase 5 can check each donor's absorption individually rather than only in aggregate.
- A written, empirical answer to whether the real explicit tier loads cleanly today, and — if it does not — a precise statement of what fails and what the minimum remediation is.
- Confirmation or correction of the hand-taken surface inventory, including the two items it marks **TO CONFIRM** (`liq-controls`' apparently-unused `@liquid-labs/liq-qa-lib` and `@liquid-labs/http-smart-response` declarations).
