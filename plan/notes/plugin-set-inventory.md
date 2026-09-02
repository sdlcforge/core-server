# Plugin Set Inventory And Derived Declarations

## Purpose and scope

The verified, current composition of `@sdlcforge/core-server`'s plugin set, and the declarations this plan will author for the part of it `core-server` owns — written in the upstream framework's **decided** vocabulary (`manifest-schema-design.md`), not in the provisional vocabulary of the upstream shakedown note.

Every figure here was re-derived from this worktree's source on 2026-08-26 rather than carried forward from a wave note. The change request asked for exactly that.

## Verified composition

### The four loading sources, as `core-server` uses them

| Source | What `core-server` supplies | Statically resolvable? |
|---|---|---|
| `builtinPlugins` | **one** entry, `@sdlcforge/core-server`, aggregating **three** in-tree submodules | Only if declared as data |
| Server Package Root — explicit filter | **five** package names in the `explicitPlugins` array literal | Only if declared as data |
| Server Package Root — keyword discovery | **zero** plugins | n/a — contributes nothing |
| `dynamicPluginInstallDir` / `pluginPaths` | `dynamicPluginInstallDir: COMPLY_HOME()`; no `pluginPaths` | Out of the gate's guarantee by upstream design |

The two mechanisms carrying the entire real plugin set are precisely the two that are not scan-discoverable. That is why `plugable.host` is a prerequisite for this plan rather than a convenience.

### The five explicit-tier plugins

Verbatim from `src/lib/app-init.mjs`, in array order:

1. `@liquid-labs/sdlc-projects-badges-coverage`
2. `@liquid-labs/sdlc-projects-badges-github-workflows`
3. `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd`
4. `@liquid-labs/sdlc-projects-workflow-local-node-build`
5. `@sdlcforge/dev-core`

**Five, not eight, not eleven.** Earlier notes counted eight explicit-tier plugins — `@liquid-labs/liq-orgs`, `@liquid-labs/liq-projects`, `@liquid-labs/liq-work`, and `@liquid-labs/plugable-projects-audit` as four separate entries alongside the four `sdlc-projects-*` names — before the completed `dev-core-consolidation` plan-group folded those four into a single `@sdlcforge/dev-core` package dependency, collapsing the array from eight names to five. The still-earlier "eleven" figure in even older wave notes counted the three absorbed donors — `liq-controls`, `liq-credentials`, `liq-integrations-issues-github` — which are in-tree submodules and are deliberately absent from `explicitPlugins`. The comment block at `src/lib/app-init.mjs:40-51` documents their removal and what a double-load would cost.

**Array order is not load order.** `loadPlugins` runs `findPlugins` with a membership filter and receives filesystem scan order back. The upstream host-declaration reader states this explicitly for `plugable.host.explicitPlugins`: "Order is **not** load order... the resolver must not treat this array's order as an ordering fact." Any same-phase edge between two of these five is therefore `order-unprovable`, by construction, and no manifest this plan authors can change that.

### The three in-tree submodules

From `src/lib/builtin-plugins.mjs`, `submodules = [controls, credentials, issuesGitHub]` — and that array order **is** load order, enforced by a sequential `for...of` with `await`. The file's own comment fact 2 says so: "`submodules` order is load order... Keep it stable, and add to the end rather than reordering."

All three register under `@sdlcforge/core-server`'s own npm identity, by deliberate aggregation policy (fact 3 and the `builtinPluginsFor` comment), so they are **three `components:` of one plugin identity**, never three plugin identities.

### `.yalc`-linked dependencies

`package.json` resolves two direct dependencies through yalc today: `@liquid-labs/plugable-express` and `@sdlcforge/dev-core` — the latter superseding the pre-consolidation `@liquid-labs/liq-projects` yalc link now that `liq-projects` is folded into `dev-core`. `@liquid-labs/http-smart-response` comes through as a yalc-resolved transitive. `AGENTS.md` warns this set is version-sensitive and should be re-derived with `grep -n 'file:\.yalc' bun.lock` rather than treated as permanent.

## Derived declarations for what `core-server` owns

These are this plan's actual design output. They are written against real source, with the reading site cited, in the upstream's decided vocabulary: `appExt:` / `setupArg:` / `setupMethod:` / `pathVar:` / `config:` kinds, and the phase tokens `framework` < `load` < `handlers` < `setup` < `runtime`.

They are shown here as the `plugable.host.builtins` inline form, because that is where they must live: a `builtinPlugins` entry has no package root of its own, and `core-server`'s single npm identity covers all three components.

