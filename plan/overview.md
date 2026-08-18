# Plan Overview — dev-core-consolidation (liq-orgs slice)

## Purpose and scope

This plan is `liq-orgs`'s own contribution to the federated `dev-core-consolidation` plan-group — Wave 2 ("Plugin Consolidation — Framework and Dev-Core") of the **SDLCForge Platform Modernization** wave plan, whose lead project is `core-server` and whose wave-plan slug is `sdlcforge-modernization`. The plan-group merges four functional repositories — `liq-projects`, `liq-work`, `liq-orgs`, and `plugable-projects-audit` — into a single new `@sdlcforge/dev-core` package, and retires `liq-projects-lib` once its one surviving real usage is absorbed elsewhere. All five participants share the plan slug `dev-core-consolidation`.

`liq-projects` is the lead slice and planned first. It established the shared foundation — decisions **D1–D11** in its `plan/notes/dev-core-target-shape.md` — covering the target package identity, the one-submodule-directory-per-donor layout, the plugin/`setup`/`app.ext` contracts, the history-preserving absorption mechanic, the toolchain, and the donor-retirement policy. **This plan follows that foundation rather than re-deciding any of it**, and consumes phases **5 and 6**.

`liq-orgs` is the smallest of the four donors: 13 source files, 5 handlers, one test suite. Its job in the running server is to discover "organization" projects in the playground, build an `Organization` model for each, publish them at `app.ext._liqOrgs`, and expose a small `/orgs` route surface for listing orgs and reading/writing their settings. The dispatch brief's presumption — that `liq-orgs` manages an "organization" concept in the same family as `liq-projects`'s "project" concept — is **confirmed**, with one important refinement: an org is not an independent entity but a *classification of a project*. `setup` scans the projects `liq-projects` already discovered and promotes those whose scanned `package.json` carries `liq.packageType === 'org'`. liq-orgs is therefore strictly downstream of liq-projects at runtime, and reaches it only through `app.ext._liqProjects` — never by import.

Full ground-truth detail, including everything below, is in [liq-orgs source inventory](./notes/liq-orgs-source-inventory.md).

### What must change

- `liq-orgs`'s `src/` tree relocates in place to its final dev-core-relative path (`src/orgs/…`), staying green and publishable throughout.
- That tree is absorbed into `@sdlcforge/dev-core` by an unrelated-histories merge, so `git log --follow` still reaches liq-orgs's original commits afterward, with its 4 runtime dependencies unioned in and the `orgs` submodule wired into dev-core's aggregator second in the composite `setup` order.
- dev-core's consumer-migration handoff gains the `liq-orgs`-specific edits `core-server` must make, and dev-core's documentation gains the `/orgs` route surface and the `app.ext._liqOrgs` contract — which, uniquely among the donors, has no prior documentation anywhere to port from.
- `liq-orgs` ends as a final, clearly-labelled superseded release: a README **authored from scratch** (it has none), a deprecation-bearing description, a version bump, and publish/deprecate attempted and handed to the user if blocked.

### What must not change

- **The HTTP surface.** All 5 handlers keep their exact `path` arrays, methods, parameters, and `help` text — including `create`'s unusual `orgs/create/:newOrgKey` shape, which is *not* normalized to match liq-projects's convention.
- **The `app.ext` contracts.** `app.ext._liqOrgs` keeps its exact name and shape — both `orgs` (read by `liq-controls` in three places) and `orgSetupMethods` (written by `liq-policy`) — and `app.ext.setupMethods` keeps being used the same way, per D7.
- **The three path vars.** `orgKey`, `newOrgKey`, and `parameterKey` keep their names and validation regexes; `orgKey` in particular is depended on by handler paths in `liq-controls` and `plugable-express`.
- **Behavior.** No refactoring, no dependency upgrades, no toolchain migration, and specifically **no fix for the four dead handlers** (see below). Those are separate decisions, deliberately not smuggled into a consolidation.

