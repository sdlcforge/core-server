# Plan Overview — dev-core-consolidation (plugable-projects-audit slice)

## Purpose and scope

This plan is `plugable-projects-audit`'s own contribution to the federated `dev-core-consolidation` plan-group — Wave 2 ("Plugin Consolidation — Framework and Dev-Core") of the **SDLCForge Platform Modernization** wave plan, whose lead project is `core-server` and whose wave-plan slug is `sdlcforge-modernization`. The plan-group merges four functional repositories — `liq-projects`, `liq-work`, `liq-orgs`, and `plugable-projects-audit` — into a single new `@sdlcforge/dev-core` package, and retires `liq-projects-lib` once its one surviving real usage is absorbed elsewhere. All five participants share the plan slug `dev-core-consolidation`.

`liq-projects` is the lead slice and planned first, establishing decisions **D1–D11** in its `plan/notes/dev-core-target-shape.md`. `liq-orgs` planned second (phases 5–6, corrections C1–C3), `liq-work` third (phases 7–9, C4–C6), `liq-projects-lib` fourth (phase 10, C7–C11). **This plan follows that foundation rather than re-deciding any of it**, consumes phases **11, 12, and 13**, and contributes corrections **C12–C17**. It is the **fifth and last** slice: once its phases are registered, the plan-group is fully planned.

### What this package is (the dispatch brief had no description; this was established from source)

`@liquid-labs/plugable-projects-audit` is a **four-endpoint `plugable-express` plugin that wraps `npm-check-plus` to audit — and auto-fix — a playground project's npm dependencies.** The brief's suggestion that it might be a compliance/policy checker in the `liq-controls` family is **not** confirmed: "audit" here means `npm audit` plus outdated/missing/extraneous dependency analysis, and the entire package is two ~30-line library functions plus four thin handlers.

It **is** a `core-server` explicit plugin — `src/lib/app-init.mjs:40`, entry 7 of 11 — not a standalone CLI or library, so consumer-update work is real, though small (six documentation and configuration touch-points in one repository, and no test fixtures).

It is by a wide margin the **smallest and simplest** of the four donors: 11 tracked source files, 4 handlers, 1 test with 1 assertion, 4 dependencies, **no `setup`**, no README, no `docs/`, no `.catalyst-data.yaml`, no test fixtures, and a `Makefile`/`make/*.mk` set that is byte-identical to `liq-projects`'s. **D6's item 4 — "`projects-audit` — no `setup` at all; handlers only" — is confirmed by measurement**, so this absorption adds nothing to dev-core's composite setup and changes no part of the setup-ordering contract.

Full ground truth, with the commands to re-verify all of it, is in [plugable-projects-audit source inventory](./notes/plugable-projects-audit-source-inventory.md).

### What must change

- **The `file:.yalc/…` dependency spec is replaced by the registry range it stands for.** `package.json` declares `"@liquid-labs/http-smart-response": "file:.yalc/@liquid-labs/http-smart-response"` — committed, and present in the *published* `1.0.0-alpha.2`. `.yalc/` is gitignored, so in any fresh clone or Flow task worktree `npm install` silently produces a dangling symlink and `make test` fails. This lands **first**, in its own phase, because every later task in this slice runs in a fresh worktree.
- `plugable-projects-audit`'s `src/` tree relocates in place to its final dev-core-relative path (`src/projects-audit/…`), staying green and publishable throughout, with **zero import rewrites** (every import is a bare specifier or same-directory-relative).
- That tree is absorbed into `@sdlcforge/dev-core` by an unrelated-histories merge with history preserved, contributing **exactly one new dependency** (`npm-check-plus`) and four handlers, and wired into the aggregator's handler array — with **no** setup entry.
- dev-core's consumer-migration handoff gains this donor's section, and dev-core's documentation gains the four-route audit surface, which — like `liq-orgs`'s — has never been written down anywhere.
- `plugable-projects-audit` ends as a final, clearly-labelled superseded release: a `README.md` **authored from scratch** (it has none), a deprecation-bearing `description` (currently the empty string), version `1.0.0-alpha.3`, and a `files` allowlist that keeps Flow's artifacts out of the tarball.

### What must not change

- **The HTTP surface.** All 4 handlers keep their exact `path` arrays, methods, `parameters`, and `help` text — including the two *implied* variants' spurious `projectName` parameter and the `dascription` typo that suppresses one parameter's help. Those are disclosed, not fixed.
- **The `app.ext` contract.** Both library functions read `app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)`; the key name and the call stay exactly as they are (D7).
- **The absence of a `setup`.** This submodule contributes handlers only. Nothing is added to the composite setup list.
- **Behavior.** No refactoring, no dependency upgrades, no typo fixes in user-facing help text (they change the generated API spec), no 404-instead-of-500 fix, no removal of the dead `reporter.isolate()` lines. Those are follow-ups, not consolidation work.

