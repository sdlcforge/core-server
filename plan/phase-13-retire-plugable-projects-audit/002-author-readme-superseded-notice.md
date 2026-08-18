# Author README As Superseded Notice

## Purpose and scope

**Executes in the `plugable-projects-audit` repository** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`).

Create `README.md` — **this package has never had one** — as its superseded notice, per D10 step 2.

D10 says "README.md rewritten as a superseded notice". There is nothing to rewrite here, and `package.json`'s `description` is the empty string, so there is no prior prose anywhere to inherit either. This is the only description this package will ever have, and it has to say what the package *did* before it can meaningfully say what supersedes it. Same situation the `liq-orgs` slice faced.

Scope is exactly one file: `README.md`. **No `package.json` change** (that is task 003 — the `description`, the version, and the `files` allowlist), no source change, no test change, no `Makefile` change, no `.gitignore` change.

## Requirements

1. **Lead with the supersession.** A banner at the very top: this package is superseded by **`@sdlcforge/dev-core`**, which now serves these endpoints. Someone landing here from npm or from a GitHub search must learn that in the first two lines, not in a section further down.

2. **Say accurately what the package did** — briefly, but enough that the notice is self-contained:
   - It was a `plugable-express` plugin providing **four endpoints for auditing and auto-fixing a project's npm dependencies**, wrapping `npm-check-plus`.
   - Be explicit that "audit" here means `npm audit` plus outdated/missing/extraneous dependency analysis, and **not** policy or compliance checking. The package name invites that misreading in a repository family that also contains `liq-controls`.
   - The four endpoints, as a table with methods and exact paths:

     | method | path | what |
     |---|---|---|
     | `GET` | `/projects/:projectName/audit` | audit the named project |
     | `GET` | `/projects/audit` | audit the implied project (from the `X-CWD` header) |
     | `PUT` | `/projects/:projectName/audit-fix` | fix audit issues in the named project |
     | `PUT` | `/projects/audit-fix` | fix audit issues in the implied project |

   - The *implied* variants resolved the project from the `X-CWD` request header and returned `400` when it was absent.

3. **Give migration instructions.** For a `plugable-express` server: remove `@liquid-labs/plugable-projects-audit` from `dependencies` and from `explicitPlugins`, and add `@sdlcforge/dev-core` — **in the same change**. Say why atomicity matters and give the observable failures, because the errors are unrecognisable otherwise:
   - Both loaded at once → `Path variable '<name>' is already registered.` or `Non-unique command path: projects/audit`. `plugable-express` **throws**; it does not silently shadow (correction **C1**).
   - This package loaded while `@liquid-labs/liq-projects` is gone → `Unknown variable path element type 'projectName' while processing path projects/:projectName/audit.` — because two of these four paths use the `projectName` path var, which was always registered by `liq-projects`'s `setup`, never by this package (correction **C14**).

   Also state that **every route, method, parameter, and help string is preserved byte-identically** in `@sdlcforge/dev-core`, so the migration is a package swap and not an API change. The one visible difference: each endpoint's reported `npmName` becomes `@sdlcforge/dev-core` (D5).

4. **Give an honest known-consumer inventory.**
   - **npm dependents: one.** `@sdlcforge/core-server`, via a registry range in `package.json` and one `explicitPlugins` entry. Verified by a playground-wide grep. D10's single-dependent claim **holds** for this package — unlike `@liquid-labs/liq-orgs`, which has three (correction **C2**). Do not copy a sibling's wording; state this package's own facts.
   - **Runtime coupling, not an npm dependency:** this package read `app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)`, published by `@liquid-labs/liq-projects`'s `setup`. That contract is preserved verbatim in `@sdlcforge/dev-core` (D7), so nothing else needs to change.

5. **Disclose the known defects that ship in this final release.** They are real, they are user-visible, and D11 forbade fixing them inside the consolidation; a final labelled release that hides them is worse than one that names them (source inventory **A8**):
   - The two *implied* endpoints declare a `projectName` parameter they cannot use — it is ignored, and the project comes from `X-CWD`.
   - `removePackages`'s help text is missing from the API spec, because its parameter object uses the key `dascription`.
   - An unknown project name produces a 500, not a 404.
   - Several typos are present in published help text (`Auidts`, `reomved`, `pacagkes`, `specificatinos`).

   State that these carry over into `@sdlcforge/dev-core` unchanged and are documented there, so nobody attributes them to the consolidation.

6. **Do not claim archival, and do not claim a publish that has not happened.** Repository archival is an explicit user decision recorded as a follow-up (D10 step 5), not something this plan performs. Task 004 attempts the publish and deprecation.

7. **Keep it short.** This is a signpost, not documentation for a package nobody should use. The sibling notices are the length model.

## Validation

- **`README.md` exists** and did not before: `git log --oneline -- README.md` shows only this task's commit.
- **Scope is one file.** `git diff --name-only` (against the task's base) lists exactly `README.md`.
- **The banner is first.** The supersession and the name `@sdlcforge/dev-core` appear within the first three lines of the file.
- **All four endpoints are listed** with correct methods and exact paths. Verify each against `src/projects-audit/handlers/*.mjs`'s `path`/`method` exports — or, better, against the built bundle — rather than copying the table above.
- **Both error strings are quoted verbatim** and are correct. Verify against `/Users/zane/playground/liquid-labs/plugable-express/src/lib/path-var-registry.mjs`, `src/lib/register-handlers.js`, and `src/lib/path-to-re.mjs`.
- **The consumer inventory says "one npm dependent" and names it.** It does not repeat `liq-orgs`'s three-dependent wording.
- **All four defects of requirement 5 are disclosed.**
- **No forward-looking claim is false.** The notice does not say the package is archived, does not say a final version has been published, and does not name a `@sdlcforge/dev-core` version number that does not exist yet.
- **Green is unaffected.** `make build`, `make test` (1 suite / 1 test), and `make lint` still pass — a README cannot break them, but confirm, because this task runs in a fresh worktree and a failure here would mean phase 11 did not merge into the task's base.
- **Markdown links resolve.** Any relative link in the file points at something that exists.

## Assumptions

- Phase 13 task 001 returned `PASS`. Writing a notice that points at `@sdlcforge/dev-core` before dev-core demonstrably carries the code is exactly what that gate exists to prevent.
- Phase 11 has merged into this task's base, so `make test` can pass in a fresh worktree.
- This task and task 003 are parallel-eligible: they touch disjoint files (`README.md` vs `package.json`). Both land in this repository, so they need separate task worktrees and a merge order.
- npm will include `README.md` in the tarball automatically; it does not need to be named in task 003's `files` allowlist, and adding it there would be harmless but redundant.

## References

- `plan/notes/plugable-projects-audit-source-inventory.md` — **A0** what the package is, **A1** the route table, **A6** the consumer inventory, **A8** the defects to disclose, **C14**.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D5**, **D7**, **D10**.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-06-retire-liq-orgs/002-author-readme-superseded-notice.md` — the closest sibling: the other donor with no README to rewrite.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/path-var-registry.mjs`, `src/lib/register-handlers.js`, `src/lib/path-to-re.mjs` — the error strings.

## Checkpoint hints

- After the route table and both error strings have been verified against live source, before writing.
- After the notice is written, with the scope and green checks run.
