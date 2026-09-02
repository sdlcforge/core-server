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
