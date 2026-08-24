# Correct Docs External Dependency Claims

## Purpose and scope

Correct the specific, now-false statements in this repository's committed documentation that describe `determineCurrentMilestone` as an unresolved external dependency on `@liquid-labs/liq-projects-lib`. [`001-inline-determine-current-milestone.md`](./001-inline-determine-current-milestone.md) makes those statements untrue the moment it lands; leaving them in place would leave the repository self-contradicting — source that has inlined the function beside a specification that says it hasn't.

This is a **targeted factual correction, not documentation authoring**. The docs were written correctly against the pre-inline state; exactly four claims go stale, plus one file listing. Everything else in these documents stays as it is. Do not restructure, do not re-review against documentation standards, do not fix unrelated wording, and do not remove the existing YAML frontmatter from `docs/liq-integrations-issues-github-spec.md` even though prose docs generally carry none — that is a separate question, out of scope here.

Depends on task 001 having landed. Read the post-task-001 source (`src/determine-current-milestone.mjs`, `src/create-or-update-pull-request.mjs`, `package.json`) before editing, so the corrections describe what actually landed rather than what this document predicted would.

## Requirements

Four claims to correct, plus one listing to extend. The line references below are as of plan authoring — locate each by its text, not its line number.

1. **`docs/liq-integrations-issues-github-spec.md` — "Constraints and assumptions", first bullet.** Currently reads "**Milestone determination is an external dependency, not yet inlined.**" and goes on to say the import is a known external dependency that "a separate, not-yet-executed plan-group item is expected to inline … in the future", closing with "This spec documents current, as-shipped behavior — the external import — and does not assume the inlining has happened."

   Replace it with a bullet stating the current, as-shipped truth: milestone determination is implemented **in this repository**, at `src/determine-current-milestone.mjs`, copied verbatim from `@liquid-labs/liq-projects-lib` and no longer imported from it. Keep the bullet in the same position and the same bold-lead style as its siblings. Two things worth preserving in the new text, because they remain true constraints rather than history: the implementation still requires a `GITHUB_API` token from the host `credentialsDB`, and it still depends on `minVersion` from the live, separately-maintained `@liquid-labs/versioning`.

2. **`docs/liq-integrations-issues-github-spec.md` — "Key use cases" → "Pull request create-or-update", the outcome bullet's closing sentence.** Currently: "Milestone determination currently delegates to the external `determineCurrentMilestone` function from `@liquid-labs/liq-projects-lib` (see [Constraints and assumptions](#constraints-and-assumptions))." Correct it to describe the local implementation. The observable outcome — the project's current milestone is assigned to the created PR — does not change and its description should not be reworded; only the delegation claim does.

3. **`docs/liq-integrations-issues-github-spec.md` — "Constraints and assumptions", the "Dependent on the broader `liq`/`liquid-labs` toolkit libraries" bullet.** It enumerates `git-toolkit`, `github-toolkit`, `liq-qa-lib`, `octocache`, and `shell-toolkit`. Bring the list into agreement with the post-task-001 `package.json`: add `@liquid-labs/versioning` (supplying `minVersion` for milestone selection). Note that `@liquid-labs/liq-projects-lib` is deliberately absent from this list — it was never in it — so the correction here is an addition, not a removal.

4. **`AGENTS.md` — two places.**
   - The "Conventions" bullet beginning "`createOrUpdatePullRequest` currently imports `determineCurrentMilestone` from the external `@liquid-labs/liq-projects-lib` package … this is a known, tracked external dependency … do not silently work around it." This convention no longer describes anything. Replace it with the convention that actually applies now: `determineCurrentMilestone` lives at `src/determine-current-milestone.mjs` as a verbatim copy of the former `@liquid-labs/liq-projects-lib` implementation, deliberately kept unmodified — including its unused `cache` parameter and its construction of a second `Octocache` — so the fold into `@sdlcforge/core-server` absorbs a behavior-identical implementation. If either oddity is to be cleaned up, that is a change to make on its own, after the fold, not incidentally.
   - The "External services and dependencies" bullet "`@liquid-labs/liq-projects-lib` — supplies `determineCurrentMilestone`, imported directly by `create-or-update-pull-request.mjs` (see [Conventions](#conventions))." Remove it and add a bullet for `@liquid-labs/versioning` (supplies `minVersion`, used by `src/determine-current-milestone.mjs`) in its place, keeping the list's existing ordering convention. The existing `@liquid-labs/octocache` bullet stays; if it still reads as an undeclared/implicit dependency, update it to reflect that task 001 declared it explicitly.

