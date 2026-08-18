# Mark Package Deprecated And Bump Version

## Purpose and scope

**Executes in the `liq-projects` repository.** Touches `package.json` only.

Put the deprecation into the package metadata itself — the `description` npm shows in search results and the registry page — and bump the version so a final, clearly-labelled release can be published. Metadata only: no dependency pruning, no `private` flag, no `src/` change.

## Requirements

1. **Rewrite `description`** to lead with the deprecation and name the replacement. It must state, in one or two sentences, that the package is deprecated/superseded by `@sdlcforge/dev-core` and that consumers should depend on that package instead. Keep enough of the original meaning that the entry still says what the package did (the project lifecycle: NPM package, playground clone, and GitHub repository triad) — the string is the human-facing summary in registry listings and, for a plugable-express server, the plugin summary the server reports.
2. **Bump `version`** from `1.0.0-alpha.15` to `1.0.0-alpha.16`. Confirm the current version from `package.json` and check the published state (`npm view @liquid-labs/liq-projects versions --json`, a read-only call) before choosing the number — if `1.0.0-alpha.16` is somehow already published, bump past it and say so.
3. **Add or correct a `files` allowlist.** Run `npm pack --dry-run` before making any change and compare its file list against the currently-published `1.0.0-alpha.15` tarball's contents (`npm view @liquid-labs/liq-projects dist.tarball`, or install the published version elsewhere and inspect it). This repo has no `files` field and no `.npmignore` today, so `npm pack` falls back to a `.gitignore` written before this Flow planning session existed — it will pick up this session's own local artifacts (`.flow/`, `plan/manifest.yaml`, and a complete nested copy of the package under `worktrees/plan/dev-core-consolidation/`, lockfile included) alongside the real package contents. Add a `files` field to `package.json` listing exactly what the published tarball actually needs (derive it from the real published tarball's contents, e.g. `dist`, `src`, `Makefile` — confirm against what `1.0.0-alpha.15` actually shipped rather than guessing). This is the one addition permitted beyond `version`/`description`.
4. **Change nothing else.** `name`, `main`, `scripts`, `engines`, `license`, `repository`, `bugs`, `homepage`, `dependencies`, `devDependencies`, and the `liq` metadata block all stay exactly as they are. Do **not** add `"private": true` — this package must remain publishable, since a final labelled release is the point.
5. **`make qa` green** (test and lint) after the edit.

## Validation

- `git diff package.json` shows changes on exactly three fields: `version`, `description`, and the added/corrected `files` array. Anything else in the diff is a defect.
- `git status --short` shows `package.json` as the only modified file.
- `version` is `1.0.0-alpha.16` (or the justified higher value, with the reason recorded).
- `description` is non-empty, names `@sdlcforge/dev-core`, and reads as a deprecation notice rather than as a feature summary.
- `node -e "JSON.parse(require('fs').readFileSync('package.json'))"` succeeds — the file is still valid JSON.
- `npm pack --dry-run` after the `files` fix lists only real package contents — no `.flow/`, no `plan/`, no `worktrees/` — and its file count is close to the previously-published tarball's, not the unfiltered count.
- `make qa` passes: 8 test suites / 29 tests (subject to the live-GitHub `project-lifecycle` suite's environment dependence, which is reported rather than worked around) and clean lint.
- No `private` field was added: `grep -n '"private"' package.json` returns nothing.
- `src/`, `README.md`, `Makefile`, and `make/` are untouched.

## Assumptions

- Task 001 (the verification gate) has passed.
- Task 002 runs in parallel against `README.md`; the two files are disjoint, so no coordination is needed beyond both landing before task 004 publishes.
- `npm view` is a read-only registry call and should be permitted; if it is blocked, proceed with `1.0.0-alpha.16` on the basis of the local `package.json` and note that the published state could not be confirmed.

## References

- `plan/notes/dev-core-target-shape.md` — decision D10 (retirement is documentation and metadata, not deletion; no shim).
- `plan/notes/liq-projects-source-inventory.md` — the current package facts, including the version this bumps from.
- `/Users/zane/playground/liquid-labs/liq-integrations/plan/plan-summary-framework-consolidation.md` — the sibling task `003-mark-package-deprecated-and-bump-version`, whose "no `private` field, no dependency pruning, description-plus-version only" shape this follows.
