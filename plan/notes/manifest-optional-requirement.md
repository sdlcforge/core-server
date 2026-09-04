# Manifest Optional Requirement

## Purpose and scope

Research findings backing the manifest half of this plan: why `appExt:_liqOrgs.orgSetupMethods` is provably an optional requirement, exactly what changes in the drift-guard suite, and what the downstream consequence is for a project this plan must not edit.

## The requirement is provably optional

`src/orgs/setup.mjs` pushes three deferred setup methods. Two of them bracket the capability:

- `prepare org dependencies` (lines 6-10, `deps : ['!']`, runs first) unconditionally assigns `app.ext._liqOrgs = { orgSetupMethods : [] }`. The array always exists.
- `process org setup` (lines 15-19 and 43-54, `deps : ['*']`, runs last) iterates it:

  ```js
  for (const org of Object.values(app.ext._liqOrgs.orgs)) {
    for (const orgSetupMethod of app.ext._liqOrgs.orgSetupMethods) { … }
  }
  orgDepRunner.complete()
  await orgDepRunner.await()
  ```

  An empty inner array enqueues nothing; `complete()`/`await()` on an empty `DependencyRunner` queue is a no-op.

Nothing in dev-core ever pushes onto `orgSetupMethods`. The only writer is the external, unmanifested `liq-policy` package, which need not be installed. So the requirement degrades gracefully exactly the way the `work` component's already-`optional: true` `integrationHook:controls/getQuestionControls` requirement does.

## Exact manifest edit

In `package.json`'s `plugable.components[1]` (`orgs`) `requires` array, the entry is currently:

```json
{
  "capability": "appExt:_liqOrgs.orgSetupMethods",
  "phase": "setup",
  "reason": "src/orgs/setup.mjs:46, inside 'process org setup'; the array is populated by liq-policy, outside this package"
}
```

It gains `"optional": true`, mirroring the shape of the existing precedent in the same block (the `work` component's last `requires` entry, which carries `capability`/`phase`/`optional`/`reason` in that key order), and its `reason` is rewritten to state *why* it is optional rather than only where it is read. Nothing else in the block changes.

## Validator semantics

`plugable-express`'s `normalize-manifest.js:330` reads `entryObj.optional` as a boolean (default `false`), and `validate-plugin-graph.js:69` states that "an unsatisfied optional contributes" an `info`-severity finding rather than an `error`. `validate-plugin-set.js:85`'s `strictOptional` flag exists precisely to promote `info` back to `error`, confirming `info` is the default. The already-shipped `integrationHook:controls/getQuestionControls` entry is the empirical proof: the drift-guard suite asserts it at `(info)` today.

## Exact drift-guard suite edits

`src/test/plugin-manifest.test.mjs` currently asserts, at lines 134-141:

```js
expect(findingsShape).toEqual([
  'appExt:_liqOrgs.orgSetupMethods <- @sdlcforge/dev-core#orgs@setup (error)',
  'appExt:credentialsDB <- @sdlcforge/dev-core#projects@load (error)',
  'appExt:credentialsDB <- @sdlcforge/dev-core#work@runtime (error)',
  'integrationHook:controls/getQuestionControls <- @sdlcforge/dev-core#work@runtime (info)'
])
expect(result.counts).toEqual({ error : 3, warning : 0, info : 1 })
```

After the change the first entry becomes `(info)` and the counts become `{ error : 2, warning : 0, info : 2 }`. The array is `.sort()`ed, and `'appExt:_liqOrgs…'` still sorts first, so only the severity token moves.

The prose comment block at lines 112-122 explicitly names `appExt:_liqOrgs.orgSetupMethods` as one of the requirements that "legitimately report unsatisfied at `error` severity" and names "the one optional hook". Both statements become false and must be rewritten, not just the assertion — the comment is the part that tells a future reader not to "fix" this suite by tightening it. `result.ok` stays `false` (two `error` findings remain), so the test at line 124 is unchanged.

## Prerequisite: `node_modules` is stale in this checkout

`@liquid-labs/plugable-express` is a `devDependency` (`package.json`) and appears in `package-lock.json`, but is **not** present in `node_modules/@liquid-labs/` in the working checkout — `node_modules` predates the `package.json` revision that added it. `npm install` must be run before `make test` can exercise `src/test/plugin-manifest.test.mjs` at all.

`qa/unit-test.txt` records the current baseline as 1 failed suite / 7 failed tests out of 14 suites / 82 tests. The failing suite is the live-GitHub integration test `src/projects/handlers/_lib/test/project-lifecycle.test.mjs`, tracked as follow-up `2aMD`. It is a pre-existing failure, unrelated to this plan.

## Downstream consequence in a project this plan must not edit

`@sdlcforge/core-server`'s `src/lib/test/plugin-graph-gate.test.js:31-42` hard-codes:

```js
const ALLOWLISTED_ERROR_FINDINGS = [
  { kind : 'unsatisfied',              capabilityFull : 'appExt:_liqOrgs.orgSetupMethods', requirerNodeId : '@sdlcforge/dev-core#orgs' },
  { kind : 'violated-by-source-order', capabilityFull : 'appExt:_liqOrgs.orgs',            requirerNodeId : '@sdlcforge/core-server#controls' }
]
```

and asserts `errorFindings.length === ALLOWLISTED_ERROR_FINDINGS.length` (line 69). Once dev-core publishes the `optional: true` manifest, the first entry stops being an error finding and that gate fails on the length assertion until core-server drops the entry — the suite's own comment at lines 28-30 anticipates exactly this ("a future change to `dev-core#orgs` that alters this exact finding set … should force a fresh look").

core-server is a separate project and out of this plan's scope, so this plan records the consequence as a follow-up in dev-core rather than editing it. The surviving second entry is core-server follow-up `Pwdb`, whose root cause is a validator limitation already filed against `plugable-express` as follow-up `dN2a`: `core-server`'s `src/controls/setup.mjs` pushes its `load org controls` setup method with `deps : ['load orgs']`, so `DependencyRunner` guarantees the ordering the source-order model flags as violated. Neither is fixable from dev-core.

## Follow-up bookkeeping discrepancy

The change request states that follow-up `CNMB` "currently exists in dev-core's `plan/followups.yaml`". It does not. dev-core's `plan/followups.yaml` holds 13 items — `jY7C`, `AEsA`, `0RpG`, `0eWj`, `2aMD`, `g23a`, `pWxw`, `DGt0`, `IxJv`, `AhMK`, `7ZF2`, `bTGn`, `OmUC`. `CNMB` and `Pwdb` both live in `@sdlcforge/core-server`'s `plan/followups.yaml` (lines 210 and 220), raised by that project's `sdlc-plugin-manifest` plan. `CNMB`'s text is "plugable-express-validate surfaces one unsatisfied error and one info finding against dev-core#orgs/#work, pre-existing and outside this task's scope" — the same observation from core-server's side.

There is therefore no `CNMB` for dev-core to close. The dev-core-side item this plan actually closes is the manifest work itself, and the cross-project consequence is carried by the new follow-up described above, which core-server's maintainer acts on together with their own `CNMB`.
