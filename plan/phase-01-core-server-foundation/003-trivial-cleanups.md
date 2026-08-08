# Trivial Cleanups

## Purpose and scope

Two small, independent hygiene fixes surfaced during modernization research (`/tmp/flow-sdlc-modernization/core-server.md`), listed in the synthesis's Phase 0 scope (`/tmp/flow-sdlc-modernization/synthesis.md` §7, item 5). Both are cosmetic/correctness fixes with no behavioral impact — bundled into one task because each is too small to warrant its own task, phase, or task-branch overhead.

## Requirements

- In `src/lib/index.js`: the exported `name` / `summary` values are stale (currently read `'snippets'` or similar leftover placeholder text rather than describing this package). Update them to accurately describe `@sdlcforge/core-server`'s library export (confirm the exact current values by reading the file first — do not assume the exact stale string without checking).
- In `package.json` at approximately line 59: a version-pin typo, `^1.0.0-alpah.2` (misspelled "alpah"), should read `^1.0.0-alpha.2` (or whatever the correctly-spelled intended version constraint is — confirm against the actual dependency's real published/available versions before fixing, in case the typo also hides a version-number error, not just a spelling error).
- Do not touch any other file. This task is deliberately narrow.

## Validation

- `grep -n "alpah" package.json` returns no matches.
- `node -e "console.log(require('./src/lib/index.js'))"` (or equivalent import check for the ESM/CJS form actually used) shows a sensible `name`/`summary`, not stale placeholder text.
- `npm install` succeeds without a version-resolution error introduced by the typo fix (confirms the corrected version constraint is valid and resolvable).
- `npm test` and `npm run lint` both pass unchanged.

## Metadata

architectural_impact: false
