# Swap Four Donor Plugins For Dev-Core In One Atomic Commit

## Purpose and scope

Remove all four donor packages — `@liquid-labs/liq-orgs`, `@liquid-labs/liq-projects`, `@liquid-labs/liq-work`, `@liquid-labs/plugable-projects-audit` — from `core-server`'s `package.json` dependencies and its `explicitPlugins` array, and add a single `@sdlcforge/dev-core` entry in their place, **in one commit**.

This is the indivisible centre of the plan. It is one task rather than four because every intermediate state is a startup crash, not a degraded server:

- **A donor and `dev-core` loaded together** → the donor's `setup` and `dev-core`'s composite `setup` both call `registerPathVar` for the same name, and `plugable-express` throws before any handler registers: `Path variable 'newOrgKey' is already registered.` (orgs), `'newProjectName'` (projects), `'workKey'` (work). Had that not fired, a duplicated array-style path would follow: `Non-unique command path: …`.
- **`liq-projects` removed while `plugable-projects-audit` remains** → a different failure unique to that pair, because only the `projects` submodule registers `projectName` and two audit paths consume it: `Unknown variable path element type 'projectName' while processing path projects/:projectName/audit.`
- **All donors removed and `dev-core` not added** → silent, and worse. `liq-projects`'s `setup` registers the `GITHUB_API` credential type that `liq-integrations-issues-github` later fetches. `registerCredentialType` does not fail on a missing registration; the breakage surfaces only at the next `getToken('GITHUB_API')` call.

The migration spec is the authority for all of the above and states each string verbatim; this task does not re-derive them.

## Requirements

Read [current-state drift](../notes/current-state-drift.md) first. The migration spec's line numbers are timestamped against commit `54b06d0` and have all moved; the content strings are unchanged. **Locate every edit by content, never by line number.**

### 1. `package.json`

Remove these four dependency entries:

| Entry | Note |
|---|---|
| `"@liquid-labs/liq-orgs": "^1.0.0-alpha.6"` | registry range; nothing to unlink |
| `"@liquid-labs/liq-projects": "file:.yalc/@liquid-labs/liq-projects"` | the one yalc-linked donor |
| `"@liquid-labs/liq-work": "^1.0.0-alpha.9"` | registry range |
| `"@liquid-labs/plugable-projects-audit": "^1.0.0-alpha.2"` | registry range |

Add exactly one entry, in the dependency block's existing alphabetical position (`@sdlcforge/…` sorts after every `@liquid-labs/…`):

```json
"@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core"
```

Leave `"@liquid-labs/http-smart-response": "^1.0.0-alpha.6"` alone — it is a direct dependency at a registry range and is unaffected. The spec's "`http-smart-response` simplification" concerns a *transitive* `file:.yalc` resolution which, per drift item D2, has already disappeared from `bun.lock` by other means.

### 2. `src/lib/app-init.mjs`

Remove the four donor strings from the `explicitPlugins` array — they are its first four entries — and append `'@sdlcforge/dev-core'`. The array is alphabetically ordered and `@sdlcforge/…` sorts last, so the new entry belongs at the **end**, after `'@liquid-labs/sdlc-projects-workflow-local-node-build'`, not in the removed donors' position. The array goes from 8 entries to 5.

The long comment block immediately above the array concerns the three in-tree absorbed plugins and is unrelated to this swap; leave it alone.

### 3. Regenerate `bun.lock` — never hand-edit it

```bash
rm -f bun.lock && bun install
```

or equivalently `./scripts/provision-local-deps.sh --refresh-lock`. A bare `bun install` will not re-resolve a changed `file:` spec; `--force`, `--no-cache`, and a version bump are all equally ineffective. This is `AGENTS.md`'s own documented rule.

### 4. Resynchronize `scripts/provision-local-deps.sh` from the *regenerated* lock

Re-derive the truth, do not assume it:

```bash
grep -n 'file:\.yalc' bun.lock
```

