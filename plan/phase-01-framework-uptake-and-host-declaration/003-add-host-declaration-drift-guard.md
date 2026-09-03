# Add Host Declaration Drift Guard

## Purpose and scope

Wire the framework's `verifyHostDeclaration()` into `core-server`'s own Jest suite, asserting that the `plugable.host` block [002](./002-declare-plugable-host-block.md) added agrees with the real `explicitPlugins`/`submodules` arrays it describes. This makes the declaration self-enforcing from the moment it exists: a future edit to either real array that forgets the matching declaration update fails `make test` rather than silently narrowing the validated set — the exact hazard [002](./002-declare-plugable-host-block.md) flagged when it recorded the `submodules`-to-`components:` order relationship as undeliverable and pointed here for enforcement instead.

This task adds one new Jest test file plus the minimal source export the test needs; it does not touch `package.json`'s `plugable` block (already correct from task 002) and does not populate any component's `provides`/`requires` (Phase 2's job).

## Requirements

1. **Export the real `explicitPlugins` array from `src/lib/app-init.mjs`.** It is currently a private module-scope `const`, and `verifyHostDeclaration({ builtinPlugins, explicitPlugins, hostPackageJSON })` needs the actual live array — not a hand-copied duplicate in the test file, which would silently defeat the guard's own purpose the first time the real array changed without the test's copy being updated too. Add `explicitPlugins` to the existing `export { appInit }` statement (`export { appInit, explicitPlugins }`); do not change its declaration, order, or contents.

2. **Add a new Jest test**, e.g. `src/lib/test/host-declaration.test.js`, that:
   - Imports `verifyHostDeclaration` from `@liquid-labs/plugable-express`.
   - Imports `explicitPlugins` from `../app-init` (the new export from Requirement 1).
   - Imports `builtinPluginsFor` from `../builtin-plugins` (already exported).
   - Reads and parses `package.json` the same way the existing `src/lib/test/app-init.test.js` does — `fs.readFile(fsPath.join(__dirname, '..', '..', '..', 'package.json'))` then `JSON.parse` — rather than re-deriving the prod/test dual-candidate path probe `app-init.mjs` itself uses; a Jest test always runs from a fixed location relative to its own file, so that probe is unnecessary here and reusing it would be over-engineering.
   - Calls `builtinPluginsFor({ npmName: packageJSON.name, version: packageJSON.version })` to reconstruct the real `builtinPlugins` array in the exact shape `appInit` passes it (this mirrors `src/lib/test/builtin-plugins.test.js`'s own use of the same exported function, without needing to separately import the `controls`/`credentials`/`issuesGitHub` submodules — `builtinPluginsFor` already closes over them).
   - Calls `verifyHostDeclaration({ builtinPlugins, explicitPlugins, hostPackageJSON: packageJSON })` and asserts `result.ok === true` with an empty (or otherwise fully explicable) `result.findings` array. On failure, `console.log(JSON.stringify(result.findings, null, 2))` or an equivalent readable dump before the assertion, so a real future drift reports specifically *which* finding kind fired (`host-declaration-explicit-undeclared`, `host-declaration-builtin-missing`, `host-declaration-builtins-order-mismatch`, etc.) rather than a bare boolean failure.

3. **Do not add this test's marker to `make/56-plugin-graph.mk`** — that fragment does not exist yet (it is Phase 4's [`plan/phases/validation-gate-and-regression.md`](../phases/validation-gate-and-regression.md) deliverable, per [`plan/notes/build-wiring-and-dependency-refresh.md`](../notes/build-wiring-and-dependency-refresh.md)). This task's test reaches `make test`/`make qa`/`bun run test`/`bun run qa` automatically through the existing `55-test.mk` Jest wiring — every `*.test.js` file under `src/` is already picked up — with no `make/` edit required.

4. **Confirm the test actually exercises real drift**, not a tautology: temporarily introduce a deliberate mismatch (e.g. comment out one name in `src/lib/app-init.mjs`'s `explicitPlugins` array, or reorder `submodules` in `src/lib/builtin-plugins.mjs`), re-run the new test, confirm it fails with a finding naming the mismatch, then revert the temporary change before finishing the task. Do not leave the deliberate mismatch in the committed diff.

## Validation

- `bun run test` (or `make test`) passes, including the new `host-declaration.test.js` (or equivalent name) file.
- The deliberate-mismatch check in Requirement 4 was performed and reverted; `git diff` shows no trace of the temporary breakage in the final commit.
- `git diff -- src/lib/app-init.mjs` shows only the new `explicitPlugins` export added to the existing `export` statement — no other change to that file.
- `package.json`'s `plugable` block is unchanged by this task (`git diff -- package.json` is empty).
- `grep -n "explicitPlugins" src/lib/index.js src/lib/app-init.mjs` confirms the new export is reachable from `../app-init` as the test imports it.

## Assumptions

- [001](./001-verify-and-refresh-framework-dependencies.md) has landed: `@liquid-labs/plugable-express` is refreshed, so `import { verifyHostDeclaration } from '@liquid-labs/plugable-express'` resolves to a real function rather than `undefined`.
- [002](./002-declare-plugable-host-block.md) has landed: `package.json` already carries the `plugable.host` block this test verifies against. If it is absent, `verifyHostDeclaration()` reports a `host-declaration-missing` finding at `warning` severity (not `error`) — `result.ok` would still read `true` in that case, which would make this task's test pass for the wrong reason (nothing to compare, not "compared and agreed"). Confirm task 002 actually landed rather than trusting `result.ok` alone; a `host-declaration-missing` finding in `result.findings` mid-development is the tell.

## References

- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md`, `## The plugable.host block` section — `verifyHostDeclaration({ builtinPlugins, explicitPlugins, hostPackageJSON })`'s contract and the finding kinds it reports.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/verify-host-declaration.js` — the real implementation, useful for understanding exactly which finding kind fires for which disagreement.
- `src/lib/test/app-init.test.js`, `src/lib/test/builtin-plugins.test.js` — existing conventions this new test file follows (package.json read pattern, `builtinPluginsFor` usage).
- [`plan/notes/build-wiring-and-dependency-refresh.md`](../notes/build-wiring-and-dependency-refresh.md) — confirms this task's test reaches `make test`/`make qa` through existing wiring, with no `make/` fragment needed until Phase 4.

## Status

- **Outcome:** succeeded
- **Date:** 2026-09-02
- **Validation:** `bun run test` (`make test`) passes, 13 suites / 41 tests, including the new `src/lib/test/host-declaration.test.js`. The Requirement 4 deliberate-mismatch check was performed (temporarily commenting out `@liquid-labs/sdlc-projects-workflow-local-node-build` from `explicitPlugins` in `src/lib/app-init.mjs`), confirmed a `host-declaration-explicit-stale` finding fired and the test failed, then reverted — `git diff -- src/lib/app-init.mjs` shows only the new export. `package.json`'s `plugable` block is unchanged (`git diff -- package.json` empty). `grep -n "explicitPlugins" src/lib/index.js src/lib/app-init.mjs` confirms the export is reachable via `../app-init`.
- **Affected source files:**
  - `src/lib/app-init.mjs` — added `explicitPlugins` to the existing `export` statement; no other change.
  - `src/lib/test/host-declaration.test.js` — new Jest test wiring `verifyHostDeclaration()` against the real `builtinPlugins`/`explicitPlugins` arrays and `package.json`'s `plugable.host` block.
- **Assumptions relied on:** both `## Assumptions` entries — task 001 (framework refresh, `verifyHostDeclaration` resolves) and task 002 (`plugable.host` block present in `package.json`) were confirmed already landed in this worktree before implementation began.
