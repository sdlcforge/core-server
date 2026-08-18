# Mark Package Deprecated, Bump Version, And Fix Packaging

## Purpose and scope

**Executes in the `plugable-projects-audit` repository** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`).

Put the retirement into the package metadata itself — the `description` npm shows in search results, on the registry page, and in `npm view`, which is what a reader sees *before* they ever open the README — bump the version so a final labelled release is publishable at all, and add the `files` allowlist that keeps Flow's artifacts out of the tarball.

Scope is exactly one file: `package.json`. **No `README.md` change** (that is task 002), no source change, no `.gitignore` change, no `.npmignore`.

## Requirements

1. **Author the `description`.** It is currently `""` — the empty string — so this is authoring, not rewriting, and it is also why the running server reports this plugin with no summary at all today (D5). It must **lead** with the deprecation and name the replacement. Something in the shape of:

   > DEPRECATED — superseded by @sdlcforge/dev-core. Formerly provided npm dependency audit and auto-fix endpoints for a plugable-express server.

   Keep it to one line; npm truncates. Do not describe it as a compliance or policy tool — it is npm dependency auditing (source inventory **A0**).

2. **Bump the version to `1.0.0-alpha.3`.** The current version, `1.0.0-alpha.2`, is **identical to npm's `latest`** (`npm view @liquid-labs/plugable-projects-audit dist-tags` → `latest: '1.0.0-alpha.2'`), so without a bump task 004's publish is rejected outright. Confirm the registry's `latest` yourself before choosing the number; if it has moved past `1.0.0-alpha.2` since plan-authoring, pick the next patch above whatever `latest` actually is and **say so in the report**.

   **Edit the `version` field directly. Do not use `npm version`** — it creates its own commit and tag, which inside a Flow task worktree produces a commit the task's own machinery did not make and a tag on the wrong branch. (Its `preversion` hook, `npm test && make lint`, would in fact pass here — this package is green, **C15** — so the reason to avoid it is purely the commit/tag side-effect.)

3. **Add a `files` allowlist** (correction **C9**):

   ```json
   "files": ["dist", "src", "make", "Makefile", ".sdlc-data.yaml"]
   ```

   **This is derived from the actual published tarball, not invented.** The unpacked `1.0.0-alpha.2` release is readable without a network call at `/Users/zane/playground/sdlcforge/core-server/node_modules/@liquid-labs/plugable-projects-audit/` and contains exactly 24 files: `dist/plugable-projects-audit.js` and its `.map`, the eight `make/*.mk` files, `Makefile`, `package.json`, `.sdlc-data.yaml`, and the eleven files under `src/`. The allowlist above reproduces that set (with `src/` now holding the restructured layout); npm adds `package.json` and `README.md` on its own. **Confirm the reference set yourself** with the `find` in `## Validation` before writing the field.

   Two traps specific to this repository:
   - **`dist/` must be named explicitly even though `.gitignore` contains `/dist`.** The published tarball demonstrably contains `dist/` anyway, so "the `.gitignore` already handles it" reasoning is empirically wrong here, and `main` points at `dist/plugable-projects-audit.js`.
   - **Do not create an `.npmignore` instead.** It *disables* the `.gitignore` fallback npm currently uses, so `qa/`, `test-staging/`, `.yalc/`, and `node_modules/` would all have to be re-listed by hand — more surface, more ways to get it wrong.

   Without this, the final release ships **50 files** instead of 24: `.flow/` session metadata containing local absolute paths and a session UUID, `plan/manifest.yaml`, and **23 files under `worktrees/plan/dev-core-consolidation/` — a complete nested second copy of the package, including a 403 kB `package-lock.json`.** This is the worst instance of C9 in the plan-group.

   If the allowlist changes the tarball's contents relative to the published release in *any* way beyond adding `README.md` and reflecting the phase-12 restructure of `src/`, **halt and report** rather than adjusting it by intuition.

4. **Change nothing else in `package.json`.** Not the `name`, not `main`, not the four `dependencies` (in particular, leave `@liquid-labs/http-smart-response` at the `^1.0.0-alpha.6` phase 11 set — do **not** revert it to a `file:` spec, and do not upgrade it), not the `devDependencies`, not the scripts, not `_npm-check-plus`.

5. **Verify from a fresh clone, not just from this worktree.** A pack run from a Flow *task worktree* has a different file set than one from the main checkout — the worktree has no nested `worktrees/` or `.flow/`, but does carry `plan/` — so "it looked fine when I packed it" is not transferable evidence between the two. Do the before/after `npm pack --dry-run` comparison in a throwaway clone of the **main checkout's** state where the pollution is actually visible, or state clearly which tree each number came from.

## Validation

- **Scope is one file.** `git diff --name-only` (against the task's base) lists exactly `package.json`.
- **`description` leads with the deprecation** and names `@sdlcforge/dev-core`. `node -p "require('./package.json').description"` is non-empty and its first word marks the deprecation.
- **`version` is `1.0.0-alpha.3`** (or the justified alternative from requirement 2), and is strictly greater than `npm view @liquid-labs/plugable-projects-audit version`.
- **No `npm version` side-effects.** `git log --oneline -1` is this task's own commit, and `git tag --points-at HEAD` is empty.
- **The reference set is confirmed, not assumed.** `find /Users/zane/playground/sdlcforge/core-server/node_modules/@liquid-labs/plugable-projects-audit -type f | sed 's|.*/plugable-projects-audit/||' | sort` lists 24 paths matching the description in requirement 3. Record the output.
- **The `gitignore-fallback` warning is gone.** `npm pack --dry-run 2>&1 | grep gitignore` returns nothing, because a `files` field takes precedence. Its disappearance is the proof the allowlist is in effect.
- **The pack list is clean.** `npm pack --dry-run 2>&1 | sed -n '/Tarball Contents/,/Tarball Details/p'` contains **no** entry under `.flow/`, `plan/`, `worktrees/`, `qa/`, `test-staging/`, `node_modules/`, or `.yalc/`, and the file count drops from **50** to **24 or 25** (25 once `README.md` from task 002 has merged).
- **`main` is still packed.** `dist/plugable-projects-audit.js` appears in the pack list, and `node -p "require('./package.json').main"` still reads `dist/plugable-projects-audit.js`.
- **`src/` is packed at the restructured paths.** The pack list contains `src/index.mjs`, `src/projects-audit/index.mjs`, and the eight files under `src/projects-audit/handlers/`, and contains nothing under `src/handlers/`.
- **Dependencies untouched.** `git diff package.json` shows changes only to `description`, `version`, and the added `files` array. `grep -n 'file:' package.json` returns nothing.
- **Green.** `make build`, `make test` (1 suite / 1 test passing), `make lint`, and `make qa` all pass. Per **C15**, green is the gate here — this package is unaffected by the plan-group's Node-26 `SlowBuffer` failures.

