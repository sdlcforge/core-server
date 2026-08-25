# Verify Post-Absorption Parity

## Purpose and scope

The phase's single aggregate gate, run once all three donors have landed. Each absorb task verifies its own donor in isolation; this task verifies the **whole** post-absorption server against Phase 3's baseline and the parity contract, and confirms the structural properties that only become checkable once every merge is in.

It exists because the per-donor checks are necessarily partial. Three sequential merges into one repository can each be individually clean and still leave the tree wrong — a root file quietly taken from the wrong side by the second merge and not noticed by the third, a dependency union that was correct per donor but lost an entry across rebases, a bundle that grew for a reason no single task's size comparison would flag.

This task makes **no code changes**. It is verification and reporting. If it finds a gap, it halts and reports; the fix is a separate dispatch.

## Requirements

1. **Full-tier parity, in aggregate.** Run the Phase 3 harness and compare every observable against the pre-absorption baseline, matching each difference to a line item in `plan/resources/absorption-parity-contract.md`:
   - `GET /server/api`: **165** entries. Exactly six routes changed `npmName` (four controls, two credentials) and nothing else did. No `path`, `method`, `matcher`, `help`, or `parameters` value changed anywhere.
   - `GET /server/plugins/list`: **9** entries — eight discovered explicit plugins plus one `@sdlcforge/core-server` builtin entry carrying `package.json`'s `name`/`version` and the literal summary.
   - `GET /server/plugins/integrations/list`: two entries (the pre-existing de-duplication defect preserved), differing from baseline only in `npmName`.
   - The `register()`-call baseline: three registrations, same `providerFor` values, same seven hook names, both `issues-github` entries still `name === undefined`, all three now `@sdlcforge/core-server`.
   - `app.ext.setupMethods`: the same seven `{name, deps}` pairs as baseline, **unchanged**, including `load org controls` / `['load orgs']`.
   - `Object.keys(app.ext).sort()`: identical to baseline, including `credentialsDB`, `_liqOrgs`, `_liqProjects`.
   - `app.ext.credentialsDB`: same method set as baseline.
   - `golden-api-spec.json` (35 entries) and `golden-plugins-list.json` (`[]`): **byte-identical to their pre-plan state**, and `src/lib/test/golden-api-spec.test.js` and `app-init.test.js` still unmodified.

   Any difference not on the contract is a regression. Report it and halt; do not regenerate a snapshot to make it go away.

2. **Root-file survival, across all three merges.** For each donor, compare `core-server`'s version of every root-level path against that donor's own pre-merge commit. Git's conflict list is **not** the review list — all three donors and `core-server` share generated `Makefile`/`make/*.mk` content from the same generator, so byte-identical copies merge with no conflict at all, and donor `plan/` trees arrive as clean adds. Verify by blob comparison. In particular:
   - `src/lib/index.js` still exports `appInit`, `Reporter`, `name`, `summary`, and `src/lib/test/index.test.js` passes.
   - `src/index.js` does not exist.
   - No donor `README.md`, `AGENTS.md`, `CLAUDE.md`, `Makefile`, `make/*.mk`, `.eslintrc*`, `.gitignore`, `docs/*-spec.md`, or `plan/` file survives anywhere in the tree.
   - `docs/*-spec.md` glob matches exactly one file (`docs/core-server-spec.md`).

3. **Tier state.** `explicitPlugins` in `src/lib/app-init.mjs` holds exactly **8** entries; none of the three donors appears there or in `package.json` `dependencies`. `src/lib/builtin-plugins.mjs`'s `submodules` array holds exactly three namespace-imported submodules, in the fixed order controls → credentials → issues-github. `grep -rn 'liq-controls\|liq-credentials\|liq-integrations-issues-github' src/ package.json` returns only deliberate historical references, each accounted for in the report.

4. **Dependency-union integrity.** Every dependency `plan/resources/absorption-dependency-union.md` calls for is present at the recorded range; `@liquid-labs/octocache` is declared; `@liquid-labs/liq-credentials-db` is still declared (it stays external and was not folded); `grep -n 'file:' package.json` shows exactly the two pre-existing `file:` specs and no third.

5. **Bundle audit, whole-artifact.** After a clean `make build`: enumerate every bare-specifier `require(...)` surviving in `dist/sdlcforge-server.js` and confirm each appears in `package.json` `dependencies` or is a Node builtin. Compare `dist/sdlcforge-server.js` byte size against the figure Phase 4 task 002 recorded, and account for the delta — the absorbed source now being inlined is the expected reason it grew; an unexplained excess is the signature of a silently inlined undeclared dependency. Confirm `dist/sdlcforge-server-exec.js` is produced with its shebang and starts (`bun run test:local`).

