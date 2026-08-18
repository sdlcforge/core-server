# Author README As Superseded Notice

## Purpose and scope

**Executes in the `liq-orgs` repository** (`/Users/zane/playground/liquid-labs/liq-orgs`).

Create `README.md` as `@liquid-labs/liq-orgs`'s superseded notice, per D10 step 2.

**This package has never had a README.** D10 says "rewritten"; here there is nothing to rewrite. That makes this task larger than its sibling in the `liq-projects` slice, not smaller: the notice has to say what the package *did* before it can meaningfully say what supersedes it, and it is the only prose description this package will ever have. The `package.json` `description` is `""`; the only existing one-line summary anywhere is the inert `summary = 'Manage org level settings.'` export in `src/index.js`.

`README.md` is the **only** file this task touches. Version and `description` belong to task 003; publishing belongs to task 004.

## Requirements

1. **Lead with the supersession.** A banner at the very top: this package is superseded by **`@sdlcforge/dev-core`**, which carries the same `/orgs` routes and publishes the same `app.ext._liqOrgs` contract from its `src/orgs/` submodule. State the final version (`1.0.0-alpha.8`, set by task 003) and that no further releases are planned. A reader who stops after two sentences must already know not to adopt this package.

2. **Say what it did — accurately, and in one place, for the first time.** Nothing else in this repository or anywhere else records this. Keep it short but correct:
   - It is a `plugable-express` plugin, loaded by `@sdlcforge/core-server` from its `explicitPlugins` list.
   - **An "org" is not a free-standing entity; it is a classification of a project.** `setup` scans the projects `liq-projects` already discovered (via `app.ext._liqProjects.playgroundMonitor.getProjectsData()`) and promotes those whose scanned `package.json` carries `liq.packageType === 'org'` into an `Organization` model, keyed by the NPM scope. This is the single most non-obvious fact about the package.
   - Each `Organization` reads its settings from `<projectPath>/data/org/settings.yaml`, and exposes dotted-key-path `getSetting`/`updateSetting`/`requireSetting` with `process.env` override support, plus `commonName` (`COMMON_NAME`) and `legalName` (`LEGAL_NAME`).
   - It published `app.ext._liqOrgs` with two keys: `orgs` (the key→`Organization` map) and `orgSetupMethods` (a registration point other plugins push org-scoped setup work onto).
   - It registered the path vars `orgKey`, `newOrgKey` (both from `setup`) and `parameterKey` (from the `parameters-detail` handler).

3. **Give the route table**, since it exists nowhere else:

   | Method | Path |
   |---|---|
   | POST | `/orgs/create/:newOrgKey` |
   | GET | `/orgs/list` (also `/orgs`) |
   | GET | `/orgs/:orgKey/parameters/list` (also `/orgs/:orgKey/parameters`) |
   | GET | `/orgs/:orgKey/parameters/:parameterKey/detail` |
   | PUT | `/orgs/:orgKey/parameters/:parameterKey/set` |

4. **Disclose the known defects.** This is a final release; a reader may pin it precisely *because* it is the last one. They must know what they would be pinning:
   - **Four of the five endpoints throw on first request.** `list`, `parameters-detail`, `parameters-list`, and `parameters-set` read a `model` argument that `plugable-express` no longer passes to plugin handlers, producing `TypeError: Cannot read properties of undefined (reading 'orgs')`. The org data itself is fine and lives at `app.ext._liqOrgs.orgs`; only these handlers look in the retired `@liquid-labs/liq-core`-era location.
   - **`POST /orgs/create/:newOrgKey` never sends a response** — its handler creates a directory and ends at a `// TODO`, so the request hangs.
   - These are pre-existing and were deliberately migrated unchanged into `@sdlcforge/dev-core` rather than fixed as part of the consolidation. Do not present them as fixed there.

5. **Give migration instructions**, matching D9's integration mechanism: replace the `@liquid-labs/liq-orgs` dependency with `@sdlcforge/dev-core` (consumed by `core-server` as a local `file:.yalc/@sdlcforge/dev-core` link), and swap the `explicitPlugins` entry. **The swap must be atomic** — with both packages loaded, the server crashes at startup with `Path variable 'newOrgKey' is already registered.` (from `plugable-express`'s `path-var-registry.mjs`), because a duplicate path-var registration throws. Note that this is *why* no re-export shim was published. Point at dev-core's `docs/consumer-migration.md` for the precise per-file edits rather than duplicating them here.

