# Rewrite README As Superseded Notice

## Purpose and scope

**Executes in the `liq-work` repository** (`/Users/zane/playground/liquid-labs/liq-work`), in this task's own worktree.

Rewrite `README.md` — and **only** `README.md` — so that anyone who lands on `@liquid-labs/liq-work` (on npm, on GitHub, or in a `node_modules` directory) immediately learns that it is superseded by `@sdlcforge/dev-core`, what to do about it, and what the honest state of the package is.

liq-work's existing README is the **best documentation any of the four donors has**: an accurate domain model, the complete 30-route table with its explicit/implied pairing, and a correct account of the `app.ext` couplings. Phase 8 task 002 ports that substance into dev-core. This task therefore *replaces* it rather than merely prepending a banner — but replaces it knowing the content lives on, and pointing at where.

## Requirements

1. **Lead with the supersession.** The first thing above the fold is a clearly-marked notice: this package is superseded by **`@sdlcforge/dev-core`**, which carries liq-work's entire source under its `src/work/` submodule with its git history preserved. No reader should have to scroll to learn this.

2. **State what the package did, briefly and accurately.** Keep the domain model — a "unit of work" is a `workKey`-identified, git-branch-scoped bundle tying GitHub issues to projects/repos through a lifecycle from creation to submission/merge, persisted by `WorkDB` to a single YAML file at `<serverConfigRoot>/work/work-db.yaml`. Two or three paragraphs, not the full existing treatment: the detailed version now lives in dev-core, and duplicating it here guarantees the two drift.

   Keep enough of the route summary that a reader can recognise whether their code called this package: **30 routes** under `/work`, ten lifecycle operations each with an explicit (`/work/:workKey/<op>`) and implied (`/work/<op>`) variant except `start` and `resume` which are explicit-only, plus the nested `issues` and `projects` sub-collections. A compact summary, not the full table.

3. **Give migration instructions.** For each kind of consumer:
   - **Server operators / `plugable-express` hosts**: replace the `@liquid-labs/liq-work` dependency and its `explicitPlugins` entry with `@sdlcforge/dev-core`. **The swap must be atomic** — loading both at once does not shadow, it crashes at startup with `Path variable 'workKey' is already registered.` Say so in one sentence and give the string.
   - **Route consumers**: no change. All 30 routes keep their exact paths and methods under dev-core.
   - **`work-db.yaml` holders**: no data migration. `app.ext.constants.WORK_DB_PATH` keeps its name and its `<serverConfigRoot>/work/work-db.yaml` value, so an existing database is read by dev-core unchanged.
   - Point at `@sdlcforge/dev-core`'s `docs/consumer-migration.md` for the exact per-file edits.

4. **Inventory the known consumers honestly.** For liq-work this is **one** npm dependent: `@sdlcforge/core-server`, via a registry range `^1.0.0-alpha.9` (not a `file:.yalc/` link). Verified by a playground-wide `package.json` grep. **Do not** copy liq-orgs's three-dependent wording — that was that package's situation (correction C2), not this one. Note also that **no other donor and no sibling participant imports liq-work**, so nothing else needs to move.

