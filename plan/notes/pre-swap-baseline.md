# Pre-Swap Baseline

## Purpose and scope

Captures what "working" looks like in this worktree *before* `@sdlcforge/dev-core` replaces the four donor packages (`@liquid-labs/liq-orgs`, `@liquid-labs/liq-projects`, `@liquid-labs/liq-work`, `@liquid-labs/plugable-projects-audit`). Written by phase-01 task 001, per its `## Requirements` item 4. Nothing under `src/`, `test/`, `package.json`, or `bun.lock` was touched to produce this record — the worktree's tracked tree is unmodified (`git status --porcelain` shows no changes) after `.yalc/` and `node_modules/` (both gitignored) were provisioned and `bun run start` / `bun run stop` were exercised.

## Provisioning performed

- `yalc publish --no-scripts` run from `/Users/zane/playground/sdlcforge/dev-core`. Store entry confirmed at `~/.yalc/packages/@sdlcforge/dev-core` (version `1.0.0-alpha.0`). `git -C /Users/zane/playground/sdlcforge/dev-core status --porcelain` after publish showed only the pre-existing untracked `.flow/` directory — no tracked file was dirtied.
- `yalc link @sdlcforge/dev-core` run from this worktree — populates `.yalc/@sdlcforge/dev-core/` and a `node_modules/@sdlcforge/dev-core` symlink without writing `package.json`. `.yalc/@sdlcforge/dev-core/package.json` names `@sdlcforge/dev-core`; its `main` (`dist/dev-core.js`) is present on disk.
- `scripts/provision-local-deps.sh` was run and exited 1 as expected (drift item D2: its `REQUIRED_YALC_PACKAGES` array is stale in both directions — see below). Since the only failure was that stale check, `.yalc/@liquid-labs/*` was copied from the main checkout (`/Users/zane/playground/sdlcforge/core-server/.yalc`) into this worktree's `.yalc/`, followed by a direct `bun install` (not `provision-local-deps.sh`, which was left untouched — task 002 owns that file). `bun install` completed cleanly: `+ @liquid-labs/liq-projects@.yalc/@liquid-labs/liq-projects`, `+ @liquid-labs/plugable-express@.yalc/@liquid-labs/plugable-express`, `3 packages installed`.
- `bun link` run once from this worktree (registers `@sdlcforge/core-server` for `PATH` resolution), per follow-up `8lmN` — required before `bun run test:local` will run in a fresh worktree.
- `package.json` was never modified by any of the above; `git status --porcelain` in this worktree shows changes only under `plan/` (this file) throughout.

## Test tiers

### Unit tests — `bun run test` (`make test`, Jest)

Command: `bun run test`
Exit status: `0`

```
Test Suites: 12 passed, 12 total
Tests:       40 passed, 40 total
Snapshots:   0 total
Time:        2.302 s
Ran all test suites.
```

All 12 suites passed, including `lib/test/full-tier-baseline.test.js` (the harness that loads the full, real explicit-plugin tier) and `lib/test/golden-api-spec.test.js`. No failures.

### Local integration smoke — `bun run test:local` (`scripts/test.sh`)

Command: `bun run test:local`
Exit status: `0`

Build step succeeded (`dist/sdlcforge-server-exec.js`, `dist/sdlcforge-server.js` via rollup). Server started on Node v26.5.0, registered handlers for all 8 explicit plugins (`liq-orgs@1.0.0-alpha.8`, `liq-projects@1.0.0-alpha.15`, `liq-work@1.0.0-alpha.11`, plus the others), and ran all setup steps without error.

```
Test Results for Node v26.5.0
==================================================
Passed: 7
Failed: 0
```

All 7 endpoint checks passed (heartbeat, version, API docs, plugin list, next-commands, invalid-endpoint-404, JSON body). Results written to `test-staging/integration-results/test-results-node-v26_5_0.json`.

### Docker multi-Node suite — `bun run test:integration` (`test/run-integration-tests.sh`)

Docker was available (`Docker Desktop 4.82.0`, engine `29.6.1`) and the suite ran to completion — **not** "not runnable here."

Command: `bun run test:integration`
Exit status: `0`

