# Author Consumer Migration Handoff

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`). It **reads** `@sdlcforge/core-server` (`/Users/zane/playground/sdlcforge/core-server`) but must not modify it.

Write `docs/consumer-migration.md` in dev-core: the precise, executable-by-another-plan specification of every edit a consumer must make to move from the four absorbed plugin packages to `@sdlcforge/dev-core`, starting with the only edits that are already fully known — `@liquid-labs/liq-projects` → `@sdlcforge/dev-core` in `core-server`.

Executing those edits is **out of scope**: every touch point lives in `core-server`, whose own plan-group (`core-server-domain-consolidation`) owns them. The deliverable is the handoff, not the change. The reason to write it here, in dev-core, is that the knowledge is here — the atomicity requirement, the credential-provenance shift, and the `app.ext` preservation guarantee are all facts about dev-core, not about core-server.

Documentation only. No code, no `package.json` edit, no edit in any other repository.

## Requirements

Author `docs/consumer-migration.md` covering:

1. **Scope and status.** Which absorptions have landed (as of this task: `projects`) and which have not (`work`, `orgs`, `projects-audit`). Make clear that the swap is per-absorbed-package: a consumer removes `@liquid-labs/liq-projects` and adds `@sdlcforge/dev-core` when the `projects` submodule lands, and simply removes each further package as its submodule lands, without re-adding dev-core.
2. **The core-server edit list**, by exact file, with the current content quoted so a later agent can find it even if line numbers move:
   - `package.json` — the `dependencies` entry `"@liquid-labs/liq-projects": "file:.yalc/@liquid-labs/liq-projects"` is removed and `"@sdlcforge/dev-core"` added. Document both consumption options and recommend the yalc form for the transition, since that is how core-server already consumes this package and `@liquid-labs/plugable-express`: `yalc publish` from dev-core, `yalc add @sdlcforge/dev-core` in core-server, giving `file:.yalc/@sdlcforge/dev-core`. Note core-server's `scripts/provision-local-deps.sh` provisioning procedure and that `.yalc/` is gitignored there, so a worktree needs provisioning before install.
   - `src/lib/app-init.mjs` — the `explicitPlugins` array: `'@liquid-labs/liq-projects'` is replaced by `'@sdlcforge/dev-core'`. Note that the array is otherwise alphabetically ordered and that the new entry sorts differently (`@sdlcforge/...` after every `@liquid-labs/...`), which is cosmetic but worth doing deliberately.
   - `test/test-basic.js` — the expected-plugin list entry.
   - `test/test-integration-quick.js` — two occurrences.
   - `test/__snapshots__/golden-api-spec.json` and `test/__snapshots__/golden-plugins-list.json` — re-verify rather than assume. State the current observed condition: the plugins list is literally `[]` and the API spec carries only `@liquid-labs/plugable-express` provenance, so the swap is unlikely to move them; if it does, the change is provenance-only and legitimate. Name `npm run test:update-golden-api-spec` (core-server's own script) as the regeneration path.
3. **The atomicity requirement**, with both reasons stated as mechanism rather than caution:
   - *Routes.* With both `@liquid-labs/liq-projects` and `@sdlcforge/dev-core` in `explicitPlugins`, all 19 `/projects` routes register twice. `registerHandlers` performs no duplicate-path detection, so Express silently shadows the second registration and the generated API spec carries duplicate endpoints. Remove and add in one change.
   - *Credentials.* liq-projects's `setup` is what calls `setupCredentials` from `@liquid-labs/credentials-db-plugin-github`, which registers the `GITHUB_API` credential that `liq-integrations-issues-github` later fetches via `credentialsDB.getToken('GITHUB_API')` — an undeclared, load-order-dependent contract. dev-core's composite `setup` performs the identical registration, first in its ordering, so the contract survives the swap **only if** the provider is never absent: a step that removes liq-projects without adding dev-core in the same change breaks GitHub-issue integration at runtime, silently until a token is requested.
4. **What consumers do *not* have to change**, with the guarantee stated explicitly: `app.ext._liqProjects` (and later `app.ext._liqOrgs`, `app.ext.constants.WORK_DB_PATH`, `app.ext.setupMethods`) keep their exact names. Name the specific readers verified to need no change — `liq-controls` (`src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`, plus a test fixture) and `liq-integrations-issues-github` (`src/create-or-update-pull-request.mjs`) — and note that `liq-plugins-lib`'s use of the string `@liquid-labs/liq-projects` is sample data in `src/lib/test/select-matching-plugins.test.js`, not a dependency.
5. **Behavior changes a consumer should expect**, honestly and completely:
   - Endpoint provenance: every `/projects` endpoint's recorded `npmName` becomes `@sdlcforge/dev-core`, visible in the server's generated API spec and `help` output.
   - Plugin count and summary: one plugin entry replaces up to four, and its summary comes from dev-core's `package.json` `description`.
   - No route, method, parameter, or response change.
6. **A verification checklist** the consumer's own task can run: server starts, `/projects/detail` (or another cheap route) responds, the plugin list reports `@sdlcforge/dev-core`, the `GITHUB_API` credential resolves, and core-server's three test tiers pass.
7. Write it as standing documentation: no plan, phase, or task names, no reference to `plan/` paths, and no dependence on this plan's existence — a reader in a later wave must be able to act on it cold.

## Validation

- `docs/consumer-migration.md` exists in dev-core and is the only file added or changed (`git status --short` shows exactly that path).
- Every file path and quoted snippet attributed to core-server is verified by reading the actual file in `/Users/zane/playground/sdlcforge/core-server`: the `package.json` dependency entry, the `explicitPlugins` array in `src/lib/app-init.mjs`, the `test/test-basic.js` occurrence, the two `test/test-integration-quick.js` occurrences, both snapshot files, and the `test:update-golden-api-spec` script. Any path that does not resolve, or content that does not match, is corrected in the document and reported.
- `git -C /Users/zane/playground/sdlcforge/core-server status --short` is unchanged from its pre-task state — this task modifies nothing there.
- The document names the exact `app.ext` keys (`_liqProjects`, `_liqOrgs`, `constants.WORK_DB_PATH`, `setupMethods`) and the exact credential key (`GITHUB_API`), spelled as they appear in source.
- Both atomicity reasons (route double-registration, credential-provider gap) are present with their mechanism, not just an instruction to be careful.
- The `liq-controls` and `liq-integrations-issues-github` file paths cited as needing no change resolve and still contain the `app.ext._liqProjects` reads they are cited for.
- No plan/phase/task names, no `plan/`-relative paths, and no review-lens boilerplate appear anywhere in the document.
- Markdown conforms to the playground's documentation standards: `## Purpose and scope` first, no frontmatter, language-tagged fences, repo-relative internal links.