5. **Disclose the Node ≥ 24 breakage.** This is the single most useful thing the notice can tell someone who finds this package and tries to use it: `dist/liq-work.js` **cannot be `require`d on Node ≥ 24**. `buffer-equal-constant-time` dereferences `SlowBuffer`, removed from `node:buffer` in Node 24, reached through `github-toolkit → octocache → octokit → @octokit/auth-app → jsonwebtoken → jws → jwa`.

   State it plainly and state its scope honestly: it is **pre-existing**, **not caused by the retirement**, and **inherited by `@sdlcforge/dev-core`** — so migrating does not fix it. Say what the remedies are (an npm `overrides` pin; an upgrade past `@liquid-labs/octocache`'s `octokit ^2.0.14` ceiling; a runtime `SlowBuffer` polyfill) without claiming any of them has been done. A superseded notice that quietly omits "this does not run on current Node" would be a disservice.

6. **Note what changes for anyone reading the API spec.** Every `/work` endpoint's recorded `npmName` becomes `@sdlcforge/dev-core`. Harmless at runtime, visible in generated specs and `help` output.

7. **Remove content that becomes wrong or misleading**, specifically:
   - The "Modernization status" section's speculation about a possible future merge — that merge is what happened; say so.
   - The claim that `app.ext.integrations` is "registered by `liq-integrations`". It is now set by the framework: `plugable-express/src/app.js:112`. If you keep any of the runtime-dependency discussion, correct this; if you cut the section, say in the report that the corrected version lives in dev-core's docs.
   - Anything phrased in the present tense as though the package were actively maintained.

8. **Touch only `README.md`.** No `package.json` change (that is task 9-003), no version bump, no source change, no test change, no `Makefile` change.

## Validation

- **Only `README.md` changed.** `git status --porcelain` and `git diff --stat` show exactly one modified file.
- **The supersession is unmissable.** The package name `@sdlcforge/dev-core` appears within the first few lines of the rendered document.
- **Every factual claim is checkable and checked**: the 30-route count, the single npm dependent, the `WORK_DB_PATH` value, the exact `Path variable 'workKey' is already registered.` string, and the `SlowBuffer` chain. Re-verify each against source or by running the command rather than copying it from this task document, and note in the report that you did.
- **No stale claim survives.** `grep -n "liq-integrations\|Modernization status\|merge candidate" README.md` returns nothing, or returns only text that has been corrected. `grep -n "liq-projects-lib" README.md` returns nothing (the dependency is gone as of phase 7 task 002).
- **The links resolve.** Any link to `@sdlcforge/dev-core`, its repository, or its `docs/consumer-migration.md` points at a real location. If dev-core is not yet published to npm, link the GitHub repository rather than a registry page that 404s, and say which you did.
- **The build still works.** `make build` and `make lint` still pass — a README edit cannot break them, but confirming costs nothing and catches an accidental stray edit.
- **`make test`'s failure set is unchanged** (the known `SlowBuffer` failure only).

## Metadata

architectural_impact: false

## Assumptions

- **Phase 9 task 001 passed.** This notice asserts that dev-core carries the code; writing it before that is verified would publish a false claim. If 001 halted, this task must not start.
- **This task is parallel-eligible with task 9-003** (disjoint files: `README.md` vs `package.json`), but both land in `liq-work`, so they need separate task worktrees and a merge order. Task 9-004 runs after both, so the published tarball carries both changes.
- **`src/` is not stripped and no shim is published** (D10). Retirement is a labelled final release, not a deletion — stripping `src/` would break any server still loading the old package, and a re-export shim would crash a server that loaded both.
- **GitHub repository archival is not performed here.** It is an explicit user decision, recorded as a follow-up by task 9-004.
- The existing README's substance is being preserved in `@sdlcforge/dev-core` by phase 8 task 002. If that port did not happen, say so in the report — but still write the notice, and point at the dev-core source tree rather than at documentation that does not exist.

## References

- `plan/notes/liq-work-source-inventory.md` — **W6** the single-dependent consumer inventory, **W1** the route summary, **W7** the `app.ext` contracts and the two README corrections, **W5** the Node ≥ 24 defect and its dependency chain.
- `/Users/zane/playground/liquid-labs/liq-work/README.md` — the document being replaced; its domain-model section is accurate and worth preserving in condensed form.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-06-retire-liq-orgs/002-author-readme-superseded-notice.md` — the sibling task; match its tone and structure, but **not** its consumer inventory.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D10**, the retirement policy.

## Checkpoint hints

- After confirming phase 9 task 001 passed and re-verifying the factual claims in requirements 2, 4, and 5.
- After the draft is complete, before removing the stale sections in requirement 7 — so the removal is a visible, separable step in the diff.
- After `make build`/`make lint` confirm nothing else moved.
