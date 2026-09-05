# Fix Orgs Read Handlers And Tighten parameterKey

## Purpose and scope

Fix three of the four `jY7C` `model`-argument handlers, and close the input half of security follow-up `DGt0`(b) at the single place `parameterKey` is registered.

Files:

- `src/orgs/handlers/list.mjs`
- `src/orgs/handlers/parameters-list.mjs`
- `src/orgs/handlers/parameters-detail.mjs`
- new `src/orgs/handlers/test/{list,parameters-list,parameters-detail}.test.mjs`

`src/orgs/handlers/parameters-set.mjs` is task 004's file; do not touch it. `src/orgs/handlers/create.mjs` is task 005's.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

### 1. Stop reading the `model` argument

`plugable-express` invokes a plugin handler's `func` as `func({ parameters, app, cache, model, reporter, registerPathVar, setupData })` (`src/lib/register-handlers.js:166`), but its only caller passes no `model` (`src/lib/load-plugins.js:42`). `model` is permanently `undefined`; `app` is real.

- **`list.mjs`** — change `func`'s destructure from `({ model, reporter })` to `({ app, reporter })` and replace `Object.values(model.orgs)` with `Object.values(app.ext._liqOrgs.orgs)`. Read the registry inside the returned request handler, not in the outer `func` body: `func` runs at route-registration time, before the deferred `load orgs` setup method has populated the map.
- **`parameters-list.mjs`** — change `func`'s destructure from `({ model, reporter })` to `({ app, reporter })`, drop the `getOrgFromKey` import (keep `commonOutputParams` and `formatOutput`), and resolve the org with task 002's `getOrg({ app, orgKey : req.vars.orgKey })`.
- **`parameters-detail.mjs`** — drop the `getOrgFromKey` import entirely and resolve the org the same way. Its `func` already destructures `app`; remove `model` from the destructure.

Delete the `if (org === false) return` guards. `getOrg` throws `createError.NotFound` instead of returning `false`, and `plugable-express`'s error middleware turns that into a 404 (`src/app.js:193-196`). Leaving the old guard in place would be dead code that lies about the contract.

### 2. Fix `parameters-detail.mjs`'s `optionsFetcher`

`parameters-detail.mjs:11-15` registers `parameterKey` with an `optionsFetcher` that also reads `model.orgs[orgKey]`. It must read the registry too. `optionsFetcher` is invoked lazily at request time, so capturing `app` from the enclosing `func` argument is sufficient and is the simplest correct approach. (`src/orgs/setup.mjs:66` shows the framework also passes `app` into an `optionsFetcher`, but the closure is less fragile — pick one and note the choice in a comment.)

An unknown `orgKey` must yield an empty option list rather than a thrown error: this path feeds shell completion, not a request response.

### 3. Tighten `parameterKey`'s `validationRe`

The current pattern (`parameters-detail.mjs:16`) is:

```
(?:[.][_a-zA-Z][_a-zA-Z0-9-]*)+
```

`__proto__` matches it (`_` satisfies the first class, `_proto__` the second), as do `constructor` and `prototype`. Because `registerPathVar` throws on a duplicate name (`plugable-express`, `src/lib/path-var-registry.mjs:29-31`), this one registration governs **both** the `.../parameters/:parameterKey/detail` and `.../parameters/:parameterKey/set` routes — so one edit here covers task 004's handler as well. `parameters-set.mjs:52-60` keeps its identical registration commented out; that arrangement must be preserved exactly.

Tighten the pattern so no segment can be `__proto__`, `constructor`, or `prototype`, while continuing to accept every legitimate settings key. Constraints on the fix:

- The pattern is a **string**, interpolated into a larger route regex by `pathToRe` (`plugable-express`, `src/lib/path-to-re.mjs:20-21`) as `` `/(?<parameterKey>${validationRe})` ``. It must remain a string, must contain no named capture group of its own (the framework strips only its own), and must stay anchor-free — `pathToRe` supplies the anchors.
- Every currently-valid key must still match. The keys `listParameters` produces (`src/orgs/handlers/_lib/parameters-lib.mjs:3-21`) are dotted paths ending in an ALL-CAPS segment, e.g. `.COMMON_NAME`, `.some.nested.LEGAL_NAME`. `Organization`'s own accessors read `COMMON_NAME` and `LEGAL_NAME` (`organization.mjs:55-57`).
- Add a comment above the pattern explaining what the exclusion is for and pointing at follow-up `DGt0`, so a future simplification does not silently reopen it.

