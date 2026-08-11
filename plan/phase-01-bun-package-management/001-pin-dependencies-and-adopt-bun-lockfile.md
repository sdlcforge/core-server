# Pin Dependencies And Adopt Bun Lockfile

## Purpose and scope

Make `bun install` succeed against `@sdlcforge/core-server`. This is the plan's first blocking task: `bun install` currently fails outright on every wildcard (`*`) dependency specifier, so nothing downstream can produce a `node_modules` to build or test against.

Scope is confined to `package.json`'s dependency specifiers and the lockfile swap. Do **not** touch `make/*.mk`, `src/`, `scripts/`, `test/`, or any documentation — the toolchain is deliberately left alone in this task so that a passing `make build` / `make test` / `make lint` afterward is a clean equivalence signal that Bun produced a dependency tree equivalent to npm's.

No standard skill covers this; follow the procedure below.

## Requirements

1. **Re-derive an explicit range for each of the 12 wildcard specifiers.** The wildcards are, in `package.json` order: `@liquid-labs/liq-controls`, `liq-credentials`, `liq-integrations`, `liq-integrations-issues-github`, `liq-orgs`, `liq-work`, `plugable-projects-audit`, `plugable-server-documentation`, `sdlc-projects-badges-coverage`, `sdlc-projects-badges-github-workflows`, `sdlc-projects-workflow-github-node-jest-cicd`, and `sdlc-projects-workflow-local-node-build`.

   - Determine each package's currently-published version set with `npm view <pkg> versions --json` (or `bun pm view`, if it produces equivalent output).
   - Pin to `^1.0.0-alpha.N` where `N` is the highest published prerelease of the `1.0.0` tuple. A caret range over a prerelease matches later prereleases of the same `[major, minor, patch]` tuple, which is the behavior wanted here.
   - **Derive every pin freshly.** The WIP branch `work-sdlcforge/core-server/64` carries a pin list that contains `"@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd": "^1.0.0-alpah.2"` — note `alpah` — which would silently reintroduce a resolution failure. Do not transcribe from it, and do not transcribe the illustrative pins from `plan/notes/catalyst-bun-compatibility.md`, which were chosen only to unblock a spike.
   - If any package turns out to have a stable (non-prerelease) published version, pin to the ordinary caret range over that stable version instead, and note the deviation in the task report.

2. **Change nothing else about the dependency set.** Specifically:
   - The two `file:.yalc/…` entries (`@liquid-labs/liq-projects`, `@liquid-labs/plugable-express`) stay exactly as they are. Four further directories exist under `.yalc/` on the developer's machine but are not declared in `package.json`; leave them alone.
   - Do **not** add `@liquid-labs/git-toolkit`, `github-toolkit`, `npm-toolkit`, `playground-monitor`, or `sdlc-lib-build`. The user has [decided to drop all five](../notes/added-dependencies-decision.md).
   - Leave `@liquid-labs/comply-defaults` at `^1.0.0-alpha.8`. Task 004 depends on a newer publish, but that range already matches it, so no edit is needed here.
   - Leave `devDependencies`, `engines`, and every `scripts` entry untouched.

3. **Generate `bun.lock` and delete `package-lock.json`.**
   - Run `bun install` (not `--frozen-lockfile`) to produce `bun.lock`.
   - `git rm package-lock.json`.
   - Commit `bun.lock`. Confirm `.gitignore` does not exclude it — it currently ignores `/.yalc`, `/dist`, `/node_modules`, `/qa`, `/test-staging`, `/yalc.lock`, `/*.log`, `/*.pid`, none of which match. Add no new entries.
   - `.dockerignore` needs no change: it is an allow-heavy file that deliberately does not exclude `dist/` or `node_modules/`, and never mentioned `package-lock.json`.

4. **Verify equivalence.** With the Bun-installed tree in place, run `make build`, `make test`, and `make lint` and confirm each behaves as it did under npm. `make lint` reports pre-existing style violations — that is known lint debt unrelated to this change, and its *presence* is expected; what matters is that ESLint resolves and executes.

## Validation

- `grep '": "\*"' package.json` returns nothing.
- `grep -c 'alpah' package.json` returns `0` — an explicit guard against the known WIP-branch typo.
- Every pinned range resolves: `bun install` exits 0 from a clean state (`rm -rf node_modules bun.lock && bun install`), reporting no `failed to resolve` line.
- `package-lock.json` no longer exists (`test ! -e package-lock.json`), and `git status` shows it as a staged deletion rather than an untracked leftover.
- `bun.lock` exists and is tracked (`git ls-files --error-unmatch bun.lock` exits 0).
- `git diff` against the task's base touches only `package.json`, `bun.lock`, and the `package-lock.json` deletion. No file under `make/`, `src/`, `scripts/`, `test/`, or `docs/` is modified.
- `make build` produces both `dist/sdlcforge-server.js` and `dist/sdlcforge-server-exec.js`, each a 9-line externals-only bundle whose first `const` line is bare `require()` calls, and `dist/sdlcforge-server-exec.js` begins `#!/usr/bin/env -S node --enable-source-maps`.
- `make test` passes: 3 suites, 5 tests, including the two golden-api-spec assertions, with `test/__snapshots__/golden-api-spec.json` and `golden-plugins-list.json` unmodified in `git status`.
- `make lint` runs to completion and produces `qa/lint.txt`.

