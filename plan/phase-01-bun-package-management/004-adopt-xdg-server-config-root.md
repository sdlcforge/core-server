# Adopt XDG Server Config Root

## Purpose and scope

Switch `@sdlcforge/core-server`'s `serverConfigRoot` from the package-relative `myPackagePath` to `${XDG_DATA_HOME}/sdlcforge-core/`, consuming the `COMPLY_SERVER_CONFIG_ROOT()` accessor published by task 003 — and preserve the packaged `server-settings.yaml` defaults that the move would otherwise silently drop.

Scope is `src/lib/app-init.mjs` plus whatever minimal support the settings-seeding requirement needs, and the `bun.lock` refresh that picking up the new comply-defaults release entails. Documentation is out of scope; phase 4 covers it.

No standard skill covers this; follow the procedure below.

## Requirements

1. **Replace the `serverConfigRoot` value.** In `src/lib/app-init.mjs`, `serverConfigRoot : myPackagePath` becomes `serverConfigRoot : COMPLY_SERVER_CONFIG_ROOT()`, with the accessor added to the existing named import from `@liquid-labs/comply-defaults`.

   Do **not** inline an `fsPath.join(process.env.XDG_DATA_HOME || …)` expression. The whole point of the user's decision is that this resolves through the project's centralized configuration mechanism.

2. **Keep `myPackagePath` only if something still uses it.** After the change, `myPackagePath` exists solely to derive `serverConfigRoot`; `packageJSONPath` is still needed to read `pkgVersion`. Remove the now-dead `myPackagePath` binding (and its comment, which describes the old semantics) unless requirement 3's implementation needs it — in which case retarget its comment to say what it is actually for.

3. **Preserve the packaged `server-settings.yaml` defaults.** This is the non-obvious consequence of the move and must not be skipped.

   `@liquid-labs/plugable-express` reads `<serverConfigRoot>/server-settings.yaml` during `appInit` and, when the file is absent, **writes an empty `{}` there**. This repository ships a `server-settings.yaml` at its package root carrying the `registries:` list that points at the plugable-registry, and it is found today only because `serverConfigRoot` *is* the package root. Moving the root to `${XDG_DATA_HOME}/sdlcforge-core/` therefore silently replaces that setting with an empty object on first start.

   Ensure the packaged defaults survive. The recommended mechanism is to seed them: before delegating to `superInit`, if `<COMPLY_SERVER_CONFIG_ROOT()>/server-settings.yaml` does not exist, create the directory (recursively) and copy the package's own `server-settings.yaml` — resolved relative to `packageJSONPath`'s directory — into it. Seeding must be:
   - **First-run only.** Never overwrite a file that already exists at the destination; a user's edits there are authoritative.
   - **Non-fatal.** A failure to seed (read-only filesystem, permission denied) must not prevent the server from starting. Log or ignore, do not throw.
   - **Skipped when the caller overrides `serverConfigRoot`.** `options` is spread over the defaults, so a caller-supplied `serverConfigRoot` wins — as both unit tests do. Seeding must key off the *effective* root, or be skipped entirely when the caller supplied one, so tests do not write into a temp directory they did not ask to be populated.

   If a materially simpler mechanism is available (for instance, if `plugable-express` already exposes a defaults-merging hook), prefer it and say so in the report.

4. **Refresh the dependency tree.** `package.json`'s `@liquid-labs/comply-defaults` range is `^1.0.0-alpha.8`, which already matches task 003's new publish, so no specifier edit is needed. Run `bun install` so `bun.lock` records the new resolved version, and commit the lockfile change. Confirm the installed version is the one task 003 published.

5. **Do not touch** `make/*.mk`, `scripts/`, `test/`, or the `explicitPlugins` array.

## Validation

- `grep -n 'myPackagePath' src/lib/app-init.mjs` shows no dead binding, and `grep -n 'COMPLY_SERVER_CONFIG_ROOT' src/lib/app-init.mjs` shows both the import and the `serverConfigRoot` use.
- `grep -n 'process.env.XDG' src/lib/app-init.mjs` returns nothing — the resolution is not inlined.
- `bun install` succeeds and `node_modules/@liquid-labs/comply-defaults/package.json` reports the version task 003 published. `bun.lock` shows the corresponding change.
- `make test` passes: 3 suites, 5 tests, with `test/__snapshots__/golden-api-spec.json` and `golden-plugins-list.json` unchanged in `git status`. Both unit tests pass an explicit `serverConfigRoot` into `appInit`, so this change must not perturb them — a snapshot diff here means the seeding logic is leaking into the test path.
- Seeding behaves correctly, verified directly rather than inferred. With a scratch `XDG_DATA_HOME`:
  - Starting the server (`make build` then running the built executable, or a small `node -e` harness calling `appInit()` with no `serverConfigRoot`) creates `$XDG_DATA_HOME/sdlcforge-core/server-settings.yaml`, and that file contains the `registries:` entry from the repository's own `server-settings.yaml` — **not** an empty `{}`.
  - Running a second time does not overwrite a hand-modified file at that path.
  - With `XDG_DATA_HOME` unset and `HOME` set to a scratch directory, the root resolves under `$HOME/.local/share/sdlcforge-core`.
- `make build` still produces both `dist/` artifacts, unchanged in shape, with `dist/sdlcforge-server-exec.js` still beginning `#!/usr/bin/env -S node --enable-source-maps`.
- `make lint` reports no *new* violations in `src/lib/app-init.mjs`.
- `git diff` touches only `src/lib/app-init.mjs`, `bun.lock`, and any new support file the seeding required.

## Metadata

architectural_impact: true

## Assumptions

