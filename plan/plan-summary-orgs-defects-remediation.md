# Plan Summary: orgs-defects-remediation

## What was planned and why

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

## What shipped

### Phase 01 — Orgs Submodule Remediation

1. **Harden Org Settings Against Prototype Pollution** (`001-harden-org-settings-prototype-pollution.md`, tier `sonnet-high`) — Hardened src/orgs/resources/lib/settings.mjs against prototype pollution - checkKeyPath guard rejects __proto__/constructor/prototype segments in both getSetting/updateSetting before traversal; converted in-based checks to Object.hasOwn own-property tests; explicit null/non-object guard in getSetting. Extended settings.test.mjs with prototype-pollution coverage. All task-scoped validation passes; make lint failure and project-lifecycle.test.mjs failure are both pre-existing/out-of-scope.
   Commit `b4f996c`, merged at `53dfaba699aa10e3ab1e87f4f5f74db454e7eaf9`.

2. **Fix Organization Resource And Add Org Lookup Helper** (`002-fix-organization-resource-and-org-lookup.md`, tier `sonnet-high`) — Added src/orgs/handlers/_lib/get-org.mjs as drop-in replacement for liq-handlers-lib's getOrgFromKey, reading app.ext._liqOrgs.orgs[orgKey] directly, throwing createError.NotFound. Gave Organization a key getter (aliasing #name) and async save() override persisting #settings to settings.yaml via js-yaml, replacing the always-rejecting inherited Model.save(). Fixed constructor's silent-swallow catch. Full test coverage added. Folded in unrelated pre-existing lint fix. No new test failures beyond 2aMD.
   Commit `b4f5f0f`, merged at `31e0fcc4e44febd4a6edb2d8baa1c652bb2208be`.

3. **Fix Orgs Read Handlers And Tighten parameterKey** (`003-fix-orgs-read-handlers.md`, tier `sonnet-high`) — Fixed all three model-argument-dependent read handlers (list.mjs, parameters-list.mjs, parameters-detail.mjs) to read org registry from app.ext._liqOrgs.orgs instead of never-populated model argument, using task 002's getOrg helper for single-org lookups. Removed dead org===false guards and KNOWN BROKEN comments. Fixed parameterKey's optionsFetcher via closure over app. Tightened parameterKey's validationRe to reject __proto__/constructor/prototype segments (closing DGt0(b) input half). Added three new handler-level test suites (27 tests). make test/make lint both clean; only pre-existing 2aMD failure remains.
   Commit `38ca2f5`, merged at `fb4d76bf3f1566efd18c088ea56aa8c3ca5eec19`.

4. **Fix Orgs Parameters Set Handler** (`004-fix-orgs-parameters-set-handler.md`, tier `sonnet-high`) — Fixed fourth and last jY7C handler: replaced getOrgFromKey({model,...}) with task 002's getOrg({app,orgKey}), removed dead org===false guard and KNOWN BROKEN comment, dropped liq-handlers-lib import. Made handler async, awaited org.save(), reordered 406 check ahead of write. Kept commented-out registerPathVar block per validation requirement, fixed its stale reference. Added full test suite covering conversions, 404, 406-no-write, non-JSON renderings, save-rejection regression guard. No new test failures beyond 2aMD.
   Commit `d9e79e2`, merged at `f8a0a5c632108cf756e872aa3b8a59ae791f6f7d`.

5. **Finish And Secure Orgs Create Handler** (`005-finish-orgs-create-handler.md`, tier `sonnet-high`) — Finished POST /orgs/create/:newOrgKey: added pre-mkdir containment validation anchored on app.ext._liqProjects.playgroundPath, switched to fsPath.join, restored destructures, wired up httpSmartResponse 2xx reply with commonName/legalName/newOrgKey/directory. Removed KNOWN BROKEN/TODO block causing hang. Softened help text. Added test suite covering happy path, containment rejections, idempotence, missing-_liqProjects guard. Folded in one unrelated pre-existing lint fix. No new test failures beyond 2aMD.
   Commit `f9a3fa7`, merged at `96cbd30eedf3fc68c3ba74d7e420eabbc2170f72`.

6. **Mark orgSetupMethods Requirement Optional** (`006-mark-org-setup-methods-requirement-optional.md`, tier `sonnet-high`) — Declared appExt:_liqOrgs.orgSetupMethods optional: true in package.json's plugable manifest, mirroring work component's existing integrationHook precedent. Updated drift-guard suite's pinned assertion (severity token flip, counts {error:2,info:2}) after observing actual post-edit shape. Corrected two now-false README statements in ## The plugin manifest section. Also fixed a pre-existing lint violation in the same file as a same-diff self-fix. All validation passes; only pre-existing 2aMD failure remains. No edits to core-server or plugable-express.
   Commit `332a908`, merged at `ca282d4a1f6e0fbd54e5f57c938651d530319a97`.

