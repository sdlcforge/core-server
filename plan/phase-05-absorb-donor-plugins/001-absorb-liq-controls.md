# Absorb Liq-Controls

## Purpose and scope

Bring `@liquid-labs/liq-controls`' source into `core-server`'s own tree at `src/controls/` by history-preserving merge, wire it through the Phase 4 `builtinPlugins` aggregator, and remove it from the Tier-2 explicit npm-dependency list — **all in one landing**.

This is the first of the three absorptions and it sets the pattern the other two follow. It also carries the worst of the merge hazards: an add/add collision on `src/lib/index.js` that, resolved by reflex, silently deletes `core-server`'s entire public library export surface while leaving `make build` green.

Follows the `dev-core-consolidation-contract`'s six-step [absorption recipe](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe).

**Cross-project gate.** This task must not be dispatched until `liq-controls`' own Phase 1 relocation (`plan/phase-01-relocate-plugin-source/001-restructure-src-into-core-server-layout.md`) has landed on that repository's `plan/core-server-domain-consolidation` branch. Verify it, do not assume it — see requirement 1.

## Requirements

1. **Verify the donor branch is relocated before merging anything.** `git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- src` must already show the `src/controls/…` layout. Merging a pre-restructure tree writes every file to the wrong path and has to be undone by hand. If the relocation has not landed, halt with "blocked: precondition not met" — do not relocate on `core-server`'s behalf.

2. **Merge, preserving history.** `git remote add` the donor checkout at `/Users/zane/playground/liquid-labs/liq-controls`, `git fetch`, then `git merge --allow-unrelated-histories <donor-remote>/plan/core-server-domain-consolidation` — **the donor's plan branch, not `main`**. Record the pre-merge `core-server` commit SHA before starting; several later checks compare against it.

3. **Resolve the `src/lib/index.js` add/add collision in `core-server`'s favor — and verify it.** After the donor's own Phase 1, its `src/lib/` holds exactly one file: `index.js`, reduced to `export * from '../controls'`. `core-server`'s `src/lib/index.js` is its public library export surface (`appInit`, `Reporter`, `name`, `summary`) — what `dist/sdlcforge-server.js` is built from and what `src/lib/test/index.test.js` asserts against.

   Resolve with `git checkout --ours -- src/lib/index.js && git add src/lib/index.js`. **Never `git rm` it and never take `--theirs`.** Taking `--theirs` replaces the whole export surface with a one-line re-export — still a valid module, so the build stays green and `dist/sdlcforge-server.js` is still produced, while `appInit` silently disappears from the package's exports.

   Verify, after the merge and **before editing anything**, that `git diff <pre-merge-commit> -- src/lib/index.js` is empty.

4. **Drop every donor package-level file.** `core-server` owns its own version of all of these; a merge must not carry the donor's in: `package.json`, `package-lock.json`, `bun.lock`, `Makefile`, `make/`, `.gitignore`, `.eslintrc*`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`, `dist/`, `qa/`, `test-staging/`, `node_modules/`, `plugable-express.yaml`, and **every file the donor carries under `plan/`**.

   Two `core-server`-specific points: the donor's `docs/liq-controls-spec.md` must go (`core-server` already has exactly one `docs/*-spec.md`, and Flow's project-doc discovery assumes that glob matches one file); and `plugable-express.yaml` — which declares `dependencies: ['@liquid-labs/liq-projects', '@liquid-labs/liq-orgs']` and which nothing in `plugable-express` reads — goes too, but the load-order fact it records (controls genuinely needs both plugins loaded) must be preserved in the absorption's own documentation.

   Scope the `plan/` removal to the **arriving** paths (`git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- plan`), never a blanket `git rm -r plan/` — `core-server` maintains its own `plan/` directory.

