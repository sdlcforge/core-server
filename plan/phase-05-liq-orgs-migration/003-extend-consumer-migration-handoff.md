# Extend Consumer Migration Handoff

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `liq-orgs`.

Extend dev-core's `docs/consumer-migration.md` with the `liq-orgs` section: every exact edit `core-server` must make to stop loading `@liquid-labs/liq-orgs` and start getting the same routes and the same `app.ext._liqOrgs` contract from `@sdlcforge/dev-core`, the atomicity requirement with the **exact error strings** a botched swap produces, and the guarantee that keeps `liq-controls` and the other `app.ext` consumers untouched.

**This task writes a specification; it does not edit `core-server`.** Executing the swap belongs to the `core-server-domain-consolidation` plan-group (D11). Writing it down precisely — exact files, exact lines, exact failure modes — is what keeps the ownership split from becoming a dropped handoff.

The document is shared across all four donors, so **append a clearly-delimited `liq-orgs` section** rather than restructuring what other donors wrote. If `docs/consumer-migration.md` does not exist yet (i.e. `liq-projects` phase 2 task 003 has not landed), **create it** with just the liq-orgs section plus whatever minimal framing the file needs; do not block on the sibling task and do not speculatively write other donors' sections.

## Requirements

1. **Name every core-server touch point, exactly.** Verified from source at plan-authoring time; re-verify each before writing, since core-server moves independently of this plan.

   | File | Current state | Required edit |
   |---|---|---|
   | `package.json` (line ~46) | `"@liquid-labs/liq-orgs": "^1.0.0-alpha.6"` | Remove. **Note this is a registry version range, not a `file:.yalc/…` link** — unlike `@liquid-labs/liq-projects`, which core-server consumes via yalc. Nothing needs unlinking; the entry is simply deleted. |
   | `package.json` | — | Add `@sdlcforge/dev-core` as `file:.yalc/@sdlcforge/dev-core` per D9, plus `yalc add @sdlcforge/dev-core` from the dev-core checkout. This edit is shared with the other donors' sections — cross-reference rather than duplicating it. |
   | `src/lib/app-init.mjs` (line ~37) | `'@liquid-labs/liq-orgs',` inside `explicitPlugins` | Remove. Add `'@sdlcforge/dev-core'` once (shared with the other donors' sections). |
   | `docs/architecture.md` (line ~51) | prose naming `liq-orgs` among the explicit-tier plugins | Update. |
   | `docs/architecture/plugin-loading-tiers.md` (line ~56) | table row `\| 4 \| @liquid-labs/liq-orgs \| Organization management — … \|` | Update. |
   | `test/README.md` (line ~108) | lists `@liquid-labs/liq-orgs` | Update. |

   State explicitly that **liq-orgs appears in no core-server test fixture**: `test/test-basic.js` and `test/test-integration-quick.js` list only `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-projects`. This is a real difference from the liq-projects handoff (which names three fixtures) and saves the executing agent a fruitless search.

   Also note, without prescribing action: `explicitPlugins` currently holds **11** entries and does **not** include `@liquid-labs/liq-integrations` (which `plugable-express` lists in its `supersededPlugins` set and skips). Some project documentation still describes a 13-entry list including it; the source is authoritative.

2. **State the atomicity requirement, and name the exact failure.** With both `@liquid-labs/liq-orgs` and `@sdlcforge/dev-core` in `explicitPlugins`, the server **crashes at startup**. It does not silently shadow routes. Give the executing agent the error strings so the failure is recognizable on sight:
   - First and loudest: `` Path variable 'newOrgKey' is already registered. `` — thrown by `plugable-express/src/lib/path-var-registry.mjs:28-34`. This fires before any handler registration, because `loadPlugin` (`load-plugins.js:29`) runs each plugin's `setup` eagerly while deferring handler registration to `app.ext.pendingHandlers`. `orgKey` produces the same error if `newOrgKey` were somehow skipped.
   - If path-var registration were bypassed: `` Non-unique command path: orgs/create/:newOrgKey `` (or another of the five) — thrown by `register-handlers.js:130-132`'s `processCommandPath`, which rejects any array-style command path registered twice.

   The practical instruction: **remove the `@liquid-labs/liq-orgs` entry and add the `@sdlcforge/dev-core` entry in the same commit.** No intermediate state where both are present is viable, and no intermediate state where neither is present serves the `/orgs` routes or publishes `app.ext._liqOrgs`.

   Note for completeness, and explicitly *reject* it as an option here: `plugable-express` has a `supersededPlugins` set (`load-plugins.js:10-13`) that skips named packages whose functionality was folded in. It is scoped to things absorbed **into plugable-express itself**, and adding a donor to it would break any server legitimately still running the standalone package. It is not a substitute for an atomic swap.

3. **State what does *not* change, and why that is guaranteed.** This is the load-bearing reassurance for consumers outside this plan-group (D7):
   - `app.ext._liqOrgs` keeps its exact name and both of its keys. `orgs` (a key→`Organization` map) is **read** by `liq-controls` at `src/lib/resources/load-controls.mjs:6`, `src/lib/integrations/get-question-controls.mjs:38`, and `src/lib/handlers/orgs/controls/_lib/list-lib.mjs:43` (plus a test fixture). `orgSetupMethods` is **written** by `liq-policy` at `src/liq-policy/setup.mjs:30,38`. **Neither consumer needs any change.**
   - The three `app.ext.setupMethods` entries keep their names, order, and `deps` markers (`['!']` on `prepare org dependencies`, none on `load orgs`, `['*']` on `process org setup`), so server startup ordering is unchanged.
   - The path vars `orgKey`, `newOrgKey`, and `parameterKey` keep their names and validation regexes. `:orgKey` appears in handler paths owned by `liq-controls` (`src/lib/handlers/orgs/controls/list.mjs`) and `plugable-express` (`src/handlers/server/next-commands.mjs`), both live, and by the dormant `liq-policy` and `liq-roles`. All keep working.
   - All 5 `/orgs` routes keep their exact paths and methods.

4. **Record the endpoint-provenance change** (D5): every `/orgs` endpoint's recorded `npmName` becomes `@sdlcforge/dev-core` instead of `@liquid-labs/liq-orgs`. Harmless at runtime, but visible in the server's generated API spec (`<serverConfigRoot>/core-api.json`) and in `help` output. Name core-server's golden characterization snapshots — `test/__snapshots__/golden-api-spec.json` and `golden-plugins-list.json` — as things to re-verify, while noting they are currently degenerate (`golden-plugins-list.json` is literally `[]`), so the swap is unlikely to move them.

5. **Disclose that the migrated endpoints do not work.** The executing agent will swap plugins and may reasonably try `GET /orgs/list` to confirm success. It will fail, and it failed identically before the swap. Say so, so a pre-existing defect is not misdiagnosed as a botched migration:
   - `list`, `parameters-detail`, `parameters-list`, and `parameters-set` throw `TypeError: Cannot read properties of undefined (reading 'orgs')` on first request, because they read a `model` argument `plugable-express` no longer passes to plugin handlers (`load-plugins.js:36` omits it from the `registerHandlers` call).
   - `POST /orgs/create/:newOrgKey` never sends a response and hangs.

   Give a positive verification the agent *can* use instead: the plugin loads without error, all 5 `/orgs` routes appear in the generated API spec under `@sdlcforge/dev-core`, and `app.ext._liqOrgs.orgs` is populated (observable indirectly through `liq-controls` continuing to work).

6. **Carry an honest consumer inventory** (correction C2). D10's claim that "the only npm dependent of any donor is `@sdlcforge/core-server`" is true for liq-projects and **false for liq-orgs**. Beyond core-server, `@liquid-labs/liq-orgs` is declared in `package.json` by:
   - `@liquid-labs/liq-roles` (`^1.0.0-alpha.1`) — dormant, last commit 2023-11-26; also shells out to `npm explore @liquid-labs/liq-orgs -- pwd` in two test files.
   - `@liquid-labs/liq-test-lib` (`^1.0.0-alpha.2`) — **already broken independently of this plan**: `src/org-setup.mjs` imports `appInit`/`initModel`/`Reporter` from the retired `@liquid-labs/liq-core` and loads the likewise-retired `@liquid-labs/liq-playground` and `@liquid-labs/liq-staff`.

   Neither is loaded by the running server, neither is a wave participant, and **neither is this plan-group's to fix** — but both would break on `npm deprecate`/unpublish, so the handoff must name them rather than let a later reader trust the inherited "only core-server" claim.

   Also record, as dead metadata needing no action: `liq-controls/plugable-express.yaml` declares `dependencies: ['@liquid-labs/liq-projects', '@liquid-labs/liq-orgs']`, but **no code anywhere reads that file** (verified by grep across all `.js`/`.mjs` outside `node_modules`). And `plugable-registry/registry.yaml` catalogs `@liquid-labs/liq-orgs`; updating a registry catalog is outside this plan-group.

7. **Keep it executable, not narrative.** The audience is a task agent in another plan-group who has not read this plan. Every instruction names a file path, a line or symbol, and a verifiable post-condition. Avoid pointing at plan-worktree documents that will not exist for that reader — cite dev-core's own committed `docs/` and the consumer's own source instead.

## Validation

- **Every claimed line reference re-verified against live source before the document is written**, not copied from this task document. `core-server`'s `package.json`, `src/lib/app-init.mjs`, `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `test/README.md`, and both test fixtures are read directly; any drift from the table in requirement 1 is reflected in what is written and reported.
- **The `liq-orgs` section is self-contained.** A reader who reads only that section knows: what to remove, what to add, in which files, in one commit, and how to tell it worked. It does not require reading the `liq-projects` section to be actionable, though it may cross-reference it for the shared `@sdlcforge/dev-core` dependency/`explicitPlugins` addition.
- **The exact error strings appear verbatim** — `Path variable 'newOrgKey' is already registered.` and `Non-unique command path:` — with their source file and line, so a failure is greppable.
- **No file outside `dev-core/docs/` is modified.** `git status` in the core-server checkout is clean; `git diff` in dev-core touches only `docs/consumer-migration.md`. If `docs/consumer-migration.md` had to be created, that is the only new file.
- **Existing sections are intact.** If the file already existed, `git diff` shows the liq-orgs section as a pure addition — no other donor's content reworded, reordered, or removed.
- **The three "unchanged" guarantees are stated with their evidence** — each `app.ext._liqOrgs` consumer named with file and line, so a skeptical reader can check them without re-deriving the inventory.
- **The known-defect disclosure is present and unambiguous**, including the positive verification the agent should use instead of hitting an endpoint.
- **Markdown renders**, internal links resolve, and the document passes whatever doc lint dev-core carries.

## Assumptions

- **Cross-repository commit mechanics.** As with task 002: this task's worktree is a `liq-orgs` worktree, the edits land in dev-core. Work on a dedicated branch in the dev-core checkout, report the branch and commit SHA, and halt-and-report rather than working around an agent-scope guard refusal.
- This task depends only on `liq-projects` phase 1 task 001 (the contract doc it cites), **not** on this plan's task 002 or on `liq-projects` phase 2. It is therefore parallel-eligible with task 002 — subject to both operating on the dev-core checkout, so they need separate task worktrees rather than simultaneous edits to one tree.
- `core-server` is read-only input here. Do not edit it, do not run its tests, do not add its repo as a remote.
- If `liq-projects` phase 2 task 003 has already created `docs/consumer-migration.md`, follow its established heading structure and voice. If not, create the file — a later donor section will adapt to what is written here.
- The `liq-roles` / `liq-test-lib` dependents are recorded, not fixed. They are outside this wave's participant set and dormant; raising them is the deliverable, resolving them is not.

## References

- `plan/notes/liq-orgs-source-inventory.md` — the full consumer inventory, corrections C1 and C2, the route/path-var/`app.ext` contracts, and the pre-existing defects to disclose.
- `/Users/zane/playground/sdlcforge/core-server/package.json`, `src/lib/app-init.mjs`, `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `test/README.md`, `test/test-basic.js`, `test/test-integration-quick.js` — the live consumer surface.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/path-var-registry.mjs`, `src/lib/register-handlers.js`, `src/lib/load-plugins.js` — the duplicate-registration throws and the `supersededPlugins` mechanism.
- `/Users/zane/playground/liquid-labs/liq-controls/src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`, `src/lib/handlers/orgs/controls/_lib/list-lib.mjs`; `/Users/zane/playground/liquid-labs/liq-policy/src/liq-policy/setup.mjs` — the `app.ext._liqOrgs` consumers whose non-change is being guaranteed.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-02-liq-projects-migration/003-author-consumer-migration-handoff.md` — the sibling task that establishes this document's shape.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — D5 (provenance), D7 (`app.ext` freeze), D9 (yalc integration), D10 (retirement/no shim), D11 (no consumer edits).

## Checkpoint hints

- After re-verifying every core-server line reference against live source, before writing.
- After the section is drafted, before running the render/lint checks.
