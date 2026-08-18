# Extend Consumer Migration Handoff

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `plugable-projects-audit`.

Extend `docs/consumer-migration.md` with the `plugable-projects-audit` section: every exact edit `@sdlcforge/core-server` must make to stop loading `@liquid-labs/plugable-projects-audit` and start getting those four endpoints from `@sdlcforge/dev-core`.

**Executing those edits is not in scope here or anywhere in this plan-group** — it belongs to the sibling `core-server-domain-consolidation` plan-group (D9, D11). This task produces the spec.

This is the **last** of the four donor sections. It is also the only one that *removes* work from core-server rather than adding it, and no other slice's handoff covers that part.

## Requirements

1. **Create or extend.** If `docs/consumer-migration.md` already exists (created by `liq-projects` phase 2 task 003 and extended by the `liq-orgs` and `liq-work` slices), append a section in the same structure and voice. If it does not exist yet, create it with this donor's section and a short preamble; a later or earlier sibling task will merge cleanly because the sections are disjoint. **Do not restructure or rewrite the sibling sections.**

2. **Name the exact edits, with file and line.** All are in `/Users/zane/playground/sdlcforge/core-server`; line numbers are as measured at plan-authoring time and should be given as "at or near", since siblings' edits will shift them.

   | file | line | edit |
   |---|---|---|
   | `package.json` | 50 | **remove** `"@liquid-labs/plugable-projects-audit": "^1.0.0-alpha.2"`. Note it is a **registry range, not a `file:.yalc/` link** — unlike `liq-projects`, this one needs no yalc handling on removal. |
   | `src/lib/app-init.mjs` | 40 | **remove** `'@liquid-labs/plugable-projects-audit',` from `explicitPlugins`, in the same edit that adds `'@sdlcforge/dev-core'`. |
   | `docs/architecture/plugin-loading-tiers.md` | 59 | row 7 of the tier table — replace with the merged dev-core entry; the table is numbered, so the rows after it renumber. |
   | `test/README.md` | 111 | the documented explicit-plugin list. |
   | `AGENTS.md` | 60 | the yalc-snapshot paragraph — see requirement 4. |
   | `scripts/provision-local-deps.sh` | 8, 31–35, 79 | the header comment, `REQUIRED_YALC_PACKAGES`, and the missing-package error text — see requirement 4. |
   | `bun.lock` | 374, 1776 | **regenerated, never hand-edited.** Per core-server's own `AGENTS.md`, a `file:` resolution change requires `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`); a bare `bun install` will not re-resolve. |

3. **State that no core-server test fixture needs changing, and say how that was established** — because a reader who has just done the `liq-projects` section (three fixtures) will assume otherwise. `test/test-basic.js:54` and `test/test-integration-quick.js:61` assert only `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-projects`. `test/README.md:111` is prose, not an assertion.

4. **Document the two edits that remove work from core-server. This is the part unique to this slice.**

   `sdlcforge/core-server/bun.lock:1776` records `@liquid-labs/plugable-projects-audit/@liquid-labs/http-smart-response` resolving to `@liquid-labs/http-smart-response@file:.yalc/@liquid-labs/http-smart-response`. That entry exists **only** because this donor declared the dependency as a `file:.yalc/…` spec in its published `1.0.0-alpha.2` (this plan's phase 11 fixes the donor; core-server's lock still carries the old resolution until the swap). `@liquid-labs/plugable-express` declares the same package at the registry range `^1.0.0-alpha.6`, and `@sdlcforge/dev-core` will too.

   So, once this dependency is removed:

   - `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` array drops `"@liquid-labs/http-smart-response"`, going from three entries to two (`plugable-express` and, until `liq-projects` is also swapped, `liq-projects`). Its header comment (line 8) and its error text (line 79), both of which name this package explicitly as the source of the transitive resolution, lose that clause.
   - `AGENTS.md:60`'s statement that "`bun.lock` currently resolves three packages via `file:.yalc/…`: two direct … plus one transitive … pulled in by `@liquid-labs/plugable-projects-audit`'s own pinned dependency" becomes false and must be updated. That paragraph explicitly asks the reader to "re-derive it with `grep -n 'file:\.yalc' bun.lock` when in doubt" and to "keep `scripts/provision-local-deps.sh`'s own `REQUIRED_YALC_PACKAGES` list in sync" — so give the executing agent that command.

   Say plainly that this is a **simplification**, so it is not mistaken for a regression when the yalc package count drops.

5. **State the atomicity requirement, with both exact error strings.** Removing this donor and adding dev-core must happen in one change. There are **two distinct** failure modes, and the handoff must name both because they look nothing alike:

   - **Both loaded at once** → duplicate registration. `plugable-express` throws, it does not silently shadow (correction **C1**): `Path variable '<name>' is already registered.` (`src/lib/path-var-registry.mjs:28-34`), which fires first because `loadPlugin` runs `setup` eagerly; or `Non-unique command path: projects/audit` (`src/lib/register-handlers.js:130-132`).
   - **This donor left in `explicitPlugins` while `liq-projects` is removed** → `Unknown variable path element type 'projectName' while processing path projects/:projectName/audit.` (`src/lib/path-to-re.mjs:14-19`). This is correction **C14**: two of this donor's four paths use the `projectName` path var, which **only** the `projects` submodule's `setup` registers. This failure mode is specific to this donor and exists in no sibling handoff section.

