# Blocker Re-Verification (2026-09-01)

## Purpose and scope

Re-checks the two decisions that blocked `plan/TODO.yaml`'s task breakdown as of the 2026-08-26 grounding pass — [upstream-framework-readiness.md](./upstream-framework-readiness.md) and [manifest-ownership-boundary.md](./manifest-ownership-boundary.md) — against real, current state. Both are stale. Neither blocks task breakdown any longer, though one leaves a mechanical prerequisite (a local dependency refresh) that Phase 1's own opening task already exists to perform.

## Blocker 1 — framework prerequisite

`@liquid-labs/plugable-express`'s compile-time-manifest implementation is **complete, merged, tagged `v1.0.0-alpha.59`, and published to the public npm registry** (`npm view @liquid-labs/plugable-express version` → `1.0.0-alpha.59`; `npm view ... versions` lists it as the newest). All 21 upstream tasks across 5 phases are `[x]` in its `plan/plan-summary-compile-time-manifest.md`. `validatePluginSet`, `verifyHostDeclaration`, `FRAMEWORK_MANIFEST`, the manifest reader, the graph engine, and the `plugable-express-validate` `bin` (`dist/plugable-express-validate.js`, `package.json` `bin` field present) all exist in the real repo at `/Users/zane/playground/liquid-labs/plugable-express` and are built.

**But none of that has reached `core-server`'s local link yet.** `core-server`'s `.yalc/@liquid-labs/plugable-express/` (both the main checkout's and the global yalc store's) is still `1.0.0-alpha.58`, last touched 2026-08-24 — zero occurrences of `validatePluginSet`/`plugable-express-validate`/`plugableManifestVersion`, exactly as the 2026-08-26 note found. No `yalc push` has run from `plugable-express` since it shipped alpha.59. `core-server`'s `node_modules/@liquid-labs/plugable-express` is a symlink into that same stale `.yalc/` snapshot.

**A second, newly-relevant dependency has the identical problem.** Since the 2026-08-26 grounding pass, the wave's `dev-core-consolidation` plan-group finished: `core-server`'s real `src/lib/app-init.mjs` `explicitPlugins` array no longer lists `liq-orgs`/`liq-projects`/`liq-work`/`plugable-projects-audit` — it lists a single `@sdlcforge/dev-core` entry, yalc-linked (`"@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core"`). A further plan-group, `dev-core-plugin-manifest`, then authored and merged dev-core's own compile-time manifest today (2026-09-01) — see Blocker 2 below. `core-server`'s `.yalc/@sdlcforge/dev-core/` snapshot, however, is dated 2026-08-27 15:10, **before** that manifest work merged, and its `package.json` carries no `"plugable"` block. Both yalc-linked dependencies this plan needs are stale, not just the one the original note flagged.

### Concrete command sequence for a future task (not run here)

```bash
# 1. plugable-express: push the already-built alpha.59 snapshot to the yalc store and every
#    linked consumer (core-server, dev-core). `yalc push`'s `prepack` runs `make build` first.
cd /Users/zane/playground/liquid-labs/plugable-express
yalc push

# 2. dev-core: push its already-authored plugable-manifest snapshot the same way.
cd /Users/zane/playground/sdlcforge/dev-core
yalc push

# 3. core-server: full lockfile-refreshing reinstall — mandatory, not a bare `bun install`.
#    Under Bun, a bare `bun install` re-copies a file:-linked package's content but does not
#    re-resolve its dependency list once bun.lock holds a resolved entry for it.
cd /Users/zane/playground/sdlcforge/core-server   # or a task worktree provisioned via
                                                    # create-worktree.sh --no-install-deps
                                                    # + scripts/provision-local-deps.sh --refresh-lock
rm -f bun.lock && bun install
# equivalently: ./scripts/provision-local-deps.sh --refresh-lock

# 4. Verify uptake rather than assume it (per build-wiring-and-dependency-refresh.md's own
#    "insist on step 3" guidance):
test -x node_modules/.bin/plugable-express-validate && echo "CLI present"
node -e "const m = require('@liquid-labs/plugable-express'); \
  console.log('validatePluginSet' in m, 'verifyHostDeclaration' in m)"
grep -q '"plugable"' node_modules/@sdlcforge/dev-core/package.json && echo "dev-core manifest present"
```

`scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` list (`plugable-express`, `@sdlcforge/dev-core`) is **already current** in the main checkout — it was updated as part of the dev-core-consolidation landing, after `build-wiring-and-dependency-refresh.md` was written. No script edit is needed, only the push-and-reinstall sequence above.

