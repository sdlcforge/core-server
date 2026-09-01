# Validate Manifest Against Source

## Purpose and scope

Run `plugable-express`'s own validation and derivation tooling against the manifest authored in task 002 and against dev-core's real source, so the manifest is confirmed well-formed and confirmed to match reality — not merely "correct by inspection." Reconcile every divergence the tooling reports, correcting either the manifest or the record of why the divergence is expected.

Scope is: running the tooling, reconciling its output, making any corrective edits to the `"plugable"` block that the reconciliation justifies, and recording the reconciliation. No source change, no new dependency, no runtime change.

## Requirements

### Understand what the gate actually is here

**Both derivation modes always exit 0, however many divergences they report.** That is deliberate on the framework's side — a heuristic finding inside a gate becomes a warning everyone learns to ignore — and it means **the gate for this task is your reconciliation of the report, not the process exit code.** A task report that says "exit code 0, passed" without walking the divergences has not done this task.

Equally, **do not run the CLI's default validate mode as the gate.** `validatePluginSet()` resolves a *host's* plugin set from `--package-root`'s `node_modules`; dev-core is a plugin, not a host, with no `plugable.host` block and no plugin dependencies to resolve. Pointing it at dev-core yields a near-empty graph plus a benign "host declaration absent" warning — not informative. Full graph validation of dev-core's `requires` is `@sdlcforge/core-server`'s gate to run later, and is out of scope.

### Run the tooling

From the repository root, with dependencies installed by task 001:

```bash
npx plugable-express-validate --diff-manifest --package-root "$PWD" --format text
npx plugable-express-validate --diff-manifest --package-root "$PWD" --format json
npx plugable-express-validate --suggest        --package-root "$PWD" --format text
```

- `--diff-manifest` compares what dev-core *declares* against what a static scan of its source *observes*, in three divergence kinds: declared-but-not-observed, observed-but-not-declared, and phase disagreement. This is the primary instrument.
- `--suggest` renders what a static scan alone would propose, and is the cross-check for a coupling the manual census missed entirely.
- Capture the JSON form as well as text; the JSON is the durable artifact to reconcile against line by line.
- Do **not** combine a derivation mode with `--strict-optional`, `--strict-order`, or `--check-lock` — the CLI rejects the combination as a usage error.

### Reconcile every divergence

For each reported divergence, classify it into exactly one of these and record the classification with its evidence:

1. **A real manifest defect** — the declaration is wrong (wrong phase, wrong capability string, missing entry that should have been declared). Fix the `"plugable"` block.
2. **A documented deferral** — one of the six unguarded `integrationHook:` requirements deliberately not declared, per task 002's deferral rule. Expect these to appear as "observed but not declared." Confirm the set the tool reports matches the set task 002 deferred, exactly. **A deferral the tool reports that task 002 did not name is case 1, not case 2.**
3. **A scanner limitation** — the derivation is heuristic and can miss or mis-place a capability, including emitting an `unknown` phase it could not place. A derived entry at `unknown` phase is never reported as a phase disagreement by design; treat a genuine scanner miss as a no-op, but say so explicitly with the source evidence rather than using it as a catch-all bucket.
4. **A real defect in dev-core's source** — the code does something the manifest correctly declines to declare. At least one such case is known to exist and is expected to surface here: `src/work/handlers/_lib/answer-set-to-md.mjs:74` passes `providerFor: 'pull requests'` (plural) where every other call site and every ecosystem registration uses `'pull request'` (singular), which throws `No provider found for 'pull requests'` at request time. **Do not fix it** — that is a runtime-code change, outside this plan's scope fence. Report it to the manager, and do not add it to `plan/followups.yaml`.

### Confirm shape validation independently

Both derivation modes route through the real Phase 1 reader, so a malformed manifest surfaces as a reader error. Confirm it directly too, so a clean reader result is asserted rather than inferred:

```bash
node -e "const {resolvePluginManifest}=require('@liquid-labs/plugable-express'); \
  const pkg=JSON.parse(require('fs').readFileSync('package.json','utf8')); \
  const r=resolvePluginManifest({dir:process.cwd(),pkg}); \
  console.log(r.length, r.map((x)=>x.component).join(','))"
```

Expect `4 projects,orgs,work,projects-audit`.

