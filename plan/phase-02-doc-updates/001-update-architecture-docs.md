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
