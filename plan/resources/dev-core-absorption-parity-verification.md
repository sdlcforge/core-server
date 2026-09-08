# Dev-Core Absorption Parity Verification

## Purpose and scope

Records phase-04 task 005's walk of Phase 1's parity contract
(`plan/resources/dev-core-absorption-parity-contract.md`) against the merged server, the
non-snapshot observables the checked-in snapshots do not cover, and the full unscoped
build/test/lint/local-integration run. This is the record the manager triages from.

Measured on branch `plan/sdlc-core-unification-04-005`, cut from `main` at `9cc477a`
(2026-09-06, "Merge branch 'plan/sdlc-core-unification-04-004'"), with Phase 4 tasks 001–004
all landed. Node v26.5.0; `@sdlcforge/core-server` 1.0.0-alpha.16; `@liquid-labs/plugable-express`
1.0.0-alpha.59 (yalc link); `@liquid-labs/liq-handlers-lib` 1.0.0-alpha.17. Dependencies
provisioned by `scripts/provision-local-deps.sh` (881 packages, `git status --porcelain` empty
afterward). No source file was changed by this task.

## Verdict

**Every parity-contract item held.** Items 1–10 all verified, most of them end-to-end against a
live running server rather than against a snapshot. Nothing outside the contract moved: across
the plan's entire history exactly two snapshot files changed, and both are contract items.