### The most consequential finding: this package's endpoints do not work

Every one of liq-orgs's five endpoints is non-functional today, for two independent reasons, both verified from source:

1. **Four handlers read a `model` argument that no longer exists.** `list`, `parameters-detail`, `parameters-list`, and `parameters-set` reach `model.orgs` — directly, or via `getOrgFromKey({ model, … })` from `@liquid-labs/liq-handlers-lib`. But `plugable-express` stopped passing `model` for plugin handlers: `load-plugins.js:36` calls `registerHandlers(app, { npmName, handlers, reporter, setupData, cache })` with no `model`, so each handler receives `model === undefined` and throws `TypeError: Cannot read properties of undefined (reading 'orgs')` on its first request. Registration succeeds, so nothing is visible at startup or in the API spec. The org data itself is fine — `setup` publishes it at `app.ext._liqOrgs.orgs`, where `liq-controls` reads it correctly; only these handlers look in the retired `liq-core`-era location.
2. **`create` never sends a response.** Its `func` creates a directory and falls off the end at a bare `// TODO`, so `POST /orgs/create/:newOrgKey` hangs until the client times out.

This plan **migrates the code as-is** and does not fix it, because D11 forbids behavior changes and because the plausible fix would also require changing `getOrgFromKey`'s signature in `@liquid-labs/liq-handlers-lib`, a package outside this plan-group. It is recorded here, in the source inventory, in the task documents' validation sections, and in the report to the manager, because consolidation moves known-broken endpoints into a brand-new package under a new name, and that deserves an explicit decision rather than silent inheritance. **See "Open items for the manager" below.**

The practical consequence for execution is concrete: since the only test suite covers one pure utility module (37 tests over `settings.mjs`, everything else at 0% coverage), **the test suite cannot detect a relocation regression in any migrated behavior**. Validation in this plan therefore leans on static checks — file census, route-array equality, exported-shape assertions, `app.ext` key assertions against a stub app — and says so in each task.

### Success criteria

1. dev-core carries liq-orgs's complete tree under `src/orgs/`, with the 1-suite / 37-test baseline reproduced and all 5 routes present with byte-identical `path` arrays.
2. `git log --follow` on a relocated file inside dev-core reaches its pre-merge liq-orgs history.
3. dev-core's composite `setup` runs the `orgs` submodule setup second, registers `orgKey`/`newOrgKey`, and pushes exactly the three `app.ext.setupMethods` entries in their original order with their original `deps` markers.
4. dev-core's consumer-migration handoff names every exact edit `core-server` must make for liq-orgs, including the atomicity requirement and the exact error strings a non-atomic swap produces.
5. dev-core documents the `/orgs` route surface and the `app.ext._liqOrgs` contract — the first documentation this subsystem has ever had.
6. `liq-orgs` is labelled superseded and deprecated, with an honest consumer inventory (three npm dependents, not one), and archival left as an explicit user decision.

### Where this slice's source reading corrects the shared foundation

Three findings contradict or extend `dev-core-target-shape.md`. **None changes any decision**; all change the stated reasoning, and reasoning that is wrong in a contract document will mislead a later task agent diagnosing a failure. Each is carried as an explicit requirement in the tasks below and flagged to the manager.

