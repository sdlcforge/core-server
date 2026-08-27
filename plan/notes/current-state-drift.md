# Current-State Drift Against consumer-migration.md

## Purpose and scope

`dev-core/docs/consumer-migration.md` states it was re-verified against `core-server`'s `main` at commit `54b06d0` (2026-08-17). This note records a fresh re-verification performed at planning time (2026-08-27, against `core-server` `main` at `b038bbe`) and enumerates every place the spec's facts no longer match the tree. It exists so the implementing tasks work from present-day facts rather than the spec's timestamped line numbers.

**Bottom line: every substantive claim in the spec still holds — all four donor entries are present and unswapped, the content strings match verbatim, and the atomicity reasoning is unaffected. What has drifted is line numbers, the surrounding doc/test surface, and the yalc/lockfile picture.** Three drift items are load-bearing and change what the migration must do.

## Verification method

- `git grep -n -E 'liq-projects|liq-orgs|liq-work|plugable-projects-audit'` across the tracked tree.
- `grep -n 'file:\.yalc' bun.lock` — the re-derivation `AGENTS.md` itself prescribes.
- Direct reads of `package.json`, `src/lib/app-init.mjs`, `scripts/provision-local-deps.sh`, `test/__snapshots__/*`, and `/Users/zane/playground/sdlcforge/dev-core/package.json`.

## Confirmed unchanged

All four donors are still declared and still loaded, with the spec's exact content strings:

| Donor | `package.json` (spec line → actual) | `app-init.mjs` (spec line → actual) |
|---|---|---|
| `@liquid-labs/liq-orgs` | 46 → **49** (`"^1.0.0-alpha.6"`) | 37 → **53** |
| `@liquid-labs/liq-projects` | 47 → **50** (`"file:.yalc/@liquid-labs/liq-projects"`) | 38 → **54** |
| `@liquid-labs/liq-work` | 48 → **52** (`"^1.0.0-alpha.9"`) | 39 → **55** |
| `@liquid-labs/plugable-projects-audit` | 50 → **56** (`"^1.0.0-alpha.2"`) | 40 → **56** |

The four are the first four entries of `explicitPlugins`, followed by the four `sdlc-projects-*` packages. `@sdlcforge/dev-core` is not present anywhere in the tree.

`@sdlcforge/dev-core`'s own `package.json` confirms the two spec-relevant resolutions: it declares `@liquid-labs/http-smart-response` at `^1.0.0-alpha.6` and `@liquid-labs/playground-monitor` at `^1.0.0-beta.4` — both registry ranges, neither a `file:.yalc/…` spec.

## Load-bearing drift

### D1 — `explicitPlugins` now holds 8 entries, not 11

The `core-server-domain-consolidation` plan (completed 2026-08-24, after the spec was written) absorbed `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` in-tree under `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/`, registered through `plugable-express`'s `builtinPlugins` option under `@sdlcforge/core-server`'s own identity. The spec's parenthetical note that "`explicitPlugins` currently holds **11** entries" is stale; it holds **8**, dropping to **5** after this migration.

Consequence for the migration: every doc that states the count (`docs/architecture.md` twice, `docs/architecture/plugin-loading-tiers.md` four times, its Mermaid diagram node, `CLAUDE.md`) must go 8 → 5, on top of the donor-name edits the spec enumerates.

### D2 — the yalc `file:` set has changed in both directions

`grep -n 'file:\.yalc' bun.lock` today resolves **three** packages, not the spec's (and `AGENTS.md`'s, and `provision-local-deps.sh`'s) three:

| Package | Direct/transitive | Source of the `file:` pin |
|---|---|---|
| `@liquid-labs/plugable-express` | direct | `package.json` |
| `@liquid-labs/liq-projects` | direct | `package.json` |
| `@liquid-labs/playground-monitor` | transitive | `@liquid-labs/liq-orgs@1.0.0-alpha.8`'s own pinned dependency |

`@liquid-labs/http-smart-response` **no longer resolves via `file:.yalc/…` at all.** The spec's "`http-smart-response` simplification" — the clause about `plugable-projects-audit` pinning it transitively — has already happened by other means; that transitive pin is gone from `bun.lock` independently of this migration. In its place, a *different* transitive `file:` pin appeared: `@liquid-labs/playground-monitor`, pulled in by `liq-orgs` (which `bun.lock` resolves at `1.0.0-alpha.8`, ahead of `package.json`'s `^1.0.0-alpha.6` floor).

`scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` array is therefore **already out of sync with `bun.lock` in both directions today**: it lists `@liquid-labs/http-smart-response`, which is no longer `file:`-resolved, and omits `@liquid-labs/playground-monitor`, which is. The same staleness is mirrored in that script's header comment (line 7-8) and its missing-package error text (lines 78-82), and in `AGENTS.md`'s CI-policy bullet.

Expected post-swap state, which the implementing task must **re-derive from the regenerated `bun.lock` rather than assume**: `@liquid-labs/plugable-express` and `@sdlcforge/dev-core`, two entries. Removing `liq-orgs` drops the `playground-monitor` pin (dev-core declares it at a registry range); removing `liq-projects` drops its own direct pin.

### D3 — a full-tier characterization snapshot suite now exists, and the swap moves it substantially

The spec's snapshot guidance ("`golden-plugins-list.json` is literally `[]`, every `npmName` in `golden-api-spec.json` is `@liquid-labs/plugable-express`, so this swap is unlikely to move either file") is **still accurate for those two files** — re-verified: `golden-plugins-list.json` is `[]`, and all 35 `npmName` values in `golden-api-spec.json` are `@liquid-labs/plugable-express`, because `golden-api-spec.test.js` passes `skipCorePlugins: true` and deliberately loads no explicit plugins.

But the spec does not mention `src/lib/test/full-tier-baseline.test.js` and its three snapshots under `test/__snapshots__/`, added by the same later plan as D1. That harness loads the **real, full explicit-plugin tier** and asserts against checked-in JSON. Its snapshots are full of donor provenance and **will** move:

| Snapshot | Donor `npmName` occurrences today | Post-swap |
|---|---|---|
| `full-tier-api-spec.json` | 6 `liq-orgs`, 38 `liq-projects`, 60 `liq-work`, 8 `plugable-projects-audit` (112 total) | all become `@sdlcforge/dev-core` |
| `full-tier-plugins-list.json` | 4 separate donor entries of 9 | one `@sdlcforge/dev-core` entry, 6 total |
| `full-tier-integrations-list.json` | none (both entries are `@sdlcforge/core-server`) | unchanged |

Regeneration path: `bun run test:update-full-tier-baseline` (`UPDATE_FULL_TIER_BASELINE=true TEST=full-tier-baseline make test`). This is a *distinct* regeneration entry point from `bun run test:update-golden-api-spec`; the two harnesses are deliberately independent.

Two of that harness's non-snapshot assertions are expected to survive the swap unchanged, and are the sharpest available signal that `dev-core`'s composite `setup` really is contract-equivalent — treat a failure in either as a genuine finding, not a snapshot to regenerate:

- `EXPECTED_SETUP_METHODS` includes `load orgs`, `prepare org dependencies`, and `process org setup` — the three `liq-orgs` contributes, which the spec states `dev-core`'s `orgs` submodule preserves by name, order, and `deps` marker.
- `EXPECTED_APP_EXT_KEYS` includes `_liqOrgs` and `_liqProjects`, which the spec states are preserved verbatim.

Also note the donor packages' own published summaries already read `DEPRECATED — superseded by @sdlcforge/dev-core` in `full-tier-plugins-list.json`, independent confirmation that the donor side of the consolidation has landed upstream.

## Non-load-bearing drift (line numbers and extra touch-points)

