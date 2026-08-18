# Extend Consumer Migration Handoff

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `liq-work`.

Extend `docs/consumer-migration.md` with the `liq-work` section: every exact edit `@sdlcforge/core-server` must make to stop loading `@liquid-labs/liq-work` and start getting the same routes from `@sdlcforge/dev-core`, why the swap must be atomic, what a non-atomic swap looks like when it fails, and what is guaranteed **not** to change.

**This task does not edit `core-server`.** Per D11 this plan-group produces handoff specs; the `core-server-domain-consolidation` plan-group executes them. Writing a spec precise enough that its executor never has to re-derive anything is the whole deliverable.

The document is created by `liq-projects` phase 2 task 003 and extended by `liq-orgs` phase 5 task 003. This task is written to **create-or-extend**: if `docs/consumer-migration.md` does not exist yet, create it with the same structure those tasks would have used and note in the report that you did.

## Requirements

1. **Name the exact edits, with file and line.** Verified at plan-authoring time against `core-server` at its current `main`:

   | File | Line | Current | Action |
   |---|---|---|---|
   | `package.json` | 48 | `"@liquid-labs/liq-work": "^1.0.0-alpha.9"` | **remove** — a registry range, **not** a `file:.yalc/` link (same shape as liq-orgs, unlike liq-projects) |
   | `src/lib/app-init.mjs` | 39 | `'@liquid-labs/liq-work',` in `explicitPlugins` | **remove** — replaced by the single `@sdlcforge/dev-core` entry |
   | `docs/architecture.md` | 23, 51 | narrative mentions in the plugin-tier description | update |
   | `docs/architecture/plugin-loading-tiers.md` | 58 | row 6 of the explicit-plugin table ("Unit-of-work management…") | update |
   | `test/README.md` | 110 | `- @liquid-labs/liq-work` in the expected-packages list | update |
   | `CLAUDE.md` | 49 | narrative mention | update |

   State explicitly that **no `core-server` test fixture names `liq-work`** — unlike `liq-projects`, which has three. A reader who assumes symmetry across the four donors will look for fixtures that do not exist.

   Re-verify each line number before writing them down; `core-server` is an active repository and lines drift. If a location has moved, record the new one and say the document was re-verified.

2. **State the atomicity requirement with the exact failure string.** Removing `@liquid-labs/liq-work` and adding `@sdlcforge/dev-core` must land in **one** change. Loading both simultaneously does **not** silently shadow — it **crashes the server at startup**, and for `liq-work` specifically the first error is:

   ```
   Path variable 'workKey' is already registered.
   ```

   thrown from `plugable-express/src/lib/path-var-registry.mjs:28-34`. It fires **before** any route-level error, because `load-plugins.js:29` invokes each plugin's `setup` eagerly while deferring handler registration into `app.ext.pendingHandlers`. Had it not fired, the next error would have been `Non-unique command path: work/:workKey/build` (or whichever `/work` path registered first) from `register-handlers.js:129-131`.

   Name both strings verbatim so the failure is recognisable on sight, and say plainly that this is a **loud** failure, not a silent one — this corrects `dev-core-target-shape.md`'s original D10 wording (correction C1) and is the practical reason the swap is safe to attempt: you cannot get it half-right and not notice.

3. **State the provenance change.** Every `/work` endpoint's recorded `npmName` becomes `@sdlcforge/dev-core` instead of `@liquid-labs/liq-work` (D5 — `plugable-express` takes plugin identity from the *package*, never from the module's `name`/`summary` exports, so liq-work's inert `name = 'core-work'` was never visible anyway). This is harmless at runtime but **visible** in the server's generated API spec and `help` output, so `core-server`'s golden-API-spec snapshot must be re-verified rather than assumed unchanged.

4. **State what is guaranteed not to change**, so the executor knows what they do *not* need to touch:
   - All **30** `/work` routes keep their exact `path` arrays and methods, including the explicit/implied pairing and both nested `issues`/`projects` sub-collections. `start` and `resume` remain explicit-only.
   - `app.ext.constants.WORK_DB_PATH` keeps its name and its `<serverConfigRoot>/work/work-db.yaml` value — so any existing `work-db.yaml` on disk is read by dev-core exactly as before, with no data migration.
   - The `workKey` path var keeps its name, its `validationRe`, and its lazy `optionsFetcher`.
   - `liq-work` had **no** non-npm consumers reading an `app.ext._liqWork`-style key — it is purely a *reader* of other plugins' contracts (`_liqProjects`, `credentialsDB`, `integrations`), never a publisher of one besides `WORK_DB_PATH`. So nothing outside `core-server` needs any change at all.

5. **Correct one stale claim in `core-server`'s own source.** `src/lib/test/golden-api-spec.test.js:44` carries a comment naming `liq-work` among packages that "still read `app.ext.serverHome`". **liq-work does not** — `grep -rn "serverHome" src/` in liq-work returns nothing, and `setup.mjs:6` reads `app.ext.serverConfigRoot`. liq-work was migrated by an earlier plan and the comment is stale. Say so, so that the executor does not spend time on a non-problem or, worse, "fix" working code.

