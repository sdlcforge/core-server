# Declare Controls Component Manifest

## Purpose and scope

Populate the `controls` entry of `plugable.host.builtins[0].components` in `core-server`'s `package.json` — one of the three in-tree component manifests this phase declares — with its real `provides` and `requires`, derived from `src/controls/setup.mjs` and the modules it reaches. This task's scope is limited to the `controls` array entry; the `credentials` and `issues-github` entries are separate, independent tasks ([002](./002-declare-credentials-component-manifest.md), [003](./003-declare-issues-github-component-manifest.md)) touching the same file's other array entries.

This task assumes Phase 1 (`framework-uptake-and-host-declaration`) has already landed: the framework dependency is refreshed and usable, and `package.json` already carries a `plugable.host.builtins[0].components` array with three ordered, structure-only stub entries (`controls`, `credentials`, `issues-github`, each with empty `provides`/`requires`). If that structure is not present, halt and report rather than inventing it — this task only populates, it does not create the host block.

## Requirements

- In `package.json`, locate the `components` array entry for `"component": "controls"` and populate its `provides` and `requires`, following the `package.json` `"plugable"` inline form documented in `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` (`### components:` section — whose own worked example is this exact `core-server` case).
- Re-derive every declaration from real source rather than transcribing [plugin-set-inventory.md](../notes/plugin-set-inventory.md)'s draft unread; that note is a verified starting draft, not a specification. The draft, as a checkpoint:
  - `provides` (all `phase: setup` unless noted):
    - `setupMethod:load org controls` (`deps: ['load orgs']`)
    - `setupMethod:load controls integrations` (`deps: ['setup integrations']`)
    - `integration:controls`, `exclusive: false`, `via: "setup method 'load controls integrations'"` — **unconditional** (`providerTest: () => true` in `src/controls/integrations/register-controls-integrations.mjs`), so no `conditional:` marker is needed here, unlike the `issues-github` component's task 003.
    - `integrationHook:controls/getQuestionControls`, `exclusive: false`
  - `requires`:
    - `{ capability: appExt:setupMethods, phase: load }`
    - `setupMethod:load orgs` (a same-name dependency `src/controls/setup.mjs` declares)
    - `setupMethod:setup integrations` (a same-name dependency)
    - `{ capability: appExt:integrations, phase: setup }`
    - `{ capability: appExt:_liqOrgs, phase: setup }` — `src/controls/resources/load-controls.mjs:6`
    - `{ capability: appExt:_liqOrgs, phase: runtime }` — `src/controls/_lib/list-lib.mjs`
    - `{ capability: appExt:_liqProjects, phase: runtime }` — `src/controls/integrations/get-question-controls.mjs`
    - `pathVar:orgKey`
- Before writing each entry's `phase`, check it against `docs/plugin-manifest-schema.md`'s "Reserved kinds and their defaults" table — `appExt:` requires an explicit `provides` phase and defaults `requires` to `runtime`; `setupMethod:` is fixed at `setup` on both sides; `pathVar:` requires phase is fixed at `handlers` (note `pathVar:orgKey` here is a `requires`, not a `provides`, so its phase is fixed regardless of what is written). A disagreeing explicit value on a fixed kind is a `manifest-invalid` error, not a silent override.
- Use `via:` on every `provides` entry that supports it, naming the mechanism (setup-method push site, `registerPathVar` call, etc.) so a future diagnostic reads as a sentence.
- Do not modify `submodules` order in `src/lib/builtin-plugins.mjs`, the outer `builtins` array structure, or the `credentials`/`issues-github` entries — those are other tasks' scope.

## Validation

