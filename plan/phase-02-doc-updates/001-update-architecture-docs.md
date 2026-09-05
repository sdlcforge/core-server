# Update Architecture Docs

## Purpose and scope

Review `@sdlcforge/dev-core`'s architecture and specification documents against the changes Phase 01 landed, and update them where the documented architecture no longer matches the code.

Invoke the `update-architecture-docs` task-procedure at `plugins/flow/task-procedures/update-architecture-docs/SKILL.md`.

role_doc: plugins/flow/roles/architect-backend.md

The implications are backend and component-boundary in nature — a declared plugin-manifest requirement changes severity class, and five HTTP endpoints go from throwing or hanging to serving real responses — so the backend architect role is the right match rather than the data, cloud, or frontend variants.

## Requirements

### Planned implementation tasks that surfaced the architectural implications

These are the Phase 01 task documents whose landed work this review covers. Read each one's outcome (task report or landed diff) before editing any architecture doc:

- `plan/phase-01-orgs-remediation/002-fix-organization-resource-and-org-lookup.md`
- `plan/phase-01-orgs-remediation/003-fix-orgs-read-handlers.md`
- `plan/phase-01-orgs-remediation/004-fix-orgs-parameters-set-handler.md`
- `plan/phase-01-orgs-remediation/005-finish-orgs-create-handler.md`
- `plan/phase-01-orgs-remediation/006-mark-org-setup-methods-requirement-optional.md`

Task 006 is the only one carrying `architectural_impact: true`, but 002-005 collectively change who reads `app.ext._liqOrgs.orgs` and what the `/orgs` route surface actually does, which is what `docs/architecture.md`'s runtime-service-contract table describes.

### Architecture and spec files to review

- `docs/architecture.md` — the primary target.
- `docs/*-spec.md` — resolve this glob before assuming. dev-core's `docs/` currently holds `architecture.md`, `consumer-migration.md`, and `dev-core-consolidation-contract.md`, and **no `*-spec.md` file exists**. If the glob is still empty, record that and move on; do not create one.
- `docs/dev-core-consolidation-contract.md` — review only. It is a durable contract document about layout, submodule interface, and the `app.ext` freeze. Phase 01 changed none of those. Confirm with a read; do not edit unless something is provably false.

### Specific lines to evaluate

- **`docs/architecture.md:86`** — states that this package's declared `provides` "and, for `app.ext._liqOrgs.orgSetupMethods`, its declared `requires` on `liq-policy`'s contribution — have no requiring or providing counterpart to resolve against yet. That gap is an intended, recorded outcome". The gap still exists, but it is now declared `optional: true` and reports at `info` rather than `error`. Judge whether the sentence still reads truthfully; if it does, leave it, and say so.
- **`docs/architecture.md:82`** — the `app.ext._liqOrgs` row of the runtime-service-contract table. Its "read by" columns may now be incomplete: after Phase 01, `orgs`' own handlers read `app.ext._liqOrgs.orgs`, which they did not before.
- **`docs/architecture.md:102`** — the endpoint-count sentence ("19 + 5 + 30 + 4 = 58 endpoints currently registered") and its statement that the per-endpoint tables live in `README.md`. Phase 01 changed no route, so the count should still be 58; verify rather than assume.
- **`docs/architecture.md:77`** — the paragraph introducing the `plugable` block. Check whether anything there commits to a severity model that task 006's change contradicts.

### Constraints

- Edit only `docs/architecture.md` (and a `docs/*-spec.md` if one turns out to exist). `README.md` and `docs/consumer-migration.md` were handled by Phase 01 task 007; do not re-edit them, and do not contradict them.
- Do not edit any file outside `/Users/zane/playground/sdlcforge/dev-core`.
- Do not restate `README.md`'s manifest declaration in `docs/architecture.md`. Line 77 deliberately delegates to it ("see `README.md`'s 'The plugin manifest' for the full declaration ... it is not repeated here"), and that division of labor is intentional.
- A "no change needed" outcome is a legitimate result for any given file. Record the reasoning; do not manufacture an edit.

## Validation

- Each named file was read in full and an explicit keep-or-change decision is recorded for every line listed above.
- Any edited statement is verifiable against landed code, cited by file and line.
- The 58-endpoint count in `docs/architecture.md:102` was checked against `src/*/handlers/index.*` rather than assumed.
- Every cross-document link in `docs/architecture.md` still resolves, including its links into `README.md` anchors — Phase 01 task 007 may have renamed the `#known-defects-orgs-submodule` heading, and `docs/architecture.md` must not be left pointing at a dead anchor. Check each `](../README.md#...)` target against the current `README.md` headings.
- `grep -rn "orgSetupMethods" docs/` — every remaining mention is consistent with the requirement now being declared optional.
- `make lint` is clean.
- `git status` shows only `docs/` paths changed, and only dev-core paths.

## Metadata

architectural_impact: false

## References

