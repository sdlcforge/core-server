import { readFileSync } from 'node:fs'
import * as fsPath from 'node:path'

// Shared, narrowly-scoped test helper for phase-04's plugin-graph gate/regression tests
// (`plan/phase-04-validation-gate-and-regression/`). Authored by task 001
// (`001-wire-plugin-graph-build-gate.md`) and reused, unmodified, by tasks 002-004 in the same
// phase. Keep this module limited to path/package-root resolution only -- it deliberately does
// NOT wrap `validatePluginSet()`/`readHostDeclaration()`/`resolvePluginManifest()` itself, since
// different consumers in this phase need different subsets of `@liquid-labs/plugable-express`'s
// exports (task 001's own gate test calls `validatePluginSet()` directly; tasks 002/003 call
// `readHostDeclaration()`/`resolvePluginManifest()` instead).
//
// This lives under `src/lib/test/helpers/`, a new subdirectory alongside the existing
// `src/lib/test/fixtures/` -- the established, working precedent (`fixtures/probe-plugin.mjs`,
// imported by `builtin-plugins.test.js`) for a non-`*.test.*` support module living under
// `src/lib/test/` and being picked up by the Babel/Jest pipeline (`make/55-test.mk`'s
// `CATALYST_ALL_JS_FILES_SRC` selector compiles every `.mjs`/`.js`/`.cjs` file under `src/`, not
// only `*.test.js` files).

/**
 * Computes `core-server`'s real repository root from a calling test file's own `__dirname`,
 * walking up the same number of directory levels `app-init.test.js` and
 * `full-tier-baseline.test.js` already use (`fsPath.join(__dirname, '..', '..', '..')`).
 *
 * Jest runs from Babel-transpiled output under `test-staging/`, not from `src/` (see
 * `make/55-test.mk`), so a test file authored at `src/lib/test/<name>.test.js` is compiled to
 * `test-staging/lib/test/<name>.test.js` before it runs -- three levels up from there
 * (`test-staging/lib/test` -> `test-staging/lib` -> `test-staging` -> the worktree root) lands
 * back at the real repository root, where `package.json` lives. This is the exact
 * `packageRoot` hazard `plan/notes/build-wiring-and-dependency-refresh.md` documents:
 * `validatePluginSet({ packageRoot })` defaults to `process.cwd()`, which is `test-staging/`
 * during a Jest run, not the real package root -- getting this wrong yields a
 * `resolution-failure` (exit code `2`) that looks like a framework bug and is not.
 *
 * IMPORTANT -- this only computes correctly for a caller sitting at the SAME depth
 * `app-init.test.js`/`full-tier-baseline.test.js` sit at: `src/lib/test/<name>.test.js`, one
 * level directly inside `src/lib/test/`. A caller one level deeper -- e.g.
 * `src/lib/test/helpers/<name>.test.js` -- would need one more `..` to reach the same root. Do
 * not hardcode the walk-up count inside this helper for that reason: pass the exact number of
 * levels your own call site needs via `walkUpCount`.
 *
 * @param {string} testFileDirname - the calling test file's own `__dirname` (as it resolves at
 *   Jest run time, i.e. under `test-staging/`, not `src/`).
 * @param {number} [walkUpCount] - how many directory levels to walk up from `testFileDirname` to
 *   reach the repository root. Defaults to `3`, correct for a test file at
 *   `src/lib/test/<name>.test.js` (compiled to `test-staging/lib/test/<name>.test.js`) -- the
 *   depth every consumer of this helper in phase 4 sits at today. Pass an explicit value for any
 *   caller at a different depth.
 * @returns {string} the resolved, absolute repository root path.
 */
const resolveCoreServerPackageRoot = (testFileDirname, walkUpCount = 3) => {
  const walkUpSegments = new Array(walkUpCount).fill('..')
  return fsPath.resolve(testFileDirname, ...walkUpSegments)
}

/**
 * Reads and parses `core-server`'s own `package.json` from the resolved repository root.
 * Reused by tasks 002-004, which all need the parsed `package.json` to call
 * `readHostDeclaration()` (from `@liquid-labs/plugable-express`) against.
 *
 * @param {string} repoRoot - the repository root, as returned by
 *   `resolveCoreServerPackageRoot()`.
 * @returns {Object} the parsed `package.json` contents.
 */
const readCoreServerPackageJSON = (repoRoot) =>
  JSON.parse(readFileSync(fsPath.join(repoRoot, 'package.json'), 'utf8'))

export { resolveCoreServerPackageRoot, readCoreServerPackageJSON }
