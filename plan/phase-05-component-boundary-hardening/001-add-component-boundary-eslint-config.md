# Add Component Boundary Eslint Config

## Purpose and scope

Adds a root `.eslintrc.cjs` to `@sdlcforge/core-server` that mechanically forbids cross-component imports across the seven `src/<component>/` directories, replacing the enforcement the package boundary used to provide for free before Phase 2/3 merged `@sdlcforge/dev-core`'s four submodules into this tree. No build-wiring change is needed and no code remediation is needed — both were verified in [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md), which is the implementation source for this task, not background reading. This task also settles the two deliberate scope decisions the research left open, and demonstrates (not merely asserts) that the rule fires and that it introduces zero new lint findings.

No dedicated skill covers authoring a project-local ESLint config; follow the [Procedure](#procedure) below.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

1. Create `.eslintrc.cjs` at the repository root (`/Users/zane/playground/sdlcforge/core-server/.eslintrc.cjs`), using the complete, verified file in [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) section 3 ("Proposed `.eslintrc.cjs` (repo root, complete file)") as the base:
   - `COMPONENT_DIRS` lists **directory** names, not manifest component names: `credentials`, `projects`, `orgs`, `controls`, `integrations-issues-github`, `work`, `projects-audit`. Note the third entry is `integrations-issues-github`, matching the directory, not the manifest's `issues-github`.
   - Seven zones, one per component — `target: src/<component>`, `from`: the other six `src/<other>` paths as plain directory strings (never globs).
   - `root: true`, `plugins: ['import']`, `basePath: __dirname` on the `import/no-restricted-paths` rule options.
   - The header comment explaining the file is hand-authored, not Catalyst-generated, and why `--config`'s additive eslintrc-mode behavior lets this file layer over the Catalyst ruleset without any makefile change. Preserve or adapt the header comment from the research note; it documents load-bearing facts (no flat config in this project or above it, ESLint 8.57.1 runs in eslintrc mode) that the next reader needs.

2. Settle and record both open scope decisions from the research note's "Open items for the implementing task" (also phase goal 6). Record each decision in this task document under a `## Decisions` section added at authoring time (or amend this document if authoring before decision), and reflect it in the shipped `.eslintrc.cjs`:
   - **Whether to add `src/lib` and `src/cli` to every zone's `from`.** This is a distinct invariant from "components do not import each other" ("components may not reach the host's own library"). No component imports `src/lib` today, so it costs nothing either way. Adopt explicitly or drop explicitly — do not leave it ambiguous.
   - **Whether a sibling's public `index` surface stays forbidden.** The base config forbids it (no `except` clause for any component's `index` file), which is the correct reading of the consolidation contract: components couple through `app.ext` state and declared capabilities, never through module paths, public or not. Loosening it is a deliberate choice (add the sibling `index` paths as zone `except` entries), not an oversight.

   Default recommendation, absent a reason to diverge: keep sibling-index imports forbidden (no `except` clauses), and do not add `src/lib`/`src/cli` to `from` in this pass — the note frames the latter as an optional strengthening that enforces a different invariant than this phase's goal 1, not a requirement of it. Diverge only with a stated rationale recorded in the `## Decisions` section.

3. Verify the shipped `.eslintrc.cjs` lints clean under the Catalyst config itself (`npx eslint --config <catalyst-config-path> --ext .cjs .eslintrc.cjs` from the repo root, or the equivalent full `make lint` run described in Validation).

## Validation

1. **File exists and is well-formed.** `.eslintrc.cjs` exists at the repo root; `node -e "require('./.eslintrc.cjs')"` from the repo root loads it without error and its `rules['import/no-restricted-paths'][1].zones` has exactly 7 entries, each with a `target` and a 6-element `from` array of plain path strings (no glob metacharacters).
2. **No new lint findings — baseline reproduction.** Run the project's real lint invocation (`bun run lint`, equivalently `make lint`) from the repo root. Findings must match the standing baseline exactly. **Correction (2026-09-08):** the baseline stated here (3 findings under `src/`, 233 total) is stale — Phase 4 task 004 (`repoint-sibling-plugin-graph-tests`) added `beforeAll` to the `/* global */` directive of `plugin-graph-serverconfigroot-rename.test.js` and `plugin-graph-third-party-ordering.test.js`, clearing 2 of the 3 `'beforeAll' is not defined'` findings this research note measured. The current baseline (confirmed by Phase 4 task 005's full unscoped run) is **1** finding under `src/` (`plugin-graph-gate.test.js`, untouched by task 004) and **230** under `test/` — **231 total**. Reproduce against 231, not 233; anything else is a real movement to report. Zero new findings anywhere, including when `.eslintrc.cjs` itself is linted (`eslint .` picks it up via `--ext .cjs`).
3. **The rule fires — demonstrated, not assumed.** Temporarily add a cross-component import (e.g. an extra line in a `src/controls/` file importing from `../orgs/resources/organization` or similar) and re-run `bun run lint`; confirm an `import/no-restricted-paths` finding is reported naming the correct zone message. Then revert the temporary change (`git checkout -- <file>` or equivalent) and re-run `bun run lint`, confirming the finding disappears and the baseline from step 2 is restored exactly. Record both run outputs (or a summary of findings-count before/after) in the task report.
4. **Structural exemptions hold.** Confirm `src/lib/builtin-plugins.mjs` and `src/lib/test/builtin-plugins.test.js` report no `import/no-restricted-paths` findings (they are outside every zone's `target`) as part of step 2's clean run.
5. **Decisions recorded.** This document (or its final committed form) contains a `## Decisions` section explicitly resolving both items from Requirements point 2, and the shipped `.eslintrc.cjs` matches whichever choices were recorded (e.g. if `src/lib`/`src/cli` were added to `from`, every zone's `from` array has 8 entries, not 6).
6. `git diff --stat` shows exactly one new file, `.eslintrc.cjs`, at the repo root (plus this task document's own edits under `plan/`).

## Procedure

1. Read [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) in full, especially sections 1–3.
2. Author `.eslintrc.cjs` at the repo root per Requirements point 1, starting from the research note's verified file verbatim, then applying whichever of Requirements point 2's decisions diverge from the stated default.
3. Run `bun run lint` (or `make lint`) from the repo root and confirm the baseline in Validation step 2.
4. Perform the temporary-violation probe in Validation step 3, capture the output, then revert.
5. Add a `## Decisions` section to this task document recording both scope decisions from Requirements point 2 and a one-line rationale for each.
6. Commit `.eslintrc.cjs` and this task document together.

## Metadata

architectural_impact: false

## References

- [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) — the complete verified `.eslintrc.cjs`, the config-resolution chain, the additive-`--config` behavior, both pre-existing-violation sweeps, the six planted-and-caught evasion shapes, and the baseline arithmetic. Authoritative for this task.
- [`plan/phases/component-boundary-hardening.md`](../phases/component-boundary-hardening.md) — this phase's goals, inputs, and outputs in full.
- `make/55-lint.mk` and `make/10-resources.mk` — read to confirm the lint invocation and config resolution; **not edited** by this task.
- `package.json`'s `plugable.host.builtins[0].components` — the `provides`/`requires` declarations naming the sanctioned coupling this rule enforces the complement of.