5. **Do not trust git's conflict list as the review list.** All three donors and `core-server` share generated `Makefile` / `make/*.mk` content from the same `@liquid-labs/sdlc-projects-workflow-local-node-build` generator, so byte-identical copies merge silently with no conflict at all, and donor `plan/` trees arrive as clean non-conflicting adds. After the merge, verify by **blob comparison against the pre-merge commit** that `core-server`'s version of every root-level path is what survived: `git diff --stat <pre-merge-commit> -- . ':(exclude)src/controls'` should show nothing outside `src/controls/` that this task did not deliberately change.

6. **Union the donor's runtime dependencies** into `core-server`'s `package.json`, per the table Phase 3 task 003 confirmed at `plan/resources/absorption-dependency-union.md`. Take the higher range on overlap and record the choice. Re-check the table against the donor's actual `package.json` at merge time rather than trusting it; report any discrepancy. Introduce **no new `file:` spec**.

7. **Wire it through the aggregator, in the same landing as the unplug.** In `src/lib/builtin-plugins.mjs`, add `import * as controls from '../controls'` (a **namespace** import — `export * from` across submodules is an ambiguous-export collision) and add `controls` to `submodules`. In the *same* commit, remove `'@liquid-labs/liq-controls'` from `explicitPlugins` in `src/lib/app-init.mjs` **and** from `package.json`'s `dependencies`.

   Wiring in and unplugging **must land together**. A donor loaded both ways at once is a hard startup crash: `plugable-express` throws `Non-unique command path: <path>` on a second registration of the same array-style path. Never one without the other, not even transiently across two commits on the branch.

8. **Port the donor's tests into `core-server`'s suite.** `handlers/orgs/controls/test/list.test.js`, `handlers/orgs/controls/_lib/test/list-lib.test.mjs`, `resources/test/controls.test.mjs`, `resources/test/question-controls.test.mjs`, and their `test/data/` fixture trees arrive with the merge; make them actually run under `core-server`'s Jest/Babel/`test-staging` pipeline. If a fixture path or a test-runner assumption breaks under the new layout, fix it in the test rather than changing the code under test.

9. **Update the baselines with only the diffs the parity contract predicts.** After the landing, regenerate the full-tier snapshots and verify each change against `plan/resources/absorption-parity-contract.md`. Expected here: four `@liquid-labs/liq-controls` routes change `npmName` to `@sdlcforge/core-server` (route count stays 165, and no `path`/`method`/`matcher`/`help`/`parameters` value changes); the `full-tier-plugins-list.json` entry count drops by one; the `controls` integration provider's `npmName` changes. `golden-api-spec.json` and `golden-plugins-list.json` must stay **byte-identical** — `builtinPlugins` is suppressed under `skipCorePlugins: true`. Enumerate every accepted diff in the task report; treat any unpredicted diff as a regression and halt.

10. **Audit the bundle.** After `make build`, confirm every bare-specifier `require(...)` surviving in `dist/sdlcforge-server.js` appears in `package.json`'s `dependencies`, and compare bundle size against the pre-absorption figure. `nodeExternals()` decides externality from `package.json`, so an undeclared dependency is silently inlined — a green build producing an artifact that breaks only for a consumer whose transitive graph differs.

## Validation

- `make build`, `make test`, `make lint`, and `bun run test:local` are all green.
- `git log --follow src/controls/<some-relocated-file>` reaches that file's original pre-relocation commits in the donor's history.
- `git diff <pre-merge-commit> -- src/lib/index.js` is empty, and `src/lib/index.js` still exports `appInit`, `Reporter`, `name`, and `summary`. `src/lib/test/index.test.js` passes.
- No `src/index.js` exists in `core-server` (this donor should not bring one, but confirm — the *next* two donors will).
- `src/lib/app-init.mjs`'s `explicitPlugins` array holds **10** entries with no `@liquid-labs/liq-controls`, and `package.json`'s `dependencies` has no `@liquid-labs/liq-controls`.
- `grep -rn 'liq-controls' src/ package.json` returns nothing outside comments/history references that were deliberately kept.
- `grep -n 'file:' package.json` shows exactly the two pre-existing entries.
- The donor's four ported test files execute (not skipped) in `make test` output.
- No file from the drop list in requirement 4 is present in the tree; `git diff --stat <pre-merge-commit>` shows no unexpected root-level path changed.
- The regenerated `full-tier-*` snapshots differ from their pre-task state in exactly the ways the parity contract predicts, each enumerated in the report; `golden-api-spec.json` and `golden-plugins-list.json` are byte-identical.

