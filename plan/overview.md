# Plan Overview — dev-core-consolidation (liq-work slice)

## Purpose and scope

This plan is `liq-work`'s own contribution to the federated `dev-core-consolidation` plan-group — Wave 2 ("Plugin Consolidation — Framework and Dev-Core") of the **SDLCForge Platform Modernization** wave plan, whose lead project is `core-server` and whose wave-plan slug is `sdlcforge-modernization`. The plan-group merges four functional repositories — `liq-projects`, `liq-work`, `liq-orgs`, and `plugable-projects-audit` — into a single new `@sdlcforge/dev-core` package, and retires `liq-projects-lib` once its one surviving real usage is absorbed elsewhere. All five participants share the plan slug `dev-core-consolidation`.

`liq-projects` is the lead slice and planned first, establishing decisions **D1–D11** in its `plan/notes/dev-core-target-shape.md`. `liq-orgs` planned second (phases 5–6) and contributed corrections **C1–C3**. **This plan follows that foundation rather than re-deciding any of it**, and consumes phases **7, 8, and 9**.

`liq-work` is the **largest** of the four donors — 69 tracked source files (65 of them under `src/handlers/work/`), 30 handlers, 14 declared dependencies — and the only one with real entanglement outside itself. Its README's framing is confirmed by source: it owns the "unit of work" (a `workKey`-identified, git-branch-scoped bundle of GitHub issues and projects persisted to one `work-db.yaml`) and *orchestrates* projects rather than defining them. It reaches `liq-projects` through `app.ext._liqProjects.playgroundMonitor` in **20 places, unconditionally and unguarded** — but never by import, so D2 rule 4 holds and this absorption stays order-independent of the other three.

Full ground truth, including everything summarised below and the commands to re-verify it, is in [liq-work source inventory](./notes/liq-work-source-inventory.md).

### What must change

- **`crossLinkDevProjects` moves out of `@liquid-labs/liq-projects-lib` and into `liq-work`'s own `_lib/`**, and `liq-work` drops the `liq-projects-lib` dependency. This is the plan-group's designated home for the one piece of `liq-projects-lib` that dev-core actually needs, and it happens **in `liq-work`, before the migration**, so `liq-projects-lib`'s own retirement slice is unblocked independently of dev-core's schedule.
- **liq-work's git-tracked test fixture is made reproducible.** One fixture path is a stray gitlink whose content is not in git at all; the suite that depends on it cannot pass in a fresh clone of liq-work today and would certainly not pass in dev-core. Fixed before the move.
- `liq-work`'s `src/` tree relocates in place to its final dev-core-relative path (`src/work/…`), staying green and publishable throughout.
- That tree is absorbed into `@sdlcforge/dev-core` by an unrelated-histories merge with history preserved, its dependencies unioned in — **including the one range in the whole plan-group where D4's "take the higher range" rule actually fires** — and the `work` submodule wired third in the composite `setup` order.
- dev-core's consumer-migration handoff gains the `liq-work`-specific edits `core-server` must make, and dev-core's documentation gains the 30-route `/work` surface and the `WORK_DB_PATH`/`workKey` contracts, ported from liq-work's own (accurate, and best-in-class among the donors) README.
- `liq-work` ends as a final, clearly-labelled superseded release: README rewritten as a superseded notice, deprecation-bearing description, version `1.0.0-alpha.11`, publish/deprecate attempted and handed to the user if blocked.

### What must not change

