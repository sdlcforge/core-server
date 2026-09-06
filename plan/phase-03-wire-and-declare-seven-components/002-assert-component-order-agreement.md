# Assert Component Order Agreement

## Purpose and scope

Close the gap that lets the compile-time validator certify `outcome: 'ok'` against a component order the running server does not use. Nothing today ties `src/lib/builtin-plugins.mjs`'s runtime `submodules` order to `package.json`'s declared `plugable.host.builtins[0].components` order — this task adds the Jest assertion that does, in `src/lib/test/host-declaration.test.js`.

Scope is one test file plus, if task 001's wording needs it, the comment in `src/lib/builtin-plugins.mjs` that names the enforcement mechanism. No production behavior changes.

Parallel-eligible with task 003, which owns `src/lib/test/builtin-plugins.test.js`. The two touch disjoint files deliberately.

No standard skill covers this task; follow the [Procedure](#procedure).

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### Why the existing guard does not cover this

`src/lib/builtin-plugins.mjs` has claimed that `verifyHostDeclaration()`'s Jest assertion keeps the runtime and declared arrays from drifting apart. Reading `@liquid-labs/plugable-express`'s `src/lib/verify-host-declaration.js`, it does not:

- Its order check (`host-declaration-builtins-order-mismatch`) compares the **`npmName` sequence** across `builtinPlugins` entries against the declared `builtins` entry sequence. This host has exactly one `builtinPlugins` entry, so the check is a one-element-versus-one-element comparison that can never fail here.
- Its component check compares an entry's declared component set against that entry's own inline `manifest` key, and it is a **set** comparison (`setsAgree`), not an ordered one. `builtinPluginsFor()` returns `{ npmName, version, summary, module }` with no `manifest` key, so `entryManifestComponentSet()` returns `null` and the comparison is skipped entirely.

With three components whose ordering was not load-bearing, that was a latent gap. With seven whose ordering is load-bearing in both directions, it is the exact failure mode this plan exists to eliminate.

### What to assert

Add a test to `src/lib/test/host-declaration.test.js`. That file is chosen deliberately: it is the existing host-declaration drift guard, it already reads the real `package.json` off disk and runs `verifyHostDeclaration()` against the real arrays, and keeping this assertion out of `builtin-plugins.test.js` lets this task run concurrently with task 003.

Three assertions, all over the real `package.json` and the real exports from `../builtin-plugins`:

1. **Element-for-element agreement.** The ordered component-name list exported by `src/lib/builtin-plugins.mjs` equals `packageJSON.plugable.host.builtins[0].components.map(({ component }) => component)`, compared as ordered arrays (`toEqual` on arrays is ordered — a set comparison is precisely the weakness being fixed).

2. **The literal DAG order.** The runtime list equals `['credentials', 'projects', 'orgs', 'controls', 'issues-github', 'work', 'projects-audit']`. This is not redundant with assertion 1. A brute-force sweep over all 5040 orderings found only **two** pairwise precedence constraints the validator can see — `credentials < projects` and `orgs < controls` — so the other five positions in the chosen order are free as far as `validatePluginSet()` is concerned. `projects` before `orgs` in particular is load-bearing at *runtime* (`orgs`' deferred `load orgs` setup method reads `app.ext._liqProjects.playgroundMonitor`) while scoring as a cross-phase edge with no order verdict at all. A coordinated-but-wrong reorder of both arrays would satisfy assertion 1 and pass the graph gate; only this literal catches it. Carry that reasoning into the test's comment, naming which two constraints are validator-provable and which are runtime-only, so a future editor who needs to change the order knows what they are overriding.

3. **Non-vacuity and index alignment.** The list has length 7, has no duplicate entries, and has exactly one entry per wired submodule (`componentNames.length === submodules.length`, using the `submodules` export task 001 adds). An empty or truncated export on either side must not be able to pass. Note in the comment that the namespace imports carry no name of their own to introspect, which is why the name list is hand-maintained and therefore needs this guard rather than being derived.

### Correct the enforcement-mechanism comment

`src/lib/builtin-plugins.mjs`'s header comment names the mechanism that keeps the two arrays in agreement. Task 001 rewrites it to point at this assertion; confirm it names the file and test that actually landed here, and correct it if not. This is the only production-file edit in scope.

### Out of scope

Do not modify `src/lib/test/builtin-plugins.test.js` (task 003), the graph-gate allowlist or any `plugin-graph-*.test.js` file (Phase 4), or any snapshot.

## Validation

1. `make test` — `host-declaration.test.js` is green, including its pre-existing `verifyHostDeclaration()` assertion, which must still pass unchanged.
2. **Prove the assertion is not vacuous, by mutation.** Perform each perturbation, confirm the named failure, then revert:
   - Swap two entries in `package.json`'s declared `components` array → assertion 1 fails.
   - Swap two entries in `submodules` and the component-name list together, consistently (for example `projects` and `orgs`) → assertion 1 still passes and assertion 2 fails. This is the case the graph gate cannot catch and is the reason assertion 2 exists.
   - Drop the last entry from the exported component-name list → assertion 3 fails.

   Report the observed failure messages. A perturbation that does not turn the suite red means the assertion is inert, which is the exact condition this task exists to remove.
3. `make lint` shows no new findings beyond the standing pre-existing baseline (~233 errors, followups `b3hk`/`mLm3`).
4. The working tree is clean of every mutation from step 2 — `git diff` shows only the intended test addition (and the comment correction, if any).

## Assumptions

- Task 001 has landed: `src/lib/builtin-plugins.mjs` exports both `submodules` and the ordered component-name list, `package.json` declares the seven components in DAG order, and `@sdlcforge/dev-core` is fully removed.
- `plugin-graph-gate.test.js`, the three sibling `plugin-graph-*.test.js` suites, and `full-tier-baseline.test.js`'s three JSON snapshot comparisons are red on arrival, handed forward by task 001 to Phase 4. They are not this task's to fix, and their state must not change here.
- ~233 pre-existing ESLint errors (`b3hk`/`mLm3`) are pre-existing and out of scope.

## Procedure

1. Read `src/lib/test/host-declaration.test.js` and `src/lib/builtin-plugins.mjs` as task 001 left them.
2. Add the three assertions, with the comment explaining the validator-provable versus runtime-only distinction.
3. Run the three mutation checks, recording each observed failure, and revert each.
4. Confirm the `builtin-plugins.mjs` comment names this assertion accurately.

## References

- [`plan/phases/wire-and-declare-seven-components.md`](../phases/wire-and-declare-seven-components.md) — goal 6, which this task discharges.
- [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md#the-drift-guard-does-not-check-what-the-comment-claims-it-checks) — the read of `verify-host-declaration.js` behind this task's premise, and the proposed shape of the fix.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md#is-a-different-ordering-needed-or-admissible) — the 5040-permutation sweep: the two binding precedence constraints, the five free positions, and why the validator will not catch a regression in them.
- `plan/phase-03-wire-and-declare-seven-components/001-wire-seven-components-and-retire-dev-core.md` — the task that adds the exports this one asserts against.
