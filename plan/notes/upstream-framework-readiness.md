# Upstream Framework Readiness

## Purpose and scope

Establishes the actual delivery state of the `@liquid-labs/plugable-express` compile-time manifest framework this plan-group consumes, because every task in this plan calls an API, a CLI, or a `package.json` block that framework must ship first. Captured 2026-08-26 by direct inspection, not by reading the upstream plan's own status prose.

## The finding

**The upstream framework's *design* is complete and final. Its *implementation* does not exist.**

The two are separately verifiable and they disagree, so both are stated with their evidence.

### The design is final and consumable

Plan-group `compile-time-manifest-framework` (plan slug `compile-time-manifest`, branch `plan/compile-time-manifest`) has a fully authored, decided contract across `plan/overview.md`, four `plan/phases/*.md` summaries, ten `plan/notes/*.md` research documents, and 21 task documents. Its `overview.md` records three closed user decisions (enforcement point, manifest format, enforcement depth) and five flagged decisions. Nothing in it reads as provisional. This plan consumes it as written and re-litigates none of it.

### The implementation has not started

| Evidence | Observation |
|---|---|
| Upstream `plan/TODO.yaml` | 21 tasks, **0 marked `done: true`**, 21 `done: false` |
| Upstream `plan/overview.md`, "Current status" | "Planning complete; implementation not started... No source file in this project has been modified." |
| Upstream `src/lib/` | `configurables.js`, `find-own-home.mjs`, `get-server-settings.mjs`, `index.js`, `integrations-manager.mjs`, `json-helpers.mjs`, `load-plugins.js`, `path-resolvers.js`, `path-to-re.mjs`, `path-var-registry.mjs`, `register-handlers.js`, `reporter.js` — no manifest reader, no host-declaration reader, no `framework-manifest.mjs`, no graph engine, no `validate-plugin-set` |
| Upstream `package.json` | no `bin` field |
| `core-server`'s yalc snapshot `.yalc/@liquid-labs/plugable-express/` | version `1.0.0-alpha.58`; `dist/` + `README.md` only; zero occurrences of `validatePluginSet`, `plugable-express-validate`, or `plugableManifestVersion` |

Every one of these is consistent with the others. There is no ambiguity about the state.

## What this plan depends on, concretely

Each item below is a named upstream deliverable this plan-group calls directly. The upstream task that produces it is cited so the dependency is checkable rather than approximate.

| Needed here | Upstream task |
|---|---|
| `plugable.host` block schema and its reader | `phase-01-manifest-schema/003-host-declaration-reader.md` |
| Plugin/inline manifest reader, `components:` handling, shorthand normalization | `phase-01-manifest-schema/002-plugin-manifest-reader.md` |
| Framework intrinsic manifest (what `appExt:serverConfigRoot` and `setupArg:serverConfigRoot` are checked against) | `phase-01-manifest-schema/004-framework-intrinsic-manifest.md` |
| The graph engine and its `unsatisfied` / `unsatisfied-phase` / `order-unprovable` verdicts | all of upstream Phase 2 |
| `validatePluginSet()` | `phase-03-validation-entry-points/002-validate-plugin-set-api.md` |
| `plugable-express-validate` CLI and its exit-code contract | `phase-03-validation-entry-points/003-validation-cli-and-build-wiring.md` |
| `verifyHostDeclaration()` | `phase-03-validation-entry-points/004-packaging-lint-and-host-verification.md` |
| `docs/plugin-manifest-contract.md` — the versioned artifact this plan codes against | `phase-04-compatibility-and-release/004-downstream-contract.md` |

The last row is the sharpest: the upstream plan describes that document as "this plan-group's deliverable to the wave... that group's entire job is to declare `core-server`'s manifests, and it cannot start without a settled contract." The design notes are a faithful proxy for it, but the normative artifact is a Phase 4 upstream deliverable.

## What is *not* blocked

Design work is not blocked. The contract is settled enough that `core-server`'s own declarations can be derived now — [plugin-set-inventory.md](./plugin-set-inventory.md) does exactly that, from real source, in the upstream's decided vocabulary. What is blocked is anything that *runs*: authoring a `plugable.host` block against a reader that does not exist, calling `verifyHostDeclaration()` from a Jest test, or wiring a CLI into `make test`.

That split is what makes this a sequencing constraint rather than a planning one. The plan below is authored in full against the settled contract; its execution has a hard prerequisite.

## The delivery path, and its known hazard

The framework reaches `core-server` through yalc, not npm:

1. Upstream Phases 1-4 land on `plugable-express`'s working branch.
2. `yalc push` from `plugable-express` (its `prepack` runs `make build` first, so the pushed `dist/` is freshly built).
3. In `core-server`: `rm -f bun.lock && bun install`, or `./scripts/provision-local-deps.sh --refresh-lock`.

Step 3 is not optional and not a bare `bun install`. `AGENTS.md` and `CLAUDE.md` both record why: under Bun, once `bun.lock` holds a resolved entry for a `file:` spec, a bare `bun install` re-copies the linked package's content but does not re-resolve its own dependency list, and `--force`, `--no-cache`, and a version bump are all equally ineffective — a newly added transitive dependency silently never materializes while `bun install` reports success. The manifest framework adds at least a `bin` entry and may add dependencies, so the lockfile refresh is load-bearing here, not hygiene.

**The npm-publish hazard is inherited.** The upstream plan's hard constraints record that `npm publish` and `gh repo` operations "are reliably blocked by this environment's Bash-permission classifier, for the manager and dispatched agents alike — established across four completed plans in this wave," and that its release task must expect the block and report it as requiring manual user action. `core-server` does not need a published `plugable-express` to proceed — the yalc link is the supported local-development path and is already in place — so a blocked upstream publish does not block this plan. It does mean this plan should not add a task that waits on one.

## Consequence for this plan's structure

Phase 1 opens with an explicit prerequisite-verification task rather than an assumption. The dependency is a checkable condition (does the linked build export `validatePluginSet` and carry the `bin`?), so it is checked, and the phase halts and reports if it is unmet. A silent assumption here would produce a task agent discovering the gap mid-implementation with no instruction on what to do about it.
