# Phase — Validation Gate And Regression Coverage

## Goals

Turn the declarations into an **enforced** gate, so a future edit that breaks the plugin graph fails the build instead of shipping.

A manifest nobody runs is documentation with extra steps. This phase attaches the upstream validator to `core-server`'s own Catalyst build via a hand-authored `make/56-plugin-graph.mk` appending to `TEST_TARGETS` — which puts it in `make test` and, because `qa: test lint`, in `make qa` as well, reaching `bun run test`, `bun run qa`, and `bun run build`'s adjacent entry points with one line and no edit to any Catalyst-generated fragment.

It also builds the regression coverage that proves the gate detects what it claims to. Three shapes are worth asserting, and all three are real graphs rather than synthetic ones:

- **The absorbed-donor conflict.** Re-introducing `liq-controls`, `liq-credentials`, or `liq-integrations-issues-github` duplicates an exclusive `provides` of an in-tree component. Today the first two fail late and cryptically (`Non-unique command path`, `Path variable 'credential' is already registered.`) and the third fails *silently and forever*. Asserting each becomes a detected `conflict` naming both providers is the clearest win available and depends on nothing outside this repository.
- **The `ynGa` shape.** `src/credentials/`'s `setupArg:serverConfigRoot` requirement checked against a framework manifest from which the name has been removed — the exact rename that caused the bug, producing an `unsatisfied` finding that names the component, the capability, and (via `supersedes:`) the new name.
- **The ordering shape.** `appExt:credentialsDB` provided at `load` by a builtin component, with its requirer at the same phase — the edge that is provable only because builtins are loading source #1. Its scope depends on the preceding phase's decision; if no requirer can be declared, the assertion narrows to the provider's resolved load position, which is still worth pinning because it is the fact the whole edge rests on.

## Inputs

- Everything the three preceding phases produce: the verified framework dependency, the `plugable.host` block, the three populated components, and whatever third-party coverage was decided.
- `make/95-final-targets.mk`'s target algebra (`test: $(TEST_TARGETS)`, `qa: test lint`), `make/10-locations.mk`'s `$(QA)` definition, and `make/55-test.mk`'s Jest invocation — which runs from `$(TEST_STAGING)` over Babel output, not from the package root.
- The validator's exit-code contract: `0` clean, `1` validation failure, `2` resolution failure, where `2` means "I could not tell" rather than "fine."
- The recipe worked out in [build-wiring-and-dependency-refresh.md](../notes/build-wiring-and-dependency-refresh.md), including the `packageRoot` hazard that a Jest-driven gate hits because `process.cwd()` is `test-staging/` and not the package root — a mistake that surfaces as a `resolution-failure` looking like a framework bug.

## Outputs

- `make/56-plugin-graph.mk`, hand-authored, carrying an inverted banner saying so — every sibling fragment announces itself as Catalyst-generated, and without the counter-statement a future regeneration pass reads this one as stale output and removes it.
- A green `make test` / `make qa` / `bun run qa` with the gate active, and a demonstrated red: deliberately breaking a declaration must fail the build, or the gate is not wired.
- Regression coverage for the shapes above, in `src/lib/test/`, alongside the existing `builtin-plugins.test.js` and `full-tier-baseline.test.js` — the latter of which is the current keeper of the `app.ext.credentialsDB` ordering contract, in a comment.
- Confirmation that existing behavior is untouched: the golden API spec and full-tier baseline snapshots unchanged, and `appInit()` byte-identical in effect. The manifest is additive and declarative on top of the existing four-source loading model, never a replacement for it — the upstream framework does not modify `appInit` at all, so nothing in `core-server`'s runtime path should change either. Any snapshot movement is a regression, not an expected diff.
- A stated coverage boundary in the gate's own output: the validated set is `builtinPlugins` plus the Server Package Root; `dynamicPluginInstallDir` and `pluginPaths` remain functional and outside the guarantee. `core-server` passes `dynamicPluginInstallDir: COMPLY_HOME()` today, so this is a live distinction for this host, not a hypothetical one.
