# Capture Integration Provider And Hook Baseline

## Purpose and scope

Extend the Phase 3 baseline to cover the one part of the donors' contribution that no route snapshot can see: **integration provider and hook registrations**. `@liquid-labs/liq-integrations-issues-github` contributes **zero HTTP routes** — its entire surface is two provider registrations carrying seven hooks — so a route-only baseline would let that donor's absorption be silently broken end to end without a single test failing.

Scope is test code and snapshots only. Change no production source, no `explicitPlugins` entry, and neither existing golden snapshot.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

1. **Observe `register()` calls; do not read the endpoint.** The faithful `{providerFor, name, npmName, hooks}` triple is only reachable by wrapping `IntegrationsManager.prototype.register` **before** `appInit()` runs. The class is exported from `@liquid-labs/plugable-express`; its `#providers` field is private and cannot be read afterwards. Capture each call's arguments into an array, then restore the original method in `afterAll` so no other test file is affected.

2. **Assert the three registrations exactly.** With the full tier loaded, exactly three `register()` calls occur:

   | `providerFor` | `name` | `npmName` | hooks |
   |---|---|---|---|
   | `controls` | `controls` | `@liquid-labs/liq-controls` | `getQuestionControls` |
   | `tickets` | *(undefined)* | `@liquid-labs/liq-integrations-issues-github` | `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` |
   | `pull request` | *(undefined)* | `@liquid-labs/liq-integrations-issues-github` | `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` |

   Assert hook **names** (sorted), not hook function identities. Normalize for call order before comparing — registration order follows `find-plugins` scan order and is not a contract.

