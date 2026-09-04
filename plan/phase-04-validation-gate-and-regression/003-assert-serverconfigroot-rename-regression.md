# Assert ServerConfigRoot Rename Regression

## Purpose and scope

Prove, with a permanent regression test, that a *future* framework rename of `appExt:serverConfigRoot` /
`setupArg:serverConfigRoot` — the exact shape of the historical `ynGa` bug (`serverHome` → `serverConfigRoot`
broke four consuming packages with no error at rename time and none at load time) — is caught at build time as
an `unsatisfied` finding naming `src/credentials/`'s in-tree component and the missing capability, with the
finding's `supersededBy` field naming the new capability name rather than the framework silently returning
`undefined`. This is the regression coverage
[`plan/phases/validation-gate-and-regression.md`](../phases/validation-gate-and-regression.md) calls "the
`ynGa` shape."

Depends on task 001 (`src/lib/test/helpers/resolve-plugin-set.mjs`). Parallel-eligible with tasks 002 and 004.

## Requirements

1. **Read the real, landed `credentials` component declaration first** (`readHostDeclaration()` against
   `core-server`'s real `package.json`, per task 002's same pattern — reuse task 001's shared helper for
   `readCoreServerPackageJSON`/`resolveCoreServerPackageRoot`). Confirm exactly which capabilities it actually
   `requires` that name `serverConfigRoot` — Phase 2's task doc draft names `setupArg:serverConfigRoot` (fixed
   `framework`-phase provide, fixed `load`-phase require) and `appExt:serverConfigRoot @ runtime`, both
   provided by the framework's own intrinsic manifest (`FRAMEWORK_MANIFEST`), never by `credentials` itself —
   but re-verify against the real, landed JSON rather than the draft.

