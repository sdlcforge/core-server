# Capability Census

## Purpose and scope

The verified, per-component inventory of what each of `@sdlcforge/dev-core`'s four submodules provides and requires over the `plugable-express` capability vocabulary (`docs/plugin-manifest-schema.md` in the `@liquid-labs/plugable-express` checkout), derived by direct read of the currently-checked-out `src/` tree rather than from any prior summary. This is the input the manifest-authoring task declares from, and the reference the validation task reconciles `--diff-manifest` output against.

Every row below carries the source file and line that grounds it. Where this census **corrects** an assumption carried into the plan, the correction is called out inline — those corrections are the reason the census exists.

## Method

```bash
grep -rEon "app\.ext\.[A-Za-z_][A-Za-z0-9_]*" src/ | grep -v "/test/"
grep -rn "registerPathVar\|credentialsDB\|serverConfigRoot\|setupMethods" src/ | grep -v "/test/"
```

Phase assignment follows the schema's rule that a `requires` phase is *when the requiring code touches the capability*, not when the capability is created. dev-core's four submodule `setup()` functions all run inside the single composite `setup` in `src/index.mjs`, which `plugable-express` invokes during plugin loading — so **anything a submodule's `setup.mjs` does is `load` phase**, and anything inside a handler `func` body or a `_lib/` module called from one is `runtime`. A `registerPathVar` call made from a handler's `func` (rather than from `setup`) is `handlers` phase.

## `work`

Source of truth: `src/work/setup.mjs`, `src/work/handlers/`.

| Direction | Capability | Phase | Grounding |
|---|---|---|---|
| provides | `appExt:constants.WORK_DB_PATH` | `load` | `src/work/setup.mjs:6` |
| provides | `pathVar:workKey` | `load` | `src/work/setup.mjs:8` |
| requires | `appExt:serverConfigRoot` | `load` | `src/work/setup.mjs:6` |
| requires | `appExt:constants` | `load` | `src/work/setup.mjs:6` — the container it writes a member into |
| requires | `setupArg:registerPathVar` | `load` (fixed) | `src/work/setup.mjs:5` destructures it |
| requires | `appExt:credentialsDB` | **`runtime`** | 9 call sites, all in `handlers/**/_lib/` — see below |
| requires | `appExt:integrations` | `runtime` | 9 call sites in `handlers/_lib/submit-lib.mjs`, `handlers/_lib/answer-set-to-md.mjs` |
| requires | `appExt:_liqProjects.playgroundMonitor` | `runtime` | 24 call sites across 12 modules (unconditional, unguarded) — see `save-lib`, `start-lib`, `submit-lib`, `work-db`, `qa-lib`, `build-lib`, `determine-work-status`, `cross-link-dev-projects`, `delete-work-branches`, `answer-set-to-md`, `handlers/issues/_lib`, `handlers/projects/_lib` |

**Correction — this table originally omitted `appExt:_liqProjects.playgroundMonitor`.** Found during the manifest-authoring task (002) by re-verifying against checked-out `src/` per this plan's rule to prefer source over census on disagreement; also called out in dev-core's own `README.md` as "the single most important thing to know about this submodule." Declared in the manifest at `runtime` from source.

**Correction — `appExt:credentialsDB` is `runtime` for `work`, not `load`.** All nine reads sit in request-path libraries, none in `setup.mjs`: `handlers/projects/_lib/add-lib.mjs:12,37`, `handlers/_lib/start-lib.mjs:73`, `handlers/_lib/status-lib.mjs:10`, `handlers/_lib/close-lib.mjs:16`, `handlers/_lib/clean-lib.mjs:24`, `handlers/issues/_lib/add-lib.mjs:13,58`, `handlers/issues/_lib/remove-lib.mjs:24`. `work`'s `setup.mjs` never mentions `credentialsDB`. The phase difference is not cosmetic: `runtime` is the weakest claim in the lattice and is satisfied by a provider at any phase, whereas `load` additionally asserts the value must already be populated before `work`'s `setup` runs — which is false for `work` and would be an over-claim. `projects` is the component that genuinely needs it at `load` (below).

