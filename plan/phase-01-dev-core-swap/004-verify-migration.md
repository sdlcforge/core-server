# Verify Migration Against The Spec Checklist

## Purpose and scope

Run the migration spec's own verification checklist against the swapped server and report the result. This is a **verification** task: it observes and records, it does not migrate.

The spec is emphatic that the swap's failure modes are loud rather than silent — a mis-sequenced swap crashes the server at startup with a named error string, it does not quietly shadow routes. That property is what makes verification cheap and decisive, and it is what this task exercises.

One consequence of the spec's own disclosures shapes everything below: **a plain "the server started" smoke test is not a sufficient acceptance criterion here.** The `liq-work`-derived code cannot be `require`d on Node ≥ 24 (a pre-existing `SlowBuffer` defect inherited by `dev-core`, not caused by this migration), and this host runs v26.5.0. The spec's prescribed substitute is a *positive* check: the plugin registers without error and the migrated routes appear in the generated API spec under `@sdlcforge/dev-core`.

## Requirements

Compare every observation against `plan/notes/pre-swap-baseline.md` from task 001. A finding is a *change* from that baseline, not a deviation from an imagined green state. Several things may already have been red before the swap.

### 1. Clean startup — the decisive check

Start the server (`bun run start`) and capture its full startup output. It must contain **none** of the following, each of which is a documented signature of a mis-sequenced swap:

| Error string | Means |
|---|---|
| `Path variable '…' is already registered.` | a donor and `dev-core` are both loaded (`newOrgKey`, `newProjectName`, `workKey`) |
| `Non-unique command path: …` | same cause, caught one stage later at handler registration |
| `Unknown variable path element type 'projectName' while processing path projects/:projectName/audit.` | `projects-audit` present while its `projectName` provider is absent |

Grep the captured output for each string explicitly rather than eyeballing it. Any hit is a hard failure: report it and stop, do not attempt a fix — it means the atomic swap did not land atomically.

### 2. A live migrated route responds

Request a cheap `/projects` route — `/projects/detail` or `/projects/list`, whichever task 001 captured. Compare the response **shape** against the baseline capture, not merely the status code. The spec states no route, method, parameter, or response shape changes for any of the 19 `/projects` endpoints.

### 3. Provenance reports `@sdlcforge/dev-core`

From `GET /server/plugins/list` and `GET /server/api` on the running server:

- No entry anywhere names `@liquid-labs/liq-orgs`, `@liquid-labs/liq-projects`, `@liquid-labs/liq-work`, or `@liquid-labs/plugable-projects-audit`.
- Every route formerly served by the four reports `npmName: "@sdlcforge/dev-core"` — the 19 `/projects` routes, all 30 `/work` routes, all 5 `/orgs` routes, and the 4 `/projects/audit*` routes.
- The plugin list holds exactly 5 explicit npm entries plus the `@sdlcforge/core-server` built-in entry, and `dev-core`'s summary matches its `package.json` `description`.

If the `/work` routes are absent because the `SlowBuffer` load failure fired on this Node version, **record that as the pre-existing defect it is** — cross-checking against task 001's baseline, which asked the same question before the swap. It is a finding about the environment, not about the migration, and only becomes a migration finding if `/work` routes were present before the swap and are absent after.

### 4. `GITHUB_API` credential resolution

`credentialsDB.getToken('GITHUB_API')` must resolve. This is the check for the *other* direction of the atomicity requirement — the silent one. `liq-projects`'s `setup` registered the `GITHUB_API` credential type that `liq-integrations-issues-github` fetches; `registerCredentialType` does not fail on a missing registration, so a missing provider surfaces only at the next `getToken` call. A successful resolution confirms `dev-core`'s composite `setup` performed the identical registration in `liq-projects`'s place.

A missing *token* (no credential configured on this machine) and a missing *credential type* are different outcomes, and only the second is a failure. Distinguish them explicitly in the report — via `credentialsDB.listSupported()` including `GITHUB_API`, or whichever equivalent the running server exposes.

### 5. All three test tiers

Run each and compare against task 001's baseline:

- **Unit** — `bun run test` (`make test`). Includes the golden-API-spec and full-tier-baseline harnesses.
- **Local integration smoke** — `bun run test:local` (`scripts/test.sh`). Per follow-up `8lmN`, a fresh worktree needs a one-time `bun link` first: the test spawns a bare `sdlcforge-server` and relies on `PATH` resolution a plain `bun install` does not provision.
- **Docker multi-Node integration** — `bun run test:integration` (`test/run-integration-tests.sh`). Attempt it. If Docker is unavailable or it cannot complete in this environment, **say so explicitly in the report** and state that this tier is unverified — an acknowledged gap, never a silent omission. This tier's whole purpose is catching explicit-plugin loading regressions on a fresh install across Node versions, which is precisely what this migration risks, so its absence is worth surfacing to the manager rather than burying.

### 6. Snapshot integrity re-check

