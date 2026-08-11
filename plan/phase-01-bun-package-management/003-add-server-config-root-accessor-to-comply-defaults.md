# Add Server Config Root Accessor To Comply Defaults

## Purpose and scope

**This task executes in a different repository.** Its working tree is a checkout of `@liquid-labs/comply-defaults` (`git+ssh://git@github.com/liquid-labs/comply-defaults.git`, present on the author's machine at `/Users/zane/playground/liquid-labs/comply-defaults`), **not** `@sdlcforge/core-server`. Nothing in `core-server` is edited here. The manager must provision this task's worktree against the comply-defaults repository; a `core-server` worktree cannot satisfy it.

The user's [`serverConfigRoot` decision](../notes/server-config-root-decision.md) requires the new configuration root to be resolved through `@liquid-labs/comply-defaults`, which `AGENTS.md` names as core-server's centralized configuration mechanism. comply-defaults has no such accessor today, so it must be added and published before core-server can consume it. This task is sequenced first in the plan precisely because of that publish lead time; it is independent of the other Phase 1 tasks and can run in parallel with task 001.

No standard skill covers this; follow the procedure below.

## Requirements

1. **Add `COMPLY_SERVER_CONFIG_ROOT()` to `src/locations.mjs`.** It resolves to `${XDG_DATA_HOME}/sdlcforge-core`, with `XDG_DATA_HOME` defaulting to `${HOME}/.local/share` per the XDG Base Directory specification.

   Follow the shape of the accessors already in that file — a zero-argument arrow function exported by name, computing its path at call time rather than at module load, so tests and callers can vary the environment.

2. **Guard against an undefined `HOME`.** The existing module-level `const configDir = process.env.XDG_CONFIG_HOME || fsPath.join(process.env.HOME, '.config')` throws a `TypeError` from `fsPath.join` when `HOME` is undefined — the exact defect the WIP branch reproduced. The new accessor must not repeat it. Choose and implement one explicit behavior for the `XDG_DATA_HOME`-unset-and-`HOME`-unset case:
   - Fall back to `os.homedir()`, which is defined on Windows and in most environments where `HOME` is not, then to a documented last resort.
   - Or throw a *named, explanatory* error rather than a bare `TypeError` from a path join.

   Whichever is chosen, state it in the task report and cover it with a test. Do **not** silently produce a path containing `undefined`.

   Fixing the pre-existing unguarded `configDir` is **not** required by this task, but is a legitimate small improvement if it can be made without changing `COMPLY_HOME()`'s behavior for any environment where `HOME` *is* set. If it is changed, say so explicitly in the report; if it is left alone, flag it as a followup.

3. **Do not change any existing accessor's return value.** `COMPLY_HOME()`, `COMPLY_API_SPEC_PATH()`, `COMPLY_PID_PATH()`, `COMPLY_SERVER_PLUGIN_DIR()`, `COMPLY_PORT()`, and `COMPLY_SERVER_CLI_NAME()` all keep their current behavior. In particular, `COMPLY_HOME()` stays on `XDG_CONFIG_HOME` / `~/.config/comply-server` — the new accessor is an addition, not a redefinition, and the two roots are deliberately different (config-home versus data-home).

4. **Add unit tests** in `src/test/locations.test.js`, matching the existing style there:
   - Default resolution when `XDG_DATA_HOME` is unset.
   - Resolution honoring `XDG_DATA_HOME` when set.
   - The undefined-`HOME` guard behaving as chosen in requirement 2.
   - Each test restores the environment in a `finally`, as the existing tests do.

5. **Publish a new prerelease.** Run the repository's own release path (its `Makefile` / `package.json` scripts; `prepack` runs `make build` and `preversion` runs `make test && make lint`). The result must be a published `1.0.0-alpha.9` (or the next available prerelease of the `1.0.0` tuple), so that core-server's existing `^1.0.0-alpha.8` range picks it up with no `package.json` edit on the core-server side.

   If publishing is not possible in the task's environment — missing npm credentials, for example — **stop and report** with the commit ready to publish rather than working around it. Do not yalc-link comply-defaults into core-server as a substitute: Phase 1's whole thrust is to shrink, not grow, the `file:.yalc/…` surface.

6. **Report the published version number.** Task 004 needs it to verify what it installed.

## Validation

- `make test` (or `npm test` / `bun run test`) passes in the comply-defaults checkout, including the new cases.
- `make lint` passes, or reports only violations that were already present before this change.
- `make build` succeeds and `dist/comply-defaults.js` exports `COMPLY_SERVER_CONFIG_ROOT` — verify by requiring the built artifact, not just the source: `node -e "console.log(typeof require('./dist/comply-defaults.js').COMPLY_SERVER_CONFIG_ROOT)"` prints `function`.
- Behavioral spot-checks against the built artifact:
  - With `XDG_DATA_HOME=/tmp/xdg-probe`, the accessor returns `/tmp/xdg-probe/sdlcforge-core`.
  - With `XDG_DATA_HOME` unset and `HOME=/tmp/home-probe`, it returns `/tmp/home-probe/.local/share/sdlcforge-core`.
  - With both unset, it behaves as requirement 2 specifies and never returns a string containing `undefined`.
- `COMPLY_HOME()` still returns `${XDG_CONFIG_HOME:-$HOME/.config}/comply-server` — unchanged.
- `npm view @liquid-labs/comply-defaults versions --json` lists the newly published prerelease.

## Metadata

architectural_impact: false

## Assumptions

- The comply-defaults checkout is clean and on its main branch at `bdb6050` or later, with `1.0.0-alpha.8` as the latest published version.
- This repository's own toolchain (`@liquid-labs/catalyst-scripts-node-project`) is intact; this task does not convert comply-defaults to Bun and must not attempt to.
- npm publish credentials for the `@liquid-labs` scope are available in the task environment. If they are not, halt and report.

## References

- [`serverConfigRoot` decision](../notes/server-config-root-decision.md) — the user's answer and its stated guarding requirement.
- [WIP branch triage](../notes/wip-branch-triage.md) — the original defect analysis, including the unguarded `process.env.HOME` and the centralized-configuration argument.
- The [XDG Base Directory specification](https://specifications.freedesktop.org/basedir-spec/latest/) — the source of the `XDG_DATA_HOME` default.

## Checkpoint hints

- After the accessor and its tests are written and `make test` passes.
- After `make build` and the built-artifact spot-checks pass, before publishing.