7. **Update Orgs Defect Documentation** (`007-update-orgs-defect-documentation.md`, tier `sonnet-high`) — Rewrote README.md's orgs submodule prose and docs/consumer-migration.md's orgs disclosure section to describe the now-fixed reality from tasks 001-006. Corrected two false claims: the getOrgFromKey signature-change claim, and the stale liq-controls attribution (verified moved to core-server's in-tree controls submodule). Full repo sweep confirms no stale defect language survives outside plan/. All anchor links verified. make lint clean.
   Commit `7bb4a51`, merged at `77f905a78c528940344d4b5b736ed9de4f95e73a`.

8. **Close And File Orgs Follow-Ups** (`008-close-and-file-orgs-followups.md`, tier `sonnet-med`) — Phase 01 followups reconciliation complete. dev-core's plan/followups.yaml now at 20 items: 13 original minus jY7C/DGt0 (both verified resolved by this phase's tasks 001-007) minus 3 malformed auto-filed drafts (BNr7/z2bi/Bewc), plus 5 well-formed items (the 4 adequate auto-filed items retained, plus 5 newly filed with full file/symbol citations per the follow-up text rule). All new items carry plan/slug:orgs-defects-remediation and plan/phase:phase-01-orgs-remediation provenance tags.
   Commit `b91fbba`, merged at `fa9bcdf6607f3b768b5b2401597a5341740d030a`.

9. **Fix Phase Review Findings** (`009-fix-phase-review-findings.md`, tier `sonnet-high`) — Fixed critical silent-empty-results defect in GET /orgs/:orgKey/parameters by adding Organization.settings getter (previously private field with no accessor meant listParameters always saw undefined against real instances). Rebuilt parameters-list/detail test mocks to use real Organization instances with real assertions. Closed symlink-based containment bypass in create.mjs via realpath resolution of nearest existing ancestor. Declared two previously-undeclared manifest requirements (appExt:_liqProjects.playgroundPath, appExt:_liqOrgs.orgs self-consumption) on orgs component, verified no new drift-guard finding. Full suite green apart from pre-existing 2aMD. Manager independently verified all three fixes (settings getter, realpath usage, manifest entries) present in the merged diff.
   Commit `21b0926`, merged at `216ea25092849e06cc39a31f3ea22173c8117672`.

### Phase 02 — Documentation Updates

1. **Update Architecture Docs** (`001-update-architecture-docs.md`, tier `sonnet-high`) — Corrected docs/architecture.md's app.ext runtime-service-contracts table: _liqOrgs row now names orgs' own list/parameters-* handlers as in-package readers; both _liqOrgs and _liqProjects rows corrected from deprecated liq-controls to core-server's in-tree controls submodule with current file paths, verified against live core-server checkout, mirroring task 007's identical README correction. Diagram and alt-text updated. Fixed adjacent stale claim exposed by the attribution fix. 58-endpoint count and manifest-intro paragraph verified accurate, left untouched. make lint clean.
   Commit `5978744`, merged at `50f554b74f8cd3a20bbb5f9734ebb3a089676143`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`xehM`** — **Task doc's Validation grep for getOrgFromKey/** — Task doc's Validation grep for getOrgFromKey/model.orgs produces one incidental hit beyond parameters-set.mjs: a documentation comment in task 002's already-landed get-org.mjs naming the retired getOrgFromKey helper for exposition. Not code-level usage; get-org.mjs is outside this task's file scope so not edited. May want to reword that comment in a follow-up.

- **`Jbaz`** — **parameters-list.mjs's mdFormatter/terminalFor** — parameters-list.mjs's mdFormatter/terminalFormatter/textFormatter use positional args (parameters, title) but formatOutput invokes non-JSON formatters with a single {data,title,fields} object - same category of pre-existing inconsistency the task doc explicitly calls out and defers for list.mjs's analogous mdFormatter. Left untouched (not required by this task, JSON-path-only test coverage) but flagging as a real bug if parameters-list is ever requested with format=md/txt/terminal.