| Spec reference | Actual today |
|---|---|
| `docs/architecture.md:23` Mermaid label naming `liq-controls, liq-work` | line 23, now reads `8 npm-dependency packages, e.g. liq-orgs, liq-work` |
| `docs/architecture.md:51` prose | line 51, now names all four donors plus the 8-package count |
| `docs/architecture/plugin-loading-tiers.md` donor table rows 4/6/7 | rows renumbered: donors are now rows **1-4** of an 8-row table |
| — (not in spec) | `docs/architecture/plugin-loading-tiers.md:59` — new prose stating the in-tree `controls` submodule requires `liq-orgs` and `liq-projects` to be loaded, reading `app.ext._liqOrgs.orgs` and `app.ext._liqProjects.playgroundMonitor` |
| — (not in spec) | `docs/architecture/plugin-loading-tiers.md:20, 31, 65, 80` — the "8 packages" count and diagram node |
| `test/README.md:108/110/111` | lines **105-108**, a contiguous block of all four donors |
| `CLAUDE.md:49` | line **50**, now reads `liq-orgs, liq-projects, liq-work, plugable-projects-audit, and the sdlc-projects-* workflow/badges family` |
| `AGENTS.md:60` yalc paragraph | line **62** |
| `test/test-basic.js:54` | line **52** |
| `test/test-integration-quick.js:61, 87` | lines **59, 83** |
| `scripts/provision-local-deps.sh:8, 31-35, 79` | header comment lines **7-8**, array lines **31-35**, error text lines **78-82** |
| — (not in spec) | `docs/project-structure.md:72` — names `.yalc/` as "a local yalc-linked copy of `@liquid-labs/plugable-express` and `@liquid-labs/liq-projects`" |
| — (not in spec) | stale in-source comments naming donors as still-external: `src/lib/test/builtin-plugins.test.js:102, 124, 142, 145, 160` and `src/lib/test/full-tier-baseline.test.js:162, 192` (the latter says "eleven-package explicit-plugin tier", already wrong per D1) |

The spec's claim that only `liq-projects` has test-fixture occurrences among the four donors is **confirmed**: `test/test-basic.js:52` and `test/test-integration-quick.js:59, 83` are the only three, and no fixture names `liq-orgs`, `liq-work`, or `plugable-projects-audit`.

## Two execution hazards not covered by the spec

### H1 — `@sdlcforge/dev-core` is not in the global yalc store

`~/.yalc/packages/@sdlcforge/dev-core` does not exist, and no `core-server` worktree has `.yalc/@sdlcforge/`. Nothing can install until a `yalc publish` is run from the `dev-core` checkout. `dev-core`'s `dist/` is already built and its `.gitignore` covers `/dist`, `/.yalc`, `/yalc.lock`, so publishing writes nothing git-tracked in `dev-core`. Prefer `yalc publish --no-scripts` so `dev-core`'s `prepack` (`make build`) does not run and rebuild that checkout.

### H2 — `finalize-task-commit.sh` will silently drop `package.json` and `bun.lock` from the atomic commit

The Flow task-commit helper carries a yalc-override guard (`plugins/flow/scripts/finalize-task-commit.sh`, lines 123-140): for any modified tracked `package.json` / `bun.lock` / `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` whose diff against `HEAD` **adds a line matching `.yalc/`**, it appends a `:(exclude,literal)<file>` pathspec to its `git add -A` call.

This migration adds exactly such a line — `"@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core"` — so both `package.json` and `bun.lock` match the guard and are excluded. Left unhandled, the finalize step commits `src/lib/app-init.mjs` **without** `package.json`: precisely the half-migrated, non-installable state the spec's atomicity requirement forbids. This project's own follow-up `Z2Ar` records hitting the same guard and committing `bun.lock` by hand as the accepted workaround.

The guard only suppresses `git add`; it does not unstage. The reliable workaround is therefore to **stage `package.json` and `bun.lock` explicitly before invoking the helper**:

```bash
git add package.json bun.lock
bash "<plugin_root>/scripts/finalize-task-commit.sh" "<message>"
```

and then verify with `git show --stat HEAD` that all of `package.json`, `bun.lock`, and `src/lib/app-init.mjs` are present in the single resulting commit.

### H3 — this host runs Node v26.5.0

The spec discloses that `@liquid-labs/liq-work`'s bundle cannot be `require`d on Node ≥ 24 (`buffer-equal-constant-time` dereferencing the removed `SlowBuffer`), pre-existing and inherited by `dev-core`. This host is on **v26.5.0**, well past that line, yet `full-tier-api-spec.json` carries 60 `liq-work` route entries — so the harness evidently did load `liq-work` when that snapshot was captured (2026-08-24). Whether it still does is unverified. This is why the migration captures a **pre-swap** baseline of which test tiers pass before touching anything: without it, a red suite after the swap cannot be attributed.

`docs/core-server-spec.md` claims Node support across 18-24 and names no donor packages, so it needs no donor edit; the Node-version claim versus this host is a separate, out-of-scope observation.
