# Verify Dev-Core Absorption

## Purpose and scope

**Reads two repositories and modifies neither**: `plugable-projects-audit` (`/Users/zane/playground/liquid-labs/plugable-projects-audit`, this task's own repository) and `sdlcforge/dev-core` (`/Users/zane/playground/sdlcforge/dev-core`).

The read-only gate on phase 13. Confirm that `@sdlcforge/dev-core` actually carries everything `@liquid-labs/plugable-projects-audit` had, **before** anything irreversible happens — a superseded notice pointing at a package that does not yet carry the code is actively misleading, and `npm publish`/`npm deprecate` cannot be undone.

**This task edits nothing.** Its only output is a verdict, plus the evidence for it recorded in this task document's status notes. On any gap: **halt and report**; do not fix, do not proceed, do not "note it for later".

## Requirements

Run every check. Record each result — including the passes — so a later reader can see what was actually verified rather than inferring it from the absence of complaints.

1. **File census.** In dev-core, `git ls-files src/projects-audit` returns exactly **10** paths:

   ```
   src/projects-audit/index.mjs
   src/projects-audit/handlers/index.mjs
   src/projects-audit/handlers/audit.mjs
   src/projects-audit/handlers/audit-fix.mjs
   src/projects-audit/handlers/audit-fix-implied.mjs
   src/projects-audit/handlers/audit-implied.mjs
   src/projects-audit/handlers/_lib/audit-fix-lib.mjs
   src/projects-audit/handlers/_lib/audit-lib.mjs
   src/projects-audit/handlers/_lib/audit-lib.test.mjs
   src/projects-audit/handlers/_lib/common-audit-path-parameters.mjs
   ```

   Compare against the listing phase 12 task 001 recorded (11 entries, minus the root `src/index.mjs`), not against this number alone.

2. **Content identity.** For each of the nine relocated files, the content in dev-core is byte-identical to this repository's post-restructure content. `diff` them directly:

   ```bash
   for f in $(cd /Users/zane/playground/liquid-labs/plugable-projects-audit && git ls-files src/projects-audit); do
     diff -q "/Users/zane/playground/liquid-labs/plugable-projects-audit/$f" "/Users/zane/playground/sdlcforge/dev-core/$f" || echo "DRIFT: $f"
   done
   ```

   `src/projects-audit/index.mjs` exists on both sides and should also match.

3. **The C17 gate — dev-core's aggregator survived.** This is the check the whole phase exists to make, and it must be run explicitly rather than inferred from a green build:
   - `src/index.mjs` in dev-core is the aggregator, **not** a one-line `export * from './projects-audit'`.
   - It imports **every** landed submodule (`./projects`, `./orgs`, `./work`, `./projects-audit` — whichever have been absorbed) and exports a composite `setup`.
   - `node -e "const m=require('./dist/dev-core.js'); console.log(m.handlers.length, typeof m.setup)"` reports a handler count consistent with all landed submodules and `typeof setup === 'function'`.

   **A `typeof setup` of `undefined`, or an `src/index.mjs` that is a single re-export line, means correction C17 fired during phase 12 task 002.** Halt immediately and report it as a data-loss event, not a gap.

4. **Route parity — all 4, byte-identical.** Read the route list off dev-core's built bundle and compare mechanically against the four this package serves:

   | method | `path` | `help.name` |
   |---|---|---|
   | `put` | `['projects', ':projectName', 'audit-fix']` | Project audit fix (named) |
   | `put` | `['projects', 'audit-fix']` | Project audit fix (implied) |
   | `get` | `['projects', ':projectName', 'audit']` | Project audit (named) |
   | `get` | `['projects', 'audit']` | Project audit (implied) |

   Also compare each handler's `parameters` array — including the two *implied* variants' spurious `projectName` entry and the `dascription`-keyed `removePackages` object, both of which are **expected** (they are inherited defects, deliberately unfixed; their *absence* would mean someone "cleaned up" during the migration, which is a D11 violation to report).

   Reading off the bundle needs no path-var registry and so works regardless of which other submodules have landed (**C14**).

5. **Setup contract — the absence is the contract.** Confirm dev-core's composite setup list contains **no** `projects-audit` entry, and that `grep -n 'projects-audit' src/index.mjs` shows only an import and a handler spread. This submodule has no `setup` (D6 item 4); an entry appearing here means one was invented.

6. **If `src/projects/` has landed, additionally verify the cross-submodule dependency is satisfied** (**C14**): register the merged plugin against a stub app and confirm the two `:projectName` paths process without throwing `Unknown variable path element type 'projectName' …`. If `src/projects/` has **not** landed, record that this check was **unavailable**, and say so in the verdict rather than passing it silently.

7. **Dependency state.** In dev-core's `package.json`:
   - `npm-check-plus` is present at `^1.0.0-alpha.5`.
   - `@liquid-labs/npm-toolkit` is present exactly once, at `^1.0.0-alpha.21` (not lowered to `^1.0.0-alpha.17`).
   - `@liquid-labs/http-smart-response` is present exactly once, at `^1.0.0-alpha.6`.
   - `http-errors` is present at `^2.0.0`.
   - `grep -n 'file:' package.json` returns **nothing** (**C13**), and `grep -c '\.yalc' package-lock.json` is 0.

8. **No donor artifact leaked.** In dev-core: `git ls-files | grep '^plan/'` returns nothing (**C4**); `git ls-files | grep 'make/50-plugable-projects-audit-js.mk'` returns nothing; `git ls-files src/index.js` returns nothing; `grep -rn '@liquid-labs/plugable-projects-audit' src` returns nothing.

9. **History preserved.** `git log --follow -- src/projects-audit/handlers/_lib/audit-lib.mjs` in dev-core reaches pre-plan `plugable-projects-audit` commits — `7d797ba` and `d553791` are good anchors. Repeat for `src/projects-audit/handlers/audit.mjs`. A `--follow` that stops at the merge is a gap.

10. **dev-core is buildable and no worse than before.** `make build` produces `dist/dev-core.js`; `make test` shows this donor's suite present and passing (`src/projects-audit/handlers/_lib/audit-lib.test.mjs`, 1 test) and **no new failures** beyond the known inherited `SlowBuffer` set (**C15**); `make lint` has no new findings.

11. **Documentation exists.** dev-core's README/`docs/` describe the 4 routes, what "audit" means here (npm dependency auditing, *not* policy/compliance), the `X-CWD` mechanism behind the implied variants, the no-`setup`/`projectName`-dependency relationship (**C14**), and the four inherited defects. A missing route table is a gap; a missing defect disclosure is a gap.

12. **The consumer handoff exists.** `docs/consumer-migration.md` in dev-core contains this donor's section, naming the seven core-server touch-points, both error strings, and the `REQUIRED_YALC_PACKAGES` simplification.

## Validation

- **Every check in `## Requirements` was run, and its actual output is recorded** in this task document's status notes — not summarised as "verified". The census listing, the route table read off the bundle, the `git log --follow` output, and the `grep` results are the evidence.
- **The verdict is explicit**: `PASS` (phase 13 may proceed) or `HALT` with the specific failing check named. There is no partial pass.
- **Nothing was modified.** `git status --short` in **both** repositories shows no change attributable to this task. `git diff` is empty in both. If a build was run in dev-core to produce `dist/dev-core.js`, note that `dist/` is a build artifact and confirm it is gitignored there rather than leaving an uncommitted tracked change.
- **Checks that could not be run are reported as unavailable, not as passes.** Requirement 6 in particular is expected to be unavailable if `src/projects/` has not landed; saying "pass" would be false.

## Assumptions

- Phase 12 has fully landed and merged: `src/projects-audit/**` present in dev-core, the dependency added, the aggregator wired, documentation authored, and the consumer handoff extended.
- `plugable-projects-audit` is at its post-restructure state (`src/projects-audit/…` in place, root `src/index.mjs` a thin re-export), so requirement 2's file-by-file `diff` compares like with like. If this repository has moved on since phase 12 task 001, `diff` against the commit task 001 produced rather than against `HEAD`.
- Reading the dev-core checkout is permitted; writing to it is not, and is not needed.
- dev-core is **not** expected to be green — it inherits `liq-projects`'s Node-26 `SlowBuffer` failures. Requirement 10's rule is "no new failures", and it needs the failing set that phase 12 task 002 recorded. If that record is missing, derive it by checking out dev-core's pre-merge commit and running `make test` there.

## References

- `plan/notes/plugable-projects-audit-source-inventory.md` — **A1** the route table and `parameters`, **A4** the path mapping, **A2** the dependency table, **A8** the inherited defects that must still be present, **A5**/**C17**, **C13**, **C14**, **C15**.
- `plan/phase-12-projects-audit-migration/001-restructure-src-into-dev-core-layout.md` — the recorded post-restructure census this task compares against.
- `plan/phase-12-projects-audit-migration/002-absorb-projects-audit-into-dev-core.md` — the recorded pre-merge failing-suite set and handler count.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-06-retire-liq-orgs/001-verify-dev-core-absorption.md` — the sibling gate to match in shape.

## Checkpoint hints

- After the census, content-identity, and C17 checks — the three that would halt the phase outright.
- After the route-parity, setup-absence, and dependency checks.
- After the build/test/lint, history, and documentation checks, with the verdict written down.
