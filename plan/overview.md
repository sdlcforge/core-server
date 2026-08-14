# Pluggable Defaults Rename

## Purpose and scope

This plan is part of Wave 1 ("Framework Naming Cleanup") of the `sdlcforge-modernization` wave plan (lead project: `core-server`). It corrects a double-g misspelling: "pluggable-defaults" should be "plugable-defaults" (single g). This plan-group spans three projects, each with its own plan worktree registered under the shared slug `pluggable-defaults-rename`:

- **pluggable-defaults** — the source of truth for the rename (directory rename, GitHub repo rename via `gh`, `package.json` name/main/repository/bugs/homepage fixes, and reverting a public-API naming regression in `src/locations.mjs` — the exported constants `PLUGGABLE_CLI_SETTINGS_PATH`/`PLUGGABLE_PLAYGROUND`, their backing env vars, and an on-disk config-dir path segment, all accidentally renamed double-g by a prior regression commit). Already planned as this plan-group's phase 1, tasks 001–004, in `pluggable-defaults`'s own plan worktree.
- **liq-work** (THIS project) — a consumer. Its `package.json` already depends on `@liquid-labs/plugable-defaults` at `^1.0.0-alpha.4` (the correct single-g npm package name), resolving successfully against a real npm publish from Nov 2023 — no live/latent registry bug, contrary to an earlier incorrect investigation this plan-group corrects.
- **sdlcpilot-cli** — another consumer, planned separately in its own plan worktree.

### This project's own slice

An independent, repo-wide investigation (documented in [double-g-sweep.md](./notes/double-g-sweep.md)) was performed during planning, covering every git-tracked file (76 files) plus untracked content outside `node_modules/`, `.git/`, `worktrees/`, `.yalc/`, and gitignored build/test-scratch directories. The investigation confirms:

- **No hardcoded double-g reference.** No link to `https://github.com/liquid-labs/pluggable-defaults` (double-g) and no prose spelling out "pluggable-defaults" double-g when naming the dependency exists anywhere in this repo. The only "pluggable" hit repo-wide is a single already-merged historical sentence in `plan/plan-summary-modernization-foundation.md` referencing the separate, unrelated `@liquid-labs/pluggable-express` package (covered by its own, already-planned `pluggable-express-rename` plan-group) — accurate historical record, not live content, and out of scope regardless.
- **No naming mismatch (item 2 of the requesting investigation).** `liq-work` imports exactly one export from `@liquid-labs/plugable-defaults` — `PLUGABLE_PLAYGROUND` (single-g) — at four call sites (`src/handlers/work/resume.mjs`, `src/handlers/work/projects/_lib/remove-lib.mjs`, `src/handlers/work/_lib/pause-lib.mjs`, `src/handlers/work/_lib/work-db.mjs`). `PLUGABLE_CLI_SETTINGS_PATH` is not referenced. Direct inspection of the resolved, installed npm package (`node_modules/@liquid-labs/plugable-defaults@1.0.0-alpha.4`, matching the locked `package-lock.json` resolution against the real npm registry tarball) confirms it exports both `PLUGABLE_CLI_SETTINGS_PATH` and `PLUGABLE_PLAYGROUND` in the correct single-g spelling — this published version predates the double-g regression that affects `pluggable-defaults`'s *current source* (fixed by that project's own phase 1), not the already-published tarball `liq-work` depends on. `liq-work`'s import name and the package's actual export name match; there is no latent bug here.
- **No config/env-var assumption mismatch (item 3).** `liq-work` never reads `process.env.PLUGABLE_PLAYGROUND`/`PLUGABLE_CLI_SETTINGS_PATH` directly, nor any double-g variant — it only calls the imported accessor functions. No on-disk config-directory path segment is hardcoded anywhere in this repo's source, `README.md`, `Makefile`, or `package.json`.

Because the investigation is conclusive — there is genuinely nothing in this repo's source, docs, or config to change — this plan-group's slice of this project registers a single lightweight verification task that re-runs the definitive repo-wide grep sweep and documents the "nothing found" outcome, per [double-g-sweep.md](./notes/double-g-sweep.md)'s Conclusion, mirroring how the sibling `plugable-express-cli` project's own `pluggable-express-rename` plan handled an identical "nothing to change, verify" outcome. The task is sequenced to run after `pluggable-defaults`'s own phase 1 tasks (directory rename, GitHub repo rename, and the `src/locations.mjs` regression revert) land, so the "nothing to change" verdict is confirmed against the dependency's fully-corrected *post-rename* state rather than a snapshot that could be invalidated by that rename landing later.

### Out of scope

- Plugin-consolidation work (Wave 2), compile-time-manifest work (Wave 3), CLI/MCP unification (Wave 4) — separate, later wave plan-groups already recorded (placeholder) in the wave manifest at `core-server`'s `plan/waves/sdlcforge-modernization/manifest.yaml`.
- The unrelated `pluggable-express-rename` plan-group — already fully planned separately.
- Any `plan/followups.yaml` items unrelated to this naming fix (this repo currently has no `plan/followups.yaml` file).

## Current status

Plan created with a single phase (phase 2, continuing this plan-group's federated phase numbering from `pluggable-defaults`'s phase 1). No prior phases exist in this project's own plan; phase 2 is this project's first and only phase and begins immediately — its one task has no unmet prerequisites of its own beyond the cross-project dependency noted above (which the task's own Validation step accounts for by re-running the sweep at execution time).

## Overview

### Phase 2 — Verification sweep

Single phase, single task. Confirms this project needs no code/doc/config changes for the `pluggable-defaults` → `plugable-defaults` rename, and records that confirmation durably.

- [`001-verify-no-double-g-references.md`](./phase-02-verification-sweep/001-verify-no-double-g-references.md) — re-run the repo-wide double-g grep sweep (tracked and relevant untracked files, plus the import/export naming-mismatch check) and confirm no genuine "pluggable-defaults" (double-g) content reference, hardcoded double-g GitHub link, or import/export naming mismatch exists in this repo. No code changes expected; this task is verification-only unless the sweep surfaces something the planning-time investigation missed, in which case the task documents and flags it rather than silently expanding scope.

No parallelism applies (single task). No `doc-updates` phase is registered — this plan makes no architectural changes: no public API/component-boundary change, no new subsystem, no spec-defined-behavior change, and no tracked-state addition/removal.
