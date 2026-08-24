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