- Confirm `package.json` remains valid JSON after the edit (e.g. `node -e "JSON.parse(require('fs').readFileSync('package.json'))"`).
- Re-read `src/controls/setup.mjs`, `src/controls/resources/load-controls.mjs`, `src/controls/_lib/list-lib.mjs`, `src/controls/integrations/register-controls-integrations.mjs`, and `src/controls/integrations/get-question-controls.mjs`, and confirm every `provides`/`requires` entry traces to a real read/write site in one of them.
- If `node_modules/.bin/plugable-express-validate` is present (it should be, after Phase 1's dependency refresh), run `node_modules/.bin/plugable-express-validate --package-root . --format text` as a sanity check. A `manifest-invalid` finding naming the `controls` component is a real defect in this task's edit and must be fixed. Findings naming the still-empty `credentials`/`issues-github` entries are expected until tasks 002/003 land and are not this task's concern.
- `make test` / `make qa` are not expected to change behavior from this task alone — the validator is not wired into the build until Phase 4. This task's validation is limited to the manifest declaration's own internal correctness against real source.

## References

- [plugin-set-inventory.md](../notes/plugin-set-inventory.md) — the verified composition and the derived declarations for all three components, with per-entry source citations.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` — `### components:`, `## Capability names`, `## Reserved kinds and their defaults`, `## The phase lattice` sections — the normative grammar this declaration must conform to.

## Status

**Outcome:** succeeded (2026-09-02).

Populated the `"controls"` entry of `plugable.host.builtins[0].components` in `package.json` with `provides`/`requires` re-derived from real source (`src/controls/setup.mjs`, `src/controls/resources/load-controls.mjs`, `src/controls/handlers/orgs/controls/_lib/list-lib.mjs` — see note below on the actual path, `src/controls/integrations/register-controls-integrations.mjs`, `src/controls/integrations/get-question-controls.mjs`, `src/controls/handlers/orgs/controls/list.mjs`). The `credentials` and `issues-github` entries were left untouched as empty stubs, per this task's scope.

Declared, in order:

- `provides`: `setupMethod:load org controls` and `setupMethod:load controls integrations` (both with an added `via:` naming the `app.ext.setupMethods` push site in `src/controls/setup.mjs`, per Requirements' "use `via:` on every entry that supports it"); `integration:controls` (`exclusive: false`, `via: "setup method 'load controls integrations'"`, unconditional — no `conditional:` marker, since `providerTest: () => true`); `integrationHook:controls/getQuestionControls` (`exclusive: false`, with an added `via:` naming the registration site).
- `requires`: `{ appExt:setupMethods, phase: load }`; `setupMethod:load orgs`; `setupMethod:setup integrations`; `{ appExt:integrations, phase: setup }`; `{ appExt:_liqOrgs, phase: setup }` (`load-controls.mjs:6`); `{ appExt:_liqOrgs, phase: runtime }` (`list-lib.mjs`'s `doListControls`, called from `handlers/orgs/controls/list.mjs`); `{ appExt:_liqProjects, phase: runtime }` (`get-question-controls.mjs:7`); `pathVar:orgKey` (consumed via `req.vars.orgKey` against the `:orgKey` path segment in `handlers/orgs/controls/list.mjs`).

**Validation results:**
- `node -e "JSON.parse(...)"` — passed, valid JSON.
- Re-read of all five (plus one additional handler) cited source files — every `provides`/`requires` entry traces to a real, cited read/write site.
- `node_modules/.bin/plugable-express-validate --package-root . --format text` — ran; no `manifest-invalid` finding names the `controls` component (none of the 4 reported errors is `manifest-invalid`). Three errors concern `@sdlcforge/dev-core`'s own `orgs`/`projects`/`work` components requiring capabilities from the unmanifested `sdlc-projects-*` explicit plugins — unrelated to this task's edit. A fourth, `[violated-by-source-order]`, names `@sdlcforge/core-server#controls` requiring `appExt:_liqOrgs @ setup` against `@sdlcforge/dev-core#orgs`'s same-phase provide, flagged because `dev-core` (Server Package Root / explicit, load position 5) loads after the `builtins` source (load position 0) in the validator's static load-order model — a genuine cross-package ordering fact the model surfaces at the `appExt` level (it does not credit the DependencyRunner-level `setupMethod:load orgs` dependency this task also declares, which is what actually guarantees correct runtime ordering). Fixing it would require moving `dev-core` into `builtinPlugins` or otherwise restructuring the host's plugin-set composition — out of this task's scope and forbidden by its own Requirements (no `builtins` array/`explicitPlugins` restructuring). Flagged for the manager; not a defect in this task's declaration.

**Note on a task-doc citation:** the Validation section cites `src/controls/_lib/list-lib.mjs`; the real file implementing the same `appExt:_liqOrgs @ runtime` read is `src/controls/handlers/orgs/controls/_lib/list-lib.mjs`. Declaration content is correct against the real file; only the task doc's own path citation is stale.

No `## Assumptions` section was present in this task doc, so none were relied upon beyond the Purpose-and-scope's own stated assumption (Phase 1's host-block structure already present), which was confirmed present before editing.

Affected file: `package.json`.
