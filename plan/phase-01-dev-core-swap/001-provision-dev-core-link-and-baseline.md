# Provision Dev-Core Yalc Link And Capture Pre-Swap Baseline

## Purpose and scope

Make `@sdlcforge/dev-core` installable in this repository, and record what "working" looks like *before* anything changes.

Two independent things gate the swap, and neither can be recovered after the fact:

- `@sdlcforge/dev-core` has never been published anywhere — not to npm, and not to this machine's global yalc store. `bun install` cannot resolve `file:.yalc/@sdlcforge/dev-core` until the store is populated and `.yalc/` provisioned.
- This host runs Node v26.5.0, past the line where `@liquid-labs/liq-work`'s bundle stops loading (a pre-existing `SlowBuffer` defect the migration spec discloses, inherited by `dev-core` and not fixed by it). If any test tier is already red for that or any other reason, that must be on record before the swap, or a red suite afterward cannot be attributed.

**This task changes no tracked file in `core-server` outside `plan/`.** It publishes to a machine-global store, provisions gitignored directories, runs read-only checks, and writes one notes file.

## Requirements

1. **Publish `@sdlcforge/dev-core` into the global yalc store.**

   From `/Users/zane/playground/sdlcforge/dev-core`, run `yalc publish --no-scripts`.

   `--no-scripts` is deliberate: `dev-core`'s `prepack` is `make build`, and this plan-group must not rebuild or otherwise mutate that checkout. `dev-core`'s `dist/` is already built, and its `.gitignore` covers `/dist`, `/.yalc`, `/yalc.lock`, so a publish leaves nothing git-tracked changed there. **Verify that with `git -C /Users/zane/playground/sdlcforge/dev-core status --porcelain` afterward and halt if anything tracked is dirty.**

   Confirm the store entry exists: `ls ~/.yalc/packages/@sdlcforge/dev-core`.

2. **Link it into this worktree and confirm it resolves.**

   `yalc add @sdlcforge/dev-core` writes both the `.yalc/@sdlcforge/dev-core` directory and a `package.json` dependency entry. Only the directory is wanted here — **task 002 owns the `package.json` edit**, because that edit must land atomically with the `app-init.mjs` edit and this task must not leave a half-migrated `package.json` behind.

   Either use `yalc link @sdlcforge/dev-core` (populates `.yalc/` without a manifest write), or run `yalc add` and immediately revert the `package.json` change with `git checkout -- package.json`. Whichever route is taken, **end this task with `git status --porcelain` showing no modification to `package.json`**.

   Confirm the linked package is real: `.yalc/@sdlcforge/dev-core/package.json` exists and names `@sdlcforge/dev-core`, and its `main` (`dist/dev-core.js`) is present on disk.

3. **Ensure the rest of `.yalc/` is provisioned and the worktree installs.**

   `.yalc/` and `node_modules/` are gitignored and absent from a fresh worktree. Run `scripts/provision-local-deps.sh` from the worktree root.

   **Expect this script to report a missing package and exit 1** — its `REQUIRED_YALC_PACKAGES` array is already out of sync with `bun.lock` today, in both directions (recorded as drift item D2 in [current-state drift](../notes/current-state-drift.md)). Record what it actually reports. If the failure is only that stale check, satisfy it by copying `.yalc/` from the main checkout at `/Users/zane/playground/sdlcforge/core-server/.yalc` and running `bun install` directly, then note the discrepancy for task 002 to fix. Do **not** edit `provision-local-deps.sh` here — task 002 owns that file, and it can only be corrected against the *regenerated* lock.

   Per this project's follow-up `8lmN`, a fresh worktree also needs a one-time `bun link` before `bun run test:local` will run: the test spawns a bare `sdlcforge-server` and relies on `PATH` resolution that a plain `bun install` does not provision.

4. **Capture the pre-swap baseline** into `plan/notes/pre-swap-baseline.md`, covering:

   - **Test tiers.** Run and record the outcome of each, verbatim enough to compare against: `bun run test` (unit, via `make test`) and `bun run test:local` (local integration smoke). For the Docker multi-Node suite (`bun run test:integration`), attempt it; if Docker is unavailable or it cannot complete in this environment, **record that explicitly as "not runnable here" rather than silently omitting it**. A tier that is already failing is a legitimate, expected finding — record the failure and its cause, do not attempt to fix it.
   - **Node version** (`node --version`) and whether `@liquid-labs/liq-work` actually loads on it. The full-tier snapshot on disk carries 60 `liq-work` route entries, captured 2026-08-24, so it evidently loaded then; whether it still does on v26.5.0 is the open question the spec's disclosure raises.
   - **The yalc `file:` set**: the literal output of `grep -n 'file:\.yalc' bun.lock`, alongside the current `REQUIRED_YALC_PACKAGES` array, so task 002 can diff against the regenerated lock.
   - **Donor provenance counts** in the snapshots, so task 002's regeneration can be checked for the expected magnitude of change rather than eyeballed:

     ```bash
     grep -o '"npmName": "[^"]*"' test/__snapshots__/full-tier-api-spec.json | sort | uniq -c
     grep -o '"npmName": "[^"]*"' test/__snapshots__/golden-api-spec.json | sort | uniq -c
     ```

     plus the entry count in `full-tier-plugins-list.json`.
   - **A live `/projects` response.** Start the server (`bun run start`) and capture the response to a cheap `/projects` route (`/projects/detail` or `/projects/list`) so task 004 has a genuine before-shape to compare against, not just an assertion that it returned `200`. Stop the server (`bun run stop`) afterward. If the server cannot start on this Node version, record that — it changes what task 004 can check, and it is far better known now.

