# Verify Parity Contract And Green Run

## Purpose and scope

The phase's closing task. Walk Phase 1's parity contract item by item against the merged server, verify the non-snapshot observables the checked-in snapshots do not cover, run the full build/test/lint/local-integration set unscoped, and write the parity-verification record the manager triages from.

The framing matters: this task **walks a list**, it does not diff snapshots and ask, one hunk at a time, whether a change looks acceptable. Phase 1's contract enumerates every observable expected to change and why. Anything not on it is a regression — and gets recorded as one, not silently accepted.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### 1. Clear the stale pass markers before running anything

`make test`'s pass marker (`qa/.unit-test.passed`) and the plugin-graph marker (`qa/.plugin-graph.passed`) are touched by *any* `make test` invocation, including the `TEST=`-scoped runs tasks 002, 003, and 004 each performed. Their prerequisites are `package.json` and the built test files, so a stale marker can make `make test` report up-to-date without running a single test.

```bash
rm -f qa/.unit-test.passed qa/.plugin-graph.passed
```

and ensure `TEST` and `UPDATE_FULL_TIER_BASELINE` are unset in the environment. A "green" claim made against a scoped run or a stale marker is worse than no claim.

### 2. Run the four commands

- `make build` — must succeed, producing `dist/sdlcforge-server.js` and `dist/sdlcforge-server-exec.js` with their source maps.
- `make test` — full, unscoped. Must be green across all suites except `N7cz` (see the correction above), including the ~20 absorbed test suites Phase 2 brought in on top of `core-server`'s own suites.
- `make lint` — see requirement 3; a bare "green" is **not** achievable and is not the bar.
- `bun run test:local` — the local integration run (`scripts/test.sh`), which rebuilds, starts a real server, and exercises `/heartbeat`, `/server/version`, `/server/api`, `/server/plugins/list`, `/server/next-commands`, an invalid endpoint, and a second `/heartbeat`. Confirm it stops the server afterward and leaves no `start-pid`.

`GET /server/next-commands?command=credentials/` crashes inside `@liquid-labs/liq-handlers-lib` (followup `NEJt`). That is pre-existing and out of scope; if `test:local`'s `/server/next-commands` step trips it, record it as the known inherited defect rather than fixing it.

**Correction (2026-09-06, applied after a real dispatch ran the full unscoped suite):** `make test` cannot be literally green. A fifth inherited, absorption-predating defect — `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` (followup `N7cz`, donor `2aMD`) — was omitted from this document's original four-item fenced-off list. It has now been independently confirmed, by three separate task dispatches across Phases 2, 3, and this task, to be unrelated to the merge (an `app.ext.serverConfigRoot` vs. `serverHome` field-name mismatch in the suite's own mock, predating absorption). Treat it as a fifth fenced-off inherited defect alongside `uROI`/`b3hk`/`mLm3`/`NEJt` (see requirement 6 below): "green" for requirement 2 means every suite passes except this one, named and confirmed present, not fixed.

### 3. `make lint` — a delta check, not a green check

`make lint` fails today and has for the life of this plan: 233 pre-existing ESLint errors, confirmed byte-identical to `main` (followups `b3hk`, `mLm3`) — **correction (2026-09-06): the 233 decomposes as 230 across four files under `test/` plus 3 under `src/`, not "5 files under `test/`"**, per a real dispatch's direct measurement. `make/55-lint.mk` runs ESLint under `set -e`, so any error fails the target. The phase document's "make lint green" wording cannot be satisfied literally, and chasing it would pull 233 out-of-scope fixes into this phase.

The verifiable bar instead: **this phase's changes introduce no new lint finding.** Record the full finding set from `qa/lint.txt`, classify it by file, and assert that **no finding names a file tasks 002, 003, or 004 modified**. Report the total count and the file breakdown, and state explicitly whether the count moved relative to the recorded pre-existing baseline. If the count grew for a reason attributable to Phase 2's absorbed `src/` code rather than to this phase, say so and attribute it — do not fix it, and do not let it silently become this phase's number.

