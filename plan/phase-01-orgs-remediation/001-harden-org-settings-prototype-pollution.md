# Harden Org Settings Against Prototype Pollution

## Purpose and scope

Close the sink half of security follow-up `DGt0`(b): `src/orgs/resources/lib/settings.mjs`'s `updateSetting` and `getSetting` walk the prototype chain, so a dotted key path containing `__proto__`, `constructor`, or `prototype` can read across and write onto `Object.prototype`.

This task touches exactly two files:

- `src/orgs/resources/lib/settings.mjs`
- `src/orgs/resources/lib/test/settings.test.mjs`

It touches no handler and no route. The complementary input-validation layer (tightening the `parameterKey` route regex) is task 003's; this task must stand on its own without depending on it, because defense in depth is the point.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

1. **`updateSetting` must not descend into or write onto inherited properties.** The current implementation (`settings.mjs:52-69`) uses `if (!(key in workingData))` to decide whether to create an intermediate container. `in` is a prototype-chain test, so `'__proto__' in {}` is `true` and the reducer returns `Object.prototype` as the next `workingData`. Replace the membership test with an own-property test (`Object.hasOwn(workingData, key)`) so an inherited name is treated as absent and a fresh own container is created instead.

2. **Reject reserved segment names outright.** Own-property testing alone is not sufficient: `workingData['__proto__'] = {}` on a plain object still mutates the prototype rather than creating an own property. Reject any key path whose `.`-split segments include `__proto__`, `constructor`, or `prototype`, by throwing an `Error` whose message names the offending segment. Apply the check in both `updateSetting` and `getSetting`, before any traversal.

   Do not silently drop or sanitize the segment — a caller asking for a reserved name is asking for something that cannot be honored, and a thrown error surfaces as a 500 through `plugable-express`'s error middleware, which is the correct outcome for a request that should never have matched the route in the first place (task 003 makes it not match).

3. **`getSetting` must use the same own-property discipline.** `settings.mjs:41` (`if (key in value)`) has the same defect on the read side; make it own-property-based too.

4. **Preserve every existing behavior the current test suite asserts.** Specifically: the leading-`.` strip, the `process.env` override in `getSetting`/`requireSetting`, `checkValue`'s primitive/array-of-primitive restriction on stored values, `structuredClone` on return, `undefined` for a missing path, and the throw on a partial key path. `requireSetting` needs no change of its own; it delegates.

5. **Guard against a non-object traversal target.** `getSetting`'s loop will throw a confusing `TypeError` if an intermediate value is a primitive or `null`. Returning `undefined` in that case is the behavior the existing "missing key" tests already expect; make it explicit rather than incidental.

6. **Extend `src/orgs/resources/lib/test/settings.test.mjs`** with a `describe` block covering prototype pollution. At minimum:
   - `updateSetting({}, '.__proto__.POLLUTED', 'x')` throws, and `({}).POLLUTED` is still `undefined` afterwards.
   - The same for `constructor.prototype.POLLUTED` and for a bare `prototype` segment.
   - `getSetting({}, '.__proto__')` and `getSetting({}, 'constructor')` throw rather than returning anything from the prototype chain.
   - A regression assertion that `Object.prototype` gained no enumerable own property across the suite.

   Follow the file's existing `test.each` table style and its `/* global describe expect test */` header. Note that the existing suite mutates and deletes `process.env` keys inside `try`/`finally`; keep any new global-state assertions equally self-cleaning, since `make test` runs Jest `--runInBand` and pollution would leak across suites.

## Validation

- `make test TEST=settings` passes, with the new prototype-pollution block present and the pre-existing `getSettings`/`requireSetting`/`updateSetting` blocks unchanged and still passing.
- `make lint` is clean. The project's ESLint config enforces the aligned-colon object style used throughout `src/` (`name : 'value'`); match the surrounding file rather than reformatting it.
- `make test` overall shows no new failures beyond the pre-existing `project-lifecycle.test.mjs` failure (follow-up `2aMD`). Run `npm install` first if `node_modules/@liquid-labs/plugable-express` is absent.
- Manual check: `node -e` (or a scratch test) confirming that after a full `updateSetting` exercise, `Object.getOwnPropertyNames(Object.prototype)` contains nothing named `POLLUTED`.
- `grep -rn "in workingData\|key in value" src/orgs/` returns nothing.

## Metadata

architectural_impact: false

## Assumptions

- `src/orgs/resources/lib/settings.mjs` is dev-core's own code. The `DGt0` follow-up text attributes `updateSetting` to `@liquid-labs/resource-model`; that is incorrect and no external package is involved in this fix. `Organization` overrides `updateSetting`/`getSetting` at `src/orgs/resources/organization.mjs:59-69`, delegating to this local module.
- `settings.mjs` is currently the only `orgs` module with real test coverage. Do not reduce it.
- Task 002 edits `src/orgs/resources/organization.mjs`, which imports this module. This task must not change the exported signatures (`getSetting(data, keyPath)`, `updateSetting(data, keyPath, value)`, `requireSetting(data, key)`), so the two tasks stay independent.

## References

- [orgs security findings](../notes/orgs-security-findings.md) — the full analysis, with the vulnerable reducer quoted verbatim and the reachability argument.
- `src/orgs/resources/lib/settings.mjs:52-69` — the sink.
- `src/orgs/resources/lib/settings.mjs:37-49` — the read-side equivalent.
- `src/orgs/resources/organization.mjs:59-69` — the delegating callers.

## Procedure

1. Read `src/orgs/resources/lib/settings.mjs` and its test file in full.
2. Add a module-private reserved-segment guard and apply it at the top of `getSetting` and `updateSetting`, after the leading-`.` strip.
3. Convert both traversals to own-property tests.
4. Extend the test file.
5. Run `make test TEST=settings`, then `make lint`, then the full `make test`.

## Status

- **Outcome:** succeeded
- **Date:** 2026-09-04
- **Validation summary:**
  - `make test TEST=settings` — passed (43/43, including the new `prototype pollution` describe block).
  - `make lint` (project-wide) — fails, but solely on `src/test/plugin-manifest.test.mjs:55-56` (`operator-linebreak`), a pre-existing failure unrelated to this task and outside its two-file scope; confirmed pre-existing via `git stash` before this task's edits. `npx eslint` scoped to the two files this task touches (`src/orgs/resources/lib/settings.mjs`, `src/orgs/resources/lib/test/settings.test.mjs`) reports zero problems.
  - `make test` (full) — 98 passed, 7 failed, all 7 failures confined to `projects/handlers/_lib/test/project-lifecycle.test.js`, matching the pre-existing failure named in this task's own Validation section (follow-up `2aMD`); no new failures introduced.
  - Manual `node -e` check — confirmed `updateSetting`/`getSetting` throw on `__proto__`/`constructor`/`prototype` segments and `Object.prototype` gained no `POLLUTED` (or other) own property after a full exercise.
  - `grep -rn "in workingData\|key in value" src/orgs/` — no matches.
- **Affected source files:**
  - `src/orgs/resources/lib/settings.mjs`
  - `src/orgs/resources/lib/test/settings.test.mjs`
- **Decisions:** see task agent's structured report `decisions_made`/`assumptions_applied` fields for the manager.
