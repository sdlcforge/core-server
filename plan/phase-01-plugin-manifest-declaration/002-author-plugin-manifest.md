# Author Plugin Manifest

## Purpose and scope

Author `@sdlcforge/dev-core`'s compile-time plugin manifest as a `package.json` `"plugable"` block, using the schema's `components:` form with one component per submodule, so that `plugable-express`'s build-time gate can check dev-core's declared coupling against the rest of a host's plugin set.

This is the substantive judgment task of the plan. Scope is a single new top-level `"plugable"` key in `package.json`, plus a short explanatory paragraph in `README.md` covering the deliberate deferrals. No source change, no build-config change, no runtime change of any kind: the manifest is data for a build/CI-time gate, and nothing reads it at boot.

## Requirements

### Ground every declaration in current source

`plan/notes/capability-census.md` is a line-grounded inventory produced during planning and is the intended starting point — but **re-verify it against the checked-out `src/` before declaring from it**, and prefer what the source says over what the census says on any disagreement. Note any disagreement in the task report; a divergence means the tree moved after planning and the manager should know.

### Form: the `package.json` `"plugable"` block

Use the `package.json` `"plugable"` block, not a root `plugable.yaml`. Both are publish-safe today because dev-core carries no `files` allowlist — but `docs/dev-core-consolidation-contract.md`'s [publishing hygiene](../../docs/dev-core-consolidation-contract.md#publishing-hygiene) section *requires* dev-core's eventual `npm publish` to ship one, and the moment it lands, a root `plugable.yaml` not listed in it is silently excluded from the tarball and the published package becomes indistinguishable from an unmanifested plugin — with, per the schema, "no error, anywhere, ever." The block form cannot be excluded by `files`. Record this reasoning in the README paragraph below.

**Both forms present in one package is a hard `manifest-duplicate-form` error, never a merge.** Confirm no `plugable.yaml`, `plugable.yml`, or `plugable.json` exists at the package root before finishing.

### Document-level keys

- `plugableManifestVersion: 1` — an integer, required, no default, conventionally first.
- `npmName: "@sdlcforge/dev-core"` — cross-checked by the reader against `package.json`'s own `name`; a disagreement is `manifest-invalid`.
- `components: [...]` — four entries. When `components:` is present, `provides`/`requires`/`optional`/`setupMethods` are declared **per component and not at the document level**; declaring them in both places is `manifest-invalid`.
- Do **not** declare `plugableVersion`, `setupMethods`, or any reserved key (`revision`, `minRevision`, `aliasOf`, `onBehalfOf`). The v1 reader rejects each reserved name explicitly rather than ignoring it.

### Component order is normative

`components:` array order **is** intra-entry load order and is a validation input. It must mirror `src/index.mjs`: `projects`, `orgs`, `work` (the `submoduleSetups` order), then `projects-audit` (handlers-only, absent from `submoduleSetups`, spread last in the `handlers` array). Reordering `src/index.mjs` becomes a manifest change from here on — state that in the README paragraph.

### What to declare

Declare, per component, everything the census establishes, subject to the deferrals below. Points that carry real judgment and must not be transcribed mechanically:

- **A capability appears exactly once in a component's `requires` list.** Where a component touches one capability at two phases, declare the **earlier** phase — it is the stronger claim and subsumes the later read. This applies to `projects` and `appExt:credentialsDB` (`load` from `setup.mjs`, `runtime` from four handler libs) → declare `load`.
- **`work` requires `appExt:credentialsDB` at `runtime`, not `load`.** All nine reads are in request-path libraries; `work/setup.mjs` never mentions it. `runtime` is the weakest claim in the lattice and is satisfied by a provider at any phase; `load` would additionally assert the value must be populated before `work`'s setup runs, which is false. Do not copy `projects`' phase here.
- **`work` requires `appExt:serverConfigRoot` at `load`** (`work/setup.mjs:6`) — bug class 1, and the declaration that activates `plugable-express`'s `supersedes: ['appExt:serverHome']` rename detection.
- **`projects` also requires `appExt:serverConfigRoot`, at `runtime`** (`handlers/_lib/create-lib.mjs:91`). This is a second in-tree half of the same rename bug, found during planning; it is in scope for the same bug class.
- **A dotted `appExt:` member does not satisfy its container, and vice versa.** `work` provides `appExt:constants.WORK_DB_PATH` and separately requires the container `appExt:constants` — the schema's own worked example, and both entries are needed.
- **`orgs` provides `appExt:_liqOrgs` and `appExt:_liqOrgs.orgs` at `setup` phase, not `load`.** `orgs`' own `setup()` writes nothing to `app.ext`; the object is created by the deferred `prepare org dependencies` method that `DependencyRunner` runs at `setup`. Declaring `load` would be a false claim that wrongly satisfies `load`-phase requirers.
- **`orgs`' three setup methods carry `order` qualifiers** reproducing `DependencyRunner`'s pseudo-deps: `prepare org dependencies` → `order: first` (`deps: ['!']`), `load orgs` → default `normal`, `process org setup` → `order: last` (`deps: ['*']`). `order: first`/`last` combined with any `setupMethod:` `requires` on the same entry is `manifest-invalid` — do not add one.
- **`orgs` declares `pathVar:parameterKey` at `handlers` phase both as a provide and a require**, per the schema's same-plugin rule. Only `handlers/parameters-detail.mjs:10` registers it live; the registration in `handlers/parameters-set.mjs` is commented out. Declare the live one only.
- **`projects-audit` has no `setup` but does have requirements** — `appExt:_liqProjects.playgroundMonitor` at `runtime` and `pathVar:projectName` at `handlers` (fixed). Same-plugin component-to-component edges are explicitly in scope for this grammar: the `components:` extension exists precisely to make them statically provable. Do not omit them as "internal."
- **Use `via` freely on `provides` entries.** It is free text naming the mechanism, rendered in diagnostics, and it is what turns "no provider found" into an actionable sentence.

### Deliberate deferrals — document, do not omit silently

- **Do not declare the six unguarded `integrationHook:` requirements** in `work` (`pull request/getQALinkFileIndex`, `pull request/createOrUpdatePullRequest`, `pull request/getCurrentIntegrationUser`, `tickets/getIssueURL`, `tickets/getProjectURL`, `pull requests/getPullRequestURLsByHead`). Their providers are unmanifested and outside this plan; the schema is strict by default, so each would become an `error`-severity finding that dev-core cannot clear from its own side, because the escape hatch (`plugable.host.assumeProvided`) is sited at the host.
- **Do declare `integrationHook:controls/getQuestionControls` with `optional: true` and a `reason`.** `handlers/_lib/submit-lib.mjs:94` gates it behind `hasHook` and degrades gracefully, so `optional: true` is a true statement about the code. An unsatisfied optional reports at `info` severity.
- **Do declare `appExt:integrations` at `runtime`** — the manager itself is framework-provided and resolves clean.

Both deferrals must be written down in the README paragraph, with the reason, per this plan's rule that a deferred declaration is documented rather than silently absent.

### The `GITHUB_API` credential type — a judgment call to make and report

`projects/setup.mjs:8` registers a `GITHUB_API` credential *type* onto the shared `credentialsDB` object; `liq-integrations-issues-github` (outside dev-core) later reads it via `credentialsDB.getToken('GITHUB_API')`.

- It is **not** an `app.ext` key. Do not spell it `appExt:credentialsDB.GITHUB_API` — the schema's dotted-member rule is about a member of an `app.ext` container, which this is not.
- It **is** covered by the schema's open/vendor kind tier, which names this exact case as its motivating example: "`plugable-express` cannot know what a `tickets` provider or a `GITHUB_API` credential is, and does not need to in order to check that some plugin declared what another required." An open kind takes a required-explicit `provides` phase and defaults to `exclusive: false`.
- **Recommended: declare it** as a `provides` on `projects` at `load`, with a `via` naming `setupCredentials()` from `@liquid-labs/credentials-db-plugin-github`. An unmatched `provides` produces no finding at all, so this is risk-free, and it is "the place the fact can be written down," which is the thing that did not exist.
- The **kind name is a cross-package naming commitment** — it only pays off if the requiring half, in a package this plan does not touch, is later spelled identically. Choose a name, state it and the reasoning in the README paragraph so `@sdlcforge/core-server`'s parked `sdlc-plugin-manifest` plan-group can match it, and **report the chosen string explicitly to the manager**. If, on reading the schema's capability-name grammar directly, you conclude the open tier does not in fact cover this, omit the entry and say why in the README instead — do not invent a spelling that the grammar does not sanction.