- **The HTTP surface.** All 30 handlers keep their exact `path` arrays and methods — including the explicit/implied pairing for ten operations and both nested `issues`/`projects` sub-collections. `start` and `resume` stay explicit-only.
- **The `app.ext` contracts.** `app.ext.constants.WORK_DB_PATH` keeps its exact name and its `<serverConfigRoot>/work/work-db.yaml` value; the `workKey` path var keeps its name, `validationRe`, and lazy `optionsFetcher`; and the 20 `app.ext._liqProjects.playgroundMonitor` reads stay exactly as they are (D7).
- **Behavior.** No refactoring, no dependency upgrades beyond the forced union, no `shelljs`/`tryExec` replacement, no fix for the two competing playground-resolution paths, no fix for the undeclared `http-errors`, no removal of the two unused declared dependencies. Those are Wave 3/4 concerns or explicit decision points, not consolidation work.
- **`crossLinkDevProjects`'s behavior.** The inlining is a verbatim move plus its existing test — not a rewrite, not a cleanup, not a signature change.

### The most consequential finding: the plan-group's stated test baselines are not achievable in this environment

Measured, not read from committed reports: on Node **v26.5.0**, `liq-work`'s `make test` is **1 failed / 1 passed suite, 6 tests passing**, and `liq-projects`'s is **5 failed / 3 passed suites, 14 tests passing**. Every failure is the same error — `TypeError: Cannot read properties of undefined (reading 'prototype')` from `buffer-equal-constant-time`, which dereferences `SlowBuffer.prototype`; `SlowBuffer` was removed from `node:buffer` in Node 24. It arrives through `github-toolkit → octocache → octokit → @octokit/auth-app → jsonwebtoken → jws → jwa`.

Two consequences this plan cannot design around:

1. **`dist/liq-work.js` cannot be `require`d on this Node at all** — so `@liquid-labs/liq-work` is currently unloadable as a server plugin, and the "load the bundle and diff the route list" parity check the sibling slices prescribe needs a `SlowBuffer` preload shim. This plan supplies the exact shim and requires it as a measurement aid only, never committed.
2. **dev-core inherits the failures from `liq-projects` in phase 2, before liq-work touches it.** So every gate in this plan is written against *measured* numbers and a "no **new** failures beyond the known `SlowBuffer` set" rule, not against "green".

`buffer-equal-constant-time` has no fixed release. The remedies — an npm `overrides` pin, an upgrade past `octocache`'s `octokit ^2.0.14` ceiling, or a Jest `setupFiles` polyfill — are all out of scope under D11 and all belong to the whole plan-group rather than to one donor. **See "Open items for the manager" below.**

### Where this slice's source reading corrects or extends the shared foundation

Numbering continues from the liq-orgs slice's C1–C3. Full detail in the source inventory's W8.

- **C1 (restated, not new).** D10's "Express would silently shadow" is wrong; `plugable-express` **throws** — `Path variable 'workKey' is already registered.` from `path-var-registry.mjs:28-34` (which fires first, because `setup` runs eagerly), or `Non-unique command path: work/…` from `register-handlers.js:129-131`. The conclusion (no shim, atomic swap) is unchanged and strengthened. This plan states it correctly wherever it reasons about registration collisions.
- **C4 — the D3 drop list must include the donor's `plan/` directory.** A rehearsed merge shows liq-work's `plan/manifest.yaml` and two `plan-summary-*.md` files arriving **cleanly** — no conflict, so nothing prompts you to look at them. liq-orgs's absorb task caught this; **`liq-projects`'s phase 2 task 002, which runs first, does not**, and liq-projects has the same files.
- **C5 — the recorded validation baselines are stale.** Covered above; the lead slice's "8 suites / 29 tests passing" reads a committed `qa/` report from an older Node.
- **C6 — D4's "the move is a pure `git mv`" does not survive a gitlink.** liq-work's `src/` contains one mode-`160000` entry with no `.gitmodules`, and git refuses to track files beneath it while its nested `.git/` exists. A donor should be checked with `git ls-files -s src | grep '^160000'` *before* its restructure task is written; `plugable-projects-audit`, planned next, should run that check.

### Success criteria