```yaml
plugableManifestVersion: 1
host:
  explicitPlugins: [ ...the five above... ]
  builtins:
    - npmName: '@sdlcforge/core-server'
      components:                       # ORDER IS NORMATIVE LOAD ORDER — mirrors `submodules`
        - component: controls
          provides:
            - setupMethod:load org controls
            - setupMethod:load controls integrations
            - { capability: 'integration:controls', phase: setup, exclusive: false,
                via: "setup method 'load controls integrations'" }
            - { capability: 'integrationHook:controls/getQuestionControls', phase: setup,
                exclusive: false }
          requires:
            - { capability: appExt:setupMethods, phase: load }
            - setupMethod:load orgs                    # src/controls/setup.mjs:7 deps
            - setupMethod:setup integrations           # src/controls/setup.mjs:13 deps
            - { capability: appExt:integrations, phase: setup }
            - { capability: appExt:_liqOrgs,     phase: setup }    # resources/load-controls.mjs:6
            - { capability: appExt:_liqOrgs,     phase: runtime }  # _lib/list-lib.mjs
            - { capability: appExt:_liqProjects, phase: runtime }  # integrations/get-question-controls.mjs
            - pathVar:orgKey

        - component: credentials
          provides:
            - { capability: appExt:credentialsDB, phase: load,
                via: 'src/credentials/setup.mjs:11 — app.ext.credentialsDB = credentialsDB' }
            - { capability: pathVar:credential, phase: load,
                via: "src/credentials/setup.mjs:17 — registerPathVar('credential')" }
          requires:
            - setupArg:app
            - setupArg:cache
            - setupArg:registerPathVar
            - setupArg:serverConfigRoot          # <- THE ynGa SURFACE
            - { capability: appExt:serverConfigRoot, phase: runtime }   # handlers/credentials/import.mjs

        - component: issues-github
          provides:
            - setupMethod:register github issues integrations
            - { capability: 'integration:tickets',      phase: setup, exclusive: false,
                conditional: true,
                via: "setup method 'register github issues integrations' (providerTest: usesGitHubIssues)" }
            - { capability: 'integration:pull request', phase: setup, exclusive: false,
                conditional: true,
                via: "setup method 'register github issues integrations' (providerTest: usesGitHubIssues)" }
            - { capability: 'integrationHook:tickets/getCurrentIntegrationUser', phase: setup,
                exclusive: false }
            - { capability: 'integrationHook:tickets/getIssueURL',   phase: setup, exclusive: false }
            - { capability: 'integrationHook:tickets/getProjectURL', phase: setup, exclusive: false }
            - { capability: 'integrationHook:pull request/createOrUpdatePullRequest', phase: setup,
                exclusive: false }
            - { capability: 'integrationHook:pull request/getCurrentIntegrationUser', phase: setup,
                exclusive: false }
            - { capability: 'integrationHook:pull request/getPullRequestURLsByHead', phase: setup,
                exclusive: false }
            - { capability: 'integrationHook:pull request/getQALinkFileIndex', phase: setup,
                exclusive: false }
          requires:
            - { capability: appExt:setupMethods, phase: load }
            - setupMethod:setup integrations
            - { capability: appExt:integrations,  phase: setup }
            - { capability: appExt:credentialsDB, phase: runtime }
            - { capability: 'credential:GITHUB_API', phase: runtime, optional: true,
                reason: 'GitHub hooks fail at call time without it; the server is otherwise healthy' }
            - { capability: appExt:_liqProjects, phase: runtime }
```

### Source citations for the non-obvious entries

| Declaration | Evidence |
|---|---|
| `controls` provides two setup methods | `src/controls/setup.mjs` pushes `load org controls` (`deps: ['load orgs']`) and `load controls integrations` (`deps: ['setup integrations']`) |
| `controls` provides `integration:controls` with `providerTest: () => true` | `src/controls/integrations/register-controls-integrations.mjs` — unconditional, so the static provide does not over-claim |
| `controls` requires `appExt:_liqOrgs @ setup` | `src/controls/resources/load-controls.mjs:6` — `Object.values(app.ext._liqOrgs.orgs)`, called as the `load org controls` setup method |
| `credentials` provides `appExt:credentialsDB @ load` | `src/credentials/setup.mjs` — bare property assignment, no checkpoint, no duplicate detection |
| `credentials` requires `setupArg:serverConfigRoot` | `src/credentials/setup.mjs:6` destructures `{ app, cache, registerPathVar, serverConfigRoot }` |
| `issues-github` provides both nouns with `providerTest: usesGitHubIssues` | `src/integrations-issues-github/index.js` — **conditional**; see the over-claim caveat below |
| `issues-github` requires `credential:GITHUB_API @ runtime` | `get-current-integration-user.mjs:5`, `create-or-update-pull-request.mjs`, `determine-current-milestone.mjs` — each `credDB.getToken('GITHUB_API')` |