### Hard constraints

- **Runtime-inert and additive.** Do not change `src/index.mjs`, any submodule `setup.mjs`, the composite setup order, module exports, route registration, or any `app.ext` key name. `docs/dev-core-consolidation-contract.md`'s [`app.ext` contract freeze](../../docs/dev-core-consolidation-contract.md#appext-contract-freeze) makes those names non-negotiable.
- **Do not modify `@liquid-labs/plugable-express` or `@sdlcforge/core-server`.** Both are read-only reference checkouts for this plan.
- **Do not modify `plan/followups.yaml`.**

## Validation

- `package.json` parses as valid JSON (`node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`) and carries exactly one top-level `"plugable"` key.
- No `plugable.yaml`, `plugable.yml`, or `plugable.json` exists at the package root.
- The manifest parses cleanly through the real reader:

  ```bash
  node -e "const {resolvePluginManifest}=require('@liquid-labs/plugable-express'); \
    const pkg=JSON.parse(require('fs').readFileSync('package.json','utf8')); \
    console.log(JSON.stringify(resolvePluginManifest({dir:process.cwd(),pkg}),null,2))"
  ```

  It must return four normalized records — one per component — with no thrown error and no `manifest-invalid` / `manifest-unsupported-version` / `manifest-duplicate-form` diagnostic. If the package's CommonJS/ESM interop makes `require` awkward, use a dynamic `import()` instead; the assertion is the same.
- The four records' `component` names are `projects`, `orgs`, `work`, `projects-audit`, **in that order**, matching `src/index.mjs`'s composition.
- Every capability string parses as `kind:name` with a lowerCamel `kind`; every `appExt:` and open-kind `provides` entry carries an explicit `phase`; no `setupMethod:` entry carrying `order: first`/`last` also carries a `setupMethod:` `requires`.
- `git diff` shows changes to exactly two files: `package.json` and `README.md`. `src/` is untouched — confirm with `git diff --stat -- src` producing no output.
- `make build` succeeds and `dist/dev-core.js` is produced. Sanity-check that the built bundle still exports both `handlers` and `setup` (`typeof setup === 'undefined'` on the bundle is the documented signal that the aggregator was damaged).
- **Scope any test run.** `make test` / `make qa` are known-red at baseline (followup `2aMD`). Do not treat a full-suite failure as this task's result; if you run tests at all, use `make test TEST=<path>` or compare full-suite failure lists before and after — they must be identical.

## Metadata

architectural_impact: true

## References

- [capability census](../notes/capability-census.md) — the line-grounded per-component inventory, including the corrections to declare-time assumptions and the same-plugin-edges finding. Re-verify against source; do not transcribe blindly.
- [manifest scope and tooling](../notes/manifest-scope-and-tooling.md) — the form decision, the declare-now-versus-defer split, and the strict-by-default reasoning behind the deferrals.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` — **the normative grammar; read it directly.** Sections that bear on judgment calls here: "Capability names", "Reserved kinds and their defaults", "The phase lattice", "`requires` and `optional`", and the "Declared extensions" subsections `components:`, "Dotted `appExt:` members", "`pathVar:` at `handlers` phase", `order`, and `supersedes`.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-contract.md` — the versioned downstream contract.
- `README.md`'s "The `work` → `projects` coupling, and the `app.ext` keys `work` reads" census table and "The `app.ext._liqOrgs` contract" section — dev-core's own prose account of the couplings being declared.

## Checkpoint hints

- After the `work` and `projects` components are declared and the reader accepts them — the two bug-class declarations, the core of the task.
- After the `orgs` and `projects-audit` components are declared and all four records parse.
- After the README paragraph documenting the form choice, the deferrals, and the `components:`-order-is-load-order rule.
