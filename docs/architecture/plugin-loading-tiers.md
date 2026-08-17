# Plugin Loading Tiers

## Purpose and scope

`core-server` delivers essentially all of its capability through plugins loaded by `@liquid-labs/plugable-express`, across three fixed-order tiers. [`docs/architecture.md`](../architecture.md#plugin-system) introduces the tier model at a glance; this document is the deep treatment: the full ordering and override semantics, the complete explicit-plugin list and what each package contributes, and the `${COMPLY_HOME}/plugins/server/` user-tier discovery mechanism, including how that path resolves and how an operator can override it. It does not cover the internal implementation of `@liquid-labs/plugable-express` itself (a separate, independently-versioned library `core-server` depends on rather than reimplements) beyond the configuration surface `core-server` passes into it.

## Table of contents

1. [Tier ordering and override semantics](#tier-ordering-and-override-semantics)
2. [Tier 1: core plugins](#tier-1-core-plugins)
3. [Tier 2: explicit npm-dependency plugins](#tier-2-explicit-npm-dependency-plugins)
4. [Tier 3: user-supplied plugins](#tier-3-user-supplied-plugins)
5. [Configuration surface](#configuration-surface)
6. [Related documents](#related-documents)

## Tier ordering and override semantics

`src/lib/app-init.mjs` is where `core-server` assembles configuration and hands off to `@liquid-labs/plugable-express`'s `appInit`. The three tiers always load in the same fixed order:

<!-- For AI agents and non-visual readers: this diagram shows the fixed load order — core plugins first, then the 11 explicit npm-dependency plugins declared in app-init.mjs, then any user-supplied plugins discovered under ${COMPLY_HOME}/plugins/server/ — with each tier's routes merging into one aggregated API surface. -->

```mermaid
flowchart LR
    subgraph T1["Tier 1: core"]
        direction TB
        A["Built into @liquid-labs/plugable-express"]
    end
    subgraph T2["Tier 2: explicit"]
        direction TB
        B["11 npm-dependency packages<br/>declared in app-init.mjs"]
    end
    subgraph T3["Tier 3: user-supplied"]
        direction TB
        C["Discovered under<br/>${COMPLY_HOME}/plugins/server/"]
    end
    T1 --> T2 --> T3 --> API["Merged, self-describing API surface<br/>(/server/api, /server/plugins/list)"]
```

Ordering is what makes the tiers a *hierarchy of override* rather than three independent, unordered sources of routes: because `@liquid-labs/plugable-express` merges each tier's contributed handlers into the same aggregated handler set in this fixed sequence, a later tier can register a route that a plugin from an earlier tier already registered, and it takes effect without requiring any change to the earlier tier's code or `core-server`'s own source. This is the load-bearing property behind "all capability is plugin-delivered" — a project maintainer extends or overrides server behavior by adding a package to a later tier, never by patching an earlier one.

`core-server`'s own contribution to this mechanism is entirely configuration: it does not implement route merging, conflict resolution, or handler dispatch itself. The exact merge and override mechanics (how a later handler at the same path and method supersedes an earlier one) are implemented inside `@liquid-labs/plugable-express`; that library's own documentation is the canonical source for those internals. `app-init.mjs` does not pass `skipCorePlugins`, so tier 1 always loads.

## Tier 1: core plugins

Core plugins are built directly into `@liquid-labs/plugable-express` and load automatically as part of its `appInit`, before any tier `core-server` itself configures. `core-server` exercises no control over which core plugins load or what they contribute — that surface belongs entirely to `@liquid-labs/plugable-express`.

## Tier 2: explicit npm-dependency plugins

The explicit tier is a static, ordered array literal, `explicitPlugins`, declared directly in `src/lib/app-init.mjs` and passed straight through to `appInit`. Every entry is also a regular `dependencies` entry in `package.json`, so the tier's full package set installs alongside `core-server` itself rather than being fetched dynamically at startup. As of this writing the array holds exactly 11 packages, in this order:

| # | Package | What it contributes |
|---|---------|----------------------|
| 1 | `@liquid-labs/liq-controls` | Policy controls for a `plugable-express` server — the package's own description states it "enables and manages policy controls." |
| 2 | `@liquid-labs/liq-credentials` | Credential storage and retrieval for third-party integrations, keeping secret-handling logic out of `core-server`'s own minimal codebase (per [`docs/architecture.md`](../architecture.md#security-model)). |
| 3 | `@liquid-labs/liq-integrations-issues-github` | A GitHub issue-tracking integration adapter that registers with `@liquid-labs/plugable-express`'s built-in integrations registry (`app.ext.integrations` / `IntegrationsManager`) — providing capabilities like resolving pull-request URLs by head branch and creating or updating pull requests against GitHub issues. |
| 4 | `@liquid-labs/liq-orgs` | Organization management — creating and managing the organization entities the rest of the SDLC tooling operates within. |
| 5 | `@liquid-labs/liq-projects` | Project management — project detail, listing, and release/publish operations for projects managed through the server. |
| 6 | `@liquid-labs/liq-work` | Unit-of-work management — associating projects with units of work and driving QA operations across them. |
| 7 | `@liquid-labs/plugable-projects-audit` | Project auditing — auditing a project and applying fixes for audit issues found. |
| 8 | `@liquid-labs/sdlc-projects-badges-coverage` | Generates coverage badges from a project's local `clover.xml` results (per the package's own description). |
| 9 | `@liquid-labs/sdlc-projects-badges-github-workflows` | Adds GitHub Workflow status badges to a project's `README.md` (per the package's own description). |
| 10 | `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | Generates GitHub Workflows CI/CD configuration for Node.js/Jest unit testing (per the package's own description). |
| 11 | `@liquid-labs/sdlc-projects-workflow-local-node-build` | Installs and manages the local Node.js build workflow for a project — the local-build counterpart to the CI/CD workflow packages above. |

Packages 8–11 are the `sdlc-projects-workflow-*`/`sdlc-projects-badges-*` family referenced in [`docs/core-server-spec.md`](../core-server-spec.md#key-use-cases) as the mechanism behind "install optimized lint/test/build/CI-CD scripts into a project" — they are what actually write that tooling into a target project when invoked through the companion CLI.

Because every explicit-tier package is a declared npm dependency rather than a dynamically-fetched one, the [Docker multi-version test suite](../architecture.md#test-infrastructure) exists primarily to catch loading regressions across this specific 11-package set on a fresh `npm install`, across every supported Node.js version — not to re-verify per-package internal correctness, which is each package's own responsibility.

## Tier 3: user-supplied plugins

The third tier is dynamic rather than a fixed list: any plugin package placed under a resolved plugin directory is picked up the next time the server starts, without any change to `core-server`'s own source or `package.json` dependencies.

`app-init.mjs` computes this directory as:

```js
const pluginsPath = fsPath.join(COMPLY_SERVER_PLUGIN_DIR(), 'server')
```

`COMPLY_SERVER_PLUGIN_DIR()` and the `COMPLY_HOME()` it composes with come from `@liquid-labs/comply-defaults`, and resolve as follows:

| Resolution step | Default | Override |
|---|---|---|
| `COMPLY_HOME()` | `${XDG_CONFIG_HOME}/comply-server`, or `~/.config/comply-server` if `XDG_CONFIG_HOME` is unset | `COMPLY_HOME` environment variable |
| `COMPLY_SERVER_PLUGIN_DIR()` | `${COMPLY_HOME()}/plugins` | `COMPLY_PLUGIN_PATH` environment variable (replaces the whole path, not just the `COMPLY_HOME` component) |
| `pluginsPath` (the tier-3 discovery directory) | `${COMPLY_SERVER_PLUGIN_DIR()}/server`, i.e. `${COMPLY_HOME}/plugins/server/` by default | Follows from whichever of the two overrides above is set |

This is the mechanism behind the `${COMPLY_HOME}/plugins/server/` path named throughout `core-server`'s other docs (e.g. [`docs/core-server-spec.md`](../core-server-spec.md#constraints-and-assumptions), [`AGENTS.md`](../../AGENTS.md#environment-variables-and-configuration)): it is the default resolution, reachable by leaving both `COMPLY_HOME` and `COMPLY_PLUGIN_PATH` unset, not a hardcoded literal in `core-server`'s own source. A project maintainer extends server capability purely by placing a plugin package at whichever directory this chain resolves to — no `core-server` source or dependency change required. If the resolved directory is unset (impossible, since it always resolves to a default) or empty of plugin packages, only the core and explicit-npm tiers are active, per [`docs/core-server-spec.md`](../core-server-spec.md#constraints-and-assumptions).

`app-init.mjs` also passes a related but distinct value, `dynamicPluginInstallDir: COMPLY_HOME()`, straight through to `appInit`. This is not the tier-3 *discovery* path above — it is the directory `@liquid-labs/plugable-express` uses as an *install target* when a plugin is added to the server dynamically (e.g. via its own plugin-management API), independent of where already-installed user plugins are subsequently discovered from. The two should not be conflated when reasoning about where a plugin needs to exist versus where one gets written to.

## Configuration surface

Everything `core-server` itself controls about plugin loading is expressed as one call in `src/lib/app-init.mjs` — preceded by a first-run step that seeds the packaged `server-settings.yaml` defaults into the resolved configuration root, detailed in [`docs/architecture.md`](../architecture.md#core-initialization):

```js
const appInit = async(options) => {
  if (options?.serverConfigRoot === undefined) {
    await seedServerSettings(COMPLY_SERVER_CONFIG_ROOT())
  }

  return await superInit({
    name                    : COMPLY_SERVER_CLI_NAME(),
    version                 : pkgVersion,
    apiSpecPath             : COMPLY_API_SPEC_PATH(),
    pluginsPath,
    explicitPlugins,
    serverConfigRoot        : COMPLY_SERVER_CONFIG_ROOT(),
    dynamicPluginInstallDir : COMPLY_HOME(),
    noAPIUpdate             : checkSdlcEnv('NO_API_UPDATE', (v) => v === 'true' || v === '1'),
    ...options
  })
}
```

`explicitPlugins` and `pluginsPath` are, respectively, the tier-2 list and the tier-3 discovery directory documented above. `serverConfigRoot` resolves through `@liquid-labs/comply-defaults`'s `COMPLY_SERVER_CONFIG_ROOT()` accessor to `${XDG_DATA_HOME}/sdlcforge-core/` — a user-level data location, distinct from `core-server`'s own installed-package directory that this value pointed at before the configuration-root relocation — and is where `@liquid-labs/plugable-express` now finds and writes server configuration state. `...options` lets a caller of `appInit` override any of the above — `src/cli/index.js` does not currently exercise this, but a consumer embedding `core-server` as a library (via `src/lib/index.js`) can.

## Related documents

- [`docs/architecture.md`](../architecture.md#plugin-system) — the architecture overview this topic hangs off; introduces the three-tier model at a glance and the plugin system's place among `core-server`'s other major components.
- [`docs/core-server-spec.md`](../core-server-spec.md#key-use-cases) — the functional requirements the plugin tiers satisfy, including the fixed load order and the user-supplied-tier extension use case.
- [`AGENTS.md`](../../AGENTS.md#environment-variables-and-configuration) — the `COMPLY_*` configuration functions in working-notes form, plus the yalc-based local development workflow for `@liquid-labs/plugable-express`.
