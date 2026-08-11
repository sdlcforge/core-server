# Bun Package Management

## Goals

Make `bun install` work at all, make it work somewhere other than the author's machine, and land the `serverConfigRoot` relocation.

This phase comes first because it is a hard blocker on everything else: `bun install` against current `main` fails to resolve **every one of the 12 wildcard dependencies**, so no downstream phase can even produce a `node_modules` to build or test against.

Three concerns are in scope:

1. **Wildcard specifiers.** All 12 `"*"` dependencies resolve to nothing under Bun, because these packages publish only `1.0.0-alpha.N` prereleases and a bare `*` does not match a prerelease under strict semver. Each becomes an explicit range, **re-verified against currently-published versions** rather than transcribed from the WIP branch — that branch's list contains an `^1.0.0-alpah.2` typo that would silently reintroduce the failure. The WIP branch's five added dependencies are dropped outright.

2. **Gitignored yalc links.** `.yalc/` and `yalc.lock` are gitignored, so the two `file:.yalc/…` dependencies resolve on the author's machine and nowhere else — not in a fresh clone, a task worktree, CI, or the Docker container. This phase produces a checked-in provisioning script for the worktree case, records the CI position as an explicit policy rather than an assumption, and corrects the post-`yalc push` instruction, which under Bun is strictly stronger than its npm predecessor: a bare `bun install` silently fails to pick up a linked package's newly-added transitive dependencies, and only `rm -f bun.lock && bun install` re-resolves them.

3. **The configuration root.** `serverConfigRoot` moves from the package-relative `myPackagePath` to `${XDG_DATA_HOME}/sdlcforge-core/`, resolved through a new `@liquid-labs/comply-defaults` accessor. This lands here rather than in a later phase because its first step executes in a **different repository** and carries npm publish lead time that should start as early as possible. It also carries a consequence the original decision did not contemplate: `@liquid-labs/plugable-express` reads `<serverConfigRoot>/server-settings.yaml`, and this repository's shipped `server-settings.yaml` — carrying the `registries:` list — is found today only because the config root *is* the package root.

The build and test toolchain is deliberately **out of scope** here. Babel, Rollup, Jest, and ESLint are invoked through `npx` and operate on `node_modules` without caring which tool populated it, so leaving them untouched keeps this phase's blast radius confined to dependency resolution and yields a clean before/after signal: if `make build` and `make test` still pass afterward, the dependency tree Bun produced is equivalent to the one npm produced.

## Inputs

- `main` at `f62b9fd`, which already carries `plugable-express@1.0.0-alpha.57`, the `serverConfigRoot` rename, and the golden-api-spec characterization test.
- The [WIP branch triage](../notes/wip-branch-triage.md) — the dependency-pinning intent extracted from `work-sdlcforge/core-server/64`, plus the explicit warning not to copy the pin list verbatim.
- The [yalc-provisioning research](../notes/bun-yalc-provisioning.md), which establishes Bun's `file:` copy semantics, the `bun.lock` transitive-graph caching trap, and the three per-environment provisioning answers.
- The answered decisions on [`serverConfigRoot`](../notes/server-config-root-decision.md) and [the WIP branch's added dependencies](../notes/added-dependencies-decision.md).
- Bun `1.3.14`; the two `package.json`-declared `file:.yalc/…` dependencies (`plugable-express`, `liq-projects`) against six directories present under `.yalc/`.
- A working checkout of `@liquid-labs/comply-defaults` and the ability to publish a new prerelease of it.

## Outputs

- `package.json` with no `*` specifier remaining and the `file:.yalc/…` set unchanged at two entries.
- `bun.lock`, freshly generated — **not** the WIP branch's stale copy, which predates `main`'s `plugable-express@1.0.0-alpha.57` bump.
- `package-lock.json` deleted.
- A checked-in script that provisions `.yalc/` into a worktree and installs, plus the corrected post-`yalc push` instruction and a recorded CI policy. This is the output every subsequent phase's task agents depend on operationally.
- A published `@liquid-labs/comply-defaults` carrying a guarded `COMPLY_SERVER_CONFIG_ROOT()` accessor.
- `src/lib/app-init.mjs` consuming that accessor, with the packaged `server-settings.yaml` defaults preserved at the new location.
- Confirmation that `make build`, `make test`, and `make lint` still pass against the Bun-installed tree — the equivalence check that licenses Phase 2 to start.
