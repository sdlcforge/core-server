# Write README With Dependency Enumeration

## Purpose and scope

`liq-work` has no `README.md` and an empty `package.json` description. The modernization synthesis (`/tmp/flow-sdlc-modernization/synthesis.md` §6) calls for writing a README now — not the full spec/architecture doc set, which stays deferred until this package's consolidation with `liq-projects` (and possibly `liq-orgs`) is decided — **plus one mandatory addition beyond documentation hygiene**: this README must enumerate liq-work's undeclared runtime dependencies on other plugins' `app.ext` services. That enumeration is direct input to a later modernization phase's plugin-manifest work (the `plugable.yaml` `provides`/`requires`/`optional` fields described in synthesis §3) — writing it down now, while the research is fresh, has real option value given this package is a year stale (last commit Sept 2024) with only 2 test files against ~3,423 LOC and 30 routes.

## Requirements

- Fill in `package.json`'s empty `"description"` field with a one-line description: `liq-work` owns the concept of a "unit of work" — a cross-repo, git-branch-scoped bundle of effort tying together GitHub issues and projects/repos through a lifecycle from creation to submission/merge. It orchestrates issues (GitHub) and projects (`liq-projects`) rather than defining either itself.
- Write `README.md` covering:
  - The "unit of work" domain model in a few sentences (see above), and its core data model at a summary level (`work-db.yaml`, keyed by `workKey`, tracking issues/projects/lifecycle state) — source material is in `/tmp/flow-sdlc-modernization/liq-work.md`, "Domain & Capabilities" section.
  - The route surface at a summary level: `start`, `resume`, `pause`, `status`, `build`, `clean`, `qa`, `save`, `submit`, `close`, plus the `work/issues/*` and `work/projects/*` sub-resource collections (each with explicit-`:workKey` and current-work-"implied" variants) — a table or bulleted list is fine, not full per-parameter API documentation.
  - How this plugin integrates with `@liquid-labs/plugable-express` (the `name`/`summary`/`handlers`/`setup` export shape) at a brief, orienting level.
  - **A required "Runtime dependencies on other plugins" section** enumerating, explicitly and by name, the following undeclared `app.ext` dependencies (this package has no `plugable-express.yaml` manifest today, unlike `liq-controls`, so none of this is declared anywhere else):
    - `app.ext._liqProjects.playgroundMonitor` (registered by `liq-projects`) — called unconditionally, with no fallback, from at least: `start-lib.mjs`, `qa-lib.mjs`, `build-lib.mjs`, `submit-lib.mjs`, `save-lib.mjs`, `delete-work-branches.mjs`, `work-db.mjs`, `issues/_lib/add-lib.mjs`, `projects/_lib/add-lib.mjs`, `determine-work-status.mjs`, `answer-set-to-md.mjs`. State plainly: **liq-work cannot function without liq-projects loaded in the same server process** — this is a hard, unguarded dependency, not an optional one.
    - `app.ext.credentialsDB` (registered by `liq-credentials`/`liq-credentials-db`) — used in `start-lib.mjs`, `status-lib.mjs`, `close-lib.mjs`, `clean-lib.mjs`, `issues/_lib/add-lib.mjs`, `issues/_lib/remove-lib.mjs`, `projects/_lib/add-lib.mjs`, for GitHub auth tokens.
    - `app.ext.integrations` (registered by `liq-integrations`) — used in `submit-lib.mjs` and `answer-set-to-md.mjs`; note specifically the `providerFor: 'controls', hook: 'getQuestionControls'` call in `submit-lib.mjs` (around line 94-107) that fetches submitter-attestation questions — and, unlike the `liqProjects` dependency above, this one **is already guarded**: the code checks `supportsControls === false` and degrades gracefully (returns `{}`) when no controls provider is loaded. State this contrast explicitly — it's the one working example of an optional-capability boundary in this codebase, versus the unconditional `liqProjects` dependency.
  - A brief note that this package is part of an active modernization effort and is a likely merge candidate into a future consolidated package (with `liq-projects`) — so a reader isn't surprised if the package boundary looks different later.
- Do **not** write `docs/architecture.md`, a spec document, or any other Flow-standard doc beyond this README.
- Source material for both the domain description and the dependency enumeration already exists in `/tmp/flow-sdlc-modernization/liq-work.md` (this package's modernization research note) — verify the specific file/line references against the actual current source before writing them into the README (the note is a research artifact, not itself authoritative), since this content will be relied on as real migration input later.

## Validation

- `README.md` exists at the package root.
- `cat package.json | grep '"description"'` shows a non-empty, accurate description.
- README contains a clearly-labeled "Runtime dependencies on other plugins" (or equivalently titled) section enumerating all three `app.ext` dependencies above, correctly distinguishing the unconditional `liqProjects`/`playgroundMonitor` dependency from the guarded `integrations`/`controls` hook.
- Spot-check at least 3 of the named module references (e.g. `start-lib.mjs`, `submit-lib.mjs`, `work-db.mjs`) against actual current source to confirm the dependency calls are accurately described, not just copied from the research note without verification.
- No `docs/architecture.md`, spec doc, or other new Flow-standard doc file was created by this task.

## Metadata

architectural_impact: false

## Status

- **Outcome:** succeeded
- **Date:** 2026-08-07
- **Validation:** All five checks passed — `README.md` created at package root; `package.json` `"description"` filled with a non-empty, accurate one-liner; README's "Runtime dependencies on other plugins" section enumerates all three `app.ext` dependencies, correctly distinguishing the unconditional `_liqProjects.playgroundMonitor` dependency from the guarded `integrations`/`controls` hook; the module references named in the task doc (`start-lib.mjs`, `submit-lib.mjs`, `work-db.mjs`, plus others) were spot-checked against current source — all `app.ext._liqProjects.playgroundMonitor`, `app.ext.credentialsDB`, and `app.ext.integrations.hasHook`/`callHook` call sites matched; the `submit-lib.mjs` `providerFor: 'controls', hook: 'getQuestionControls'` call was confirmed at lines 94-107, matching the research note's citation; no `docs/architecture.md`, spec doc, or other Flow-standard doc was created.
- **Affected files:** `README.md`, `package.json`.
- **Assumptions:** None beyond the task doc's own content — the dependency enumeration and module/line references in the task doc's Requirements were independently re-verified against current source (not merely copied from the research note) before being written into the README.