2. **Construct a modified, synthetic `frameworkManifest`** by deep-cloning
   `FRAMEWORK_MANIFEST` (imported from `@liquid-labs/plugable-express`) and, in the clone only:
   - Remove the `provides` entries for `appExt:serverConfigRoot` and `setupArg:serverConfigRoot` (whichever of
     the two — or both — the real `credentials` component actually requires, per Requirement 1).
   - Add a new `provides` entry for a synthetic renamed capability (e.g. `appExt:serverConfigRootV2` /
     `setupArg:serverConfigRootV2`, matching each removed entry's own `phase`/`exclusive` values) carrying
     `supersedes: ['appExt:serverConfigRoot']` (or `['setupArg:serverConfigRoot']` respectively) — mirroring
     the exact worked example in `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md`'s
     `### supersedes` section (`{ capability: appExt:serverConfigRoot, phase: framework, supersedes:
     [appExt:serverHome] }` is the real intrinsic declaration for the *historical* rename; this task's synthetic
     clone reproduces the same shape one rename further along, to prove the mechanism still fires for a
     *future* one).
   - Do not mutate the real, imported `FRAMEWORK_MANIFEST` object in place — clone it (structured-clone or an
     equivalent deep-copy) so no other test file sharing the same module-level import is affected.

3. **Call `validatePluginGraph({ records: hostDeclaration.builtins, frameworkManifest: <the modified clone> })`**
   — `hostDeclaration.builtins` (the three real in-tree component records from `readHostDeclaration()`) is
   sufficient; the third-party (`@sdlcforge/dev-core`) half of this same rename shape is covered separately by
   task 004 against the real, unmodified graph, and is out of this task's scope.

4. **Assert:**
   - `result.ok === false`.
   - `result.findings` contains an `unsatisfied` (or `unsatisfied-phase`, whichever the actual phase-lattice
     comparison yields — confirm against the real result rather than assuming) finding whose `requirer.nodeId`
     is `@sdlcforge/core-server#credentials` and whose `capability.full` is the removed capability name
     (`appExt:serverConfigRoot` and/or `setupArg:serverConfigRoot`).
   - That finding's `supersededBy` field is populated and names the synthetic new capability
     (`appExt:serverConfigRootV2` / `setupArg:serverConfigRootV2`) — this is the specific, load-bearing
     assertion this task exists to make: proving the rename-affordance mechanism fires, not just that
     *something* becomes unsatisfied when a name disappears.
   - As a negative control in the same test file, confirm the **unmodified** `FRAMEWORK_MANIFEST` (no clone,
     default parameter) still resolves this same requirement `satisfied` — i.e. run the same
     `validatePluginGraph({ records: hostDeclaration.builtins })` call with no `frameworkManifest` override and
     assert no `unsatisfied` finding names `@sdlcforge/core-server#credentials` for this capability. This
     guards against the test accidentally passing because the *real* `credentials` declaration is already
     broken, rather than because the synthetic rename shape was correctly reproduced.

## Validation

- New test file (suggest `src/lib/test/plugin-graph-serverconfigroot-rename.test.js`) passes.
- The positive assertion (Requirement 4, second and third bullets) and the negative control (Requirement 4,
  fourth bullet) are both present and both pass.
- Temporarily removing the `supersedes:` entry from the synthetic clone (leaving the capability simply absent,
  with no rename affordance) causes the `supersededBy` assertion specifically to fail, proving that assertion
  is not vacuous — confirm this, then restore the `supersedes:` entry before committing.
- `make test` (full suite) still passes with this new file included.
- `FRAMEWORK_MANIFEST` itself (the real, imported module-level object) is provably unmutated after this test
  runs — e.g. a follow-up assertion or a separate `describe` block re-imports/re-checks it, or the clone
  mechanism used is one that is structurally incapable of mutating the source (e.g.
  `structuredClone(FRAMEWORK_MANIFEST)`, not a shallow spread of a nested structure).

## Assumptions

- Task 001's `src/lib/test/helpers/resolve-plugin-set.mjs` is landed.
- Phase 2's `credentials` component declaration is landed in `package.json` and actually requires
  `setupArg:serverConfigRoot` and/or `appExt:serverConfigRoot` — if it requires neither (a change from the
  current plan), halt and report rather than inventing a requirement to test against.

## References

- [`plan/phases/validation-gate-and-regression.md`](../phases/validation-gate-and-regression.md) — "The
  `ynGa` shape" bullet under Goals.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md`, `### supersedes` section — the exact
  worked example (`appExt:serverHome` → `appExt:serverConfigRoot`) this task's synthetic clone mirrors one
  rename further along, and the plain-language statement of what a consumer without a manifest of its own
  would still see (a bare "no provider" message) versus what a manifested consumer like `credentials` gets
  (the named rename).
- `@liquid-labs/plugable-express`'s `src/lib/framework-manifest.mjs` — `FRAMEWORK_MANIFEST`'s real, current
  shape; read directly before cloning it rather than assuming its structure.
- [`plan/phase-02-declare-in-tree-components/002-declare-credentials-component-manifest.md`](../phase-02-declare-in-tree-components/002-declare-credentials-component-manifest.md)
  — the sibling task that declares `credentials`'s real `requires`, including the explicit note that
  `appExt:serverConfigRoot` is provided by the framework's intrinsic manifest, never by `credentials` itself.
- [`plan/notes/manifest-ownership-boundary.md`](../notes/manifest-ownership-boundary.md) — the original `ynGa`
  bug analysis and the `liq-credentials-db` transitive-coverage relationship (context only; not directly
  exercised by this task).

## Status

**Outcome:** succeeded (2026-09-04).

Added `src/lib/test/plugin-graph-serverconfigroot-rename.test.js`. Confirmed against the real, landed
`package.json` that `credentials` requires both `setupArg:serverConfigRoot` (bare shorthand, fixed
`framework`-phase provide / fixed `load`-phase require) and `{ capability: appExt:serverConfigRoot, phase:
runtime }` — matching the Phase 2 draft. The test deep-clones the real `FRAMEWORK_MANIFEST` (imported from
`@liquid-labs/plugable-express`) via `structuredClone`, renames both provides entries in the clone only to
`appExt:serverConfigRootV2` / `setupArg:serverConfigRootV2` carrying `supersedes: [<removed capability>]`,
and calls `validatePluginGraph({ records: hostDeclaration.builtins, frameworkManifest: <clone> })` against
`readHostDeclaration()`'s real, landed `builtins` (the three in-tree component records).

Assertions (all passing):
- `result.ok === false` against the modified clone.
- For each of the two renamed capabilities: an `unsatisfied`/`unsatisfied-phase` finding whose
  `requirer.nodeId` is `@sdlcforge/core-server#credentials` and `capability.full` is the removed name, with
  `finding.supersededBy.capability` naming the synthetic new capability.
- Negative control: the same call with the real, unmodified `FRAMEWORK_MANIFEST` (no override) produces no
  `unsatisfied` finding naming `@sdlcforge/core-server#credentials` for either capability.
- `FRAMEWORK_MANIFEST` itself is unchanged after the clone-based tests ran (`toEqual` against a
  pre-test `structuredClone` snapshot).

Manually confirmed the `supersededBy` assertion is not vacuous: temporarily removed the `supersedes:` field
from the synthetic clone's provides entries, re-ran the test, confirmed the positive test failed specifically
on `expect(finding.supersededBy).toBeTruthy()` (the `ok === false` and negative-control assertions still
passed, since the capability still went unsatisfied — only the rename-affordance assertion failed), then
restored `supersedes:` before committing.

Ran `make lint-fix` per role responsibility #4; it auto-aligned this new file's object-literal colon spacing
to match the project's existing style (see `host-declaration.test.js`, `plugin-graph-gate.test.js`). It also
touched five unrelated pre-existing files (`plan/resources/validate-check.mjs`,
`test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`,
`test/test-server.js`) with formatting/lint-fix changes unrelated to this task's scope and reported
pre-existing lint errors in those same files (`no-mixed-operators`, `no-unused-vars`,
`no-return-assign`) that predate this task; those five files' changes were reverted (`git checkout --`)
to keep this task's diff scoped to the new test file, and the pre-existing lint errors were left
unaddressed as out of scope.

`make test` (full suite): 15 suites / 49 tests, all passed, including the new file.

Files touched: `src/lib/test/plugin-graph-serverconfigroot-rename.test.js` (new).
