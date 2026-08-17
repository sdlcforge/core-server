# Publish Final And Deprecate On Npm

## Purpose and scope

**Executes in the `liq-projects` repository.** Runs the registry-facing steps of the retirement: publish the final labelled release, then mark every version deprecated on npm.

The expected outcome, on the precedent of the two sibling retirements and renames already completed in this wave, is that both commands are **blocked before they reach the registry** by the environment's command-permission classifier. That is a normal result, not a failure: when it happens, this task's deliverable is the exact commands, the working directory, and the pre-publish verification, recorded verbatim so the user can run them by hand.

Repository archival is deliberately **not** attempted and **not** decided here.

## Requirements

1. **Pre-publish verification** (all read-only), recorded in the task document:
   - `package.json` is at `1.0.0-alpha.16` with the deprecation-bearing `description` (task 003 landed).
   - `README.md` opens with the superseded notice (task 002 landed).
   - `make qa` is green.
   - `npm view @liquid-labs/liq-projects versions --json` and `npm view @liquid-labs/liq-projects` — record the registry's current latest version and whether any deprecation message is already set.
   - `git status --short` is clean and the working branch carries both task 002's and task 003's changes.
2. **Attempt `npm publish`** from the repository root. Note that `prepack` runs `make build`, so the tarball carries a freshly built `dist/liq-projects.js`. Do not add `--access` flags speculatively; the package is `UNLICENSED` and has always been published under its existing configuration.
3. **Attempt `npm deprecate`** for all versions, with a message naming the replacement and telling consumers what to do — e.g. `npm deprecate '@liquid-labs/liq-projects@*' 'Superseded by @sdlcforge/dev-core, which absorbed this plugin's full /projects surface unchanged. Replace this dependency with @sdlcforge/dev-core (swap in a single change: the routes and the GITHUB_API credential registration must never be duplicated or absent).'`
4. **If either command is blocked or fails**: do not retry with variations, do not attempt a workaround, and do not use a different tool to reach the registry. Record the exact command, the exact working directory, the exact failure output, and the required order (publish first, then deprecate) in this task document's status notes, and report that manual user action is required.
5. **Confirm the registry state afterward** with a read-only `npm view`, and state plainly in the report whether anything was actually published.
6. **Do not** run `gh repo archive`, do not change repository settings, and do not delete `src/`. Report repository archival as an open decision for the user, noting the one real precondition: `@sdlcforge/core-server` should have repointed to `@sdlcforge/dev-core` first, since that repoint is owned by a different plan-group.

## Validation

- The task document records, verbatim: both commands, the working directory they must run from, their observed output, and the required ordering.
- A read-only `npm view @liquid-labs/liq-projects versions --json` after the attempt confirms and records the actual registry state — whether `1.0.0-alpha.16` is present or the registry still shows `1.0.0-alpha.15`.
- No file in the repository is modified except this task document: `git status --short` shows only the task document (plus gitignored build output from `prepack`, if a publish attempt got that far).
- No `gh` command was run and no repository setting was changed.
- The report states unambiguously whether manual user action is required and, if so, the exact commands in order.

## Assumptions

- Tasks 002 and 003 have both landed and merged, so the published tarball would carry the superseded README and the bumped, deprecation-bearing `package.json` together. Publishing before both have merged would ship a half-labelled release.
- The environment will most likely block `npm publish` and `npm deprecate`. Both sibling precedents in this wave (`@liquid-labs/liq-integrations`'s retirement and `@sdlcforge/core-cli`'s rename) ended with the commands handed to the user, one of them additionally hitting a registry `401`.
- `npm view` is read-only and normally permitted.
- Publishing does **not** need to wait on `core-server` repointing: a deprecated-but-working release breaks nothing for a consumer still linked to the old package (core-server consumes it through a local `file:.yalc/…` link, not the registry).

## References

- `plan/notes/dev-core-target-shape.md` — decisions D9 (publishing/consumption model) and D10 (retirement policy, archival left to the user).
- `/Users/zane/playground/liquid-labs/liq-integrations/plan/plan-summary-framework-consolidation.md` — the sibling task `004-publish-final-version-and-deprecate-on-npm` and its two recorded follow-ups: the manual-publish handoff and the deliberately-deferred repository archival.
