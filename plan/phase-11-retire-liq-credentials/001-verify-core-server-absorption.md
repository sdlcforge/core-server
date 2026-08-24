# Verify Core-Server Absorption

## Purpose and scope

Read-only verification gate. Confirms `@sdlcforge/core-server` has actually landed `liq-credentials`'s absorption before any retirement documentation or metadata work proceeds. Mirrors the `liq-orgs` precedent from the sibling `dev-core-consolidation` plan-group (`plan/phase-06-retire-liq-orgs/001-verify-dev-core-absorption.md`, recorded in that repository's `plan/plan-summary-dev-core-consolidation.md`) and the sibling donor `liq-controls`'s own equivalent gate task in this same plan-group.

**This task must not be dispatched — and if dispatched, must not pass — until `core-server`'s own `core-server-domain-consolidation` absorption phase has merged.** This plan's tooling (a single project's `TODO.yaml`) cannot express or enforce a cross-project phase dependency; the dispatching manager must hold this task until `core-server`'s [`plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md`](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md) is confirmed landed. Halt with a clear "blocked: precondition not met" report rather than guessing or partially proceeding if dispatched early.

## Requirements

Verify each of the following against `core-server`'s own checkout (`/Users/zane/playground/sdlcforge/core-server`) — live source, not `core-server`'s plan documents, which describe intent that may not have landed exactly as written. This task **edits nothing, in any repository**.

1. **File census.** All seven relocated source files plus the one test-data fixture that Phase 10 moved to `src/credentials/…` (the mapping table in [`plan/phase-10-relocate-plugin-source/001-restructure-src-into-core-server-layout.md`](../phase-10-relocate-plugin-source/001-restructure-src-into-core-server-layout.md) is the authoritative list) are present under `core-server`'s own absorbed path. Expected `src/credentials/…`; confirm the actual path used rather than assuming, and report any divergence.

2. **History preserved.** `git log --follow` on at least one absorbed file (e.g. `src/credentials/setup.mjs`) inside `core-server` reaches this repository's pre-relocation commits — confirming the history-preserving merge, not a copy-paste.

3. **Route parity.** `core-server`'s built/aggregated handler set includes both routes with byte-identical `path` arrays and methods: `put` `['credentials', ':credential', 'import']` and `get` `['credentials', 'list']`. Each appears **exactly once** — a duplicate is the signature of a shim left running alongside the absorption, which `plugable-express` would reject with `Non-unique command path`.

4. **`credentialsDB` wiring intact.** `app.ext.credentialsDB` is present and functional in `core-server`'s full-tier harness, exposing the same method surface as the pre-absorption baseline (`detail`, `getCredSpec`, `getToken`, `import`, `list`, `listSupported`, `registerCredentialType`, `resetDB`, `verifyCreds`, `writeDB`). The contract *name* must be unchanged — `@sdlcforge/dev-core` (`src/projects/setup.mjs` and four `handlers/_lib` files) and `@liquid-labs/liq-integrations-issues-github` both read it, and [`dev-core-consolidation-contract.md`'s `app.ext` contract freeze](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#appext-contract-freeze) names it.

5. **`credential` path variable registered exactly once.** `appInit()` does not throw `Path variable 'credential' is already registered.` in any configuration the suite exercises, and the registered variable's `validationRe` is still `(?:[A-Z0-9][A-Z0-9_]*)`.

6. **`serverConfigRoot` read preserved.** `core-server`'s absorbed `src/credentials/setup.mjs` still reads `serverConfigRoot` from the `setup()` **argument object**, not from `app.ext` directly — commit `cab8a77`'s fix must have survived the merge. (`src/credentials/handlers/credentials/import.mjs`'s separate request-time `app.ext.serverConfigRoot` read is expected and correct; do not flag it.)

7. **Setup-ordering coupling still holds.** `@sdlcforge/dev-core`'s `src/projects/setup.mjs` calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })` at plugin-load time. Confirm observably that it still sees a live `credentialsDB` after absorption — `dev-core`'s project routes registered and working. A failure here is a hard stop, not a warning.

8. **Dependency unplugged.** `core-server`'s own `package.json` no longer lists `@liquid-labs/liq-credentials` in `dependencies`, and `@liquid-labs/liq-credentials` is gone from the `explicitPlugins` array in `src/lib/app-init.mjs` and from the expected-plugin lists in `test/test-basic.js` and `test/test-integration-quick.js`. `@liquid-labs/liq-credentials-db` — a separate external package that is **not** folded — must still be present in `dependencies`.

9. **Tests ported.** This donor's `handlers/credentials/test/list.test.js` and its `test/data/creds-db.yaml` fixture actually run inside `core-server`'s Jest/Babel/`test-staging` pipeline (present *and* executing, not merely present on disk).

10. **Build health.** `core-server`'s `make build` / `make test` / `make lint` (or the Bun-based equivalents in its own `CLAUDE.md`: `bun run build`, `bun run test`, `bun run lint`, `bun run test:local`) are green.

## Validation

- Every check in Requirements above is independently confirmed against live source and a live run in `core-server`'s checkout, not inferred from either project's plan documents.
- If any check fails or cannot be confirmed — including "the absorption phase has not landed at all" — this task halts the phase: do not proceed to tasks 002–004, and report the specific gap(s) found, naming the requirement number.
- If all checks pass, record the confirmation (the `core-server` commit SHA verified against, and the absorbed path actually used) in the task report so tasks 002–004 can proceed without re-deriving it.
- This task makes no edits to any file in any repository. `git status` in both checkouts is unchanged by it.

## Assumptions

- The absorbed path is `src/credentials/…`, as named in `core-server`'s own absorb task. Confirm it from `core-server`'s committed source rather than assuming this survived that phase's own execution unchanged.
- `core-server`'s absorb task will have `git rm`'d the thin `src/index.js` re-export this plan's Phase 10 left in place. Its **absence** in `core-server` is the expected, correct state — do not report it as a missing file. (`core-server`'s own `src/lib/index.js`, a different file, must still exist and still export `appInit`, `Reporter`, `name`, `summary`.)

## References

- [`plan/notes/liq-credentials-source-inventory.md`](../notes/liq-credentials-source-inventory.md) — the pre-move baseline (file census, route table, `app.ext` contract, consumer inventory) these post-absorption checks compare against.
- [`core-server`'s absorb task for this donor](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md) — its own `## Validation` section is the mirror image of this gate; a disagreement between the two is itself a finding worth reporting.
- `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — the precedent this task's read-only, requirement-group-per-check gate structure follows.