### The most consequential finding: this donor's root entry is `src/index.mjs`, and D3 tells you to delete it

Every other donor's root entry point is `src/index.js`, so their absorb tasks correctly list it as a *clean arrival to `git rm`*, and D3's drop list says "the donor's root `src/index.*`". **This donor's is `src/index.mjs` — the exact path dev-core's own aggregator occupies.**

It therefore arrives as a **conflict**, not a clean arrival, and must be resolved **in dev-core's favor**. Applying D3's instruction literally deletes dev-core's aggregator and replaces it with a one-line `export * from './projects-audit'`. Rollup would still build, `make build` would still be green, and `dist/dev-core.js` would export a perfectly valid 4-element `handlers` array and no `setup` — **silently dropping every other donor's handlers and the entire composite setup, with no error anywhere.**

This is the single highest-blast-radius item in this slice, it is unique to this donor, and it is the one place where an instruction in the shared foundation is wrong rather than merely imprecise. It is carried as correction **C17**, as an explicit requirement and a hard post-condition in the absorb task, and as an item for the manager below.

### Success criteria

1. `plugable-projects-audit` installs, builds, lints, and tests green **from a fresh clone**, with no `.yalc/` directory and no manual provisioning.
2. dev-core carries this donor's complete tree under `src/projects-audit/`, with all 4 routes present with byte-identical `path` arrays, methods, `parameters`, and `help`.
3. dev-core's `src/index.mjs` after the absorb still imports **every** landed submodule and still exports a composite `setup` — i.e. C17 did not fire.
4. dev-core's `package.json` gained exactly one dependency (`npm-check-plus ^1.0.0-alpha.5`), carries **no** `file:` spec anywhere, and still holds `@liquid-labs/npm-toolkit` at `^1.0.0-alpha.21` and `@liquid-labs/http-smart-response` at `^1.0.0-alpha.6`.
5. `git log --follow` on a relocated file inside dev-core reaches its pre-merge `plugable-projects-audit` history.
6. dev-core documents the four-endpoint audit surface, its `app.ext._liqProjects` read, and the inherited defects — the first documentation this subsystem has ever had.
7. dev-core's consumer-migration handoff names every exact edit `core-server` must make, **including the two edits that remove work from core-server**: dropping `@liquid-labs/http-smart-response` from `REQUIRED_YALC_PACKAGES` and updating `AGENTS.md`'s yalc snapshot.
8. `plugable-projects-audit` is labelled superseded and deprecated, its final tarball contains 24–25 files rather than 50, and archival is left as an explicit user decision.

### Where this slice's source reading corrects or extends the shared foundation

Numbering continues from `liq-projects-lib`'s C7–C11. Full detail in the source inventory's **A10**. **Only C17 changes an instruction**; the rest change stated reasoning or fill gaps.

- **C12 — a donor ships a `file:.yalc/…` dependency in a *published* release, and it breaks fresh clones.** Verified end to end, including the remedy. Phase 11 exists for it.
- **C13 — D4's "take the higher range on overlap" fires twice more here**, and one of those cases (a `file:` spec versus a registry range) is one D4 does not anticipate: a `file:` spec must never be unioned into a publishable package, regardless of which side "looks higher". Net effect of this absorption on dev-core's `dependencies` is **one addition**.
- **C14 — this is the only donor with a hard cross-donor dependency at *handler-registration* time.** `pathToRe` throws `Unknown variable path element type 'projectName' …` when `liq-projects`'s `setup` has not registered it. Content-independence (D4) is unaffected; *validation* ordering is, and core-server's atomicity requirement gains a second distinct failure mode.
- **C15 — the plan-group's Node-26 `SlowBuffer` breakage does not reach this donor.** Measured green on Node v26.5.0. Tasks in this repository gate on **green**; tasks in dev-core use the "no new failures" rule.
- **C16 — the gitlink defect class does not reproduce here.** `git ls-files -s | grep '^160000'` is empty across the entire index. Checked before the restructure and absorb tasks were written, as directed.
- **C17 — D3's "drop the donor's root `src/index.*`" is actively dangerous for this donor.** Described above.

## Current status

Plan created; no phase has started. Starting phase: **phase 11 — projects-audit Dependency Remediation**.

Pre-conditions verified at plan-authoring time by running the toolchain on Node **v26.5.0**, not by reading committed reports (`/qa` is gitignored here, so nothing on disk is a committed baseline):

