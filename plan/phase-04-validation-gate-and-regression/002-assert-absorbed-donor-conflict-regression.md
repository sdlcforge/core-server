# Assert Absorbed-Donor Conflict Regression

## Purpose and scope

Prove, with a permanent regression test, that re-introducing any of the three absorbed donor packages —
`@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, `@liquid-labs/liq-integrations-issues-github` —
is detected by the plugin graph engine as a `conflict` finding naming both providers, before any side effect.
Today the first two fail late and cryptically at boot (`Non-unique command path: <path>`,
`Path variable 'credential' is already registered.`) and the third fails *silently and permanently* (its two
integration providers simply register twice, with nothing anywhere to catch it —
`src/lib/app-init.mjs:40-51` documents this). This task turns all three into a build-time-detected `conflict`.

Depends on task 001 (`src/lib/test/helpers/resolve-plugin-set.mjs`). Parallel-eligible with tasks 003 and 004.

## Requirements

1. **Do not read from real `node_modules`.** None of the three donors is actually installed (they were
   absorbed in-tree), and `@liquid-labs/plugable-express`'s host-level resolver (`resolvePluginSet`, the
   function `validatePluginSet()` composes) is not exported publicly — only `validatePluginSet()`,
   `validatePluginGraph()`, `readHostDeclaration()`, `resolvePluginManifest()`, and `FRAMEWORK_MANIFEST` are.
   Build this regression test entirely from those exported functions:
   - `readHostDeclaration(pkg, { dir })` — reads `core-server`'s **real, live** `package.json` `plugable.host`
     block and returns (among other fields) `.builtins`, the three already-normalized in-tree component
     records (`@sdlcforge/core-server#controls`, `#credentials`, `#issues-github`), each carrying its real
     `provides`/`requires` as landed by Phase 2. Use `readCoreServerPackageJSON()` from task 001's shared
     helper to get `pkg`.
   - `resolvePluginManifest({ dir, pkg, source })` — the plugin-side manifest reader/normalizer. Use it to
     build **one synthetic donor record per absorbed donor**, by constructing a minimal in-memory `pkg` object
     carrying a `package.json`-block-form `"plugable"` declaration (the same form `resolvePluginManifest` reads
     for any ordinary plugin — see `readPackageManifest` internally). `dir` does not need to exist on disk:
     `resolvePluginManifest` only calls `existsSync(path.join(dir, 'plugable.yaml'))` to check for the
     file-form manifest, and a nonexistent path simply resolves that check to `false`, falling through to the
     package-block reader since the synthetic `pkg.plugable` is present. Pass `source: 'serverPackageRoot'`
     (matching how each donor was really loaded, as an `explicitPlugins` entry, before absorption).
   - `validatePluginGraph({ records })` — combine `hostDeclaration.builtins` with one synthetic donor record
     and call this directly. `frameworkManifest` can be left at its default (`FRAMEWORK_MANIFEST`); this
     regression does not depend on the framework node at all. Conflict detection
     (`detectConflicts`/`plugin-graph/conflicts.js`) is a pure function of the records' declared `provides` and
     does not depend on `loadIndex`/`source`/load order, so the synthetic donor's own load-position fields
     need not be realistic — only its `provides` entry needs to collide with a real in-tree provide.

