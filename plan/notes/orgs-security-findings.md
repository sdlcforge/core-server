# Orgs Security Findings

## Purpose and scope

Research findings backing the `DGt0` half of this plan: the unvalidated filesystem path in `create.mjs`, and the prototype-pollution exposure reachable through `parameterKey`. Both are confirmed real, and both are fixable entirely inside dev-core.

## (a) Unvalidated `localDataRoot` reaches `fs.mkdir`

`src/orgs/handlers/create.mjs:24-35`:

```js
{
  name        : 'localDataRoot',
  required    : true,
  description : 'The local directory in which to save `./orgs/org.json` for the newly created organization.'
}
…
const { localDataRoot } = req.vars
const localRootDir = localDataRoot + '/org'
await fs.mkdir(localRootDir, { recursive : true })
```

`localDataRoot` is a body/query parameter, not a path variable, so no `validationRe` applies to it — path variables are the only things `pathToRe` constrains (`plugable-express`, `src/lib/path-to-re.mjs:20-21`). The parameter definition carries no `matcher` either, and `processParams` (`plugable-express`, `src/lib/register-handlers.js:73`) only enforces a `matcher` when one is declared. The value is concatenated unmodified and passed to `fs.mkdir(…, { recursive : true })`, so any caller can create a directory tree anywhere the server process can write. This runs *before* the never-responds defect, so it is a live side effect regardless of `jY7C`.

**Containment anchor.** The natural, already-existing root is `app.ext._liqProjects.playgroundPath`, set by the `projects` submodule at `src/projects/setup.mjs:27-33` (`PLUGABLE_PLAYGROUND` or `$HOME/playground`). It is the same tree `orgs`' own `load orgs` setup method scans to discover orgs (`src/orgs/setup.mjs:28-33`, via `playgroundMonitor.getProjectsData()`), so an org data directory created outside it can never be picked up by the registry anyway — containment is a correctness constraint here, not only a security one.

Note that `app` is available to `create.mjs`'s `func` (it already destructures `{ app }`), and `plugable-express` really does pass it (`src/lib/register-handlers.js:166`). No new plumbing is needed to reach `playgroundPath`.

## (b) Prototype pollution through `parameterKey`

### The regex admits the dangerous shapes

`src/orgs/handlers/parameters-detail.mjs:16` registers:

```js
validationRe : '(?:[.][_a-zA-Z][_a-zA-Z0-9-]*)+'
```

`__proto__` matches (`_` satisfies `[_a-zA-Z]`, `_proto__` satisfies `[_a-zA-Z0-9-]*`); `constructor` and `prototype` match trivially. So `/orgs/@acme/parameters/.__proto__.POLLUTED/set` is a well-formed route match today.

### The sink is dev-core's own code, not `@liquid-labs/resource-model`

**This corrects the `DGt0` follow-up text**, which attributes `org.updateSetting` to "the new `@liquid-labs/resource-model` dependency". `resource-model`'s `Model` class (`src/Model.mjs`) defines no `updateSetting` at all. `Organization` overrides it locally:

- `src/orgs/resources/organization.mjs:63-65` — `updateSetting(keyPath, value) { return updateSetting(this.#settings, keyPath, value) }`
- `src/orgs/resources/lib/settings.mjs:52-69` — the real implementation.

The sink, verbatim (`settings.mjs:57-68`):

```js
return keyPath.split('.').reduce((workingData, key, i, arr) => {
  if ((i + 1) === arr.length) { workingData[key] = value; return value }
  else {
    if (!(key in workingData)) { workingData[key] = {} }
    return workingData[key]
  }
}, data)
```

`key in workingData` is a prototype-chain test, so `'__proto__' in {}` is `true` and the reducer descends into `Object.prototype`. `updateSetting(data, '.__proto__.POLLUTED', 'x')` therefore writes `Object.prototype.POLLUTED`. `.constructor.prototype.POLLUTED` reaches the same object by the other route. `checkValue` (`settings.mjs:1-18`) only constrains the *value* to primitives and arrays of primitives; it does nothing about the key path.

`getSetting` (`settings.mjs:37-49`) uses the same `key in value` test and can read back across the prototype chain, though `checkValue` limits what it will return.

**Consequence: there is no "confirm the dependency already guards it" outcome available.** The guard would have to be `resource-model`'s, and `resource-model` is not in this code path. The fix is dev-core's, and it is required — it cannot be closed by citation.

### Reachability

Unreachable today only because `parameters-set.mjs:69` throws on the `model` argument first. Task 003 and task 004 of this plan make the path reachable, so the hardening must land in the same phase.

### Two layers, both in dev-core, both in scope

1. **Input** — tighten `parameterKey`'s `validationRe` in `parameters-detail.mjs` so no segment can be `__proto__`, `constructor`, or `prototype`. Only that one registration exists (`registerPathVar` throws on duplicates, `plugable-express` `src/lib/path-var-registry.mjs:29-31`), and it governs both the `detail` and `set` routes, so one edit covers both handlers.
2. **Sink** — make `settings.mjs`'s `updateSetting`/`getSetting` own-property-based (`Object.hasOwn` / a null-prototype accumulator) and reject the reserved segment names outright.

Layer 2 is what actually closes the vulnerability class; layer 1 keeps the malformed request from reaching business logic at all and keeps the declared route contract honest. `settings.mjs` is also the one `orgs` module that already has real test coverage, so layer 2 is cheap to test.
