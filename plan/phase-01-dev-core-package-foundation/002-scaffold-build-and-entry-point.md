# Scaffold Build And Entry Point

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `liq-projects`.

Turn dev-core from a single-`package.json` repository into a working, buildable, testable, lintable plugable-express plugin package with an empty submodule set. After this task, `make build` produces `dist/dev-core.js`, `make test` and `make lint` pass, and `src/index.mjs` exports the merged-`handlers` / composite-`setup` shape that each subsequent absorption extends by one import and one list entry.

No donor code lands here. The value of doing packaging first, alone, is a clean before/after signal: when the first absorption's build breaks, the cause is the absorption, not the scaffold.

## Requirements

1. **`package.json`** — edit in place, preserving `name`, `version`, `main`, `repository`, `bugs`, `homepage`, and `author` exactly as they already are:
   - `description`: a real one-sentence summary. This string becomes the plugin summary the server reports (the loader reads `package.json` `description`, not any module export), so write it as a plugin summary — e.g. covering the consolidated project-lifecycle, work-orchestration, org-settings, and project-audit capability set.
   - `engines`: `{ "node": ">=18.0.0" }`, matching all four source packages.
   - `license`: `UNLICENSED`, matching the source packages.
   - `scripts`: the source packages' set — `build: make`, `lint: make lint`, `lint:fix: make lint-fix`, `test: make test`, `qa: make qa`, `prepack: make build`, `preversion: npm test && make lint`. Replace the placeholder `test` script.
   - `devDependencies`: `@liquid-labs/sdlc-resource-babel-and-rollup`, `@liquid-labs/sdlc-resource-eslint`, `@liquid-labs/sdlc-resource-jest`, at the ranges liq-projects currently uses.
   - `_npm-check-plus.depcheck.ignoreMatches`: `["@liquid-labs/sdlc-resource-*"]`, as liq-projects has, so the resource packages are not reported as unused.
   - Keep `type: commonjs` as-is. Do **not** add runtime `dependencies` — each absorption adds its own.
   - Do **not** carry over the source packages' vestigial `liq` metadata block (`orgBase`, `packageType`, `tags`); no code reads it from a plugin's own manifest.
2. **`.gitignore`** — `/qa`, `/node_modules`, `/yalc.lock`, `/.yalc`, `/dist`, `/test-staging`, matching liq-projects.
3. **Build files** — seed `Makefile` and `make/*.mk` from liq-projects's current set (builder `@liquid-labs/sdlc-projects-workflow-local-node-build`, version `1.0.0-alpha.5`), copied verbatim except:
   - `make/50-liq-projects-js.mk` becomes `make/50-dev-core-js.mk`, with its variables renamed accordingly (`SDLC_DEV_CORE_JS := $(DIST)/dev-core.js`, entry `$(SRC)/index.mjs`), building `dist/dev-core.js` — the artifact name `package.json` `main` already fixes.
   - Note the entry-point extension change: liq-projects's entry is `src/index.js`; dev-core's is `src/index.mjs`. Confirm the Rollup config resolves an `.mjs` entry before assuming it does; if it does not, use `src/index.js` instead and record the deviation in the task document's status notes.
   - Preserve every generated-file header comment, so the provenance of these artifacts stays visible.
4. **`.sdlc-data.yaml`** — seed from liq-projects's, updating the artifact list to match the files actually written (notably the renamed `make/50-dev-core-js.mk` and its `purpose` text naming `dist/dev-core.js`). Do not carry over `.catalyst-data.yaml`, which belongs to a superseded builder.
5. **`src/index.mjs`** — the plugin entry point, written so an absorption is a two-line change:
   - Import each submodule's `index.mjs` (none exist yet — leave the import block empty with a comment naming the four expected submodules and the required order).
   - Export `handlers`: a **fresh** array built by spreading submodule handler arrays, never by `push`ing into an imported array. Today that is an empty array.
   - Export `setup`: an `async` function that awaits each submodule's `setup` in the documented order (`projects` → `orgs` → `work`; `projects-audit` has none), forwarding the full argument object (`{ app, cache, reporter, registerPathVar, serverConfigRoot }`) through unchanged. Today it awaits nothing, but the ordering must already be expressed structurally (e.g. an ordered list of setup functions the function iterates) and documented in a comment stating *why* `projects` is first.
   - Do not export module-level `name`/`summary`; the loader ignores them, and the source packages' versions of those exports are inert. If you judge them worth keeping for human readers, say so in the report rather than adding them silently.