1. `crossLinkDevProjects` lives in `liq-work`'s own source with its test, `@liquid-labs/liq-projects-lib` is gone from `package.json` and from every import, and `liq-projects-lib`'s retirement slice is unblocked.
2. `determine-projects.test.js` passes from a **fresh clone** of liq-work — and, after absorption, from a fresh clone of dev-core — with no manual fixture setup.
3. dev-core carries liq-work's complete tree under `src/work/`, with all **30** routes present with byte-identical `path` arrays and methods, and no route or path-var registered twice across the merged plugin.
4. `git log --follow` on a relocated file inside dev-core reaches its pre-merge liq-work history.
5. dev-core's `package.json` carries liq-work's runtime ranges with the `github-toolkit` union resolved to `^1.0.0-alpha.25` and the lockfile verified, and carries **no** `@liquid-labs/liq-projects-lib`.
6. dev-core's composite `setup` runs the `work` submodule third, sets `app.ext.constants.WORK_DB_PATH` to the unchanged path, and registers `workKey` with its unchanged `validationRe`.
7. dev-core documents the 30-route `/work` surface, the `WorkDB` record shape, and the `app.ext` contracts liq-work both reads and writes.
8. dev-core's consumer-migration handoff names every exact edit `core-server` must make for liq-work, including the atomicity requirement and the exact error string a non-atomic swap produces.
9. `liq-work` is labelled superseded and deprecated, with archival left as an explicit user decision.

## Current status

Plan created; no phase has started. Starting phase: **phase 7 — liq-work Pre-Migration Remediation**.

Pre-conditions verified at plan-authoring time by running the toolchain, not by reading reports (`/qa` is gitignored here, so the `qa/unit-test.txt` on disk is a stale leftover, not a committed baseline):

- `liq-work` at `main` = `cc3e67f`: `make build` **passes** (`dist/liq-work.js`, 81 KB, from `src/index.js`); `make lint` **passes** clean; `make test` **fails** at 1 failed / 1 passed suite, 6 tests passing — the Node-26 `SlowBuffer` defect described above, pre-existing and not this slice's to fix.
- Working tree is clean apart from untracked `.flow/`, `worktrees/`, `.yalc/`, build outputs, and a stray `jsdoc-config.json~`. **Unlike the liq-orgs slice, there is no dirty-working-tree decision to make first.**
- `sdlcforge/dev-core` still has exactly **one commit** (`07d7f0e`) and **one tracked file** (`package.json` at `@sdlcforge/dev-core@1.0.0-alpha.0`). **`liq-projects` phase 1 has not landed yet**, nor has `liq-orgs` phase 5. Nothing in this plan creates a repository.
- liq-work's toolchain is the older monolithic-`Makefile` generation (`@liquid-labs/catalyst-scripts-node-project ^1.0.0-alpha.22`, its sole devDependency). It has **no `make/*.mk`, no `.sdlc-data.yaml`, no `.catalyst-data.yaml`, no `docs/`** — which under D3/D8 means liq-work's absorb has a *smaller* conflict set than either sibling's, not a migration problem.
- `@sdlcforge/core-server` is the **only** npm dependent of `@liquid-labs/liq-work` (D10's claim holds here, unlike liq-orgs's C2), via a registry range `^1.0.0-alpha.9` — not a `file:.yalc/` link — plus one `explicitPlugins` entry and five documentation mentions. **No core-server test fixture names liq-work.**
- **No other donor and no sibling participant imports `liq-work`** — verified across `liq-projects`, `liq-orgs`, `plugable-projects-audit`, `liq-projects-lib`, `liq-integrations-issues-github`, `liq-controls`, and `liq-handlers-lib`, in both `package.json` and `src/`.
- The special scope item is **confirmed in full**: `crossLinkDevProjects` exists, liq-work imports it at exactly one place (`src/handlers/work/_lib/work-db.mjs:13`) and calls it at exactly one place (line 90), that is liq-work's **only** use of `liq-projects-lib`, and liq-work is its **only** consumer playground-wide. Inlining it adds **no** dependency (it needs only `node:path`, `federated-json`, and `shell-toolkit`, all already declared) and removes one.
- A `git merge --allow-unrelated-histories` of `liq-work/main` into a throwaway clone of `sdlcforge/dev-core` was **rehearsed**; its conflict set, its clean arrivals (including the `plan/` directory of C4), and the gitlink's behavior were observed rather than predicted.
- This plan consumes **phases 7–9**; the next participant planned in this plan-group starts at **phase 10**.

