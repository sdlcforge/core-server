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