The **expected** post-swap set is two entries — `@liquid-labs/plugable-express` and `@sdlcforge/dev-core` — because removing `liq-projects` drops its direct pin and removing `liq-orgs` drops the transitive `@liquid-labs/playground-monitor` pin that only `liq-orgs@1.0.0-alpha.8` carried (`dev-core` declares `playground-monitor` at the registry range `^1.0.0-beta.4`). **Verify this against the actual output; if it differs, the actual output wins and the discrepancy is a finding to report.**

Then update three places in that script so all three agree with the lock:

- the `REQUIRED_YALC_PACKAGES` array (currently three entries, and already wrong today in both directions — it lists `@liquid-labs/http-smart-response`, which is no longer `file:`-resolved, and omits `@liquid-labs/playground-monitor`, which is);
- the header comment describing which packages are direct and which transitive, and via which donor;
- the missing-package error text, which names `@liquid-labs/plugable-projects-audit` as the source of the transitive link.

The transitive-link clause disappears entirely once the set is two direct packages and nothing else. That is a simplification, not a regression.

### 5. The three donor test fixtures

Replace `'@liquid-labs/liq-projects'` with `'@sdlcforge/dev-core'` at:

- `test/test-basic.js` — one entry in the `expectedPackages` array.
- `test/test-integration-quick.js` — one entry in **each** of two separate `explicitPlugins` array literals (the JSON-parse path and the non-JSON fallback path). Both must change.

These are the only three donor fixture occurrences; no fixture names `liq-orgs`, `liq-work`, or `plugable-projects-audit`. Confirm with a grep rather than trusting this.

### 6. Regenerate the full-tier characterization snapshots

`src/lib/test/full-tier-baseline.test.js` loads the real, full explicit-plugin tier and asserts against checked-in JSON under `test/__snapshots__/`. The migration spec predates this harness and does not mention it; drift item D3 covers it.

```bash
bun run test:update-full-tier-baseline
```

Expected movement, checkable against task 001's recorded baseline counts:

- `full-tier-api-spec.json` — 112 donor `npmName` occurrences (6 orgs, 38 projects, 60 work, 8 audit) become `@sdlcforge/dev-core`. The 35 `@liquid-labs/plugable-express` and 6 `@sdlcforge/core-server` occurrences should not move.
- `full-tier-plugins-list.json` — 9 entries become 6; four donor entries collapse into one `@sdlcforge/dev-core` entry whose summary is `dev-core`'s `package.json` `description`.
- `full-tier-integrations-list.json` — unchanged; both its entries are already `@sdlcforge/core-server`.

**Provenance is the only legitimate change.** If any route `path`, `method`, parameter, or help string moves, stop and report it — the spec states every route, method, parameter, and response shape is preserved byte-identically across all four donors.

**Two assertions in that file must pass without regeneration**, and are the sharpest available evidence that `dev-core`'s composite `setup` is genuinely contract-equivalent. Treat a failure in either as a real finding, not a snapshot to refresh:

- `EXPECTED_SETUP_METHODS` — includes `load orgs`, `prepare org dependencies` (`deps: ['!']`), and `process org setup` (`deps: ['*']`), the three `liq-orgs` contributes. The in-tree `controls` submodule's `'load org controls'` declares `deps: ['load orgs']`, matched by exact string by `@liquid-labs/dependency-runner` — a live cross-package contract.
- `EXPECTED_APP_EXT_KEYS` — includes `_liqOrgs` and `_liqProjects`, both preserved verbatim by the consolidation.

`golden-api-spec.json` and `golden-plugins-list.json` are a **separate** harness with a **separate** regeneration entry point (`bun run test:update-golden-api-spec`). Both are expected not to move: `golden-api-spec.test.js` passes `skipCorePlugins: true`, so all 35 of its `npmName` values are `@liquid-labs/plugable-express` and `golden-plugins-list.json` is literally `[]`. **Re-verify rather than assume, and do not regenerate them unless they actually move** — if they do, the change is provenance-only and legitimate.

### 7. Land it as ONE commit — and defeat the commit guard that will otherwise break it

Flow's `finalize-task-commit.sh` carries a yalc-override guard: for any modified tracked `package.json`/`bun.lock` whose diff against `HEAD` adds a line matching `.yalc/`, it appends an exclude pathspec to its `git add -A`. This migration adds exactly such a line. **Left unhandled, the helper commits `src/lib/app-init.mjs` without `package.json` — precisely the forbidden half-migrated state.** This project's follow-up `Z2Ar` records hitting the same guard before.