**Hard cross-plan dependency:** `liq-projects` **phase 1** (`dev-core-package-foundation`, both tasks) must land before this plan's phase 8 task 002 can start. That phase scaffolds the dev-core package itself. **This plan does not re-scaffold any of it.** All of phase 7 and phase 8 task 001 execute wholly inside `liq-work` and have no such dependency — **they are unblocked today.**

Cross-repository execution: phase 8 tasks 002 and 003 execute in the `sdlcforge/dev-core` checkout; all of phases 7 and 9, plus phase 8 task 001, execute in `liq-work`. Each task document names its executing repository in its `## Purpose and scope`. This mirrors the precedent of core-server's completed `bun-conversion` task `003`, whose commit landed in the `comply-defaults` repository.

### Open items for the manager (do not block execution)

1. **The Node-26 `SlowBuffer` breakage needs a plan-group-level decision.** It is not liq-work's defect, it already affects `liq-projects` (5 of 8 suites) and will be inbound to dev-core from phase 2, and it makes the *built plugin bundle* unloadable — so it is not merely a test-harness annoyance. This plan works around it (measured baselines, a preload shim for parity checks) but does not fix it, because a fix means either an npm `overrides` pin, an upgrade past `@liquid-labs/octocache`'s `octokit ^2.0.14` ceiling, or a Jest `setupFiles` polyfill — all dependency changes D11 forbids, and all of which should be decided once for dev-core rather than four times.
2. **C4 should reach `liq-projects` phase 2 task 002 before it runs.** Its drop list omits the donor `plan/` directory, which arrives *cleanly* (no conflict to alert the agent). liq-projects carries `plan/manifest.yaml` and `plan/plan-summary-modernization-foundation.md`. One sentence added to that task prevents Flow plan artifacts landing in dev-core.
3. **C1 belongs in `docs/dev-core-consolidation-contract.md`.** The liq-orgs slice already raised this; repeating it because that contract is authored by `liq-projects` phase 1 task 001, which still has not run. This plan carries a defensive correction in phase 8 task 002 in case it does not.
4. **`http-errors` is undeclared in liq-work but used in 16 modules.** Harmless in dev-core (liq-projects declares it) but a real latent defect in the package about to get a final release. Task 9-003 treats declaring it as an explicit decision rather than a silent fix.

## Overview

Three phases, strictly sequential at the phase level. Within phases, parallel-eligible task groups are called out.

### Phase 7 — liq-work Pre-Migration Remediation (executes in `liq-work`)

Two prerequisites that must land before any relocation, both of which leave `liq-work` strictly better as a standalone package. Neither depends on anything in any other slice, so **this phase is unblocked today.**

1. **[001 — Make Test Fixture Reproducible From Git](./phase-07-liq-work-pre-migration-remediation/001-make-test-fixture-reproducible.md)** (tier `sonnet-high`) — replaces the stray mode-`160000` gitlink at `src/handlers/work/_lib/test/data/playground/orgA/proj1` with tracked content plus a runtime fixture-repo initialiser, so `determine-projects.test.js` passes from a fresh clone. Without this, the one suite that passes today dies on absorption — or, worse, resolves `git branch` against the *enclosing* repository and passes for the wrong reason.
2. **[002 — Inline crossLinkDevProjects And Drop liq-projects-lib](./phase-07-liq-work-pre-migration-remediation/002-inline-cross-link-dev-projects.md)** (tier `sonnet-high`) — the plan-group's special scope item: move `crossLinkDevProjects` verbatim into `src/handlers/work/_lib/cross-link-dev-projects.mjs`, port its test and fixture, rewrite the one import in `work-db.mjs`, and remove `@liquid-labs/liq-projects-lib` from `package.json`. Dependency-neutral; unblocks `liq-projects-lib`'s own retirement slice.