**A newly-available alternative for `plugable-express` specifically** (not for `dev-core`, which is unpublished — `npm view @sdlcforge/dev-core` returns `E404`): since alpha.59 is now live on the public registry, `core-server` could instead bump its `package.json` `devDependency`/`dependency` range and drop the `file:.yalc/...` spec for `plugable-express`, letting a plain `bun install` resolve it from npm. This changes the project's stated yalc-only convention (`overview.md`'s hard constraint: "`@liquid-labs/plugable-express` reaches `core-server` through yalc, not npm") and is noted here as an option, not a recommendation — the yalc-push sequence above is the minimal-deviation path and is what this note recommends Phase 1's prerequisite-verification task actually run.

**Verdict: still-blocking locally, but mechanically — not blocked on any further upstream work.** The upstream framework is done; only a local push-and-reinstall (Blocker 1) remains, and `overview.md`'s Phase 1 already opens with exactly the prerequisite-verification task this implies. No plan restructuring is needed here, only for that task's own steps to reflect the two-package (plugable-express + dev-core) refresh rather than one.

## Blocker 2 — Phase 3 scope / Q3

### The ownership-boundary problem

[manifest-ownership-boundary.md](./manifest-ownership-boundary.md)'s finding — that `liq-projects` requires `appExt:credentialsDB @ load` and `liq-work` requires `appExt:serverConfigRoot @ load`, both third-party, with no host-sited affordance in the upstream contract for declaring a third party's `requires` on its behalf — **is resolved, but not by any of the four candidate options (A-D) it lays out.** It is resolved because the packages that carried those two requirements no longer exist as separate third-party plugins in `core-server`'s real composition.

The wave's `dev-core-consolidation` plan-group (sibling to this one, tracked separately, already complete) merged `liq-orgs`, `liq-projects`, `liq-work`, and `plugable-projects-audit` into one new package, `@sdlcforge/dev-core`. `core-server`'s real `explicitPlugins` array confirms this: it now reads `['@liquid-labs/sdlc-projects-badges-coverage', '@liquid-labs/sdlc-projects-badges-github-workflows', '@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd', '@liquid-labs/sdlc-projects-workflow-local-node-build', '@sdlcforge/dev-core']` — five entries, not eight, and none of the four absorbed names appear.

A further plan-group, `dev-core-plugin-manifest`, ran against the new `@sdlcforge/dev-core` package and merged today, 2026-09-01 (`/Users/zane/playground/sdlcforge/dev-core/plan/plan-summary-dev-core-plugin-manifest.md`). It authored dev-core's own `package.json` `"plugable"` block, in the `components:` form, one component per absorbed submodule (`projects`, `orgs`, `work`, `projects-audit`). Read directly from `/Users/zane/playground/sdlcforge/dev-core/package.json`, it declares exactly the two previously-missing requiring edges:

- `projects` component: `requires: [{ capability: 'appExt:credentialsDB', phase: 'load', reason: '...setupCredentials()...' }, ...]` — closes the GITHUB_API-ordering gap's requiring side.
- `work` component: `requires: [{ capability: 'appExt:serverConfigRoot', phase: 'load', reason: '...WORK_DB_PATH...' }, ...]` — closes `ynGa`'s third-party requiring side.