The script auto-installed and tested against every Node version from 18 through the latest available (9 versions total, exceeding the "18-24" range `CLAUDE.md` currently documents — `nvm` picked up newer releases than that range names):

```
FINAL TEST SUMMARY
==================================================
Node versions tested: 18.20.8 19.9.0 20.20.2 21.7.3 22.23.2 23.11.1 24.20.0 25.9.0 26.8.1
Passed: 9
Failed: 0
```

Every version passed all 7 endpoint checks, with all 8 explicit plugins (including `liq-work`) registering and running setup successfully on each version tested — including versions well past Node 24.

## Node version and the `liq-work` / `SlowBuffer` disclosure

Host Node version: `v26.5.0` (`node --version`), per the task doc's H3 concern this is well past the "Node ≥ 24" line the migration spec discloses for `@liquid-labs/liq-work`'s bundle (`buffer-equal-constant-time` dereferencing the removed `SlowBuffer`).

**Finding: `liq-work` loads without error on this host today**, both in the local `bun run test:local` run (Node v26.5.0) and in every one of the 9 Docker-tested versions above, including v24.20.0, v25.9.0, and v26.8.1 — all past the disclosed line. `lib/test/full-tier-baseline.test.js` (which loads the real, full explicit-plugin tier) also passed in the unit-test tier. No `SlowBuffer` or `require`-related error was observed anywhere in this baseline run. This is a live, positive finding, not an assumption: whatever combination of `liq-work`'s installed version (`1.0.0-alpha.11`) and its dependency resolution is in effect here does not trip the disclosed defect. Task 004 should treat a post-swap regression in this area as a genuine finding rather than an expected, already-known failure.

## The yalc `file:` set

Verbatim `grep -n 'file:\.yalc' bun.lock` output (direct-dependency lines only shown first; full match set below):

```
16:        "@liquid-labs/liq-projects": "file:.yalc/@liquid-labs/liq-projects",
21:        "@liquid-labs/plugable-express": "file:.yalc/@liquid-labs/plugable-express",
355:    "@liquid-labs/liq-orgs": ["@liquid-labs/liq-orgs@1.0.0-alpha.8", "", { "dependencies": { ... "@liquid-labs/playground-monitor": "file:.yalc/@liquid-labs/playground-monitor", ... } }, ...],
359:    "@liquid-labs/liq-projects": ["@liquid-labs/liq-projects@file:.yalc/@liquid-labs/liq-projects", { ... }],
375:    "@liquid-labs/plugable-express": ["@liquid-labs/plugable-express@file:.yalc/@liquid-labs/plugable-express", { ... }],
1779:    "@liquid-labs/liq-orgs/@liquid-labs/playground-monitor": ["@liquid-labs/playground-monitor@file:.yalc/@liquid-labs/playground-monitor", {}],
```

Three packages resolve via `file:.yalc/...` today, matching drift item D2's finding exactly:

| Package | Direct/transitive | Source |
|---|---|---|
| `@liquid-labs/plugable-express` | direct | `package.json` |
| `@liquid-labs/liq-projects` | direct | `package.json` |
| `@liquid-labs/playground-monitor` | transitive | pulled in by `@liquid-labs/liq-orgs@1.0.0-alpha.8` |

`@liquid-labs/http-smart-response` does **not** appear as a `file:` resolution anywhere in `bun.lock`.

Current `REQUIRED_YALC_PACKAGES` array in `scripts/provision-local-deps.sh` (lines 32-35), for task 002's diff against the regenerated lock:

```bash
REQUIRED_YALC_PACKAGES=(
    "@liquid-labs/plugable-express"
    "@liquid-labs/liq-projects"
    "@liquid-labs/http-smart-response"
)
```

This confirms the array is stale in both directions today, exactly as drift item D2 states: it lists `@liquid-labs/http-smart-response` (no longer `file:`-resolved) and omits `@liquid-labs/playground-monitor` (currently `file:`-resolved, transitively).

## Donor provenance counts in the snapshots

