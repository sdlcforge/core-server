# Update Documentation And Stale In-Source Donor References

## Purpose and scope

Bring every prose description of `core-server`'s plugin set into line with the swap task 002 landed: four `@liquid-labs/*` donor packages replaced by one `@sdlcforge/dev-core`, and the explicit-plugin count dropping from 8 to 5.

Scope is documentation and non-executing in-source comments only. No behavior changes here, and nothing in this task may touch `package.json`, `bun.lock`, `src/lib/app-init.mjs`, or any test assertion.

Two things make this larger than the migration spec's own touch-point table suggests, both recorded as drift:

- The spec's table was written when `explicitPlugins` held 11 entries and named `liq-controls`/`liq-credentials`/`liq-integrations-issues-github` among them. Those three were absorbed in-tree by a later plan, so today's docs state **8**, and the count itself needs updating to **5** wherever it appears — an edit the spec's per-donor tables never contemplated.
- The spec's table omits three real touch-points that exist today: `docs/project-structure.md`, `plugin-loading-tiers.md`'s prose about the in-tree `controls` submodule's dependency on the donors, and a cluster of stale in-source comments.

## Requirements

Locate every edit by content, not by the line numbers below — they are a navigation aid recorded at planning time and may have shifted.

### 1. `docs/architecture.md`

- **The Mermaid diagram node** (~line 23) reads `Tier2["Tier 2: explicit plugins<br/>(built-in in-tree submodules, then<br/>8 npm-dependency packages, e.g. liq-orgs, liq-work)"]`. Repoint the example to `dev-core` and correct the count to 5. Keep the node's two-source structure — the in-tree submodules are unaffected by this migration.
- **The `<!-- For AI agents and non-visual readers -->`-style alt description** attached to the diagram, if it names the count or the donors, must move with it. The equivalent comment in `plugin-loading-tiers.md` definitely does; check this file's too. A diagram whose prose alternative disagrees with it is worse than either alone.
- **Core initialization prose** (~line 51 region) states the `explicitPlugins` list is "8 npm packages" — correct to 5.
- **Plugin system prose** (~line 51) names `liq-orgs`, `liq-projects`, `liq-work`, `plugable-projects-audit` and says "a static list of 8 `@liquid-labs/*` npm-dependency packages … plus four `sdlc-projects-*` workflow/badges packages". The list is no longer all-`@liquid-labs/*`; rewrite so the mixed scoping is accurate.
- **Test infrastructure prose** refers to "the 8-package npm-dependency install" — correct to 5.

### 2. `docs/architecture/plugin-loading-tiers.md`

This is the deep treatment and carries the most occurrences.

