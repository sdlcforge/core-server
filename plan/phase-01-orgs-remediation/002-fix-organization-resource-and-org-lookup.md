# Fix Organization Resource And Add Org Lookup Helper

## Purpose and scope

Build the shared foundation the four `jY7C` handler fixes rest on, and repair two `Organization` defects the research turned up that would otherwise leave those handlers broken-but-quiet.

Files:

- new `src/orgs/handlers/_lib/get-org.mjs`
- new `src/orgs/handlers/_lib/test/get-org.test.mjs`
- `src/orgs/resources/organization.mjs`
- new `src/orgs/resources/test/organization.test.mjs` (or `src/orgs/resources/lib/test/` sibling placement — match whichever the repository's Jest config already picks up; `src/orgs/resources/lib/test/settings.test.mjs` proves the `**/test/*.test.mjs` convention works)

This task registers no route and edits no handler. Tasks 003 and 004 consume what it produces.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

### 1. The org-lookup helper

Add `src/orgs/handlers/_lib/get-org.mjs` exporting a single function:

```
getOrg({ app, orgKey }) -> Organization
```

- Reads `app.ext._liqOrgs.orgs[orgKey]`.
- Throws `createError.NotFound(...)` from `http-errors` when the org is absent, with a message naming the requested `orgKey`. `http-errors` is already a direct dependency (`package.json` `dependencies`), and `plugable-express`'s error middleware honors `error.status` (`src/app.js:193-196`), so the throw becomes a real 404 response.
- Must not import anything from `@liquid-labs/liq-handlers-lib`. Replacing that package's `getOrgFromKey` in the `orgs` handlers is the entire point.
- Must not accept or reference a `model` argument.

Model it on `@sdlcforge/core-server`'s `src/controls/handlers/orgs/controls/_lib/list-lib.mjs:42-46`, which reads the same registry the same way. That file is **read-only reference material in a separate project** — read it for the pattern, do not edit it, and do not copy its `No such or  g` typo.

Behavioral difference from the `getOrgFromKey` it replaces, and why it is correct: `getOrgFromKey` took `res` and wrote the 404 itself, returning `false` so callers had to remember `if (org === false) return`. Throwing instead removes that footgun and matches how the rest of dev-core signals HTTP errors.

Decide and document in a short header comment whether `getOrg` also guards a missing `app.ext._liqOrgs` container. It cannot be missing in a correctly-booted server (`src/orgs/setup.mjs:6-10` creates it in a `deps: ['!']` run-first setup method), but handler tests build `app` mocks by hand, and a clear failure beats `TypeError`.

### 2. `Organization` gains a `key` accessor

`src/orgs/resources/organization.mjs` defines getters for `name`, `pkgName`, `projectPath`, `commonName`, and `legalName` — but not `key`, and neither does the `Model` base class it extends. Two existing call sites read `org.key` and get `undefined`:

- `src/orgs/handlers/list.mjs:8` — `key` is in `defaultFields`, so it appears in the JSON response body; and lines 14 and 16 render `o.key` into the terminal and text formats.
- `src/orgs/setup.mjs:47` — `const orgArgs = { org, orgKey : org.key }`, passed to every external `orgSetupMethod`.

Add `get key() { return this.#name }`. The registry key and `#name` are the same value by construction: `loadOrg` (`src/orgs/setup.mjs:36-41`) derives `orgName` from `pkgName.split('/')[0]` and uses it as both the map key and the `name` constructor argument.

Without this, task 003's `GET /orgs/list` returns `key: undefined` for every org and is not actually functional.

### 3. `Organization` overrides `save()`

The inherited `Model.save()` (`@liquid-labs/resource-model`, `src/Model.mjs:74-80`, identical in the installed `dist/`) does:

```js
const { errors } = this.validate()   // validate() is async; not awaited
if (errors.length > 0) { … }
```

Destructuring `errors` off a Promise yields `undefined`, so `errors.length` throws and **every** `save()` call rejects. `src/orgs/handlers/parameters-set.mjs:88` calls `org.save()` unawaited; the moment task 004 makes that line reachable, an unhandled promise rejection results, which on Node 18+ terminates the process by default. Fixing `jY7C` without this would turn a broken endpoint into a crashing one.

Even a working `Model.save()` would persist nothing: it iterates `#rootItemManagers` and `#subModels`, both empty for `Organization`, which loads its settings itself via `readFileSync` (`organization.mjs:31-40`) and never writes back.

Add an `async save()` override on `Organization` that writes `#settings` back to the same path it read from — `fsPath.join(projectPath, 'data', 'org', 'settings.yaml')` — using the `js-yaml` `dump` counterpart of the `load` already imported in that file, and `node:fs/promises`. Requirements:

- Extract the settings path into a private helper or field so the read and the write cannot drift apart.
- Create the containing directory if absent (`fs.mkdir(dirname, { recursive: true })`), so a first-ever setting write on an org whose `settings.yaml` did not exist (the `ENOENT` branch at `organization.mjs:36-40`) succeeds.
- Do not call `super.save()`. It cannot succeed, and there is nothing for it to do.
- Note in a header comment that this override exists because the base implementation is defective, with the file/line citation, so a future reader does not "simplify" it back.

Also fix, while in this file, the silent-swallow in the constructor's `catch` (`organization.mjs:36-40`): a non-`ENOENT` read error leaves `#settings` as `undefined`, which makes every later `getSetting` throw an unrelated `TypeError`. Either rethrow non-`ENOENT` errors or default `#settings` to `{}` in all cases. Keep the change minimal and state the choice in the commit message.

### 4. Tests

- `get-org.test.mjs`: returns the org for a known key; throws with `status === 404` for an unknown key; the thrown message names the key. Build the `app` mock in the shape `{ ext : { _liqOrgs : { orgs : { '@acme' : … } } } }`, following `@sdlcforge/core-server`'s `src/controls/handlers/orgs/controls/_lib/test/list-lib.test.mjs`.
- `organization.test.mjs`: `key` equals the constructor's `name`; a round trip of `updateSetting` then `save()` then constructing a fresh `Organization` over the same `projectPath` reads the new value back. Use a `fs.mkdtemp` temp directory, cleaned up in `afterAll`, as `src/test/index.test.mjs:76-86` already does.

## Validation

- `make test TEST=get-org` and `make test TEST=organization` pass.
- `make lint` is clean.
- Full `make test` shows no new failures beyond the pre-existing `project-lifecycle.test.mjs` failure (follow-up `2aMD`). Run `npm install` first if `node_modules/@liquid-labs/plugable-express` is absent.
- `grep -rn "liq-handlers-lib" src/orgs/handlers/_lib/` returns nothing.
- Confirm no file outside `/Users/zane/playground/sdlcforge/dev-core` was modified: `git status` in the task worktree shows only dev-core paths.
- Manual reasoning check recorded in the task report: walk `GET /orgs/list`'s JSON path with the new `key` getter in place and confirm `lodash.pick(org, ['key','commonName','legalName'])` inside `formatOutput` now yields three defined values for a real `Organization`.

## Metadata

architectural_impact: false

## Assumptions

- `http-errors` and `js-yaml` are already direct dependencies; no `package.json` dependency change is needed. Verify before adding anything.
- Task 001 may be editing `src/orgs/resources/lib/settings.mjs` concurrently. This task must not change that file, and must not depend on the reserved-segment guard task 001 adds.
- `app.ext._liqOrgs.orgs` is populated by the deferred `load orgs` setup method, which runs during the framework's `setup` phase — after handler `func`s are invoked but before any request is served. Anything reading the registry must therefore do so at request time, never at registration time.

## References

- [orgs handler defect analysis](../notes/orgs-handler-defect-analysis.md) — the `model`/`app` argument evidence, the `getOrgFromKey` source, and the `Model.save()` analysis.
- `@sdlcforge/core-server` `src/controls/handlers/orgs/controls/_lib/list-lib.mjs` and its test — read-only reference pattern for both the lookup and the test mocks.
- `src/orgs/setup.mjs:24-54` — how the registry is built and what `org.key` is used for.
- [`docs/dev-core-consolidation-contract.md`](../../docs/dev-core-consolidation-contract.md#appext-contract-freeze) — the frozen `app.ext` key names.

## Procedure

1. Read `src/orgs/resources/organization.mjs`, `src/orgs/setup.mjs`, and the core-server reference files.
2. Add `src/orgs/handlers/_lib/get-org.mjs` and its test.
3. Add the `key` getter, the `save()` override, and the constructor `catch` fix to `Organization`, plus its test.
4. Run the two scoped test invocations, then `make lint`, then full `make test`.

## Checkpoint hints

- After `get-org.mjs` and its test are green.
- After the `Organization` `key` getter and its assertion.
- After the `save()` override and its round-trip test.
