# Mark Package Deprecated And Bump Version

## Purpose and scope

**Executes in the `liq-work` repository** (`/Users/zane/playground/liquid-labs/liq-work`), in this task's own worktree.

Rewrite `package.json`'s `description` so the deprecation is visible in `npm view`, `npm search`, and the registry page — the places a reader sees *before* they ever open the README — and bump the version so the final labelled release is publishable.

`package.json` and nothing else.

## Requirements

1. **Rewrite `description` to lead with the deprecation.** The current value is accurate and long:

   ```
   Owns the "unit of work" concept: a cross-repo, git-branch-scoped bundle of effort tying together GitHub issues and projects/repos through a lifecycle from creation to submission/merge. Orchestrates issues (GitHub) and projects (liq-projects) rather than defining either itself.
   ```

   The replacement must **begin** with the deprecation (registry listings truncate) and then, briefly, say what the package did. Something in the shape of:

   ```
   DEPRECATED - superseded by @sdlcforge/dev-core. Owned the "unit of work" concept: a cross-repo, git-branch-scoped bundle of effort tying GitHub issues and projects/repos through a lifecycle from creation to submission/merge.
   ```

   Match the wording convention the sibling retirements used (`liq-projects` phase 3 task 003, `liq-orgs` phase 6 task 003) — read at least one of them and follow it rather than inventing a third style. Past tense for what it did.

2. **Bump `version` to `1.0.0-alpha.11`.** Verified at plan-authoring time: the local `package.json` is at `1.0.0-alpha.10` and npm's `latest` for `@liquid-labs/liq-work` is **also** `1.0.0-alpha.10` — the working tree matches the published release, so `alpha.11` is the next free version. **Re-check with `npm view @liquid-labs/liq-work versions --json` before writing it**; if something has been published in the meantime, take the next free version and say so in the report.

3. **Decide, explicitly, about the undeclared `http-errors`.** `http-errors` is imported by **16** modules in `src/` and is **not** in `dependencies`. It resolves today only because npm hoists it from `@liquid-labs/octocache` (whose own dependencies are `{ http-errors ^2.0.0, octokit ^2.0.14 }`). A dependency-tree change that stops hoisting it breaks this package at import time.

   This is a genuine latent defect in a package about to receive its **final** published release, and it is one line to fix (`"http-errors": "^2.0.0"`, the range every sibling uses). It is also, strictly, a dependency change that D11 fences off.

   **Recommendation: add it**, because the whole purpose of this phase is to leave a correct final artifact and because the change is provably behavior-neutral (the module is already resolved and already bundled; declaring it changes only whether resolution is guaranteed). But treat it as a **decision point**: state clearly in the report which you did and why, and if you add it, verify `make build` produces a byte-identical `dist/liq-work.js` before and after, which is the evidence that nothing changed.

   Do **not** touch the two declared-but-unused dependencies (`@liquid-labs/terminal-text`, `octokit`) — removing them is a real (if small) resolution change with no benefit to a deprecated package, and they are recorded as Wave 3/4 follow-ups.

4. **Change nothing else in `package.json`.** `name`, `main`, `scripts`, `engines`, `author`, `license`, `repository`, `bugs`, `homepage`, the `liq` block, and `devDependencies` all stay exactly as they are. `keywords` stays the empty array — do not add a `deprecated` keyword; `npm deprecate` (task 9-004) is the mechanism for that.

5. **Touch no other file.** No `README.md` change (that is task 9-002), no source change, no test change, no `Makefile` change. `package-lock.json` changes **only** if requirement 3 adds the dependency, in which case refresh it with `npm install` and commit it.

## Validation

- **The diff is minimal.** `git diff --stat` shows `package.json` (and, only if requirement 3 added the dependency, `package-lock.json`) and nothing else. `git diff package.json` shows exactly the `description` line, the `version` line, and at most the one added dependency line.
- **`version` is `1.0.0-alpha.11`** (or the next free version, if 2's re-check found otherwise), and it is **not** already published: `npm view @liquid-labs/liq-work@<new version>` reports it does not exist.
- **The description leads with the deprecation** and names `@sdlcforge/dev-core` within the first 80 characters, so a truncated registry listing still carries the essential information.
- **`make build` and `make lint` pass.** If requirement 3 added `http-errors`, `dist/liq-work.js` is **byte-identical** to the pre-change build (`shasum` before and after) — the evidence that declaring an already-resolved dependency changed nothing.
- **`make test`'s failure set is unchanged**: exactly the known `work-db.test.js` `SlowBuffer` `TypeError`, with every other suite passing. Record the summary line. `make qa` will therefore still fail on `test`; that is expected and is **not** a gate for this task (see `## Assumptions`).
- **`npm pack --dry-run` succeeds** and lists the expected file set, confirming the package is publishable before task 9-004 attempts it.
- **The `http-errors` decision is recorded** in the task report with its rationale, whichever way it went.

## Metadata

architectural_impact: false

## Assumptions

- **`make qa` cannot pass, because `make test` cannot pass.** `work-db.test.js` fails to load on Node ≥ 24 (`buffer-equal-constant-time` dereferences the removed `SlowBuffer`), a pre-existing environment-wide defect that also breaks 5 of `liq-projects`'s 8 suites and is flagged to the manager. The sibling retirement tasks gate on "`make qa` green"; **this one cannot and does not**. The gate here is *"the failure set is unchanged"*. Do **not** add an `overrides` entry, a `setupFiles` polyfill, or a `jest.mock` to force it green — that would be a real dependency change smuggled into a metadata task, and it would also make the final published artifact differ from every prior release in a way nobody reviewed.
- **`preversion` runs `npm run qa`.** Because `qa` fails, **do not use `npm version` to perform the bump** — edit the `version` field directly. Say so in the report so the reviewer understands why the usual command was not used.
- **This task is parallel-eligible with task 9-002** (disjoint files: `package.json` vs `README.md`), but both land in `liq-work`, so they need separate task worktrees and a merge order. Task 9-004 runs after both have merged, so the published tarball carries both.
- **Phase 9 task 001 passed.** A deprecation-bearing description asserts that a replacement exists; writing it before that is verified would publish a false claim.
- `npm publish` and `npm deprecate` are **not** attempted here — that is task 9-004.

## References

- `plan/notes/liq-work-source-inventory.md` — **W0** for the current package facts, **W3** for the `http-errors` finding and the two unused declared dependencies, **W5** for the `SlowBuffer` defect that makes `make qa` unattainable.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-06-retire-liq-orgs/003-mark-package-deprecated-and-bump-version.md` and the corresponding `liq-projects` phase 3 task 003 — the wording convention to match.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D10** step 3 (deprecation-bearing description, version bump) and **D11** (why the `http-errors` fix is a decision point rather than an automatic yes).

## Checkpoint hints

- After re-checking published versions and confirming `1.0.0-alpha.11` is free.
- After the `description` and `version` edits, before the `http-errors` decision.
- After the `http-errors` decision, with the `dist/liq-work.js` checksum comparison recorded if the dependency was added.
- After `make build`/`make lint` and `npm pack --dry-run`.