## Assumptions

- Phase 13 task 001 returned `PASS`.
- Phase 11 has merged into this task's base (so `make test` passes in a fresh worktree, and so `@liquid-labs/http-smart-response` is already at `^1.0.0-alpha.6`).
- This task and task 002 are parallel-eligible: disjoint files (`package.json` vs `README.md`). Both land in this repository, so they need separate task worktrees and a merge order. Task 004 runs after **both** have merged, so the published tarball carries both.
- The npm registry is reachable for the `npm view` check. If it is not, halt rather than guessing at `latest`.
- `npm pack --dry-run` runs the `prepack` script (`make build`), so `dist/` will exist when the pack list is computed even in a tree that has not been built.

## References

- `plan/notes/plugable-projects-audit-source-inventory.md` — **A7** the packaging defect with the full 50-file breakdown and the 24-file published reference, **A0** the package facts including the empty `description` and the version equality with npm's `latest`, **A9**/**C15** the green baseline.
- `/Users/zane/playground/liquid-labs/liq-projects-lib/worktrees/plan/dev-core-consolidation/plan/phase-10-retire-liq-projects-lib/002-mark-package-deprecated-and-bump-version.md` — the sibling that established this remedy pattern; follow its shape.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D5** (why `description` is the server-visible plugin summary), **D10**.
- `/Users/zane/playground/sdlcforge/core-server/node_modules/@liquid-labs/plugable-projects-audit/` — the unpacked published tarball, the reference the allowlist is derived from.

## Checkpoint hints

- After the reference `find` and the `npm view` check, before editing.
- After the `description` and `version` edits, before the `files` allowlist.
- After the `files` allowlist, with the before/after pack counts (50 → 24 or 25) and the reference `find` output recorded, and `make qa` green.
