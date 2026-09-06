# Capture Pre-Merge Observable Baseline

## Purpose and scope

Capture, as one durable resource artifact, the pre-merge observables the existing checked-in snapshots and hardcoded test expectations do not expose as a single readable record: the setup-method `{name, deps}` pairs, the `app.ext` key set, the registered path-variable set, and the full `validatePluginSet()` finding set at every severity — all as they stand once tasks 001 and 002 have landed (post npm-toolkit fix, post yalc-drift clearance). Also confirms `@sdlcforge/core-server` is `@sdlcforge/dev-core`'s sole dependent anywhere in the playground. Depends on task 002: an accurate pre-merge baseline requires the drift-cleared, fix-landed environment, not the state before either correction landed.

This task does not modify `src/lib/test/full-tier-baseline.test.js` or any other test file's assertions — the existing checked-in snapshots and inline expectation arrays already mechanize the observables they cover, and this task's job is to confirm they still hold and to restate them, plus the still-uncaptured observables, into one new resource document. It is a pure capture-and-record task.

## Requirements

role_doc: plugins/flow/roles/developer-node.md

1. Provision a live environment from the branch as it stands after tasks 001 and 002 land (`scripts/provision-local-deps.sh`; no further `--refresh-lock` is needed since task 002 already regenerated `bun.lock`).
2. Confirm `src/lib/test/full-tier-baseline.test.js`'s existing checked-in artifacts still hold with no regeneration needed: run `bun run test` and confirm the three checked-in `test/__snapshots__/full-tier-*.json` snapshots, plus the file's inline `EXPECTED_SETUP_METHODS` and `EXPECTED_APP_EXT_KEYS` assertions, all still pass unchanged. Neither task 001's call-site fix nor task 002's yalc-snapshot refresh should move any observable this file already asserts. If one does move, stop and flag it in your report rather than silently regenerating — a moved observable here would mean one of the "pre-existing fixes" leaked into the surface this plan's parity contract (task 004) is meant to hold fixed.
3. Determine the full **registered path-variable set** for the real, full explicit-plugin tier (the same `appInit()` configuration `full-tier-baseline.test.js` already exercises). `registerPathVar()`'s own registry is private to `@liquid-labs/plugable-express` and is not exposed on `app.ext`, so the practical way to enumerate the set is to collect the distinct `:paramName` segments across every route's `path` array in the full-tier API spec (`test/__snapshots__/full-tier-api-spec.json`, or the live `GET /server/api` response). Cross-check at least two entries against known `registerPathVar()` call sites (e.g. `credential` from `src/credentials/setup.mjs`, `serverPluginName` from the framework itself) before relying on the derivation, and record the caveat explicitly if any entry cannot be cross-checked this way.
4. Capture the full `validatePluginSet()` finding set **at every severity** (not only `error`) for the real package root, as it stands post-tasks-001/002 — following the same invocation shape as `src/lib/test/plugin-graph-gate.test.js` (`resolveCoreServerPackageRoot`) or `plan/resources/validate-check.mjs`'s pattern. Record the full result (or a faithful, complete listing of every finding at every severity, with `kind`/`capability`/`requirer`/`severity`) rather than a summary — this is the pre-merge counterpart to `plan/notes/merged-manifest-graph-projection.md`'s post-merge projection, and task 004's parity contract (and Phase 4's verification) need both to know exactly what changed.
5. Confirm `@sdlcforge/core-server` is the sole dependent of `@sdlcforge/dev-core` anywhere in the playground: `grep -rln '"@sdlcforge/dev-core"' --include=package.json` across the sibling checkouts under `/Users/zane/playground` should return only `core-server`'s own `package.json`.
6. Author `plan/resources/dev-core-absorption-pre-merge-baseline.md` recording, in one place:
   - The setup-method `{name, deps}` pairs (post tasks 001/002; sorted by name, matching `full-tier-baseline.test.js`'s own normalization) — a copy-forward from `EXPECTED_SETUP_METHODS`, dated as of this task, is fine, since that file already asserts them; the value of restating them here is a single durable reference later phases can read without reading test source.
   - The `app.ext` key set (post tasks 001/002) — likewise a restatement of `EXPECTED_APP_EXT_KEYS`, with the same rationale.
   - The registered path-variable set from Requirements item 3, with the derivation method stated plainly.
   - The full `validatePluginSet()` finding set from Requirements item 4, at every severity, with the invocation method stated.
   - The sole-dependent confirmation from Requirements item 5, with the exact command and its output quoted.
   - A short closing note that none of these observables moved as a result of tasks 001 or 002 (per Requirements item 2) — i.e. this record *is* the true pre-existing baseline, not one adjusted by this phase's own fixes.

## Validation

1. `bun run test` is green, including `src/lib/test/full-tier-baseline.test.js` and `src/lib/test/plugin-graph-gate.test.js`, with zero snapshot or checked-in-array changes — confirm via `git status`/`git diff` that no file under `test/__snapshots__/` and no `EXPECTED_*` array in `full-tier-baseline.test.js` shows a diff.
2. `plan/resources/dev-core-absorption-pre-merge-baseline.md` exists and contains all six items listed in Requirements item 6, each traceable to a concrete command or file this task ran or read.
3. The recorded path-variable set is cross-checked against at least two independently-known `registerPathVar()` call sites and matches, per Requirements item 3.
4. The recorded `validatePluginSet()` finding set shows exactly one `error`-severity finding (matching task 002's tightened allowlist) plus whatever `info`/`debug`/`warning` findings the real graph produces at this point, recorded exhaustively rather than summarized away.
5. The sole-dependent grep result is quoted verbatim in the new resource file.
6. `git diff --stat` shows only the new `plan/resources/dev-core-absorption-pre-merge-baseline.md` file — no source, test, or dependency file is modified by this task.

## Assumptions

- Tasks 001 and 002 have already landed on this branch; this task's environment reflects their combined effect, not the original pre-phase state.
- The registered-path-variable derivation via route `:paramName` segments is an accepted proxy for the framework's private registry, given the registry itself is not exposed publicly (Requirements item 3) — record the caveat in the resource file rather than treating the derivation as unconditionally authoritative.

## References

- [`src/lib/test/full-tier-baseline.test.js`](../../src/lib/test/full-tier-baseline.test.js) — the existing harness this task confirms rather than duplicates.
- [`src/lib/test/plugin-graph-gate.test.js`](../../src/lib/test/plugin-graph-gate.test.js) — the invocation shape for capturing the full finding set.
- [`plan/resources/validate-check.mjs`](../resources/validate-check.mjs) — a prior ad hoc script in the same style, usable as a starting point.
- [`plan/notes/dependency-union.md`](../notes/dependency-union.md) — records the sole-dependent fact from planning-time research, for cross-checking Requirements item 5's fresh grep.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the post-merge finding-set projection this task's pre-merge capture is the counterpart to.
