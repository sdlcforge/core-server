# Absorb Liq-Credentials

## Purpose and scope

Bring `@liquid-labs/liq-credentials`' source into `core-server`'s own tree at `src/credentials/` by history-preserving merge, wire it through the `builtinPlugins` aggregator, and remove it from the Tier-2 explicit npm-dependency list — all in one landing.

This donor is the one whose `setup()` actually exercises the mechanism's affordances: it constructs `app.ext.credentialsDB` (a cross-package contract two other plugins read) and calls `registerPathVar('credential', ...)` using the function `plugable-express` passes into `setup()` — the affordance that made post-`appInit` registration impossible in the first place.

Follows the same six-step [absorption recipe](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe) as task 001; the requirements below state only what is specific or different, plus the invariants that must not be relaxed.

**Cross-project gate.** This task must not be dispatched until `liq-credentials`' own relocation has landed on its `plan/core-server-domain-consolidation` branch. As of this plan's authoring that repository has a plan branch but **no authored plan at all**, and its source roots directly at `src/` rather than at `src/lib/` — so its relocation is a `git mv` of everything under `src/` into `src/credentials/`, with the root `src/index.js` reduced to a thin re-export so the package stays independently buildable. Verify the relocated layout; do not perform it on the donor's behalf.

## Requirements

1. **Verify, then merge.** `git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- src` must already show `src/credentials/…`. Record `core-server`'s pre-merge commit SHA. Merge the donor's **plan branch, not `main`**, with `--allow-unrelated-histories`.

2. **Handle `src/index.js` — the collision that does not announce itself.** `core-server` has no `src/index.js`, so this donor's thin root re-export arrives as a **clean, non-conflicting add**: git flags nothing, and it is invisible unless looked for. It does not belong in `core-server` — it is the donor's own package entry point, meaningful only in the donor's own build.

   `git rm src/index.js` after the merge. If this is skipped, the *next* donor's merge (task 003) hits an add/add conflict against this leftover; that conflict is the signal that this step was missed, and the resolution there is to remove the path outright rather than to choose a side.

