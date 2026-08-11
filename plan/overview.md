# Bun Conversion

## Purpose and scope

Convert `@sdlcforge/core-server` from npm to Bun for package management and, subject to one open user decision, for the runtime — following the pattern already proven in the sibling project `sdlcpilot-cli`.

This plan covers core-server's own conversion only. It is item 3 of a larger modernization backlog; the full seven-phase modernization synthesis is background context, not scope.

### What must change

- `bun install` and `bun.lock` replace `npm install` and `package-lock.json`.
- Wildcard (`*`) dependency specifiers become explicit semver ranges. This is not cleanup — it is a hard prerequisite, established below.
- The Catalyst makefile toolchain must resolve and run correctly against a Bun-installed `node_modules`.
- All three test tiers must pass under the chosen toolchain and runtime.
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, and `docs/core-server-spec.md` must stop describing an npm/Node-only project where that is no longer true.

### What must not change

- **The dual build-artifact contract.** `dist/sdlcforge-server.js` (library, from `src/lib/index.js`) and `dist/sdlcforge-server-exec.js` (executable, from `src/cli/index.js`) both survive, with the same entry points and the same externals-only shape.
- **The Makefile/Catalyst build convention.** Rollup and Babel stay. Replacing them with Bun's bundler is rejected by default and would require explicit justification — the rationale is recorded in the [Bun conversion scope note](./notes/bun-conversion-scope.md).
- **The three-tier test structure.** Unit (Jest/Supertest), local integration (`test/test-server.js`), and Docker multi-version integration all remain. Switching the unit tier's *runner* from Jest to `bun test` is permitted if compatibility demands it; changing test *behavior or coverage* is not.
- **The server's HTTP API surface.** The golden-api-spec characterization test on `main` (`src/lib/test/golden-api-spec.test.js` plus `test/__snapshots__/`) is the regression harness for this and must keep passing unmodified.
- **The plugin architecture.** Three tiers, 13 explicit plugins, runtime discovery and dynamic install, all unchanged.

### Success criteria

1. `bun install` succeeds from a clean checkout and produces a working `node_modules`.
2. `make build` produces both `dist/` artifacts with unchanged entry points and externals-only output.
3. `make test`, `npm run test:local`, and `npm run test:integration` all pass, including the golden-api-spec snapshots byte-for-byte.
4. `make lint` and `make qa` pass.
5. `package-lock.json` is gone; `bun.lock` is committed.
6. No `*` version specifier remains in `package.json`.
7. Documentation matches reality.

## Current status

Planning is **blocked pending user input**. Phases are registered with no task breakdown; three user questions and two research spikes must resolve before tasks can be authored.

Two investigations are already complete and need no repetition:

- The [WIP branch triage](./notes/wip-branch-triage.md) — verification of `work-sdlcforge/core-server/64`.
- The [Bun conversion scope note](./notes/bun-conversion-scope.md) — the runtime-versus-compiled-binary determination.

Starting state is `main` at `f62b9fd`, which already carries the completed `modernization-foundation` work: `plugable-express@1.0.0-alpha.57` consumption, the `serverHome` → `serverConfigRoot` rename, the golden-api-spec characterization test, and the `test:local` path fix.

### Two findings that reshape the plan

**The WIP branch is stale, not contaminated.** `work-sdlcforge/core-server/64` branched from `dd775e0`, **45 commits** behind current `main`. Diffing it against `main` renders main's newer work as branch-side deletions, which inverted three earlier conclusions: the `'snippets'` name/summary was pre-existing and is *already fixed on main* (the branch never touched that file); the golden-api-spec artifacts were *added to main after* the branch point and were never removed by anything; and the branch's `test/*.js` changes are stale lint reformatting that would **revert** main's `test:local` path fix. The branch is a read-only reference — not merged, rebased, or cherry-picked. Its one durable contribution is the dependency-pinning intent.

**`bun install` currently fails outright.** Against `main`'s `package.json` it errors on all 11 wildcard dependencies:

```
error: No version matching "*" found for specifier "@liquid-labs/liq-controls" (but package exists)
```

Every one of these packages publishes only `1.0.0-alpha.N` prereleases, and a bare `*` does not match a prerelease under strict semver. npm tolerates this; Bun does not. Pinning is therefore the first blocking task, not a tidiness pass.

A second resolution failure compounds it: `.yalc/` and `yalc.lock` are gitignored, so the six `file:.yalc/…` dependencies cannot resolve in a fresh clone, a task worktree, CI, or the Docker container. Every task worktree in this plan will hit this, so provisioning must be solved in Phase 1 before anything downstream can install.