6. **Smoke test** — a unit test under `src/` following the source packages' conventions (a `test/` directory, `*.test.mjs` naming so Jest actually picks it up) asserting: `handlers` is an array; `setup` is a function; `await setup(...)` against a minimal stub argument object resolves without throwing and does not corrupt `app.ext`. Keep it honest about the empty state rather than asserting a submodule count it cannot know.
7. **Install and verify** — run `npm install` in dev-core, then `make build`, `make test`, `make lint`, and `make qa`, and record the actual output in the task document's status notes.

## Validation

- `git status --short` in dev-core shows only intended paths: `package.json`, `.gitignore`, `Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `src/index.mjs`, the smoke test, and (untracked/gitignored) `node_modules`, `dist`, `test-staging`, `qa`, `package-lock.json` — with `package-lock.json` committed, matching the source packages' convention of tracking their lockfile.
- `make build` succeeds and `dist/dev-core.js` exists and is non-empty. Confirm the bundle is externals-only (it should not inline `node_modules` content) by checking its size and grepping for a dependency name.
- `make test` passes with the smoke suite reported as run — confirm the test file was actually collected (a suite count of 1, not 0). A silently-uncollected test is the specific failure mode to rule out here: liq-projects contains a real instance of it (`src/handlers/projects/test/close-implied.mjs`, missing the `.test` infix, never executed).
- `make lint` and `make qa` pass with no findings.
- `node -e "import('./dist/dev-core.js').then(m => console.log(typeof m.setup, Array.isArray(m.handlers)))"` (or the CommonJS equivalent for this `type: commonjs` package) reports `function true` — the exported shape plugable-express's loader requires.
- `package.json` `description` is non-empty; `main` is still `dist/dev-core.js`; `name`, `version`, `repository`, `bugs`, `homepage`, `author` are byte-identical to their pre-task values (`git diff` on `package.json` shows no change to those lines).
- No runtime `dependencies` key was added.
- `make/50-dev-core-js.mk` exists and no file named `make/50-liq-projects-js.mk` exists: `find . -name '50-liq-projects-js.mk' -not -path './node_modules/*'` returns nothing.
- `.sdlc-data.yaml`'s artifact list matches the files on disk one-for-one — no entry for a file that does not exist, no file without an entry.
- `src/index.mjs` contains no `handlers.push(` and no cross-submodule import.

## Metadata

architectural_impact: true

## Assumptions

- Task 001 has landed, so `docs/dev-core-consolidation-contract.md` exists in dev-core and is the specification this task implements. If the two disagree, the contract wins and the discrepancy is reported.
- `npm install` in dev-core can reach the registry for the three `@liquid-labs/sdlc-resource-*` devDependencies. If it cannot, halt and report rather than vendoring or stubbing them — the toolchain choice is settled and a workaround would silently diverge from the source packages.
- `make` targets shell out to `npm explore @liquid-labs/sdlc-resource-*` to locate Babel/Rollup/Jest/ESLint configs (see `make/10-resources.mk`), so they only work after a successful install.
- The smoke test runs from `test-staging/` after a Babel pass, per `make/55-test.mk`, so it must not depend on its own source path.

## References

- `plan/notes/dev-core-target-shape.md` — decisions D5 (plugin contract), D6 (setup ordering), D8 (toolchain), D3 (root-file ownership).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the contract this task implements (written by task 001).
- `/Users/zane/playground/liquid-labs/liq-projects/package.json`, `Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `.gitignore` — the templates to seed from.
- `/Users/zane/playground/liquid-labs/liq-projects/src/index.js`, `src/handlers/index.js`, `src/handlers/projects/index.js`, `src/handlers/projects/releases/index.js` — the aggregation style being replaced (note the `handlers.push(...)` mutation this task must not reproduce).
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/load-plugins.js` — the loader contract the exported shape must satisfy.

## Checkpoint hints

- After `package.json`, `.gitignore`, and the build files are in place and `npm install` succeeds.
- After `make build` produces `dist/dev-core.js`.
- After `src/index.mjs` and the smoke test are written and `make test` collects and passes the suite.
- After `make lint`/`make qa` pass and the observed outputs are recorded in the task document.