- [manifest optional requirement](../notes/manifest-optional-requirement.md) — why the requirement is optional and what the validator now reports.
- [orgs handler defect analysis](../notes/orgs-handler-defect-analysis.md) — what changed about who reads `app.ext._liqOrgs.orgs`.
- [`docs/dev-core-consolidation-contract.md`](../../docs/dev-core-consolidation-contract.md#appext-contract-freeze) — the `app.ext` freeze the Phase 01 work stayed inside.
- The Phase 01 task documents and reports listed above.

## Status

- **Outcome:** succeeded
- **Date:** 2026-09-04
- **Per-line keep-or-change decisions:**
  - `docs/architecture.md:86` (the "no requiring or providing counterpart" sentence about `orgSetupMethods`) — read as still truthful regarding the `orgSetupMethods`-specific claim (the gap is real either way; only the severity of the resulting finding changed, from `error` to `info`, and the sentence never mentioned severity). **Edited anyway**, but for a different, task-caused reason: correcting the adjacent `liq-controls` attribution (see below) surfaced that the same sentence's broader claim — "none of `liq-controls`, `liq-integrations-issues-github`, or `liq-policy` carries a manifest of its own" — is false once the reader is correctly identified as `@sdlcforge/core-server`, which does carry its own `"plugable"` manifest block (verified directly in `/Users/zane/playground/sdlcforge/core-server/package.json`, `plugable.host.builtins[].components[] .component === 'controls'`, with a declared `requires` on `appExt:_liqOrgs.orgs` at both `setup`- and `runtime`-phase, and on `appExt:_liqProjects.playgroundMonitor`). Rewrote the sentence to state the corrected fact while preserving the paragraph's conclusion (the gap remains real from `dev-core`'s own build/CI vantage, since that counterpart is checked only inside `core-server`'s own plugin-graph gate).
  - `docs/architecture.md:82` (the `app.ext._liqOrgs` row) — changed. "Read by (this package)" was `—`; updated to name `orgs`' own `list`, `parameters-list`, `parameters-detail`, and `parameters-set` handlers (via `src/orgs/handlers/_lib/get-org.mjs`, or directly in `list.mjs`), verified by reading each handler file directly. "Read by (outside this package)" was attributed to the now-deprecated external `liq-controls` package; corrected to `@sdlcforge/core-server`'s in-tree `controls` submodule with the current in-tree paths (`src/controls/resources/load-controls.mjs`, `src/controls/integrations/get-question-controls.mjs`, `src/controls/handlers/orgs/controls/_lib/list-lib.mjs`), verified by locating those exact files in a live, read-only `/Users/zane/playground/sdlcforge/core-server` checkout. This mirrors the identical correction Phase 01 task 007 already made in `README.md:159`.
  - `docs/architecture.md:102` (the 58-endpoint count) — no change. Recounted from source rather than assumed: `src/projects/handlers/index.js` + `releases/index.js` = 19, `src/orgs/handlers/index.js` = 5, `src/work/handlers/index.js` + `issues/index.js` + `projects/index.js` = 30, `src/projects-audit/handlers/index.mjs` = 4. Total 58, matching the doc. No route changed in Phase 01.
  - `docs/architecture.md:77` (the `plugable`-block intro paragraph) — no change. Read closely; it describes the manifest as build/CI-time data stating `provides`/`requires` pairs, with no commitment to any specific severity model (no mention of `error`/`warning`/`info` anywhere in the paragraph), so task 006's severity-class change (`error` → `info` for `orgSetupMethods`) contradicts nothing here.
- **Other files reviewed:**
  - `docs/dev-core-consolidation-contract.md` — read in full (review-only per task scope). Confirmed the layout convention, submodule interface, root-file ownership, absorption recipe, composite-setup ordering, and `app.ext` freeze sections are all still accurate; Phase 01 touched none of them. Note: line 128 carries the same stale `liq-controls` attribution as the one corrected in `docs/architecture.md`/`README.md`, but this file is explicitly out of this task's edit scope (`Edit only docs/architecture.md`), so it was left as-is and is recorded in `flagged_for_manager` instead.
  - `docs/*-spec.md` — glob resolved to no matches; nothing to review or create, per the task's own instruction.
- **Validation summary:**
  - `make lint` — clean (`qa/.lint.passed` written; docs-only change, ESLint output empty).
  - `grep -rn "orgSetupMethods" docs/` — three hits, all consistent with the requirement now being optional: `docs/architecture.md:82` and `:86` (edited, no severity claim), `docs/consumer-migration.md:233` (untouched, out of scope, no severity claim either).
  - Endpoint count re-derived from `src/*/handlers/index.*` sources (see above) — confirmed 58, matches `docs/architecture.md:102`; no edit made.
  - Cross-document links: every `](../README.md#...)` in `docs/architecture.md` (`#the-projects-audit--projects-dependency`, `#the-plugin-manifest` ×2, `#routes`) checked against `README.md`'s current headings — all resolve; none were touched by this edit and none point at the renamed `#known-defects-orgs-submodule` anchor (`docs/architecture.md` never linked there).
  - `git status` — only `docs/architecture.md` modified, only `dev-core` paths.
- **Files touched:** `docs/architecture.md` (diagram node label + alt-text, the `app.ext._liqProjects` and `app.ext._liqOrgs` table rows, and the adjacent manifest-counterpart paragraph).
- **Decisions made:**
  - Diagram (`docs/architecture.md:29-30,34`): relabeled the `LiqControlsExt` node to `CoreServerControls` (`@sdlcforge/core-server's controls submodule`) and updated the alt-text sentence to match, so the diagram does not contradict the corrected table rows within the same file.
  - `[task-caused-drift]` Corrected the `docs/architecture.md:86` "no manifest of its own" claim after verifying `@sdlcforge/core-server`'s own `package.json` `plugable` block, since my own attribution fix in the table directly exposed this adjacent sentence as false for the corrected reader — see the per-line note above.
  - Chose not to add any new "declared `requires`" prose for the two manifest entries phase 01 task 006 added to `orgs`' component (`appExt:_liqProjects.playgroundPath`, `appExt:_liqOrgs.orgs`), since the runtime-coupling facts they encode are already captured by this task's own "Read by (this package)" table-cell updates, and the task's own constraint forbids restating `README.md`'s manifest declaration here.
- **Assumptions applied:** none beyond the task doc's own; all five Phase 01 task reports (002-006) plus 007's report were read in full before editing.
