# Convert Local Integration Tier

## Purpose and scope

Convert the operational scripts and the local integration tier off npm invocation, confirm the runtime target is genuinely unchanged, and verify the server actually runs against the new XDG configuration root.

This is the first point in the plan where a **running** server exercises phase 1 task 004's config-root change — both unit tests override `serverConfigRoot` explicitly, so nothing before this has run the real default.

Scope is `scripts/start.sh`, `scripts/stop.sh`, `scripts/test.sh`, and the `bun run test:local` path through `test/test-server.js`. The Docker tier is task 002's; documentation is phase 4's.

No standard skill covers this; follow the procedure below.

## Requirements

1. **Confirm the runtime target is unchanged** before altering anything. The [runtime-target decision](../notes/runtime-target-decision.md) is a deliberate no-change:
   - `make/50-sdlcforge-server-exec-js.mk` still emits `JS_OUT_PREAMBLE='#!/usr/bin/env -S node --enable-source-maps'`.
   - `package.json`'s `engines.node` is still `>=18.0.0`, and no `engines.bun` constraint is added.
   - A freshly built `dist/sdlcforge-server-exec.js` carries the `node` shebang.

   If any of these has drifted, halt and report — that would mean an earlier task exceeded its scope.

2. **Convert npm invocations in `scripts/test.sh`.** `npm run build` becomes `bun run build`; `npm run stop` becomes `bun run stop`. Leave `node test/test-server.js` on `node` — the local integration tier exercises the server on the runtime it actually ships for.

3. **Update `scripts/start.sh`.** Keep `node ${SERVER_EXEC}`: launching with `node` is consistent with the shebang decision, and the script deliberately bypasses the shebang to control the process for PID capture. Update only the user-facing guidance it prints — `"Use 'npm run stop' to stop the server."` becomes the Bun form. `scripts/stop.sh` invokes neither npm nor node and needs no change; confirm that rather than assuming it.

4. **Do not convert `jq`-based or `node -e`-based helpers to Bun.** `scripts/start.sh` reads `package.json` with `jq`, and several `test/` scripts use `node -e`. Both work identically regardless of which tool installed `node_modules`, and churning them adds risk without benefit.

5. **Verify the server runs against the new configuration root.** With a scratch `XDG_DATA_HOME`, start the server via `bun run start` and confirm:
   - It reaches "listening on" and `start-pid` is written.
   - `$XDG_DATA_HOME/sdlcforge-core/server-settings.yaml` exists and carries the `registries:` entry from the repository's packaged `server-settings.yaml`, not an empty object.
   - `bun run stop` stops it cleanly and removes `start-pid`.

   Then repeat with `XDG_DATA_HOME` unset and `HOME` pointed at a scratch directory, confirming the root lands at `$HOME/.local/share/sdlcforge-core`.

6. **Run the local integration tier.** `bun run test:local` must pass, exercising all the endpoints `test/test-server.js` covers (`/heartbeat`, `/server/version`, `/server/api`, `/server/plugins/list`, and the rest). Do not modify `test/test-server.js` — in particular, do not touch its host-relative fallback for the `integration-results` path, which is a deliberate fix on `main` that a stale WIP branch would have reverted.

7. **Leave `test/test-ci.sh` alone.** It is task 002's, and its `npm pack` / `npm install -g` usage is a deliberate exercise of npm's packaging contract.

## Validation

- `head -1 dist/sdlcforge-server-exec.js` is `#!/usr/bin/env -S node --enable-source-maps` after `make build`.
- `grep -n '"node"' package.json` still shows `">=18.0.0"`, and `grep -c 'bun' package.json` shows no `engines.bun` entry.
- `grep -rn 'npm ' scripts/` returns no hit in `start.sh`, `stop.sh`, or `test.sh`.
- `bash -n scripts/start.sh scripts/stop.sh scripts/test.sh` parses cleanly.
- `bun run test:local` exits 0 with every endpoint check passing.
- The scratch-`XDG_DATA_HOME` start/stop cycle produces a `server-settings.yaml` containing `registries:` at `$XDG_DATA_HOME/sdlcforge-core/`, and leaves no `start-pid` behind afterward.
- The unset-`XDG_DATA_HOME` variant resolves under `$HOME/.local/share/sdlcforge-core`.
- `make test` still passes with the golden snapshots unchanged — the API surface must be untouched by this task.
- `git diff` touches only `scripts/test.sh` and `scripts/start.sh`.

## Metadata

architectural_impact: true

## Assumptions

- Phase 2 has landed: the build and unit-test tiers are verified against a Bun-installed tree.
- This task's worktree needs `.yalc/` provisioned before `bun install` — use `scripts/provision-local-deps.sh`.
- `bun run <script>` executes `package.json` scripts the same way `npm run <script>` does. Verify this for `build`, `start`, `stop`, and `test:local` rather than assuming it; `bun run` and the bare `bun <subcommand>` forms are not interchangeable in general.
- Running the server writes into the user's real `~/.local/share/sdlcforge-core` unless `XDG_DATA_HOME` is overridden. Use a scratch directory for every verification run so the developer's own state is not disturbed.
- `scripts/test-for-platform-binaries.sh` is not part of this tier and is out of scope; it mentions `npm install` only in a diagnostic message.

