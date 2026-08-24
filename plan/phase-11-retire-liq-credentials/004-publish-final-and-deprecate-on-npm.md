# Publish Final And Deprecate On Npm

## Purpose and scope

Attempt the final `npm publish` and `npm deprecate` for `@liquid-labs/liq-credentials`, per the [source-package retirement policy](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy). Runs last, after [`002-author-readme-superseded-notice.md`](./002-author-readme-superseded-notice.md) and [`003-mark-package-deprecated-and-bump-version.md`](./003-mark-package-deprecated-and-bump-version.md) have both merged, so the published tarball carries both changes.

## Requirements

1. **Confirm preconditions before attempting anything.** [`001-verify-core-server-absorption.md`](./001-verify-core-server-absorption.md) passed; tasks 002 and 003 have both landed; the working tree is clean; `make qa` is green; and `npm pack --dry-run` output is sane and matches what task 003 recorded. Halt and report if any precondition fails — do not publish a tarball whose contents were not verified.

2. **Attempt `npm publish`** from the repository root. Note that `prepack` runs `make build`, so the bundle is rebuilt as part of the publish; a build failure here is a hard stop, not something to work around with `--ignore-scripts`.

3. **Attempt `npm deprecate '@liquid-labs/liq-credentials' '<deprecation message>'`**, with a message consistent with the `README.md` supersession banner authored in task 002 (naming `@sdlcforge/core-server` as the successor). Consider whether the deprecation should apply to all published versions rather than only the newest — state which was chosen and why.

4. **Do not work around a block.** If either command is refused by the environment (permission classifier, registry authentication, npm scope rights, or any other obstacle), record the exact command(s) that need to be run and hand them off verbatim for a human with `@liquid-labs` publish rights, per policy. No credential hunting, no alternate registry, no `--force`.

5. **Repository archival (GitHub) is explicitly out of scope.** Record it as an open decision for a human rather than performing it, per the retirement policy.

6. **This task makes no source-code or `package.json` edits.** Its only possible artifact is npm registry state. If both commands succeed cleanly, no repository commit is expected; if blocked, the task report is the record.

## Validation

- If `npm publish` succeeds: `npm view @liquid-labs/liq-credentials version` shows the bumped version task 003 set.
- If `npm deprecate` succeeds: `npm view @liquid-labs/liq-credentials` shows a deprecation notice attached to the affected version(s), and the notice text names `@sdlcforge/core-server`.
- If either is blocked: the report states the exact blocking symptom (classifier rejection, registry 401/403/404, missing scope rights, or other) and the exact command(s) for a human to run — at the specificity of `cd /Users/zane/playground/liquid-labs/liq-credentials && npm publish && npm deprecate '@liquid-labs/liq-credentials' '<message>'`, with the real message substituted.
- The GitHub-archival open decision is stated in the report as a human decision, not acted on.
- No unintended file changes: `git status` shows nothing to commit from this task.

## References

- [`dev-core-consolidation-contract.md#source-package-retirement-policy`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy) — the policy this task implements the publish/deprecate half of.
- `/Users/zane/playground/liquid-labs/liq-controls/worktrees/plan/core-server-domain-consolidation/plan/phase-02-retire-liq-controls/004-publish-final-and-deprecate-on-npm.md` — the sibling donor's equivalent task.
- `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — precedent for the expected blocked-by-classifier / blocked-by-registry outcome and the handoff format.
