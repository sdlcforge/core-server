# Verify Dev-Core Absorption

## Purpose and scope

**Executes in the `liq-orgs` repository** (`/Users/zane/playground/liquid-labs/liq-orgs`), and **reads** the `sdlcforge/dev-core` checkout (`/Users/zane/playground/sdlcforge/dev-core`) without modifying it.

The read-only gate for phase 6. Confirm that `@sdlcforge/dev-core` actually carries everything `@liquid-labs/liq-orgs` had — every file, every route, every path var, every setup method, every dependency, and the git history — **before** anything irreversible or misleading happens. Everything after this task is either irreversible (`npm publish`, `npm deprecate`) or actively wrong if premature (a superseded notice pointing at a package that does not yet carry the code).

**This task edits nothing.** It produces a verdict and a report. On any gap, it **halts the phase** and reports precisely what is missing rather than attempting a repair — repairs belong to phase 5, re-run.

## Requirements

1. **Verify the file census.** Every path in the mapping is present under dev-core's `src/orgs/`, and nothing is missing:

   | Expected in dev-core |
   |---|
   | `src/orgs/index.mjs` |
   | `src/orgs/setup.mjs` |
   | `src/orgs/handlers/index.js` |
   | `src/orgs/handlers/create.mjs` |
   | `src/orgs/handlers/list.mjs` |
   | `src/orgs/handlers/parameters-detail.mjs` |
   | `src/orgs/handlers/parameters-list.mjs` |
   | `src/orgs/handlers/parameters-set.mjs` |
   | `src/orgs/handlers/_lib/parameters-lib.mjs` |
   | `src/orgs/resources/organization.mjs` |
   | `src/orgs/resources/lib/settings.mjs` |
   | `src/orgs/resources/lib/test/settings.test.mjs` |

   `git ls-files src/orgs` in dev-core returns exactly these 12 paths. Cross-check the *content* too: `diff -r` liq-orgs's `src/orgs/` against dev-core's `src/orgs/` must report no differences. (Phase 5 required no post-move content edit for this donor, so byte equality is the correct expectation — unlike the liq-projects slice, which had one forced edit.)

2. **Verify the route surface.** dev-core's built bundle registers all 5 `/orgs` routes with byte-identical `path` arrays and methods:
   - POST `['orgs', 'create', ':newOrgKey']`
   - GET `['orgs', 'list?']`
   - GET `['orgs', ':orgKey', 'parameters', ':parameterKey', 'detail']`
   - GET `['orgs', ':orgKey', 'parameters', 'list?']`
   - PUT `['orgs', ':orgKey', 'parameters', ':parameterKey', 'set']`

   Extract both lists mechanically and `diff` them; do not eyeball. Also confirm no `/orgs` route is registered **twice** in the merged handlers array — the aggregator building a fresh array from four submodules is exactly where an accidental duplicate would appear, and a duplicate would crash any server that loaded it.

