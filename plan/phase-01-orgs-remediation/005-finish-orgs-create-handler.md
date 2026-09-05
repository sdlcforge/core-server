# Finish And Secure Orgs Create Handler

## Purpose and scope

Finish `POST /orgs/create/:newOrgKey`, which today creates a directory and then falls off the end of its function at a bare `// TODO` so the request hangs until client timeout (`jY7C`), and close security follow-up `DGt0`(a), the unvalidated caller-supplied path that reaches `fs.mkdir(…, { recursive: true })`.

Files:

- `src/orgs/handlers/create.mjs`
- new `src/orgs/handlers/test/create.test.mjs`

This task shares no source file with tasks 001-004 and 006, so it is parallel-eligible with all of them.

No standard skill covers this; follow the `## Procedure` below.

## Requirements

### 1. Validate `localDataRoot` for containment, before any filesystem write

`create.mjs:30-35` reads `localDataRoot` from `req.vars` and concatenates it unmodified:

```js
const { localDataRoot } = req.vars
const localRootDir = localDataRoot + '/org'
await fs.mkdir(localRootDir, { recursive : true })
```

`localDataRoot` is a body/query parameter, not a path variable, so no `validationRe` constrains it — path variables are the only thing `pathToRe` constrains (`plugable-express`, `src/lib/path-to-re.mjs:20-21`) — and the parameter definition declares no `matcher`, which is the only per-parameter check `processParams` applies (`plugable-express`, `src/lib/register-handlers.js:73`). Any caller can therefore create a directory tree anywhere the server process can write. This executes first, so it is a live side effect independent of the never-responds defect.

Add containment validation that runs **before** `fs.mkdir`:

- Anchor on `app.ext._liqProjects.playgroundPath`, set by the `projects` submodule at `src/projects/setup.mjs:27-33` (`PLUGABLE_PLAYGROUND`, else `$HOME/playground`). This is the correct anchor on the merits, not just for safety: `orgs`' own `load orgs` setup method only discovers orgs by scanning that same tree (`src/orgs/setup.mjs:28-33`), so a data directory created outside it can never be picked up by the registry.
- Resolve the candidate with `fsPath.resolve` and require that the result is the playground root itself or a descendant of it. Compare against `playgroundRoot + fsPath.sep` (or use `fsPath.relative` and reject a result that is absolute or starts with `..`) so a sibling directory sharing a name prefix — `/home/u/playground-evil` against `/home/u/playground` — is rejected rather than accepted by a naive `startsWith`.
- Reject with a 4xx (`createError.BadRequest` from `http-errors`, already a direct dependency) whose message states the constraint without echoing an unescaped caller-supplied path into a terminal-formatted response.
- Reject before creating anything. A rejected request must leave the filesystem untouched.
- `..` segments, absolute paths, and symlink-shaped inputs are all covered by resolving first and comparing after; do not hand-roll a `..`-substring blocklist.