**Dependencies:** neither task depends on the other or on any other slice. **{001, 002} are parallel-eligible** — they touch disjoint files (001: the `test/data/playground/…` fixture and `determine-projects.test.js`; 002: `work-db.mjs`, new `_lib/` and `test/data/cross-link/…` files, `package.json`) — with the standard caveat that both land in `liq-work`, so they need separate task worktrees and a merge order. Suggested order: 001 then 002, so 002's suite-count assertions are stated against a stable baseline.

**Exit state:** `liq-work` builds and lints clean, its test suite is fixture-reproducible from a fresh clone, it no longer depends on `@liquid-labs/liq-projects-lib`, and its `make test` failure set is exactly the known `SlowBuffer` one.

### Phase 8 — liq-work Migration Into dev-core (task 001 in `liq-work`; tasks 002–003 in `sdlcforge/dev-core`)

Relocates liq-work into the dev-core layout, absorbs it with history preserved, and specifies the consumer swap.

1. **[001 — Restructure Src Into Dev-Core Layout](./phase-08-liq-work-migration/001-restructure-src-into-dev-core-layout.md)** (tier `sonnet-high`) — in `liq-work`: `git mv` every source file except the root `src/index.js` to its final dev-core-relative path (`src/work/…`, with `handlers/work/` flattening to `handlers/`), add `src/work/index.mjs`, reduce the root `src/index.js` to a thin re-export, delete the trivial `src/handlers/index.js`, and make the **single** required import rewrite in `setup.mjs`. Keeps `make build`/`make lint` green and the test failure set unchanged.
2. **[002 — Absorb Work Into Dev-Core](./phase-08-liq-work-migration/002-absorb-work-into-dev-core.md)** (tier `opus-high`) — in `dev-core`: unrelated-histories merge of the restructured liq-work, root-level conflicts resolved in dev-core's favor with the donor `plan/` directory dropped per C4, the dependency union applied **including raising `github-toolkit` to `^1.0.0-alpha.25` and re-verifying the `projects` submodule under it**, `src/index.mjs` wired with `work` third in the setup order, liq-work's README route table and `app.ext` contracts ported into dev-core's docs, and route-parity (30), path-var, setup-shape, history-preservation, and no-new-test-failure checks green. The largest and highest-risk task in this slice.
3. **[003 — Extend Consumer Migration Handoff](./phase-08-liq-work-migration/003-extend-consumer-migration-handoff.md)** (tier `sonnet-med`) — in `dev-core`: extend `docs/consumer-migration.md` with the liq-work section — the registry dependency entry to remove, the `explicitPlugins` entry to swap, the atomicity requirement with the exact error string, the five documentation touch-points, the endpoint-provenance change, the `WORK_DB_PATH`/`workKey` preservation guarantee, the correction that liq-work does **not** read `app.ext.serverHome` (core-server's own comment says otherwise), and the honest disclosure that the plugin is unloadable on Node ≥ 24 today.

**Dependencies:** 001 depends on **both** phase 7 tasks. 002 depends on 001 **and on `liq-projects` phase 1** (both tasks). 003 depends only on `liq-projects` phase 1 task 001, so **{002, 003} are parallel-eligible** — with the caveat that both operate in the dev-core checkout and so need separate task worktrees, and that 003 is written to create-or-extend so it does not hard-depend on `liq-projects` phase 2 task 003 having created the file.

**Exit state:** dev-core serves the complete 30-route `/work` surface from `src/work/`, with liq-work's history reachable, no `liq-projects-lib` anywhere, and the consumer swap fully specified.

### Phase 9 — Retire liq-work (executes in `liq-work`)

Follows D10 and the shape the two sibling slices established: verify first, then documentation and metadata, then the publish attempt. No code deletion, no shim.

1. **[001 — Verify Dev-Core Absorption](./phase-09-retire-liq-work/001-verify-dev-core-absorption.md)** (tier `sonnet-med`) — read-only gate across both repositories: every relocated file present under dev-core's `src/work/`, all 30 routes registered with identical `path` arrays and methods, `workKey` registered once with its exact `validationRe`, `WORK_DB_PATH` set to the exact same value, the dependency union correct and `liq-projects-lib` absent, `crossLinkDevProjects` present as inlined source, the fixture reproducible in a fresh dev-core clone, and history preserved. Halts the phase on any gap; edits nothing.
2. **[002 — Rewrite README As Superseded Notice](./phase-09-retire-liq-work/002-rewrite-readme-as-superseded-notice.md)** (tier `sonnet-med`) — `README.md` only: superseded banner naming `@sdlcforge/dev-core`, migration instructions, the honest single-dependent consumer inventory, and disclosure of the Node ≥ 24 unloadability. The existing README's accurate domain-model and route content is preserved in substance, because dev-core's docs are seeded from it.
3. **[003 — Mark Package Deprecated And Bump Version](./phase-09-retire-liq-work/003-mark-package-deprecated-and-bump-version.md)** (tier `sonnet-low`) — `package.json` only: deprecation-bearing `description`, version `1.0.0-alpha.11`, plus the explicit `http-errors` decision point.
4. **[004 — Publish Final And Deprecate On Npm](./phase-09-retire-liq-work/004-publish-final-and-deprecate-on-npm.md)** (tier `sonnet-low`) — attempt `npm publish` and `npm deprecate`, expect the permission classifier to block both, and record the exact commands for the user. Repository archival is deliberately not attempted and is recorded as a user decision.

**Dependencies:** 001 gates the phase. **{002, 003} are parallel-eligible** (disjoint files). 004 runs last, after both have merged, so the published tarball carries both changes.

**Exit state:** `liq-work` is a labelled, deprecated final release; archival awaits a user decision; core-server's repoint remains owned by its own plan-group.

### Parallelism summary

- Sequential: phase 7 → phase 8 → phase 9.
- Cross-plan gate: `liq-projects` phase 1 → this plan's phase 8 task 002. **All of phase 7 and phase 8 task 001 are unblocked today.**
- Parallel-eligible groups: `{7-001, 7-002}`, `{8-002, 8-003}`, `{9-002, 9-003}`.
- Suggested dispatch order: `{7-001, 7-002}`, `8-001`, `{8-002, 8-003}`, `9-001`, `{9-002, 9-003}`, `9-004`.
- Across the plan-group: this slice's absorption is independent of `liq-orgs`'s and `plugable-projects-audit`'s (D4 — one prefix per donor, no shared paths, and W6 confirms no donor imports liq-work), so the three may land in any order once `liq-projects` phase 1 has landed. They should not run *simultaneously* against the dev-core checkout even though their content cannot conflict.
- **Phase 7 task 002 is a gate for a different slice**: `liq-projects-lib`'s retirement cannot proceed until `crossLinkDevProjects` has a new home. Dispatching `7-002` early buys that slice its freedom regardless of when dev-core phase 1 lands.

### Reference notes

- [liq-work source inventory](./notes/liq-work-source-inventory.md) — package facts, the 30-route table, the exact path mapping and the single required import rewrite, the dependency union with its one real conflict, the `crossLinkDevProjects` evidence, the measured baseline and the `SlowBuffer` and gitlink defects, the full consumer inventory, the `app.ext` census with two README corrections, and corrections C1/C4/C5/C6.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — decisions D1–D11, the shared foundation for all five participants (ephemeral plan note).
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/overview.md` — the second worked example of the same recipe, and the origin of corrections C1–C3.
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the durable, committed restatement of D1–D11, authored by `liq-projects` phase 1 task 001. Once it exists, it is the authoritative reference for task agents; prefer it over the plan note above.