3. **Verify the setup contract.** Against a stub `app`, dev-core's composite `setup`:
   - runs the `orgs` submodule setup **after** `projects` and **before** `work` (for whichever of those have landed);
   - calls `registerPathVar` for `newOrgKey` and `orgKey`, both with `validationRe` `(?:@|%40)[a-z][a-zA-Z0-9-]*`, and `orgKey` carrying an `optionsFetcher`;
   - pushes exactly three entries onto `app.ext.setupMethods`, in order, with names `prepare org dependencies` / `load orgs` / `process org setup` and `deps` `['!']` / *(none)* / `['*']` respectively;
   - and, when the first entry's `func({ app })` is invoked, sets `app.ext._liqOrgs` to `{ orgSetupMethods: [] }` — under exactly that key name.

   Additionally confirm `parameterKey` is registered when handlers are registered (it comes from `parameters-detail.mjs`'s `func`, not from `setup`), and that no path-var name is registered twice across the whole merged plugin.

4. **Verify the dependencies.** dev-core's `package.json` carries all 4 of liq-orgs's runtime ranges byte-identically: `@liquid-labs/dependency-runner ^1.0.0-alpha.8`, `@liquid-labs/liq-handlers-lib ^1.0.0-alpha.17`, `@liquid-labs/resource-model ^1.0.0-alpha.10`, `js-yaml ^4.1.0`. Confirm `package-lock.json` is consistent (`npm ci --dry-run` or equivalent) and that `@liquid-labs/playground-monitor` appears exactly once, at liq-projects's registry range — **not** at liq-orgs's stray `file:.yalc/…` value.

5. **Verify history preservation.** In dev-core, `git log --follow` on each of `src/orgs/setup.mjs`, `src/orgs/handlers/parameters-detail.mjs`, and `src/orgs/resources/lib/settings.mjs` reaches pre-plan liq-orgs commits — `d90bc23` ("Migrate to plugable-express registerPathVar API") is a good anchor for `setup.mjs`. A `--follow` that stops at the merge commit means history was lost and the absorption must be redone.

6. **Verify dev-core is green.** `make build`, `make test`, `make lint`, `make qa` all pass in the dev-core checkout, and `make test` includes the `src/orgs/resources/lib/test/settings.test.mjs` suite with its 37 tests. Record the observed suite and test counts.

7. **Verify the documentation landed.** dev-core's docs state the 5-route table, that an org is a project classified by `liq.packageType === 'org'`, the `app.ext._liqOrgs` `orgs`/`orgSetupMethods` contract and who reads/writes each, the three ordered setup methods, `parameterKey`'s handler-registration mechanism, and the known-broken-endpoint disclosure. This is a gate, not a nicety: phase 6 task 002 writes a superseded notice that *points readers at dev-core*, and pointing them at undocumented code would be a worse outcome than the status quo.

8. **Produce a verdict.** The report states, per numbered requirement, pass or fail with the evidence (command run, output observed). Any failure ⇒ **halt the phase** and name the specific gap and which phase 5 task owns fixing it. Do not proceed to a partial pass.

## Validation

- Every requirement above has a recorded command and its actual output in the task report — not a claim, an observation. A requirement marked "pass" without evidence is a failed verification.
- **Nothing was modified.** `git status --porcelain` is clean in **both** checkouts at the end of the task (allowing for gitignored build outputs such as `dist/`, `test-staging/`, and `qa/` produced by running `make`). No commit was created in either repository. No branch was created.
- The route-parity and file-census comparisons were done by writing both lists to files and running `diff`, with the diff output (empty or not) recorded.
- The verdict is unambiguous: a single pass/fail line at the top of the report, followed by the per-requirement detail.

## Assumptions

- Phase 5 has fully landed and merged in both repositories. If dev-core has no `src/orgs/` at all, that is not a verification failure to enumerate in detail — report immediately that phase 5 task 002 has not landed and stop.
- Running `make` targets in the dev-core checkout is acceptable for verification even though this task is otherwise read-only; the outputs (`dist/`, `test-staging/`, `qa/`) are gitignored. If the checkout must stay pristine, run them in a scratch clone and say so.
- The `orgs`-vs-`work` setup ordering check is conditional on `liq-work`'s absorption having landed. If it has not, verify only that `orgs` follows `projects`, and note the deferred check in the report.
- **The migrated endpoints are known-broken and that is not a verification failure.** Four handlers throw on first request and `create` hangs; this is pre-existing, documented, and deliberately unfixed under D11. Verify their *registration* and *path* fidelity, not their function. Do not attempt live HTTP calls against them.

## References

- `plan/notes/liq-orgs-source-inventory.md` — the authoritative file census, route table, path-var list, setup-method contract, dependency ranges, and defect list this task checks against.
- `plan/phase-05-liq-orgs-migration/002-absorb-orgs-into-dev-core.md` — the task whose outputs are being verified, including its recorded post-absorb counts.
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the committed contract; requirement 7's documentation gate is checked against dev-core's own docs.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-03-retire-liq-projects/001-verify-dev-core-absorption.md` — the sibling gate task for the first donor.

## Checkpoint hints

- After the file census and content `diff` (requirement 1), since a failure there makes the rest moot.
- After the route, setup, path-var, and dependency checks (requirements 2–4).
- After the history and green-build checks (requirements 5–6), before writing the verdict.
