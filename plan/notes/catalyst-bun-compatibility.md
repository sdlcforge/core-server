# Catalyst Toolchain Compatibility Under Bun

## Purpose and scope

Research spike for the `bun-conversion` plan. Determines whether core-server's existing Catalyst-framework build/test/lint toolchain (Makefile-driven, `npm explore`/`npx`-based tool-config resolution, Babel + Rollup build, Jest + Supertest unit tests) works correctly against a **Bun-installed** `node_modules`, without npm ever having installed anything itself — and, separately, whether Jest can run under the **Bun runtime**. This note answers the five questions posed by the plan's Phase 2 research spike and does not touch Phase 1 (dependency pinning/`file:`-yalc provisioning, already substantially demonstrated as a side effect of this spike's setup) or Phase 3 (runtime-target shebang, integration tiers).

## Methodology

All experiments ran against a **scratch copy** of the main checkout (`src/`, `make/`, `Makefile`, `package.json`, `test/`, `.yalc/` with `dist/` output included), at `/private/tmp/claude-502/.../scratchpad/core-server-experiment`, never against the main checkout itself. The main checkout was used only to read source and, for one baseline-comparison run of `make lint`, whose output is byte-identical to what was already tracked in git (confirmed via `git status`/`git diff` showing no changes) — so no net modification was left behind there.

Versions in use throughout: **Bun 1.3.14**, **Node v26.5.0**, **npm 11.17.0** (matches the versions already recorded in [`bun-conversion-scope.md`](./bun-conversion-scope.md)).

Because `main`'s `package.json` carries 11 wildcard (`*`) dependency specifiers that Bun categorically refuses to resolve (already established in `bun-conversion-scope.md` and reconfirmed below), the scratch copy's `package.json` was patched to pin each wildcard to the latest published prerelease (`npm view <pkg> versions --json`, tail entry) so that `bun install` could proceed and the rest of the toolchain could be exercised against a real, complete, Bun-installed `node_modules`. This pinning is illustrative only — the plan's Phase 1 will need its own re-verified pin set — but the exercise itself (find-latest, pin, `bun install`) is a working proof of the pinning approach.

## Q1 — Does `npm explore <pkg> -- pwd` work against a Bun-installed `node_modules`?

**Yes, unmodified, for all four Catalyst tool configs.**

After `bun install` (pinned deps + the two `file:.yalc/…` deps) produced a `node_modules` with 894 packages:

```
$ npm explore @liquid-labs/catalyst-resource-babel-and-rollup -- pwd
/…/core-server-experiment/node_modules/@liquid-labs/catalyst-resource-babel-and-rollup
$ npm explore @liquid-labs/catalyst-resource-eslint -- pwd
/…/core-server-experiment/node_modules/@liquid-labs/catalyst-resource-eslint
$ npm explore @liquid-labs/catalyst-resource-jest -- pwd
/…/core-server-experiment/node_modules/@liquid-labs/catalyst-resource-jest
```

All three exit 0 with correct paths. (The fourth config, `@liquid-labs/catalyst-resource-babel-and-rollup`, is reused for both `CATALYST_BABEL_CONFIG` and `CATALYST_ROLLUP_CONFIG`, so there are only three distinct `npm explore` targets, covering all four `make/10-resources.mk` variables.) This is expected once you know why: `npm explore` does not consult any lockfile or installation provenance — it just resolves `<pkg>`'s directory the same way Node's own module resolution would, walking `node_modules`. It is indifferent to which tool populated `node_modules`, npm or Bun, because Bun's `node_modules` layout is a standard, real (non-symlinked-store) `node_modules` tree — confirmed by inspection (`node_modules/@liquid-labs/catalyst-resource-babel-and-rollup` is a plain directory, not a symlink into a global Bun cache, and `node_modules/.bin/*` are ordinary relative symlinks to each package's bin script, e.g. `babel -> ../@babel/cli/bin/babel.js`).

