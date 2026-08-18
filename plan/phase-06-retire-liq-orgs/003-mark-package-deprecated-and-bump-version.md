# Mark Package Deprecated And Bump Version

## Purpose and scope

**Executes in the `liq-orgs` repository** (`/Users/zane/playground/liquid-labs/liq-orgs`).

Author `package.json`'s `description` so it leads with the deprecation, and bump the version to `1.0.0-alpha.8` — the final release of `@liquid-labs/liq-orgs`, per D10 step 3.

`package.json` is the **only** file this task touches. The README belongs to task 002 (parallel-eligible with this one); the publish attempt belongs to task 004.

The `description` matters more than its size suggests: per D5, `plugable-express`'s loader takes a plugin's server-visible `summary` from `package.json` `description`, not from any module export. It is currently `""`, so this package reports an empty summary in the server's plugin list and generated API spec today. Whatever is written here is what a server still loading this package will display.

## Requirements

1. **Author the `description`, leading with the deprecation.** It is currently the empty string. One sentence, deprecation first, superseding package named. Something in the shape of:

   > DEPRECATED — superseded by @sdlcforge/dev-core. Organization management plugin for a @liquid-labs/plugable-express server; org data and routes are now served from @sdlcforge/dev-core's `orgs` submodule.

   Two constraints on the wording, both from source:
   - Keep it a single line and reasonably short — `npm` truncates long descriptions in search output, and `plugable-express` displays it as the plugin `summary`.
   - `plugable-express` strips the trailing phrase `for a @liquid-labs/plugable-express server` from the description when deriving the summary (`load-plugins.js:22`, regex ` +(?:for|in) a @liquid-labs\/plugable-express server`). If you include that phrase mid-sentence, be aware it will be removed from the displayed summary; write something that still reads correctly after the strip, or omit the phrase.

2. **Set `version` to `1.0.0-alpha.8`** (from `1.0.0-alpha.7`). Edit the field directly rather than running `npm version`, which would create a git tag and a commit this plan does not want — and which triggers `preversion: make qa` as a side effect at an awkward moment.

3. **Add or correct a `files` allowlist.** Run `npm pack --dry-run` before making any change: this repo has no `files` field and no `.npmignore`, so `npm pack` falls back to a stale `.gitignore` and will pick up this Flow planning session's own local artifacts (`.flow/`, `plan/manifest.yaml`, and a full nested copy of the package under `worktrees/plan/dev-core-consolidation/`, lockfile included) alongside the real package contents. Compare against the currently-published `1.0.0-alpha.7` tarball's actual contents (`npm view @liquid-labs/liq-orgs dist.tarball`, or inspect an installed copy) and add a `files` field listing only what the published tarball actually needs (e.g. `dist`, `src`, `Makefile` — confirm against the real tarball rather than guessing). This is permitted in addition to `version`/`description`.

4. **Change nothing else in `package.json`.** Not `name`, `main`, `scripts`, `engines`, `keywords`, `author`, `license`, `repository`, `bugs`, `homepage`, `dependencies`, or `devDependencies`. In particular:
   - Do **not** add `"deprecated"` as a `package.json` field. npm deprecation is a registry operation (`npm deprecate`), which task 004 performs; a `deprecated` key in the manifest is not a supported npm mechanism and would be noise.
   - Do **not** re-add `@liquid-labs/playground-monitor`. Phase 5 task 001 reverted a stray uncommitted `file:.yalc/…` entry for it; if it is present again, that is a regression — halt and report rather than accepting it.
   - Do **not** migrate the `catalyst-resource-*` devDependencies. This package is being retired; a toolchain migration on its final release is pure risk.

5. **Verify the package still builds and passes QA** after the edit — `make qa` (which runs lint and test) must be green, since task 004 will publish from this state.

## Validation

- **`git diff` on `package.json` shows changes on exactly three fields**: `version`, `description`, and the added/corrected `files` array. Any other changed line fails this task.
- `version` is exactly `1.0.0-alpha.8`.
- `description` is non-empty, is a single line, names `@sdlcforge/dev-core`, and leads with the deprecation — a reader seeing only the first six words knows the package is deprecated.
- **The derived summary reads correctly.** Apply `plugable-express`'s strip regex (` +(?:for|in) a @liquid-labs/plugable-express server`) to the description and confirm the result is still a grammatical, informative sentence. This is a 30-second check that prevents a mangled string appearing in the server's plugin list.
- **`package.json` is valid JSON** and `npm pkg get name version description` returns the expected values.
- **`make qa` passes** — lint clean and 1 suite / 37 tests green. (The suite lives at `src/orgs/resources/lib/test/settings.test.mjs` after phase 5's restructure.)
- **`git status` shows exactly one changed path: `package.json`.** No other tracked file is modified, no file added.
- `npm pack --dry-run` succeeds and the resulting file list contains no `.yalc` path, no unresolvable `file:` dependency, **and no `.flow/`, `plan/`, or `worktrees/` path** — a sanity check that the final tarball is publishable and clean before task 004 attempts it.

## Assumptions

- Phase 6 task 001 passed. Marking a package deprecated before its replacement demonstrably carries the code would be premature.
- This task is parallel-eligible with task 002 (README). They touch disjoint files. Task 004 runs after **both** have merged, so the published tarball carries both changes.
- `1.0.0-alpha.8` is the correct next version: the current committed version is `1.0.0-alpha.7`, and `@sdlcforge/core-server` depends on `^1.0.0-alpha.6`, which resolves forward to `1.0.0-alpha.8`. That is intended — core-server should pick up the deprecation notice while it is still linked to this package, before its own plan-group repoints it.
- Do not run `npm version`, `npm publish`, or `npm deprecate` here. Task 004 owns all registry interaction.

## References

- `plan/notes/liq-orgs-source-inventory.md` — current package facts (`version` `1.0.0-alpha.7`, `description` `""`), the dependency set, and the stray `playground-monitor` entry's history.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-03-retire-liq-projects/003-mark-package-deprecated-and-bump-version.md` — the sibling task.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — D5 (`description` becomes the plugin summary), D10 (retirement policy step 3).
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/load-plugins.js` — line 22, the summary-derivation strip regex.

## Checkpoint hints

- After the `package.json` edit, with `git diff` confirming exactly two changed lines, before running `make qa`.