6. **Disclose the Node ≥ 24 breakage honestly.** `@liquid-labs/liq-work`'s built bundle **cannot be `require`d on Node ≥ 24** — `buffer-equal-constant-time` dereferences `SlowBuffer`, removed from `node:buffer` in Node 24 — reached through `github-toolkit → octocache → octokit → @octokit/auth-app → jsonwebtoken → jws → jwa`. This is **pre-existing, environment-wide, and inherited by dev-core** (it already affects the `projects` submodule). It is not caused by the consolidation and is not fixed by it.

   The executor must know this because it changes what "the swap worked" can even mean: on Node ≥ 24 the explicit-plugin set does not fully load either before **or** after the swap, so a startup smoke test cannot be the acceptance criterion. Point at the existing `core-server` follow-ups `ynGa`, `26sW`, and `HHGR`, which record the same *category* of startup-blocking defect, and say that this one is distinct from them (`SlowBuffer`, not `serverHome`/`pathResolvers`).

7. **Say what this document is not.** It specifies edits; it does not make them. Name `core-server-domain-consolidation` as the owning plan-group and note that the four donors' entries should be executed **together**, as one atomic swap of four `explicitPlugins` entries for one, rather than four separate changes — because the intermediate states are exactly the crashing configurations requirement 2 describes.

## Validation

- **Every claim is traceable.** Each file/line reference in requirement 1 was re-verified against `core-server`'s working tree during this task, with the verification commands recorded in the task report. A line number copied from this task document without re-checking is a defect.
- **The document is executable without further research.** A reader with no access to this plan can perform the `liq-work` portion of the migration from `docs/consumer-migration.md` alone: they know which lines to remove, what to add, the ordering constraint, the exact error strings, and what to re-verify afterward.
- **Both error strings appear verbatim**, attributed to their source files and line numbers, and framed as a **crash** rather than as shadowing.
- **It composes with the existing sections.** If `liq-projects` and/or `liq-orgs` sections already exist, this task's section matches their structure and heading depth, and the document has a single coherent introduction and a single combined "one atomic swap" statement rather than three competing ones. If this task creates the file, its structure anticipates the other donors' sections.
- **No `core-server` file was modified.** `git status --porcelain` in `/Users/zane/playground/sdlcforge/core-server` is clean; no branch and no commit was created there.
- **Only `docs/` changed in dev-core.** `git diff --stat` on the task branch touches `docs/consumer-migration.md` (and nothing under `src/`, `package.json`, or the build files).
- The `serverHome` correction (requirement 5) and the Node ≥ 24 disclosure (requirement 6) are both present and both stated as *corrections/disclosures*, not buried in prose.

## Metadata

architectural_impact: false

## Assumptions

- **Cross-repository commit mechanics.** Work on a dedicated branch in the dev-core checkout (e.g. `task/extend-consumer-migration-handoff-work`) and report the branch and commit SHA; merging is a manager/user step. If a git operation is refused by the environment's agent-scope guard, halt and report the exact command.
- **This task is parallel-eligible with task 002**, and depends only on `liq-projects` phase 1 task 001 (the contract doc) — not on liq-work's absorption having landed, since it describes edits to a *consumer*, not the absorbed code. Both operate in the dev-core checkout, so use a separate task worktree from 002's.
- **`docs/consumer-migration.md` may not exist yet.** Create-or-extend, and say which you did.
- **Do not edit `core-server`.** Reading it — including running `grep` and `git log` in its checkout — is expected and necessary; writing to it is out of scope under D11.
- Line numbers in requirement 1 were verified at plan-authoring time and are given as a starting point, not as gospel.

## References

- `plan/notes/liq-work-source-inventory.md` — **W6** the full consumer inventory with file/line detail, **W7** the `app.ext` census and the `serverHome` correction, **W5** the Node ≥ 24 defect, **W1** the 30-route table.
- `/Users/zane/playground/sdlcforge/core-server/src/lib/app-init.mjs` — the `explicitPlugins` array (liq-work at line 39).
- `/Users/zane/playground/sdlcforge/core-server/package.json` — the dependency entry (line 48).
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/path-var-registry.mjs` and `src/lib/register-handlers.js` — the two throw sites whose messages requirement 2 quotes.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-05-liq-orgs-migration/003-extend-consumer-migration-handoff.md` — the sibling task; match its structure.
- `/Users/zane/playground/sdlcforge/core-server/plan/plan-summary-modernization-foundation.md` and `plan-summary-bun-conversion.md` — follow-ups `ynGa`, `26sW`, `HHGR`, the related-but-distinct startup defects requirement 6 distinguishes this one from.

## Checkpoint hints

- After re-verifying every file/line reference in requirement 1 against `core-server`'s working tree.
- After the `liq-work` section is drafted, with both error strings and the atomicity statement in place.
- After the `serverHome` correction and the Node ≥ 24 disclosure are added and the document reads coherently alongside any existing donor sections.