6. **State the endpoint-provenance change** (D5): every one of these four endpoints' recorded `npmName` becomes `@sdlcforge/dev-core` instead of `@liquid-labs/plugable-projects-audit`. Visible in `/server/plugins/list`, in the generated API spec, and in `help` output. Harmless at runtime; it changes golden snapshots if any exist.

7. **State what does *not* need to change, and why**, so the executing agent does not go looking:
   - **`app.ext._liqProjects` is preserved verbatim** (D7). Both of this donor's library functions call `app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)`; the key, the object, and the method are unchanged by the consolidation.
   - **`sdlcforge/core-cli/docs/projects.md` needs no edit.** It is generated CLI reference documentation that already interleaves all four audit endpoints with `liq-projects`'s under one `/projects` page and carries no package provenance. Because every `path` and every `help` string is preserved byte-identically, it regenerates identically. Mention it only so its appearance in a `grep` does not look like a missed touch-point.
   - **No `app.ext` key, route, method, parameter, or help string changes.**

8. **Give an honest consumer inventory.** `@sdlcforge/core-server` is the **only** consumer anywhere in the playground — verified by a playground-wide grep across every `package.json`, `*.mjs`, `*.js`, `*.md`, `*.yaml`, and `*.sh` outside `node_modules/`, `dist/`, `test-staging/`, and lockfiles. D10's single-dependent claim **holds** for this donor (unlike `liq-orgs`, correction **C2**). Say so explicitly rather than leaving it implied.

9. **Disclose the inherited defects in the handoff too, briefly**, with a pointer to dev-core's fuller documentation (written by task 002). A consumer swapping packages deserves to know that two endpoints advertise a parameter they ignore, that one parameter's help text is missing because of a `dascription` typo, and that an unknown project name returns a 500 rather than a 404. None of this changes across the swap — it is inherited, not introduced — and saying so prevents it from being attributed to the consolidation.

## Validation

- **The section exists and is complete.** `docs/consumer-migration.md` contains a `plugable-projects-audit` section naming all seven touch-points of requirement 2, each with a file path.
- **Sibling sections are untouched.** `git diff` on `docs/consumer-migration.md` shows only additions (plus, if the file did not exist, its creation). No sibling section's text is modified or reordered.
- **Every cited path and line is real.** For each of the seven files, confirm the path exists in `/Users/zane/playground/sdlcforge/core-server` and that the named string is actually at or near the cited line. A handoff with a stale citation is worse than none. Report any that have moved.
- **Both error strings are quoted verbatim** and each is attributed to its source file and line in `plugable-express`. Verify them against `/Users/zane/playground/liquid-labs/plugable-express/src/lib/path-var-registry.mjs`, `src/lib/register-handlers.js`, and `src/lib/path-to-re.mjs` rather than copying them from this document.
- **The `REQUIRED_YALC_PACKAGES` claim is verified, not assumed.** `grep -n 'file:\.yalc' /Users/zane/playground/sdlcforge/core-server/bun.lock` returns the entries this task describes, and line 1776 attributes the `http-smart-response` resolution to this donor. If the lock has changed since plan-authoring, describe what it actually says and report the difference.
- **No edit was made in any consumer repository.** `git status` in `/Users/zane/playground/sdlcforge/core-server` is unchanged by this task. This task writes one file, in dev-core.
- **Scope.** `git diff --name-only` in dev-core lists exactly `docs/consumer-migration.md`.

## Assumptions

- **Cross-repository commit mechanics.** As in task 002: the task's own worktree is a `plugable-projects-audit` worktree, the edit lands in the dev-core checkout on a dedicated `task/…` branch, and the branch and commit SHA are reported for a manager/user merge.
- This task depends only on `liq-projects` phase 1 task 001 (for the contract doc and dev-core's identity), **not** on this plan's phase 12 task 002 and not on any sibling's absorb having landed. It is written to create-or-extend so ordering against the sibling handoff tasks does not matter.
- It reads `core-server` but never writes to it. Executing the migration is `core-server-domain-consolidation`'s job (D9, D11).
- Line numbers drift as sibling sections' edits land in core-server; cite them as "at or near" and verify the strings, not the numbers.

## References

- `plan/notes/plugable-projects-audit-source-inventory.md` — **A6** the full consumer inventory including the `REQUIRED_YALC_PACKAGES` finding and the `core-cli` non-touch-point, **A8** the inherited defects, **C14**.
- `/Users/zane/playground/sdlcforge/core-server/src/lib/app-init.mjs`, `package.json`, `AGENTS.md`, `scripts/provision-local-deps.sh`, `docs/architecture/plugin-loading-tiers.md`, `test/README.md`, `bun.lock` — the seven touch-points; read them, do not trust the line numbers here.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/path-var-registry.mjs`, `src/lib/register-handlers.js`, `src/lib/path-to-re.mjs` — the three throws quoted in requirement 5.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-05-liq-orgs-migration/003-extend-consumer-migration-handoff.md` — the sibling section to match in structure and voice.

## Checkpoint hints

- After the seven touch-points and both error strings have been re-verified against live source, before writing.
- After the section is written, with the sibling-sections-untouched diff check run.