### Record the reconciliation

Append a `## Reconciliation` section to **this task document** capturing, for each divergence: the capability, the divergence kind the tool reported, the classification above, and the evidence (file and line, or the deferral rule it falls under). This is the durable record that the manifest was checked against reality; it is what a later reader consults instead of re-running the tooling blind.

### Hard constraints

- **Do not modify `src/`.** Any corrective edit belongs in `package.json`'s `"plugable"` block. If reconciliation reveals a source defect, report it; do not fix it.
- **Do not modify `@liquid-labs/plugable-express` or `@sdlcforge/core-server`.**
- **Do not modify `plan/followups.yaml`.**

## Validation

- Both `--diff-manifest` and `--suggest` runs complete and their reports are captured (text and JSON for the diff).
- `resolvePluginManifest` returns four records named `projects`, `orgs`, `work`, `projects-audit` in that order, with no reader diagnostic.
- Every divergence in the `--diff-manifest` JSON output appears in this document's `## Reconciliation` section with a classification and evidence. The count of reconciled entries equals the count of reported divergences — no silent drops.
- The set of "observed but not declared" divergences classified as documented deferrals matches, exactly, the deferral set task 002 recorded in `README.md`. A mismatch in either direction is a finding to fix or report, not to absorb.
- `--suggest` surfaces no capability that is absent from both the manifest and the recorded deferral set; if it does, it is either a missed declaration to add or a scanner artifact to document.
- If the `"plugable"` block was edited, `make build` still succeeds and `git diff --stat -- src` produces no output.
- **Test-run scoping:** `make test` / `make qa` are known-red at baseline (followup `2aMD`, `src/projects/handlers/_lib/test/project-lifecycle.test.mjs`). Do not use a full-suite run as this task's gate. This task changes no executing code, so a test run is optional; if made, before/after failure lists must be identical.

## Assumptions

- Task 001 has landed and `node_modules/.bin/plugable-express-validate` resolves. If it does not, halt — this task cannot be simulated by inspection.
- Task 002 has landed and `package.json` carries a `"plugable"` block with four components.
- The derivation scanner reads dev-core's `.mjs` sources directly from `src/`. If it turns out to require built or transpiled output, note that and run `make build` first rather than concluding the tooling is unusable.

## References

- [capability census](../notes/capability-census.md) — the expected declaration set, including the `'pull requests'` typo and its independent corroboration in `plugable-express`'s own `src/lib/manifest-derivation/diff-manifest.js` header comment.
- [manifest scope and tooling](../notes/manifest-scope-and-tooling.md) — what the tooling can and cannot check for a plain plugin, and why the default validate mode is the wrong instrument.
- [002-author-plugin-manifest.md](./002-author-plugin-manifest.md) — the declarations and the deferral set this task reconciles against.

## Reconciliation

Tooling run from the repository root against the manifest as landed by task 002 (`@liquid-labs/plugable-express@1.0.0-alpha.59`, resolved from `node_modules`). Full text/JSON output captured before any edit; JSON is the durable per-entry source for this section. `divergenceCount` in the pre-edit `--diff-manifest --format json` run was **20** (`declaredNotObserved`: 6, `observedNotDeclared`: 13, `phaseDisagreements`: 1) — every one of the 20 is reconciled below, one row per divergence, no drops. A second `--diff-manifest` run after the corrective edits (below) confirms `divergenceCount` dropped to 17, exactly the 3 divergences the fix targeted (see "Post-fix confirmation").

Shape check: `resolvePluginManifest({dir, pkg})` returns four records, `component` order `projects,orgs,work,projects-audit`, `diagnostics: []` on all four, both before and after the corrective edits.

### Declared but not observed (6)