6. **Carry an honest known-consumer inventory** (correction C2 — do **not** inherit liq-projects's "only core-server" wording, which is false for this package):
   - **npm dependents:** `@sdlcforge/core-server` (`^1.0.0-alpha.6`, a registry range, plus an `explicitPlugins` entry) — the only live one; `@liquid-labs/liq-roles` (`^1.0.0-alpha.1`) — dormant since 2023-11; `@liquid-labs/liq-test-lib` (`^1.0.0-alpha.2`) — dormant and already broken independently, since it imports the retired `@liquid-labs/liq-core`.
   - **`app.ext` consumers, which need no change** because `@sdlcforge/dev-core` publishes `app.ext._liqOrgs` identically: `@liquid-labs/liq-controls` reads `_liqOrgs.orgs` in three modules; `@liquid-labs/liq-policy` writes `_liqOrgs.orgSetupMethods` (and is the only producer of those anywhere, and is dormant).
   - **Dead references needing no action:** `liq-controls/plugable-express.yaml` lists this package as a dependency, but nothing reads that file; `plugable-registry/registry.yaml` catalogs it.

7. **State that `src/` is intentionally intact and no shim was published**, with D10's reasoning in one or two sentences: the final release stays working so any server still loading it keeps working, and a re-export shim was rejected because duplicate registration is fatal, not silently tolerated.

8. **Record repository archival as an open user decision**, not as something done or scheduled.

9. **Touch nothing else.** No `package.json` edit, no version bump, no source change, no `docs/` directory. Task 003 owns `package.json`.

## Validation

- **`git status` shows exactly one changed path: `README.md`** (newly added). `git diff --cached --stat` lists it and nothing else.
- **Every factual claim is verifiable from source**, and the paths cited resolve: the five routes match the `path` exports in `src/orgs/handlers/*.mjs`; the `app.ext._liqOrgs` key names match `src/orgs/setup.mjs`; the settings file location matches `src/orgs/resources/organization.mjs`; the `liq.packageType === 'org'` predicate matches `loadOrgs` in `src/orgs/setup.mjs`. Spot-check each rather than trusting this task document.
- **The consumer inventory names three npm dependents**, not one. A README that says core-server is the only dependent fails this task.
- **The defect disclosure is present and is not softened.** A reader must come away knowing the endpoints do not work and were not fixed by the consolidation.
- **The atomicity warning names the actual error string** — `Path variable 'newOrgKey' is already registered.` — rather than describing a vague conflict.
- **No dead links.** Any link to `@sdlcforge/dev-core` docs points at a path that exists in that repository (verify against the checkout); there is no link to a generated API reference, because this package never had one.
- `make lint` and `make qa` still pass — a Markdown-only change should not affect them, and confirming it rules out an accidental stray edit.
- Markdown renders cleanly; the table is well-formed.

## Assumptions

- Phase 6 task 001 passed. If dev-core does not yet carry the code, this notice would point readers at a package that cannot serve them — do not write it.
- The final version is `1.0.0-alpha.8`, set by task 003. Tasks 002 and 003 are parallel-eligible, so state the version as the planned final rather than reading it from `package.json`, and flag any discrepancy if task 003 landed a different value.
- Follow the tone and structure of the completed `@liquid-labs/liq-integrations` superseded notice (`framework-consolidation`) and of `liq-projects` phase 3 task 002, adapting for the fact that this package starts from no README and has defects to disclose that liq-projects did not.
- The `summary` string `'Manage org level settings.'` from `src/index.js` is accurate but far too thin to stand as the description; use it as a seed, not as the answer.

## References

- `plan/notes/liq-orgs-source-inventory.md` — route table, `app.ext` contracts, path vars, the three-dependent consumer inventory (C2), the duplicate-registration finding (C1), and the defect list.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-03-retire-liq-projects/002-rewrite-readme-as-superseded-notice.md` — the sibling task, for shape and tone.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — D9 (consumption mechanism), D10 (retirement policy).
- `/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md` — the precise migration edits this notice points at instead of duplicating.
- `src/orgs/setup.mjs`, `src/orgs/handlers/*.mjs`, `src/orgs/resources/organization.mjs` — the source the factual claims are checked against.

## Checkpoint hints

- After the "what it did" and route-table sections are drafted and spot-checked against source.
- After the defect disclosure, consumer inventory, and migration instructions are in, before the final lint/render pass.