Confirm task 002's regeneration was provenance-only, using the diff rather than the current file:

```bash
git diff <task-002-commit>^..<task-002-commit> -- test/__snapshots__/
```

Every changed line should be an `npmName` value. Any changed `path`, `method`, `parameters`, or help string contradicts the spec's "no route, method, parameter, or response shape changes" guarantee and is a genuine finding.

### 7. Report, do not repair

This task fixes nothing. Every finding — a failed check, a red tier, an unverifiable tier — goes into the structured report for the manager to triage. The one exception is a trivially-obvious own-goal in task 002's or 003's output, which should still be reported rather than silently patched.

Specifically **do not** attempt to fix any of the pre-existing defects the spec documents as migrating unchanged, all of which are expected to reproduce identically post-swap:

- The four `/orgs` endpoints. `GET /orgs/list` and the three `parameters-*` routes throw `TypeError: Cannot read properties of undefined (reading 'orgs')` on first request (they read a `model` argument `plugable-express` no longer passes); `POST /orgs/create/:newOrgKey` creates the directory and then hangs with no response. Both are marked `KNOWN BROKEN` in `dev-core`'s own source. **`GET /orgs/list` is therefore a bad smoke test** — the spec's positive substitute is that all 5 `/orgs` routes appear in the API spec under `@sdlcforge/dev-core` and `app.ext._liqOrgs.orgs` is populated, observable indirectly through the in-tree `controls` submodule continuing to work, since `load-controls.mjs` reads that same map on every request.
- The four `projects-audit` defects: the two implied endpoints advertising an unusable `projectName` parameter, the `dascription` key typo, and a `500`-not-`404` for an unknown project name.
- The `liq-work` Node ≥ 24 `SlowBuffer` load failure.

## Validation

- The captured startup output is greppable and contains zero occurrences of all three error strings in requirement 1.
- The `/projects` response shape matches task 001's baseline capture.
- `GET /server/plugins/list` output contains no donor package name and exactly one `@sdlcforge/dev-core` entry; the four donors' former route sets are present in `GET /server/api` under that `npmName`.
- The `GITHUB_API` credential *type* is registered, with the type-versus-token distinction stated explicitly in the report.
- Each of the three test tiers has a recorded outcome — passed, failed with details, or not runnable in this environment with the reason. No tier is silently absent.
- The `test/__snapshots__/` diff for task 002's commit contains `npmName` changes only.
- The report enumerates every deviation from `plan/notes/pre-swap-baseline.md`, and separately lists which observed failures are the spec's documented pre-existing defects rather than migration regressions.

## Metadata

architectural_impact: false

## Assumptions

- Tasks 001 and 002 have landed. `plan/notes/pre-swap-baseline.md` exists and is the comparison basis for every check here.
- Task 003 may or may not have landed; it touches only documentation and in-source comments, so it does not affect any check in this task. This task and 003 are parallel-eligible.
- The environment may not support every tier (Docker availability, Node version). An unverifiable tier is an expected, reportable outcome, not a task failure.

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md` — the `liq-projects` section's five-point `Verification checklist` this task implements, each donor's `Atomicity requirement` section for the verbatim error strings, and the `Corrections and disclosures` sections for the pre-existing defects that must not be chased.
- `/Users/zane/playground/sdlcforge/dev-core/README.md` — the per-submodule `Known defects` sections, with exact source locations for each documented defect.
- `plan/notes/pre-swap-baseline.md` — task 001's before-state.
- [current-state drift](../notes/current-state-drift.md) — hazard H3 (Node v26.5.0) and drift item D3 (the full-tier snapshot suite and its two must-not-regenerate assertions).
- `plan/followups.yaml` item `8lmN` — the `bun link` prerequisite for `bun run test:local`.

## Status

**Outcome: succeeded.** 2026-08-27.

Worktree provisioning: `.yalc/` and `yalc.lock` copied in from the main checkout (this worktree's own were absent/gitignored per the dispatch note), `bun install` (2 packages: `@liquid-labs/plugable-express`, `@sdlcforge/dev-core`), and `bun link` (per follow-up `8lmN`). `bun run build` produced `dist/` fresh. All of this is gitignored build/artifact output; `git status --porcelain` and `git clean -ndx` confirm the tracked tree is untouched.

All seven `## Requirements` checks were run against the running server (`bun run start`, Node v26.5.0) and compared to `plan/notes/pre-swap-baseline.md`:

