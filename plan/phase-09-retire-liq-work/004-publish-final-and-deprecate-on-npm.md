# Publish Final And Deprecate On Npm

## Purpose and scope

**Executes in the `liq-work` repository** (`/Users/zane/playground/liquid-labs/liq-work`), in this task's own worktree.

The last step of the retirement: publish `@liquid-labs/liq-work@1.0.0-alpha.11` — the final release, carrying task 9-002's superseded README and task 9-003's deprecation-bearing description — and mark the package deprecated on the registry so `npm install` prints a warning.

Both operations are expected to be **blocked by the environment's permission classifier**, exactly as they were for `@sdlcforge/core-cli` and `@liquid-labs/liq-integrations` in this same wave. When that happens, the deliverable is not a publish; it is a **precise, copy-pasteable handoff** to the user. Do not attempt to work around a refusal.

## Requirements

1. **Verify the tarball before attempting anything.** Both preceding tasks must have merged into your base:
   - `package.json` `version` is `1.0.0-alpha.11` (or whatever task 9-003 recorded) and `description` leads with the deprecation naming `@sdlcforge/dev-core`.
   - `README.md` is the superseded notice.
   - `npm pack --dry-run` succeeds and lists the expected file set. **Inspect the list** — confirm `dist/liq-work.js` is present (so the package still works for anyone still loading it, per D10 — `src/` is not stripped) and that `test-staging/`, `qa/`, `node_modules/`, `.yalc/`, `worktrees/`, and `.flow/` are **not**.
   - The version is not already published: `npm view @liquid-labs/liq-work@1.0.0-alpha.11` reports it does not exist.

   If any check fails, **halt and report** — do not publish a tarball that does not carry both changes.

2. **Build the artifact the tarball will contain.** `make build` must succeed and produce `dist/liq-work.js`. Note that `prepack` runs `npm run build`, so a broken build blocks the publish anyway; running it first makes the failure legible.

3. **Attempt `npm publish`.** Run it. Record the **exact** command and the **exact** output, whether it succeeds, is refused by the permission classifier, or fails on registry authentication.

4. **Attempt `npm deprecate`.** Regardless of 3's outcome, record and attempt:

   ```
   npm deprecate @liquid-labs/liq-work "Superseded by @sdlcforge/dev-core. All 30 /work routes, the workKey path var, and app.ext.constants.WORK_DB_PATH are carried forward unchanged under dev-core's src/work/ submodule. See https://github.com/sdlcforge/dev-core."
   ```

   Deprecating the **whole package** (no version range) is correct here — every published version is superseded, not just the last. Match the message style the sibling retirements used; read at least one before writing yours.

5. **Produce the user handoff.** If either command is blocked, the report must contain a block the user can paste verbatim:
   - the exact `cd` into the repository,
   - the exact `npm publish` command,
   - the exact `npm deprecate` command with its full message,
   - the prerequisite (`npm whoami` must resolve to an account with publish rights on the `@liquid-labs` scope),
   - and what to expect on success.

   Do **not** paraphrase the commands, do **not** substitute placeholder text, and do **not** attempt to acquire credentials, edit `.npmrc`, or find another route to the registry. A blocked publish handed over cleanly is the successful outcome of this task.

6. **Record repository archival as a user decision — do not perform it.** Archiving `github.com/liquid-labs/liq-work` is irreversible-ish, affects issue history and any open PRs (the repository has several `work-liquid-labs/liq-work/*` branches on `origin` and `workspace` remotes), and is not this plan's call. Record it as an explicit follow-up with the `gh repo archive liquid-labs/liq-work` command for the user, and note the sibling donors will want the same decision made consistently across all four.

7. **Change no files.** This task publishes; it does not edit. If `npm publish` succeeds and mutates nothing locally, `git status --porcelain` should be clean apart from gitignored build outputs.

## Validation

- **The tarball contents were inspected, not assumed.** The `npm pack --dry-run` file list is in the report, with `dist/liq-work.js` present and the excluded directories confirmed absent.
- **Both commands were attempted** and their exact invocations and outputs are recorded verbatim — including the refusal text, if refused.
- **The handoff block is copy-pasteable** and contains no placeholders, no `<your-token-here>`, and no paraphrase. A reader can select it, paste it into a shell, and have it work.
- **No workaround was attempted.** No `.npmrc` was written, no token was sought, no alternative registry was configured, no `--force` was used.
- **Archival was not performed.** `gh repo view liquid-labs/liq-work --json isArchived` reports `false`, and the archival command appears only as a recorded follow-up.
- **No file changed.** `git status --porcelain` is clean apart from gitignored build outputs. No commit was created by this task unless `npm publish` itself succeeded and something (e.g. nothing, normally) required committing — in which case say exactly what.
- **The final state is stated plainly** at the top of the report: published or blocked; deprecated or blocked; archival pending user decision.

## Metadata

architectural_impact: false

## Assumptions

- **Both `npm publish` and `npm deprecate` are expected to be refused.** That is the established outcome in this environment for `@sdlcforge/core-cli` and `@liquid-labs/liq-integrations` in this same wave. A refusal is **not** a task failure; an un-recorded or paraphrased refusal is.
- **`preversion` runs `npm run qa`, and `qa` fails** because `work-db.test.js` cannot load on Node ≥ 24 (`buffer-equal-constant-time` / `SlowBuffer`). This does **not** block `npm publish`, which runs `prepack` (→ `npm run build`), not `preversion`. If some npm configuration does invoke `qa` on publish, **halt and report** rather than disabling the script or forcing past it — the whole plan-group has agreed this defect is a manager-level decision, not a task-level workaround.
- **The published package still works for anyone loading it**, subject to that same Node-version limitation, because D10 keeps `src/` and `dist/` intact and publishes no shim. The retirement is a labelled final release, not a deletion.
- **This task runs last in the phase**, after tasks 9-002 and 9-003 have both merged, so the single published tarball carries both the superseded README and the deprecated description. If either is missing from your base, halt.
- **Phase 9 task 001 passed.** Publishing a deprecation that points at `@sdlcforge/dev-core` asserts that dev-core carries the code.

## References

- `plan/notes/liq-work-source-inventory.md` — **W0** package facts, **W6** the single-dependent consumer inventory the deprecation message implicitly addresses, **W5** the Node-version caveat.
- `plan/phase-09-retire-liq-work/003-mark-package-deprecated-and-bump-version.md` — the version and description this task publishes.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-06-retire-liq-orgs/004-publish-final-and-deprecate-on-npm.md` — the sibling task; match its handoff format and deprecation-message style.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D9** (publishing and how consumers pick dev-core up) and **D10** steps 4–5 (publish/deprecate attempt; archival as a user decision).

## Checkpoint hints

- After requirement 1's verification, with the `npm pack --dry-run` file list recorded and before any registry command.
- After the `npm publish` attempt, with its exact output recorded.
- After the `npm deprecate` attempt, with its exact output recorded.
- After the handoff block and the archival follow-up are written.