### Open user questions

1. **`serverConfigRoot` value** — `main`'s package-relative `myPackagePath`, or the WIP branch's `~/.config/comply-server`? Both are defensible; the author's own local spike used the latter.
2. **Executable shebang** — does `dist/sdlcforge-server-exec.js` keep `#!/usr/bin/env -S node --enable-source-maps` or become `#!/usr/bin/env -S bun`? This decides whether Bun becomes a hard runtime requirement for consumers, and it governs the shape of `engines`, the Docker matrix, and the spec's runtime claims.
3. **Five unexplained dependencies** — `git-toolkit`, `github-toolkit`, `npm-toolkit`, `playground-monitor`, `sdlc-lib-build` were added by the WIP branch but are imported by nothing and registered as plugins nowhere.

### Open research

1. **Catalyst toolchain compatibility under Bun** — chiefly whether `npm explore <pkg> -- pwd`, which every Catalyst tool-config path depends on, has a working equivalent, and whether Jest survives.
2. **Bun `file:`/yalc resolution and worktree provisioning** — how `bun install` handles yalc links, and how a task worktree or container gets a resolvable dependency tree at all.

## Overview

Three phases, strictly sequential: each leaves the project in a working state, and each depends on the previous phase's output.

### Phase 1 — Bun package-management baseline

Makes `bun install` work. Pins every wildcard specifier to a re-verified `^1.0.0-alpha.N` range, replaces `package-lock.json` with a freshly generated `bun.lock`, minimizes and documents the `file:.yalc/…` set, and establishes a repeatable procedure for provisioning dependencies into a task worktree, CI, and the Docker container.

The build and test toolchain is deliberately left alone here — `npx`-driven Babel, Rollup, Jest, and ESLint all operate on `node_modules` and are indifferent to which tool installed it. That keeps the phase's blast radius to dependency resolution and gives a clean before/after signal.

**Exit state:** `bun install` succeeds from clean; `make build`, `make test`, and `make lint` still pass exactly as before.

### Phase 2 — Build and test toolchain under Bun

Repoints the Catalyst makefiles off npm. The known pressure point is `make/10-resources.mk`, where all four tool configs resolve through `npm explore @liquid-labs/catalyst-resource-… -- pwd`; `npx` invocations of Babel, Rollup, Jest, and ESLint are the second. Whether the unit tier stays on Jest or moves to `bun test` is decided by the compatibility spike, not by preference — and if it moves, the Babel `test-staging` transpile step and the `__dirname`-relative path traversals in `app-init.test.js` and `golden-api-spec.test.js` must be reworked to match.

Rollup and Babel remain the bundler and transpiler.

**Exit state:** `make build`, `make test`, `make lint`, and `make qa` all run without npm on the path; both `dist/` artifacts are byte-comparable in shape; golden-api-spec snapshots pass unchanged.

### Phase 3 — Runtime target and integration tiers

Settles the runtime per the user's shebang answer, then brings the two integration tiers into line: `scripts/start.sh` (which hardcodes `node ${SERVER_EXEC}`), `scripts/test.sh` (which calls `npm run build` and `node test/test-server.js`), and the Docker tier (`test/Dockerfile`, `test/run-integration-tests.sh`, `test/setup-local-deps.sh`, which provisions `file:` dependencies inside the container).

The Docker matrix question resolves as a consequence of the shebang answer rather than independently: a `node` shebang keeps the Node 18–24 matrix as the meaningful compatibility contract; a `bun` shebang makes that matrix largely vestigial and calls for a Bun dimension instead.

Also resolves the `serverConfigRoot` decision. If the HOME-based root is chosen, it is added as a `@liquid-labs/comply-defaults` accessor rather than inlined, per the project's centralized-configuration convention — and guarded, since the WIP branch's unguarded `process.env.HOME` throws on Windows.

**Exit state:** all three test tiers pass; `npm start`/`npm stop` work against the chosen runtime.

### Documentation

A documentation phase is expected but is not registered yet. The conversion changes spec-defined behavior (the runtime contract in `docs/core-server-spec.md`), the build pipeline and tech stack in `docs/architecture.md`, and every build/test/run command in `AGENTS.md`, `CLAUDE.md`, and `README.md`. The architectural-implications check runs once the plan is complete, so this phase is registered on re-invocation.

### Parallelism

None across phases — Phase 2 needs Phase 1's resolvable dependency tree, and Phase 3 needs Phase 2's working build. Task-level parallelism within each phase will be identified when the breakdown is authored.