Guard the case where `app.ext._liqProjects` is absent (a handler test's hand-built mock, or a server where the `projects` submodule did not load) with a clear error rather than a `TypeError`.

### 2. Use `fsPath.join`, not string concatenation

Replace `localDataRoot + '/org'` with a `fsPath.join`. Import `node:path` as the rest of the package does (`src/projects/setup.mjs:2`, `src/orgs/resources/organization.mjs:2`).

### 3. Send a real 2xx response

The handler currently ends at `// TODO` with the `commonName`, `legalName`, and `newOrgKey` destructures commented out "to pass lint until we rebuild 'create'". Restore the destructures and finish the function.

Follow the response convention the rest of dev-core uses for mutating endpoints: `httpSmartResponse({ data, msg, req, res })` from `@liquid-labs/http-smart-response`, already a direct dependency and used at fifteen sites across `src/projects/` and `src/projects-audit/` — for example `src/projects/handlers/_lib/detail-lib.mjs:13` (`data` + `msg`) and `src/projects/handlers/_lib/destroy-lib.mjs:93`. Prefer that over the `res.type(...)/switch` ladder the sibling `parameters-*` handlers use; those predate the convention.

- `msg` — a human sentence naming the created org and the directory created.
- `data` — the created org resource as this handler actually knows it: `newOrgKey`, `commonName`, `legalName`, and the resolved directory path. Do not invent fields the handler does not have.
- Status: the default 2xx `httpSmartResponse` produces is fine; do not hand-set a status unless the convention elsewhere in the package does.

**Scope fence — do not build more than this.** The handler creates a directory. It does not write `org.json` or `settings.yaml`, does not construct an `Organization`, and does not register anything into `app.ext._liqOrgs.orgs` (that map is populated only by the `load orgs` setup method scanning the playground for a `package.json` with `liq.packageType === 'org'`, so a bare new directory will not appear there until the org is a real project). The `help.description` text claims `org.json` is saved to `localDataRoot`; it is not, and never was. Record that gap in the task report for task 008 to file as a follow-up, and either soften the `help.description` to match what the endpoint actually does or leave it and say so explicitly in the report — do not leave a silently false help string with no record.

### 4. Remove the `KNOWN BROKEN` comment

Delete the five-line block at `create.mjs:37-41`, including the bare `// TODO`, and the "commented out to pass lint" note at line 31.

### 5. Tests

Add `src/orgs/handlers/test/create.test.mjs`. There is no existing `orgs` handler test to copy; `@sdlcforge/core-server`'s `src/controls/handlers/orgs/controls/_lib/test/list-lib.test.mjs` is the closest mock-shape reference (read-only, separate project), and `src/test/index.test.mjs:76-86` shows the `fs.mkdtemp` temp-playground pattern this suite needs.

Cover:

- **Happy path** — a `localDataRoot` inside a temp playground creates the expected directory and produces a 2xx response whose body carries the org fields. Assert the directory really exists with `fs.stat`.
- **Containment rejection** — `/tmp/escape`, `<playground>/../escape`, and `<playground>-evil` are each rejected with a 4xx, and `fs.stat` confirms nothing was created.
- **Idempotence** — a repeat call on an existing directory does not throw (`recursive: true` semantics) and still responds.
- **Missing `app.ext._liqProjects`** — produces a clear error rather than a `TypeError`.

Use `fs.mkdtemp` in `beforeAll` and clean up in `afterAll` with `fs.rm({ force: true, recursive: true })`. Do not depend on `$HOME`.

## Validation

- `make test TEST=create` passes — check the pattern does not also pull in `src/projects/handlers/` create tests, and narrow it if it does.
- `make lint` is clean, including with the previously commented-out destructures restored.
- Full `make test` shows no new failures beyond the pre-existing `project-lifecycle.test.mjs` failure (follow-up `2aMD`). Run `npm install` first if `node_modules/@liquid-labs/plugable-express` is absent.
- `grep -n "KNOWN BROKEN\|// TODO\|pass lint" src/orgs/handlers/create.mjs` returns nothing.
- `grep -n "localDataRoot + " src/orgs/handlers/create.mjs` returns nothing.
- Manual reasoning check recorded in the task report: trace a request with `localDataRoot=/etc` against a real `app.ext._liqProjects.playgroundPath` and confirm the rejection happens before `fs.mkdir` is reached.
- `src/test/index.test.mjs`'s route-surface assertions still pass — the `path` and `method` exports are unchanged.
- Confirm `git status` in the task worktree shows only dev-core paths.

## Metadata

architectural_impact: false

## Assumptions

- `http-errors`, `@liquid-labs/http-smart-response`, and `node:path` are all already available; verify before adding any dependency.
- This task depends on no other task in the phase. It does not use task 002's `get-org.mjs` — `create` takes `newOrgKey` for an org that does not exist yet, so there is nothing to look up.
- The route (`POST`, `['orgs','create',':newOrgKey']`) and the three declared parameters are unchanged.
- `newOrgKey` is already constrained by its own path-variable pattern `(?:@|%40)[a-z][a-zA-Z0-9-]*` (`src/orgs/setup.mjs:59-62`), so it is not a path-injection vector. `localDataRoot` is the only unvalidated input here.

## References

- [orgs security findings](../notes/orgs-security-findings.md) — the containment analysis and why `playgroundPath` is the right anchor.
- [orgs handler defect analysis](../notes/orgs-handler-defect-analysis.md) — background on the `orgs` handler set.
- `src/projects/handlers/_lib/detail-lib.mjs:13`, `src/projects/handlers/_lib/destroy-lib.mjs:93`, `src/projects/handlers/_lib/update-lib.mjs:40` — the `httpSmartResponse` convention to follow.
- `src/projects/setup.mjs:27-33` — where `playgroundPath` comes from.

## Procedure

1. Read `create.mjs`, `src/projects/setup.mjs`, and two or three `httpSmartResponse` call sites.
2. Add the containment check and the `fsPath.join`.
3. Restore the destructures and build the response.
4. Remove the `KNOWN BROKEN`/`TODO`/lint-workaround comments and resolve the `help.description` gap per requirement 3.
5. Add the test suite.
6. Run the scoped test, `make lint`, then full `make test`.

## Checkpoint hints

- After the containment check and its rejection tests.
- After the response is built and the happy-path test passes.
- After the comment cleanup and the full lint/test run.

## Status

**Outcome:** succeeded. Implemented 2026-09-04.

- `src/orgs/handlers/create.mjs`: added the pre-`fs.mkdir` containment check (anchored on `app.ext._liqProjects.playgroundPath`, resolved via `fsPath.resolve`/`fsPath.relative`, rejecting with `createError.BadRequest` on escape without echoing the caller-supplied path), guarded the missing-`_liqProjects` case with `createError.InternalServerError` instead of a `TypeError`, switched `localDataRoot + '/org'` to `fsPath.join`, restored the `commonName`/`legalName`/`newOrgKey` destructures, built the `httpSmartResponse({ data, msg, req, res })` response (`data`: `commonName`, `legalName`, `newOrgKey`, `directory` — the resolved `org` subdirectory path), and removed the `KNOWN BROKEN`/bare `// TODO`/"pass lint" comment block.
- `help.description`/`help.summary`: softened the false "root data element (`org.json`) is saved to `localDataRoot`" claim to describe what the handler actually does (creates the `org` data directory only), and fixed two pre-existing grammar typos in the same strings ("Creates a organization new organization locally" → "Creates a new organization locally"; "may or may tied to" → "may or may not be tied to") as a same-diff self-fix.
- Added `src/orgs/handlers/test/create.test.mjs` covering: happy path (directory created, 2xx body with org fields, verified via `fs.stat`); containment rejection for an absolute out-of-tree path (`/tmp/escape`), a `..`-escape (`<playground>/../escape`), and a sibling-prefix path (`<playground>-evil`), each asserted 4xx and `fs.stat` confirming nothing was created; idempotent repeat call on an existing directory; and a missing-`app.ext._liqProjects` case asserting a non-`TypeError` 500.
- Folded in an unrelated single-file lint fix in `src/test/plugin-manifest.test.mjs` (two `operator-linebreak` violations, auto-fixed via `make lint-fix`) so `make lint` is clean; this file is otherwise untouched by this task.
- Manual reasoning check: with `localDataRoot=/etc` and a real `app.ext._liqProjects.playgroundPath` (e.g. `/Users/x/playground`), `fsPath.relative('/Users/x/playground', '/etc')` yields a string starting with `..`, so `isContained` is `false` and `createError.BadRequest` throws before the `fs.mkdir` call is reached (the mkdir call is textually and temporally after the containment check in `func`).
- Gap not resolved by this task (flagged for task 008 / follow-up filing): the `localDataRoot` parameter's own `description` still says "in which to save `./orgs/org.json`", which remains inaccurate (the handler never writes `org.json`) — left unchanged per the task's "three declared parameters are unchanged" assumption; only `help.description`/`help.summary` were softened.

### Validation

- `make test TEST=create` — passed (1 suite, 6 tests; confirmed the pattern does not pull in `src/projects/handlers/` create tests).
- `make lint` — clean (after folding in the unrelated `plugin-manifest.test.mjs` autofix noted above).
- Full `make test` — 1 failed suite (`projects/handlers/_lib/test/project-lifecycle.test.js`, the pre-existing failure tracked as follow-up `2aMD`), 15 passed, no new failures.
- `grep -n "KNOWN BROKEN\|// TODO\|pass lint" src/orgs/handlers/create.mjs` — no output.
- `grep -n "localDataRoot + " src/orgs/handlers/create.mjs` — no output.
- `src/test/index.test.mjs` — passed; route surface (`path`/`method`) unchanged.
- `git status` in the task worktree shows only dev-core paths.