**Two Validation items initially read as failed, both resolved by manager correction to the task
document rather than by re-running anything** (the underlying verification work was already
complete and correct; the task document's own written bar was incomplete/wrong in two places).
Both are stated in full in the next section, together with the correction applied.

## What did not hold literally, and the correction applied

### 1. `make test` is not green — one suite, a fifth genuinely pre-existing inherited defect

38 suites collected; **37 pass, 1 fails**. 186 tests; 179 pass, 7 fail. The single red suite is
`src/projects/handlers/_lib/test/project-lifecycle.test.mjs`, and its root failure is verbatim
the cause already on record:

```
● project lifecyle › create project › creates a local repository in the playground
  TypeError: The "path" argument must be of type string. Received undefined
    at join (../src/projects/handlers/_lib/create-lib.mjs:90:29)
    at Object.<anonymous> (../src/projects/handlers/_lib/test/project-lifecycle.test.mjs:67:7)
```

`create-lib.mjs:90` reads `app.ext.serverConfigRoot`; the suite's `appMock` supplies
`app.ext.serverHome`. The remaining 6 failures in the suite cascade from that first one.

This is **core-server followup `N7cz`** (carried across from dev-core followup `2aMD` by
phase-02 task 002), whose text states outright: *"A real pre-existing donor defect, not a
regression from absorption. Keeps make test/make qa red in @sdlcforge/core-server until fixed; a
future full-test-suite run should not expect a fully-green make qa because of this one suite."*
Phase 02 task 004 and Phase 03 task 001 each independently proved the failure is not
merge-induced; this run reproduces the same suite, the same 7 tests, and the same first-failure
line as those runs.

**Manager resolution:** this task document's original requirement 6 fenced off four inherited
defects (`uROI`, `b3hk`, `mLm3`, `NEJt`) and omitted `N7cz` — an omission in Phase 1's original
enumeration, not a deliberate decision that this suite must be green. `N7cz` has now been
independently confirmed absorption-unrelated three separate times (phase-02 task 004, phase-03
task 001, this task). The task document has been corrected (2026-09-06) to add `N7cz` as a fifth
fenced-off inherited defect, consistent with the plan's uniform treatment of every other
inherited defect throughout every phase: record it, confirm it is unchanged, do not fix it here.
With that correction, requirement 2's bar — "green across all suites except `N7cz`" — is met.

### 2. The lint finding set names a file task 003 modified — proven pre-existing

`qa/lint.txt` contains one finding under `src/`:

```
src/lib/test/plugin-graph-gate.test.js
  49:3  error  'beforeAll' is not defined  no-undef
```

`src/lib/test/plugin-graph-gate.test.js` is exactly the file phase-04 task 003 rewrote. The
finding itself is **pre-existing**, proven two independent ways:

- At `bad6451^` (immediately before task 003) the file carried the identical
  `/* global describe expect test */` directive — no `beforeAll` — and used `beforeAll` at line
  60. Task 003 moved the call from line 60 to line 49 and changed nothing about the cause.
- It is a named member of the recorded standing baseline:
  `plan/notes/eslint-component-boundary-rule.md`'s "Baseline arithmetic for goal 5" lists all
  three `src/` findings as `'beforeAll' is not defined` in
  `plugin-graph-{gate,serverconfigroot-rename,third-party-ordering}.test.js`.

**Manager resolution:** the task document's requirement 4 wording ("names no file modified by
tasks 002/003/004") was too strict — it did not anticipate a pre-existing finding surviving
inside a file one of those tasks happened to touch for an unrelated reason. Corrected (2026-09-06)
to the substantive bar the requirement's own prose (requirement 3) already stated: *this phase's
changes introduce no new lint finding.* That bar holds, and in fact the phase **removed two**
findings (phase-04 task 004 added `beforeAll` to the global directive of the two sibling files it
touched, clearing their identical findings; task 003 did not touch `plugin-graph-gate.test.js`'s
directive, so its one finding survives unchanged).

## The parity-contract walk

| # | Contract item | Verdict | Evidence |
|---|---|---|---|
| 1 | 112-route `npmName` re-attribution; 165 total; 118 under `@sdlcforge/core-server`; no other field moves | **held** | Live `GET /server/api` |
| 2 | Route reordering within `app.ext.handlers` | **held** | Live `GET /server/api` block layout |
| 3 | Plugins list 6 → 5 and the rewritten `core-server` summary | **held** | Live `GET /server/plugins/list` |
| 4 | Integrations-list `npmName` re-identification — predicted non-event | **held (non-event confirmed)** | Live `GET /server/plugins/integrations/list`; snapshot untouched since 2026-08-24 |
| 5 | `…/dev-core/details` stops resolving; `…/core-server/details` still does | **held (both halves)** | Live probes, corrected route form |
| 6 | `golden-api-spec.json` / `golden-plugins-list.json` byte-identical throughout | **held** | `git diff --stat` empty; blob hashes constant across the whole plan |
| 7 | Setup-method `{name, deps}` — unchanged | **held** | `full-tier-baseline.test.js` PASS |
| 8 | `app.ext` key set — unchanged | **held** | `full-tier-baseline.test.js` PASS |
| 9 | Plugin-graph finding set; allowlist deleted | **held** | `plugin-graph-gate.test.js` PASS |
| 10 | Anything not on the list is a regression | **held** | Full-history snapshot sweep; path-var, `credentialsDB`, setup-`deps`, integrations checks |

### Item 1 — route re-attribution, verified end-to-end

`GET /server/api` on a live server started from this worktree's `dist/sdlcforge-server-exec.js`
(`NODE_ENV=test SDLC_NO_API_UPDATE=true`, port 32600) returns **165** routes with this provenance
tally:

```
 118  @sdlcforge/core-server
  35  @liquid-labs/plugable-express
   6  @liquid-labs/sdlc-projects-workflow-github-node-jest-cicd
   2  @liquid-labs/sdlc-projects-badges-coverage
   2  @liquid-labs/sdlc-projects-badges-github-workflows
   2  @liquid-labs/sdlc-projects-workflow-local-node-build
---
  dev-core routes: 0
```

The pre-merge snapshot (`git show deef90e^:test/__snapshots__/full-tier-api-spec.json`) tallies
165 with `@sdlcforge/core-server` 6 and `@sdlcforge/dev-core` 112. 6 + 112 = 118. Contract
arithmetic confirmed.

The "no other field moves" clause was verified as a set comparison of the **live** server against
the **pre-merge** snapshot, keyed on `method + path`, with `npmName` stripped:

```
unique pre keys: 165   unique live keys: 165
routes in pre but not live: 0
routes in live but not pre: 0
routes with a non-npmName field difference: 0
```

Zero differences in `path`, `method`, `matcher`, `help`, or `parameters` across all 165 routes.

The live spec is additionally **element-for-element identical** to the checked-in, rebaselined
`test/__snapshots__/full-tier-api-spec.json` — 0 positional mismatches across all 165 entries,
all fields, in order. That confirms task 002's rebaseline against the real running server, not
just against itself.

### Item 2 — route reordering within `app.ext.handlers`

Contiguous provenance blocks, pre-merge snapshot versus live server:

```
== PRE-MERGE                          == LIVE
  [  0- 34] ( 35) plugable-express      [  0- 34] ( 35) plugable-express
  [ 35- 40] (  6) core-server           [ 35-152] (118) core-server
  [ 41- 42] (  2) badges-coverage       [153-154] (  2) badges-coverage
  [ 43- 44] (  2) badges-github-wf      [155-156] (  2) badges-github-wf
  [ 45- 50] (  6) wf-github-node-jest   [157-162] (  6) wf-github-node-jest
  [ 51- 52] (  2) wf-local-node-build   [163-164] (  2) wf-local-node-build
  [ 53-164] (112) dev-core              (gone)
```

The 112 absorbed routes moved from *after* all four `sdlc-projects-*` explicit plugins into the
builtin block, which now runs 35–152 ahead of the explicit tier at 153–164 — exactly as
predicted.

Within the builtin block, the seven components land in declared DAG order
(`package.json`'s `plugable.host.builtins[0].components` reads
`credentials, projects, orgs, controls, issues-github, work, projects-audit`):

```
 35- 36  credentials      (2)
 37- 74  projects        (38)
 75- 80  orgs             (6)
 81- 84  controls         (4)
 85-144  work            (60)
145-152  projects-audit   (8)
```

(`issues-github` contributes 0 routes — integration hooks only.) The contract's
`credentials`-ahead-of-`controls` prediction is directly visible:

| | pre-merge | live |
|---|---|---|
| `controls` (4 routes) | 35–38 | 81–84 |
| `credentials` (2 routes) | 39–40 | 35–36 |

`credentials` moves from position 2 to position 1; `controls` moves behind
`credentials`/`projects`/`orgs`.

### Item 3 — plugins list 6 → 5, summary rewritten

Live `GET /server/plugins/list` returns **5** entries. `@sdlcforge/dev-core` is gone.
`@sdlcforge/core-server`'s summary changed from the three-component string to the
seven-component one, byte-identical to the checked-in
`test/__snapshots__/full-tier-plugins-list.json`.

### Item 4 — integrations-list re-identification: confirmed non-event

Live `GET /server/plugins/integrations/list` is identical to the checked-in
`test/__snapshots__/full-tier-integrations-list.json`, whose last commit predates this plan
entirely (2026-08-24). `full-tier-baseline.test.js`'s `EXPECTED_INTEGRATION_PROVIDERS` (3
providers, both `issues-github` registrations with `name: undefined`) passes unchanged. The
contract's prediction of a total non-event is confirmed.

