# Add Plugable Express Dev Dependency

## Purpose and scope

Make `@liquid-labs/plugable-express`'s compile-time manifest tooling reachable from this checkout, so the rest of the phase can validate the manifest it authors. Today it is not reachable at all.

`@liquid-labs/plugable-express` is **not currently a dependency of `@sdlcforge/dev-core` in any form** — verified this session: zero occurrences in `package.json`, zero in `package-lock.json`, no `.yalc/` directory. This is not the "installed version is too old" case; nothing is installed. That is coherent with dev-core's role (it is a *plugin*; the host server supplies the framework), and it means nothing in this repository can currently run `plugable-express-validate`.

Scope is exactly one `devDependency` addition plus the lockfile refresh it implies. No source change, no build-config change, no runtime change.

## Requirements

1. **Add `@liquid-labs/plugable-express` to `devDependencies`** in `package.json`, at range `^1.0.0-alpha.59`.

   - **`devDependencies`, never `dependencies` or `peerDependencies`.** dev-core's runtime never imports the framework — `plugable-express` imports dev-core, not the other way round — so a runtime dependency would misstate the package's contract and add a large tree to every consumer's install. A `devDependency` is runtime-inert, which this plan's hard constraint requires.
   - `1.0.0-alpha.59` is confirmed published to the npm registry and is the version that ships the manifest framework and the `plugable-express-validate` `bin`. An ordinary registry range is all that is needed.
   - **Do not use a `file:` or `yalc` spec.** `docs/dev-core-consolidation-contract.md`'s [absorption recipe](../../docs/dev-core-consolidation-contract.md#absorption-recipe) forbids a `file:` spec in this `package.json` because it does not survive publication, and `grep -n 'file:' package.json` returning nothing is a standing check for this project.
   - Place the entry in the existing `devDependencies` object, preserving its alphabetical ordering.

2. **Refresh `package-lock.json`** via `npm install`. Expect a large lockfile diff — `plugable-express` brings a substantial transitive tree — and do not hand-edit the lockfile.

3. **Confirm the CLI resolves and runs.** After install, `node_modules/.bin/plugable-express-validate` must exist and be executable. The upstream package publishes `"files": ["./dist", "README.md"]` with `bin` pointing at `./dist/plugable-express-validate.js`, so the built CLI ships in the tarball; if the binary is missing after a clean install, that is a genuine upstream packaging problem to halt and report rather than work around.

4. **Change nothing else.** Do not touch `src/`, `make/`, `Makefile`, `.sdlc-data.yaml`, or any other `package.json` field. In particular do not add a `files` allowlist, do not add a `"plugable"` block (that is task 002's job), and do not alter the `keywords` array.

5. **If `npm install` surfaces new `npm audit` findings**, record them in the task document's own notes and report them to the manager. Do not attempt to remediate them and do not add anything to `plan/followups.yaml` — dev-core already tracks several dependency-advisory followups (`0RpG`, `pWxw`, `AEsA`), and adding more is the manager's call, not this task's.

## Validation

- `grep -n 'plugable-express' package.json` shows exactly one entry, inside `devDependencies`, at `^1.0.0-alpha.59`.
- `grep -n 'file:' package.json` returns nothing.
- `node_modules/@liquid-labs/plugable-express/package.json` exists and its `version` field satisfies the declared range.
- `node_modules/.bin/plugable-express-validate --help` (or a bare invocation with an unrecognized flag, which the CLI answers with its usage line on stderr and exit code 2) produces the usage text beginning `Usage: plugable-express-validate`. A usage line proves the binary resolves and executes; a non-zero exit from that particular probe is expected and is not a failure.
- `git diff --stat` shows exactly two changed files: `package.json` and `package-lock.json`.
- `make build` succeeds and `dist/dev-core.js` is produced, confirming the new devDependency has not disturbed the Rollup/Babel toolchain.
- **Do not run a full `make test` or `make qa` as this task's gate.** Both are known-red at baseline (followup `2aMD`: `src/projects/handlers/_lib/test/project-lifecycle.test.mjs`), independently of this change. If a test run is made at all for reassurance, run it before *and* after the change and compare failure lists — the set must be identical.

## Assumptions

- The npm registry is reachable from the execution environment. If it is not, halt and report rather than falling back to a local `file:`/yalc link — the fallback path (driving the CLI directly from the sibling `@liquid-labs/plugable-express` checkout's already-built `dist/`) is documented in `plan/notes/manifest-scope-and-tooling.md` and is a manager decision, not this task's to take unilaterally.
- dev-core's `package.json` still carries no `files` allowlist. If one has appeared since planning, note it — it does not change this task, but it confirms the form choice task 002 makes.

## Status

- **Outcome:** succeeded — 2026-09-01.
- Added `@liquid-labs/plugable-express` (`^1.0.0-alpha.59`) to `devDependencies` in `package.json`, alphabetically placed ahead of the two existing `@liquid-labs/sdlc-resource-*` entries. Ran `npm install` to refresh `package-lock.json`; `git diff --stat` shows exactly `package.json` and `package-lock.json` changed, nothing else.
- Installed CLI resolves and runs: `node_modules/@liquid-labs/plugable-express/package.json` reports version `1.0.0-alpha.59` (satisfies the declared range), and `node_modules/.bin/plugable-express-validate --help` produces the expected usage line on stderr with exit code 2 (unrecognized-flag path, as the task doc anticipated).
- `make build` succeeds and regenerates `dist/dev-core.js` (gitignored, not part of the diff), confirming the Babel/Rollup toolchain is undisturbed.
- `npm audit` after install reports 24 vulnerabilities (18 moderate, 6 high) — same count as the audit surface for the affected packages pre-change. Verified by diffing `package-lock.json` package-version entries for every package `npm audit --json` names as vulnerable (`@liquid-labs/credentials-db-plugin-github`, `@liquid-labs/github-toolkit`, `@liquid-labs/liq-credentials-db`, `@liquid-labs/octocache`, `@liquid-labs/sdlc-resource-babel-and-rollup`, `@liquid-labs/sdlc-resource-eslint`, the `@octokit/*` family, `octokit`, `@rollup/plugin-terser`, `serialize-javascript`) against the pre-change lockfile: every one is version-identical before and after. `@liquid-labs/plugable-express` and its transitive tree introduce no new advisory. Per Requirement 5, no new findings surfaced, so nothing was added to `plan/followups.yaml`.
- Affected files: `package.json`, `package-lock.json`.

## References

- [manifest scope and tooling](../notes/manifest-scope-and-tooling.md) — why the dependency is absent, why `devDependency` is the right kind, and the documented fallback if this task cannot proceed.
- `docs/dev-core-consolidation-contract.md`'s [absorption recipe](../../docs/dev-core-consolidation-contract.md#absorption-recipe) — the standing no-`file:`-spec rule for this `package.json`.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` — the normative manifest schema the rest of the phase codes against. Read-only reference; **do not modify anything in that checkout.**