- `plugable-projects-audit` at `main` = `c50da02`, in the **main checkout** (where `.yalc/` happens to exist): `make test` → **1 suite / 1 test passing**; `make lint` → clean; `make build` → `dist/plugable-projects-audit.js`; and the built bundle `require()`s cleanly, exporting `handlers` (length **4**) and no `setup`.
- In a **fresh clone**, the same repository is **not** green: `npm install` reports success but leaves a dangling `node_modules/@liquid-labs/http-smart-response` symlink into the gitignored `.yalc/`, and `make test` fails with `Cannot find module '@liquid-labs/http-smart-response'`. Build and lint stay green, which is what makes it easy to miss. The phase-11 remedy was verified in that same throwaway clone: green on all three gates, with the bundle still exporting the identical four routes.
- Working tree is clean apart from untracked `.flow/` and `worktrees/`. **No dirty-working-tree decision to make**, unlike the `liq-orgs` slice.
- **No gitlink anywhere** (C16), and **no test data fixtures at all**, so `make/15-data-finder.mk` is not involved.
- Toolchain is byte-identical to `liq-projects`'s (`Makefile` and all seven shared `make/*.mk` files `diff`-clean; same three `sdlc-resource-*` devDependency ranges; same builder version `1.0.0-alpha.5`). **Zero toolchain-migration risk**, and the smallest D3 surface of any donor.
- `plan/manifest.yaml` **is tracked on `main`** and will arrive **cleanly** in the merge — the `liq-work` slice's C4 applies here verbatim, and the absorb task drops it explicitly.
- `sdlcforge/dev-core` still has exactly **one commit** (`07d7f0e`) and **one tracked file** (`package.json` at `@sdlcforge/dev-core@1.0.0-alpha.0`). **`liq-projects` phase 1 has not landed**, nor has any other slice's migration. Nothing in this plan creates a repository.
- `@sdlcforge/core-server` is the **only** consumer, anywhere in the playground — D10's claim holds here (unlike `liq-orgs`'s C2) — via a **registry range** (`^1.0.0-alpha.2`, not a `file:.yalc/` link), one `explicitPlugins` entry, and five documentation/script touch-points. **No core-server test fixture names this package.**
- The package's `version` is **identical to npm's `latest`** (`1.0.0-alpha.2`), so a final release requires a bump.
- `npm pack --dry-run` from the main checkout lists **50 files** against a published tarball of **24** — C9 confirmed, and worse here than in any sibling, because the extras include a complete nested copy of the package under `worktrees/`.
- This plan consumes **phases 11–13**. It is the last participant; no further phase numbers are allocated by this plan-group.

**Hard cross-plan dependency:** `liq-projects` **phase 1** (`dev-core-package-foundation`, both tasks) must land before this plan's phase 12 task 002 can start. That phase scaffolds the dev-core package itself — `package.json` metadata, the Make/Babel/Rollup/Jest toolchain, `src/index.mjs`'s aggregator, and the committed `docs/dev-core-consolidation-contract.md`. **This plan does not re-scaffold any of it.** All of phase 11 and phase 12 task 001 execute wholly inside `plugable-projects-audit` and have no such dependency — **they are unblocked today.**

Cross-repository execution: phase 12 tasks 002 and 003 execute in the `sdlcforge/dev-core` checkout; all of phases 11 and 13, plus phase 12 task 001, execute in `plugable-projects-audit`. Each task document names its executing repository in its `## Purpose and scope`. This mirrors the precedent of core-server's completed `bun-conversion` task `003`, whose commit landed in the `comply-defaults` repository on its own `task/…` branch.

### Open items for the manager (do not block execution)

1. **C17 must reach the dev-core contract document, and ideally `liq-projects` phase 1 task 001, before phase 12 task 002 runs.** D3's drop list ("the donor's root `src/index.*`") is correct for three donors and destructive for this one. One sentence in `docs/dev-core-consolidation-contract.md` — *"a donor whose root entry is `src/index.mjs` collides with dev-core's aggregator; resolve in dev-core's favor, never `git rm`"* — removes the trap for good. Phase 12 task 002 carries a defensive check regardless.
2. **C13's `file:`-spec rule belongs in the contract's dependency-union section.** D4 step 3 says "on an overlap, take the higher range". A `file:` spec has no range to compare, and unioning one into a publishable package is always wrong. One sentence, same document.
3. **Is `npm-check-plus ^1.0.0-alpha.5` an acceptable new dependency for dev-core?** It is the only dependency this absorption adds, it is a `liquid-labs`-adjacent alpha package, and dev-core inherits it unavoidably if these four endpoints migrate. Recorded as a decision because it is the only place this slice widens dev-core's dependency surface; the plan assumes yes.
4. **The four inherited defects in A8 items 1–4 are user-visible today** in `sdlcforge/core-cli/docs/projects.md` (a spurious parameter, a suppressed parameter description, and four prose typos). D11 forbids fixing them here because they change the generated API spec. A follow-up to fix them in dev-core after the wave is recommended; it is cheap and entirely local.
5. **`liq-work`'s F1/`SlowBuffer` open item is unaffected by this slice but not resolved by it.** This donor is green (C15), so it adds no evidence either way; the plan-group-level decision that slice asked for is still outstanding, and phase 12 task 002 will meet the inherited `liq-projects` failures in dev-core.