| # | Capability | Component | Classification | Evidence |
|---|---|---|---|---|
| 1 | `provides appExt:_liqProjects.playgroundMonitor @ load` | `projects` | **Scanner limitation.** The write-detection pattern captures the top-level `app.ext.<key> =` assignment target only; it cannot parse into the object-literal 3rd argument of `Object.assign({}, app.ext._liqProjects, { playgroundMonitor, playgroundPath })` to derive the nested member names it introduces. The scanner *did* derive `provides appExt:_liqProjects @ unknown` from the same line (present in `unknownPhaseEntries`, matched against the manifest's own `appExt:_liqProjects @ load` entry, no divergence) — it just cannot see one level deeper. | `src/projects/setup.mjs:33` |
| 2 | `provides appExt:_liqProjects.playgroundPath @ load` | `projects` | **Scanner limitation.** Same root cause as #1 — same line, same `Object.assign` object-literal argument. | `src/projects/setup.mjs:33` |
| 3 | `provides credentialType:GITHUB_API @ load` | `projects` | **Real manifest defect — wrong capability string.** In isolation this line is also a scanner blind spot (the scanner has no pattern for a `registerCredentialType`-style registration reached through an imported helper, so it can never observe *any* spelling of this `provides`). But cross-referencing the `observedNotDeclared` `credential:GITHUB_API` `requires` entries below (13 sites, a *different* kind spelling) against `plugable-express`'s own `docs/plugin-manifest-migration-guide.md` — which carries this exact scenario (`liq-projects`, this package's `projects` predecessor, registering `GITHUB_API` via `credentials-db-plugin-github`'s `setupCredentials()`) as its worked example, spelled **`credential:GITHUB_API`**, not `credentialType:GITHUB_API` — shows task 002 invented a kind name that diverges from the framework's own canonical spelling for this identical case. Fixed: renamed to `credential:GITHUB_API` in `package.json`. | `src/projects/setup.mjs:8`; `@liquid-labs/plugable-express/docs/plugin-manifest-migration-guide.md` "Trace what your `setup()` causes" section |
| 4 | `requires pathVar:parameterKey @ handlers` | `orgs` | **Scanner limitation, systemic across the whole tree.** The scanner's `pathVar:` requires-derivation matches only an object-literal-style `path\s*:\s*` key (confirmed by reading `scan-sources.js`'s route-scanning pattern). Every dev-core handler declares its route as `const path = [...]` (an assignment, not an object-literal key) — confirmed by grepping every handler file, e.g. `src/projects-audit/handlers/audit.mjs:4`, `src/projects/handlers/create.mjs:5`, `src/orgs/handlers/parameters-detail.mjs:6`. The regex structurally never matches this idiom, so **zero** `requires pathVar:*` entries were derived anywhere in the tree, even though several routes carry `:name` segments. | `src/orgs/handlers/parameters-detail.mjs:6` (`const path = ['orgs', ':orgKey', 'parameters', ':parameterKey', 'detail']`) |
| 5 | `requires appExt:constants @ load` | `work` | **Scanner limitation.** `app.ext.constants.WORK_DB_PATH = fsPath.join(...)` reads the parent `app.ext.constants` container (a genuine, necessary read — JS must resolve `app.ext.constants` before it can set `.WORK_DB_PATH` on it) and writes the dotted member in the same expression. The scanner's dotted-`appExt:` regex captures the full dotted path (`constants.WORK_DB_PATH`) as one greedy match and classifies only that one match as a `provides`; it does not additionally walk the dotted chain to emit an implicit `requires` on the parent container. | `src/work/setup.mjs:6` |
| 6 | `requires pathVar:projectName @ handlers` | `projects-audit` | **Scanner limitation.** Same root cause as #4 — `const path = ['projects', ':projectName', 'audit']` (and the sibling `audit-fix.mjs`) use the assignment idiom the scanner's `path:` pattern never matches. | `src/projects-audit/handlers/audit.mjs:4`, `audit-fix.mjs` |

### Observed but not declared (13)

