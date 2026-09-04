# Orgs Handler Defect Analysis

## Purpose and scope

Research findings backing the `jY7C` half of this plan: why the five `/orgs` endpoints are non-functional, what the correct in-package fix is, and what secondary defects sit directly on the fixed code paths. Every claim below is a direct read of source in this checkout or in a read-only reference checkout, cited by file and line.

## The `model` argument is genuinely never passed

`@liquid-labs/plugable-express` invokes a plugin handler's `func` from `src/lib/register-handlers.js:166`:

```js
const handlerFunc = func({ parameters, app, cache, model, reporter, registerPathVar, setupData })
```

`model` there is destructured from `registerHandlers`' own second argument (`src/lib/register-handlers.js:145`). The only caller is `src/lib/load-plugins.js:42`:

```js
registerHandlers(app, { npmName, handlers, reporter, setupData, cache })
```

No `model` key. So `model` is `undefined` at line 166 and `undefined` is what every plugin handler's `func` receives. The four affected handlers dereference it immediately, hence `TypeError: Cannot read properties of undefined (reading 'orgs')`.

**`app` *is* passed** (same line 166). This is the load-bearing fact for the fix: everything the handlers need is reachable from the argument object they already receive.

## No external-package change is required

`getOrgFromKey` (`@liquid-labs/liq-handlers-lib`, `src/get-org-from-key.js:7-19`) is nine lines:

```js
const getOrgFromKey = ({ model, orgKey, params, res, invalidStatus = 404 }) => {
  orgKey = orgKey || params.orgKey
  const org = model.orgs[orgKey]
  if (!org) {
    if (res) { res.status(invalidStatus).json({ message : `Could not locate org '${orgKey}'.` }) }
    return false
  }
  return org
}
```

Its entire contribution is one map lookup plus a 404. dev-core can stop importing it from these four handlers and do the same lookup against `app.ext._liqOrgs.orgs` in-package. **This refutes the claim in dev-core's own `README.md` (`Known defects (orgs submodule)`) and in `plan/followups.yaml` item `jY7C` that a real fix "requires changing `getOrgFromKey`'s signature in `@liquid-labs/liq-handlers-lib`".** It does not. Nothing outside dev-core needs to change, and the `needs input` escape hatch this plan reserved for that case is not triggered.

The other two `@liquid-labs/liq-handlers-lib` imports these handlers use — `commonOutputParams` and `formatOutput` — are unaffected and stay.

## The correct pattern already exists, in a read-only reference project

`@sdlcforge/core-server`'s `controls` submodule reads the same registry correctly at `src/controls/handlers/orgs/controls/_lib/list-lib.mjs:42-46`:

```js
const org = app.ext._liqOrgs.orgs[orgKey]
if (org === undefined) {
  throw createError.NotFound(`No such or  g '${orgKey}'.`)
}
```

(The `or  g` typo is core-server's, in a project this plan must not edit — do not copy it.) `http-errors` is already a direct dependency of dev-core, and `plugable-express`'s error middleware honors `error.status` (`src/app.js:193-196`, `const status = error.status || 500`), so a thrown `createError.NotFound` produces a real 404 response.

`core-server`'s `src/controls/handlers/orgs/controls/_lib/test/list-lib.test.mjs` is the matching test pattern: a hand-built `appMock` of shape `{ ext : { _liqOrgs : { orgs : { '@acme' : … } } } }`, a `reqMock` with `accepts : () => 'application/json'`, and a `resMock` capturing `json`.

## `formatOutput` behavior the handler tests must account for

`formatOutput` (`@liquid-labs/liq-handlers-lib`, `src/format-output.js:89-250`) is `async`. It selects a format via `format || extensionByMimeTypes[req.accepts(...)] || 'json'`, and for `json` calls `res.json(pickedData)` where the pick is `lodash.pick(item, fields)` over `defaultFields`. `lodash.pick` resolves inherited/prototype accessors, so `Organization`'s class getters are readable through it.

## Secondary defects found sitting on the same code paths

These are not restatements of `jY7C`; they were found while verifying that the `jY7C` fix actually produces working endpoints.

### `Organization` has no `key` getter

`src/orgs/resources/organization.mjs:10-70` defines getters `name`, `pkgName`, `projectPath`, `commonName`, `legalName`. It extends `Model` from `@liquid-labs/resource-model`, whose `src/Model.mjs` defines no `key` either. But:

- `src/orgs/handlers/list.mjs:8` sets `defaultFields = ['key', 'commonName', 'legalName']`, and its `terminalFormatter`/`textFormatter` (lines 14, 16) read `o.key`.
- `src/orgs/setup.mjs:47` builds `const orgArgs = { org, orgKey : org.key }`.

So `key` is `undefined` everywhere it is read. Registry keys and `#name` are the same value: `loadOrg` (`src/orgs/setup.mjs:36-41`) derives `orgName` from `pkgName.split('/')[0]` and uses it as both the map key and the `name` constructor argument. Adding `get key() { return this.#name }` is the correct one-line fix and is required for `GET /orgs/list` to actually be functional rather than merely non-throwing.

### `Model.save()` always rejects

`@liquid-labs/resource-model`'s `src/Model.mjs:74-88` (and the installed `dist/resource-model.js`, verified identical):

```js
async save({ noValidate = false } = {}) {
  if (noValidate !== true) {
    const { errors } = this.validate()   // <- `validate()` is async; not awaited
    if (errors.length > 0) { … }
  }
  …
}
```

`this.validate()` is `async` (line 90), so destructuring `errors` off the returned Promise yields `undefined`, and `errors.length` throws `TypeError: Cannot read properties of undefined (reading 'length')`. Every `save()` call on a `Model` subclass therefore rejects.

`src/orgs/handlers/parameters-set.mjs:88` calls `org.save()` **unawaited**. Today that line is unreachable (the handler throws on `model` first). The moment `jY7C` is fixed it becomes reachable, and an unawaited rejected promise on Node 18+ is an unhandled rejection, which by default terminates the process. **Fixing `jY7C` without also handling `save()` converts a broken endpoint into a server-crashing endpoint.**

Additionally, even a successful `Model.save()` would persist nothing here: it iterates `#rootItemManagers` and `#subModels`, both empty for `Organization`, which loads its settings itself with `readFileSync` (`src/orgs/resources/organization.mjs:31-40`) and never writes them back.

The fix chosen for this plan is an `Organization`-level `save()` override that writes `#settings` back to the same `<projectPath>/data/org/settings.yaml` it read, using the `js-yaml` dependency already imported in that file. This is entirely inside dev-core and makes `PUT …/parameters/:parameterKey/set` durable rather than in-memory-only.

## Scope boundaries confirmed

- `src/orgs/setup.mjs:66`'s `optionsFetcher : ({ app }) => Object.keys(app.ext._liqOrgs.orgs)` shows `optionsFetcher` receives `app`. The `parameterKey` `optionsFetcher` in `parameters-detail.mjs:11-15` uses `model.orgs[orgKey]` and must switch to the registry; capturing `app` from the enclosing `func` argument is sufficient and simplest, since `optionsFetcher` is invoked lazily at request time, long after the `setup`-phase `load orgs` method has populated the map.
- `registerPathVar` throws on a duplicate name (`plugable-express`, `src/lib/path-var-registry.mjs:29-31`), which is why `parameters-set.mjs:52-60` keeps its registration commented out. That arrangement must be preserved: `parameterKey` is registered exactly once, from `parameters-detail.mjs`.