- **`4Q22`** — **Correcting liq-controls attribution in the or** — Correcting liq-controls attribution in the orgs section creates a naming inconsistency with the rest of the repo (README's work/projects-audit sections, docs/architecture.md lines ~29/34/81/82/86, untouched parts of docs/consumer-migration.md) which still refer to liq-controls as external/unmanifested - all now stale relative to the merged core-server-domain-consolidation plan. Recommend a follow-up or a Phase 02 architecture-doc task addendum to sweep the rest of the repo for the same correction.

- **`hks9`** — **docs/consumer-migration.md's own re-verified-** — docs/consumer-migration.md's own re-verified-against-core-server-main framing predates the core-server-domain-consolidation merge; its per-donor tables (out of this task's scope) may need a similar refresh.

- **`x6x1`** — **core-server plugin-graph-gate allowlist** — `@sdlcforge/core-server`'s `src/lib/test/plugin-graph-gate.test.js` declares a two-entry `ALLOWLISTED_ERROR_FINDINGS` array (lines 31-42) and asserts the live error-finding count equals that array's length (line 69). The first entry — `{ kind: 'unsatisfied', capabilityFull: 'appExt:_liqOrgs.orgSetupMethods', requirerNodeId: '@sdlcforge/dev-core#orgs' }` — no longer describes an error-severity finding: `@sdlcforge/dev-core`'s `package.json` `plugable` block now declares that requirement `optional: true`, which the validator reports at `info` instead. The array should drop from two entries to one. The surviving entry — `{ kind: 'violated-by-source-order', capabilityFull: 'appExt:_liqOrgs.orgs', requirerNodeId: '@sdlcforge/core-server#controls' }` — stays: it is a known validator limitation, not a real defect, since `core-server`'s `src/controls/setup.mjs` pushes its `load org controls` setup method with `deps: ['load orgs']`, and `DependencyRunner` guarantees the ordering that the raw source-order model flags as violated (tracked as core-server followup `Pwdb` and `@liquid-labs/plugable-express` followup `dN2a`). This is core-server's own change to make, in core-server's own plan; this item is dev-core's durable record of the consequence its manifest change caused.

- **`Ymcf`** — **resource-model Model.save() always rejects** — `@liquid-labs/resource-model`'s `Model.save()` (`src/Model.mjs:74-80`, identical in the installed `dist/`) destructures `errors` off an un-awaited `async validate()` call, so `errors.length` throws and every `save()` call on a `Model` subclass rejects unconditionally. `@sdlcforge/dev-core`'s `src/orgs/resources/organization.mjs` works around this with its own `async save()` override that writes `#settings` directly rather than delegating to the base implementation; the upstream package itself is unfixed and remains broken for any other `Model` subclass, in this or any other consumer, that relies on the base `save()` without its own override.

- **`ZkAv`** — **orgs create.mjs creates directory only** — `POST /orgs/create/:newOrgKey` (`src/orgs/handlers/create.mjs`) creates only the org's data directory (`fs.mkdir` under `<localDataRoot>/org`); it writes no `org.json` or `settings.yaml`, constructs no `Organization`, and registers nothing into `app.ext._liqOrgs.orgs`, which is populated only by the `load orgs` setup method (`src/orgs/setup.mjs`) scanning the playground for a `package.json` carrying `liq.packageType === 'org'`. The endpoint's `localDataRoot` parameter's own `description` still reads "The local directory in which to save `./orgs/org.json`...", which the handler never does — left inaccurate because the parameter list itself was treated as unchanged when `help.description`/`help.summary` were separately corrected to describe current behavior. A follow-on task should either complete org creation (write `org.json`/`settings.yaml`, construct an `Organization`, register it into the runtime registry) or correct the `localDataRoot` parameter description to match what the handler actually does.

- **`X7IU`** — **parameters-set setUndefined/setNull error** — `PUT /orgs/:orgKey/parameters/:parameterKey/set` (`src/orgs/handlers/parameters-set.mjs`) exposes `setUndefined` and `setNull` parameters whose value ladder produces `parsedValue === undefined` or `parsedValue === null` respectively. `updateSetting`'s `checkValue` (`src/orgs/resources/lib/settings.mjs`) only whitelists `boolean`/`number`/`string` and arrays of those, so both fall through the whitelist and `checkValue` throws — the documented `setUndefined` and `setNull` parameters always error instead of storing the value their own parameter `description` promises. Pre-existing contradiction between the endpoint's declared parameters and the settings library's storage constraints; deliberately left unfixed while the lookup/persistence path itself was repaired.

- **`2Zug`** — **orgs list.mjs mdFormatter field mismatch** — `src/orgs/handlers/list.mjs`'s `mdFormatter` renders `* ${o.name}` while the handler's `defaultFields` is `['key', 'commonName', 'legalName']`, and the JSON/terminal/text formatters for the same endpoint all render `commonName`/`key`. The Markdown rendering disagrees with every other format for the same endpoint. Low severity: `name` is still a defined `Organization` property so the output is not broken, only inconsistent across formats.

- **`JFTT`** — **Auto-filed followups from apply-task-report's** — Auto-filed followups from apply-task-report's defer bucket (during tasks 003-007's individual applies) carried plan/phase:orgs-remediation (missing the phase-01- prefix) and type:ambiguity regardless of actual content category. Left Jbaz/xehM/4Q22/hks9 as-is since content was adequate, but this tag/type pattern is worth a look for future plans.

- **`Hwdp`** — **create.mjs response discloses abs path** — `POST /orgs/create/:newOrgKey`'s 2xx response body's `directory` field (`src/orgs/handlers/create.mjs`, response construction) echoes back the fully resolved absolute filesystem path (built from `fsPath.resolve(localDataRoot)`). When the caller supplies a relative `localDataRoot`, the response discloses the server's absolute directory layout (e.g. the playground root's absolute parent path) to the caller. Does not by itself enable an attack — the containment check restricts where the directory can actually be created regardless of what is echoed back — but is a minor server-filesystem-layout disclosure. If server filesystem layout is considered sensitive in this deployment context, return a playground-root-relative path instead, or omit the `directory` field and return only the caller-supplied `newOrgKey`.

- **`zaIa`** — **architecture.md app.ext table stale cells** — `docs/architecture.md`'s `app.ext` contracts table (lines ~79-84) is stale in two cells as a direct consequence of phase-01-orgs-remediation's handler fixes: the `app.ext._liqOrgs` row's "Read by (this package)" column lists `—` but should now include `orgs`' own `list`/`parameters-*` handlers (via `_lib/get-org.mjs`), and the `app.ext._liqProjects` row's "Read by (this package)" column should add `src/orgs/handlers/create.mjs` (new reader of `playgroundPath` for its containment check). Already correctly scoped to phase-02's `update-architecture-docs` task per tasks 007/008's own notes; this item sharpens the specific cells that task needs to close, including the two new manifest `requires` entries added for `appExt:_liqProjects.playgroundPath` and `appExt:_liqOrgs.orgs` on the `orgs` component.

- **`dsdl`** — **docs/dev-core-consolidation-contract.md:128 c** — docs/dev-core-consolidation-contract.md:128 carries the same stale liq-controls attribution (naming src/lib/resources/load-controls.mjs and src/lib/integrations/get-question-controls.mjs as external liq-controls readers), provably false by the same evidence cited in this report and task 007's report. Out of this task's file-scope (architecture.md only). Recommend a small follow-up task scoped to that one file.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Orgs Submodule Remediation

- [x] [001-harden-org-settings-prototype-pollution.md](./phase-01-orgs-remediation/001-harden-org-settings-prototype-pollution.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-001` · commit `b4f996c` · merge `53dfaba699aa10e3ab1e87f4f5f74db454e7eaf9`
- [x] [002-fix-organization-resource-and-org-lookup.md](./phase-01-orgs-remediation/002-fix-organization-resource-and-org-lookup.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-002` · commit `b4f5f0f` · merge `31e0fcc4e44febd4a6edb2d8baa1c652bb2208be`
- [x] [003-fix-orgs-read-handlers.md](./phase-01-orgs-remediation/003-fix-orgs-read-handlers.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-003` · commit `38ca2f5` · merge `fb4d76bf3f1566efd18c088ea56aa8c3ca5eec19`
- [x] [004-fix-orgs-parameters-set-handler.md](./phase-01-orgs-remediation/004-fix-orgs-parameters-set-handler.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-004` · commit `d9e79e2` · merge `f8a0a5c632108cf756e872aa3b8a59ae791f6f7d`
- [x] [005-finish-orgs-create-handler.md](./phase-01-orgs-remediation/005-finish-orgs-create-handler.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-005` · commit `f9a3fa7` · merge `96cbd30eedf3fc68c3ba74d7e420eabbc2170f72`
- [x] [006-mark-org-setup-methods-requirement-optional.md](./phase-01-orgs-remediation/006-mark-org-setup-methods-requirement-optional.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-006` · commit `332a908` · merge `ca282d4a1f6e0fbd54e5f57c938651d530319a97`
- [x] [007-update-orgs-defect-documentation.md](./phase-01-orgs-remediation/007-update-orgs-defect-documentation.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-007` · commit `7bb4a51` · merge `77f905a78c528940344d4b5b736ed9de4f95e73a`
- [x] [008-close-and-file-orgs-followups.md](./phase-01-orgs-remediation/008-close-and-file-orgs-followups.md) — tier `sonnet-med` · branch `plan/orgs-defects-remediation-01-008` · commit `b91fbba` · merge `fa9bcdf6607f3b768b5b2401597a5341740d030a`
- [x] [009-fix-phase-review-findings.md](./phase-01-orgs-remediation/009-fix-phase-review-findings.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-01-009` · commit `21b0926` · merge `216ea25092849e06cc39a31f3ea22173c8117672`

### Phase 02 — Documentation Updates

- [x] [001-update-architecture-docs.md](./phase-02-doc-updates/001-update-architecture-docs.md) — tier `sonnet-high` · branch `plan/orgs-defects-remediation-02-001` · commit `5978744` · merge `50f554b74f8cd3a20bbb5f9734ebb3a089676143`