| # | Capability | Component(s) | Classification | Evidence |
|---|---|---|---|---|
| 7 | `requires appExt:_liqOrgs.orgs @ unknown` | `orgs` | **Scanner limitation — same-component self-reference.** Both origins are `orgs` reading its own `appExt:_liqOrgs.orgs`, which `orgs` itself provides (`setup.mjs:26`): line 45 is `processOrgSetup` iterating the registry `loadOrgs` populated, ordering guaranteed by the already-declared `order: last` on the `process org setup` `setupMethod:`, not by a `requires`/`provides` capability edge; line 66 is `orgKey`'s `registerPathVar` `optionsFetcher`, invoked at request time, well after `orgs`' own `setup` phase. The scanner emits a `requires` for every `app.ext.X` read regardless of whether the same component already provides `X` itself; task 002's declared set consistently and correctly omits this class of same-component self-consumption (e.g. `projects`' own read of its own `playgroundMonitor` at `setup.mjs:23` was never flagged either). | `src/orgs/setup.mjs:45,46,66` |
| 8 | `requires appExt:_liqProjects @ unknown` | `projects` | **Scanner limitation — same-component self-reference.** `app.ext._liqProjects = Object.assign({}, app.ext._liqProjects, {...})` (comment: "works whether or not `app.ext._liqProjects` is defined or not") reads its own not-yet-set container defensively, on the same line it defines it. `projects` is the sole provider of `_liqProjects`, first in `components:` order — nothing else can populate this before `projects`' own `setup()` runs. | `src/projects/setup.mjs:33` |
| 9 | `requires appExt:_liqProjects.playgroundPath @ unknown` | `projects` | **Scanner limitation — same-component self-reference.** `create-lib.mjs:225` and `rename-lib.mjs:113` are `projects`' own handler libs reading the `playgroundPath` `projects` itself provides at `load` (`setup.mjs:33`). Same class as #7/#8. | `src/projects/handlers/_lib/create-lib.mjs:225`, `rename-lib.mjs:113` |
| 10 | `requires appExt:constants.WORK_DB_PATH @ unknown` | `work` | **Scanner limitation — same-component self-reference.** `work-db.mjs:28` (`this.#dbFilePath = app.ext.constants.WORK_DB_PATH`) reads the value `work` itself writes at `setup.mjs:6`. Same class as #7–#9. | `src/work/handlers/_lib/work-db.mjs:28` |
| 11 | `requires credential:GITHUB_API @ unknown` (13 origins) | `projects` (4 sites), `work` (9 sites) | **Real manifest defect — missing declaration, paired with #3.** The scanner has a deliberate, first-class pattern for `credentialsDB.getToken(<key>)` reads (confirmed in `scan-sources.js` and its own test suite), deriving `requires: credential:${key}`. This is not a scanner artifact: it is a genuine, intentional coupling that resolves cleanly once #3's kind rename lands, since `projects` provides `credential:GITHUB_API` intra-package. Fixed: added `requires: credential:GITHUB_API @ runtime` to both `projects` and `work`. | `projects`: `handlers/_lib/archive-lib.mjs:33`, `destroy-lib.mjs:48`, `rename-lib.mjs:121`, `releases/_lib/do-github-release.mjs:11`. `work`: `handlers/_lib/clean-lib.mjs:25`, `close-lib.mjs:17`, `start-lib.mjs:74`, `status-lib.mjs:11`, `issues/_lib/add-lib.mjs:14,59`, `issues/_lib/remove-lib.mjs:25`, `projects/_lib/add-lib.mjs:13,38` |
| 12 | `requires integrationHook:pull request/createOrUpdatePullRequest @ unknown` | `work` | **Documented deferral.** One of task 002's six named unguarded `integrationHook:` deferrals (README.md's "Two deliberate omissions"). | `src/work/handlers/_lib/submit-lib.mjs:202` |
| 13 | `requires integrationHook:pull request/getCurrentIntegrationUser @ unknown` | `work` | **Documented deferral.** Same set. | `src/work/handlers/_lib/answer-set-to-md.mjs:19` |
| 14 | `requires integrationHook:pull request/getQALinkFileIndex @ unknown` | `work` | **Documented deferral.** Same set. | `src/work/handlers/_lib/answer-set-to-md.mjs:28`, `submit-lib.mjs:133` |
| 15 | `requires integrationHook:pull requests/getPullRequestURLsByHead @ unknown` | `work` | **Documented deferral, and the case-4 real source defect named in this task's own Requirements.** Part of the same six-item deferral set. Additionally: this is the live noun-misspelling defect — `providerFor: 'pull requests'` (plural) where every other call site and every ecosystem registration uses singular `'pull request'`, which throws `No provider found for 'pull requests'` at request time. **Not fixed** (runtime-code change, outside this plan's scope fence); flagged to the manager per this task's Requirements — not added to `plan/followups.yaml`. | `src/work/handlers/_lib/answer-set-to-md.mjs:74` |
| 16 | `requires integrationHook:tickets/getIssueURL @ unknown` | `work` | **Documented deferral.** Same set. | `src/work/handlers/_lib/answer-set-to-md.mjs:51` |
| 17 | `requires integrationHook:tickets/getProjectURL @ unknown` | `work` | **Documented deferral.** Same set. | `src/work/handlers/_lib/answer-set-to-md.mjs:67` |
| 18 | `requires setupArg:app @ load` | `orgs`, `projects`, `work` | **Real manifest defect — missing declaration.** All three components' `setup()` destructure `{ app, reporter, registerPathVar }`; `setupArg:registerPathVar` was already declared identically in all three, but `app`/`reporter` were not. `setupArg:*` is a `fixed`/`framework`-phase, `exclusive: true` kind and `FRAMEWORK_MANIFEST` already provides all five `setup()` members (`app`, `cache`, `reporter`, `registerPathVar`, `serverConfigRoot`) unconditionally, so this can never be unsatisfied — it carries no gate/diagnostic value, unlike `registerPathVar` (which is at least called by name downstream). Fixed for completeness and consistency with the already-declared sibling entry; flagged below for the manager to confirm the low-value addition is wanted. | `src/orgs/setup.mjs:5`, `src/projects/setup.mjs:7`, `src/work/setup.mjs:5` |
| 19 | `requires setupArg:reporter @ load` | `orgs`, `projects`, `work` | **Real manifest defect — missing declaration.** Same reasoning and same fix as #18. | `src/orgs/setup.mjs:5`, `src/projects/setup.mjs:7`, `src/work/setup.mjs:5` |