## Assumptions

- **The task worktree will not have a `.yalc/` directory.** `.yalc/` and `yalc.lock` are gitignored, so a fresh `git worktree` checkout has neither, and `bun install` fails hard on the two `file:.yalc/…` entries with `FileNotFound: failed opening cache/package/version dir`. Before doing anything, confirm `.yalc/` is present in the worktree; if it is not, copy it from the main checkout (`cp -R <main-checkout>/.yalc ./.yalc`, roughly 1.6 MB) and then install. The main checkout path is resolvable from the worktree via `git rev-parse --git-common-dir`.
- `bun install --frozen-lockfile` is the wrong invocation for this task even once `bun.lock` exists — the point is to *generate* it.
- Node, npm, and Bun `1.3.14` or later are all present on `PATH`. This does not change: `npm explore` and the Node-targeted Catalyst CLIs remain toolchain prerequisites throughout this plan.
- `make lint` reporting pre-existing violations is the expected baseline, not a regression introduced here.

## References

- [WIP branch triage](../notes/wip-branch-triage.md) — why the pins matter, the verified published-version sample, and the `alpah` typo warning.
- [Bun `file:`/yalc resolution and provisioning](../notes/bun-yalc-provisioning.md) — the empirical evidence for the missing-`.yalc/` failure mode and the copy-based workaround.
- [Bun conversion scope](../notes/bun-conversion-scope.md) — why the build stays externals-only and why `shelljs` is out of scope.

## Checkpoint hints

- After deriving and recording the full pin table, before editing `package.json`.
- After `package.json` is edited and `bun install` first succeeds.
- After `package-lock.json` is removed and `bun.lock` is staged.

## Status

**Outcome:** succeeded — 2026-08-10.

All 12 wildcard specifiers were re-derived from `npm view <pkg> versions --json` (ascending-order output; highest published version taken) and pinned to `^1.0.0-alpha.N`. None had a stable (non-prerelease) published version, so no deviation from the `^1.0.0-alpha.N` pattern was needed. Final pin table:

| Package | Pin |
|---|---|
| `@liquid-labs/liq-controls` | `^1.0.0-alpha.9` |
| `@liquid-labs/liq-credentials` | `^1.0.0-alpha.3` |
| `@liquid-labs/liq-integrations` | `^1.0.0-alpha.2` |
| `@liquid-labs/liq-integrations-issues-github` | `^1.0.0-alpha.3` |
| `@liquid-labs/liq-orgs` | `^1.0.0-alpha.6` |
| `@liquid-labs/liq-work` | `^1.0.0-alpha.9` |
| `@liquid-labs/plugable-projects-audit` | `^1.0.0-alpha.2` |
| `@liquid-labs/plugable-server-documentation` | `^1.0.0-alpha.0` |
| `@liquid-labs/sdlc-projects-badges-coverage` | `^1.0.0-alpha.2` |
| `@liquid-labs/sdlc-projects-badges-github-workflows` | `^1.0.0-alpha.2` |
| `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | `^1.0.0-alpha.2` |
| `@liquid-labs/sdlc-projects-workflow-local-node-build` | `^1.0.0-alpha.7` |

These match the verified sample recorded in [WIP branch triage](../notes/wip-branch-triage.md) for the six packages it sampled, confirming no drift since that note was written. The `alpah` typo was not transcribed (guarded by the `grep -c 'alpah'` validation check, which returns `0`).

`bun install` (not `--frozen-lockfile`) generated `bun.lock`; `package-lock.json` was removed via `git rm`. A clean-state reinstall (`rm -rf node_modules bun.lock && bun install`) reproduced a byte-identical `bun.lock`, confirming deterministic resolution. `.gitignore` and `.dockerignore` needed no changes, as anticipated by the task doc.

**Validation summary:** all checks passed. `make build` produced both 9-line externals-only bundles with the correct shebang and `require()` preamble. `make test` passed 3 suites / 5 tests including both golden-api-spec assertions, with the snapshot files untouched in `git status`. `make lint` ran to completion and produced `qa/lint.txt`; it reports pre-existing style violations (237 problems in `test/test-server.js`), which is the expected, unrelated lint debt the task doc calls out — ESLint itself resolved and executed successfully. `git diff` against the task's start commit touches only `package.json`, `bun.lock`, and the `package-lock.json` deletion.

**Affected files:** `package.json`, `bun.lock`, `package-lock.json` (deleted).
