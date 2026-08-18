# Publish Final And Deprecate On Npm

## Purpose and scope

**Executes in the `plugable-projects-audit` repository** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`).

Publish `@liquid-labs/plugable-projects-audit@1.0.0-alpha.3` as the final, clearly-labelled superseded release, then mark it deprecated on npm — or, when the environment blocks either command, hand the exact command to the user verbatim.

D9 and D10 both anticipate the block: this is the established outcome for `@sdlcforge/core-cli` and `@liquid-labs/liq-integrations` in this same wave. A blocked publish is a **normal, successful** completion of this task, provided the exact commands are recorded. Guessing at a workaround, or publishing from an unverified tree, is not.

Repository archival is **deliberately not attempted** and is recorded as a user decision (D10 step 5).

## Requirements

1. **Confirm the tree is the one you mean to publish.** All of these must hold before anything is run:
   - `README.md` exists and is the superseded notice (task 002 has merged).
   - `package.json` `description` leads with the deprecation, `version` is `1.0.0-alpha.3`, and `files` is present (task 003 has merged).
   - `npm view @liquid-labs/plugable-projects-audit version` is strictly lower than the local `version`.
   - `make qa` is green (build, test at 1 suite / 1 test, lint). **C15**: green is the gate here.

   If any is missing, **halt** — do not patch it in this task. Each belongs to a task that has its own review.

2. **Verify the tarball, and treat this as a hard gate rather than boilerplate.** `npm pack --dry-run` and inspect the file list:
   - **No** entry under `.flow/`, `plan/`, `worktrees/`, `qa/`, `test-staging/`, `node_modules/`, or `.yalc/`.
   - No `npm warn gitignore-fallback`.
   - `dist/plugable-projects-audit.js` present; `src/index.mjs`, `src/projects-audit/index.mjs`, and the eight files under `src/projects-audit/handlers/` present; nothing under `src/handlers/`.
   - Total count **24 or 25**.

   This is not boilerplate: **before task 003's `files` allowlist, this repository packed 50 files**, including Flow session metadata carrying local absolute paths and a complete nested copy of itself. If any such entry is present, task 003's allowlist did not merge into your base — **halt and report**; do not publish it, and do not patch `package.json` here.

   Note that the pack list differs between a Flow task worktree and the main checkout (the worktree has no nested `worktrees/` or `.flow/`, but does carry `plan/`). Say which tree your numbers came from. `plan/` being absent from the list is itself proof the allowlist is working.

3. **Attempt the publish**, recording the command verbatim and its full output:

   ```bash
   npm publish --access public
   ```

   Check whether `--access public` matches how `1.0.0-alpha.2` was published before using it; if the package is currently private/restricted, use the matching flag and say so.

4. **Attempt the deprecation**, recording the command verbatim and its full output:

   ```bash
   npm deprecate @liquid-labs/plugable-projects-audit "Superseded by @sdlcforge/dev-core. This package is no longer maintained; see the README for migration instructions."
   ```

   Deprecating **all** versions (the unscoped form above) is intended — every published version of this package is superseded, not just the final one. If a narrower range is wanted, that is a user decision; say so rather than choosing.

5. **On a block, hand the commands to the user and stop.** If the environment's permission classifier refuses either command, record it as the **expected** outcome, reproduce both commands verbatim (copy-pasteable, with the working directory they must be run from), and note that the deprecation is only meaningful once the publish has succeeded. Do not retry with different flags, do not try `yarn`/`pnpm`, and do not attempt to configure credentials.

6. **Do not archive the GitHub repository, and do not attempt to.** Record it as an explicit follow-up for the user: *"Archive `github.com/liquid-labs/plugable-projects-audit`?"* — with the note that archiving makes the repository read-only, which would block any future correction to the final release, and that `@sdlcforge/dev-core` now carries the code and its history.

7. **Change no file.** This task runs commands and reports. If `npm publish` succeeds it may touch nothing in the working tree; if `prepack` regenerates `dist/`, that directory is gitignored.

## Validation

- **The pre-flight gate of requirement 1 was run and each item recorded**, not summarised.
- **The tarball check of requirement 2 was run**, its file count recorded, and the absence of `.flow/`, `plan/`, and `worktrees/` entries stated explicitly.
- **Both commands appear verbatim in the report**, whether they ran or were blocked, together with the working directory.
- **Outcome is unambiguous**: for each command, one of `succeeded` (with the registry's response), `blocked by the permission classifier` (with the exact refusal), or `not attempted because a prerequisite failed` (naming it). "Attempted" without an outcome is not a result.
- **If the publish succeeded**, `npm view @liquid-labs/plugable-projects-audit version` reports `1.0.0-alpha.3` and `npm view @liquid-labs/plugable-projects-audit description` shows the deprecation-leading text.
- **If the deprecation succeeded**, `npm view @liquid-labs/plugable-projects-audit deprecated` shows the message.
- **Archival was not attempted.** No `gh repo archive` or equivalent appears anywhere in the task's history; the follow-up is recorded as a user decision.
- **Working tree unchanged.** `git status --short` shows no tracked-file modification attributable to this task.

## Assumptions

- Tasks 002 and 003 have both merged into this task's base. Publishing after only one of them produces a final release that is either unlabelled in its metadata or has no README — the reason this task runs last.
- The permission classifier is **expected** to block `npm publish` and `npm deprecate`. This is the established outcome in this wave (D9), and it is a successful completion, not a failure.
- The npm registry is reachable for the read-only `npm view` checks. If it is not, halt at requirement 1 rather than publishing blind.
- Repository archival is out of scope by decision, not by oversight (D10 step 5).

## References

- `plan/notes/plugable-projects-audit-source-inventory.md` — **A7** the packaging defect and the 50-vs-24 file counts requirement 2 guards against, **A0** the version equality with npm's `latest`, **A9**/**C15** the green baseline.
- `plan/phase-13-retire-plugable-projects-audit/003-mark-package-deprecated-and-bump-version.md` — the version, description, and `files` allowlist this task publishes.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D9** (publish attempted and handed to the user when blocked), **D10** (retirement steps 4 and 5).
- `/Users/zane/playground/liquid-labs/liq-projects-lib/worktrees/plan/dev-core-consolidation/plan/phase-10-retire-liq-projects-lib/003-publish-final-and-deprecate-on-npm.md` — the sibling that established the tarball gate; follow its shape.

## Checkpoint hints

- After the requirement 1 pre-flight gate, before the tarball check.
- After the tarball check passes, before attempting the publish.
- After both commands have been attempted or blocked, with their verbatim text and outcomes and the archival follow-up recorded.
