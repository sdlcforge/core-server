# Port Donor Aggregate Assertions

## Purpose and scope

Carry the substance of `@sdlcforge/dev-core`'s dropped `src/test/index.test.mjs` into `core-server`'s **existing** `src/lib/test/builtin-plugins.test.js`, adapted to the seven-component aggregate. Phase 2 `git rm`s the donor file — its first import is `from '../index'`, and `src/index.mjs` is removed, so it cannot survive there in any form — and Phase 2 could not have written these assertions either, because at merge time the four absorbed submodules are still inert and absent from `submodules`, leaving nothing for aggregate assertions to assert against.

This task adds the assertions the donor suite carried and task 001 did not: handler-array freshness, the no-duplicate-`(method, path)` check, the four `projects-audit` routes, `projects-audit`'s absent `setup`, and the `app.ext` contract-freeze checks. Task 001 already adapted the file's existing expectations (`ABSORBED_SUBMODULES`, the composite-`setup` harness, and the two grown expectation arrays); do not redo that work.

Scope is one test file. No production code changes. Parallel-eligible with task 002, which owns `src/lib/test/host-declaration.test.js`.

No standard skill covers this task; follow the [Procedure](#procedure).

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

The donor suite is at `/Users/zane/playground/sdlcforge/dev-core/src/test/index.test.mjs` on dev-core's `main` (or in this repository's history, on the merge commit's second parent). Read it in full before adapting; each assertion below names its donor original.

### 1. `handlers` is a fresh array, not an alias of any submodule's

Assert `builtinHandlers` is not identity-equal (`not.toBe`) to any of the seven submodules' own `handlers` arrays. `builtin-plugins.mjs`' fact-1 comment names this exact hazard — two submodules pushing into a shared array would corrupt each other — and nothing currently asserts it. The existing `toEqual` aggregation assertion stays; this adds the identity half.

### 2. No `(method, path)` pair registered twice

Across all seven submodules' merged handlers. A duplicate is a hard startup crash, not a silent shadow: `plugable-express`'s `processCommandPath` throws `Non-unique command path: <path>`. Use the donor's computation, which handles both handler shapes:

```javascript
const pairs = handlers.flatMap(({ method, path, paths }) =>
  (paths || [path]).map((p) => `${(method || 'GET').toUpperCase()} ${JSON.stringify(p)}`))
expect(pairs).toHaveLength(handlers.length)
expect(new Set(pairs).size).toBe(pairs.length)
```

This assertion is strictly more valuable at seven components than at the donor's four: the merged surface is larger, and it now spans components that used to be separated by a package boundary.

### 3. The four `projects-audit` routes, with exact paths

Mechanical port. The `projects-audit` suite is a single placeholder assertion over one pure function and cannot detect a handler regression, so the route surface is asserted here instead:

```text
GET ["projects",":projectName","audit"]
GET ["projects","audit"]
PUT ["projects",":projectName","audit-fix"]
PUT ["projects","audit-fix"]
```

These mount under `/projects` alongside the `projects` component's own routes, which is why assertion 2 is its companion rather than a duplicate of it.

### 4. `projects-audit` contributes handlers but no `setup`

`expect(projectsAudit.setup).toBeUndefined()` and its `handlers` has length 4. `projects-audit` is the only one of the seven with no `setup` at all, and nothing may be added to the composite setup list on its behalf — not a placeholder, not a no-op. Assert the absence at the source rather than inferring it from the composite `setup`'s behavior; this is also what makes the aggregator's `submodule.setup?.(setupArgs)` optional call load-bearing rather than defensive.

### 5. `app.ext` contract-freeze assertions over the composite `setup`

**Extend the harness task 001 left in place; do not build a second one.** These are the donor's `app.ext` contract-freeze checks, valid nearly verbatim:

- `app.ext._liqProjects` exists, `_liqProjects.playgroundPath` is the isolated temp playground, and `_liqProjects.playgroundMonitor` is defined. `_liqProjects` is the exact key name external consumers read and is frozen by the consolidation contract.
- Invoking the first enqueued setup method the way the server's `DependencyRunner` would — `app.ext.setupMethods[0].func({ app })` — yields `app.ext._liqOrgs` equal to `{ orgSetupMethods: [] }`. This asserts the exact `_liqOrgs` key name and its initial shape, and confirms `orgs` defers its real work rather than running it inline.
- `app.ext.constants.WORK_DB_PATH` is exactly `fsPath.join(serverConfigRoot, 'work', 'work-db.yaml')`.
- `registeredPathVarOptions.workKey.validationRe` is exactly `'work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+'`, and `typeof registeredPathVarOptions.workKey.optionsFetcher` is `'function'`. The `optionsFetcher` is a lazily-invoked closure that constructs a `WorkDB` only when the framework calls it, so it reads nothing at setup time.
- No path-variable name is registered twice: `new Set(registeredPathVars).size === registeredPathVars.length`. `plugable-express`'s `registerPathVar` throws `Path variable '<name>' is already registered.` on a duplicate, which is a hard startup crash. This assertion requires the ordered-array form of `registeredPathVars` task 001 introduced — a `{ name: opts }` map loses a duplicate silently, which is why the shape changed.

### 6. Record what pins the runtime order

The registered path-variable *sequence* task 001 asserts (`credential`, then `newProjectName`/`projectName`, then `newOrgKey`/`orgKey`, then `workKey`) is the only artifact in the suite that pins `credentials → projects → orgs → work` at runtime. `projects` before `orgs` in particular is invisible to the compile-time validator, which scores it as a cross-phase edge with no order verdict at all. Add a comment saying so, next to that expectation, so a future editor does not "simplify" the ordered array back into a set or a map.

### 7. Carry the donor's scoping discipline

The *other* donor suite (`src/test/plugin-manifest.test.mjs`) is dropped outright, but one piece of its discipline is worth preserving: name the expected surfaces explicitly rather than asserting an overall-clean aggregate. Twelve of its seventeen assertions passed vacuously against an empty finding set. Every assertion added here must be non-vacuous — each names a concrete expected value, and each must be shown to fail when the corresponding wiring is broken.

### Out of scope

Do not modify `src/lib/test/host-declaration.test.js` (task 002), any `plugin-graph-*.test.js` file or the graph-gate allowlist (Phase 4), or any snapshot. Do not reconstitute a parallel `src/test/` tree — these assertions belong in the existing suite.

## Validation

1. `make test` — `builtin-plugins.test.js` is green in full, including the assertions task 001 left in place.
2. **Prove each new assertion is non-vacuous, by mutation.** Perform each perturbation, confirm the named failures, then revert:
   - Temporarily remove `projectsAudit` from `submodules` → assertions 3 and 4's route/`setup` checks fail.
   - Temporarily duplicate one submodule in `submodules` → assertion 2's duplicate-pair check fails.
   - Temporarily make `handlers` alias a single submodule's array → assertion 1 fails.

   Report the observed failure messages. Every mutation must turn the suite red.
3. `make lint` shows no new findings beyond the standing pre-existing baseline (~233 errors, followups `b3hk`/`mLm3`).
4. The working tree is clean of every mutation from step 2 — `git diff` shows only the intended additions to `src/lib/test/builtin-plugins.test.js`.

## Assumptions

- Task 001 has landed: seven components are wired, `builtin-plugins.test.js`'s `ABSORBED_SUBMODULES`, composite-`setup` harness (temp `serverConfigRoot`, `PLUGABLE_PLAYGROUND` isolation, `app.ext.constants`), ordered `registeredPathVars` array, and grown `app.ext.setupMethods` expectation are all in place and green.
- `plugin-graph-gate.test.js`, the three sibling `plugin-graph-*.test.js` suites, and `full-tier-baseline.test.js`'s three JSON snapshot comparisons are red on arrival, handed forward by task 001 to Phase 4. They are not this task's to fix, and their state must not change here.
- ~233 pre-existing ESLint errors (`b3hk`/`mLm3`) are pre-existing and out of scope.

## Procedure

1. Read the donor suite in full, then read `src/lib/test/builtin-plugins.test.js` as task 001 left it.
2. Add assertions 1 through 4 as new `test()` blocks in the `builtin-plugins aggregator` describe.
3. Extend the existing composite-`setup` test with assertion 5's contract-freeze checks and assertion 6's comment.
4. Run the mutation checks, recording each observed failure, and revert each.

## References

- [`plan/phases/wire-and-declare-seven-components.md`](../phases/wire-and-declare-seven-components.md) — goal 7 and its donor-assertion mapping table, which this task discharges.
- [`plan/notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md#4-disposition-of-dev-cores-package-level-tests) — the assertion-by-assertion analysis behind the port, why `plugin-manifest.test.mjs` is dropped instead, and why these assertions belong in the existing suite rather than a new `src/test/` tree.
- `/Users/zane/playground/sdlcforge/dev-core/src/test/index.test.mjs` — the donor suite, on dev-core's `main`; the text being adapted.
- `plan/phase-03-wire-and-declare-seven-components/001-wire-seven-components-and-retire-dev-core.md` — the task that establishes the harness and the adapted expectation arrays this one builds on.
