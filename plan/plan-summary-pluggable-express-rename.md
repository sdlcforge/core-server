# Plan Summary: pluggable-express-rename

## What was planned and why

**Shared federated-plan framing.** This plan is part of Wave 1 ("Framework Naming Cleanup") of the `sdlcforge-modernization` wave plan (lead project: `core-server` itself). It corrects a long-standing double-g misspelling: "pluggable-express" should be "plugable-express" (single g), matching the already-correct npm package name. This plan-group spans three projects, each with its own plan worktree registered under the shared slug `pluggable-express-rename`: `pluggable-express` itself (the source of truth — directory rename, GitHub repo rename via `gh`, package.json URL fixes, doc/comment refs, and a hand-edit to its Makefile build-artifact fragment/`main` field to fix the dist output filename — already planned as phase 1, tasks 001-004, in `pluggable-express`'s own plan worktree at `phase-01-framework-naming-cleanup/{001,002,003,004}-*.md`), `plugable-express-cli` (a consumer — investigated and found to need no real content changes; phase 2, a single verification task, already registered in its own plan worktree), and `core-server` (**this project** — a consumer that already correctly depends on the package via a yalc `file:` local link).

**This project's own slice.** `core-server`'s `package.json` already declares `"@liquid-labs/plugable-express": "file:.yalc/@liquid-labs/plugable-express"` — a local yalc link, not an npm registry version spec, so there is no dependency-spec string to change (verified: [`package.json`](../package.json) line for this dependency). The `.yalc/@liquid-labs/plugable-express/` folder name is **already** single-g in the main checkout (`/Users/zane/playground/sdlcforge/core-server/.yalc/@liquid-labs/plugable-express/`), matching the upstream `package.json` `name` field, which a prior plan already fixed — no folder rename needed here either. A repo-wide, case-insensitive grep for `pluggable` across this worktree (excluding `node_modules/`, `.git/`, `bun.lock`) found **no** double-g "pluggable-express" references anywhere in `core-server`'s own `src/`, `docs/`, `CLAUDE.md`, `README.md`, or `AGENTS.md` — every hit outside `.yalc/` is either the correct single-g `plugable-express` name, the genuine and unrelated `pluggable-endpoints`/`pluggable-server` keyword usages (a separate, pre-existing typo out of scope for this rename), or one of the explicitly-excluded plan-bookkeeping/historical files listed below. The only double-g content anywhere in this repo lives inside a yalc-managed snapshot: `/Users/zane/playground/sdlcforge/core-server/.yalc/@liquid-labs/plugable-express/`'s own copied `package.json` (`"main": "dist/pluggable-express.js"`, `repository`/`bugs`/`homepage` URLs), `README.md`, and `dist/pluggable-express.js` — a stale local copy of `plugable-express`'s own pre-rename dist filename, machine-managed by `yalc push`/`yalc add`, never hand-edited.

Given that, this project's own work is a single follow-through task: once `pluggable-express`'s own phase 1 has landed (specifically task 002's GitHub/package-URL work and, more importantly, task 004's Makefile-fragment/`main`-field fix — the change that actually renames the dist output file `pluggable-express.js` → `plugable-express.js`), refresh `core-server`'s yalc-linked snapshot so it picks up the corrected package and dist filename, per this project's own [`CLAUDE.md`](../CLAUDE.md) "Yalc Local Development" and "Dependency Updates" sections: `yalc push` from the (by-then-possibly-renamed) `plugable-express` repo, then `rm -f bun.lock && bun install` (or `scripts/provision-local-deps.sh --refresh-lock`, which additionally handles copying `.yalc/` into a worktree that doesn't have it yet — see [`scripts/provision-local-deps.sh`](../scripts/provision-local-deps.sh)) in `core-server`, then `bun run build`, then verify tests/server startup still pass. The refresh is expected to correct the `.yalc/@liquid-labs/plugable-express/` snapshot's own double-g content as a side effect of `yalc` re-copying the upstream package's now-corrected files — it is not something to hand-edit directly, since `yalc` fully regenerates that directory on every push/install. This plan's task validates that the refresh actually produces the corrected snapshot rather than assuming it.

**Out of scope.**

- Plugin-consolidation work (Wave 2), compile-time-manifest work (Wave 3), and CLI/MCP unification (Wave 4) — separate, later wave plan-groups already recorded (placeholder) in the wave manifest at [`plan/waves/sdlcforge-modernization/manifest.yaml`](./waves/sdlcforge-modernization/manifest.yaml), which this plan does not edit.
- `plan/manifest.yaml`, `plan/waves/sdlcforge-modernization/manifest.yaml`, `.flow/plans/pluggable-express-rename.json`, and historical plan documents under `plan/plan-summary-*.md` / `plan/notes/*.md` from prior plans (e.g. [`plan-summary-modernization-foundation.md`](./plan-summary-modernization-foundation.md), [`notes/catalyst-bun-compatibility.md`](./notes/catalyst-bun-compatibility.md)) — these are plan bookkeeping / historical record and intentionally carry the slug/history text as-is; they legitimately contain the string "pluggable-express" and are not touched by this plan.
- `pluggable-express`'s own directory/GitHub-repo/package-metadata rename and `plugable-express-cli`'s own verification — each project's own plan-group slice, tracked in their own plan worktrees.

**Success criteria.** `core-server`'s `.yalc/@liquid-labs/plugable-express/` snapshot is refreshed from the renamed upstream package: its `package.json` `main` field and copied `dist/` filename are single-g, `bun.lock` is regenerated to match, `bun run build` succeeds, and `core-server`'s test suite (and a quick local server-start check) passes against the refreshed dependency. A grep sweep of the refreshed `.yalc/@liquid-labs/plugable-express/` directory shows no remaining double-g `dist/pluggable-express.js` reference.

### Phase 3 — Yalc Dependency Refresh

Single phase, single task; the task is directly actionable using the procedure already documented in this project's own `CLAUDE.md`. No research delegation or additional user decisions are required to complete the task breakdown, though one execution-model consideration is flagged to the manager (see `flagged_for_manager` in this invocation's structured report): whether the task-agent dispatched for this task can shell out into the sibling `pluggable-express`/`plugable-express` repo to run `yalc push`, or whether that one step should be run by the manager immediately before dispatch, mirroring the precedent set by `pluggable-express`'s own manager-executed directory-rename task.

1. **[001 — Refresh Plugable-Express Yalc Snapshot](./phase-03-yalc-dependency-refresh/001-refresh-plugable-express-yalc-snapshot.md)** (tier `sonnet-med`) — Runs `yalc push` from the (by-then-current-path) `plugable-express` repo, refreshes `core-server`'s `.yalc/` snapshot and `bun.lock` per `CLAUDE.md`'s documented procedure, rebuilds, and validates the refreshed snapshot no longer carries the double-g dist filename, plus that tests/server-start still pass.

**Dependencies and parallelism.** Single task in a single phase; not parallel-eligible with anything else in this plan (there is nothing else in this plan). Blocked externally on `pluggable-express`'s own phase 1 tasks 002 and 004 landing first — this is a cross-project dependency the manager tracks via the wave plan, not something this plan's own `TODO.yaml` can express.

No architectural implications: this task refreshes a local dependency snapshot and lockfile — it does not modify a public API or component boundary, introduce a new subsystem, change spec-defined behavior, or add/remove tracked state. The Phase 4 architectural-implications check therefore registers no `doc-updates` phase.

## What shipped

### Phase 03 — Yalc Dependency Refresh

1. **Refresh Plugable-Express Yalc Snapshot** (`001-refresh-plugable-express-yalc-snapshot.md`, tier `sonnet-med`) — Refreshed core-server's local yalc snapshot/lockfile for @liquid-labs/plugable-express, rebuilt, verified unit tests and live local server-startup/endpoint check pass. Discovered the manager's pre-dispatch yalc push had propagated a stale build (missing a registerPathVar plugin-setup param liq-credentials needs), forced a clean rebuild+re-push from plugable-express (source untouched, per task's own re-push contingency), then redid the refresh/build/test cycle, resolving the startup failure. Also surfaced a generic-adjective 'pluggable-server' string in plugable-express's own help text, correctly left unfixed as out of scope and not a genuine rename miss (recorded separately). All validation checks pass; only tracked-file change is bun.lock plus task doc status.
   Commit `b3384f3`, merged at `c5bad234771167f869ef1dc05d1f5e909f2a34a5`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`CJ9P`** — **yalc push propagated stale build once** — During phase-3 (yalc-dependency-refresh) task execution, the manager's pre-dispatch `yalc push` from plugable-express propagated a dist build that was stale relative to plugable-express's own current main branch (missing a registerPathVar plugin-setup parameter that liq-credentials needs to start up), which briefly broke core-server's local server startup. The dispatched task agent resolved it (forced rebuild + re-push from plugable-express, source untouched, per the task doc's own re-push contingency) and re-verified. Root cause not investigated further: worth checking whether plugable-express's prepack/make build has an mtime-gating or lifecycle-script issue that could cause a stale dist/ to be packed on a future yalc push.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 03 — Yalc Dependency Refresh

- [x] [001-refresh-plugable-express-yalc-snapshot.md](./phase-03-yalc-dependency-refresh/001-refresh-plugable-express-yalc-snapshot.md) — tier `sonnet-med` · branch `plan/pluggable-express-rename-03-001` · commit `b3384f3` · merge `c5bad234771167f869ef1dc05d1f5e909f2a34a5`