5. **`docs/project-structure.md` — the `src/` directory tree and the `src/` prose section.** Add `determine-current-milestone.mjs` to the tree listing with a one-line role comment matching the surrounding style, and — if task 001's requirement 6 landed a test — make sure the `src/test/` line still reads accurately for more than one test file. In the `src/` prose paragraph, the sentence describing the top-level `.mjs` files as "one hook named in that registration … or the shared `usesGitHubIssues` activation test" now under-describes the directory: `determine-current-milestone.mjs` is a shared helper, not a registered hook. Adjust that sentence minimally to cover it, in the same way `constants.mjs` is already covered.

6. **Leave `README.md` alone.** Its only relevant mention is "milestone determination" as a capability of the plugin, which remains accurate. It is rewritten wholesale later, by Phase 14 task 002.

7. **Check for anything this list missed.** Run `grep -rn 'liq-projects-lib\|determineCurrentMilestone\|determine-current-milestone' README.md AGENTS.md docs/` after editing. Every surviving hit must be either a correct post-inline statement or a deliberate historical reference. Report any hit this task's requirements did not anticipate rather than silently editing it.

## Validation

- `grep -rn 'liq-projects-lib' README.md AGENTS.md docs/` returns no hit that describes it as a current dependency. Any surviving mention is explicitly framed as history ("formerly imported from …").
- The spec's "Constraints and assumptions" first bullet describes milestone determination as implemented locally at `src/determine-current-milestone.mjs`, and contains no claim that inlining is pending or expected in the future.
- The spec's "Pull request create-or-update" outcome no longer says milestone determination delegates to an external function; the described outcome (current milestone assigned to the created PR) is otherwise word-for-word unchanged.
- The spec's toolkit-dependency bullet lists `@liquid-labs/versioning`, and every package it lists appears in `package.json` `dependencies` — cross-check the two lists against each other, in both directions.
- `AGENTS.md`'s Conventions section no longer carries the "known, tracked external dependency" convention, and its External services list names `@liquid-labs/versioning` rather than `@liquid-labs/liq-projects-lib`.
- `docs/project-structure.md`'s `src/` tree includes `determine-current-milestone.mjs` and its prose section accounts for it.
- No internal link in any edited document is dangling; the spec's Table of contents still matches its headings (no heading should have changed).
- The spec's existing YAML frontmatter block is intact and unmodified.
- `make qa` (test + lint) remains green — documentation edits should not affect it, but confirm rather than assume; `make lint` explicitly ignores `docs/`, so the relevant risk is an accidental source edit, which this check catches.
- Exactly three files are modified: `docs/liq-integrations-issues-github-spec.md`, `AGENTS.md`, and `docs/project-structure.md`. No source file, no `package.json`, no `README.md`.

## Assumptions

- Task 001 has landed and `src/determine-current-milestone.mjs` exists. If it does not, this task has nothing to correct — halt and report rather than editing docs to describe a state the source is not in.
- The file path task 001 used is `src/determine-current-milestone.mjs`. Confirm from the tree rather than assuming, and use whatever path actually landed.
- These documents are corrected here at their **pre-relocation** paths. Phase 13 moves source, not docs; `docs/` and `AGENTS.md` stay at the repository root throughout, and `core-server`'s absorb task drops both rather than merging them, so no later phase revisits these edits.

## References

- [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) — anomaly 8 records exactly which documentation statements go stale and why; its dependency inventory is what the corrected lists must agree with.
- [`001-inline-determine-current-milestone.md`](./001-inline-determine-current-milestone.md) — the source change these corrections describe, including the deliberately-preserved oddities requirement 4 restates as a convention.

## Status

**Outcome:** succeeded (2026-08-24).

`docs/`, `AGENTS.md`, and `README.md` are not present on this worktree's branch (`plan/core-server-domain-consolidation-12-002`, cut from `plan/core-server-domain-consolidation`) — per source-inventory anomaly 8, they exist only on `main` (commit `af00846`). Per that note's explicit instruction, this task read the three in-scope docs from `main` (`git show main:<path>`), applied the four corrections plus the file-listing update, and wrote the corrected files into this worktree at their normal paths — this is the first commit on this branch lineage carrying these three docs, so the change lands as new-file adds rather than diffs against a prior in-branch version. `README.md` was left untouched and was **not** added to this worktree, consistent with Requirement 6 and the Validation bullet naming it out of scope.

Affected files (repo-relative):
- `docs/liq-integrations-issues-github-spec.md`
- `AGENTS.md`
- `docs/project-structure.md`

Validation: all `## Validation` checks passed, including `make qa` (2 test suites / 5 tests passed; lint clean) and the requirement-7 sweep grep, which surfaced no unanticipated hits.