3. **Assert the missing `name` on both `issues-github` registrations deliberately, as current behavior.** Both omit `name`. This is a real, pre-existing defect: `IntegrationsManager.listInstalledPlugins()` de-duplicates via `new Map(list.map((p) => [p.name, p]))`, so keyed on `undefined` the two providers collapse into one and `GET /server/plugins/integrations/list` reports **two** entries where three providers are registered. The assertion must encode `name === undefined` as the observed present-day fact, with an in-source comment saying so, so that a later "helpful" fix during absorption shows up as a deliberate, reviewed snapshot change rather than as an invisible behavior drift.

   **Do not fix the defect in this plan.** It is out of scope; record it as a follow-up item instead (`type:bug`, referencing `IntegrationsManager.listInstalledPlugins()`'s `name`-keyed de-duplication and the two `register()` call sites that omit `name`).

4. **Snapshot the consumer-visible endpoint as-is.** Add `test/__snapshots__/full-tier-integrations-list.json`, captured from `GET /server/plugins/integrations/list`, under the same `UPDATE_FULL_TIER_BASELINE` opt-in task 001 establishes. It will contain the two-entry, de-duplicated body. Snapshot it faithfully — the point is to preserve the observable, including its defect, across the absorption.

5. **Reuse task 001's harness rather than starting a second server.** Prefer extending `src/lib/test/full-tier-baseline.test.js` so a single full-tier `appInit()` serves every assertion in the phase; a full-tier startup is expensive and running it twice doubles the phase's test time for no benefit. If the `register()` wrapping cannot be installed cleanly before that file's own `beforeAll`, a second file is acceptable — say so in the report and keep the `PLUGABLE_PLAYGROUND` isolation and temp-`serverConfigRoot` conventions identical.

## Validation

- `make test` is green and `make lint` is clean.
- `IntegrationsManager.prototype.register` is provably restored after the suite: add or run a check confirming the prototype method is the original function once the file's `afterAll` has run, and confirm the other test files still pass in the same `make test` invocation.
- The three-registration assertion fails loudly when perturbed — hand-edit one expected hook name, observe the failure, restore.
- `test/__snapshots__/golden-api-spec.json` and `test/__snapshots__/golden-plugins-list.json` remain byte-identical; `src/lib/test/golden-api-spec.test.js` and `src/lib/test/app-init.test.js` remain unchanged.
- The recorded `full-tier-integrations-list.json` contains exactly two entries, and the in-source comment explaining why two entries correspond to three registrations is present.
- A follow-up item for the `name`-omission defect exists in `plan/followups.yaml`.

## Assumptions

- `IntegrationsManager` is exported from `@liquid-labs/plugable-express`'s package root and its `register` lives on the prototype (verified during research). If the linked snapshot has changed shape, halt and report rather than reaching into internals a different way.
- The `controls` provider's `providerTest` is `() => true` and `issues-github`'s is `usesGitHubIssues`. `providerTest` identity is not part of this baseline — provider **resolution** behavior is not exercised by any test today, before or after this plan.
- No hook is invoked and no handler executed by this baseline. It is registration-time only; behavioral parity of the hook implementations themselves remains unobserved, which is a known, accepted limitation of this plan's verification.

## References

- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md#research-findings) — the measured provider/hook table and the analysis of the `listInstalledPlugins()` de-duplication defect.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — the per-donor hook inventory (seven registrations across two providers from `issues-github`, one from `controls`).
- `plan/phase-03-absorption-baseline/001-capture-full-tier-baseline-harness.md` — the harness this task extends.

## Checkpoint hints

- After the `register()` wrapper captures and prints the three registrations.
- After the registration assertions are in place and green.
- After the integrations-list endpoint snapshot is captured and the prototype-restoration check passes.

## Status

**Outcome: succeeded.** Implemented 2026-08-24.

- Extended `src/lib/test/full-tier-baseline.test.js` (task 001's harness) rather than starting a second server: the `IntegrationsManager.prototype.register` wrapper installs cleanly inside the same `beforeAll`, immediately before the `appInit()` call, so a single full-tier `appInit()` still serves every assertion in the phase.
- Added a module-scoped wrapper around `IntegrationsManager.prototype.register` (imported from `@liquid-labs/plugable-express`), installed before `appInit()` runs and capturing each call's raw `{hooks, name, npmName, providerFor, providerTest}` argument into `capturedIntegrationRegistrations`. Restored to the original function as the first statement of `afterAll`, ahead of the harness's other cleanup steps, so a failure elsewhere in cleanup can never leave the prototype patched for a later test file.
- Added `EXPECTED_INTEGRATION_PROVIDERS` (three entries: `controls`/`controls`/`@liquid-labs/liq-controls` with one hook, and the two `issues-github` registrations under `tickets` and `pull request`, both with `name: undefined`) and a test asserting the captured registrations match it exactly, normalized for call order (sorted by `providerFor`, the three values being distinct) and for hook identity (hook **names**, sorted, not function references). Verified the assertion fails loudly and legibly when perturbed: hand-edited `getQuestionControls` to `getQuestionControlsWRONG`, re-ran `TEST=full-tier-baseline make test`, observed a clear Jest `toEqual` diff pinpointing exactly that field, then restored the file (confirmed byte-identical via `git diff`) and re-verified green.
- Added a sibling top-level `describe('IntegrationsManager.prototype.register restoration', ...)` block, declared after the main describe block in the same file. Because Jest fully completes one top-level describe block (through its `afterAll`) before starting the next declared in the same file, this is the earliest point at which restoration can actually be observed; its one test asserts `IntegrationsManager.prototype.register === originalIntegrationsManagerRegister` and that the original is a function. This passed in the same `make test` run that also ran `golden-api-spec.test.js`, `app-init.test.js`, and `index.test.js` (`Test Suites: 4 passed, 4 total`, 13 tests), confirming the prototype patch does not leak into other test files.
- Added `test/__snapshots__/full-tier-integrations-list.json`, captured from `GET /server/plugins/integrations/list` under the existing `UPDATE_FULL_TIER_BASELINE` opt-in (`package.json`'s `test:update-full-tier-baseline` script, unchanged). Recorded body has exactly two entries (`{npmName: '@liquid-labs/liq-controls', installed: true}`, `{npmName: '@liquid-labs/liq-integrations-issues-github', installed: true}`) — confirmed this is not an artifact of the snapshot helper but the endpoint's actual, faithfully-captured behavior: `plugable-express`'s `listPluginsHandler` filters output through a fixed `allFields` set (`npmName`, `installed`, `summary`, `handlerCount`, `provider`, `homepage`, `version`) that does not include `name` or `hooks` at all, and the `name`-omission defect (both `issues-github` registrations keyed on `undefined` in `IntegrationsManager.listInstalledPlugins()`'s `Map`) collapses what would be three provider identities down to two entries, with the later `pull request` registration silently overwriting the earlier `tickets` registration under the shared `undefined` key. Both the missing-`name` fact and the two-vs-three entry count are asserted with in-source comments explaining why, per the task's requirement 3.
- `IntegrationsManager` and its `register` method were confirmed present exactly where the task's `## Assumptions` predicted: exported from `@liquid-labs/plugable-express`'s package root, `register` on the prototype (verified directly via `node -e "require('@liquid-labs/plugable-express').IntegrationsManager.prototype.register"`), so no halt was needed under that assumption.
- `make test` is green (`Test Suites: 4 passed, 4 total`, `Tests: 13 passed, 13 total`), including all 8 tests in the extended `full-tier-baseline.test.js` file and the unchanged `golden-api-spec.test.js` / `app-init.test.js` / `index.test.js` files. `git diff --stat` against `test/__snapshots__/golden-api-spec.json`, `test/__snapshots__/golden-plugins-list.json`, `src/lib/test/golden-api-spec.test.js`, and `src/lib/test/app-init.test.js` is empty — all four are byte-identical to their starting state.
- `make lint` is **not** fully clean repo-wide, but this is the same pre-existing, already-tracked condition task 001 documented and out of this task's scope: ~230 lint violations confined to `test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`, and `test/test-server.js` (none touched by this task), already recorded as followup `b3hk`. Verified with a targeted `eslint` invocation that `src/lib/test/full-tier-baseline.test.js` itself is lint-clean (zero output).
- A follow-up item for the `name`-omission defect could not be added directly by this task agent (master-doc restriction on `plan/followups.yaml`); the exact text to add is recorded in this task's structured report for the manager to apply via the followups tooling.
- `bun.lock` showed as modified in `git status` at the start of this task (pre-existing dependency-install artifact per the dispatch's noted remedy), unrelated to this task's own changes; reverted via `git checkout -- bun.lock` before any work began, per the operating-contract instructions, and not part of this task's commit.

### Assumptions relied upon

- `IntegrationsManager` is exported from `@liquid-labs/plugable-express`'s package root and `register` lives on the prototype — confirmed directly against the installed package.
- The `controls` provider's `providerTest` is `() => true` and `issues-github`'s is `usesGitHubIssues`; `providerTest` identity was not asserted, consistent with the task's stated scope.
- No hook was invoked and no handler executed by this baseline — registration-time observation only, per the task's stated, accepted limitation.
