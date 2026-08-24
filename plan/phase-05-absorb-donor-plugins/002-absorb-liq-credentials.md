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