## Assumptions

- Phase 1 task 001 has landed, so dev-core's contract document exists and this document can cite it rather than restating the whole contract.
- This task may run in parallel with phase 2 task 002 (they touch disjoint files), but they operate in the same repository, so they need separate task worktrees. If task 002 has already landed, prefer describing the swap in the present tense for `projects` and future tense for the other three submodules.
- `core-server`'s `core-server-domain-consolidation` plan-group is the owner of the actual edits. This task neither schedules nor performs them.

## References

- `plan/notes/liq-projects-source-inventory.md` — the complete consumer inventory, the credential-provenance note, and the atomicity reasoning.
- `plan/notes/dev-core-target-shape.md` — decisions D7 (`app.ext` freeze), D9 (versioning/consumption), D5 (provenance change).
- `/Users/zane/playground/sdlcforge/core-server/src/lib/app-init.mjs`, `package.json`, `test/test-basic.js`, `test/test-integration-quick.js`, `test/__snapshots__/` — the read-only sources for every quoted edit.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js` — evidence for the absence of duplicate-path detection.
- `/Users/zane/playground/liquid-labs/liq-projects/src/setup.mjs` — the `setupCredentials` call that makes the credential provenance point real.

## Checkpoint hints

- After reading and transcribing the core-server touch points, with each path verified.
- After the atomicity and no-change-required sections are written.
- After the behavior-change and verification-checklist sections complete the document.
