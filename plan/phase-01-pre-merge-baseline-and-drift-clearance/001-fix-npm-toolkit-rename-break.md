# Fix Npm-Toolkit Rename Break

## Purpose and scope

Fix the pre-existing, live-on-`main` break in `src/controls/handlers/orgs/controls/list-implied.mjs`: the handler imports `getPackageOrgAndBasename` from `@liquid-labs/npm-toolkit`, an export renamed away in `1.0.0-alpha.17` while the installed and locked version is `1.0.0-alpha.21`. This is a two-line source fix and no other source change. It lands as its own standalone commit, ahead of any dependency operation later in this phase (task 002) and ahead of Phase 2's `rm -f bun.lock && bun install`, so that neither of those later operations appears to be the change that "broke" it — it is already broken today, and this task's job is only to prove and fix that, not to touch dependencies.

## Requirements

role_doc: plugins/flow/roles/developer-node.md

1. In `src/controls/handlers/orgs/controls/list-implied.mjs`:
   - Change the import at line 3 from `getPackageOrgAndBasename` to `getPackageOrgBasenameAndVersion` (same package, `@liquid-labs/npm-toolkit`).
   - Change the call site at line 18 from `const { org: orgKey } = getPackageOrgAndBasename({ pkgDir : cwd })` to `const { org: orgKey } = await getPackageOrgBasenameAndVersion({ pkgDir : cwd })`. The replacement export is `async`; the enclosing `func` is already `async`, so `await` is available with no other structural change.
   - No other line in this file changes. The existing `{ pkgDir : cwd }` argument already satisfies the replacement's stricter "exactly one of `pkgDir`/`pkgJSON`/`pkgSpec`" contract, so nothing about the call's shape needs to change beyond the name and the `await`.
2. Do not touch `package.json`, `bun.lock`, or any dependency declaration in this task. The installed `@liquid-labs/npm-toolkit@1.0.0-alpha.21` (already satisfying core-server's declared `^1.0.0-alpha.15` range) already exports the replacement — this is purely a call-site fix, not a dependency change.
3. Exercise the fixed handler to demonstrate `orgKey` now resolves to a real value instead of `undefined`. The handler is reachable only via `GET /orgs/controls/list` with an `X-CWD` header (see the `path`/`method` exports in the same file, and `doListControls` in `./_lib/list-lib.mjs`), and nothing in the existing unit-test suite calls it today — that is exactly why the break has stayed invisible. A minimal, throwaway invocation is sufficient (e.g. a short Node script that imports the module's `func` directly and invokes it against a real package directory, or a `supertest` request against an `appInit()`-built app with `X-CWD` set to a real package directory). A permanent regression test is not required by this task, but if you add one, place it under `src/controls/handlers/orgs/controls/` following this project's existing test conventions and note it explicitly in your report.
4. This task requires a live `node_modules` to exercise the handler against the real installed `@liquid-labs/npm-toolkit`. The plan worktree has no dependencies installed at phase start (per `plan/phases/pre-merge-baseline-and-drift-clearance.md`'s Inputs). Run `scripts/provision-local-deps.sh` (without `--refresh-lock` — the existing `bun.lock` already resolves the installed `1.0.0-alpha.21`, and a lockfile refresh is task 002's job, not this one) before attempting to exercise the handler.

## Validation

1. `grep -n 'getPackageOrgAndBasename' src/controls/handlers/orgs/controls/list-implied.mjs` returns nothing.
2. `grep -n 'getPackageOrgBasenameAndVersion' src/controls/handlers/orgs/controls/list-implied.mjs` shows both the import and an `await`-prefixed call at the former line 18.
3. The manual exercise from Requirements item 3 shows `orgKey` resolving to the real org key derived from the test package directory's `package.json`, not `undefined`, and no exception thrown by the destructure. Record the exact command/script used and its output in the task report.
4. `bun run lint` shows no new findings beyond the standing ~233 pre-existing ones (followups `b3hk`/`mLm3`).
5. `bun run test` (or the narrower Jest invocation covering `src/controls/`) is green. This file is not currently exercised by any test, so no existing test result should change as a side effect of this fix.
6. `git diff --stat` before committing shows only `src/controls/handlers/orgs/controls/list-implied.mjs` changed (plus, optionally, one new test file if a permanent regression test was added) — no dependency or lockfile file is included in this commit.

## Assumptions

- The plan worktree's `node_modules` is provisioned via `scripts/provision-local-deps.sh` (no `--refresh-lock`) purely to exercise this fix; task 002 owns the actual drift-clearing lockfile refresh and must run after this task's commit lands, not before.
- `@liquid-labs/npm-toolkit@1.0.0-alpha.21` is already installed/resolvable once dependencies are provisioned, per `plan/notes/dependency-union.md`.

## References

- [`plan/notes/dependency-union.md`](../notes/dependency-union.md#confirmed-break-getpackageorgandbasename-no-longer-exists) — the confirmed break, exact line numbers, and the `await`/argument-contract detail.
- [`plan/phases/pre-merge-baseline-and-drift-clearance.md`](../phases/pre-merge-baseline-and-drift-clearance.md) — this phase's goal 1, stating why this fix must land standalone and first.