The guard suppresses `git add` only; it does not unstage. So stage both explicitly first, in the same Bash call as the helper:

```bash
git add package.json bun.lock && \
  bash "<plugin_root>/scripts/finalize-task-commit.sh" "<message>"
```

Then **verify the commit is complete** before reporting:

```bash
git show --stat HEAD
```

It must list at minimum `package.json`, `bun.lock`, and `src/lib/app-init.mjs`, plus `scripts/provision-local-deps.sh`, the two test fixtures, and the two changed snapshots. Make **no** mid-task commit that carries a partial swap; if a checkpoint commit is wanted, take it before any of requirements 1-3 begin, not between them.

### 8. Out of scope for this task

Documentation (task 003), runtime verification against the spec's checklist (task 004), publishing `dev-core` to npm, and any of the pre-existing defects the spec documents as migrating unchanged.

## Validation

- `git grep -n -E '@liquid-labs/(liq-orgs|liq-projects|liq-work|plugable-projects-audit)' -- package.json src/ test/ scripts/` returns nothing. (Documentation hits are expected and belong to task 003; scope the grep as written.)
- `package.json` contains exactly one `@sdlcforge/dev-core` entry, and `src/lib/app-init.mjs`'s `explicitPlugins` has 5 entries ending in `'@sdlcforge/dev-core'`.
- `grep -n 'file:\.yalc' bun.lock` and `REQUIRED_YALC_PACKAGES` name the same package set; `bun install` completes cleanly against the regenerated lock.
- `bun run test` passes. `full-tier-baseline.test.js`'s setup-method and `app.ext`-key assertions pass **unregenerated**.
- `grep -c 'liq-orgs\|liq-projects\|liq-work\|plugable-projects-audit' test/__snapshots__/full-tier-api-spec.json` returns 0, and `grep -c '@sdlcforge/dev-core' test/__snapshots__/full-tier-api-spec.json` returns 112. `full-tier-plugins-list.json` holds 6 entries with one `@sdlcforge/dev-core`.
- `git diff` on the regenerated snapshots shows `npmName` changes only — no `path`, `method`, parameter, or help-string movement.
- `git show --stat HEAD` confirms one commit carrying `package.json`, `bun.lock`, and `src/lib/app-init.mjs` together. `git log --oneline` on this branch shows no earlier commit containing a partial swap.
- `git -C /Users/zane/playground/sdlcforge/dev-core status --porcelain` is clean — the read-only-reference constraint held.

## Metadata

architectural_impact: true

## Assumptions

- Task 001 has published `@sdlcforge/dev-core` to the global yalc store and populated `.yalc/@sdlcforge/dev-core` in this worktree, and has left `package.json` unmodified.
- Some test tiers may be red *before* this task starts, per task 001's recorded baseline (Node v26.5.0 is past the `liq-work` `SlowBuffer` line the spec discloses). Compare against that baseline rather than against "green"; a tier already red is not this task's to fix.

## Checkpoint hints

- After requirements 1-3 (`package.json` + `app-init.mjs` + regenerated `bun.lock`) — the atomic unit; **the earliest safe commit point, and it must carry all three at once**.
- After requirement 4 (`scripts/provision-local-deps.sh`).
- After requirements 5-6 (fixtures and regenerated snapshots).

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md` — the authoritative per-donor edit tables, the four `Atomicity requirement` sections and their verbatim crash strings, and the `projects-audit` section's `http-smart-response` simplification.
- [current-state drift](../notes/current-state-drift.md) — D1 (8 not 11 entries), D2 (the changed yalc set), D3 (the full-tier snapshot suite), and H2 (the `finalize-task-commit.sh` guard).
- `plan/notes/pre-swap-baseline.md` — task 001's recorded before-state; the comparison basis for every count above.
- `AGENTS.md`, Conventions section — the `rm -f bun.lock && bun install` rule and the CI yalc policy.
- `plan/followups.yaml` item `Z2Ar` — the prior encounter with the commit guard.