6. **History reachability.** For one relocated file per donor, `git log --follow <path>` reaches that file's original pre-relocation commits in the donor's own history. This is the property the whole `--allow-unrelated-histories`-against-the-donor's-relocated-branch recipe exists to deliver; if it does not hold, the merges were done wrong however green the tests are.

7. **Ported tests actually run.** All of the donors' ported test files appear in `make test` output as executed, not skipped: controls' four files, credentials' one, issues-github's one.

8. **Report a single unambiguous verdict** the dispatching manager can act on: whether the absorption is complete and parity-verified, and therefore whether the three donors' own retirement phases and this plan's own Phases 6 and 7 are unblocked.

## Validation

- `make build`, `make test`, `make lint`, and `bun run test:local` are all green from a clean tree.
- Every requirement above is checked against **live source and live server output**, never inferred from the absorb tasks' own reports.
- Each accepted diff is enumerated with its contract line item; the report contains no unexplained diff.
- The verdict in requirement 8 is stated explicitly as PASS or FAIL with the specific gaps named on FAIL.
- No file in any repository is modified by this task; `git status` is clean apart from the task document itself.

## Assumptions

- Phase 5 tasks 001, 002, and 003 have all landed and merged. If any donor is still outstanding, this task is blocked — halt rather than verifying a partial absorption.
- `plan/resources/absorption-parity-contract.md` and `plan/resources/absorption-dependency-union.md` exist from Phase 3 task 003 and are the authority on what counts as accepted.
- Behavioral parity of the absorbed handlers and hooks themselves — actually invoking a hook or executing a handler end to end — is **not** verified by this plan, before or after. The baseline and this gate are registration-time only. That is a known, accepted limitation, and it should be restated in the report rather than left implicit.

## References

