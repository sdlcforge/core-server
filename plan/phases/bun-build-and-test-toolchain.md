# Bun Build And Test Toolchain

## Goals

Move the Catalyst build and test toolchain off npm, so that `make build`, `make test`, `make lint`, and `make qa` work because they were made to work under Bun — not because npm happens to still be installed on the developer's machine. Node `v26.5.0` and npm `11.17.0` are both present locally, so the toolchain can keep working by accident after Phase 1; validation in this phase must actively rule that out.

Two known pressure points, both in generated Catalyst makefiles:

- **Config-path resolution.** `make/10-resources.mk` locates all four tool configurations through `$(shell npm explore @liquid-labs/catalyst-resource-… -- pwd)`. Bun ships no `explore` equivalent. Whether this keeps working against a Bun-installed `node_modules`, needs a Bun-native replacement, or should resolve the path directly is the spike's primary question.
- **Tool invocation.** `npx babel`, `npx rollup`, `npx jest`, and `npx eslint` across `10-resources.mk`, `55-test.mk`, and `55-lint.mk`.

The unit-test runner is decided by compatibility evidence, not preference. Jest is retained if it runs; `NODE_OPTIONS=--experimental-vm-modules` in `make/55-test.mk` is Node-specific and is the most likely failure point. If the unit tier must move to `bun test`, the change is larger than a command swap: `make/55-test.mk` Babel-transpiles `src/` into `test-staging/` before Jest runs, and the tests navigate relative to that layout — `app-init.test.js` and `golden-api-spec.test.js` both reach `package.json` and `test/__snapshots__/` via `fsPath.join(__dirname, '..', '..', '..', …)`. Running tests directly from `src/` invalidates every one of those traversals. Coverage output to `qa/coverage/` must also survive the move.

Rollup and Babel stay. Replacing them with Bun's bundler is rejected by default; the rationale is recorded in the [Bun conversion scope note](../notes/bun-conversion-scope.md). The one input that could reopen it is a spike finding that `npm explore`-based config resolution is genuinely unworkable under Bun — which is why the spike asks rather than assumes.

Any change to `make/*.mk` carries a standing caveat: these files are **generated** by `@liquid-labs/catalyst-lib-makefiles` and `@liquid-labs/catalyst-builder-node` and carry a header saying so. Hand-edits will be lost on regeneration, so each edit should be recorded as an upstream-divergence follow-up.

## Inputs

- Phase 1's resolvable Bun dependency tree and worktree-provisioning procedure.
- The Catalyst toolchain compatibility spike findings.
- The existing `make/*.mk` set, the golden-api-spec snapshots as the regression oracle, and the `qa/coverage/` output contract.

## Outputs

- Updated `make/*.mk` files whose tool-config resolution and tool invocation no longer depend on npm.
- A working `make build` producing both `dist/` artifacts with unchanged entry points and unchanged externals-only shape.
- A working `make test` — Jest or `bun test` per the spike — with the golden-api-spec snapshots passing unmodified and coverage still written to `qa/coverage/`.
- Working `make lint`, `make lint-fix`, and `make qa`.
- Updated `package.json` scripts where they invoke npm-specific behavior.
- A recorded list of divergences from generated Catalyst output, for upstream follow-up.
