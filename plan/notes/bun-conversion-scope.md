# Bun Conversion Scope

## Purpose and scope

Determines what "convert `@sdlcforge/core-server` to Bun" concretely means for this project, and resolves whether the known `shelljs`-under-Bun blocker is in scope. Records the evidence behind each determination so later phases do not re-litigate them.

## The question

The planning brief posed a fork:

- **(a)** Run and test under the Bun *runtime*, with plugins loaded normally from `node_modules`. `shelljs` in a dependency is then a non-issue, because nothing is bundled.
- **(b)** Produce a Bun-*compiled single-binary* executable that bundles the explicit plugins in. The `shelljs` blocker is then real and in scope, and would require cross-repo remediation in `liq-projects` and `@liquid-labs/shell-toolkit`.

## Determination: (a), decisively

Four independent lines of evidence agree, so this is settled rather than assumed.

### The build already treats every dependency as external

The current Rollup output is **9 lines and 1.7 KB**. It bundles nothing:

```js
#!/usr/bin/env -S bun
"use strict"
const e=require("@liquid-labs/comply-defaults"),i=require("@liquid-labs/plugable-express"),l=require("node:fs")
```

Dependencies are emitted as bare `require()` calls resolved from `node_modules` at runtime. Confirmed: `grep -c shelljs dist/sdlcforge-server-exec.js` returns `0`.

### The explicit-plugin list is data, not imports

`src/lib/app-init.mjs` passes `explicitPlugins` as an **array of package-name strings**:

```js
const explicitPlugins = [
  '@liquid-labs/liq-controls',
  '@liquid-labs/liq-credentials',
  ...
]
```

`@liquid-labs/plugable-express` resolves and loads these by name at runtime. No bundler — Rollup or Bun — can see through a string array to statically include them. The 13 explicit plugins are structurally outside any bundle, which is precisely why `shelljs` inside `liq-projects` never reaches the artifact.

### The plugin architecture is incompatible with a single binary

`docs/architecture.md` describes three plugin tiers, two of which are resolved at runtime from the filesystem:

- `dynamicPluginInstallDir: COMPLY_HOME()` — plugins are **npm-installed at runtime**.
- Tier 3 user-supplied plugins are discovered from `${COMPLY_HOME}/plugins/server/` on each start, explicitly so that "a project maintainer [can] extend server capability without modifying core-server's own source or dependency set."

A sealed single-file binary cannot support runtime plugin installation or filesystem plugin discovery. Adopting (b) would mean discarding the server's defining feature.

### The artifact contract forbids it

`package.json` publishes `main: dist/sdlcforge-server.js` and `bin.sdlcforge-server: dist/sdlcforge-server-exec.js`. The stated constraint is to preserve both. Both are `.js` files consumed as an npm package — not binaries.

## Consequences

**`shelljs` is out of scope for this plan.** The blocker tracked as followup `hwbY` in `sdlcpilot-cli` applies only to Bun *compiled-binary* packaging that statically bundles plugin code. core-server does not and architecturally cannot do that. `shelljs` is present in `node_modules` as a transitive dependency of `liq-credentials-db`, `liq-handlers-lib`, `liq-projects`, `md2x`, and `shell-toolkit`, and continues to load normally under both Node and Bun when required from `node_modules` at runtime.

**No cross-repo work is required or blocking.** Neither `liq-projects` nor `@liquid-labs/shell-toolkit` needs changes for this plan. Neither needs to enter the manager's active target-project set.

## What the conversion does mean

Scoped to four concerns:

1. **Package management** — `bun install` and `bun.lock` replace `npm install` and `package-lock.json`. This is the load-bearing change and the one with a confirmed hard blocker (wildcard specifiers; see the [WIP branch triage](./wip-branch-triage.md)).
2. **Toolchain invocation** — the Catalyst makefiles shell out to `npm explore` and `npx`, both of which assume npm. These must resolve correctly against a Bun-installed `node_modules`.
3. **Test execution** — the three test tiers must pass. Whether Jest continues to run, or the unit tier moves to `bun test`, is a compatibility question, not a preference.
4. **Runtime target** — whether the published executable's shebang stays `node` or becomes `bun`. This is the one genuinely consumer-facing decision, and it is deferred to the user.

## The build system stays on Rollup and Babel

Replacing Rollup/Babel with Bun's bundler is treated as **rejected by default**, and would need explicit justification to revisit. The reasons are concrete rather than conservative:

- The Catalyst makefile convention is shared across the sdlcforge/liquid-labs ecosystem; `make/*.mk` files are *generated* by `@liquid-labs/catalyst-lib-makefiles` and `@liquid-labs/catalyst-builder-node`. Hand-diverging them makes this repository an outlier that regenerates incorrectly.
- The bundler is doing almost nothing. It emits a 9-line externals-only shim. There is no build-performance argument to be made about a 1.7 KB artifact.
- The two artifacts differ only by entry point and preamble — trivially expressible in any bundler, so there is no capability gap to close.

The one input that could reopen this is the toolchain-compatibility spike: if `npm explore`-based config resolution proves genuinely unworkable under Bun, the cost comparison shifts. That is why the spike explicitly asks the question rather than assuming the answer.

## Toolchain facts established

| Fact | Value |
|---|---|
| Bun installed | `1.3.14` at `/Users/zane/.bun/bin/bun` |
| Node installed | `v26.5.0` (note: above the `engines.node >=18.0.0` floor and above the Docker matrix ceiling of 24) |
| npm installed | `11.17.0` |
| `dist/` | gitignored; current contents are stale hand-built Bun spike output |
| `.yalc/`, `yalc.lock` | gitignored — six packages currently linked |
| Docker test image | `ubuntu:latest` + nvm, Node 18–24 pre-installed; no Bun |

Because Node and npm remain installed on the developer machine, `npx`-driven build steps may keep working *by accident* after a Bun migration. Validation must therefore confirm the toolchain works because it was made to, not because npm happened to still be on `PATH`.