A negative-lookahead per segment is the natural shape; whatever form is chosen must be covered by the unit tests below.

### 4. Remove the `KNOWN BROKEN` comments

Each of the three files carries a six-line `KNOWN BROKEN: … Tracked: sdlcforge/dev-core plan/followups.yaml id jY7C.` block. Delete them. Do not replace them with a "this used to be broken" comment; the git history and the README carry that.

### 5. Tests

Add handler-level tests under `src/orgs/handlers/test/`. Today the `orgs` handlers are at 0% coverage; these are the first. Build mocks in the shape `@sdlcforge/core-server`'s `src/controls/handlers/orgs/controls/_lib/test/list-lib.test.mjs` uses (read-only reference, separate project):

```js
const appMock = { ext : { _liqOrgs : { orgs : { '@acme' : /* an Organization or a stand-in */ } } } }
const reqMock = { accepts : () => 'application/json', vars : { orgKey : '@acme' } }
const resMock = { json : (json) => { result = json } }
```

Cover, per handler:

- **`list`** — returns every org in the registry; the JSON body carries `key`, `commonName`, and `legalName` with real (non-`undefined`) values, which is what proves task 002's `key` getter landed; an empty registry yields an empty array rather than throwing.
- **`parameters-list`** — returns the org's parameters; an unknown `orgKey` throws a 404-bearing error (`expect(...).toThrow()` plus a `status` assertion, or `rejects` if the handler is async).
- **`parameters-detail`** — returns `{ name, value }` for `application/json`; returns the `text/plain` and `text/terminal` renderings for those accept types; returns 406 when `req.accepts` returns `false`; unknown `orgKey` yields 404.
- **`parameterKey` validation** — direct unit tests over the `validationRe` string: `new RegExp('^' + validationRe + '$')` rejects `.__proto__`, `.constructor`, `.prototype`, `.a.__proto__.b`, and accepts `.COMMON_NAME`, `.a.b.SOME_KEY`. Assert against the exported registration rather than a copy of the pattern, by invoking `func` with a `registerPathVar` spy that captures the `varDef`.

`formatOutput` is `async` (`@liquid-labs/liq-handlers-lib`, `src/format-output.js:89`) and calls `res.json(...)` for the JSON path; `await` the handler in tests that go through it, or assert after the returned promise settles.

## Validation