3. **Drop every donor package-level file**, per the same list as task 001 (`package.json`, `package-lock.json`, `bun.lock`, `Makefile`, `make/`, `.gitignore`, `.eslintrc*`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/` including the donor's own `*-spec.md`, `dist/`, `qa/`, `test-staging/`, `node_modules/`, and every arriving path under `plan/`). Scope the `plan/` removal to the arriving paths, never a blanket `git rm -r plan/`.

4. **Verify by blob comparison, not by git's conflict list.** Generated `Makefile`/`make/*.mk` content merges silently. `git diff --stat <pre-merge-commit> -- . ':(exclude)src/credentials'` must show nothing outside `src/credentials/` that this task did not deliberately change.

5. **Union dependencies** per `plan/resources/absorption-dependency-union.md`, re-checked against the donor's actual `package.json`. `@liquid-labs/http-smart-response` overlaps and `core-server`'s `^1.0.0-alpha.6` is higher than the donor's — keep `core-server`'s. `@liquid-labs/liq-handlers-lib` takes `^1.0.0-alpha.16`. **`@liquid-labs/liq-credentials-db` stays an external dependency and is not folded.** No new `file:` spec.

6. **Wire in and unplug in one landing.** Add `import * as credentials from '../credentials'` (namespace import) to `src/lib/builtin-plugins.mjs`'s `submodules`, and in the same commit remove `'@liquid-labs/liq-credentials'` from `explicitPlugins` and from `package.json` `dependencies`. Loading it both ways at once crashes startup twice over: `Non-unique command path` on the routes, and `Path variable 'credential' is already registered.` on the path variable.

7. **Preserve the `app.ext.credentialsDB` contract name exactly.** `liq-work` and `liq-integrations-issues-github` both read it, and the `dev-core-consolidation-contract`'s [`app.ext` contract freeze](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#appext-contract-freeze) names it. Likewise `serverConfigRoot` must keep being read from the `setup()` argument object, not from `app.ext` directly — the donor was already fixed this way (commit `cab8a77`) and the fix must survive the merge.

8. **Verify the `liq-projects` setup-ordering coupling still holds.** `liq-projects`' `setup()` calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })` at plugin-load time, so it needs `liq-credentials`' `setup()` to have already run. That ordering is **not** mediated by `dependency-runner` — it is incidental to `find-plugins`' alphabetical scan order. After absorption, credentials' `setup` runs from `builtinPlugins`, which registers **before** core discovery, so the ordering is preserved and strengthened. Assert it observably: `app.ext.credentialsDB` present and functional in the full-tier harness, and `liq-projects`' routes still registered and working. If a check shows `liq-projects` failing to see `credentialsDB`, that is a hard stop — it is the failure mode this requirement exists to catch.

9. **Port the donor's tests**: `handlers/credentials/test/list.test.js` and its `test/data/creds-db.yaml` fixture. Make them run under `core-server`'s Jest/Babel/`test-staging` pipeline.

10. **Update the baselines with only the predicted diffs.** Expected here: two `@liquid-labs/liq-credentials` routes (`PUT /credentials/:credential/import`, `GET /credentials/list`) change `npmName` to `@sdlcforge/core-server`; route count stays 165; the `credential` path variable stays registered exactly once, with its inlined `validationRe` unchanged in the affected routes' compiled `matcher`; the plugins-list entry count drops by one. `golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical. Enumerate every accepted diff against `plan/resources/absorption-parity-contract.md`; halt on any unpredicted one.

11. **Audit the bundle** — every bare-specifier `require(...)` in `dist/sdlcforge-server.js` present in `package.json` `dependencies`, plus a bundle-size comparison against the pre-task artifact.

## Validation

- `make build`, `make test`, `make lint`, and `bun run test:local` are all green.
- `git log --follow src/credentials/<some-relocated-file>` reaches its original pre-relocation commits.
- **`src/index.js` does not exist** in `core-server` after this task. Assert it explicitly — this is the check that prevents task 003's silent collision.
- `src/lib/index.js` is unchanged from before this task and still exports `appInit`, `Reporter`, `name`, `summary`.
- `explicitPlugins` holds one fewer entry with no `@liquid-labs/liq-credentials`; `package.json` `dependencies` has no `@liquid-labs/liq-credentials` and still has `@liquid-labs/liq-credentials-db`.
- `app.ext.credentialsDB` is present in the full-tier harness and exposes `detail`, `getCredSpec`, `getToken`, `import`, `list`, `listSupported`, `registerCredentialType`, `resetDB`, `verifyCreds`, `writeDB` — the same set as the baseline.
- `appInit()` does not throw `Path variable 'credential' is already registered.` in any configuration exercised by the suite.
- `grep -n 'file:' package.json` shows exactly the two pre-existing entries.
- `git diff --stat <pre-merge-commit>` shows no unexpected root-level path changed.
- The regenerated `full-tier-*` snapshots differ only as the parity contract predicts; both `golden-*` snapshots are byte-identical.

## Metadata

architectural_impact: true

## Assumptions

- Phase 4 has landed and task 001 (`liq-controls`) has landed; `src/lib/builtin-plugins.mjs` already carries one submodule and the wire-in pattern is established.
- The donor's `src/index.js` exports an inert `name = 'core-credentials'` and a `summary` that `plugable-express`'s loader never reads — `summary` comes from the package `description` and `npmName` from the package `name`. The "registered as the `core-credentials` plugin" framing that appears in older planning text corresponds to nothing the loader consumes; do not try to preserve it.
- `clearRegistry()` runs at the top of `appInit` before any plugin loading, so `registerPathVar('credential', ...)` re-registers cleanly on the reload path.

## References

- [`plan/notes/absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md) — the `src/index.js` collision, the root-file drop list, and the dependency-union table.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — this donor's routes, setup behavior, dependencies, and tests to port.
- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md#research-findings) — the `liq-projects`/`liq-credentials` ordering coupling and the path-variable observables.
- `plan/phase-05-absorb-donor-plugins/001-absorb-liq-controls.md` — the pattern-setting task; its requirements 4, 5, and 10 apply here verbatim.

## Checkpoint hints

- After the donor branch's relocated layout is verified and the pre-merge SHA recorded.
- After the merge, with `src/index.js` removed and the blob comparison clean.
- After the dependency union and the wire-in/unplug commit.
- After the `credentialsDB` / `liq-projects` ordering assertions pass.
- After the ported test runs green, snapshot regeneration, and the bundle audit.

## Status

**Outcome: succeeded** (2026-08-24). Pre-merge `core-server` commit: `06f6cfe`. Donor merged from `liq-credentials/plan/core-server-domain-consolidation` at `c5524ff`. Landed in two commits: `97b3d68` (merge + `src/index.js` removal + drops) and `ee580a8` (dependency union + wire-in + unplug, together), plus one follow-on commit updating `src/lib/test/builtin-plugins.test.js` and regenerating the two full-tier snapshots.

### Requirements

1. **Donor relocation verified independently, not assumed.** `git ls-tree -r --name-only liq-credentials/plan/core-server-domain-consolidation -- src` (both against the donor checkout directly and against the fetched `liq-credentials/...` remote-tracking ref inside this worktree) showed the `src/credentials/…` layout (8 files) plus the donor's thin `src/index.js`.
2. **`src/index.js` removed.** Arrived as a clean, non-conflicting add exactly as predicted; `git rm -f src/index.js` in the same merge commit. Confirmed absent after the merge (`test -f src/index.js` → absent) and asserted again after the full landing.
3. **History-preserving merge, donor package-level files dropped.** `git merge --allow-unrelated-histories` against the donor's **plan** branch. Nine root conflicts (`.gitignore`, `AGENTS.md`, `Makefile`, `README.md`, `docs/project-structure.md`, `package.json`, `plan/TODO.yaml`, `plan/manifest.yaml`, `plan/overview.md`) resolved `--ours`; three clean non-conflicting adds `git rm -f`'d (`docs/liq-credentials-spec.md`, `package-lock.json`, `src/index.js`) plus the donor's six remaining `plan/` files (`plan/notes/liq-credentials-source-inventory.md` and the five `plan/phase-10-.../phase-11-...` task docs), scoped to the arriving paths only, never a blanket `git rm -r plan/`. (One self-correction mid-merge: the three `--ours`-resolved conflict files were transiently included in the first `git rm -f` invocation by mistake — a scope violation this task itself introduced and then caught and reverted before committing, via `git checkout HEAD -- <paths>` followed by re-`git add`; verified clean before the merge commit.) `git log --follow src/credentials/setup.mjs` reaches nine commits, ending at the donor's pre-relocation `7a1cc45`.
4. **Verified by blob comparison, not git's conflict list.** `git diff --stat 06f6cfe -- . ':(exclude)src/credentials'` was empty immediately after the merge — every root-level path, including the silently-merged `Makefile`/`make/`, is `core-server`'s own blob.
5. **Dependency union re-verified against the donor branch tip.** Donor `package.json` at `c5524ff` matches `absorption-dependency-union.md` exactly: `@liquid-labs/http-smart-response` (`^1.0.0-alpha.3`, lower than `core-server`'s existing `^1.0.0-alpha.6` — kept `core-server`'s), `@liquid-labs/liq-handlers-lib` (`^1.0.0-alpha.16` — already at that range from task 001's union, unchanged), `@liquid-labs/liq-credentials-db` (`^1.0.0-alpha.9` — added, stays external per the task's explicit constraint). No new `file:` spec — `grep -n 'file:' package.json` still shows exactly the two pre-existing entries. `rm -f bun.lock && bun install` resolved `@liquid-labs/liq-credentials-db@1.0.0-alpha.9` cleanly with no `liq-credentials` package entry remaining in the lockfile.
6. **Wire-in and unplug landed in one commit** (`ee580a8`): `import * as credentials from '../credentials'` (namespace, extensionless) appended to `submodules` in `src/lib/builtin-plugins.mjs`, and, in the same commit, `'@liquid-labs/liq-credentials'` removed from both `explicitPlugins` (`src/lib/app-init.mjs`) and `package.json` `dependencies`. No transient state on this branch had the donor loaded both ways. A real server startup (`bun run test:local`, both mid-task and again against a from-scratch `make build`) confirms no `Non-unique command path` / `Path variable 'credential' is already registered.` crash.
7. **`app.ext.credentialsDB` contract name preserved exactly; `serverConfigRoot` still read from the `setup()` argument.** `src/credentials/setup.mjs` assigns `app.ext.credentialsDB = credentialsDB` and destructures `serverConfigRoot` from its own `setup(...)` argument object (never from `app.ext` directly) — the `cab8a77` fix survived the merge unmodified. `grep -rn 'serverHome' src/credentials/` returns nothing.
8. **`liq-projects`/`liq-credentials` ordering coupling verified observably, not rediscovered.** The full-tier harness (`src/lib/test/full-tier-baseline.test.js`, unmodified by this task) calls the real `appInit()` with production `explicitPlugins`/`builtinPlugins` defaults — no throw, `app.ext.credentialsDB` present and exposing the full expected method set, and the regenerated `full-tier-api-spec.json` snapshot (165 routes) matches `liq-projects`' 38 routes byte-for-byte against the pre-task baseline. This is the "passing `appInit()`, no thrown error, `credentialsDB` functional afterward" evidence the parity contract states is sufficient. No unpredicted failure surfaced; nothing hit the hard-stop this requirement names.

   A second, narrower harness — `src/lib/test/builtin-plugins.test.js`'s test-injected-probe describe block — *did* surface a real instance of this same coupling and required a fix: that block overrides `builtinPlugins` to isolate the probe mechanism, but leaves `explicitPlugins` at its production default (so the real, still-external `liq-projects` is discovered and its `setup()` runs). Before this task, that was safe because `liq-credentials` was still in `explicitPlugins` and independently installed `credentialsDB`; after this task's unplug, the probe-only `builtinPlugins` override no longer includes credentials, so `liq-projects`' `setupCredentials({ credentialsDB: app.ext.credentialsDB })` call received `undefined` and threw. Fixed by changing that override to *join* the real absorbed submodules' own `builtinPluginsFor(...)` entry alongside the probe's, rather than replacing it wholesale — see Affected files below.
9. **Donor tests ported with no edits required.** `handlers/credentials/test/list.test.js` and its `test/data/creds-db.yaml` fixture arrived with the merge at `src/credentials/handlers/credentials/test/`, executed (not skipped) and passed under `core-server`'s Babel/Jest/`test-staging` pipeline with zero changes — the existing `CATALYST_TEST_DATA_SELECTOR` rule picked up the fixture unchanged, exactly as it did for `liq-controls`' tests in task 001.
10. **Snapshots regenerated; every diff predicted, none unpredicted.** Enumerated below. `golden-api-spec.json` and `golden-plugins-list.json` are byte-identical (`git status --short` shows no change to either).
11. **Bundle audited.** Every bare-specifier `require(...)` in both `dist/` bundles (11 distinct specifiers, including the newly-externalized `@liquid-labs/liq-credentials-db`) is a Node builtin or a declared `package.json` dependency — zero undeclared specifiers. `dist/sdlcforge-server.js` 7781 → 10330 bytes; `dist/sdlcforge-server-exec.js` 7618 → 10169 bytes (growth consistent with the absorbed `src/credentials/` code).

### Accepted snapshot diffs

- `full-tier-api-spec.json` — route count **165 → 165**; same route multiset. Exactly two entries changed, each in exactly one field (`npmName`, `@liquid-labs/liq-credentials` → `@sdlcforge/core-server`): `PUT /credentials/:credential/import`, `GET /credentials/list`. No `path`/`method`/`matcher`/`help`/`parameters` value changed anywhere. Both absorbed routes sit contiguously at indices 39–40, immediately after `liq-controls`' four routes (35–38) and before `liq-orgs`' block — the fixed **controls → credentials** ordering the parity contract predicts, with no interleaving among the remaining explicit plugins.
- `full-tier-plugins-list.json` — **11 → 10** entries: the `@liquid-labs/liq-credentials` entry is gone; the `@sdlcforge/core-server` builtin entry (unchanged since task 001) remains.
- `full-tier-integrations-list.json` — **no diff at all**. `liq-credentials` registers no integration provider (hooks/routes only — the inventory's prediction), so this snapshot is untouched by this task; still 2 entries, same as after task 001.
- `golden-api-spec.json` and `golden-plugins-list.json` — byte-identical, as parity contract item 7 requires.
- Setup-method `{name, deps}` set, `app.ext` key set, and `credentialsDB` method set — all unchanged (parity contract items 5 and 6), asserted green by `full-tier-baseline.test.js`.

### Validation

| Check | Result |
| --- | --- |
| `make build` | passed (clean rebuild from scratch) |
| `make test` | passed — 10 suites, 35 tests, including the ported `credentials/handlers/credentials/test/list.test.js` |
| `make lint` | **failed, pre-existing and unchanged** — 230 errors, identical count and file set to task 001's own measurement (`test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`, `test/test-server.js`). **Zero** lint errors in `src/`, including the whole absorbed `src/credentials/` tree. Not fixed: out of this task's scope, and reformatting those files would violate requirement 4's "no unexpected root-level path changed" check. |
| `bun run test:local` | passed — 7/7 endpoints, both mid-task and against the final from-scratch build; server log shows normal startup with no path-variable or command-path crash |

### Affected files

- `src/credentials/**` (8 files) — absorbed, byte-identical to the donor
- `src/lib/builtin-plugins.mjs`, `src/lib/app-init.mjs` — wire-in and unplug, plus updated explanatory comments covering both absorbed submodules
- `src/lib/test/builtin-plugins.test.js` — `ABSORBED_SUBMODULES` now includes `credentials`; the composed-`setup` unit test now supplies a real `serverConfigRoot`/`registerPathVar` and asserts `app.ext.credentialsDB` and the `credential` path-var registration; the test-injected-probe harness's `builtinPlugins` override now *joins* the real absorbed submodules' entry (via `builtinPluginsFor`) alongside the probe's, rather than replacing it — required once `liq-projects` (real, still-external) began depending on the absorbed `credentials` submodule having run
- `package.json`, `bun.lock` — dependency union (`@liquid-labs/liq-credentials-db` added) and unplug (`@liquid-labs/liq-credentials` removed)
- `test/__snapshots__/full-tier-{api-spec,plugins-list}.json` — regenerated; `full-tier-integrations-list.json` unchanged (no diff)

### Notes

- **Self-caught scope slip during merge resolution:** while `git rm -f`ing the donor's clean-add root files, `plan/TODO.yaml`, `plan/manifest.yaml`, and `plan/overview.md` — `core-server`'s own conflict-resolved (`--ours`) files — were transiently included in the same `git rm -f` invocation by mistake. Caught before the merge commit via a diff-stat/status check, restored with `git checkout HEAD -- <paths>`, and re-verified with `git diff 06f6cfe -- plan/TODO.yaml plan/manifest.yaml plan/overview.md` (empty) before committing. No trace of this slip survives in the committed history.
- **The `liq-projects`/`liq-credentials` ordering coupling (requirement 8) surfaced a real, fixable test-isolation gap** in `builtin-plugins.test.js`'s probe harness, described under requirement 8 above and fixed in the same file — flagged here rather than silently folded in because it is a direct, mechanical consequence of *this task's own* unplug (the probe harness's isolation strategy stops being valid only because `liq-credentials` left `explicitPlugins`), so it falls within the task's own scope rather than being an unrelated drift.
- A stale, unpruned `node_modules/@liquid-labs/liq-credentials` directory may survive `bun install` (not specifically re-checked this task, per the same observation task 001 made for `liq-controls`); `bun.lock` carries zero references to it and no installed package declares it as a dependency.
- The `liq-credentials` git remote added per requirement 1 remains configured in the shared repository config, alongside the `liq-controls` remote task 001 added.