### Item 5 — plugin details, both halves (corrected route form)

The correct route (last segment `details`, not first) confirmed both halves:

```
GET /server/plugins/@sdlcforge%2Fcore-server/details   → HTTP 200 (seven-component summary)
GET /server/plugins/@sdlcforge%2Fdev-core/details      → HTTP 404
```

Both halves hold, and the "everything 404s" alternative explanation is disproven by the
core-server half returning 200.

### Item 6 — golden snapshots byte-identical throughout

`git diff --stat` on both files is empty; blob hashes are constant at every checkpoint across the
plan, and their last-touching commits both predate this plan.

### Item 7 — setup-method names and `deps`: unchanged

Asserted by `full-tier-baseline.test.js`, which **PASSED** in the full unscoped `make test` run.
`EXPECTED_SETUP_METHODS` is exactly the contract's seven-entry table; the exact-string dependency
`@liquid-labs/dependency-runner` matches on is intact.

### Item 8 — `app.ext` key set: unchanged

Same passing suite: all 20 keys, exactly `EXPECTED_APP_EXT_KEYS`.

### Item 9 — the plugin-graph finding set

`src/lib/test/plugin-graph-gate.test.js` **PASSED**, allowlist deleted outright, asserting
`outcome: 'ok'`, `exitCode: 0`, `counts: {error:0, warning:0, info:1}`, 5 total findings —
exactly the contract's predicted post-merge table and exactly what task 001 measured. Both
chartered edges assert correctly (`credentialsDB` at `satisfied-by-source-order`;
`serverConfigRoot` with `orderVerdict: null` preserved, not flattened). All sibling plugin-graph
suites pass. No `@sdlcforge/dev-core#…` node-ID literal survives anywhere in `src/` outside one
deliberate historical comment.

### Item 10 — anything not on the list is a regression

Whole-plan snapshot sweep: exactly two `test/__snapshots__/` files changed across the plan's
entire history (`full-tier-api-spec.json`, `full-tier-plugins-list.json`), both accounted for by
contract items 1/2/3. Path variables, `credentialsDB` method set, setup-`deps` graph, and
integrations list are all confirmed unchanged (see negative-space section). Nothing outside the
contract moved.

## The four commands

### `make build` — succeeded

Exit 0. All four artifacts produced: `dist/sdlcforge-server.js`, `dist/sdlcforge-server-exec.js`,
both `.js.map` files.

### `make test` — full, unscoped; red on exactly one inherited suite (`N7cz`)

Run with `qa/` absent (fresh worktree), `TEST`/`UPDATE_FULL_TIER_BASELINE` confirmed unset.