## Overview

Three phases, strictly sequential at the phase level. Within phases, parallel-eligible task groups are called out.

### Phase 11 — projects-audit Dependency Remediation (executes in `plugable-projects-audit`)

One prerequisite that must land before any relocation, and that leaves the package strictly better as a standalone artifact. It depends on nothing in any other slice, so **this phase is unblocked today.**

1. **[001 — Restore Registry Dependency Range](./phase-11-projects-audit-dependency-remediation/001-restore-registry-dependency-range.md)** (tier `sonnet-med`) — replace `"@liquid-labs/http-smart-response": "file:.yalc/@liquid-labs/http-smart-response"` with `"^1.0.0-alpha.6"`, regenerate `package-lock.json` so the stale `"link": true` entry is gone, and prove the package is green **from a fresh clone** with no `.yalc/` present. Without this, every subsequent task in this slice runs `make test` in a worktree where it cannot pass.

**Dependencies:** none. Unblocked today.

**Exit state:** `plugable-projects-audit` installs, builds, lints, and tests green from a fresh clone; no `file:` spec and no `.yalc` reference remains in `package.json` or `package-lock.json`; the built bundle still exports the identical four routes.

### Phase 12 — projects-audit Migration Into dev-core (task 001 in `plugable-projects-audit`; tasks 002–003 in `sdlcforge/dev-core`)

Relocates the tree into the dev-core layout, absorbs it with history preserved, and specifies the consumer swap.

1. **[001 — Restructure Src Into Dev-Core Layout](./phase-12-projects-audit-migration/001-restructure-src-into-dev-core-layout.md)** (tier `sonnet-high`) — `git mv` all nine surviving source files to their final dev-core-relative paths (`src/projects-audit/handlers/…`, with `handlers/projects/` flattening to `handlers/`), add `src/projects-audit/index.mjs`, reduce the root `src/index.mjs` to a thin re-export, delete the trivial `src/handlers/index.mjs`, and keep `make build`/`make test`/`make lint` green at the 1-suite / 1-test baseline. **No import rewriting is needed anywhere** — verified across all 11 files.
2. **[002 — Absorb Projects-Audit Into Dev-Core](./phase-12-projects-audit-migration/002-absorb-projects-audit-into-dev-core.md)** (tier `sonnet-high`) — in `dev-core`: unrelated-histories merge of the restructured donor, root-level conflicts resolved in dev-core's favor **with `src/index.mjs` handled as the C17 special case and a hard post-condition proving the aggregator survived**, the donor `plan/` directory dropped per C4, exactly one dependency added and **no `file:` spec carried in** per C13, the four handlers spread into the aggregator array with **no** setup entry, the audit route surface and inherited defects documented for the first time, and route-parity, dependency, history-preservation, and no-new-test-failure checks green.
3. **[003 — Extend Consumer Migration Handoff](./phase-12-projects-audit-migration/003-extend-consumer-migration-handoff.md)** (tier `sonnet-med`) — in `dev-core`: extend `docs/consumer-migration.md` with this donor's section — the registry dependency entry to remove, the `explicitPlugins` entry to swap, the atomicity requirement with **both** exact error strings (C1's duplicate-registration throws and C14's unknown-path-var throw), the four documentation touch-points, the endpoint-provenance change, and the two edits that **remove** work from core-server (`REQUIRED_YALC_PACKAGES` and the `AGENTS.md` yalc snapshot). Executing those edits belongs to `core-server-domain-consolidation`, not to this plan.

**Dependencies:** 001 depends on phase 11. 002 depends on 001 **and on `liq-projects` phase 1** (both tasks). 003 depends only on `liq-projects` phase 1 task 001, so **{002, 003} are parallel-eligible** — with the caveat that both operate in the dev-core checkout and so need separate task worktrees, and that 003 is written to create-or-extend so it does not hard-depend on any sibling's handoff task having created the file.