### Two caveats this plan must carry, not hide

**The `integration:tickets` / `integration:pull request` provides over-claim — resolved.** Both are registered with `providerTest: usesGitHubIssues`, so they are provided only for projects that use GitHub issues. A bare, unconditional `provides` would over-claim: the graph would close and `No provider found for 'tickets'` could still fire at request time for a non-GitHub project. As of this note's original writing (2026-08-26) the upstream schema had not yet adopted its proposed `conditional:` marker into the decided grammar. It has since shipped: `plugable-express`'s `docs/plugin-manifest-schema.md` `### conditional` section (merged 2026-08-28) documents `conditional: true` plus a `via:` note, with `core-server`'s own `integration:tickets` case as its worked example. Both provides are declared `conditional: true` per [2026-09-01-blocker-reverification.md](./2026-09-01-blocker-reverification.md)'s Q3 finding — no choice between an accepted over-claim and an omission is needed.

**`credential:GITHUB_API` is registered by `liq-projects`, not by `credentials`.** The upstream shakedown established the chain by reading built output: `src/credentials/setup.mjs` constructs an **empty** `CredentialsDB` and registers no credential type; `@liquid-labs/liq-projects`' `setup()` calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })`, imported from `@liquid-labs/credentials-db-plugin-github` (an ordinary `dependencies` entry of `liq-projects`), and that is what registers `GITHUB_API` and `GITHUB_SSH`. So `core-server` must **not** declare a provide it does not perform. Whether the requirement is left dangling, covered by `plugable.host.assumeProvided`, or covered by a real `liq-projects` manifest is the open question in [manifest-ownership-boundary.md](./manifest-ownership-boundary.md).

## What `core-server`'s own declarations do and do not catch

Stating this precisely matters, because the change request's success criteria are phrased in terms of two named bugs.

| Coupling | Caught by declarations `core-server` owns? |
|---|---|
| `credentials` requires `setupArg:serverConfigRoot` — the ynGa surface, in-tree half | **Yes.** Rename the framework key and this `requires` matches nothing: one `unsatisfied` finding naming the component and the capability. |
| `credentials` requires `appExt:serverConfigRoot @ runtime` — the handler read | **Yes**, same mechanism. |
| `liq-credentials-db` receiving `serverConfigRoot` as a constructor argument | **Transitively.** It never touches `app.ext` and never sees the `setup()` argument object, so no capability kind names it. `src/credentials/`'s own `setupArg:serverConfigRoot` declaration is the coupling that stands in for it, and its failure is `liq-credentials-db`'s failure. This must be written down, or a future reader concludes the manifest has nothing to say about that package and is wrong about why. |
| `liq-work` requires `appExt:serverConfigRoot @ load` — the ynGa surface, third-party half | **No.** See [manifest-ownership-boundary.md](./manifest-ownership-boundary.md). |
| `liq-projects` requires `appExt:credentialsDB @ load` — the GITHUB_API ordering gap | **No** for the requiring side. The **providing** side is declarable here: `credentials` provides it at `load` with a known `loadIndex` (builtins are source #1, and `credentials` is component index 1 within the entry). A provide with nothing requiring it emits no finding. |
| Re-introducing any of the three absorbed donors | **Yes**, and this is the clearest unambiguous win. Each donor duplicates an exclusive `provides` of an in-tree component, so each becomes a `conflict` naming both providers before any side effect — including `liq-integrations-issues-github`, whose double-load is silent today. |

The last row is worth weighting properly. It is a real defect class this plan closes outright, with no dependency on any third party, and it is not what the change request led with.

## Not in scope, recorded so it is not rediscovered

`@liquid-labs/liq-work` calls `providerFor: 'pull requests'` (plural) in one place while every registration uses `'pull request'` (singular), throwing `No provider found for 'pull requests'` at request time. It is a pre-existing defect in an installed third-party dependency, outside both plan-groups' scope. If a derived-versus-declared diff is ever run against `liq-work`, expect it to surface; that is a result, not a regression.