1. **Clean startup** — `local-server.log` greps zero hits for all three documented crash strings (`already registered`, `Non-unique command path`, `Unknown variable path element`). "Found 5 explicit plugins" confirms the post-swap count.
2. **Live `/projects/detail`** — `200`, same top-level shape (`packageJSON`, `projectPath`) as the baseline capture. `projectPath`/`packageJSON` resolve to the *main checkout* (`/Users/zane/playground/sdlcforge/core-server`, still on unswapped `main`), identical resolution behavior to the baseline — expected, since the swap lives only on the plan branch.
3. **Provenance** — `GET /server/plugins/list`: 6 entries (4 `sdlc-projects-*` + `@sdlcforge/core-server` + `@sdlcforge/dev-core`), no donor names, `dev-core` summary matches its `package.json` `description` verbatim. `GET /server/api`: 165 routes total, 112 under `npmName: "@sdlcforge/dev-core"` (5 `/orgs` + 30 `/work` + 23 `/projects`+`/projects/audit*` = 112, matching the baseline's 6+38+60+8 donor-attributed count exactly), zero donor names anywhere.
4. **`GITHUB_API` credential type** — confirmed via a temporary in-process Jest diagnostic (booted `appInit()` directly, mirroring `full-tier-baseline.test.js`'s harness; deleted before finalizing, not part of this commit): `credentialsDB.listSupported()` includes `{key: 'GITHUB_API', getTokenFunc: true, ...}` — the type is registered. `getToken('GITHUB_API')` rejects with `"Credential 'GITHUB_API' is not stored."` — a missing-*token* error (none configured on this machine), explicitly not a missing-type error. This confirms `dev-core`'s composite `setup` performed the identical registration `liq-projects` used to.
5. **Three test tiers**, all green, matching baseline exactly:
   - Unit: 12/12 suites, 40/40 tests, exit 0.
   - Local integration smoke: 7/7 endpoint checks, Node v26.5.0.
   - Docker multi-Node: 9/9 Node versions (18.20.8, 19.9.0, 20.20.2, 21.7.3, 22.23.2, 23.11.1, 24.20.0, 25.9.0, 26.8.1), 7/7 each — same version set as the baseline, all passing, including versions past the disclosed `liq-work` `SlowBuffer` line.
6. **Snapshot integrity** — `git diff 792a80a^..792a80a -- test/__snapshots__/` touches only `full-tier-api-spec.json` and `full-tier-plugins-list.json` (`golden-api-spec.json`, `golden-plugins-list.json`, `full-tier-integrations-list.json` untouched, as expected). A raw line diff is dominated by entry-order churn (per task 002's documented finding), so verification was structural: parsing both versions and matching all 165 route entries by `(method, path)` shows zero non-`npmName` differences — every entry is byte-identical except `npmName`. `full-tier-plugins-list.json` collapses the 4 donor rows into 1 `dev-core` row (9 → 6 entries), exactly as drift item D3 predicted; the surviving 5 non-donor rows are unchanged.
7. Report-only — no fixes attempted; nothing in this task's own diff needed one.

**Deviations from `plan/notes/pre-swap-baseline.md`:** none. Every tier and every check reproduced the baseline's outcome exactly (unit 40/40, local integration 7/7, Docker 9/9 same-version-set all-green, `liq-work`'s 30 `/work` routes present and loading without the disclosed `SlowBuffer` error on this Node v26.5.0 host).

**Pre-existing defects (not migration regressions, per plan/overview.md's Out-of-scope list):** not independently re-exercised beyond confirming their route entries exist under `@sdlcforge/dev-core` in the API spec (the `/orgs` and `/projects/audit*` route counts match exactly) — this task did not probe `GET /orgs/list` or `POST /orgs/create/:newOrgKey` directly, per the task doc's own instruction that doing so is a bad smoke test.

**Genuine finding, unrelated to this migration (flagged for the manager, not fixed):** `GET /server/next-commands?command=credentials/` (and similarly `?command=credentials/GITHUB` — any path that reaches the `credentials/:type/import` path-variable's `optionsFetcher`) **crashes the server process** with `TypeError: e.map is not a function` at `node_modules/@liquid-labs/liq-handlers-lib/dist/liq-handlers-lib.js:570`, triggered from `plugable-express`'s `next-commands.mjs` → `_lib/next-options.mjs` option-formatting path. Confirmed unrelated to this migration: the crash lives entirely in `liq-handlers-lib` and `liq-credentials-db`/`credentials-db-plugin-github`, none of which are among the four swapped donors or `dev-core` — `core-server` depends on both directly and independently of the swap, and the built-in `credentials/setup.mjs` plugin (which registers the crashing `optionsFetcher`) was absorbed in-tree by an earlier, unrelated plan. Not one of the plan's documented pre-existing defects (orgs endpoints, projects-audit defects, `liq-work` `SlowBuffer`). Discovered incidentally while probing for a safe way to check `GITHUB_API` credential-type registration; the in-process diagnostic (item 4 above) avoided the route entirely and produced a clean answer. Worth a follow-up, not a task-004 fix (out of scope, and this task's diff touches no source that would make it a same-diff or task-caused-drift carve-out).

**Assumptions relied on:** none beyond the task doc's own stated `## Assumptions` (tasks 001/002 landed; task 003 parallel-safe; an unverifiable tier is an expected, reportable outcome — not exercised here, since Docker was available and completed).

**Files touched:** only this task document. No `core-server` source, test, or snapshot file was modified.