## Metadata

architectural_impact: true

## Assumptions

- Phase 4 has landed: `src/lib/builtin-plugins.mjs` exists in empty-but-shaped form, `app-init.mjs` passes `builtinPlugins`, and the registration path is proven by the probe. This task adds a submodule to an already-working mechanism.
- Phase 3's baseline snapshots and `plan/resources/absorption-parity-contract.md` exist and are current.
- `liq-controls` registers no path variable of its own (it consumes `orgKey` from `liq-orgs`, which stays an external explicit plugin), so no `registerPathVar` duplicate hazard applies to this donor specifically.
- The absorbed code keeps the donor's exact setup-method strings — `'load org controls'` with `deps: ['load orgs']` and `'load controls integrations'` with `deps: ['setup integrations']`. `@liquid-labs/dependency-runner` matches by exact string; renaming either breaks resolution silently in one direction and loudly in the other.

## References

- [`plan/notes/absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md) — the landing path, the root-file drop list, the dependency-union table, and the `src/lib/index.js` collision in full.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — this donor's routes, setup methods, provider/hook, dependencies, and tests to port.
- [`dev-core-consolidation-contract.md`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md) — the six-step absorption recipe, the `app.ext` contract freeze, and the root-file-ownership rule.
- `plan/resources/absorption-parity-contract.md` and `plan/resources/absorption-dependency-union.md` — authored by Phase 3 task 003.

## Status

**Outcome: succeeded** (2026-08-24). Pre-merge `core-server` commit: `ae8b64b`. Donor merged from `liq-controls/plan/core-server-domain-consolidation` at `b1c5dbc`. Landed in two commits: `de7a1ca` (merge + resolution + drops) and `cf160b7` (dependency union + wire-in + unplug, together).

### Requirements

1. **Donor relocation verified, not assumed.** `git ls-tree -r --name-only liq-controls/plan/core-server-domain-consolidation -- src` showed the `src/controls/…` layout (28 files) plus the donor's reduced `src/lib/index.js`. Verified against the fetched remote-tracking ref, not only the donor checkout.
2. **History-preserving merge.** `git merge --allow-unrelated-histories` against the donor's **plan** branch. Merge commit `de7a1ca` has two parents (`ae8b64b`, `b1c5dbc`). `git log --follow src/controls/setup.mjs` reaches four commits, ending at the donor's pre-relocation `86de6ba`.
3. **`src/lib/index.js` resolved `--ours` and blob-verified.** `git diff ae8b64b -- src/lib/index.js` is empty, checked after the merge and before any edit. Never `git rm`'d, never `--theirs`. `src/lib/test/index.test.js` passes; the built bundle still exports `appInit`, `Reporter`, `name`, `summary`.
4. **Donor package-level files dropped.** Nine root conflicts resolved `--ours` (`.gitignore`, `AGENTS.md`, `Makefile`, `README.md`, `docs/project-structure.md`, `package.json`, `plan/TODO.yaml`, `plan/manifest.yaml`, `plan/overview.md`); six clean non-conflicting adds `git rm`'d (`docs/liq-controls-spec.md`, `make/01-schema.mk`, `package-lock.json`, `plugable-express.yaml`, and the donor's six remaining `plan/` files). `plan/` removal was scoped to the enumerated arriving paths, never a blanket `git rm -r plan/`.
5. **Git's conflict list was not treated as the review list.** `git diff --stat ae8b64b -- . ':(exclude)src/controls'` was **empty** immediately after the merge — every root-level path, including the silently-merged `Makefile` and `make/`, is `core-server`'s own blob.
6. **Dependency union re-verified against the donor branch tip, no discrepancy.** The donor's `package.json` at `b1c5dbc` matches `absorption-dependency-union.md` exactly. A fresh import sweep of the donor's `src/` re-confirmed **zero** references to `@liquid-labs/liq-qa-lib` and `@liquid-labs/http-smart-response` (static and dynamic), so neither is carried in on controls' account. Seven added: `@liquid-labs/find-plus` `^1.0.1`, `@liquid-labs/liq-handlers-lib` `^1.0.0-alpha.16`, `@liquid-labs/npm-toolkit` `^1.0.0-alpha.15`, `@liquid-labs/resource-item` `^1.0.0-alpha.4`, `@liquid-labs/resource-model` `^1.0.0-alpha.10`, `http-errors` `^2.0.0`, `js-yaml` `^4.1.0`. No new `file:` spec — `grep -n 'file:' package.json` still shows exactly the two pre-existing entries.
7. **Wire-in and unplug landed in one commit** (`cf160b7`): `import * as controls from '../controls'` (namespace, extensionless) plus `submodules = [controls]`, and, in the same commit, removal from `explicitPlugins` **and** from `package.json` `dependencies`. No transient state on this branch had the donor loaded both ways; the intermediate merge commit carried the code in-tree but unwired.
8. **Donor tests ported with no edits required.** All four execute and pass under `core-server`'s Babel/Jest/`test-staging` pipeline; the `test/data/` fixture trees are picked up by the existing `CATALYST_TEST_DATA_SELECTOR` rule unchanged. No fixture path or runner assumption broke.
9. **Snapshots regenerated; every diff predicted.** Enumerated below.
10. **Bundle audited.** Every bare-specifier `require(...)` in both `dist/` bundles is a Node builtin or a declared dependency; zero undeclared specifiers, so nothing was silently inlined. `dist/sdlcforge-server.js` 2554 → 7781 bytes; `dist/sdlcforge-server-exec.js` 2387 → 7618 bytes.

### Accepted snapshot diffs

- `full-tier-api-spec.json` — route count **165 → 165**; same route multiset; route **order unchanged**. Exactly four entries changed, each in exactly one field (`npmName`, `@liquid-labs/liq-controls` → `@sdlcforge/core-server`): `GET /orgs/:orgKey/controls/list`, `GET /help/orgs/:orgKey/controls/list`, `GET /orgs/controls/list`, `GET /help/orgs/controls/list`. No `path`/`method`/`matcher`/`help`/`parameters` value changed anywhere. Parity contract item 1 permitted a reordering; none occurred — the absorbed routes already occupied indices 35–38, immediately after the 35 framework routes, so `loadBuiltinPlugins` running before `loadPlugins` reproduced their previous position exactly.
- `full-tier-plugins-list.json` — **12 → 11** entries: the `@liquid-labs/liq-controls` entry is gone; the `@sdlcforge/core-server` entry (Phase 4's) remains with its expected summary. Parity contract item 2.
- `full-tier-integrations-list.json` — still **2** entries; the `controls` provider's `npmName` becomes `@sdlcforge/core-server`. The two entries also swap position: `listPluginsHandler` (`@liquid-labs/liq-plugins-lib`) sorts its response by `npmName.localeCompare`, and `@sdlcforge/core-server` sorts after `@liquid-labs/liq-integrations-issues-github` where `@liquid-labs/liq-controls` sorted before it. This is the *same* predicted `npmName` change re-expressed through the endpoint's own deterministic sort, not an independent diff. The `name`-omission defect on the two `issues-github` registrations is preserved untouched.
- `golden-api-spec.json` and `golden-plugins-list.json` — **byte-identical** (`git diff --stat` empty), as parity contract item 7 requires.
- Setup-method `{name, deps}` set, `app.ext` key set, and `credentialsDB` method set — all unchanged (parity contract items 5 and 6), asserted green by `full-tier-baseline.test.js`.

Parity contract item 4 (`GET /server/plugins/details/@liquid-labs%2Fliq-controls` stops resolving) follows mechanically from the verified `handlerPlugins` change and was not separately probed.

### Validation

| Check | Result |
| --- | --- |
| `make build` | passed |
| `make test` | passed — 9 suites, 34 tests, including all four ported donor test files |
| `make lint` | **failed, pre-existing and unchanged** — 230 errors, all in `test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`, `test/test-server.js`. Identical count and file set measured at `ae8b64b` before any edit. **Zero** lint errors in `src/`, including the whole absorbed `src/controls/` tree. Not fixed: those four files are outside this task's scope, and reformatting them would break this task's own requirement-5 check that no unexpected root-level path changed. |
| `bun run test:local` | passed — 7/7 endpoints; server log shows `Updating controls data...`, i.e. the absorbed setup method ran in a real startup |

### Affected files

- `src/controls/**` (28 files) — absorbed, byte-identical to the donor except `src/controls/integrations/register-controls-integrations.mjs` (`npmName` re-identification and its log string)
- `src/lib/builtin-plugins.mjs`, `src/lib/app-init.mjs` — wire-in and unplug
- `src/lib/test/builtin-plugins.test.js` — Phase 4's empty-`submodules` assertions replaced; the composed `setup` test now asserts the two enqueued `{name, deps}` pairs verbatim
- `src/lib/test/full-tier-baseline.test.js` — expected `controls` provider `npmName`
- `package.json`, `bun.lock` — dependency union and unplug
- `test/__snapshots__/full-tier-{api-spec,plugins-list,integrations-list}.json` — regenerated

### Notes

- **`make/01-schema.mk` was dropped** with the rest of the donor's `make/`, per requirement 4. Its only effect was copying `src/controls/schema/audit.schema.json` into `dist/`; nothing in the absorbed source imports that schema, and `core-server` has no `files` allowlist. The schema file itself is retained under `src/controls/schema/`.
- **`plugable-express.yaml`'s load-order fact, preserved here as required:** `controls` genuinely needs both `@liquid-labs/liq-projects` and `@liquid-labs/liq-orgs` loaded. `src/controls/resources/load-controls.mjs` reads `app.ext._liqOrgs.orgs` and `src/controls/integrations/get-question-controls.mjs` reads both `app.ext._liqOrgs.orgs` and `app.ext._liqProjects.playgroundMonitor`. Both plugins stay external explicit-tier dependencies; the ordering is carried by the `'load org controls'` → `deps: ['load orgs']` setup-method dependency, now asserted directly in `src/lib/test/builtin-plugins.test.js`.
- A stale, unpruned `node_modules/@liquid-labs/liq-controls` directory survives `bun install` (`bun.lock` has zero references to it and no installed package declares it). Its presence strengthens rather than weakens the result: the donor is on disk yet absent from `GET /server/plugins/list`, confirming the "no keyword discovery" assumption.
- `bun install` incidentally re-hoisted the transitive `entities` package (root 7.0.1 → 4.5.0, with 7.0.1 pushed under `@vue/compiler-core` and `htmlparser2`). Dev-tooling only; `entities` appears nowhere in either `dist/` bundle.
- The `liq-controls` git remote added per requirement 2 remains configured in the shared repository config.

## Checkpoint hints

- After the donor branch's relocated layout is verified and the pre-merge SHA recorded.
- After the merge, with `src/lib/index.js` resolved and blob-verified against the pre-merge commit.
- After the root-file drop list is applied and the full-tree blob comparison is clean.
- After the dependency union and the wire-in/unplug commit.
- After the ported tests run green.
- After snapshot regeneration and the bundle audit.
