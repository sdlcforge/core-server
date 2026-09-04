# Update Orgs Defect Documentation

## Purpose and scope

Bring every piece of prose in the repository that describes the now-fixed `orgs` defects as live back into agreement with the code that tasks 001-006 landed, and sweep for stragglers.

Files:

- `README.md` — the `### orgs submodule` section and its subsections
- `docs/consumer-migration.md` — the `#### Disclosure: the migrated /orgs endpoints do not work` section

`README.md`'s `## The plugin manifest` section is task 006's; do not re-edit it. `docs/architecture.md` is Phase 02's.

This is a documentation task. It changes no source file. Run it after tasks 001-006 have landed, so the prose describes what is actually true rather than what was planned.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

### 1. `README.md` — the `orgs` route table lead-in

Line 142 currently ends: "**All 5 are pre-existing, non-functional defects, migrated as-is (see [Known defects](#known-defects-orgs-submodule) below) rather than fixed as part of the consolidation.**"

Replace it with an accurate statement: the five endpoints were migrated non-functional from `@liquid-labs/liq-orgs` and were subsequently repaired. Keep the sentence short; the detail belongs below.

### 2. `README.md` — the `#### Known defects (orgs submodule)` section

This section (lines 144-152) is now entirely obsolete as written. Two of its claims are not merely stale but were **wrong**:

- It states the four `model`-reading handlers' defect "requires changing `getOrgFromKey`'s signature in `@liquid-labs/liq-handlers-lib`, a package outside this consolidation's scope". That was false — the fix was to stop calling `getOrgFromKey` at all and read `app.ext._liqOrgs.orgs` in-package. Do not silently delete this; the reader who believed it deserves the correction, and the repository's own documentation style records corrections explicitly (`README.md`'s "**Correction — task 003 (manifest validation) fixed this from an initially-declared `credentialType:GITHUB_API`**" is the house pattern).
- It states `liq-controls` is the package that "reads correctly today". That capability now lives in `@sdlcforge/core-server`'s in-tree `controls` submodule (`src/controls/handlers/orgs/controls/_lib/list-lib.mjs`, `src/controls/resources/load-controls.mjs`, `src/controls/integrations/get-question-controls.mjs`), which is what the manifest and `docs/architecture.md` still call `liq-controls`. **Verify the current attribution before rewriting it** and, if the rest of the README consistently says `liq-controls`, do not unilaterally rename it here — flag the inconsistency in the task report instead. A one-section rename would make the document less consistent, not more.

Decide the section's fate deliberately and state the choice in the commit message. The recommended shape: rename the heading to something like `#### Repaired defects (orgs submodule)`, keep a short account of what was wrong and what fixed it (with the correction above), and drop the "not attempted here" framing. Alternatively, delete the section and fold a one-paragraph account into the submodule intro. Either is acceptable; leaving the section describing live defects is not.

If the heading is renamed or removed, update every in-document link to `#known-defects-orgs-submodule`. Section IDs are auto-generated from headings, so a rename breaks inbound anchors silently. `README.md:209` links to the *`projects-audit`* section's anchor (`#known-defects-projects-audit-submodule`) — do not disturb that one.

### 3. `README.md` — the `#### The app.ext._liqOrgs contract` section

Check it for statements the fixes falsify, in particular anything implying the `orgs` handlers do not read the registry. If tasks 002-004 changed which modules read `app.ext._liqOrgs.orgs`, the "**read** by …" attribution in that section's first bullet is now incomplete — `orgs`' own handlers read it too. Update it.

The path-variable note at line 171 describes `parameterKey`'s registration from `parameters-detail.mjs` and the commented-out duplicate in `parameters-set.mjs`. Task 003 tightened that pattern and task 004 may have reworded the commented-out block; confirm the note is still accurate and, if the tightening is worth a reader's attention, add a clause naming the prototype-pollution exclusion.

### 4. `docs/consumer-migration.md`

The `#### Disclosure: the migrated /orgs endpoints do not work` section (around lines 240-248) tells a consumer that `GET /orgs/list` "will fail" and recommends an indirect smoke test instead. All of it is now false.

- Retitle and rewrite the section. Its job in that document is to tell a consumer swapping packages what to expect; the honest content now is that the endpoints were non-functional at the time of the swap and were repaired afterwards, with a pointer to the README.
- Replace the "Use this positive check instead" paragraph: `GET /orgs/list` is now a valid smoke test.
- Line 244 repeats the `getOrgFromKey`/`model` account and cites `load-plugins.js:36`; line 245 repeats the `create` hang. Both go.
- Line 236's route inventory ("All 5 `/orgs` routes keep their exact paths and methods") is still true — the fixes changed no route. Leave it.

Note that `docs/consumer-migration.md` is a per-donor handoff document describing a migration that already happened. Do not rewrite its history; state that the defects it disclosed have since been fixed, dated by the change rather than by prose that pretends they never existed.

### 5. Repository-wide sweep

Confirm nothing describing the fixed defects survives anywhere:

```bash
grep -rn "KNOWN BROKEN" --include='*.mjs' --include='*.js' --include='*.md' . | grep -v node_modules | grep -v test-staging | grep -v dist
grep -rn "getOrgFromKey" --include='*.mjs' --include='*.js' --include='*.md' . | grep -v node_modules | grep -v test-staging | grep -v dist
grep -rn -E '(^|[/(])jY7C' --include='*.md' --include='*.mjs' . | grep -v node_modules
grep -rn "non-functional\|never sends a response\|hangs until\|do not work" --include='*.md' README.md docs/
```

Historical records are exempt and must not be edited: `plan/plan-summary-*.md` files and anything under `worktrees/`. Everything else that still describes a fixed defect as live is a miss.

Note that `qa/` and `dist/` contain generated artifacts that may carry stale text; they are build output, not documentation. Leave them.

## Validation

- The four greps above return only historical-record hits (`plan/plan-summary-*.md`, `worktrees/`) and this plan's own `plan/` documents.
- Every intra-document anchor link in `README.md` resolves: for each `](#...)` occurrence, a matching heading exists. A rename in requirement 2 is the likely breakage.
- `README.md`'s `## Additional documentation` section and `docs/architecture.md`'s links into `README.md#the-plugin-manifest` and `README.md#projects-audit-submodule` still resolve.
- `make lint` is clean (documentation-only changes should not affect it, but the repository lints the whole tree).
- Headings follow the repository's sentence-case convention and the existing heading hierarchy is not skipped.
- `git status` shows only `README.md` and `docs/consumer-migration.md` changed, and only dev-core paths.

## Metadata

architectural_impact: false

## Assumptions

- Tasks 001-006 have all landed. If any has not, the prose written here will be wrong; halt and report rather than documenting an unfinished state.
- Task 006 owns `README.md`'s `## The plugin manifest` section. If both tasks are in flight, expect a rebase; resolve by section boundary.
- `docs/architecture.md` is deliberately out of scope here and is handled by Phase 02's `update-architecture-docs` task.
- `README.md` is a long single-file document with very long lines; edit surgically by section rather than reflowing.

## References

- [orgs handler defect analysis](../notes/orgs-handler-defect-analysis.md) — the evidence behind the "`getOrgFromKey` signature change required" correction.
- [orgs security findings](../notes/orgs-security-findings.md) — background for any prose about the `parameterKey` tightening.
- [Project Documentation Standards](flow-mcp:d) and [markdown-style-standards.md](flow-mcp:d/ZM) — heading case, heading hierarchy, and cross-reference style.
- The task reports from tasks 001-006 — the authoritative account of what actually changed.

## Procedure

1. Read the task reports (or the landed diffs) for tasks 001-006 before writing any prose.
2. Rewrite the `README.md` `orgs` submodule sections.
3. Rewrite the `docs/consumer-migration.md` disclosure section.
4. Run the sweep greps and fix anything they surface.
5. Verify anchors and run `make lint`.

## Checkpoint hints

- After the `README.md` route-table lead-in and `Known defects` section.
- After the `app.ext._liqOrgs` contract and path-variable notes.
- After `docs/consumer-migration.md`.
- After the sweep and anchor verification.
