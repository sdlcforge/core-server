# dev-core Plugin Manifest

## Purpose and scope

Author a compile-time plugin manifest for `@sdlcforge/dev-core` so that `@liquid-labs/plugable-express`'s build/CI-time `plugable-express-validate` gate can catch, at build time, two bug classes that have previously only surfaced at runtime:

1. **The `serverHome` → `serverConfigRoot` rename bug.** A rename inside `plugable-express` silently broke the packages that are now dev-core's submodules, propagating `undefined` into a crash instead of producing a clean error. `plugable-express`'s own intrinsic manifest already carries `{ capability: 'appExt:serverConfigRoot', phase: 'framework', supersedes: ['appExt:serverHome'] }` as the detection mechanism for exactly this; that mechanism only fires once the *consuming* package declares its side. Declaring dev-core's side is what activates it.
2. **The `GITHUB_API` credential ordering bug.** `projects`' setup calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })` and throws a hard `TypeError` if `credentialsDB` is not populated before it runs. Declaring that requirement makes the ordering constraint checkable rather than discovered by crash.

The manifest is authored as a `package.json` `"plugable"` block using the schema's `components:` form, one component per submodule (`projects`, `orgs`, `work`, `projects-audit`), mirroring `src/index.mjs`'s own composition. The two notes backing this plan are the [capability census](./notes/capability-census.md) — the verified, line-grounded inventory of what each submodule actually provides and requires — and [manifest scope and tooling](./notes/manifest-scope-and-tooling.md), which settles the form choice, the declare-now-versus-defer split, and what validation is actually runnable here.

**What must change:** `package.json` gains a `"plugable"` block and one `devDependency`; `src/` gains one Jest suite that guards the manifest against drift; `README.md`, `docs/architecture.md`, and `docs/dev-core-consolidation-contract.md` gain the manifest as a documented artifact.

**What must not change:** dev-core's runtime behavior, composite-setup order, module exports, route registration, or any `app.ext` key name. The manifest is declarative metadata read only by a build-time tool; nothing reads it at boot. `@liquid-labs/plugable-express` and `@sdlcforge/core-server` are read-only reference projects for this plan and are not modified. `plan/followups.yaml` is not modified by this plan's tasks.

**Success criteria:** the manifest parses cleanly through `plugable-express`'s real manifest reader; `plugable-express-validate --diff-manifest` reports no unexplained divergence between what dev-core declares and what a static scan of its source observes; a dev-core-owned Jest suite asserts the manifest's framework-facing requirements against the framework's real current capability surface; and `make build` plus the pre-existing test baseline are unchanged apart from the one added suite.

## Current status

Phase 1 (Plugin Manifest Declaration) begins first, and its four tasks are strictly ordered — task 001 makes the tooling reachable, 002 authors the manifest, and 003/004 verify it.

Two pre-conditions are already established and should not be re-derived:

- **`@liquid-labs/plugable-express` is not a dependency of dev-core at all** — not a `dependency`, not a `devDependency`, no `.yalc/` link, zero occurrences in `package.json` or `package-lock.json`. This is not the anticipated "installed version is too old" case; there is nothing installed. Task 001 exists solely to close this, and no later task can run until it does. `1.0.0-alpha.59` (which ships the manifest framework) is published to npm, so an ordinary registry `devDependency` suffices.
- **`make test` / `make qa` are known-red at baseline**, independently of this plan: `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` fails on the `serverHome`/`serverConfigRoot` mismatch tracked as followup `2aMD`. Fixing it is out of scope. Every task that runs tests scopes its run with `make test TEST=<path>` rather than asserting a green full suite.

## Overview

### Phase 1 — Plugin Manifest Declaration

Four tasks, strictly sequential except for the last pair.

1. **[Add Plugable Express Dev Dependency](./phase-01-plugin-manifest-declaration/001-add-plugable-express-dev-dependency.md)** — add `@liquid-labs/plugable-express@^1.0.0-alpha.59` to `devDependencies`, refresh `package-lock.json`, and confirm `node_modules/.bin/plugable-express-validate` resolves and runs. Blocks everything else in the phase. Deliberately a `devDependency`, never a `dependency`: dev-core's runtime never imports the framework, the host supplies it, and a `devDependency` is runtime-inert.

2. **[Author Plugin Manifest](./phase-01-plugin-manifest-declaration/002-author-plugin-manifest.md)** — author the `package.json` `"plugable"` block: `plugableManifestVersion`, `npmName`, and a four-entry `components:` array in `src/index.mjs`'s own order, populated from the [capability census](./notes/capability-census.md). The substantive judgment task of the plan. Depends on 001 only for the ability to check its own work through the reader.

3. **[Validate Manifest Against Source](./phase-01-plugin-manifest-declaration/003-validate-manifest-against-source.md)** — run `plugable-express-validate --diff-manifest` and `--suggest` against dev-core's real source, reconcile every reported divergence, and record the reconciliation. Both modes always exit 0, so the gate here is the reconciliation, not the exit code. Depends on 001 and 002.

4. **[Add Manifest Drift Guard Test](./phase-01-plugin-manifest-declaration/004-add-manifest-drift-guard-test.md)** — add a Jest suite driving `resolvePluginManifest` and `validatePluginGraph` against `FRAMEWORK_MANIFEST`, so a future framework-side rename fails dev-core's own CI rather than waiting for a host's gate. Depends on 001 and 002.

Tasks 003 and 004 are **parallel-eligible** with each other: both depend only on 001 and 002, and they touch disjoint files (003 produces a reconciliation record and at most corrective edits to the `"plugable"` block; 004 adds a new file under `src/`). If 003's reconciliation forces a change to the manifest, 004's assertions are re-run afterward.

### Phase 2 — Documentation Updates

One task, run after Phase 1 lands. dev-core's `docs/dev-core-consolidation-contract.md` currently states, in its [`app.ext` contract freeze](../docs/dev-core-consolidation-contract.md#appext-contract-freeze) section, that declaring these couplings explicitly "is a separate and later concern for a compile-time plugin manifest — not something this consolidation attempts." This plan *is* that later concern, so that statement and `docs/architecture.md`'s "Runtime service contracts" table both need to point at the now-existing declaration rather than describing it as absent.

### Deliberate deferrals, recorded rather than omitted silently

- **Six unguarded `integrationHook:` requirements** in `work` (`pull request/*`, `tickets/*`) are not declared. Their providers are unmanifested and outside this plan, and the schema's strict-by-default posture would turn each into an `error`-severity finding that dev-core cannot clear from its own side — the escape hatch, `plugable.host.assumeProvided`, is sited at the host. The single *guarded* hook, `integrationHook:controls/getQuestionControls`, is declared with `optional: true`, which is a true statement about `submit-lib.mjs`'s `hasHook` guard and reports at `info` severity.
- **`appExt:credentialsDB` will report `unsatisfied` at `error` severity** until `@sdlcforge/core-server` manifests its own `src/credentials/` component. That is the intended outcome, not a defect in this plan: it is the requiring half of a real historical bug, and the finding names the gap accurately. This plan does not depend on core-server's parked work landing first.
- **Full graph validation of dev-core's plugin set is core-server's gate to run.** dev-core is a plugin, not a host; the CLI's default validate mode resolves a *host's* set and yields a near-empty graph when pointed at a plugin. What is checkable here is manifest shape and declaration-versus-source agreement, which is what Phase 1 checks.