Confirmed end-to-end: `make build`, `make test`, and `make lint`, run unmodified in the scratch copy, all correctly resolve their `CATALYST_*_CONFIG` paths via this exact `npm explore` pattern (see Q2 below for the full runs).

**Operational caveat, not a node_modules-provenance problem:** this still requires the `npm` *binary* to be present on `PATH`. Bun does not ship an `npm` shim. In practice this is a non-issue for this project because Babel/Rollup/Jest/ESLint are all Node-targeted CLIs (`#!/usr/bin/env node` shebangs — confirmed for `node_modules/jest/bin/jest.js`) so Node itself remains a required part of the toolchain regardless of the package-manager conversion, and `npm` ships bundled with essentially every standard Node distribution (nvm, the official installer, the Docker `node` images). If a future environment ever needs to drop Node/npm from `PATH` entirely, the Bun-native replacement — verified working — is `node`'s (or `bun`'s) own `require.resolve`, which needs no npm CLI at all:

```
$ node -e "console.log(require.resolve('@liquid-labs/catalyst-resource-jest/package.json').replace(/\/package\.json$/,''))"
/…/core-server-experiment/node_modules/@liquid-labs/catalyst-resource-jest
$ bun -e "console.log(require.resolve('@liquid-labs/catalyst-resource-jest/package.json').replace(/\/package\.json$/,''))"
/…/core-server-experiment/node_modules/@liquid-labs/catalyst-resource-jest
```

Both produce byte-identical output to `npm explore … -- pwd`. `bun pm ls` was also checked as a candidate Bun-native alternative; it lists `name@version` for the whole tree but has no per-package path output, so it is not a drop-in replacement — the `require.resolve` pattern above is the correct one if `npm` is ever removed from the toolchain.

**Verdict: no makefile change is required for Q1.** `make/10-resources.mk`'s four `$(shell npm explore … -- pwd)` invocations work as-is against a Bun-installed `node_modules`, provided `npm`/Node stay on `PATH` (already implied by every other tool in the chain).

## Q2 — Do `npx`/`bunx` invocations of Babel, Rollup, Jest, and ESLint work against a Bun-installed `node_modules`?

**Yes, for both `npx` and `bunx`, confirmed both via version checks and via full real invocations.**

Version checks (all exit 0, both runners, identical output):

| Tool | `npx <tool> --version` | `bunx <tool> --version` |
|---|---|---|
| Babel | `7.29.7 (@babel/core 7.29.7)` | `7.29.7 (@babel/core 7.29.7)` |
| Rollup | `rollup v4.62.4` | `rollup v4.62.4` |
| Jest | `29.7.0` | `29.7.0` |
| ESLint | `v8.57.1` | `v8.57.1` |

Real, full invocations via the unmodified Makefile targets, run in the scratch copy against the Bun-installed `node_modules` (exactly as `make/50-*.mk`, `make/55-test.mk`, and `make/55-lint.mk` already invoke them, i.e. `CATALYST_BABEL:=npx babel`, `CATALYST_ROLLUP:=npx rollup`, `CATALYST_JEST:=npx jest`, `CATALYST_ESLINT:=npx eslint`, unmodified):