### 4. Walk the parity contract item by item

`plan/resources/dev-core-absorption-parity-contract.md` is the list. For each numbered item, record: held / did not hold / not applicable, with the evidence. At minimum the contract covers:

- **The 112-route `npmName` re-attribution** — 165 routes total, 118 now under `@sdlcforge/core-server`. Task 002 verified this at snapshot level; re-confirm against the live server's `GET /server/api` rather than re-reading the snapshot, so the check is end-to-end.
- **Route reordering within `app.ext.handlers`** — the absorbed components move into the builtin block ahead of the explicit tier; `controls` moves behind `credentials`/`projects`/`orgs`.
- **The plugins list 6 → 5** and the `@sdlcforge/core-server` summary.
- **The integrations list `npmName` re-identification** — predicted to be a no-op here, since both integration providers were already builtin.
- **`GET /server/plugins/@sdlcforge%2Fdev-core/details` stops resolving**, while `GET /server/plugins/@sdlcforge%2Fcore-server/details` remains valid. **Correction (2026-09-06): the `details` segment is last, not first** — a real dispatch found the previously-written form (`.../details/@sdlcforge%2F…`) 404s for both packages, which would have produced a false pass on the dev-core half alone if only that half were checked. Check both against the live server using the corrected route form; a passing check needs both halves.
- **`golden-api-spec.json` and `golden-plugins-list.json` byte-identical** throughout — re-confirm at phase end, not just at task 002's checkpoint.

### 5. Confirm the negative space

Four observables must be **unchanged**, and each is cheap to check:

- **Setup-method `{ name, deps }` pairs** — all 7, exactly as `EXPECTED_SETUP_METHODS` records them. `@liquid-labs/dependency-runner` matches by exact string, so a renamed method silently breaks ordering rather than erroring.
- **The `app.ext` key set** — all 20, exactly as `EXPECTED_APP_EXT_KEYS` records them.
- **`app.ext.credentialsDB`'s method set** — all 10.
- **The registered path-variable set** — the merged set is `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `parameterKey`, `workKey`, `credential`. There is no collision; a collision would not shadow silently but would throw at startup, so a successful `appInit()` is itself most of this check. Confirm all seven are registered.

The first three are already asserted by `full-tier-baseline.test.js`, so a green `make test` covers them — say so and cite the run rather than re-deriving them by hand.

### 6. Do not repair inherited defects

Four known defects are captured as deliberately-preserved present-day behavior. Verify each is still present exactly as recorded, and do not fix any of them:

- `uROI` — `IntegrationsManager.listInstalledPlugins()` collapsing the `tickets` and `pull request` providers because both `register()` calls omit `name`. Lives in `@liquid-labs/plugable-express`, out of scope. Absorption must not accidentally "fix" it by supplying a `name`; if `full-tier-integrations-list.json` now holds three entries rather than two, that is the accident, and it is a regression to report.
- `b3hk` / `mLm3` — the 233 pre-existing ESLint errors (requirement 3).
- `NEJt` — the `liq-handlers-lib` next-commands crash (requirement 2).
- `N7cz` — added 2026-09-06 (see the requirement-2 correction above). `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` fails on an `app.ext.serverConfigRoot` vs. `serverHome` mock mismatch, predating absorption. Confirm it is still present and unrepaired; do not fix it here.

### 7. Write the parity-verification record

Write `plan/resources/dev-core-absorption-parity-verification.md` in the plan worktree (`/Users/zane/playground/sdlcforge/core-server/worktrees/plan/sdlc-core-unification/`), alongside Phase 1's contract and task 001's measurement record. It must contain:

- One row or section per contract item, with its verdict and the evidence.
- The four command outcomes, with the `make lint` delta framed per requirement 3.
- The negative-space confirmations.
- **Any contract item that did not hold**, stated plainly and near the top rather than buried — this is the part the manager triages. An empty "did not hold" section is a fine outcome; an absent one is not.
- The inherited-defect confirmations.

### 8. Phase 6's document set — confirm, do not author

The phase lists "the document set Phase 6 must cover" among its outputs. That set is already enumerated in `plan/phase-06-doc-updates/001-update-architecture-docs.md`, which is registered and complete. Read it and confirm it covers everything this verification surfaced. If the verification turned up a doc-relevant fact that task doc does not cover, **flag it for the manager** rather than editing another phase's task document.

## Validation

1. `qa/.unit-test.passed` and `qa/.plugin-graph.passed` were removed before the run, and `TEST` / `UPDATE_FULL_TIER_BASELINE` were unset; the `make test` run was full and unscoped.
2. `make build` succeeds; both `dist/` artifacts and their `.js.map` files are produced.
3. `make test` is green across every suite except `N7cz` (`project-lifecycle.test.mjs`), confirmed present and unrepaired.
4. `make lint`'s finding set introduces no *new* finding relative to the standing baseline (the substantive bar); a finding in a file tasks 002/003/004 touched is acceptable only when proven pre-existing (present, identically, before that task's own diff) — record the total count and per-file breakdown, with any movement attributed.
5. `bun run test:local` completes; the server is stopped and no `start-pid` survives.
6. Against the live server: `GET /server/api` returns 165 routes with 118 under `@sdlcforge/core-server` and zero under `@sdlcforge/dev-core`; `GET /server/plugins/list` returns 5 entries; `GET /server/plugins/@sdlcforge%2Fdev-core/details` does not resolve while `…/@sdlcforge%2Fcore-server/details` does.
7. `git diff --stat -- test/__snapshots__/golden-api-spec.json test/__snapshots__/golden-plugins-list.json` is empty.
8. All seven path variables are registered and `appInit()` completes without a duplicate-registration throw.
9. `plan/resources/dev-core-absorption-parity-verification.md` exists in the plan worktree, has a verdict for every contract item, and states any item that did not hold near the top.
10. `git diff` shows no source-file change from this task — it verifies and records; it does not fix. Any repair it believes is needed is reported, not landed.

## Assumptions

- Tasks 002, 003, and 004 have all landed. `make test` cannot be green until all three have.
- `make lint` is expected to **fail** on the pre-existing 233-error baseline. That is the accepted state, not a task failure; the phase document's "make lint green" wording is superseded by requirement 3 and this discrepancy should be reported to the manager.
- Phase 5 (component-boundary hardening) has not necessarily landed. If it has, a root `.eslintrc.cjs` is present and composes additively; the research measured zero new findings from it, so requirement 3's delta check is unaffected either way.
- `plan/resources/dev-core-absorption-parity-contract.md` (Phase 1) and `plan/resources/post-merge-graph-measurement.md` (task 001) both exist in the plan worktree. If the contract is missing, halt and report rather than reconstructing it from the phase document.

## References

- `plan/resources/dev-core-absorption-parity-contract.md` — Phase 1's contract; the list this task walks. Authoritative over any restatement here.
- [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md) — the predecessor absorption's contract and its "Anything not on this list is a regression" closing section; the model for both the contract and this verification's shape.
- `plan/resources/post-merge-graph-measurement.md` — task 001's live graph measurement.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the measured post-merge graph and both hazard signatures.
- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md#route-and-plugin-surface) — the pre-merge 165-route surface and provenance tally.
- [`plan/phases/verify-parity-and-tighten-gate.md`](../phases/verify-parity-and-tighten-gate.md) — the phase's goals, outputs, and the four inherited defects goal 5 fences off.
- [`plan/phase-06-doc-updates/001-update-architecture-docs.md`](../phase-06-doc-updates/001-update-architecture-docs.md) — the already-enumerated Phase 6 document set to confirm against.

## Checkpoint hints

- After the four commands have run and their outcomes are captured.
- After the contract walk, before writing the record.
- After the parity-verification record is written.