**Exit state:** dev-core serves all four audit endpoints from `src/projects-audit/`, its aggregator demonstrably still carries every other landed submodule, and the consumer swap is fully specified.

### Phase 13 — Retire plugable-projects-audit (executes in `plugable-projects-audit`)

Follows D10 and the shape the three sibling slices established: verify first, then documentation and metadata, then the publish attempt. No code deletion, no shim.

1. **[001 — Verify Dev-Core Absorption](./phase-13-retire-plugable-projects-audit/001-verify-dev-core-absorption.md)** (tier `sonnet-med`) — read-only gate across both repositories: every relocated file present under dev-core's `src/projects-audit/`, all 4 routes registered with identical `path` arrays, methods, `parameters`, and `help`; dev-core's aggregator still importing every landed submodule and still exporting a composite `setup` (the C17 gate); the dependency union correct with no `file:` spec anywhere; no `plan/` artifact in dev-core; and history preserved. Halts the phase on any gap; edits nothing.
2. **[002 — Author README As Superseded Notice](./phase-13-retire-plugable-projects-audit/002-author-readme-superseded-notice.md)** (tier `sonnet-med`) — creates `README.md`, which this package has never had: superseded banner naming `@sdlcforge/dev-core`, an accurate short statement of what the package did and what four endpoints it served (there is no prior description to inherit — `description` is `""`), migration instructions, the single-npm-dependent consumer inventory, and disclosure of the inherited defects.
3. **[003 — Mark Package Deprecated, Bump Version, And Fix Packaging](./phase-13-retire-plugable-projects-audit/003-mark-package-deprecated-and-bump-version.md)** (tier `sonnet-med`) — `package.json` only: deprecation-bearing `description` (currently `""`), version `1.0.0-alpha.3` (the current version equals npm's `latest`), and the C9 `files` allowlist derived from the actual published tarball, taking the pack list from **50 files to 24–25**.
4. **[004 — Publish Final And Deprecate On Npm](./phase-13-retire-plugable-projects-audit/004-publish-final-and-deprecate-on-npm.md)** (tier `sonnet-low`) — verify the tarball is clean, then attempt `npm publish` and `npm deprecate`, expect the permission classifier to block both, and record the exact commands for the user. Repository archival is deliberately not attempted and is recorded as a user decision.

**Dependencies:** 001 gates the phase. **{002, 003} are parallel-eligible** (disjoint files). 004 runs last, after both have merged, so the published tarball carries both changes.

**Exit state:** `plugable-projects-audit` is a labelled, deprecated final release with a clean tarball; archival awaits a user decision; core-server's repoint remains owned by its own plan-group.

### Parallelism summary

- Sequential: phase 11 → phase 12 → phase 13.
- Cross-plan gate: `liq-projects` phase 1 → this plan's phase 12 task 002. **All of phase 11 and phase 12 task 001 are unblocked today.**
- Parallel-eligible groups: `{12-002, 12-003}`, `{13-002, 13-003}`.
- Suggested dispatch order: `11-001`, `12-001`, `{12-002, 12-003}`, `13-001`, `{13-002, 13-003}`, `13-004`.
- Across the plan-group: this slice's absorption is independent of `liq-orgs`'s and `liq-work`'s (D4 — one prefix per donor, no shared content paths), so the three may land in any order once `liq-projects` phase 1 has landed. They must not run *simultaneously* against the dev-core checkout even though their content cannot conflict.
- **One ordering preference, not a hard gate (C14):** if `src/projects/` has already landed in dev-core when `12-002` runs, the absorb can additionally verify the four routes register without throwing. If it has not, that check is unavailable — `pathToRe` throws on the unregistered `projectName` path var — and the route-parity check must read `path` arrays off the built bundle instead, which the task specifies as the primary method precisely so this is never a blocker.

### Reference notes

- [plugable-projects-audit source inventory](./notes/plugable-projects-audit-source-inventory.md) — package facts, the 4-route table, the exact path mapping, the dependency union, the measured baseline, the full consumer inventory, the inherited defects, and corrections C12–C17.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — decisions D1–D11, the shared foundation for all five participants (ephemeral plan note).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the durable, committed restatement of D1–D11, authored by `liq-projects` phase 1 task 001. Once it exists, it is the authoritative reference for task agents; prefer it over the plan note above.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-05-liq-orgs-migration/002-absorb-orgs-into-dev-core.md` and `/Users/zane/playground/liquid-labs/liq-work/worktrees/plan/dev-core-consolidation/plan/phase-08-liq-work-migration/002-absorb-work-into-dev-core.md` — the second and third runs of the absorption recipe; read their status notes before running the fourth.