5. **Do not touch** `package.json`, `bun.lock`, `src/`, `test/` (other than reading), or any documentation. Those belong to tasks 002 and 003.

## Validation

- `ls ~/.yalc/packages/@sdlcforge/dev-core` succeeds, and `.yalc/@sdlcforge/dev-core/package.json` in this worktree names `@sdlcforge/dev-core`.
- `git -C /Users/zane/playground/sdlcforge/dev-core status --porcelain` shows no dirty tracked file — the read-only-reference constraint held.
- `git status --porcelain` in this worktree shows changes **only** under `plan/`. In particular `package.json` is unmodified; if `yalc add` was used, its manifest write was reverted.
- `plan/notes/pre-swap-baseline.md` exists and covers all five bullets of requirement 4, including an explicit statement for the Docker tier (passed, failed, or not runnable here) rather than silence.
- Every recorded test-tier result names the command run and its exit status; a failing tier is recorded with its error, not "fixed."

## Metadata

architectural_impact: false

## References

- [current-state drift](../notes/current-state-drift.md) — hazards H1 (dev-core absent from the yalc store) and H3 (Node v26.5.0), and drift item D2 (the already-stale `REQUIRED_YALC_PACKAGES` array) all originate here.
- `/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md` — the `liq-work` section's "Disclosure: `liq-work`'s built bundle cannot be `require`d on Node ≥ 24" explains why the Node-version baseline matters.
- `AGENTS.md`, Conventions section — the yalc workflow, and why `rm -f bun.lock && bun install` rather than a bare `bun install`.
- `scripts/provision-local-deps.sh` — worktree provisioning; read it before running it, since its own required-package list is known stale.
- `plan/followups.yaml` item `8lmN` — the one-time `bun link` a fresh worktree needs before `bun run test:local`.

## Status

**Outcome: succeeded.** Date: 2026-08-27.

- Published `@sdlcforge/dev-core@1.0.0-alpha.0` into the global yalc store via `yalc publish --no-scripts` from `/Users/zane/playground/sdlcforge/dev-core`; that checkout's `git status --porcelain` showed only the pre-existing untracked `.flow/` afterward — no tracked file dirtied.
- Linked it into this worktree via `yalc link @sdlcforge/dev-core` (no `package.json` write). `.yalc/@sdlcforge/dev-core/package.json` names `@sdlcforge/dev-core`; `dist/dev-core.js` is present on disk.
- `scripts/provision-local-deps.sh` exited 1 as expected, reporting the already-stale `REQUIRED_YALC_PACKAGES` mismatch (drift D2: lists `http-smart-response`, no longer `file:`-resolved; omits `playground-monitor`, which is). Resolved by copying `.yalc/@liquid-labs/*` from the main checkout and running `bun install` directly (script itself left untouched, per task scope). Ran `bun link` once per follow-up `8lmN`.
- Captured the full pre-swap baseline in `plan/notes/pre-swap-baseline.md`: all three test tiers green (unit 40/40 tests across 12 suites; local integration 7/7; Docker multi-Node 9 versions × 7/7, Node 18 through 26 — Docker was available, so the tier ran to completion rather than being marked "not runnable here"). `liq-work` loads without error on every Node version tested, including several past the disclosed `SlowBuffer` line. Recorded the yalc `file:` set (3 packages, matching drift D2 exactly), donor provenance counts in both full-tier and golden snapshots (matching drift D3's numbers exactly), and a live `200` `/projects/detail` response (with the `X-CWD` header it requires — `/projects/list` does not exist as a route) for task 004 to diff against post-swap.
- No file outside `plan/` was modified; `package.json`, `bun.lock`, `src/`, and `test/` are untouched. `git status --porcelain` in this worktree shows only `plan/notes/pre-swap-baseline.md` (new) and this status update.

Files created/modified (repo-relative, inside worktree):
- `plan/notes/pre-swap-baseline.md` (new)
- `plan/phase-01-dev-core-swap/001-provision-dev-core-link-and-baseline.md` (this status update)

No assumptions from an `## Assumptions` section were relied on (the task doc has none); no scope deviations.
