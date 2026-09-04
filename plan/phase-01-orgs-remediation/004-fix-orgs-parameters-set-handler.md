# Fix Orgs Parameters Set Handler

## Purpose and scope

Fix the fourth and last `jY7C` `model`-argument handler, `PUT /orgs/:orgKey/parameters/:parameterKey/set`, and make its persistence path safe.

Files:

- `src/orgs/handlers/parameters-set.mjs`
- new `src/orgs/handlers/test/parameters-set.test.mjs`

Do not touch `list.mjs`, `parameters-list.mjs`, or `parameters-detail.mjs` — those are task 003's, and this task is deliberately split by file so the two can run concurrently.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

### 1. Stop reading the `model` argument

`plugable-express` never passes `model` to a plugin handler (`src/lib/register-handlers.js:166` receives it from `src/lib/load-plugins.js:42`, which does not supply it), so `parameters-set.mjs:69`'s `getOrgFromKey({ model, params : req.vars, res })` throws on every request.

- Change `func`'s destructure from `({ app, model, reporter, registerPathVar })` to `({ app, reporter, registerPathVar })`.
- Drop the `@liquid-labs/liq-handlers-lib` import; this file imports nothing else from it.
- Resolve the org with task 002's `getOrg({ app, orgKey : req.vars.orgKey })`, inside the returned request handler.
- Delete the `if (org === false) return` guard — `getOrg` throws `createError.NotFound`, which `plugable-express`'s error middleware renders as a 404 (`src/app.js:193-196`).
- Delete the six-line `KNOWN BROKEN` comment block.

### 2. Keep the commented-out `registerPathVar` block

`parameters-set.mjs:52-60` carries a commented-out `registerPathVar('parameterKey', …)`. It must stay commented out: `registerPathVar` throws on a duplicate name (`plugable-express`, `src/lib/path-var-registry.mjs:29-31`), and `parameters-detail.mjs` owns the single live registration. Task 003 tightens that regex; this file inherits the tightening automatically because both routes resolve `:parameterKey` through the same registry entry.

Update the commented block's stale `model.orgs[orgKey]` line so the comment does not preserve the very defect this plan removes, or replace the block with a one-line comment stating where `parameterKey` is registered and why it is not registered here. Either is acceptable; state the choice in the commit message. `README.md`'s path-variable note already documents this arrangement and must stay true.

### 3. Make `org.save()` safe and effective

`parameters-set.mjs:88` calls `org.save()` **unawaited**. The inherited `Model.save()` (`@liquid-labs/resource-model`, `src/Model.mjs:74-80`) destructures `errors` off an un-awaited `async validate()` call, so it rejects unconditionally — an unhandled promise rejection on Node 18+ terminates the process by default. Today the line is unreachable; this task makes it reachable, so it must be handled here.

Task 002 adds an `Organization.save()` override that actually persists `#settings` to `<projectPath>/data/org/settings.yaml`. This task must:

- `await` the save, which means the returned request handler becomes `async`. Express 5 forwards a rejected async handler to the error middleware, so a failed write becomes a 500 rather than a hang or a crash.
- Order the response after the save completes, so a client that gets 200 knows the value was written.
- Not swallow the save error. Let it propagate.

If task 002's override is not present when this task runs, halt and report rather than calling the defective base implementation or silently dropping the `save()` call.

### 4. Preserve the existing value-parsing and response contract

The `asBoolean`/`asInteger`/`asJSON`/`asNumber`/`setNull`/`setUndefined` ladder (`parameters-set.mjs:73-85`), the `parseBool` helper, the `parameters` array, the 406 handling, and the three response renderings are all unchanged. This task fixes how the org is found and how the write is persisted, not what the endpoint means.

One consequence worth noticing rather than fixing: `setUndefined` produces `parsedValue === undefined`, and `updateSetting`'s `checkValue` (`src/orgs/resources/lib/settings.mjs:1-18`) throws on `undefined`. That is a pre-existing contradiction between the parameter's documentation and the settings library. Do not fix it here — record it in the task report so it can be filed as a follow-up by task 008.

### 5. Tests

Add `src/orgs/handlers/test/parameters-set.test.mjs`, following the mock shape used by `@sdlcforge/core-server`'s `src/controls/handlers/orgs/controls/_lib/test/list-lib.test.mjs` (read-only reference, separate project):

- A string value is written and the response body is `{ name, value }` for `application/json`.
- The `asBoolean`, `asInteger`, `asNumber`, and `asJSON` conversions each land the parsed type in the org's settings, verified by reading the value back through `getSetting`.
- `setNull` stores `null`.
- An unknown `orgKey` produces a 404-bearing error.
- `req.accepts` returning `false` produces a 406 and no write.
- The `text/plain` and `text/terminal` renderings.
- `save()` is awaited: a `save` stub that rejects makes the handler's returned promise reject, and no success response is sent. This is the regression guard for the crash described above.

Use a temp-directory-backed real `Organization` (as `src/test/index.test.mjs:76-86` does with `fs.mkdtemp`) for at least one round-trip case, so the persistence is genuinely exercised rather than only stubbed.

## Validation

- `make test TEST=parameters-set` passes.
- `make lint` is clean.
- Full `make test` shows no new failures beyond the pre-existing `project-lifecycle.test.mjs` failure (follow-up `2aMD`). Run `npm install` first if `node_modules/@liquid-labs/plugable-express` is absent.
- `grep -rn "getOrgFromKey\|model\.orgs\|KNOWN BROKEN" src/orgs/` returns nothing at all once both this task and task 003 have landed.
- `grep -n "registerPathVar('parameterKey'" src/orgs/handlers/parameters-set.mjs` shows the line still commented out.
- Node emits no `UnhandledPromiseRejection` warning during the test run.
- Confirm `git status` in the task worktree shows only dev-core paths.

## Metadata

architectural_impact: false

## Assumptions

- Task 002 has landed, providing both `src/orgs/handlers/_lib/get-org.mjs` and the `Organization.save()` override.
- Task 003 owns the `parameterKey` `validationRe` tightening. Do not duplicate it here; this file has no live registration.
- Task 001 may be hardening `src/orgs/resources/lib/settings.mjs` concurrently. Its exported signatures do not change, so this task is unaffected either way.
- Route path, method, and parameter names are unchanged.

## References

- [orgs handler defect analysis](../notes/orgs-handler-defect-analysis.md) — the `model` argument evidence and the full `Model.save()` analysis.
- `src/orgs/resources/organization.mjs` — the `updateSetting`/`save` surface this handler drives.
- `src/orgs/resources/lib/settings.mjs` — `checkValue`'s constraints on storable values.

## Procedure

1. Read `parameters-set.mjs`, task 002's `get-org.mjs`, and the `Organization` `save()` override.
2. Convert the org lookup and remove the dead guard and the `KNOWN BROKEN` block.
3. Make the request handler `async` and `await` the save before responding.
4. Resolve the commented-out `registerPathVar` block.
5. Add the test suite.
6. Run the scoped test, `make lint`, then full `make test`.

## Checkpoint hints

- After the org-lookup conversion compiles and lints.
- After the `await save()` change and its rejection-path test.
- After the full test suite is green.