```
$ grep -o '"npmName": "[^"]*"' test/__snapshots__/full-tier-api-spec.json | sort | uniq -c
   6 "npmName": "@liquid-labs/liq-orgs"
  38 "npmName": "@liquid-labs/liq-projects"
  60 "npmName": "@liquid-labs/liq-work"
  35 "npmName": "@liquid-labs/plugable-express"
   8 "npmName": "@liquid-labs/plugable-projects-audit"
   2 "npmName": "@liquid-labs/sdlc-projects-badges-coverage"
   2 "npmName": "@liquid-labs/sdlc-projects-badges-github-workflows"
   6 "npmName": "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd"
   2 "npmName": "@liquid-labs/sdlc-projects-workflow-local-node-build"
   6 "npmName": "@sdlcforge/core-server"
```

112 total donor-attributed entries (`liq-orgs` 6 + `liq-projects` 38 + `liq-work` 60 + `plugable-projects-audit` 8) — matches drift item D3's count exactly.

```
$ grep -o '"npmName": "[^"]*"' test/__snapshots__/golden-api-spec.json | sort | uniq -c
  35 "npmName": "@liquid-labs/plugable-express"
```

All 35 entries are `@liquid-labs/plugable-express`; no donor names appear (`golden-api-spec.test.js` passes `skipCorePlugins: true`), confirming this file is unlikely to move.

`test/__snapshots__/full-tier-plugins-list.json` entry count: **9** (one entry per plugin: 4 donors + `sdlc-projects-badges-coverage`, `sdlc-projects-badges-github-workflows`, `sdlc-projects-workflow-github-node-jest-cicd`, `sdlc-projects-workflow-local-node-build`, `@sdlcforge/core-server`). Matches drift item D3's expectation of "4 separate donor entries of 9."

## Live `/projects` response

`bun run test:local`'s own build was reused; the server was started fresh via `bun run start` (Node v26.5.0, port `32600`, per `Server listening on 32600` in `local-server.log`).

`/projects/detail` requires an `X-CWD` header (confirmed via a first request without one, which returned `400 BadRequestError: Called 'project detail' with implied work, but 'X-CWD' header not found.`); `/projects/list` does not exist as a route (`404 Cannot GET /projects/list` — the task doc's other suggested route). With `X-CWD` set to this worktree's own path, `/projects/detail` returned `200`:

```
GET /projects/detail
X-CWD: /Users/zane/playground/sdlcforge/core-server/worktrees/plan/dev-core-migration-01-001
```

Response (`HTTP_STATUS:200`), a JSON object with top-level keys `packageJSON` (the full `package.json` of the *main checkout* `/Users/zane/playground/sdlcforge/core-server`, resolved from the walked-up project root rather than this worktree) and `projectPath` (`/Users/zane/playground/sdlcforge/core-server`). The `packageJSON.dependencies` block is the pre-swap dependency set — the four donors present as spec'd (`liq-orgs`, `liq-projects` as `file:.yalc/...`, `liq-work`, `plugable-projects-audit`), no `@sdlcforge/dev-core` entry. Task 004 can diff its post-swap `/projects/detail` response against this shape (same top-level keys, same `projectPath` resolution behavior, `dependencies` block minus the four donors plus `@sdlcforge/dev-core`) rather than asserting only `200`.

Server was stopped afterward (`bun run stop`, exit 0).

## Summary for task 002 / task 004

- Regenerate `bun.lock`'s `file:.yalc/...` set from scratch after the swap rather than assuming the pre-swap three-package set minus donors — `liq-orgs`'s removal is expected to drop the transitive `playground-monitor` pin (dev-core declares it as a registry range), and `liq-projects`'s removal drops its own direct pin, leaving `@liquid-labs/plugable-express` and `@sdlcforge/dev-core` as the expected post-swap `file:` set — but confirm against the regenerated lock, not this assumption.
- `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` array (lines 32-35), header comment (lines 7-8), and missing-package error text (lines 78-82) all need correcting against the regenerated lock — task 002's to fix, not touched here.
- All three test tiers are green pre-swap: unit (40/40), local integration (7/7), Docker multi-Node (9 versions × 7/7 = 63/63). Any tier going red post-swap is a genuine regression to investigate, not pre-existing noise.
- `liq-work` loads without error on this host across every Node version tested (18 through 26), despite running well past the disclosed `SlowBuffer` line — a positive finding worth preserving as a comparison point for task 004.