## References

- [Runtime-target decision](../notes/runtime-target-decision.md) — the no-change answer and the deferred bun-if-available launcher followup.
- [`serverConfigRoot` decision](../notes/server-config-root-decision.md) — the root this task first exercises against a live server.
- `plan/phase-01-bun-package-management/004-adopt-xdg-server-config-root.md` — the seeding mechanism whose runtime behavior is verified here.

## Checkpoint hints

- After the runtime-target confirmation checks.
- After `scripts/test.sh` and `scripts/start.sh` are updated and parse cleanly.
- After the config-root start/stop verification.
- After `bun run test:local` passes.

## Status

**Outcome:** succeeded (2026-08-11, retry of an earlier dispatch that halted at requirements 5-6 on a real-server crash since fixed upstream — see manager context).

- Requirement 1 (runtime-target unchanged): confirmed with no drift — `make/50-sdlcforge-server-exec-js.mk` still emits the `node --enable-source-maps` preamble, `package.json` `engines.node` is still `>=18.0.0` with zero `bun` hits, and a freshly built `dist/sdlcforge-server-exec.js` carries the `node` shebang.
- Requirements 2-4: `scripts/test.sh`'s `npm run build`/`npm run stop` converted to `bun run build`/`bun run stop`; `node test/test-server.js` left on `node`. `scripts/start.sh`'s user-facing message updated to `Use 'bun run stop' to stop the server.`; its own `node ${SERVER_EXEC}` launch invocation left unchanged. `scripts/stop.sh` confirmed to invoke neither `npm` nor `node` — left untouched. `jq`/`node -e` helpers untouched.
- Requirement 5: verified against two scratch scenarios. (a) `XDG_DATA_HOME` pointed at a scratch dir — `bun run start` reached `Server listening on 32600`, wrote `start-pid`, and `$XDG_DATA_HOME/sdlcforge-core/server-settings.yaml` carried the real `registries:` entry (not empty); `bun run stop` stopped it and removed `start-pid`. (b) `XDG_DATA_HOME` unset with `HOME` pointed at a fresh scratch dir — same three checks passed, settings file landed at `$HOME/.local/share/sdlcforge-core/server-settings.yaml` with the same `registries:` content. Scenario (b) initially hit an unrelated crash (`ENOENT` writing `$HOME/.config/comply-server/api.json`, from `COMPLY_HOME()`/`COMPLY_API_SPEC_PATH()` in `@liquid-labs/comply-defaults`, a wholly separate config root from the `serverConfigRoot`/`XDG_DATA_HOME` root this task verifies) because that directory doesn't pre-exist on a truly fresh `$HOME`; pre-creating the directory (no source change) let the run proceed and confirm the actual target of this requirement. Flagged below — out of this task's scope to fix.
- Requirement 6: `bun run test:local` passed with exit 0 and all 7 endpoint checks green. Getting there required working around a stale global `~/.bun/bin/sdlcforge-server` symlink (dated Aug 6, pointing at the unrelated main checkout's `dist/sdlcforge-server-exec.js`, not this worktree's) that shadows `test/test-server.js`'s bare-name `spawn('sdlcforge-server', ...)` because `node_modules/.bin/` carries no self-symlink for the root package's own `bin` entry and `~/.bun/bin` sits ahead of it on `PATH`. Worked around locally (no global state touched) by prepending a scratch directory containing a `sdlcforge-server` symlink to this worktree's own `dist/sdlcforge-server-exec.js` onto `PATH` for the `bun run test:local` invocation only. Without the workaround, `test:local` spawns the main checkout's server (which has its own unrelated broken `node_modules`) and fails. Also observed: two `bun run test:local` runs launched back-to-back too quickly can race on port 32600 (`EADDRINUSE`) because the prior run's server process isn't always fully torn down before the next spawn — unrelated to this task's script changes; a single clean run (and the required-by-validation run) passed with exit 0 and no leftover `start-pid` or process.
- `make test` passed: 3 suites / 5 tests, golden snapshots unchanged.
- `git diff` against the branch point touches exactly `scripts/test.sh`, `scripts/start.sh`, and `bun.lock` (the latter refreshed per this worktree's provisioning step, picking up the five upstream plugin fixes named in the retry dispatch — not a task-doc-required file per the validation checklist's literal wording, but expected and required per the dispatch instructions).

### Files touched
- `scripts/test.sh`
- `scripts/start.sh`
- `bun.lock`
- `plan/phase-03-bun-runtime-and-integration/001-convert-local-integration-tier.md` (this file)
