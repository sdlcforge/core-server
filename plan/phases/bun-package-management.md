# Bun Package Management

## Goals

Make `bun install` work at all, and make it work from a clean checkout rather than only on the author's machine.

This phase comes first because it is a hard blocker on everything else: `bun install` against current `main` fails to resolve **every one of the 11 wildcard dependencies**, so no downstream phase can even produce a `node_modules` to build or test against.

Two distinct resolution failures are in scope:

1. **Wildcard specifiers.** All 11 `"*"` dependencies resolve to nothing under Bun, because these packages publish only `1.0.0-alpha.N` prereleases and a bare `*` does not match a prerelease under strict semver. Each becomes an explicit `^1.0.0-alpha.N` range, **re-verified against currently-published versions** rather than transcribed from the WIP branch — that branch's list contains an `^1.0.0-alpah.2` typo that would silently reintroduce the failure.

2. **Gitignored yalc links.** `.yalc/` and `yalc.lock` are gitignored, so the `file:.yalc/…` dependencies resolve on the author's machine and nowhere else — not in a fresh clone, a task worktree, CI, or the Docker container. This phase minimizes that set to what the local dev loop genuinely requires (three of the WIP branch's four additions have published releases and need no link at all) and establishes a documented, repeatable provisioning procedure. Every later task worktree depends on this working.

The build and test toolchain is deliberately **out of scope** here. Babel, Rollup, Jest, and ESLint are invoked through `npx` and operate on `node_modules` without caring which tool populated it, so leaving them untouched keeps this phase's blast radius confined to dependency resolution and yields a clean before/after signal: if `make build` and `make test` still pass afterward, the dependency tree Bun produced is equivalent to the one npm produced.

## Inputs

- `main` at `f62b9fd`, which already carries `plugable-express@1.0.0-alpha.57`, the `serverConfigRoot` rename, and the golden-api-spec characterization test.
- The [WIP branch triage](../notes/wip-branch-triage.md) — the dependency-pinning intent extracted from `work-sdlcforge/core-server/64`, plus the verified published-version table and the explicit warning not to copy the pin list verbatim.
- Answers to the research spike on Bun `file:`/yalc resolution and worktree provisioning.
- The user's answer on the five unexplained added dependencies (`git-toolkit`, `github-toolkit`, `npm-toolkit`, `playground-monitor`, `sdlc-lib-build`) — whether they are dropped, added as explicit plugins, or retained as transitive backfill.
- Bun `1.3.14`; the six packages currently linked under `.yalc/`.

## Outputs

- `package.json` with no `*` specifier remaining, and a minimized, justified `file:.yalc/…` set.
- `bun.lock`, freshly generated — **not** the WIP branch's stale copy, which predates `main`'s `plugable-express@1.0.0-alpha.57` bump.
- `package-lock.json` deleted.
- A documented procedure for provisioning a resolvable dependency tree into a task worktree, CI, and the Docker container, covering the gitignored-yalc case. This is the output every subsequent phase's task agents depend on operationally.
- Any `.gitignore` adjustments the lockfile switch requires.
- Confirmation that `make build`, `make test`, and `make lint` still pass unchanged against the Bun-installed tree — the equivalence check that licenses Phase 2 to start.