Both use the correct, framework-canonical capability names (confirmed against `plugable-express`'s own schema/migration docs) and both use `credential:GITHUB_API` (not an invented `credentialType:GITHUB_API` — the dev-core plan's own task 003 log records catching and correcting that exact naming mistake against the framework's canonical spelling).

**This closes both edges without any cross-repo work from `core-server`.** `@sdlcforge/dev-core` is one of `core-server`'s `explicitPlugins` entries, and the framework's static plugin-set resolver reads any `explicitPlugins`-listed package's own `package.json` `"plugable"` block the same way it reads any other manifested plugin — that is the ordinary, general mechanism, not a special case. Once `core-server`'s own Phase 1 (host block, already true in real source) and Phase 2 (`src/credentials/` providing `appExt:credentialsDB @ load`, already planned) land, both requirements resolve to `satisfied`: `appExt:serverConfigRoot` against the framework's own intrinsic manifest (`framework` phase, ships with the framework itself), and `appExt:credentialsDB` against `src/credentials/`'s builtin-tier provide, with a provable `satisfied-by-source-order` verdict (builtins are load source #1, ahead of the Server-Package-Root source `@sdlcforge/dev-core` loads from).

**Practical dependency:** this is only checkable once `core-server`'s local `dev-core` yalc snapshot is refreshed — Blocker 1's second finding above. The manifest exists in dev-core's real source, not yet in core-server's local link.

**Consequence for Phase 3's task breakdown.** [phases/third-party-coupling-coverage.md](../phases/third-party-coupling-coverage.md) currently frames the phase around choosing between options A-D. That framing is now obsolete for the two named bugs: option B ("manifest the third-party plugins in their own repositories") has effectively already happened, under a different, already-completed plan-group, for the *structurally correct* reason (the code itself moved into a package that could manifest itself) rather than by expanding this plan-group's scope into someone else's repository. Phase 3 should be re-scoped from a **decision phase** to a **verification phase**: refresh dependencies (Blocker 1), run the gate, and confirm both previously-open findings now report `satisfied`/`satisfied-by-source-order` rather than `unsatisfied` — plus assert this as the regression case Phase 4 was always going to want anyway. `liq-orgs` and `plugable-projects-audit` (dev-core's other two absorbed submodules) ride along for free and need no separate handling.

### Q3 — the `conditional:` marker for `integration:tickets` / `integration:pull request`

[plugin-set-inventory.md](./plugin-set-inventory.md) records this as an open judgment call: `src/integrations-issues-github/` registers both `integration:tickets` and `integration:pull request` with `providerTest: usesGitHubIssues`, so a bare, unconditional `provides:` over-claims — the graph closes at the gate while `No provider found for 'tickets'` can still fire at request time for a non-GitHub project. As of 2026-08-26 the note is correct that the upstream schema's decided grammar had **no** marker for this beyond a plain boolean `conditional: true` field, and states the choice as binary: accept the over-claim and document it, or omit the provides.

**This is now answered by the framework's own shipped grammar, not by a plan-authored choice between two lesser options.** `plugable-express`'s `docs/plugin-manifest-schema.md` (Phase 1 task 001, merged 2026-08-28 — two days *after* this grounding note, which is why the note called it undecided) has a full `### conditional` section, and — notably — its worked example is `core-server`'s own case by name:

> "Two of `core-server`'s three real provider registrations — `tickets` and `pull request`, both from `src/integrations-issues-github/` — register with `providerTest: usesGitHubIssues` rather than `() => true` ... A bare `provides: integration:tickets` over-claims..."

```yaml
provides:
  - capability : integration:tickets
    phase      : setup
    conditional: true
    via        : "setup method 'register github issues integrations' (providerTest: usesGitHubIssues)"
```

"A conditional provide satisfies the requirement, so the absent-provider case ... stays fatal. It additionally records a `satisfied-conditionally` finding at info severity, so the report says the graph closes *conditionally* rather than asserting something false." The plugin-author migration guide (`docs/plugin-manifest-migration-guide.md`, "Conditional providers" section) restates the identical worked example. Both `integration:tickets` and `integration:pull request` should be declared with `conditional: true` in Phase 2's task breakdown, replacing the plain, unconditional entries sketched in `plugin-set-inventory.md`'s YAML block and `phases/declare-in-tree-components.md`.

**Verdict: resolved — Q3 is answered by settled, shipped framework grammar (`conditional: true`), not a user decision.** Recommend Phase 2's task breakdown declare both provides with `conditional: true` and a `via:` note citing `providerTest: usesGitHubIssues`, rather than carrying the caveat forward as an open question.

## Net effect on `plan/TODO.yaml` task breakdown

Neither blocker requires user input to proceed:

- **Phase 1** needs its already-anticipated prerequisite-verification task to run the two-package (`plugable-express` + `@sdlcforge/dev-core`) yalc-push-and-reinstall sequence above before any other Phase 1 work.
- **Phase 2** should declare `integration:tickets`/`integration:pull request` with `conditional: true` rather than carrying an unresolved over-claim caveat.
- **Phase 3** should be re-scoped from a scope-decision phase (choosing among options A-D) to a verification phase: confirm, once dependencies are refreshed, that both previously-open findings (`appExt:credentialsDB` and `appExt:serverConfigRoot`, both required by `@sdlcforge/dev-core`'s own now-shipped manifest) resolve to `satisfied` — no cross-repo manifest authoring needed from `core-server`.
- **Phase 4** is unaffected by either finding.

`plan/overview.md`'s "Current status" section, `manifest-ownership-boundary.md`, `plugin-set-inventory.md`, and `phases/third-party-coupling-coverage.md` all still describe the pre-re-verification state and should be updated by whoever next authors task breakdown — not done here per this task's scope (investigation and findings only, no edits to existing plan docs).