- **The explicit-tier package table.** The four donors are rows **1-4** of an 8-row table (the spec's "rows 4, 6, 7" numbering predates the in-tree absorption). Collapse all four into a **single** `@sdlcforge/dev-core` row and renumber the remaining `sdlc-projects-*` rows. The spec explicitly defers this collapse to "whichever swap lands last" — that is this migration, which handles all four together, so one row it is.

  Write the new row's "What it contributes" as a genuine summary of all four absorbed capabilities — project lifecycle, unit-of-work orchestration, org settings, and project audit — rather than concatenating the four old cells. `dev-core`'s own `package.json` `description` is the canonical phrasing to draw on.
- **The "As of this writing the array holds exactly 8 packages" sentence** immediately above that table → 5.
- **The Mermaid diagram node** `B["8 npm-dependency packages<br/>declared in app-init.mjs"]` and the `<!-- For AI agents and non-visual readers -->` comment above it, which also states 8. Both → 5.
- **The Docker-test paragraph** referring to "this specific 8-package set" → 5.
- **The in-tree-`controls` dependency paragraph** (~line 59) — *not in the migration spec's table, and the most substantive edit in this task.* It currently states that `src/controls/resources/load-controls.mjs` reads `app.ext._liqOrgs.orgs` and `src/controls/integrations/get-question-controls.mjs` reads both `app.ext._liqOrgs.orgs` and `app.ext._liqProjects.playgroundMonitor`, "so `@liquid-labs/liq-orgs` and `@liquid-labs/liq-projects` must both be present among the explicit-tier packages for controls to function."

  The **`app.ext` key names do not change** — the spec is explicit that `_liqOrgs`, `_liqProjects`, `WORK_DB_PATH`, and `setupMethods` are all preserved verbatim. What changes is the *provider*: one package now supplies both contracts instead of two. Rewrite so the reads and the mechanical `deps: ['load orgs']` enforcement are described accurately against `@sdlcforge/dev-core` as the single provider. Do not rename or "modernize" the `_liqOrgs`/`_liqProjects` keys in the prose — their `liq`-prefixed names surviving the consolidation is a real, load-bearing fact, and a reader who finds the doc calling them something else will be misled.

### 3. `docs/project-structure.md`

*Not in the migration spec's table.* Its `.yalc/` paragraph (~line 72) describes the directory as "a local yalc-linked copy of `@liquid-labs/plugable-express` and `@liquid-labs/liq-projects`" and refers to "its two `file:.yalc/…` dependencies". Repoint to `@liquid-labs/plugable-express` and `@sdlcforge/dev-core`; the count of two happens to stay two, but confirm that against the regenerated `bun.lock` rather than assuming, and match whatever `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` now says.

### 4. `test/README.md`

The expected-plugin list under "Explicit Plugins Integration" (~lines 105-108) carries all four donors as a contiguous block. Replace the four lines with one `- `@sdlcforge/dev-core`` line, leaving the four `sdlc-projects-*` lines. The list should end up with 5 entries, matching `explicitPlugins`.

### 5. `CLAUDE.md`

The numbered plugin-architecture list (~line 50) reads `3. **Explicit Plugins** (installed as npm dependencies): liq-orgs, liq-projects, liq-work, plugable-projects-audit, and the sdlc-projects-* workflow/badges family`. Replace the four donor names with `dev-core`. Item 1 of the same list says "8 explicit npm-dependency plugins" → 5.

There is no separate `AGENTS.md`-vs-`CLAUDE.md` split of this content in this project — both files exist and carry different material. Edit each where it actually says something about the plugin set; do not copy one into the other.

### 6. `AGENTS.md`

The **CI-policy bullet** (~line 62) states `bun.lock` "currently resolves three packages via `file:.yalc/…`: two direct dependencies, `@liquid-labs/plugable-express` and `@liquid-labs/liq-projects`, plus one transitive dependency, `@liquid-labs/http-smart-response`, pulled in by `@liquid-labs/plugable-projects-audit`'s own pinned dependency on it".

That sentence was **already wrong before this migration** (drift item D2: the `http-smart-response` transitive pin had gone, and a `@liquid-labs/playground-monitor` pin via `liq-orgs` had appeared in its place), and it is wrong differently now. Rewrite it against the actual regenerated lock — re-derive with `grep -n 'file:\.yalc' bun.lock`, exactly as that paragraph itself instructs. The expected post-swap answer is two direct packages and no transitive one, which drops the transitive clause entirely.

The same bullet also lists which upstream repositories CI does not check out — "`plugable-express`, `liq-projects`, or `http-smart-response`" — update that list too. Keep the paragraph's existing self-check framing ("treat it as a snapshot, not a permanent list; re-derive it with `grep -n 'file:\.yalc' bun.lock`") — it is exactly why the drift was catchable.

### 7. Stale in-source comments

*Not in the migration spec's table.* These are comments only — no assertion or executing code may change. Where a comment describes a donor as still-external or still-separate, correct the attribution to `@sdlcforge/dev-core` while preserving the point the comment was making:

- `src/lib/test/full-tier-baseline.test.js` — the `beforeAll` comment says the harness "loads the real, full eleven-package explicit-plugin tier" (wrong twice over now: it is five). Another comment attributes `setupPlayground()`'s `${HOME}/playground` default to "`liq-projects`'"; that behavior now comes from `dev-core`'s `projects` submodule.
- `src/lib/test/builtin-plugins.test.js` — comments naming `load orgs` as "contributed by the still-external `liq-orgs`", `app.ext.credentialsDB` as "the cross-package contract name `liq-work` and `liq-integrations-issues-github` both read", and a block describing "the still-external, npm-discovered `liq-projects` plugin's own `setup()`". All three describe live contracts whose provider is now `dev-core`.
- `src/lib/test/golden-api-spec.test.js` — a comment lists `liq-work` among packages that once read the stale `app.ext.serverHome` key. The migration spec's own correction records that **`liq-work` never read `serverHome`** and the comment has been stale on that point all along. Correct or drop the `liq-work` mention; do not go looking for a `serverHome` bug in `dev-core` on the strength of it.

### 8. Out of scope

`docs/core-server-spec.md` names no donor package — its plugin-tier language is generic — so it needs no donor edit here. Phase 2's architecture-conformance sweep covers it. Its separate claim of Node 18-24 support versus this host's v26.5.0 is a genuine observation but belongs to neither task; note it, do not act on it.

## Validation

- `git grep -n -E 'liq-orgs|liq-projects|liq-work|plugable-projects-audit' -- . ':!plan' ':!test/__snapshots__' ':!bun.lock'` returns nothing outside legitimate historical context. Any surviving hit must be justified in the task report, not left silent.
- `git grep -n '8 npm-dependency\|8 packages\|8-package\|eleven-package\|11 packages'` returns nothing.
- `docs/architecture/plugin-loading-tiers.md`'s explicit-tier table has 5 rows, numbered 1-5, with exactly one `@sdlcforge/dev-core` row.
- `test/README.md`'s expected-plugin list has 5 entries and matches `src/lib/app-init.mjs`'s `explicitPlugins` array element-for-element.
- Each Mermaid diagram's `<!-- For AI agents and non-visual readers -->` alt description agrees with the diagram it describes — same count, same package names.
- `AGENTS.md`'s CI-policy bullet's package list matches the literal output of `grep -n 'file:\.yalc' bun.lock` and `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES`.
- `git diff -- src/` shows changes to comment lines only: `bun run test` passes with results identical to before this task, and no snapshot file is modified.
- Every internal doc link still resolves; no link was repointed as collateral.

## Metadata

architectural_impact: true

## Assumptions

- Task 002 has landed: `package.json`, `src/lib/app-init.mjs`, `bun.lock`, and `scripts/provision-local-deps.sh` already reflect the swap, so `bun.lock` can be trusted as the source of truth for requirements 3 and 6.
- Some test tiers may already be red per task 001's baseline; this task must leave that state exactly as it found it.

## Checkpoint hints

- After `docs/architecture.md` and `docs/architecture/plugin-loading-tiers.md` (the two architecture docs).
- After `docs/project-structure.md`, `test/README.md`, `CLAUDE.md`, and `AGENTS.md` (the working-notes tier).
- After the in-source comment corrections.

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md` — the per-donor `Edits required in core-server` tables naming the doc touch-points, and each donor's `What does not change` section, which is the authority for the preserved `app.ext` key names requirement 2 turns on.
- `/Users/zane/playground/sdlcforge/dev-core/README.md` — per-submodule accounts of what `dev-core` actually provides; the source for an accurate combined table-row description.
- [current-state drift](../notes/current-state-drift.md) — the full touch-point inventory including the three the migration spec omits.
- `plugins/flow/standards/technology/markdown/markdown-design-standards.md` — Mermaid diagram and alt-description rules these docs follow.

## Status

- **Outcome:** succeeded
- **Date:** 2026-08-27
- **Files touched:** `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`, `test/README.md`, `CLAUDE.md`, `AGENTS.md`, `src/lib/test/full-tier-baseline.test.js`, `src/lib/test/builtin-plugins.test.js`, `src/lib/test/golden-api-spec.test.js`.
- **Validation summary:**
  - `git grep -n -E 'liq-orgs|liq-projects|liq-work|plugable-projects-audit' -- . ':!plan' ':!test/__snapshots__' ':!bun.lock'` → one surviving hit, `docs/architecture/plugin-loading-tiers.md`'s new collapsed-row description, which names the four absorbed donors as legitimate historical/provenance context (per Requirement 2's instruction to summarize "all four absorbed capabilities"). No other surviving hits.
  - `git grep -n '8 npm-dependency\|8 packages\|8-package\|eleven-package\|11 packages'` → empty outside `plan/` (which is off-limits to edit and is expected to retain historical drift-note/task-doc references to the old counts, consistent with how the first check itself treats `plan/` as legitimate historical context).
  - `docs/architecture/plugin-loading-tiers.md`'s explicit-tier table → 5 rows, numbered 1-5, exactly one `@sdlcforge/dev-core` row (row 1, collapsing the four donor rows per Requirement 2's explicit instruction to "renumber the remaining rows").
  - `test/README.md`'s expected-plugin list → 5 entries, reordered to match `src/lib/app-init.mjs`'s `explicitPlugins` array element-for-element (`sdlc-projects-badges-coverage`, `sdlc-projects-badges-github-workflows`, `sdlc-projects-workflow-github-node-jest-cicd`, `sdlc-projects-workflow-local-node-build`, `@sdlcforge/dev-core` — `dev-core` last, per the actual array order task 002 landed, not the donor block's old first-four position).
  - Mermaid alt-description agreement: `docs/architecture.md`'s existing alt description never named the count or donor packages, so no edit was needed there (verified, not assumed); `docs/architecture/plugin-loading-tiers.md`'s alt description and its diagram node both corrected to 5.
  - `AGENTS.md`'s CI-policy bullet re-derived against `grep -n 'file:\.yalc' bun.lock` (two entries, both direct: `@liquid-labs/plugable-express`, `@sdlcforge/dev-core`; no transitive) and `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` (same two) — bullet now matches both exactly, transitive clause dropped.
  - `git diff -- src/` → touches only comment lines in the three named test files; no assertion or executing code changed.
  - `bun run test` (via `make test`, after provisioning `.yalc/` from the main checkout per the dispatch note, since this worktree's own `.yalc/` was empty) → 12 test suites / 40 tests passed, identical to the pre-task baseline; `test/__snapshots__/` shows no modification (`git status --porcelain test/__snapshots__` empty).
  - Internal doc links: no link target or anchor was repointed; only prose/count/name text changed.
- **Assumptions applied:** Task 002 had landed (`package.json`/`bun.lock`/`app-init.mjs`/`provision-local-deps.sh` already reflect the swap) — confirmed directly by reading those files rather than merely assumed.
- **Notes:** `docs/core-server-spec.md` was left untouched per Requirement 8 (out of scope; no donor package named there; Node 18-24-vs-host-v26.5.0 observation noted but not acted on, consistent with the task doc and the drift note's H3).
