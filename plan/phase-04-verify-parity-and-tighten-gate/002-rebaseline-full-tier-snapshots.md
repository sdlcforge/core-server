# Rebaseline Full-Tier Snapshots

## Purpose and scope

Regenerate the three `full-tier-*` baseline snapshots against the merged server, justify every line of the resulting diff against Phase 1's parity contract, and prove the two `golden-*` snapshots did not move at all.

The rebaseline itself is one scripted command. The work is the justification: 112 routes change provenance and the route order changes in one step, so an unjustified `git add` here would silently record whatever the merged server happens to produce as the new truth. This task's real deliverable is the mechanical argument that route *identity* is untouched and only *provenance and ordering* moved.

Scope boundary: this task owns `test/__snapshots__/full-tier-*.json` and the comment-level staleness in `src/lib/test/full-tier-baseline.test.js`. It does **not** own the plugin-graph tests (tasks 003 and 004) and must not edit them.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### 1. Capture the pre-rebaseline state first

Before running anything, record the pre-rebaseline snapshot state so the diff can be argued rather than recalled. `git stash` is not needed — the pre-merge blobs are reachable from git history, and Phase 1 recorded the pre-merge blob map.

Produce, from the **current checked-in** `test/__snapshots__/full-tier-api-spec.json` (which is still the pre-merge baseline, unmoved by Phases 2 and 3):

```bash
jq 'length' test/__snapshots__/full-tier-api-spec.json
jq -r 'group_by(.npmName)[] | "\(length)\t\(.[0].npmName)"' test/__snapshots__/full-tier-api-spec.json | sort -rn
jq -S 'map(del(.npmName)) | sort_by(tojson)' test/__snapshots__/full-tier-api-spec.json > /tmp/api-identity-before.json
```