- `plan/resources/absorption-parity-contract.md` — the authority on accepted diffs.
- `plan/resources/absorption-dependency-union.md` — the authority on the dependency union.
- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md) — the measured pre-absorption baseline and what could not be verified.
- [`plan/notes/absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md#root-file-ownership) — why blob comparison, not the conflict list, is the review method.

## Checkpoint hints

- After the aggregate full-tier comparison.
- After the three per-donor root-file blob comparisons.
- After the dependency-union and bundle audits.
- After the history-reachability and ported-test checks, before writing the verdict.

## Status

**Outcome: `validation failed`** (per `## Validation`'s literal "all four commands green" bar), but **the absorption-parity verdict itself is PASS** — every one of the eight numbered `## Requirements` is satisfied by live source and live server output. The sole non-green check is `make lint`, and it fails for a cause fully outside this task's own scope and unrelated to the absorption; see "The one gap" below. Verified 2026-08-24 against `HEAD` (`ab0020c`) in this worktree.

### Requirement-by-requirement findings

1. **Full-tier parity, in aggregate — confirmed.** `make test` ran the Phase 3/4 harness (`src/lib/test/full-tier-baseline.test.js`, `src/lib/test/golden-api-spec.test.js`, `src/lib/test/app-init.test.js`) live; all passed. Independently diffed the checked-in `test/__snapshots__/full-tier-*.json` at `HEAD` against their pre-absorption state (commit `0467841`, Phase 3 task 001, before any donor merge):
   - `full-tier-api-spec.json`: 165 entries pre and post. Field-by-field diff across all 165 routes (matched by method+path) shows exactly 6 routes changed exactly one field (`npmName`): the 2 base + 2 `help`-variant controls routes (`@liquid-labs/liq-controls` → `@sdlcforge/core-server`) and the 2 credentials routes (`@liquid-labs/liq-credentials` → `@sdlcforge/core-server`). No `path`, `method`, `matcher`, `help`, or `parameters` value changed anywhere, on these 6 or any of the other 159. Ordering confirmed: the 35 core routes are first, then the `@sdlcforge/core-server` block (controls' 4 routes immediately followed by credentials' 2), then the remaining 8 explicit plugins.
   - `full-tier-plugins-list.json`: 11 → 9 confirmed (three donor entries removed, one `@sdlcforge/core-server` entry added, carrying the exact literal `summary` string; no `version` field in this endpoint's shape, pre or post — shape unchanged).
   - `full-tier-integrations-list.json`: 2 entries, both `npmName: '@sdlcforge/core-server'`, matching the pre-existing `name`-omission de-dup defect (preserved, not fixed). The `register()`-call capture test (`IntegrationsManager.prototype.register was called exactly three times...`) passed live, confirming 3 registrations, `providerFor` values `controls`/`tickets`/`pull request`, the 7 hook names, both `issues-github` entries still `name === undefined`, all three `npmName: '@sdlcforge/core-server'`.
   - `app.ext.setupMethods` and `Object.keys(app.ext).sort()` (including `credentialsDB`, `_liqOrgs`, `_liqProjects`) and `app.ext.credentialsDB`'s method set: all asserted directly by `full-tier-baseline.test.js` against the exact recorded baseline values; all passed live.
   - `golden-api-spec.json` (35 entries), `golden-plugins-list.json` (`[]`), `src/lib/test/golden-api-spec.test.js`, `src/lib/test/app-init.test.js`: `git diff 0467841 HEAD --` on all four is empty — byte-identical since the Phase 3 baseline commit, and `golden-api-spec.test.js`/`app-init.test.js` both pass live.
   - No diff outside the contract's enumerated list was found anywhere in this comparison.

2. **Root-file survival, across all three merges — confirmed by blob comparison, not the conflict list.** For each donor (`liq-controls`@`b1c5dbc`, `liq-credentials`@`c5524ff`, `liq-integrations-issues-github`@`a0c4ff1` — the actual merge-parent commits, confirmed via `git show --format='%P'` on each of the three absorb-task merge commits `de7a1ca`/`97b3d68`/`ccb0ff6`), compared `HEAD`'s blob for every donor root-level path (`.gitignore`, `AGENTS.md`, `Makefile`, `package-lock.json`, `package.json`, `README.md`, and `liq-controls`' `plugable-express.yaml`) via `git ls-tree`: every shared path is a **different** blob (core-server's own content survived; no donor content landed), and `package-lock.json`/`plugable-express.yaml` are absent from `core-server` entirely. `liq-controls`' `make/01-schema.mk` (its only `make/` fragment) is absent from `core-server`'s `make/` tree. No donor `CLAUDE.md`, `.eslintrc*`, or `bun.lock` exists in any donor to begin with (donors have `package-lock.json` instead). `docs/*-spec.md` glob matches exactly one file: `docs/core-server-spec.md`. `src/index.js` does not exist. `src/lib/index.js` still exports `appInit` (via `export * from './app-init'`), `Reporter`, `name`, `summary`; `src/lib/test/index.test.js` passes live. Donor `plan/` trees: each donor's `plan/TODO.yaml`/`plan/manifest.yaml`/`plan/overview.md` (and, for issues-github, `plan/followups.yaml`) collide on path with `core-server`'s own same-named files, but blob comparison confirms every one holds `core-server`'s own distinct content, not the donor's. `grep -rn` across `src/` and `package.json` for the three donor package names returns only comments explaining the absorption, one YAML fixture's `source:` field naming `@liquid-labs/liq-controls` (test data, not a live import), and `@liquid-labs/liq-credentials-db` (a distinct, legitimately-external package) — no unaccounted reference.

3. **Tier state — confirmed.** `explicitPlugins` in `src/lib/app-init.mjs` holds exactly 8 entries (`liq-orgs`, `liq-projects`, `liq-work`, `plugable-projects-audit`, and the four `sdlc-projects-*` plugins); none of the three donors appears there or in `package.json` `dependencies`. `src/lib/builtin-plugins.mjs`'s `submodules` array holds exactly `[controls, credentials, issuesGitHub]`, in that fixed order. `grep -rn` result as in item 2 above — fully accounted for.

4. **Dependency-union integrity — confirmed.** Every one of the 15 dependencies `plan/resources/absorption-dependency-union.md`'s final table calls for is present in `package.json` at the exact recorded range, including `@liquid-labs/octocache` (`^1.0.0-alpha.4`, declared though the donor itself never declared it) and `@liquid-labs/liq-credentials-db` (`^1.0.0-alpha.9`, stays external, not folded). `@liquid-labs/liq-projects-lib` is correctly **absent**: live-checked `src/integrations-issues-github/create-or-update-pull-request.mjs` and confirmed `determineCurrentMilestone` is now imported from the local, absorbed `./determine-current-milestone` — the union doc's foreseen "inlining lands before absorb time" contingency (Requirement 4) did land, and the absorb task correctly re-verified against it rather than trusting the doc's snapshot. `grep -n 'file:' package.json` shows exactly the two pre-existing specs (`@liquid-labs/liq-projects`, `@liquid-labs/plugable-express`) — no third.

5. **Bundle audit, whole-artifact — confirmed.** Ran `make build` from a clean tree (`dist/` and `test-staging/` removed first). Every bare-specifier `require(...)` surviving in both `dist/sdlcforge-server.js` and `dist/sdlcforge-server-exec.js` (17 distinct package specifiers plus 3 Node builtins) is declared in `package.json` `dependencies` — no undeclared dependency was silently inlined. `dist/sdlcforge-server.js` grew from the pre-absorption 2214 bytes (Phase 4 task 002's recorded figure) to 15432 bytes; `dist/sdlcforge-server-exec.js` from 2047 to 15271 bytes. The absorbed submodules' combined non-test source is 26067 bytes, consistent with a ~13KB minified-bundle increase from newly-inlined, previously-external donor source — the expected reason, not a signature of an undeclared dependency (which the require-specifier check above rules out directly). `dist/sdlcforge-server-exec.js` carries its shebang (`#!/usr/bin/env -S node --enable-source-maps`) and starts successfully: `bun run test:local` passed 7/7 checks against the live-started server.

6. **History reachability — confirmed for one relocated file per donor.** `git log --follow` on `src/controls/setup.mjs`, `src/credentials/setup.mjs`, and `src/integrations-issues-github/create-or-update-pull-request.mjs` each reaches back through the donor's own `git mv`-relocation commit into that donor's pre-relocation, pre-absorption commit history (multiple real, pre-existing commits per file, not just the relocation/merge commits).

7. **Ported tests actually run — confirmed, with one count discrepancy flagged.** `make test`'s live Jest run shows all of the following as `PASS`, not skipped: controls' four files (`controls/handlers/orgs/controls/_lib/test/list-lib.test.js`, `controls/resources/test/controls.test.js`, `controls/resources/test/question-controls.test.js`, `controls/handlers/orgs/controls/test/list.test.js`), credentials' one file (`credentials/handlers/credentials/test/list.test.js`), and issues-github's tests. **Flag:** issues-github actually ported **two** test files, not the one this task doc's Requirement 7 names — `integrations-issues-github/test/uses-github-issues.test.js` **and** `integrations-issues-github/test/determine-current-milestone.test.js`, both `PASS`. The second is not an error: `git log --follow` shows it was authored in the donor's own repo (commit `6b8c7da`, "add unit coverage for inlined determineCurrentMilestone") as part of the same in-flight `determineCurrentMilestone`-inlining work that `absorption-dependency-union.md` Requirement 4 explicitly flagged as "could land at any point between now and Phase 5" — it landed, bringing its own test file along, and phase-05 task 003 correctly absorbed and ran it. Net effect: more ported coverage running green than the task doc anticipated, not less — a stale count in the task doc's own Requirement 7, not a gap in the absorption.

8. **Verdict.** **Absorption-parity PASS.** All eight requirements above are satisfied against live source and live server output; no unexplained diff was found anywhere; every diff found is enumerated above and matches a contract line item. The three donors' own retirement phases and this plan's Phases 6 and 7 are unblocked **from an absorption-parity standpoint**. See "The one gap" immediately below for the one caveat against `## Validation`'s literal all-four-green bar, and "Known, accepted, out-of-scope limitation" for the standing behavioral-parity caveat this plan carries throughout.

### The one gap: `make lint` is red, but pre-existing and unrelated

`make build`, `make test`, and `bun run test:local` are all green from a clean tree. `make lint` is **not**: it reports 230 errors, entirely confined to four files — `test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`, `test/test-server.js` — none of them under `src/`, none of them touched by any absorb task or any other task in this plan. `git diff main HEAD -- <those four files>` is empty: they are byte-identical to pre-plan `main`. This is the identical finding Phase 4 task 002 already reported and explicitly flagged as pre-existing, unrelated, and outside that task's permitted edit scope; nothing in Phase 5 changed that fact. This task's own `## Purpose and scope` forbids code changes ("This task makes no code changes. It is verification and reporting."), so fixing it is not this task's to do. Reporting `validation failed` as the literal status because one of the four required commands is not green — while stating plainly that the failure is pre-existing, unrelated to the absorption, and does not touch anything this task's eight Requirements verify.

### Known, accepted, out-of-scope limitation (restated per the task's Assumptions)

Behavioral parity of the absorbed handlers and hooks themselves — actually invoking a hook or executing a handler end to end — is **not** verified by this plan, before or after, and was not verified by this task either. The baseline and this gate are registration-time only (route/provider/setup-method/`app.ext` registration, snapshot and live-assertion comparison). No absorbed handler was invoked with real arguments and no absorbed hook was actually called as part of this verification. This is a known, accepted limitation stated explicitly in the task's `## Assumptions`, not an oversight.

### git status

Clean apart from this task document's own edit; no other file in this repository, and no file in any of the three donor checkouts, was modified by this task.
