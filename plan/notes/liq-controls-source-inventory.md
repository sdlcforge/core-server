# liq-controls source inventory

## Purpose and scope

Ground-truth findings from reading `liq-controls`'s source directly, gathered to plan this project's slice of the federated `core-server-domain-consolidation` plan. Referenced from [`plan/overview.md`](../overview.md).

## Package identity

- `name`: `@liquid-labs/liq-controls`, `version`: `1.0.0-alpha.9`, `main`: `dist/liq-controls.js`, built via `make` (Babel + Rollup, the shared `@liquid-labs/catalyst-scripts-node-project` toolchain — the same toolchain `dev-core-consolidation-contract.md` documents for its own donors).
- `description`: "Enables and manages policy controls for a @liquid-labs/plugable-express server." — this is the server-visible plugin `summary` per the plugin contract (`package.json` `description`, read by `plugable-express`'s loader).
- `plugable-express.yaml`:
  ```yaml
  dependencies:
    - '@liquid-labs/liq-projects'
    - '@liquid-labs/liq-orgs'
  ```
  Declared plugin-level dependencies — the host server's loader resolves and loads these two sibling plugins automatically. Confirms the wave manifest's own description ("tightly coupled to liq-orgs/liq-projects").
- No `README.md`, `AGENTS.md`, or `docs/` present in git history (`git log --oneline -- README.md` / `-- docs` both empty) as of this writing. **Caveat:** the working tree currently carries an *untracked* `README.md` and `docs/liq-controls-spec.md` (both timestamped today, evidently produced by an unrelated session/process this same day) — see [Anomalies](#anomalies-and-flags) below. Neither is part of this project's committed state or of this plan's own worktree.

## Source tree (as of this plan's authoring)

```
src/
  lib/
    index.js                              # export * from './handlers'; export * from './setup'
    setup.mjs                             # registers 2 app.ext.setupMethods entries
    handlers/
      index.js                            # export * from './orgs'
      orgs/
        index.js                          # export * from './controls'
        controls/
          index.js                        # handlers = [listHandler, listImpliedHandler]
          list.mjs                        # GET /orgs/:orgKey/controls/list
          list-implied.mjs                # GET /orgs/controls/list
          _lib/
            list-lib.mjs                  # doListControls, getControlsListEndpointParameters
            test/list-lib.test.mjs
          test/
            list.test.js
            data/playgroundA/orgA/projectA01/... (org/project fixture data)
            data/playgroundA/orgA/projectA02/package.json
    integrations/
      get-question-controls.mjs           # getQuestionControls hook implementation
      register-controls-integrations.mjs  # registers the hook with app.ext.integrations
    resources/
      control.mjs                         # Control (base Item subclass; dispatches to QuestionControl)
      controls.mjs                        # Controls (ItemManager subclass; .load(), .getControl())
      question-control.mjs                # QuestionControl (Item subclass; loads *.qcontrols.yaml)
      load-controls.mjs                   # loadControls setup-time loader
      test/
        controls.test.mjs
        question-controls.test.mjs
        data/orgRootA/data/org/controls/test-controls.qcontrols.yaml
  schema/
    audit.schema.json                     # control-set JSON Schema, copied to dist/ by make/01-schema.mk
```

19 source files total under `src/` (excluding fixture/test-data files), all using relative imports — **no absolute or `src/lib`-rooted import path exists anywhere in the tree** (verified by grep), so a whole-subtree move requires zero import rewriting, matching the `liq-orgs` precedent's own finding.

## Route surface (2 endpoints)

| Method | Path | Source | Purpose |
|---|---|---|---|
| `GET` | `orgs/:orgKey/controls/list` | `list.mjs` | List controls for a named org. `404` if `orgKey` unknown. |
| `GET` | `orgs/controls/list` | `list-implied.mjs` | List controls for the org implied by the `X-CWD` header (via `getPackageOrgAndBasename`). `400` if `X-CWD` missing. |

Both share `doListControls`/`getControlsListEndpointParameters` in `_lib/list-lib.mjs`. Registers **no path variables of its own** (`:orgKey` is a path segment on an endpoint `liq-controls` registers, but the variable itself — its type/regex — is registered by `liq-orgs`'s own `setup`, not by `liq-controls`).

## Setup contributions (2 `app.ext.setupMethods` entries, pushed in `setup.mjs`)

| Name | `deps` | Effect |
|---|---|---|
| `load org controls` | `['load orgs']` | `loadControls`: for every org in `app.ext._liqOrgs.orgs`, scans `<org.projectPath>/data/org/controls/*.qcontrols.yaml`, builds a `Controls` item manager, and calls `org.bindRootItemManager(controls)`. |
| `load controls integrations` | `['setup integrations']` | `registerControlsIntegrations`: registers the `getQuestionControls` hook under provider name `'controls'` (`providerFor: 'controls'`, `providerTest: () => true`) in `app.ext.integrations`. |

Both are `app.ext.setupMethods.push(...)` entries with `deps` markers — the same deferred-setup mechanism `dev-core-consolidation-contract.md` describes for `liq-orgs`'s own deferred work, run later by the server's dependency runner, not at `setup()`-call time itself.

## `app.ext` contract — confirmed directly from source (not merely inherited from the wave manifest description)

- **Reads `app.ext._liqOrgs.orgs`** — in `load-controls.mjs` (`Object.values(app.ext._liqOrgs.orgs)`) and in `get-question-controls.mjs` (`app.ext._liqOrgs.orgs[orgKey]`), and indirectly in `list-lib.mjs`'s `doListControls` (`app.ext._liqOrgs.orgs[orgKey]`).
- **Reads `app.ext._liqProjects.playgroundMonitor`** — in `get-question-controls.mjs` (`app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)`).
- Both names are on `dev-core-consolidation-contract.md`'s explicit freeze list (`app.ext._liqProjects`, `app.ext._liqOrgs` "keep their exact current names through this consolidation... code **outside** this consolidation's own repositories reads these names directly: `liq-controls` (`src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`)") — that contract doc names these exact two files as the outside reader. Confirmed: this plan's relocation moves both files but must not change what they read (`app.ext._liqOrgs`, `app.ext._liqProjects` — now served by `@sdlcforge/dev-core`'s composite `setup`, which the frozen contract guarantees still publishes both keys under their original names).
- **Publishes nothing on `app.ext` itself.** `liq-controls` only *reads* `_liqOrgs`/`_liqProjects` and *writes* into `org.controls` (via `org.bindRootItemManager`, a method on the already-published `Organization`/org object, not a new top-level `app.ext` key) and into `app.ext.integrations` (via the standard `register()` call every provider uses, not a custom key).

## npm dependents (confirmed via playground-wide grep)

Only `@sdlcforge/core-server`'s own `package.json` (`dependencies['@liquid-labs/liq-controls']`) declares a runtime dependency on this package — in both the working checkout and its own `core-server-domain-consolidation` plan worktree. No other project in the playground depends on it. This matches `dev-core-consolidation-contract.md`'s stated retirement-policy precondition ("the only npm dependent of any source package is `@sdlcforge/core-server`... there is no intermediate state where both need to be loaded at once, so there is nothing for a shim to bridge") — confirmed true for `liq-controls` specifically, not merely assumed by analogy.

`core-server`'s `src/lib/app-init.mjs` lists `'@liquid-labs/liq-controls'` first in its 11-entry `explicitPlugins` array (`docs/architecture/plugin-loading-tiers.md`'s tier-2 table, row 1).

## Duplicate-registration risk (confirms the shared framing's "verify whether that risk applies here")

A re-export shim left in `liq-controls` alongside a landed core-server absorption would register both of `liq-controls`'s routes a second time. `liq-controls` itself registers no path variables, so the specific `registerPathVar` throw the contract doc cites for other donors does not apply to *this* donor directly — but `plugable-express`'s command-path registration (`register-handlers.js`) throws `Non-unique command path: <path>` on a duplicated array-style `path` regardless of path variables, and both of `liq-controls`'s routes (`orgs/:orgKey/controls/list`, `orgs/controls/list`) are declared as array-style `path`s. **Conclusion: yes, the risk applies** — a shim would crash server startup via the command-path duplicate-registration throw, not the path-var throw. No re-export shim may be left behind once core-server's absorption lands, matching the contract's policy.

## Pre-existing defects (carried forward as-is, not fixed)

1. **`src/lib/resources/controls.mjs` / `list-lib.mjs` output formatters never render the control list.** The three formatters in `_lib/list-lib.mjs` (`mdFormatter`, `textFormatter`, `terminalFormatter`) all guard on `data?.lengeth > 0` — a typo for `.length` — so the guard is always `undefined > 0` (`false`) regardless of how many controls were loaded, and the formatted body is always empty. Only the JSON output path (handled by `@liquid-labs/liq-handlers-lib`'s `formatOutput` outside these three functions) is unaffected. Both HTTP endpoints inherit this: Markdown/text/terminal-formatted responses from `GET /orgs/:orgKey/controls/list` and `GET /orgs/controls/list` always render an empty list body.
2. **`_lib/list-lib.mjs`'s 404 error message has a typo.** `` `No such or  g '${orgKey}'.` `` (double space, missing "r" in "org") instead of `` `No such org '${orgKey}'.` ``.
3. **No load-time schema validation.** `src/schema/audit.schema.json` is shipped (to `dist/audit.schema.json`) for external/tooling reference only; nothing in `load-controls.mjs` or `QuestionControl.loadData` validates a loaded `*.qcontrols.yaml` file against it, so a structurally invalid-but-valid-YAML control file loads without error.

None of these are in scope to fix here — the shared framing is explicit that this plan documents pre-existing defects rather than fixing them. They should be disclosed in the [retirement README](../phase-02-retire-liq-controls/002-author-readme-superseded-notice.md), mirroring how the `liq-orgs` sibling plan disclosed its own known-broken endpoints in its final README.

## Anomalies and flags

- **Untracked `README.md` and `docs/liq-controls-spec.md`** exist in the `liq-controls` main working tree (both dated today), evidently written by an unrelated process/session — `git log` shows no commits touching either path, and `git status` lists both as untracked. Content-checked: the spec is accurate and consistent with this inventory's own independent source reading (same routes, same setup ordering, same `app.ext` reads, same non-goals). **Neither file exists in this plan's own worktree** (a separate git worktree does not inherit another worktree's untracked files), so this plan's own Phase 1 task is unaffected in practice. Flagged for the manager to decide whether to formally commit, discard, or reconcile this content independently of this plan — not acted on here.
- **Target submodule directory name (`src/controls/`) is this plan's own choice**, not dictated by any existing core-server document — `docs/architecture/plugin-loading-tiers.md` documents the three-tier *loading* model and the tier-2 package list, not an internal `src/` layout convention for absorbed donors (that document does not exist yet for `core-server-domain-consolidation`; the closest precedent is `dev-core-consolidation-contract.md`'s "Layout convention" section, written for the sibling `dev-core-consolidation` plan-group). This plan follows that precedent's naming pattern (domain word, `liq-`/`plugable-` prefix dropped: `liq-orgs` → `orgs`, `liq-projects` → `projects`) and picks `controls` (dropping the `liq-` prefix from `liq-controls`). Because the absorption recipe relocates a donor "in place to its final path" — i.e., whatever path this plan chooses now is the path the eventual `git merge --allow-unrelated-histories` into `core-server` preserves — **core-server's own absorption-authoring phase (planned separately, after all three donors) must confirm `src/controls/` does not collide with the directory names chosen by the other two donors (`liq-credentials`, `liq-integrations-issues-github`) or with anything already under core-server's own `src/`** (today: only `src/cli/`, `src/lib/` — no collision yet).
