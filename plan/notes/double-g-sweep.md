# Double-g reference sweep

## Purpose and scope

Records the independent, repo-wide investigation performed during planning for the `pluggable-defaults-rename` plan-group's slice in `liq-work`, confirming whether any genuine double-g ("pluggable-defaults") content reference, hardcoded double-g GitHub link, or naming mismatch against `@liquid-labs/plugable-defaults`'s exported API exists in this repo that would need to change once [pluggable-defaults](https://github.com/liquid-labs/pluggable-defaults)'s own rename (directory rename, GitHub repo rename, and the `src/locations.mjs` regression revert — phase 1, tasks 001-004 of that project's own plan) lands.

## Method

Enumerated every git-tracked file in the repo (`git ls-files`, 76 files) plus untracked/gitignored content outside `node_modules/`, `.git/`, `worktrees/`, `.yalc/`, `dist/`, `test-staging/`, and `qa/` (the latter three are gitignored build/test-scratch outputs rebuilt from `src/`). Ran from the plan worktree root (`/Users/zane/playground/liquid-labs/liq-work/worktrees/plan/pluggable-defaults-rename`), which mirrors the working tree's tracked/untracked content at plan-creation time:

```bash
git grep -ni 'pluggable' -- .
git grep -ni 'liquid-labs/pluggable' -- .
grep -rniI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=worktrees \
  --exclude-dir=.yalc --exclude-dir=dist --exclude-dir=test-staging --exclude-dir=qa \
  'pluggable' .
grep -rniI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=worktrees \
  --exclude-dir=.yalc --exclude-dir=dist -E 'PLUG(G)?ABLE_(CLI_SETTINGS_PATH|PLAYGROUND)' .
grep -rniI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=worktrees \
  --exclude-dir=.yalc --exclude-dir=dist 'plugable-defaults' .
```

Also directly inspected the resolved npm package at `node_modules/@liquid-labs/plugable-defaults/src/locations.mjs` (from the real, currently-installed `1.0.0-alpha.4` tarball, published to the npm registry in Nov 2023) to confirm which names it actually exports, and grepped every `src/**` import site of `@liquid-labs/plugable-defaults` to confirm which names `liq-work` actually imports.

## Findings

**1. No genuine double-g content reference exists anywhere in this repo.** The only "pluggable" hits (both `git grep` and the broader untracked-inclusive grep) are a single historical, already-merged sentence in `plan/plan-summary-modernization-foundation.md` (line 5), which records a prior planning session's mention of the *separate, unrelated* `@liquid-labs/pluggable-express` package (a different framework package, not `pluggable-defaults`, and covered by its own already-planned `pluggable-express-rename` plan-group) — accurate historical record of that prior session's synthesis input, not live content to change, and out of this plan's scope regardless. No hardcoded link to `https://github.com/liquid-labs/pluggable-defaults` (or any `liquid-labs/pluggable*` URL) exists anywhere. No prose spells out "pluggable-defaults" (double-g) when referring to this dependency by name — `README.md`'s "Plugin integration" section correctly says `@liquid-labs/plugable-express` (single-g, and referring to the express framework, not pluggable-defaults). No CI/build/lint config references a double-g repo name or org path (this repo has no `.github/` CI workflow files).

**2. No naming mismatch exists between `liq-work`'s imports and `@liquid-labs/plugable-defaults`'s exported API.** `liq-work` imports exactly one export from the package, `PLUGABLE_PLAYGROUND` (single-g), at four call sites:

- `src/handlers/work/resume.mjs:7,34`
- `src/handlers/work/projects/_lib/remove-lib.mjs:7,30`
- `src/handlers/work/_lib/pause-lib.mjs:7,32`
- `src/handlers/work/_lib/work-db.mjs:15,29`

`PLUGABLE_CLI_SETTINGS_PATH` is not imported or referenced anywhere in this repo. The resolved, currently-installed npm package (`node_modules/@liquid-labs/plugable-defaults@1.0.0-alpha.4`, matching `package.json`'s `^1.0.0-alpha.4` spec and `package-lock.json`'s locked resolution to the real `registry.npmjs.org` tarball) exports both names in the correct, single-g spelling:

```js
// node_modules/@liquid-labs/plugable-defaults/src/locations.mjs
export const PLUGABLE_CLI_SETTINGS_PATH = () => process.env.PLUGABLE_CLI_SETTINGS_PATH
export const PLUGABLE_PLAYGROUND = () => process.env.PLUGABLE_PLAYGROUND
```

This confirms directly (not by assumption) that `liq-work`'s import (`PLUGABLE_PLAYGROUND`, single-g) matches the installed package's actual export name. This published version predates the double-g regression described in `pluggable-defaults`'s own phase 1 plan (which affects that project's *current source*, not the already-published `1.0.0-alpha.4` tarball `liq-work` depends on), so there is no live or latent bug here — the earlier investigation's "package doesn't exist" claim that this plan-group corrects is separately and independently confirmed false: the package resolves and installs cleanly, and the resolved names are already correct single-g.

**3. No `PLUGABLE_*`/`PLUGGABLE_*` environment variable or on-disk config-directory path is read, written, or referenced by `liq-work` itself.** `liq-work` never reads `process.env.PLUGABLE_PLAYGROUND` or `process.env.PLUGABLE_CLI_SETTINGS_PATH` directly — it only calls the imported accessor functions, which read those env vars internally inside `@liquid-labs/plugable-defaults`. No config-directory path segment (e.g. a `.plugable-defaults`-style dotfile/dir name) is hardcoded anywhere in `liq-work`'s source, `README.md`, `Makefile`, or `package.json`.

**4. `.flow/plans/pluggable-defaults-rename.json` and this plan's own `plan/manifest.yaml`/`plan/TODO.yaml` bookkeeping** are expected to carry the double-g plan slug (`pluggable-defaults-rename`) — this is the plan-group's own identifier, not a defect, and must not be "fixed."

## Conclusion

This project's slice of the `pluggable-defaults-rename` plan-group requires no source, doc, or config changes. `liq-work`'s `package.json` dependency spec, its four `PLUGABLE_PLAYGROUND` import sites, and the resolved npm package's actual exports are all already consistently single-g. Registered as a single lightweight verification task (phase 2, `plan/phase-02-verification-sweep/001-verify-no-double-g-references.md`) that re-runs this sweep as its Validation step, to be executed after `pluggable-defaults`'s own phase 1 tasks (directory rename, GitHub repo rename, and the `src/locations.mjs` regression revert) have landed, so the verification is definitive against the dependency's fully-corrected post-rename state rather than a point-in-time snapshot.
