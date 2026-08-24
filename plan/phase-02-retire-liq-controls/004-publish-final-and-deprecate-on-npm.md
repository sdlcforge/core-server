# Publish Final And Deprecate On Npm

## Purpose and scope

Attempt the final `npm publish` and `npm deprecate` for `liq-controls`, per the retirement policy in `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy`. Runs last, after [`002-author-readme-superseded-notice.md`](./002-author-readme-superseded-notice.md) and [`003-mark-package-deprecated-and-bump-version.md`](./003-mark-package-deprecated-and-bump-version.md) have both merged, so the published tarball carries both changes.

## Requirements

1. Confirm preconditions before attempting anything: [`001-verify-core-server-absorption.md`](./001-verify-core-server-absorption.md) passed, tasks 002 and 003 have both landed on this plan's branch, working tree is clean, `make qa` is green, and `npm pack --dry-run` output looks sane (matches the `files` allowlist task 003 verified).
2. Attempt `npm publish` from the repository root.
3. Attempt `npm deprecate '@liquid-labs/liq-controls' '<deprecation message>'`, using a message consistent with the `README.md` supersession banner authored in task 002.
4. If either command is blocked by the environment (permission classifier, registry authentication, or any other obstacle), do not attempt a workaround — record the exact command(s) that need to be run, and hand them off verbatim for a human with `@liquid-labs` publish rights to execute, per policy (`npm publish`/`npm deprecate`... "handed off verbatim if the environment blocks it").
5. **Repository archival (GitHub) is explicitly out of scope for this task** — record it as an open decision for a human, not performed automatically, per `dev-core-consolidation-contract.md#source-package-retirement-policy`.
6. This task makes no source-code or `package.json` edits — its only possible artifact is the npm registry state itself (and, if both commands succeed cleanly, no repository commit is expected; if blocked, report is the record, mirroring the `liq-orgs` precedent's own handling of this same task).

## Validation

- If `npm publish` succeeds: confirm via `npm view @liquid-labs/liq-controls version` (or equivalent) that the registry now shows the bumped version.
- If `npm deprecate` succeeds: confirm via `npm view @liquid-labs/liq-controls` that a deprecation notice is now attached to the published version(s).
- If either is blocked: the task's report states the exact blocking symptom (classifier rejection, registry 401/404, or other) and the exact command(s) for a human to run, matching the specificity of the `liq-orgs` precedent's own handoff (`cd <repo> && npm publish && npm deprecate '<pkg>' '<message>'`).
- No unintended file changes: `git status` shows nothing to commit from this task (or, if a commit was made, it is limited to whatever this task's own requirements explicitly call for — none are expected).

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy` — the policy this task implements the publish/deprecate half of.
- `liq-orgs`'s own `004-publish-final-and-deprecate-on-npm.md` outcome, recorded in its `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — precedent for the expected blocked-by-classifier / blocked-by-registry outcome and handoff format.
