# Publish Final And Deprecate On Npm

## Purpose and scope

**Executes in the `liq-orgs` repository** (`/Users/zane/playground/liquid-labs/liq-orgs`).

The last step of `@liquid-labs/liq-orgs`'s retirement (D10 steps 4 and 5): attempt `npm publish` of the final `1.0.0-alpha.8` release, attempt `npm deprecate` on the package, and — when the environment blocks either, which is the expected outcome — hand the exact commands to the user verbatim rather than working around the block.

Repository archival is **deliberately not attempted** and is recorded as an explicit user decision.

## Requirements

1. **Confirm the preconditions before touching the registry.** Registry operations are irreversible in practice (a published version cannot be replaced, and `npm deprecate` is user-visible immediately). Verify, and halt if any fails:
   - Phase 6 task 001's verification gate passed.
   - Tasks 002 and 003 have both landed on the branch you are publishing from: `README.md` exists as the superseded notice, `package.json` `version` is `1.0.0-alpha.8`, and `description` leads with the deprecation.
   - The working tree is clean and `make qa` is green.
   - `npm pack --dry-run` lists a sane file set: `dist/liq-orgs.js`, `README.md`, `package.json`, and no `.yalc` paths, no `worktrees/`, no `plan/`, no unresolvable `file:` dependency.

2. **Attempt `npm publish`.** Run it from the repository root. The expected outcome in this environment is a refusal by the permission classifier (this is the established pattern for `@sdlcforge/core-cli` and `@liquid-labs/liq-integrations` in this same wave). **Do not attempt to work around a refusal** — no credential manipulation, no `--dry-run` substitute presented as success, no alternate registry, no `npm login`. Capture the exact command and the exact output.

3. **Attempt `npm deprecate`.** The command is:

   ```
   npm deprecate @liquid-labs/liq-orgs "Superseded by @sdlcforge/dev-core; the /orgs routes and the app.ext._liqOrgs contract now come from @sdlcforge/dev-core's orgs submodule. No further releases."
   ```

   Note the **unscoped range** — deprecating the whole package, not one version — which is what D10 intends: every published version should carry the notice, not just the final one. Same rules on refusal: capture, do not work around.

4. **Hand the exact commands to the user.** The task report ends with a verbatim, copy-pasteable block containing both commands exactly as they should be run, plus the directory to run them from, plus a one-line note that both must be run by a human with publish rights to the `@liquid-labs` scope. If either command succeeded, say so precisely and omit it from the handoff block rather than asking the user to re-run it.

5. **Record repository archival as an open user decision.** Do **not** run `gh repo archive`, do not open a PR that does, and do not schedule it. Record in the report: archiving `github.com/liquid-labs/liq-orgs` is a reasonable follow-up once `core-server` has repointed to `@sdlcforge/dev-core`, it is not required by this plan, and it is the user's call. Note the one concrete consideration that argues for waiting: `@liquid-labs/liq-roles` and `@liquid-labs/liq-test-lib` still declare a dependency on this package, and archiving the repo would make its history harder to reach if either is ever revived.

6. **Do not edit any file.** This task runs commands and writes a report. If a precondition is unmet, halt and name the task that owns fixing it.

## Validation

- The report contains, for each of `npm publish` and `npm deprecate`: the exact command, the exact output or refusal message, and an unambiguous succeeded/blocked verdict. No paraphrase.
- **No workaround was attempted.** The report affirms that no credentials were modified, no `npm login` was run, no registry was changed, and no publish was simulated and reported as real.
- **No file was modified.** `git status --porcelain` is clean (allowing gitignored build outputs), and no commit was created.
- If `npm publish` succeeded: `npm view @liquid-labs/liq-orgs version` returns `1.0.0-alpha.8` and `npm view @liquid-labs/liq-orgs description` returns the deprecation-leading description.
- If `npm deprecate` succeeded: `npm view @liquid-labs/liq-orgs deprecated` returns the message from requirement 3.
- The handoff block is copy-pasteable as-is — correct quoting, correct package name, correct working directory.
- Repository archival is recorded as an open user decision, and no archival command was run.

## Assumptions

- **The expected outcome is that both commands are blocked**, and that is a successful completion of this task, not a failure. The deliverable is a faithful attempt plus an exact handoff. This matches the established outcome for `@sdlcforge/core-cli` and `@liquid-labs/liq-integrations` in this wave.
- This task runs **after both** task 002 and task 003 have merged, so the published tarball carries the README and the metadata together. Publishing after only one would ship a half-labelled final release.
- Publishing does not break `@sdlcforge/core-server`. It depends on `^1.0.0-alpha.6`, which resolves forward to `1.0.0-alpha.8`; the release is functionally identical to `1.0.0-alpha.7` apart from the README, the `description`, and the relocation of source under `src/orgs/` (whose bundle entry and route surface are unchanged). A deprecation notice is advisory and breaks nothing.
- `npm deprecate` will surface a warning to `@liquid-labs/liq-roles` and `@liquid-labs/liq-test-lib` on their next install. Both are dormant, and `liq-test-lib` is already broken independently. This is expected and is not a reason to skip the deprecation.

## References

- `plan/notes/liq-orgs-source-inventory.md` — package identity, consumer inventory, and the dormant-dependent detail behind the archival consideration.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-03-retire-liq-projects/004-publish-final-and-deprecate-on-npm.md` — the sibling task.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — D9 (publishing/handoff-on-block), D10 steps 4–5.

## Checkpoint hints

- After the precondition checks in requirement 1, before the first registry command.
- After both attempts, before composing the handoff block.
