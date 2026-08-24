# @liquid-labs/liq-controls Specification

## Purpose and scope

This document is the canonical statement of what `@liquid-labs/liq-controls` must do: the use cases it supports, the cross-cutting behavior every part of it observes, and its external surface (HTTP endpoints, the plugable-express integration hook, and the control-definition file format). The intended readers are developers and AI agents implementing or modifying `liq-controls`, and reviewers checking proposed changes against what has been committed to. It assumes the reader has already oriented via [`README.md`](../README.md); this document does not repeat the project pitch or installation instructions found there.

`liq-controls` is a plugin for a [`@liquid-labs/plugable-express`](https://github.com/liquid-labs/plugable-express) server. It defines and loads question-based policy controls for the organizations the host server manages, and exposes those controls — by HTTP and by an integration hook — for other plugins and callers to retrieve. It does not itself walk a control's questions, collect or score answers, enforce an outcome, or record an audit trail; those activities are the responsibility of whatever consumer retrieves the control definitions (see [Non-goals](#non-goals)). This document does not cover *how* the plugin is built internally (module layout, the `ItemManager`/`Item` base-class usage, the build pipeline); that design-level material belongs in `docs/architecture.md` when it exists. Working conventions (build, test, lint) live in [`AGENTS.md`](../AGENTS.md). File and directory layout lives in [`docs/project-structure.md`](./project-structure.md).

This project is a participant in a broader plan (visible in this checkout's `.flow/` and `plan/` state) to eventually consolidate several `liq-*` plugins, including this one, into a `core-server` package. That consolidation has not happened. This document describes `liq-controls` as it exists today: a standalone, active plugin loaded independently by a host plugable-express server.

## Table of contents

1. [Key use cases](#key-use-cases)
2. [General features](#general-features)
3. [API definition](#api-definition)
4. [Constraints and assumptions](#constraints-and-assumptions)
5. [Non-goals](#non-goals)
6. [Pointers to deeper docs](#pointers-to-deeper-docs)

## Key use cases

### UC1: Load an organization's policy controls at server setup

- **Actor:** The host plugable-express server, during its setup pipeline.
- **Action:** For each organization the server has loaded (via `@liquid-labs/liq-orgs`), `liq-controls` scans `data/org/controls/` under that organization's project directory for files matching `*.qcontrols.yaml`.
- **Outcome:** Each matching file is parsed and loaded as a question-control definition; the full set is bound to the organization as its `controls` item manager. This runs as the `'load org controls'` setup method, which declares a dependency on `'load orgs'` so organization data is available first.

### UC2: List the controls loaded for a known organization

- **Actor:** An HTTP client (human operator or another tool) that knows the target organization's key.
- **Action:** Sends `GET /orgs/<orgKey>/controls/list`.
- **Outcome:** The server responds with the list of controls loaded for that organization (name, source, description, controls), formatted per the request's negotiated output format (JSON, Markdown, plain text, or terminal). A request for an organization key the server has no data for is rejected with `404 Not Found`.

### UC3: List controls for the organization implied by the caller's working directory

- **Actor:** A CLI tool or script invoked from within a project checkout, without knowing the organization key up front.
- **Action:** Sends `GET /orgs/controls/list` with an `X-CWD` header naming the caller's working directory.
- **Outcome:** The server determines the organization key from the package at that working directory (via its npm scope, or a `package.json` override — see [UC4](#uc4-retrieve-a-named-control-set-programmatically-as-a-consuming-plugin)) and returns that organization's control list, in the same shape as [UC2](#uc2-list-the-controls-loaded-for-a-known-organization). A request missing the `X-CWD` header is rejected with `400 Bad Request`.

### UC4: Retrieve a named control set programmatically as a consuming plugin

- **Actor:** Another plugable-express plugin (for example, a compliance or policy-enforcement tool) loaded into the same host server.
- **Action:** Calls the `getQuestionControls` integration hook `liq-controls` registers, passing `{ app, controlsName, projectName, reporter }`.
- **Outcome:** The hook resolves the control set in this order and returns the first match:
  1. A project-level override file at `<projectPath>/controls/<controlsName>.qcontrols.yaml`, if present.
  2. Failing that, the organization-level control whose id starts with `<controlsName>/` (looked up via `org.controls.getControl(controlsName)`), where the organization key is taken from `package.json:_comply.orgKey` if set, else derived from the project's npm scope.

  If neither is found, the hook logs a message identifying the missing control and the paths it checked, and returns `undefined`. Multiple org-level matches for the same control name is a configuration error and raises an exception rather than resolving ambiguously.

### UC5: Author organization-level policy controls

- **Actor:** An organization administrator or policy author.
- **Action:** Writes one or more `*.qcontrols.yaml` files under `data/org/controls/` in the organization's project directory, each defining a control set (`id`, optional `description`, optional `depends`, and one or more `controls`, each with a `name`, `description`, and an ordered list of `actions` — see [API definition](#api-definition) for the action shapes).
- **Outcome:** On the next server setup (or organization reload), the new or changed control set is loaded and becomes available through [UC1](#uc1-load-an-organizations-policy-controls-at-server-setup)–[UC4](#uc4-retrieve-a-named-control-set-programmatically-as-a-consuming-plugin).

## General features

- **Per-organization isolation.** Controls are loaded and looked up per organization; one organization's control definitions never leak into another's list or lookup results.
- **Duplicate-control detection.** A control-type lookup (`getControl`) that matches more than one loaded control for the same type is treated as a configuration error and raises an exception rather than silently picking one.
- **Consistent, format-negotiated HTTP output.** Both list endpoints share one formatting code path (`doListControls` / `formatOutput`) supporting JSON, Markdown, plain text, and terminal-styled output, so the two endpoints stay behaviorally identical apart from how the organization key is determined.
- **Setup-time ordering.** The plugin's two setup contributions declare their dependencies explicitly — `'load org controls'` depends on `'load orgs'`; `'load controls integrations'` depends on `'setup integrations'` — so `liq-controls` never runs before the organization or integration data it needs is ready.
- **Cross-plugin discoverability.** The `getQuestionControls` hook is registered under the `'controls'` provider name in the host server's integration registry (`providerFor: 'controls'`, `providerTest: () => true`), so any other loaded plugin can discover and call it without a direct dependency on `liq-controls`'s internals.
- **Dependency on org and project context.** `liq-controls` does not resolve organizations or projects itself; it relies on `@liquid-labs/liq-orgs` for organization data and `@liquid-labs/liq-projects` for project/playground resolution (both declared as plugin dependencies in `plugable-express.yaml`).

## API definition

`liq-controls`'s external surface is small enough to define inline; there is no separate API reference document.

### HTTP endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/orgs/:orgKey/controls/list` | List controls loaded for the named organization. Standard output-format query parameters apply (JSON/Markdown/text/terminal). Returns `404` if `orgKey` is not a loaded organization. |
| `GET` | `/orgs/controls/list` | List controls for the organization implied by the `X-CWD` request header. Returns `400` if `X-CWD` is missing. |

### Integration hook

| Hook | Registered as | Signature | Behavior |
|------|----------------|-----------|----------|
| `getQuestionControls` | Provider for `'controls'` in the host's integration registry | `({ app, controlsName, projectName, reporter }) => Promise<controlsSpec \| undefined>` | Resolves a named control set per the precedence in [UC4](#uc4-retrieve-a-named-control-set-programmatically-as-a-consuming-plugin): project-level override file, then organization-level control, then `undefined`. |

### Setup contributions

`liq-controls` registers two setup methods with the host server's setup pipeline (not directly callable, but part of the plugin's committed behavior):

| Setup method name | Depends on | Effect |
|--------------------|-----------|--------|
| `load org controls` | `load orgs` | Loads each organization's `*.qcontrols.yaml` files into a bound `controls` item manager (see [UC1](#uc1-load-an-organizations-policy-controls-at-server-setup)). |
| `load controls integrations` | `setup integrations` | Registers the `getQuestionControls` integration hook (see [UC4](#uc4-retrieve-a-named-control-set-programmatically-as-a-consuming-plugin)). |

### Control-set file format (`*.qcontrols.yaml`)

Every control-set file must conform to the control-set schema shipped at `src/schema/audit.schema.json` (published as `dist/audit.schema.json`). This schema is a structural reference for authors and tooling — `liq-controls` does not validate loaded files against it at load time; a malformed file that is still valid YAML loads without a schema-conformance check.

- **Top level:** `id` (required, the control set's unique name), `description` (optional), `depends` (optional, an array of other control-set ids this one builds on), `controls` (required, an array of control definitions).
- **Each control:** `name` (required), `description` (required), and `actions` (an ordered array of steps making up the control). A control's identity, once loaded, is normalized to `<name>/<source>`, and `getControl(controlType)` matches by `<controlType>/` prefix.
- **Each action is exactly one of:**
  - a **question** — `prompt` (the text to present) and `parameter` (the variable the answer is bound to);
  - a **mapping** — `maps`, an array of `{ parameter, source | value }` entries that derive parameter values from existing ones;
  - a **statement** — `statement`, text to display with no answer collected;
  - a **review** — `review`, either `"all"` or `"questions"`, marking a review checkpoint over prior answers.

  This action vocabulary is the plugin's policy-evaluation *model* — the shape a consumer must understand to walk a control's actions — but `liq-controls` itself only stores and serves this structure; executing the walk (prompting, collecting, mapping, reviewing) is the consumer's responsibility, per [Non-goals](#non-goals).

## Constraints and assumptions

- Requires a host `@liquid-labs/plugable-express` server with `@liquid-labs/liq-orgs` and `@liquid-labs/liq-projects` loaded as sibling plugins (declared as dependencies in `plugable-express.yaml`); `liq-controls` does not function standalone.
- Organization control files are read from a fixed, convention-based location: `data/org/controls/*.qcontrols.yaml` under each organization's project directory. There is no configuration point to relocate this path.
- Requires Node.js 18 or later (per `package.json` `engines`).
- Authentication and authorization for the HTTP endpoints are provided by the host plugable-express server; `liq-controls` implements no access control of its own.
- This project is expected to eventually be folded into a consolidated `core-server` package as part of a broader, currently-in-progress plan; as of this document, that has not happened and `liq-controls` is developed, versioned, and loaded as an independent plugin.

## Non-goals

- **Evaluating controls.** `liq-controls` does not prompt for or collect answers, does not execute `maps`/`statement`/`review` actions, and does not compute a pass/fail or compliance result. It defines and serves control structures; a consuming tool performs evaluation.
- **Enforcing policy outcomes.** There is no gating, blocking, or approval logic in this plugin — it has no concept of an evaluation "result" to enforce against.
- **Recording audit trails.** `liq-controls` does not persist evaluation history, answers, or outcomes anywhere; the `audit.schema.json` name refers to the schema's original context (control sets used for compliance audits), not to any audit-logging behavior this plugin implements.
- **Validating control files against the schema at load time.** The schema at `src/schema/audit.schema.json` is shipped for external/tooling use; `liq-controls`'s own loader does not check loaded YAML against it.

## Pointers to deeper docs

- [`README.md`](../README.md) — project pitch, installation, and quick usage.
- [`AGENTS.md`](../AGENTS.md) — build, test, and contributor conventions.
- [`docs/project-structure.md`](./project-structure.md) — repository layout reference.
- `docs/architecture.md` *(not yet written)* — design and internal structure, once authored.