```
Test Suites: 1 failed, 37 passed, 38 total
Tests:       7 failed, 179 passed, 186 total
```

The only failure is `project-lifecycle.test.mjs` / `N7cz`, fully characterized above. Every
parity-bearing suite passes.

### `make lint` — the delta check

Exit 2, as expected. **234 problems (234 errors, 0 warnings).** Per-file breakdown:

| Findings | File |
|---|---|
| 160 | `test/test-server.js` |
| 33 | `test/test-integration-quick.js` |
| 24 | `test/test-basic.js` |
| 13 | `test/get-node-versions.js` |
| 3 | `plan/resources/validate-check.mjs` |
| 1 | `src/lib/test/plugin-graph-gate.test.js` |
| **234** | **total** |

Compared against the recorded baseline (`plan/notes/eslint-component-boundary-rule.md`: 233 =
230 under `test/` (four files) + 3 under `src/`):

- **`test/`: 230 → 230.** Unchanged.
- **`src/`: 3 → 1.** Two findings **removed** by phase-04 task 004's `beforeAll` global-comment
  fix in the two sibling files it touched; the third, in `plugin-graph-gate.test.js`, survives
  because task 003 did not touch that file's directive.
- **`plan/`: +3**, all in `plan/resources/validate-check.mjs`, predating this plan and an
  artifact of a plan/task worktree carrying `plan/` inside the tree ESLint walks.

**Comparable-scope total: 231, against a baseline of 233 — down 2, up 0. This phase introduced
zero new lint findings.**

### `bun run test:local` — passed

7/7 endpoint checks green (an ad-hoc `PATH` shim was needed to resolve the bare `sdlcforge-server`
binary in a fresh worktree — a harness portability gap, not a parity finding). Server stopped, no
`start-pid` survives. The `/server/next-commands` step did not trip `NEJt`.

## Negative-space confirmations

| Observable | Verdict | Evidence |
|---|---|---|
| Setup-method `{name, deps}` pairs — all 7 | unchanged | `full-tier-baseline.test.js` PASS |
| `app.ext` key set — all 20 | unchanged | same suite |
| `app.ext.credentialsDB` method set — all 10 | unchanged | same suite |
| Registered path-variable set — all 7 | unchanged, no collision | below |

All seven path variables (`credential`, `newProjectName`, `projectName`, `newOrgKey`, `orgKey`,
`workKey`, `parameterKey`) are registered; `builtin-plugins.test.js` asserts the ordered
six-registration sequence plus a no-duplicate check; `parameterKey` registers at handler-time and
is confirmed live via its interpolated matcher regex. No collision — `appInit()` completes and the
server serves all 165 routes.

## Inherited-defect confirmations

All five fenced-off defects verified still present; **none was repaired, and none moved.**

- **`uROI`** — still present. Live integrations list holds 2 entries, not 3; absorption did not
  accidentally supply a `name`.
- **`b3hk` / `mLm3`** — still present, 230/230 under `test/`, same four files.
- **`NEJt`** — not repaired; not reproduced under current dependency versions across 11 probe
  variants. Recorded as such, not as resolved.
- **`N7cz`** (added 2026-09-06) — still present, same 7 tests, same first-failure line as prior
  independent confirmations in Phases 2 and 3.

## Phase 6's document set — confirmed, not authored

`plan/phase-06-doc-updates/001-update-architecture-docs.md` and its sibling
`002-update-project-onboarding-docs.md` together cover all seven documents this phase's Outputs
section enumerates. Both deferred dispositions (`docs/dev-core-consolidation-contract.md`,
`docs/consumer-migration.md`) are explicitly assigned. One wording correction Phase 6 will need:
its own task documents' Validation sections state "`make lint` is green against the standing
233-finding baseline" — the comparable-scope figure is now 231 after this phase's task 004
cleared two findings, and `make lint` is never literally green by construction. Not edited here
(belongs to Phase 6); recorded as a followup.

## Related documents

- [`plan/resources/dev-core-absorption-parity-contract.md`](./dev-core-absorption-parity-contract.md) — the contract this document walks.
- [`plan/resources/post-merge-graph-measurement.md`](./post-merge-graph-measurement.md) — task 001's measured graph, re-confirmed here via the passing gate test.
- [`plan/resources/dev-core-absorption-pre-merge-baseline.md`](./dev-core-absorption-pre-merge-baseline.md) — Phase 1's pre-merge baseline.
- [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) — the 233-finding baseline arithmetic the lint delta is measured against.
- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md) — the pre-merge 165-route surface.