**`work`'s integration hooks.** `app.ext.integrations.callHook`/`hasHook` is reached with seven distinct `providerFor`/`hook` pairs, all at `runtime`:

| `integrationHook:` capability | Grounding | Guarded? |
|---|---|---|
| `controls/getQuestionControls` | `handlers/_lib/submit-lib.mjs:95,104` | **Yes** — `hasHook` at :94 gates the `callHook` at :103 |
| `pull request/getQALinkFileIndex` | `submit-lib.mjs:134`, `answer-set-to-md.mjs:29` | No |
| `pull request/createOrUpdatePullRequest` | `submit-lib.mjs:203` | No |
| `pull request/getCurrentIntegrationUser` | `answer-set-to-md.mjs:20` | No |
| `tickets/getIssueURL` | `answer-set-to-md.mjs:52` | No |
| `tickets/getProjectURL` | `answer-set-to-md.mjs:68` | No |
| `pull requests/getPullRequestURLsByHead` | `answer-set-to-md.mjs:74` | No — **and the noun is misspelled** |

`answer-set-to-md.mjs:74` passes `providerFor: 'pull requests'` (plural) where every other call site in the same file, and every registration in the ecosystem, uses `'pull request'` (singular). This is a live defect: `IntegrationsManager.callHook` throws `No provider found for 'pull requests'` at request time. It is corroborated independently — `plugable-express`'s own `src/lib/manifest-derivation/diff-manifest.js` header comment names this exact typo in `@liquid-labs/liq-work` (now this submodule) as the motivating example for its derivation mode. Fixing it is a runtime-code change and therefore outside this plan's scope fence; it is flagged for the manager instead.

## `projects`

Source of truth: `src/projects/setup.mjs`, `src/projects/handlers/`.

| Direction | Capability | Phase | Grounding |
|---|---|---|---|
| provides | `appExt:_liqProjects` | `load` | `src/projects/setup.mjs:33` |
| provides | `appExt:_liqProjects.playgroundMonitor` | `load` | `src/projects/setup.mjs:33` |
| provides | `appExt:_liqProjects.playgroundPath` | `load` | `src/projects/setup.mjs:33` |
| provides | `pathVar:newProjectName` | `load` | `src/projects/setup.mjs:16` |
| provides | `pathVar:projectName` | `load` | `src/projects/setup.mjs:21` |
| requires | `appExt:credentialsDB` | **`load`** | `src/projects/setup.mjs:8` — `setupCredentials({ credentialsDB : app.ext.credentialsDB })` |
| requires | `appExt:serverConfigRoot` | **`runtime`** | `src/projects/handlers/_lib/create-lib.mjs:91` |
| requires | `setupArg:registerPathVar` | `load` (fixed) | `src/projects/setup.mjs:7` |

`projects` also reads `app.ext.credentialsDB` at four `runtime` sites (`handlers/releases/_lib/do-github-release.mjs:10`, `handlers/_lib/archive-lib.mjs:32`, `handlers/_lib/rename-lib.mjs:120`, `handlers/_lib/destroy-lib.mjs:47`). A capability appears exactly once in a `requires` list, so the `load` entry — the earlier and therefore stronger claim — is the one to declare; it subsumes the runtime reads.

**New finding — `projects` is a second in-tree half of the `serverHome`/`serverConfigRoot` rename bug.** `src/projects/handlers/_lib/create-lib.mjs:91` reads `app.ext.serverConfigRoot` at request time. This is the exact read that the already-tracked failing suite `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` trips over — its `appMock` supplies `app.ext.serverHome` (followup `2aMD`). The plan carried into this session named only `work/setup.mjs` as the in-tree half; there are two, and the `projects` one is the one with a failing test already pointing at it. Declaring `projects`' `appExt:serverConfigRoot @ runtime` requirement is therefore in scope for the same bug class, not an extension of it.

