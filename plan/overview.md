# Orgs Defects Remediation

## Purpose and scope

Fix the three verified defect clusters in `@sdlcforge/dev-core`'s `orgs` submodule that were surfaced during the SDLC modernization effort, and bring the package's documentation and plugin manifest back into agreement with the fixed code.

The three clusters, as tracked in dev-core's own `plan/followups.yaml`:

1. **Manifest severity** — `orgs`' `appExt:_liqOrgs.orgSetupMethods` requirement is declared as a hard requirement but is provably optional. Marking it `optional: true` demotes a permanent, unclearable `error`-severity finding to `info` in every downstream plugin-graph gate.
2. **`jY7C`** — all five `/orgs` HTTP endpoints are non-functional, inherited unchanged from the retired `@liquid-labs/liq-orgs`. Four throw `TypeError: Cannot read properties of undefined (reading 'orgs')` on every request; the fifth hangs until client timeout.
3. **`DGt0`** — two security defects sitting on the same handler bodies: an unvalidated caller-supplied filesystem path reaching `fs.mkdir(…, { recursive: true })`, and a `parameterKey` path variable that admits `__proto__`/`constructor`-shaped segments into a settings writer that walks the prototype chain.

### What must change

- `src/orgs/handlers/{list,parameters-detail,parameters-list,parameters-set}.mjs` stop depending on the `model` argument (which `plugable-express` never passes) and read the org registry from `app.ext._liqOrgs.orgs` instead.
- `src/orgs/handlers/create.mjs` validates `localDataRoot` for containment before creating anything, and returns a real 2xx response instead of falling off the end of the function.
- `src/orgs/resources/lib/settings.mjs` stops walking the prototype chain when reading and writing settings.
- `src/orgs/resources/organization.mjs` gains the `key` accessor its consumers already read, and a `save()` that actually persists.
- `package.json`'s `plugable` block marks the `orgSetupMethods` requirement `optional: true`, and `src/test/plugin-manifest.test.mjs` is updated to match.
- `README.md`, `docs/consumer-migration.md`, and `docs/architecture.md` stop describing the fixed defects as live, and the five `KNOWN BROKEN` inline comments are removed.
- All five endpoints gain handler-level test coverage; today the `orgs` handlers are at 0% coverage.

### What must not change