- Task 003 has published a comply-defaults prerelease exporting `COMPLY_SERVER_CONFIG_ROOT()`. **This task is blocked until it has.** If the accessor is not resolvable from `node_modules` after `bun install`, halt and report rather than inlining the logic locally.
- Task 001 has landed, so `bun.lock` exists and the wildcard specifiers are pinned.
- This task's worktree needs `.yalc/` provisioned before `bun install`, as every task in this plan does.
- Neither unit test is affected by the default config root, because both pass `serverConfigRoot` explicitly. If either starts failing, the cause is this task's seeding logic, not the root change itself.
- The *running-server* consequences of the new root are first exercised by phase 3's integration tiers, not here.

## References

- [`serverConfigRoot` decision](../notes/server-config-root-decision.md) — the user's answer.
- [WIP branch triage](../notes/wip-branch-triage.md) — the original analysis, including why the WIP branch's inlined, unguarded `process.env.HOME` value is rejected.
- [`plan/overview.md`](../overview.md) — the `server-settings.yaml` finding and its place in the plan.
- `server-settings.yaml` at the repository root — the packaged defaults being preserved.

## Checkpoint hints

- After the accessor is consumed and `bun install` picks up the new comply-defaults release.
- After the seeding mechanism is implemented and its first-run behavior is verified.
- After `make test` and `make build` pass.

## Status

**Outcome:** succeeded. Date: 2026-08-11.

`src/lib/app-init.mjs` now imports `COMPLY_SERVER_CONFIG_ROOT` alongside the existing `@liquid-labs/comply-defaults` accessors and uses it for `serverConfigRoot`, replacing `myPackagePath`. `myPackagePath` is retained (per requirement 2's carve-out) because the new `seedServerSettings` helper needs it to locate the packaged `server-settings.yaml`; its comment was retargeted to describe that actual purpose. `seedServerSettings` is a first-run-only, non-fatal seed of the packaged `server-settings.yaml` defaults into the effective `serverConfigRoot`, invoked only when the caller did not supply its own `serverConfigRoot` (keyed off `options?.serverConfigRoot === undefined`, before the `...options` spread that lets a caller-supplied value win). No materially simpler mechanism (e.g. a `plugable-express` defaults-merging hook) was found, so the recommended seed-file approach from the task doc was implemented as described.

`bun install` initially resolved `@liquid-labs/comply-defaults` at `1.0.0-alpha.8` because the existing `bun.lock` entry already satisfied `^1.0.0-alpha.8` and a bare `bun install` does not re-resolve to a newer satisfying version when the lockfile already has one. `bun update @liquid-labs/comply-defaults` was used instead to bump the lockfile to the newly published `1.0.0-alpha.9` (confirmed against `node_modules/@liquid-labs/comply-defaults/package.json`); `bun update` also rewrote `package.json`'s specifier to `^1.0.0-alpha.9` as a side effect, which was reverted back to `^1.0.0-alpha.8` per the task doc's requirement 4 (no specifier edit needed) and re-verified with a follow-up `bun install` that the resolved version stays `1.0.0-alpha.9` under the original range.

`make lint-fix` (run once, per the Node Developer role's autofixer-first responsibility) also reformatted four pre-existing, unrelated `test/*.js` files (stale ESLint/Catalyst-style issues, consistent with the `WIP branch triage` note's finding that these are regenerable and unrelated to this task); those four files were reverted with `git checkout --` since the task doc explicitly excludes `test/` from scope, leaving `git diff` scoped to exactly `src/lib/app-init.mjs` and `bun.lock`.

**Validation summary:**
- `grep -n 'myPackagePath'` / `grep -n 'COMPLY_SERVER_CONFIG_ROOT'` in `src/lib/app-init.mjs`: passed (binding is used, not dead; import and use both present).
- `grep -n 'process.env.XDG' src/lib/app-init.mjs`: passed (no match).
- `bun install` / `bun update`: passed; `node_modules/@liquid-labs/comply-defaults/package.json` reports `1.0.0-alpha.9`; `bun.lock` updated accordingly (`git diff --staged bun.lock` shows only the version/hash bump plus one duplicated-resolution entry from a transitive requirer).
- `make test`: passed — 3 suites, 5 tests; `test/__snapshots__/golden-api-spec.json` and `golden-plugins-list.json` unchanged in `git status`.
- Seeding behavior, verified directly via a scratch `node` harness invoking the built `dist/sdlcforge-server.js`'s `appInit()` with no `serverConfigRoot`:
  - First run with scratch `XDG_DATA_HOME` created `$XDG_DATA_HOME/sdlcforge-core/server-settings.yaml` containing the repository's `registries:` entry, not `{}`.
  - Second run did not overwrite a hand-edited file at that path.
  - With `XDG_DATA_HOME` unset and `HOME` pointed at a scratch directory, the root resolved to `$HOME/.local/share/sdlcforge-core/server-settings.yaml`.
- `make build`: passed — both `dist/` artifacts produced, unchanged shape; `dist/sdlcforge-server-exec.js` still begins `#!/usr/bin/env -S node --enable-source-maps`.
- `make lint`: passed for scope — no violations reported against `src/lib/app-init.mjs` (confirmed after `make lint-fix` normalized key-spacing in the new `superInit` call block); the 231 remaining repo-wide lint errors are all in `test/*.js`, pre-existing, and out of this task's scope.
- `git diff` scope: passed — touches only `src/lib/app-init.mjs` and `bun.lock`. No new support file was needed; seeding is implemented entirely within `app-init.mjs`.

**Assumptions applied:** task 003's `COMPLY_SERVER_CONFIG_ROOT()` accessor was resolvable from `node_modules` after `bun install`, so no halt was needed. Neither unit test was perturbed by the seeding logic, confirming the "both unit tests pass `serverConfigRoot` explicitly" assumption held.

Affected source files:
- `src/lib/app-init.mjs`
- `bun.lock`