**The `GITHUB_API` credential-type registration.** `src/projects/setup.mjs:8` calls `setupCredentials` from `@liquid-labs/credentials-db-plugin-github`, which registers a `GITHUB_API` credential *type* onto the shared `credentialsDB` object; `liq-integrations-issues-github` (outside dev-core) later reads it via `credentialsDB.getToken('GITHUB_API')`. This is **not** an `app.ext` key and must not be spelled `appExt:credentialsDB.GITHUB_API` — the schema's "Dotted `appExt:` members" rule is about a member of an `app.ext` container object, which this is not.

It *is*, however, squarely inside the schema's open/vendor kind tier, which the schema names this exact case as its motivating example for: "`plugable-express` cannot know what a `tickets` provider or a `GITHUB_API` credential is, and does not need to in order to check that some plugin declared what another required." An open kind takes a required-explicit `provides` phase and defaults to `exclusive: false`. So a `provides` entry of the shape `{ capability: credentialType:GITHUB_API, phase: load, via: "setupCredentials() from @liquid-labs/credentials-db-plugin-github" }` is grammatical, sanctioned, and — because an unmatched `provides` produces no finding at all — carries zero risk of breaking anyone's gate. What it cannot do unilaterally is *close* the coupling: that needs the requiring half, which lives in a package this plan does not touch, spelled with the identical string. The kind name is therefore a cross-package naming commitment, flagged for the manager.

## `orgs`

Source of truth: `src/orgs/setup.mjs`, `src/orgs/handlers/`.

| Direction | Capability | Phase | Grounding |
|---|---|---|---|
| provides | `setupMethod:prepare org dependencies` (`order: first`) | `setup` (fixed) | `src/orgs/setup.mjs:6-10`, `deps: ['!']` |
| provides | `setupMethod:load orgs` (`order: normal`) | `setup` (fixed) | `src/orgs/setup.mjs:11-14` |
| provides | `setupMethod:process org setup` (`order: last`) | `setup` (fixed) | `src/orgs/setup.mjs:15-19`, `deps: ['*']` |
| provides | `appExt:_liqOrgs` | **`setup`** | `src/orgs/setup.mjs:9` — inside `prepare org dependencies`' `func` |
| provides | `appExt:_liqOrgs.orgs` | **`setup`** | `src/orgs/setup.mjs:26` — inside `loadOrgs` |
| provides | `pathVar:newOrgKey` | `load` | `src/orgs/setup.mjs:59` |
| provides | `pathVar:orgKey` | `load` | `src/orgs/setup.mjs:64` |
| provides | `pathVar:parameterKey` | `handlers` | `src/orgs/handlers/parameters-detail.mjs:10` |
| requires | `appExt:setupMethods` | `load` | `src/orgs/setup.mjs:6` — pushed from `setup` |
| requires | `appExt:_liqProjects.playgroundMonitor` | `setup` | `src/orgs/setup.mjs:29` — inside `loadOrgs` |
| requires | `appExt:_liqOrgs.orgSetupMethods` | `setup` | `src/orgs/setup.mjs:46` — inside `processOrgSetup` |
| requires | `pathVar:parameterKey` | `handlers` (fixed) | `src/orgs/handlers/parameters-detail.mjs:6` route |
| requires | `setupArg:registerPathVar` | `load` (fixed) | `src/orgs/setup.mjs:5` |

**Answer to "does `orgs` need any declaration": yes, and it is the richest component of the four.** Three corrections to the assumption carried in:

