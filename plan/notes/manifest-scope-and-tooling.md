# Manifest Scope and Tooling

## Purpose and scope

Three questions this plan had to answer before it could be sized, each answered against the real checkouts rather than assumed: which manifest **form** dev-core should use, which of the couplings in the [capability census](./capability-census.md) should actually be **declared now** versus deferred, and whether the `plugable-express` **validation tooling** is reachable from this checkout at all. The third answer is the one that changed the plan's shape.

## Which form: the `package.json` `"plugable"` block

**Decision: the `package.json` `"plugable"` block.** `@sdlcforge/dev-core`'s `package.json` carries no `files` allowlist today, so both the root-`plugable.yaml` form and the `package.json` block form are publish-safe *right now* — but only one of them stays that way.

The schema's `files`-allowlist hazard section is blunt about the failure mode: a package that later adds a `files` allowlist without listing `plugable.yaml` publishes a tarball that is "indistinguishable from an unmanifested plugin — which backward compatibility requires the framework to treat as benign. No error, anywhere, ever." dev-core is on a direct path to acquiring exactly that allowlist: its own consolidation contract's [publishing hygiene](../../docs/dev-core-consolidation-contract.md#publishing-hygiene) section *requires* that dev-core's eventual `npm publish` ship a `files` allowlist. So choosing the file form here would plant a silent, unfindable defect that fires whenever that already-mandated allowlist lands, and the `files-allowlist-excludes-manifest` lint only catches it from a source checkout — by the time a consumer sees it, the evidence is gone.

The `package.json` block survives that future unconditionally (`package.json` cannot be excluded by `files`) and matches the schema's own general recommendation. No project-specific convention argues the other way: dev-core's [root-file ownership](../../docs/dev-core-consolidation-contract.md#root-file-ownership) rule already enumerates a fixed set of package-level files dev-core authors exactly once, and adding a new root file to that set is a contract change the block form avoids entirely.

Size is the one genuine counter-argument — a four-component manifest is a substantial JSON block in a file people read often. It is accepted rather than dismissed: the block is a single contiguous, clearly-keyed section, and the alternative trades reviewability for a silent publish defect.

## Which `requires` to declare now

The constraint that decides this is the schema's **strict-by-default** posture, combined with where its escape hatch lives. A `requires` that fails only because its real provider is unmanifested is reported at **`error`** severity and is never suppressed; the mitigation, `plugable.host.assumeProvided`, is sited **at the host** — deliberately, because "the person blocked by the unmanifested provider is the person who can act." The host here is `@sdlcforge/core-server`, which this plan may not touch and whose own manifest work is parked.

So every `requires` dev-core declares against a currently-unmanifested provider is an `error`-severity finding in core-server's future gate that **dev-core cannot clear from its own side**. That is precisely the intended, valuable outcome for the two bug classes this plan exists to catch — the finding *is* the product. It is not a good trade for a long tail of couplings nobody asked to gate on yet.

Recommended split, which the manifest-authoring task should follow unless validation output contradicts it:

**Declare now** — everything in the census whose provider is either the framework itself (already manifested via `FRAMEWORK_MANIFEST`, so it resolves clean) or another dev-core component (intra-package, provable from the declared `components:` order):

- Every `provides` entry in the census, without exception. A `provides` that nothing requires produces no finding at all, so the provider side is free.
- `appExt:serverConfigRoot` (`work` @ `load`, `projects` @ `runtime`) — bug class 1, and the whole point. Resolves clean against `FRAMEWORK_MANIFEST`, which carries `supersedes: ['appExt:serverHome']` specifically to make a future rename legible.
- `appExt:constants` (`work` @ `load`), `appExt:setupMethods` (`orgs` @ `load`), `appExt:integrations` (`work` @ `runtime`), `setupArg:registerPathVar` (three components) — all framework-provided, all resolve clean.
- `appExt:_liqProjects.playgroundMonitor` (`orgs` @ `setup`, `projects-audit` @ `runtime`) and `pathVar:projectName` (`projects-audit` @ `handlers`) — intra-package, satisfied by the lattice.
- `pathVar:parameterKey` (`orgs` @ `handlers`) — same-plugin `handlers`/`handlers`, which the schema's decided rule satisfies for the same-plugin case.
- `appExt:credentialsDB` (`projects` @ `load`, `work` @ `runtime`) — bug class 2. This one **will** report `unsatisfied` at `error` severity until core-server manifests its own `src/credentials/` component, and that is correct and intended: it is the requiring half of a real historical bug, and the finding names the gap accurately.

**Defer, and say why in the manifest's own accompanying documentation rather than omitting silently:**

- The six unguarded `integrationHook:` requires (`pull request/*`, `tickets/*`). Their providers (`liq-controls`, `liq-integrations-issues-github`) are unmanifested and outside this plan; declaring them would add six unclearable `error` findings that nobody asked for, and one of the six (`pull requests/getPullRequestURLsByHead`) would additionally have to transcribe a known typo to read clean against `--diff-manifest`.
- The one **guarded** hook, `integrationHook:controls/getQuestionControls`, is the exception worth declaring anyway — as `optional: true` with a `reason`, which downgrades an unsatisfied finding to `info` severity. `src/work/handlers/_lib/submit-lib.mjs` gates it behind `hasHook` and degrades gracefully, so `optional: true` is a true statement about the code, and this is verbatim the schema's own worked example for the flag.

**Decide in-task, flagged for the manager:** `credentialType:GITHUB_API` as a `provides` on the `projects` component. The [census](./capability-census.md) establishes that the schema's open/vendor kind tier covers this and names this exact case as its motivating example, and that an unmatched `provides` is risk-free. What it cannot settle unilaterally is the *kind name*, which only pays off if the requiring half — in a package this plan does not touch — is later spelled identically. Declare it with a `via` naming the mechanism, and record the chosen string where core-server's parked plan-group will find it.

## Is the tooling reachable? No — and that reshapes the plan

**`@liquid-labs/plugable-express` is not a dependency of `@sdlcforge/dev-core` at all.** Not a `dependency`, not a `devDependency`, not a `peerDependency`; zero occurrences in `package.json`, zero in `package-lock.json`, and no `.yalc/` directory in the checkout. This is not the anticipated "installed version predates the framework" case — there is no installed version, and therefore no `plugable-express-validate` binary on any path this project's own scripts can reach.

That is coherent with how dev-core is loaded: it is a *plugin*, and the host supplies the framework, so dev-core never needed to depend on it to build, test, or ship. It just means the validation this plan is required to run needs the dependency added first.

Resolved facts about what to add:

- `@liquid-labs/plugable-express@1.0.0-alpha.59` **is published to npm** (confirmed via `npm view … versions`), and that is the version that ships the manifest framework. No yalc link or local-path spec is needed, which matters: the consolidation contract's [absorption recipe](../../docs/dev-core-consolidation-contract.md#absorption-recipe) explicitly forbids a `file:` spec in `package.json`, and `grep -n 'file:' package.json` returning nothing is a standing check.
- It must be a **`devDependency`**, not a `dependency`. dev-core's runtime never imports it — the host does — and adding it to `dependencies` would misstate the package's runtime contract and bloat every consumer's install. A `devDependency` is inert at runtime, which satisfies this plan's hard constraint.
- The `bin` entry is `plugable-express-validate` → `./dist/plugable-express-validate.js`, and the package's `files` allowlist is `["./dist", "README.md"]`, so the CLI is present in the published tarball and reachable at `node_modules/.bin/plugable-express-validate` after install.

**Fallback if adding the dependency is rejected or its lockfile churn proves unacceptable.** The CLI can be driven from the sibling `@liquid-labs/plugable-express` checkout directly — its `dist/plugable-express-validate.js` is already built there — as `node <plugable-express-checkout>/dist/plugable-express-validate.js --diff-manifest --package-root <dev-core>`. This verifies the manifest identically but is a local-checkout-only path with no CI story, so it is the fallback rather than the plan of record.

## What the tooling can actually check for a plain plugin

dev-core is a plugin, not a host, so the CLI's default validate mode is the wrong instrument here: `validatePluginSet()` resolves a *host's* plugin set from `--package-root`'s `node_modules`, and dev-core has no `plugable.host` block and no plugin dependencies to resolve. Pointing it at dev-core yields a near-empty graph plus a benign "host declaration absent" warning — not a lie, just not informative. Full graph validation of dev-core's `requires` is core-server's gate to run, later, and is out of scope.

Three checks *are* meaningful against a plain plugin, and together they cover what this plan needs:

1. **`--diff-manifest`** (`src/lib/manifest-derivation/diff-manifest.js`) reads the package's declared manifest through the real Phase 1 reader — whichever on-disk form it uses — scans the package's own source, and reports three divergence kinds: declared-but-not-observed, observed-but-not-declared, and phase disagreement. This is exactly the cross-check the request asks for, it is the tool built for a plugin rather than a host, and its own header comment cites this package's `'pull requests'` typo as its motivating case. Advisory and always exit 0.
2. **`--suggest`** (`deriveManifest`) renders what a static scan alone would propose, useful for catching a coupling the manual census missed. Also always exit 0.
3. **Shape validation through the reader.** Because both derivation modes route through `resolvePluginManifest`, a malformed manifest, a missing `plugableManifestVersion`, a fixed-phase disagreement, or a reserved key surfaces as a reader error rather than being silently tolerated. `resolvePluginManifest` is a public export of the package's `src/index.js`.

Neither derivation mode can fail a build. That is deliberate on the framework's side ("a heuristic finding inside a gate is a warning everyone learns to ignore"), and it means **the validation task's gate is a human/agent reading the divergence report and reconciling it, not a non-zero exit code.** The task document has to say so explicitly, or it will be mistaken for a pass/fail check.

## Is a drift guard available to a plain plugin?

`verifyHostDeclaration()` has **no plugin-side equivalent** — it exists to cross-check a host's declared `plugable.host.builtins` against its real `builtinPlugins` array, and a plain plugin has neither. So there is no drop-in parity with the mechanism core-server's parked plan-group intends to use, and none should be invented.

There is, however, a real and better-targeted guard available, composed entirely from published exports of `@liquid-labs/plugable-express`'s `src/index.js` — `resolvePluginManifest`, `validatePluginGraph`, `PHASE_ORDER`, and `FRAMEWORK_MANIFEST`:

- Read dev-core's own manifest through `resolvePluginManifest({ dir, pkg })` and assert it parses to the expected component set — this alone catches a malformed or accidentally-deleted block.
- Feed those records plus `FRAMEWORK_MANIFEST` into `validatePluginGraph()` and assert that every requirement whose provider is the *framework* is satisfied. Because `FRAMEWORK_MANIFEST` is verified by `plugable-express`'s own self-consistency test against its real booted source, this asserts dev-core's framework-facing couplings against the framework's actual current surface — which means a future `serverConfigRoot` rename fails dev-core's own Jest suite, in dev-core's own CI, without waiting for core-server's gate. That is a stronger result than the host-side drift check, not a weaker substitute for it.
- Requirements whose providers live outside dev-core (`appExt:credentialsDB`, the optional hook) will report unsatisfied against a framework-only graph. The assertion must therefore be scoped to framework-provided and intra-package capabilities, and must **not** assert an overall-clean result — or it will encode the very cross-package gap this plan wants left visible.

This is worth doing, and the plan includes it. It is the only task in the plan that adds an executing artifact rather than pure metadata, so it carries the most care: it lands under `src/` and therefore flows through Babel into `test-staging/`, and it must not perturb the known-red baseline described next.

## The known-red test baseline

`make test` / `make qa` are **not green in dev-core today**, independently of anything this plan does: `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` fails because its `appMock` supplies `app.ext.serverHome` while `create-lib.mjs:91` reads `app.ext.serverConfigRoot` (followup `2aMD`). Fixing it is out of scope.

`make/55-test.mk` passes a `$(TEST)` variable through to Jest, so `make test TEST=<path>` scopes a run to a single suite. Every validation step in this plan that runs tests should use that form to exercise only what the plan added, and should capture a *pre-change* full-suite failure list to compare against if a full run is made at all — so the pre-existing failure is never mistaken for a regression this plan introduced, and never silently "fixed" by accident.