- **C1 — Duplicate plugin registration throws; it does not silently shadow.** D10 argues against a re-export shim on the grounds that Express would "silently shadow" a duplicate route. In fact `plugable-express` fails loudly, twice over: `registerPathVar` throws `Path variable '<name>' is already registered.` (`path-var-registry.mjs:28-34`), and `processCommandPath` throws `Non-unique command path: <path>` (`register-handlers.js:130-132`). The path-var throw fires first, because `loadPlugin` runs `setup` eagerly while deferring handler registration. D10's conclusion — no shim, atomic swap — is unchanged and strengthened, but the observable failure is a startup crash, and the handoff must name the error strings so it is recognizable on sight.
- **C2 — D10's "the only npm dependent of any donor is core-server" does not hold for liq-orgs.** `liq-roles` and `liq-test-lib` also declare it in `package.json`. Both are dormant (`liq-test-lib` is already broken independently, importing the retired `@liquid-labs/liq-core`), neither is loaded by the live server, and neither is a wave participant — so no plan change follows, but the superseded notice must inventory them honestly rather than inherit liq-projects's wording.
- **C3 — D6's path-var set omits `parameterKey`, and its ordering rationale overstates the coupling.** `parameterKey` is registered from `parameters-detail.mjs`'s handler `func` rather than from `setup`, so the merged path-var surface is not fully determined by reading the four `setup` functions (verified: no collision, so D6's conclusion holds). And liq-orgs's `setup` does *not* read `app.ext._liqProjects` — that read happens inside the deferred `load orgs` setup method, which the server's `DependencyRunner` runs long after every plugin's `setup` has returned. Keeping `orgs` second is correct and should stand, but a passing composite-setup smoke test does **not** exercise the `_liqProjects` dependency.

## Current status

Plan created; no phase has started. Starting phase: **phase 5 — liq-orgs Migration**.

Pre-conditions verified at plan-authoring time:

- `liq-orgs` is green at `main` (`eebf32f`), measured by running the toolchain rather than reading a stale report (`/qa` is gitignored here, so no committed QA reports exist): `make test` → 1 suite / 37 tests passing; `make lint` → clean; `make build` → `dist/liq-orgs.js` produced from `src/index.js`.
- **The `liq-orgs` working tree is dirty in a way that must be resolved before phase 5 task 001 commits anything.** `package.json` carries an uncommitted addition of `"@liquid-labs/playground-monitor": "file:.yalc/@liquid-labs/playground-monitor"` — an unused dependency (nothing in `src/` imports it) pointing at a gitignored `.yalc/` directory, i.e. the residue of a local `yalc add`. The plan's recommendation is to revert it; task 001 treats it as an explicit decision point rather than reverting a user's working-tree change unasked.
- `sdlcforge/dev-core` exists with one commit (`07d7f0e`) and one tracked file (`package.json` at `@sdlcforge/dev-core@1.0.0-alpha.0`). Nothing in this plan creates a repository.
- The toolchain divergence between liq-orgs (`catalyst-resource-*`, builder v1.0.0-alpha.0) and dev-core (`sdlc-resource-*`, builder v1.0.0-alpha.5) was measured and is **cosmetic**: the ESLint configs are byte-identical, the Jest configs differ only in an override key liq-orgs does not use, and the `make/*.mk` files differ only by a `CATALYST_`→`SDLC_` variable-prefix rename. No migration work, no risk.
- **No other donor imports `liq-orgs`** — verified across `liq-projects/src`, `liq-work/src`, `liq-projects-lib/src`, and `plugable-projects-audit/src` plus their `package.json` files. So this slice creates no inter-donor ordering constraint beyond the `app.ext._liqProjects` read D6 already covers.
- `core-server`'s consumer surface for liq-orgs is **smaller** than liq-projects's: a registry dependency range (`"@liquid-labs/liq-orgs": "^1.0.0-alpha.6"`, *not* a `file:.yalc/` link), one `explicitPlugins` entry (`src/lib/app-init.mjs:37`), and two documentation files. Its test fixtures name only `liq-controls`, `liq-credentials`, and `liq-projects` — liq-orgs appears in no test fixture.
- This plan consumes **phases 5–6**; the next participant planned in this plan-group starts at phase 7.

**Hard cross-plan dependency:** `liq-projects` **phase 1** (`dev-core-package-foundation`) must land before this plan's phase 5 task 002 can start. That phase scaffolds the dev-core package itself — `package.json` metadata, the Make/Babel/Rollup/Jest toolchain, `src/index.mjs`'s aggregator with its submodule-registration and setup-ordering shape, and the committed `docs/dev-core-consolidation-contract.md`. **This plan does not re-scaffold any of it.** Phase 5 task 001 (restructure, in `liq-orgs`) has no such dependency and may run at any time.

Cross-repository execution: phase 5 tasks 002 and 003 execute in the `sdlcforge/dev-core` checkout; phase 5 task 001 and all of phase 6 execute in `liq-orgs`. Each task document names its executing repository in its `## Purpose and scope`.

### Open items for the manager (do not block execution)

1. **Should dev-core inherit four dead handlers and a hanging stub?** This plan says yes-for-now (migrate as-is per D11), and recommends a separate follow-up to either fix `model` → `app.ext._liqOrgs` — which also requires changing `getOrgFromKey` in `@liquid-labs/liq-handlers-lib`, and resolving that `Organization` defines neither the `save()` nor the `key` that the handlers call — or to remove the endpoints outright. Fixing it inside this consolidation would violate D11 and would couple the merge to an out-of-plan-group package. A user decision is wanted before Wave 3.
2. **C1 belongs in dev-core's contract document.** `docs/dev-core-consolidation-contract.md` is authored by `liq-projects` phase 1 task 001, which has not run yet. The cleanest fix is for that task to state the true mechanism from the outset. This plan carries a defensive correction in phase 5 task 002 in case it does not.
3. **The uncommitted `package.json` change** described under "Current status" is a user working-tree state, not a plan artifact. Confirming the revert is a user call.

## Overview

Two phases, strictly sequential at the phase level. Within phases, parallel-eligible task groups are called out.

### Phase 5 — liq-orgs Migration (task 001 in `liq-orgs`; tasks 002–003 in `sdlcforge/dev-core`)

Relocates liq-orgs into the dev-core layout, absorbs it with history preserved, and specifies the consumer swap.

1. **[001 — Restructure Src Into Dev-Core Layout](./phase-05-liq-orgs-migration/001-restructure-src-into-dev-core-layout.md)** (tier `sonnet-high`) — in `liq-orgs`: resolve the dirty working tree, `git mv` all 12 surviving source files to their final dev-core-relative paths (`src/orgs/…`), add `src/orgs/index.mjs` exporting `{ handlers, setup }`, reduce the root `src/index.js` to a thin re-export so the package stays green and publishable, delete the trivial `src/handlers/index.js`, and keep `make build`/`make test`/`make lint` green at the 1-suite / 37-test baseline. No import rewriting is needed anywhere.
2. **[002 — Absorb Orgs Into Dev-Core](./phase-05-liq-orgs-migration/002-absorb-orgs-into-dev-core.md)** (tier `sonnet-high`) — in `dev-core`: unrelated-histories merge of the restructured liq-orgs, root-level conflicts resolved in dev-core's favor, liq-orgs's 4 runtime dependencies unioned in, `src/index.mjs` wired to the `orgs` submodule second in the setup order, the `/orgs` route surface and `app.ext._liqOrgs` contract documented for the first time, the C1 correction applied to the contract doc if still needed, and the full build/test/lint suite plus route-parity, path-var, setup-shape, and history-preservation checks green.
3. **[003 — Extend Consumer Migration Handoff](./phase-05-liq-orgs-migration/003-extend-consumer-migration-handoff.md)** (tier `sonnet-med`) — in `dev-core`: extend `docs/consumer-migration.md` with the liq-orgs section — the registry dependency entry to remove, the `explicitPlugins` entry to swap, the atomicity requirement with the **exact error strings** a non-atomic swap produces, the endpoint-provenance change, the `app.ext._liqOrgs` preservation guarantee that keeps `liq-controls` unaffected, and the honest three-dependent inventory. Executing those edits belongs to `core-server-domain-consolidation`, not to this plan.

**Dependencies:** 001 depends on nothing in this plan and may start immediately. 002 depends on 001 **and on `liq-projects` phase 1** (both tasks). 003 depends only on `liq-projects` phase 1 task 001, so **{002, 003} are parallel-eligible** — with the caveat that both operate in the dev-core checkout, so they need separate task worktrees rather than simultaneous edits to one tree, and 003 should be sequenced after `liq-projects` phase 2 task 003 has created `docs/consumer-migration.md` if that ordering is convenient (003 is written to create-or-extend, so it does not hard-depend on it).

**Exit state:** dev-core serves the complete `/orgs` surface from `src/orgs/`, publishes `app.ext._liqOrgs` unchanged, and documents both; liq-orgs's own tree is a relocated, still-green mirror; the consumer swap is fully specified.

### Phase 6 — Retire liq-orgs (executes in `liq-orgs`)

Follows D10 and the shape `liq-projects` phase 3 established: verify first, then documentation and metadata, then the publish attempt. No code deletion, no shim.

1. **[001 — Verify Dev-Core Absorption](./phase-06-retire-liq-orgs/001-verify-dev-core-absorption.md)** (tier `sonnet-med`) — read-only gate across both repositories: every relocated file present under dev-core's `src/orgs/`, all 5 routes registered with identical `path` arrays, all three path vars registered, the three `setupMethods` entries pushed in order with their `deps` markers intact, all 4 dependencies present, dev-core's test/lint/build green, history preserved. Halts the phase on any gap; edits nothing.
2. **[002 — Author README As Superseded Notice](./phase-06-retire-liq-orgs/002-author-readme-superseded-notice.md)** (tier `sonnet-med`) — creates `README.md`, which this package has never had: superseded banner naming `@sdlcforge/dev-core`, a brief accurate statement of what the package did (there is no prior description to inherit), migration instructions, the honest three-dependent consumer inventory per C2, and the known-defect disclosure.
3. **[003 — Mark Package Deprecated And Bump Version](./phase-06-retire-liq-orgs/003-mark-package-deprecated-and-bump-version.md)** (tier `sonnet-low`) — `package.json` only: deprecation-bearing `description` (currently `""`), version `1.0.0-alpha.8`, `make qa` green.
4. **[004 — Publish Final And Deprecate On Npm](./phase-06-retire-liq-orgs/004-publish-final-and-deprecate-on-npm.md)** (tier `sonnet-low`) — attempt `npm publish` and `npm deprecate`, expect the permission classifier to block both, and record the exact commands for the user. Repository archival is deliberately not attempted and is recorded as a user decision.

**Dependencies:** 001 gates the phase. **{002, 003} are parallel-eligible** (disjoint files). 004 runs last, after both have merged, so the published tarball carries both changes.

**Exit state:** `liq-orgs` is a labelled, deprecated final release; archival awaits a user decision; core-server's repoint remains owned by its own plan-group.

### Parallelism summary

- Sequential: phase 5 → phase 6.
- Cross-plan gate: `liq-projects` phase 1 → this plan's phase 5 task 002. Phase 5 task 001 is unblocked today.
- Parallel-eligible groups: `{phase 5 task 002, phase 5 task 003}` and `{phase 6 task 002, phase 6 task 003}`.
- Suggested dispatch order: `5-001`, `{5-002, 5-003}`, `6-001`, `{6-002, 6-003}`, `6-004`.
- Across the plan-group: this slice's absorption is independent of `liq-work`'s and `plugable-projects-audit`'s (D4 — one prefix per donor, no shared paths), so the three may land in any order once `liq-projects` phase 1 has landed. They should not run *simultaneously* against the dev-core checkout even though their content cannot conflict.

### Reference notes

- [liq-orgs source inventory](./notes/liq-orgs-source-inventory.md) — package facts, route surface, exact path mapping, dependency union, measured validation baseline, full consumer inventory, the three corrections to the shared foundation, and the surfaced pre-existing defects.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — decisions D1–D11, the shared foundation for all five participants (ephemeral plan note).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the durable, committed restatement of D1–D11, authored by `liq-projects` phase 1 task 001. Once it exists, it is the authoritative reference for task agents; prefer it over the plan note above.