2. **Select each donor's colliding capability from the real, landed component declarations** (read
   `package.json`'s actual `plugable.host.builtins` array directly — do not transcribe from
   [plugin-set-inventory.md](../notes/plugin-set-inventory.md) or the Phase 2 task docs, which are drafts/plans,
   not necessarily byte-identical to what landed), guided by
   `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md`'s "Reserved kinds and their defaults"
   table (`pathVar:` and `setupMethod:` are `exclusive: true` by default; `integration:`/`integrationHook:` are
   `exclusive: false` by default — so a duplicate `integration:`/`integrationHook:` provide alone does **not**
   produce a `conflict` finding, only a duplicate `pathVar:` or `setupMethod:` provide does):
   - **`liq-credentials`** → duplicate the `credentials` component's `pathVar:credential @ load` provide. This
     is the capability whose real-world duplicate-registration crash (`Path variable 'credential' is already
     registered.`) this shape reproduces most directly.
   - **`liq-controls`** → duplicate one (or both) of the `controls` component's `setupMethod:` provides
     (`setupMethod:load org controls` and/or `setupMethod:load controls integrations`), both `exclusive: true`
     (fixed) per the schema.
   - **`liq-integrations-issues-github`** → duplicate the `issues-github` component's
     `setupMethod:register github issues integrations` provide. Its `integration:tickets`/`integration:pull
     request` provides are declared `exclusive: false` (and `conditional: true`), so duplicating those alone
     would **not** trigger `conflict` — verify this understanding against the real landed declaration before
     writing the test, since it is exactly the shape that makes this donor's real-world double-load silent
     today, and the `setupMethod:` provide is what turns it into a detected one.
3. **One `test.each`-style parameterized test**, one case per donor, each asserting:
   - `result.ok === false`.
   - `result.findings` contains exactly one `kind: 'conflict'` finding for the colliding capability, whose
     `providers` array names both the real in-tree component's `nodeId` and the synthetic donor's `nodeId`.
   - No `exclusivity-disagreement` finding is produced instead (that would mean the two providers' `exclusive`
     flags disagree, which would mean this task picked the wrong donor `provides` entry or got the real
     component's `exclusive` value wrong — re-check against `docs/plugin-manifest-schema.md`'s reserved-kinds
     table if this happens rather than loosening the assertion).
4. Add a file-level comment explaining, for a future reader, why the test builds its own synthetic donor
   records instead of installing the real donor packages (they no longer exist as separate installable
   packages — their functionality is in-tree) and why it uses `readHostDeclaration`/`resolvePluginManifest`
   rather than an internal, unexported resolver.

## Validation

- New test file (suggest `src/lib/test/plugin-graph-absorbed-donor-conflicts.test.js`) passes.
- Confirm by temporarily changing one donor's synthetic `provides` capability name to something
  non-colliding and re-running the test — it must fail (proving the test is not vacuously true) — then revert
  before committing.
- `make test` (full suite) still passes with this new file included.
- The test imports only `readHostDeclaration`, `resolvePluginManifest`, `validatePluginGraph` from
  `@liquid-labs/plugable-express`, plus `readCoreServerPackageJSON`/`resolveCoreServerPackageRoot` from task
  001's shared helper — no direct `node_modules`/filesystem manipulation of a real donor package.

## Assumptions

- Task 001's `src/lib/test/helpers/resolve-plugin-set.mjs` is landed and exports `readCoreServerPackageJSON`.
- Phase 2's three in-tree component declarations are landed in `package.json` by the time this task runs (a
  cross-phase dependency, not enforced by task 001 alone — if `package.json` has no `plugable.host.builtins`
  entries yet, halt and report).

## References

- [`plan/phases/validation-gate-and-regression.md`](../phases/validation-gate-and-regression.md) — "The
  absorbed-donor conflict" bullet under Goals, and this phase's Outputs.
- `src/lib/app-init.mjs:40-51` — the real comment documenting each donor's real-world failure symptom.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` — "Reserved kinds and their defaults"
  (exclusivity defaults per capability kind) and `docs/plugin-manifest-schema.md`'s `plugable.host` block
  section (the `readHostDeclaration()` contract).
- `@liquid-labs/plugable-express`'s `src/lib/plugin-manifest/resolve-plugin-manifest.js` and
  `src/lib/host-declaration.js` — the two reader functions this task composes, read directly to confirm their
  exact parameter/return shapes before writing the test.
- `@liquid-labs/plugable-express`'s `src/lib/plugin-graph/conflicts.js` — `detectConflicts()`'s exact
  `conflict`-vs-`exclusivity-disagreement` decision rule.