- **`make build`** — both Rollup targets succeeded: `dist/sdlcforge-server-exec.js` and `dist/sdlcforge-server.js` were produced, each the expected 9-line, externals-only shape (`const e=require("@liquid-labs/comply-defaults"),i=require("@liquid-labs/plugable-express"),l=require("node:fs")`, matching the shape already documented in `bun-conversion-scope.md` and matching `main`'s currently-tracked `dist/` output byte-for-byte in line count).
- **`make test`** — the Babel `test-staging` transpile step ran (`Successfully compiled 6 files with Babel (452ms)`), then `NODE_OPTIONS=--experimental-vm-modules npx jest --config=… --runInBand` ran against the transpiled output: **3 test suites passed, 5 tests passed**, coverage report generated (`90.47% stmts`) and copied to `qa/coverage/`.
- **`make lint`** — ESLint ran end-to-end and produced a real report. It reported pre-existing style violations (237 problems in the scratch copy's smaller file set) — but this is **not a Bun-compatibility issue**: running the identical `make lint` in the main npm-installed checkout, as a baseline comparison, reports the same category of pre-existing violations. ESLint itself resolves and executes correctly either way; the finding is that this repo already has lint debt unrelated to package-manager choice.

`npx babel`/`npx rollup` were also confirmed to resolve `.bin/babel`/`.bin/rollup` through the standard `node_modules/.bin/*` symlinks Bun produces (`.bin/babel -> ../@babel/cli/bin/babel.js`, etc.) — the same relative-symlink convention npm uses, which is why both `npx` and `bunx` (which share the same `node_modules/.bin`-then-registry resolution algorithm, just defaulting to different underlying JS engines) succeed identically.

No lifecycle-script/postinstall gotchas were found for this dependency tree: `bun pm untrusted` reported `0 untrusted dependencies with scripts` for the full install.

**Verdict: no makefile change is required for Q2.** `npx babel`, `npx rollup`, `npx jest`, and `npx eslint` — the exact invocations `make/*.mk` already uses — all work unmodified against a Bun-installed `node_modules`. `bunx` works identically as a drop-in if the project prefers it, but switching is optional, not required.

## Q3 — Does the existing Jest unit suite pass when run under Bun?

**Yes when Jest runs under Node (its normal, supported mode) — including via `bunx jest` and via `bunx --bun jest`'s Node fallback. No when Jest is forced to actually execute under the Bun JS runtime.** These are two different things, and the distinction matters:

1. **`bunx jest` (default)** — passes, 3/3 suites, 5/5 tests, identical to `npx jest`. This is *not* evidence that Jest runs under Bun's engine: `bunx`, like `npx`, defaults to executing the target CLI under **Node**, honoring its `#!/usr/bin/env node` shebang (confirmed: `node_modules/jest/bin/jest.js` carries that shebang; `bunx --help` documents a `--bun` flag as "Force the command to run with Bun instead of Node.js", implying Node is the default engine otherwise). So `bunx jest` succeeding just reconfirms Q1/Q2's `node_modules`-resolution result, not Jest-under-Bun compatibility.

2. **`bunx --bun jest` (Jest forced onto the actual Bun runtime)** — **fails outright**, for all three test suites, with:
   ```
   TypeError: Attempted to assign to readonly property.
       at ../node_modules/jest-runtime/build/index.js:1638:6
       at Object.<anonymous> (../node_modules/stack-utils/index.js:10:9)
       at Object.<anonymous> (../node_modules/expect/build/toThrowMatchers.js:9:30)
       ...
   ```
   This is Jest's own internal module-sandboxing machinery (`jest-runtime`) hitting a fundamental incompatibility with Bun's JavaScriptCore-based module system — not a project-specific bug, and not something a config change fixes. Jest, as a project, is not Bun-runtime-compatible; this is a known, structural limitation, and this run reproduces it concretely against this project's actual dependency graph.

**On `NODE_OPTIONS=--experimental-vm-modules`:** this flag, present in `make/55-test.mk`'s existing Jest invocation, is Node-specific (it enables Node's experimental native ESM-in-VM-context support, which some of Jest's ESM interop paths depend on). It was tested both with and without the flag against this suite (`npx jest … 2>&1` run twice, once via the Makefile with the flag, once by hand without it) — **both pass identically, 3/3 suites**. So the flag is not currently load-bearing for this suite's content, though removing it is out of this spike's scope (it may matter for import patterns not exercised by the current three test files) and is moot for the Bun-runtime question anyway, since Jest-on-Bun-runtime fails for the structural reason above regardless of this flag. There is no Bun equivalent of this flag to reach for, because the failure it would need to work around never gets that far.

**Verdict:** the unit suite is compatible with Bun **only in the sense that Jest, run by Node, works fine against Bun-managed dependencies** (this is the actually-relevant, actually-viable configuration — Node was never going away as a toolchain dependency per Q1). Running Jest itself under the Bun engine is not viable and should not be pursued.

## Q4 — If Jest is not viable under Bun (the runtime), what is the concrete migration delta to `bun test`?

Framing correction based on Q3: Jest **is** viable going forward (under Node, as today) — so this section describes the delta **only if** the plan opts to replace the Jest *runner* with Bun's native `bun test` runner for other reasons (e.g., dropping the Jest devDependency entirely, or a performance/ecosystem-simplification goal). This was tested concretely.

**`bun test` runs the existing suite's assertions correctly, in two different modes, with materially different implications:**

1. **Against the Babel-staged output** (`test-staging/`, produced by the existing `make/55-test.mk` transpile step, unmodified):
   ```
   $ cd test-staging && bun test lib/test/
   5 pass, 0 fail, 15 expect() calls. Ran 5 tests across 3 files.
   ```
   Works with **zero code changes** — Bun's test runner ships a Jest-API-compatible `describe`/`test`/`expect`/`beforeAll`/`afterAll` global set, and it correctly interprets the CommonJS output Babel produces (including inline source maps). If the plan keeps the Babel transpile step (e.g. to avoid touching `app-init.test.js`/`golden-api-spec.test.js`'s comments about staged-directory traversal, or for other reasons), swapping `CATALYST_JEST:=npx jest` for a `bun test` invocation scoped to `test-staging/lib/test/` is a drop-in swap for `make/55-test.mk`'s test-execution line — no source changes.

2. **Directly against the raw ESM source** (`src/lib/test/`, **no Babel step at all**):
   ```
   $ bun test src/lib/test/
   5 pass, 0 fail, 15 expect() calls. Ran 5 tests across 3 files.
   ```
   This is the more interesting finding: Bun's runtime natively transpiles ESM `import`/`export` syntax on the fly (no `"type": "module"` needed, no Babel needed), **and** still provides `__dirname`/`__filename` as usable globals even though the files use `import` syntax — confirmed directly, since both `app-init.test.js` and `golden-api-spec.test.js` depend on `fsPath.join(__dirname, '..', '..', '..', ...)` and both passed. The `__dirname`-relative-path traversal the task description flagged as a concern **needs no rework** either way: both `test-staging/lib/test` and `src/lib/test` are three path segments deep from the project root (`<root>/test-staging/lib/test` vs. `<root>/src/lib/test`), so the same three `..` segments land at the project root regardless of which directory the test actually executes from. This is presumably *why* it already works without modification in both modes — it's a coincidence of matching directory depth, not a property of Bun itself, so if either directory's nesting ever changes, this traversal would need revisiting regardless of the Jest/`bun test` decision.

   If the plan pursued this path (running `bun test` straight against `src/`), it would eliminate the `make/55-test.mk` Babel-transpile step entirely for the unit tier — a bigger structural change than a pure runner swap, and one the plan's "Rollup and Babel remain the bundler and transpiler" constraint should be read carefully against: that constraint is about the *build*, not necessarily the *test* pipeline, but the task description's framing ("Babel-transpiles test sources into `test-staging/`... how would `bun test` need to be invoked/configured to preserve this") suggests preserving the staged layout is the intended shape. Both modes were verified to work; which one the plan adopts is a design choice, not a compatibility gate.

**Hazard found and worth flagging explicitly:** bare `bun test` (no path argument) performs its own recursive file discovery from the invocation root, and **will pick up `.test.js` files from every matching directory it finds**, not just one. With both `src/lib/test/*.test.js` and `test-staging/lib/test/*.test.js` present simultaneously (an artifact of prior scratch-copy runs, not a real project state, but instructive), bare `bun test` found and ran **six** files at once and produced a real failure:
```
ENOENT: no such file or directory, open '.../comply-server-249642633622594/api.json'
    at ... pluggable-express.js:1077:9
(fail) Golden API-spec characterization > (unnamed) [1.49ms]
8 pass, 1 fail
```
Root cause: `app-init.test.js` sets `process.env.COMPLY_HOME = serverHome` directly (a process-wide mutation) in `beforeAll`, and when the src-tree and staged-tree copies of that same test ran close together, the second copy's `appInit()` call picked up stale `COMPLY_HOME` state from the first, writing `api.json` to a directory that was never created for it. Scoping the invocation explicitly to one directory (`bun test src/lib/test/` or `bun test lib/test/` from inside `test-staging`) avoided this cleanly in every run. **Any `bun test` migration must invoke it with an explicit path scoped to exactly one copy of the test tree** — never bare `bun test` from the project root — both to avoid double-discovery and because it surfaces a real, if latent, env-var-isolation fragility in the test files themselves that Jest's per-file worker/VM isolation currently papers over. This is worth a follow-up regardless of the Jest-vs-`bun test` decision.

**Coverage output — a genuine, concrete migration delta:** Jest's current config (`node_modules/@liquid-labs/catalyst-resource-jest/dist/jest.config.js`) collects coverage via `coverageReporters: ['json', 'text', 'html', 'clover']`, producing a full Istanbul-style directory (`qa/coverage/index.html`, `coverage-final.json`, `clover.xml`, per-file `.html` pages, etc. — confirmed by listing the actual `qa/coverage/` produced by `make test`). `bun test --coverage` by default only prints a text summary to the console; producing a file requires `--coverage-reporter=lcov --coverage-dir=<dir>`, which was tested and produces **a single `lcov.info` file**, not the Istanbul directory shape:
```
$ bun test src/lib/test/ --coverage --coverage-reporter=lcov --coverage-dir=/tmp/bun-cov-test
$ find /tmp/bun-cov-test -type f
/tmp/bun-cov-test/lcov.info
```
`make/55-test.mk`'s final step (`cp -r $(TEST_STAGING)/coverage/* $(CATALYST_COVERAGE_REPORTS)`) assumes the Istanbul directory shape. A `bun test` migration would need to either (a) rewrite that copy step around a single `lcov.info`, or (b) run a separate lcov→html conversion step, or (c) accept a reduced coverage-artifact shape. This matters beyond aesthetics: `@liquid-labs/sdlc-projects-badges-coverage` is itself one of core-server's own `dependencies` (a coverage-badge plugin), so whatever currently consumes `qa/coverage/`'s shape downstream needs to be checked against whichever format is chosen — out of this spike's scope to resolve, but flagged as a concrete follow-up for whichever phase implements the `bun test` migration, if the plan chooses to make it.

**Verdict:** `bun test` is a technically viable replacement for Jest-the-runner (not for Jest-the-runtime-target, which Q3 already ruled out) with three concrete, bounded deltas to design around: (1) explicit path scoping is mandatory (no bare `bun test`), (2) the coverage-output shape changes from an Istanbul directory to a single `lcov.info` and downstream consumers need re-pointing, (3) a decision on whether to keep or drop the Babel `test-staging` step for tests specifically (both modes work). None of these are blockers; all are known, bounded engineering work.

## Q5 — Is replacing Rollup with Bun's own bundler necessary?

**No evidence found that would reopen this question. The default assumption (Rollup/Babel stay) holds.**

`make build`, run unmodified against the Bun-installed `node_modules` in the scratch copy, succeeded on both Rollup targets without any error, warning, or degraded behavior:
```
src/cli/index.js → dist/sdlcforge-server-exec.js...
created dist/sdlcforge-server-exec.js in 293ms
src/lib/index.js → dist/sdlcforge-server.js...
created dist/sdlcforge-server.js in 200ms
```
Both artifacts are the expected 9-line, externals-only shape (confirmed by direct inspection: `head -3` on each shows the same bare-`require()` pattern already documented in `bun-conversion-scope.md`), and match `main`'s currently-tracked `dist/` artifacts in line count (9 lines each, both places). Rollup and Babel are ordinary Node-targeted npm packages resolved the same way every other tool in this chain is resolved (Q1/Q2), and nothing about their invocation depends on npm having been the installer.

**Verdict: no justification found to revisit the "Rollup/Babel stay" decision.** The one input that could have reopened it — `npm explore`-based config resolution proving unworkable — did not materialize (Q1). This spike found no other candidate reason either.

## Overall verdict

**Core-server's existing Catalyst toolchain is compatible with a Bun-managed `node_modules`, with no code or makefile changes required for the build and lint tiers, and with the unit-test tier compatible either unchanged (Jest under Node, the status quo) or via a bounded, well-understood migration to `bun test` if the plan chooses to pursue that instead.**

Concretely, once `bun install` succeeds (blocked today purely by the wildcard-specifier issue already tracked in `bun-conversion-scope.md`/`wip-branch-triage.md`, not by anything this spike found):

- `make/10-resources.mk`'s four `npm explore … -- pwd` config-path lookups: **work unmodified.** (Q1)
- `make/50-*.mk` (Rollup build) and `make/55-lint.mk` (ESLint), both via `npx`: **work unmodified**, verified with full real builds/lints, not just version checks. (Q2, Q5)
- `make/55-test.mk` (Babel transpile + `npx jest`): **works unmodified** — 3/3 suites, 5/5 tests, coverage generated, exactly as today. (Q2, Q3)
- Jest *forced onto the Bun runtime* (`bunx --bun jest`) is fundamentally broken and should not be pursued; this is irrelevant to the recommendation above because Jest continuing to run under Node was never precluded by the Bun conversion. (Q3)
- A `bun test` migration, if chosen for other reasons, is technically viable but carries three concrete deltas: mandatory explicit path scoping, a coverage-output format change (Istanbul directory → single `lcov.info`, with a downstream consumer — `@liquid-labs/sdlc-projects-badges-coverage` — to re-check), and a design decision on whether to keep the Babel `test-staging` step. (Q4)
- Rollup/Babel replacement by Bun's bundler remains unjustified; no new evidence surfaced. (Q5)

**Recommendation for Phase 2 task authoring:** given Q1–Q3 all work unmodified, Phase 2's actual required work is smaller than the plan's overview anticipated — it reduces to *verifying* (not modifying) `make/10-resources.mk`, `make/50-*.mk`, and `make/55-lint.mk` against a real, pinned, `bun install`-produced `node_modules` in the actual worktree (once Phase 1 lands the pinned `package.json`/`bun.lock`), plus a **decision task** on whether to keep Jest (zero-risk, zero-change path, recommended default) or migrate to `bun test` (viable, but adds the three deltas above as real, in-scope work). If the plan wants Jest gone specifically to shed the dependency rather than for a compatibility reason, that decision should be made explicitly rather than assumed, since compatibility alone does not require it.

## Flagged follow-ups (not resolved by this spike)

1. The `bun test` env-var-isolation hazard (Q4) — `process.env.COMPLY_HOME` mutation in `app-init.test.js`'s `beforeAll` — is a latent fragility in the test files themselves, currently masked by Jest's per-file isolation. Worth a follow-up regardless of the Jest/`bun test` decision, since it means these two test files are already implicitly coupled by execution order/isolation guarantees that are runner-specific.
2. If `bun test` is adopted, `qa/coverage/`'s downstream consumer(s) — at minimum `@liquid-labs/sdlc-projects-badges-coverage`, itself a core-server dependency — need to be checked against the new `lcov.info`-only shape.
3. This spike pinned wildcard dependencies to illustrative latest-prerelease values purely to unblock `bun install` for experimentation; Phase 1 must independently re-verify and choose the actual pin set (compatibility ranges, not just "latest").