1. **`appExt:_liqOrgs` is provided at `setup`, not `load`.** `orgs`' own `setup()` writes nothing to `app.ext` — it only pushes three entries onto `app.ext.setupMethods` and registers two path vars. The object is created by the deferred `prepare org dependencies` method, which `DependencyRunner` runs at `setup` phase, well after every plugin's `setup()` has returned. Declaring `load` would be a false claim and would wrongly satisfy any `load`-phase requirer.
2. **`liq-controls` is not the only external consumer, and `_liqOrgs` is not purely outbound.** `app.ext._liqOrgs.orgSetupMethods` is *written* by `liq-policy` (`src/liq-policy/setup.mjs`, outside dev-core) and *read and run* by `orgs`' own `process org setup`. So `orgs` both provides the container and requires a member of it from an external writer — a genuine inbound coupling, not just an outbound one.
3. **`orgs` is the source of the schema doc's own `order` and `pathVar @ handlers` worked examples**, and both check out verbatim against dev-core's tree: the `'!'`/`'*'` triple at `setup.mjs:6-19`, and `parameterKey` registered from a handler `func` at `parameters-detail.mjs:10`. Note that `parameters-set.mjs:53-61` contains a *commented-out* second registration of `parameterKey` — so there is exactly one live registration, and no self-conflict on that `exclusive: true` capability. Do not declare the commented-out one.

## `projects-audit`

Source of truth: `src/projects-audit/` (no `setup.mjs`; `index.mjs` is `export * from './handlers'`).

| Direction | Capability | Phase | Grounding |
|---|---|---|---|
| requires | `appExt:_liqProjects.playgroundMonitor` | `runtime` | `handlers/_lib/audit-lib.mjs`, `handlers/_lib/audit-fix-lib.mjs` |
| requires | `pathVar:projectName` | `handlers` (fixed) | two of four routes carry a `:projectName` segment |

**Answer to "does `projects-audit` need any declaration": yes — two `requires`, no `provides`.** It has no `setup`, but having no `setup` is not the same as having no dependency, exactly as the consolidation contract's [composite setup ordering](../../docs/dev-core-consolidation-contract.md#composite-setup-ordering) section already states.

**Are same-plugin, component-to-component edges in scope for this grammar?** Yes, explicitly and by design — this was the open question worth checking, and the schema answers it directly rather than being silent. The `components:` extension's first normative property is: "Array order is intra-entry load order. … Because the order is declared, a `load`→`load` requirement *between two components of one entry* is statically provable — otherwise the single least tractable case in the whole design." So intra-package edges are not automatically satisfied and not out of scope; they are the case `components:` exists to make provable. Both of `projects-audit`'s edges are `load` → `handlers`/`runtime`, discharged by the phase lattice alone without even needing the component ordering.

The corollary is that **`components:` array order is normative and must mirror `src/index.mjs`**. `src/index.mjs`'s `submoduleSetups` order is `projects`, `orgs`, `work`; `projects-audit` is absent from it (handlers only) and is spread last in the `handlers` array. The manifest's `components:` order should therefore be `projects`, `orgs`, `work`, `projects-audit`, and reordering `src/index.mjs` becomes a manifest change.

## Cross-cutting: what is provided from outside dev-core

| Capability dev-core requires | Provider | Manifested today? |
|---|---|---|
| `appExt:serverConfigRoot` | `plugable-express` itself | **Yes** — `FRAMEWORK_MANIFEST`, at `framework` phase, carrying `supersedes: ['appExt:serverHome']` |
| `appExt:constants` | `plugable-express` itself (empty container) | **Yes** — `FRAMEWORK_MANIFEST` |
| `appExt:setupMethods` | `plugable-express` itself | **Yes** — `FRAMEWORK_MANIFEST` |
| `appExt:integrations` | `plugable-express` itself, at `setup` | **Yes** — `FRAMEWORK_MANIFEST` |
| `setupArg:registerPathVar` | `plugable-express` itself | **Yes** — `FRAMEWORK_MANIFEST` |
| `appExt:credentialsDB` | `core-server`'s in-tree `src/credentials/` | **No** — core-server's own manifest work is parked |
| `appExt:_liqOrgs.orgSetupMethods` | `liq-policy` | **No** |
| every `integrationHook:` above | `liq-controls`, `liq-integrations-issues-github` | **No** |

This table is what drives the [declaration-scope recommendation](./manifest-scope-and-tooling.md#which-requires-to-declare-now).