- [`plan/phase-02-declare-in-tree-components/`](../phase-02-declare-in-tree-components) — the three sibling
  task docs that declare the real capabilities this task's synthetic collisions target (drafts; re-verify
  against the actually-landed `package.json`).

## Status

**Outcome:** succeeded (2026-09-04).

Added `src/lib/test/plugin-graph-absorbed-donor-conflicts.test.js`, a `test.each`-style parameterized test with
one case per absorbed donor (`@liquid-labs/liq-credentials`, `@liquid-labs/liq-controls`,
`@liquid-labs/liq-integrations-issues-github`). Each case reads the real, live `plugable.host.builtins`
declarations via `readHostDeclaration()`, builds one synthetic donor record via `resolvePluginManifest()`
targeting the real component's colliding `pathVar:`/`setupMethod:` provide (per requirement 2's mapping —
verified directly against `package.json`'s landed `plugable.host.builtins`, not against the phase-02 drafts),
and calls `validatePluginGraph()` directly, exactly as the task's Requirements specify.

**One requirement-3 refinement, verified against the real engine source rather than assumed:** the literal
"exactly one `conflict` finding" wording does not hold for the two `setupMethod:`-kind donors
(`liq-controls`, `liq-integrations-issues-github`). `@liquid-labs/plugable-express`'s graph engine legitimately
produces **two** independent `conflict` findings for a duplicated `setupMethod:` capability — one from the
general provider-index-based detector (`plugin-graph/conflicts.js#detectConflicts`), and a second from the
setup-queue model's own duplicate-setup-method-name detector
(`plugin-graph/setup-queue-model.js#findDuplicateNameConflicts`), which tracks `setupMethod:` capabilities by
bare name in `DependencyRunner`'s own setup queue — a second, independent place a duplicate is caught. This is
documented in `validate-plugin-graph.js`'s own JSDoc ("the setup-queue model ... contributes ... duplicate-name
'conflict' findings over the 'setupMethod:' subset") and confirmed empirically. The `pathVar:` donor
(`liq-credentials`) is unaffected by the setup-queue model and does surface exactly one. The test asserts,
robustly: every finding for the colliding capability has `kind: 'conflict'` (never
`exclusivity-disagreement`), at least one such finding exists, and every one of them names exactly the real
in-tree component's `nodeId` and the synthetic donor's `nodeId` — preserving the full intent of requirement 3
without asserting a cardinality that is false for two of the three donors. See the file-level comment in the
test for the full rationale.

**Validation:**
- New test file passes: 3/3 cases green (`TEST=plugin-graph-absorbed-donor-conflicts make test`).
- Non-vacuousness confirmed by temporarily mutating the `liq-credentials` case's `collidingCapability` to a
  non-colliding name and re-running — the test failed as expected — then reverted before committing.
- `make test` (full suite, 15 suites / 48 tests) passes with the new file included.
- The test imports only `readHostDeclaration`, `resolvePluginManifest`, `validatePluginGraph` from
  `@liquid-labs/plugable-express`, plus `readCoreServerPackageJSON`/`resolveCoreServerPackageRoot` from task
  001's shared helper — no direct `node_modules`/filesystem manipulation of a real donor package.
- Lint: no findings in the new file (`npx eslint` against the project's Catalyst ESLint config, scoped to the
  new file). Pre-existing, unrelated lint findings elsewhere in the repo (`plan/resources/validate-check.mjs`,
  `test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`, `test/test-server.js`)
  are out of this task's scope and were left untouched.

**Affected files:**
- `src/lib/test/plugin-graph-absorbed-donor-conflicts.test.js` (new)
- `plan/phase-04-validation-gate-and-regression/002-assert-absorbed-donor-conflict-regression.md` (this status
  update)

**Assumptions applied:** both of this task doc's stated `## Assumptions` held — task 001's helper was landed
and exports `readCoreServerPackageJSON`, and Phase 2's three in-tree component declarations are present in
`package.json`'s `plugable.host.builtins`.