- `make test TEST=orgs/handlers` passes, with all three new suites present.
- `make lint` is clean.
- Full `make test` shows no new failures beyond the pre-existing `project-lifecycle.test.mjs` failure (follow-up `2aMD`). Run `npm install` first if `node_modules/@liquid-labs/plugable-express` is absent.
- `grep -rn "KNOWN BROKEN" src/orgs/handlers/{list,parameters-list,parameters-detail}.mjs` returns nothing.
- `grep -rn "getOrgFromKey\|model\.orgs" src/orgs/` returns hits only in `parameters-set.mjs` (task 004's file) — and nothing at all once task 004 lands.
- `grep -n "registerPathVar('parameterKey'" src/orgs/handlers/*.mjs` shows exactly one live registration, in `parameters-detail.mjs`, with `parameters-set.mjs`'s still commented out.
- `src/test/index.test.mjs` still passes unchanged: its `registeredPathVars` assertion deliberately excludes `parameterKey` because that variable is registered from a handler `func`, not from `setup`.
- Confirm `git status` in the task worktree shows only dev-core paths.

## Metadata

architectural_impact: false

## Assumptions

- Task 002 has landed and `src/orgs/handlers/_lib/get-org.mjs` exists. If it does not, halt and report rather than inlining a private copy of the lookup.
- Task 001's settings hardening may or may not have landed. This task's regex tightening must be correct on its own; do not assume the sink is already guarded.
- Route paths, methods, `parameters` arrays, and the `path` exports are unchanged. This task makes the existing endpoints work; it does not redesign them.
- `list.mjs`'s `mdFormatter` renders `o.name` while `defaultFields` is `['key','commonName','legalName']` — a pre-existing inconsistency in the Markdown rendering only. Leave it; note it in the task report if it turns out to matter for a test.

## References

- [orgs handler defect analysis](../notes/orgs-handler-defect-analysis.md) — the `model`/`app` evidence and the `formatOutput` behavior these tests must account for.
- [orgs security findings](../notes/orgs-security-findings.md) — why the `parameterKey` regex admits the dangerous shapes and why the sink fix alone is not enough.
- `src/orgs/handlers/_lib/parameters-lib.mjs` — the shape of legitimate parameter keys the tightened regex must keep accepting.
- [`README.md`](../../README.md#the-appext_liqorgs-contract) — the `app.ext._liqOrgs` contract and the path-variable registration-order note.

## Procedure

1. Read all three handler files and task 002's `get-org.mjs`.
2. Convert `list.mjs`, then `parameters-list.mjs`, then `parameters-detail.mjs`.
3. Tighten the `validationRe` and fix the `optionsFetcher`.
4. Delete the `KNOWN BROKEN` blocks.
5. Add the three test suites plus the `validationRe` unit tests.
6. Run the scoped tests, `make lint`, then full `make test`.

## Checkpoint hints

- After `list.mjs` and its test.
- After `parameters-list.mjs` and its test.
- After `parameters-detail.mjs`, the `optionsFetcher` fix, and its test.
- After the `validationRe` tightening and its unit tests.

## Status

- **Outcome:** succeeded (2026-09-04).
- `list.mjs`, `parameters-list.mjs`, `parameters-detail.mjs` all switched from the never-populated `model` argument to `app.ext._liqOrgs.orgs` (via task 002's `getOrg` in the two `getOrgFromKey`-importing handlers; `list.mjs` reads the registry directly since it needs every org, not one). All `if (org === false) return` guards and `KNOWN BROKEN` blocks were removed.
- `parameters-detail.mjs`'s `parameterKey` `optionsFetcher` now reads `app.ext._liqOrgs.orgs` via the `app` closed over from `func`, and returns `[]` for an unknown `orgKey` instead of throwing.
- `parameterKey`'s `validationRe` is tightened to `(?:[.](?!(?:__proto__|constructor|prototype)(?![_a-zA-Z0-9-]))[_a-zA-Z][_a-zA-Z0-9-]*)+` — rejects `__proto__`/`constructor`/`prototype` as exact segments via a per-segment negative lookahead bounded by "not followed by another identifier character" (not by `$`/end-of-string, since the pattern is embedded inside a larger route regex with a literal path segment, `/detail` or `/set`, following it — a literal `$` anchor there would have broken those routes). Verified standalone and embedded in a simulated `pathToRe`-style route regex before landing it.
- Added `src/orgs/handlers/test/{list,parameters-list,parameters-detail}.test.mjs` per the task doc's coverage list, including direct `validationRe` unit tests against the registration captured via a `registerPathVar` spy.
- Validation: `make test TEST=orgs/handlers` — 5 suites / 27 tests passed. `make lint` — clean (ran `make lint-fix` first per the Node Developer role, which reformatted the new `parameters-detail.test.mjs`'s object literal alignment; no other issues). Full `make test` — 20/21 suites passed; the only failure is the pre-existing `projects/handlers/_lib/test/project-lifecycle.test.mjs` (follow-up `2aMD`), unrelated to this task's files. All four `## Validation` grep checks ran; see the report's `flagged_for_manager` for a nuance on the `getOrgFromKey|model\.orgs` check.
- Assumption confirmed: task 001's settings-hardening (`src/orgs/resources/lib/settings.mjs`) has already landed (own-property checks, reserved-segment rejection) — this task's `validationRe` fix was still implemented and verified independently of that, per the task doc's assumption.
- Files touched: `src/orgs/handlers/list.mjs`, `src/orgs/handlers/parameters-list.mjs`, `src/orgs/handlers/parameters-detail.mjs`, `src/orgs/handlers/test/list.test.mjs`, `src/orgs/handlers/test/parameters-list.test.mjs`, `src/orgs/handlers/test/parameters-detail.test.mjs`.