Expected pre-state, per [`notes/pre-merge-state.md`](../notes/pre-merge-state.md#route-and-plugin-surface): 165 routes; 35 `@liquid-labs/plugable-express`, 112 `@sdlcforge/dev-core`, 6 `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd`, 6 `@sdlcforge/core-server`, 2 each for the remaining three `sdlc-projects-*` packages.

### 2. Rebaseline

Run the existing scripted path — do not hand-edit a snapshot file:

```bash
bun run test:update-full-tier-baseline
```

(equivalently `UPDATE_FULL_TIER_BASELINE=true TEST=full-tier-baseline make test`). This rewrites all three of `full-tier-api-spec.json`, `full-tier-plugins-list.json`, and `full-tier-integrations-list.json`.

Note that each snapshot write happens *before* that test's own assertions, but after the assertions that precede it in the file — in particular `expect(body.length).toBe(2)` guards the integrations write. A failure there means the integrations surface moved, which is a regression to report (see requirement 4), not a guard to remove.

### 3. Justify the api-spec diff mechanically

Re-run the same three commands against the regenerated file and assert:

- **Route count unchanged.** `jq 'length'` still returns **165**. Not 164, not 166 — no route is added or removed by this merge.
- **Provenance tally matches the contract.** The new tally is 35 `@liquid-labs/plugable-express`, **118** `@sdlcforge/core-server` (its own 6 plus dev-core's 112), 6 `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd`, and 2 each for `sdlc-projects-badges-coverage`, `sdlc-projects-badges-github-workflows`, and `sdlc-projects-workflow-local-node-build`. `@sdlcforge/dev-core` appears zero times.
- **Route identity is byte-identical as a set.** With `npmName` deleted and entries sorted, the before and after files must be identical:

  ```bash
  jq -S 'map(del(.npmName)) | sort_by(tojson)' test/__snapshots__/full-tier-api-spec.json > /tmp/api-identity-after.json
  diff /tmp/api-identity-before.json /tmp/api-identity-after.json
  ```

  This must produce **no output**. It is the single check that proves no `path`, `method`, `matcher`, `help`, `parameters`, or `routablePath` value moved — the contract's core claim — while allowing both the `npmName` re-attribution and the array reordering the merge legitimately causes.
- **Ordering moved as predicted, and only as predicted.** The raw diff will show the absorbed components' routes migrating into the builtin block ahead of the explicit tier, and `controls`' routes moving behind `credentials`/`projects`/`orgs` (the declared DAG order is `credentials, projects, orgs, controls, issues-github, work, projects-audit`). Confirm the post-rebaseline `npmName` runs appear in that block order. Any reordering *within* a single component's routes is not predicted; report it if seen.

### 4. Check the other two snapshots

- **`full-tier-plugins-list.json`: 6 entries become 5.** The `@sdlcforge/dev-core` row disappears; the four `@liquid-labs/sdlc-projects-*` rows and the `@sdlcforge/core-server` row remain. `@sdlcforge/core-server`'s `summary` is read from its own `package.json` `description` — if that changed in Phase 2's dependency/manifest work the summary moves with it, which is expected; if it did not, the row is byte-identical. Record which.
- **`full-tier-integrations-list.json`: predicted unchanged.** It already holds two `{ npmName: '@sdlcforge/core-server', installed: true }` entries, because `controls` and `issues-github` were already builtin before this merge and neither `projects`, `orgs`, `work`, nor `projects-audit` registers an integration provider. A diff on this file is **not** predicted — if one appears, stop and report it as a possible regression rather than accepting the regenerated content.

### 5. Prove the `golden-*` snapshots did not move

`test/__snapshots__/golden-api-spec.json` (35 entries) and `golden-plugins-list.json` (`[]`) are captured with `skipCorePlugins: true`, which gates out the entire builtin tier. Absorbing four more components into that tier **cannot** legitimately move either file. This is the cheapest available signal that the absorbed code landed in the tier it was supposed to.

```bash
git diff --stat -- test/__snapshots__/golden-api-spec.json test/__snapshots__/golden-plugins-list.json
```

must be empty, and each file's `git hash-object` must equal the blob SHA Phase 1 recorded for it in the pre-merge blob map. Any diff on either file is a regression, not an accepted change — report it and do not rebaseline it.

### 6. Do not move the non-snapshot baselines

`src/lib/test/full-tier-baseline.test.js` also carries four hand-recorded constants that the parity contract says must **not** change: `EXPECTED_SETUP_METHODS` (7 `{ name, deps }` pairs — `@liquid-labs/dependency-runner` matches by exact string), `EXPECTED_APP_EXT_KEYS` (20 keys), `EXPECTED_CREDENTIALS_DB_METHODS` (10 methods), and `EXPECTED_INTEGRATION_PROVIDERS` (3 providers, all already `npmName: '@sdlcforge/core-server'`).

**Do not edit any of these four constants.** If one of them now fails, that is a parity regression to report to the manager, not a constant to update. Their staying put is the assertion.

The one edit this file does need is a comment correction: line ~263's "`@sdlcforge/dev-core`'s `projects` component" no longer names a real package — the requirer is now the in-tree `@sdlcforge/core-server#projects` component, and the ordering it describes is now intra-builtin rather than builtin-to-explicit. Correct the comment's substance, not just the string.

Do not add a `name` to either `issues-github` integration registration. The `IntegrationsManager.listInstalledPlugins()` collapse (followup `uROI`) is deliberately-preserved behavior living in `@liquid-labs/plugable-express`, out of scope; "accidentally fixing" it here would move the integrations snapshot and the `expect(body.length).toBe(2)` assertion.

## Validation

1. `jq 'length' test/__snapshots__/full-tier-api-spec.json` returns `165`.
2. The `npmName` tally is 35 / 118 / 6 / 2 / 2 / 2 across `@liquid-labs/plugable-express`, `@sdlcforge/core-server`, `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd`, and the three remaining `sdlc-projects-*` packages; `grep -c 'dev-core' test/__snapshots__/full-tier-api-spec.json` returns `0`.
3. The `npmName`-stripped, sorted identity comparison between the pre- and post-rebaseline api-spec produces no diff.
4. `full-tier-plugins-list.json` holds exactly 5 entries and no `@sdlcforge/dev-core` row.
5. `full-tier-integrations-list.json` is unchanged (`git diff --stat` empty), or the change is reported as a suspected regression.
6. `git diff --stat -- test/__snapshots__/golden-api-spec.json test/__snapshots__/golden-plugins-list.json` is empty and both blob SHAs match Phase 1's recorded pre-merge map.
7. `TEST=full-tier-baseline make test` passes with `UPDATE_FULL_TIER_BASELINE` **unset** (a fresh, non-updating run against the newly-committed snapshots), with none of the four `EXPECTED_*` constants modified.
8. `git diff` on `src/lib/test/full-tier-baseline.test.js` touches comments only.

## Assumptions

- Task 001 has run and confirmed neither hazard is present. If task 001 reported hazard A, the merged server would fail to start (duplicate route/path-variable registration) or record a wrong snapshot; do not rebaseline against an unconfirmed graph.
- Dependencies are provisioned (`scripts/provision-local-deps.sh`); `PLUGABLE_PLAYGROUND` isolation is already handled inside the harness.
- `make test` as a whole is not green at task start — `plugin-graph-gate.test.js` and the sibling graph tests still fail until tasks 003 and 004 land. Scope runs with `TEST=full-tier-baseline`.
- The `qa/.unit-test.passed` marker is touched by any `make test` run, including a `TEST=`-scoped one. A scoped run here leaves a marker that does not represent a full pass; task 005 removes it before its own full run.

## References

- `plan/resources/dev-core-absorption-parity-contract.md` — Phase 1's contract, authoritative for what is and is not allowed to move. Walk its numbered items.
- [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md) — the predecessor absorption's contract, the model Phase 1's follows; its section 1/2/3/7 shape maps directly onto requirements 3–5 above.
- [`plan/notes/pre-merge-state.md`](../notes/pre-merge-state.md#route-and-plugin-surface) — the recorded 165-route surface and the 35 / 112 / 6 / 6 / 2 / 2 / 2 pre-merge tally.
- [`plan/phases/verify-parity-and-tighten-gate.md`](../phases/verify-parity-and-tighten-gate.md) — goals 1 and 2, the contract items and the negative space.
- `src/lib/test/full-tier-baseline.test.js` — the harness, its four frozen constants, and the `UPDATE_FULL_TIER_BASELINE` opt-in.

## Checkpoint hints

- After capturing the pre-rebaseline tallies and identity file, before running the rebaseline.
- After the rebaseline, once the three snapshot diffs are justified.
- After the `full-tier-baseline.test.js` comment correction and a clean scoped re-run.