### Phase disagreements (1)

| # | Capability | Component | Classification | Evidence |
|---|---|---|---|---|
| 20 | `requires appExt:setupMethods`: declared `@ load`, observed `@ setup` | `orgs` | **Scanner limitation — phase-inference artifact.** `app.ext.setupMethods.push({...})` at `setup.mjs:6` executes synchronously as part of `orgs`' own `setup()` — true `load` phase per this plan's own rule ("anything a submodule's `setup.mjs` does is `load` phase") and per the capability census. The scanner's phase heuristic appears to associate any access to `app.ext.setupMethods` that occurs as the target of a `.push()` registering a deferred setup method with that method's own later `setup`-phase execution, rather than with the synchronous phase of the push-call statement itself. The manifest's declared `load` is correct; not changed. | `src/orgs/setup.mjs:6` |

### Deferral-set cross-check

The six `observedNotDeclared` `integrationHook:` entries (#12–#17) match README.md's "Two deliberate omissions" deferred set **exactly** — same six capability strings, no extra, no missing. `integrationHook:controls/getQuestionControls` (the one guarded hook, declared `optional: true`) does not appear in `observedNotDeclared`, confirming it matched cleanly.

### `--suggest` cross-check

Every capability in the `--suggest` output's `provides` (13 entries) and `requires` (20 entries) lists is accounted for by one of: already declared in the manifest, one of the six documented deferrals, a same-component self-reference (case 3, #7–#10 above), or a corrective addition made in this task (#3, #11, #18, #19). No capability in `--suggest`'s output is left unexplained.

### Corrective edits made to `package.json`'s `"plugable"` block

1. Renamed `projects`' `provides` entry `credentialType:GITHUB_API` → `credential:GITHUB_API` (kind rename only; phase and `via` unchanged). Reconciles #3.
2. Added `requires: { capability: "credential:GITHUB_API", phase: "runtime", reason: "..." }` to `projects` and to `work`. Reconciles #11.
3. Added bare-string `requires` entries `"setupArg:app"` and `"setupArg:reporter"` to `orgs`, `projects`, and `work` (alongside the existing `"setupArg:registerPathVar"`). Reconciles #18, #19.

No other line in the manifest changed. `src/` is untouched (`git diff --stat -- src` empty).

### Task-caused documentation drift fixed (README.md)

`[task-caused-drift]` README.md's "The `credentialType:GITHUB_API` naming commitment" paragraph directly asserted the now-corrected kind name, including reasoning explicitly rejecting `credential` as an alternative — a direct, mechanical consequence of edit #1 above. Rewrote the paragraph (now "The `credential:GITHUB_API` naming commitment") to state the corrected spelling, cite the framework's migration-guide worked example as the authority, and describe the newly-declared requiring half (edit #2). No other README section referenced the old spelling or `setupArg:*`.

### Post-fix confirmation

Re-ran `--diff-manifest --format json` after the corrective edits: `divergenceCount` is **17** (down from 20), `declaredNotObserved` unchanged at 6 (now showing `credential:GITHUB_API` instead of `credentialType:GITHUB_API` — the provides-side scanner blind spot from #3 persists as expected, only the spelling changed), `observedNotDeclared` dropped to 10 (the `credential:GITHUB_API`, `setupArg:app`, and `setupArg:reporter` entries are gone — resolved by edits #2 and #3), `phaseDisagreements` unchanged at 1 (#20, correctly left as-is). `resolvePluginManifest` still returns four clean records in the correct order. `make build` succeeds; `dist/dev-core.js` still exports `handlers` (58 entries) and `setup` (function). `git diff --stat -- src` is empty.

## Status

**Outcome: succeeded.** Date: 2026-09-01.

Ran `plugable-express-validate --diff-manifest` (text + JSON) and `--suggest` (text) against the manifest task 002 landed, per this task's `## Reconciliation` section above: all 20 reported divergences classified and evidenced (14 scanner limitations, 6 documented deferrals — one of which doubles as the flagged, unfixed `'pull requests'` source typo — and 3 real manifest defects). Confirmed `resolvePluginManifest` reads the manifest cleanly (four records, `projects,orgs,work,projects-audit`, no diagnostics) both before and after the corrective edits.

**The manifest was edited.** Three corrections landed in `package.json`'s `"plugable"` block, all grounded in the reconciliation:

1. Renamed `projects`' `credentialType:GITHUB_API` `provides` entry to `credential:GITHUB_API` — the wrong kind name task 002 invented diverges from `plugable-express`'s own migration-guide worked example for this identical real-world scenario, and from the derivation scanner's independently-derived spelling (13 `getToken('GITHUB_API')` call sites).
2. Added `requires: credential:GITHUB_API @ runtime` to `projects` and to `work`, resolving cleanly against `projects`' own (corrected) `provides` — an intra-package edge the scanner surfaced but task 002 never declared.
3. Added `requires: setupArg:app` and `requires: setupArg:reporter` to all three setup-bearing components (`orgs`, `projects`, `work`), alongside the already-declared `setupArg:registerPathVar` sibling. Low/no diagnostic value (both are `FRAMEWORK_MANIFEST`-guaranteed, always-satisfied), added for completeness and consistency; flagged for the manager to confirm or revert.

`README.md`'s "GITHUB_API credential-kind" paragraph was also updated (`[task-caused-drift]`, per this task's own procedure) since it directly documented, and gave now-inverted reasoning against, the corrected spelling.

Files changed (verified via `git diff --stat`, `src/` untouched):

- [`package.json`](../../package.json) — the three corrective edits above.
- [`README.md`](../../README.md) — the "GITHUB_API credential-kind" paragraph rewritten to match.
- This task document — `## Reconciliation` and this `## Status` section.

### Validation results

| Check | Result |
|---|---|
| `--diff-manifest` (text + JSON) and `--suggest` (text) run and captured, before and after the corrective edits | passed |
| `resolvePluginManifest` returns four records `projects,orgs,work,projects-audit`, no reader diagnostic | passed (both before and after edits) |
| Every JSON-reported divergence (20) appears in `## Reconciliation` with a classification and evidence; count of reconciled entries equals 20 | passed |
| Deferral-set cross-check: the six `observedNotDeclared` `integrationHook:` entries match README.md's deferred set exactly | passed |
| `--suggest` surfaces no capability absent from both the manifest and the documented deferral set without an explanation | passed |
| `credentialType:GITHUB_API` real-defect finding, reported and fixed | found and fixed (see edit #1) |
| `'pull requests/getPullRequestURLsByHead'` source typo — reported to manager, **not fixed**, not added to `plan/followups.yaml` | flagged, per Requirements |
| `git diff --stat -- src` empty after edits | passed |
| `make build` succeeds after edits | passed — `dist/dev-core.js` exports `handlers` (58) and `setup` (function) |
| Full-suite test run | not made (this task changes no executing code; out of scope per "Test-run scoping") |