- **No file outside `@sdlcforge/dev-core` is edited.** `@liquid-labs/plugable-express`, `@sdlcforge/core-server`, `@liquid-labs/liq-controls`, and `@liquid-labs/liq-handlers-lib` are read-only reference projects for this plan. The research confirmed no external edit is needed — see the "assumption refuted" note below.
- Route paths, HTTP methods, and parameter names stay exactly as they are. The five `/orgs` routes and their `path` arrays are a published surface; this plan makes them work, it does not redesign them.
- The frozen `app.ext` key names (`_liqOrgs`, `_liqOrgs.orgs`, `_liqOrgs.orgSetupMethods`, `_liqProjects`) stay frozen, per [the consolidation contract's `app.ext` freeze](../docs/dev-core-consolidation-contract.md#appext-contract-freeze).
- `parameterKey` remains registered exactly once, from `parameters-detail.mjs`. `parameters-set.mjs` keeps its registration commented out.
- The two `appExt:credentialsDB` manifest findings stay at `error` severity. The manifest graph is expected to remain not-overall-clean, and `src/test/plugin-manifest.test.mjs` must not be "fixed" into asserting a clean graph.

### An assumption the research refuted

Both `README.md` and follow-up `jY7C` assert that fixing the four broken handlers "requires changing `getOrgFromKey`'s signature in `@liquid-labs/liq-handlers-lib`", a package outside this plan's scope. That is **false**. `getOrgFromKey` is a nine-line map lookup plus a 404; dev-core can simply stop calling it from these four handlers and do the lookup itself against `app.ext._liqOrgs.orgs`. The whole fix is in-package. Details and citations: [orgs handler defect analysis](./notes/orgs-handler-defect-analysis.md). The stale claim is itself one of the documentation lines this plan corrects.

### Success criteria

- All five `/orgs` endpoints return correct responses against realistic `app.ext` shapes, and each is covered by a handler-level test.
- `POST /orgs/create/:newOrgKey` rejects a `localDataRoot` that escapes the playground root, with a 4xx, before any filesystem write.
- A `parameterKey` containing `__proto__`, `constructor`, or `prototype` cannot pollute `Object.prototype`, proven by test at both the route-validation layer and the settings-writer layer.
- `package.json` declares the `orgSetupMethods` requirement `optional: true`, and `src/test/plugin-manifest.test.mjs` passes with `{ error: 2, warning: 0, info: 2 }`.
- `make qa` is green except for the pre-existing `project-lifecycle.test.mjs` failure tracked as follow-up `2aMD`.
- No `KNOWN BROKEN` comment and no "these endpoints do not work" prose survives anywhere in the repository.
- Follow-ups `jY7C` and `DGt0` are closed; a new follow-up records the now-shrinkable `ALLOWLISTED_ERROR_FINDINGS` array in `@sdlcforge/core-server`'s `src/lib/test/plugin-graph-gate.test.js` for that project's own maintainer.

## Current status

The plan begins at Phase 01. No implementation work has started.

Two pre-conditions apply to every task in Phase 01:

- **`node_modules` is stale.** `@liquid-labs/plugable-express` is a declared `devDependency` and is present in `package-lock.json`, but is absent from the working checkout's `node_modules/@liquid-labs/`. Run `npm install` before `make test`, or `src/test/plugin-manifest.test.mjs` cannot run at all.
- **One test suite fails at baseline.** `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` is a live-GitHub integration test recorded as failing in `qa/unit-test.txt` (1 failed suite, 7 failed tests, of 14 suites / 82 tests). It is tracked as follow-up `2aMD` and is unrelated to this plan. Scope Jest with `make test TEST=<pattern>` when iterating.

Follow-up `CNMB`, which the change request expected to find in dev-core's `plan/followups.yaml`, is not there; it belongs to `@sdlcforge/core-server`. See [manifest optional requirement](./notes/manifest-optional-requirement.md) for the reconciliation.

## Overview

One implementation phase, followed by the standard architecture-doc conformance phase.

### Phase 01 — Orgs Submodule Remediation

Eight tasks. Tasks 001, 002, 005, and 006 touch disjoint files and have no predecessors, so they are parallel-eligible as a group. Tasks 003 and 004 both consume the org-lookup helper task 002 introduces, and are parallel-eligible with each other. Tasks 007 and 008 are sequencing tails.

| # | Task | Depends on | Files |
|---|---|---|---|
| 001 | Harden Org Settings Against Prototype Pollution | — | `src/orgs/resources/lib/settings.mjs` and its test |
| 002 | Fix Organization Resource And Add Org Lookup Helper | — | `src/orgs/resources/organization.mjs`, new `src/orgs/handlers/_lib/get-org.mjs` |
| 003 | Fix Orgs Read Handlers And Tighten parameterKey | 002 | `list.mjs`, `parameters-list.mjs`, `parameters-detail.mjs` |
| 004 | Fix Orgs Parameters Set Handler | 002 | `parameters-set.mjs` |
| 005 | Finish And Secure Orgs Create Handler | — | `create.mjs` |
| 006 | Mark orgSetupMethods Requirement Optional | — | `package.json`, `src/test/plugin-manifest.test.mjs`, `README.md` manifest section |
| 007 | Update Orgs Defect Documentation | 001-006 | `README.md`, `docs/consumer-migration.md` |
| 008 | Close And File Orgs Follow-Ups | 001-007 | `plan/followups.yaml` (via MCP tools) |

- **001** closes the sink half of `DGt0`(b): `updateSetting`/`getSetting` become own-property-based and reject reserved segment names. This is the layer that actually removes the vulnerability class. Research: [orgs security findings](./notes/orgs-security-findings.md).
- **002** is the shared foundation for the handler fixes: a `getOrg({ app, orgKey })` helper that reads `app.ext._liqOrgs.orgs` and throws `createError.NotFound`, plus two `Organization` repairs the research turned up — a missing `key` accessor that `list.mjs` and `setup.mjs` both already read, and a `save()` override that replaces an inherited implementation which always rejects.
- **003** and **004** are the `jY7C` handler fixes, split by file so they can run concurrently. 003 also carries the input half of `DGt0`(b), tightening `parameterKey`'s `validationRe` at its single registration site, which governs both the `detail` and `set` routes.
- **005** is `jY7C`'s `create` half plus all of `DGt0`(a): path containment first, then a real 2xx response.
- **006** is the manifest change and its drift-guard suite. Research: [manifest optional requirement](./notes/manifest-optional-requirement.md).
- **007** rewrites every piece of prose that describes the now-fixed defects as live, across `README.md` and `docs/consumer-migration.md`, and sweeps for surviving `KNOWN BROKEN` comments.
- **008** closes `jY7C` and `DGt0` and files the cross-project and deferred-scope follow-ups.

### Phase 02 — Documentation Updates

One task: review and update `docs/architecture.md` (and any `docs/*-spec.md`, of which dev-core currently has none) against the changes Phase 01 lands. Triggered because this plan changes spec-defined endpoint behavior and alters a declared component-boundary requirement in the plugin manifest.
