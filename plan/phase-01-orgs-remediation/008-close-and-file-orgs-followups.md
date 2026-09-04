# Close And File Orgs Follow-Ups

## Purpose and scope

Reconcile `plan/followups.yaml` with what this phase actually landed: close the two follow-ups this plan resolves, file the cross-project follow-up that tells `@sdlcforge/core-server`'s maintainer what dev-core's manifest change did to their gate, and file the deferred-scope items tasks 002-005 surfaced.

This task edits no source and no documentation. It runs last in the phase.

**All mutations go through the flow-mcp MCP tools — `followups_list`, `followups_remove`, `followups_add` — against `project_root` `/Users/zane/playground/sdlcforge/dev-core`.** `plan/followups.yaml` is written only at the project root, never on a branch, and each mutating command commits the change itself. Do not hand-edit the file. If those tools are unavailable in this dispatch, make no edit and instead return the complete intended set of removals and additions in the task report for the manager to apply — that is a successful outcome for this task, not a failure.

## Requirements

### 1. Close the resolved follow-ups

Remove these two items from `plan/followups.yaml`:

- **`jY7C`** — "Fix dead 'orgs' submodule endpoints". Resolved by tasks 002, 003, 004, and 005. Before removing, confirm against the landed code that all five endpoints are fixed and covered by tests; `jY7C`'s own text makes "fixing this should include adding real tests" part of its definition of done.
- **`DGt0`** — "orgs create.mjs path traversal + proto risk". Sub-issue (a) resolved by task 005's containment validation; sub-issue (b) resolved by task 001 (the settings sink) and task 003 (the `parameterKey` regex). Note in the task report that (b) could **not** be closed by the "confirm `@liquid-labs/resource-model` already guards it" alternative the follow-up offered: `resource-model`'s `Model` class defines no `updateSetting` at all, and the vulnerable implementation is dev-core's own `src/orgs/resources/lib/settings.mjs:52-69`, so a real code change was required. `DGt0`'s own text misattributes `org.updateSetting` to `resource-model`; that misattribution is worth stating in the report so it is not repeated.

Do not remove an item whose work did not actually land. If any of tasks 001-005 was deferred or partially completed, leave the corresponding follow-up in place, patch its text to reflect the remaining scope, and say so in the report.

### 2. There is no `CNMB` in dev-core

The change request that produced this plan states that follow-up `CNMB` exists in dev-core's `plan/followups.yaml` and should be closed here. **It does not.** dev-core's file holds 13 items: `jY7C`, `AEsA`, `0RpG`, `0eWj`, `2aMD`, `g23a`, `pWxw`, `DGt0`, `IxJv`, `AhMK`, `7ZF2`, `bTGn`, `OmUC`. `CNMB` and `Pwdb` both belong to `@sdlcforge/core-server`'s `plan/followups.yaml`, raised by that project's `sdlc-plugin-manifest` plan.

Verify this with `followups_list` before doing anything. If `CNMB` is somehow present by the time this task runs, close it and report the discrepancy. If it is absent, as expected, record that in the task report — do not attempt to close a core-server item from here, and do not edit core-server.

### 3. File the cross-project follow-up

Add one item recording what dev-core's manifest change means for core-server's build gate. Required content:

- `@sdlcforge/core-server`'s `src/lib/test/plugin-graph-gate.test.js` declares `ALLOWLISTED_ERROR_FINDINGS` (lines 31-42) with two entries and asserts the live error-finding count equals that array's length (line 69).
- The first entry — `{ kind: 'unsatisfied', capabilityFull: 'appExt:_liqOrgs.orgSetupMethods', requirerNodeId: '@sdlcforge/dev-core#orgs' }` — no longer describes an error-severity finding, because `@sdlcforge/dev-core`'s `package.json` `plugable` block now declares that requirement `optional: true`, which the validator reports at `info`. The array should drop from two entries to one.
- The surviving entry — `{ kind: 'violated-by-source-order', capabilityFull: 'appExt:_liqOrgs.orgs', requirerNodeId: '@sdlcforge/core-server#controls' }` — stays. It is a known validator limitation, not a real defect: `core-server`'s `src/controls/setup.mjs` pushes its `load org controls` setup method with `deps: ['load orgs']`, so `DependencyRunner` guarantees the ordering that the raw source-order model flags as violated. It is tracked as core-server follow-up `Pwdb` and as `@liquid-labs/plugable-express` follow-up `dN2a`.
- The action belongs to core-server's own maintainer, in core-server's own plan. This item exists so the dev-core side has a durable record of the consequence it caused.

Tag `type:documentation`, and carry the `plan/slug:orgs-defects-remediation` and `plan/phase:phase-01-orgs-remediation` provenance qualifiers. Leave `priority` and `effort` at `unspecified` for the manager's triage pass.

Per the follow-up text rule, reference documentation and code — file paths, symbols, behavior — and do not lean on plan/phase/task names as the identifying handle, since this plan's tree is torn down at close-out.

### 4. File the deferred-scope follow-ups

Tasks 002-005 were instructed to record specific out-of-scope findings in their task reports. Read those reports and file one item for each that actually materialized. Expected candidates:

- **`@liquid-labs/resource-model`'s `Model.save()` is broken upstream.** `src/Model.mjs:74-80` destructures `errors` off an un-awaited `async validate()` call, so `errors.length` throws and every `save()` on a `Model` subclass rejects. dev-core works around it with an `Organization.save()` override; the upstream package is a separate project and unfixed. `type:bug`.
- **`POST /orgs/create/:newOrgKey` does not create a usable org resource.** It creates a directory; it writes no `org.json`/`settings.yaml`, constructs no `Organization`, and registers nothing into `app.ext._liqOrgs.orgs` (which is populated only by the `load orgs` setup method scanning the playground for a `package.json` carrying `liq.packageType === 'org'`). The handler's own `help.description` claims `org.json` is saved. `type:enhancement`.
- **`parameters-set`'s `setUndefined` parameter cannot work.** It yields `parsedValue === undefined`, which `checkValue` in `src/orgs/resources/lib/settings.mjs:1-18` rejects, so the documented parameter always errors. `type:bug`.
- **`src/orgs/handlers/list.mjs`'s `mdFormatter` renders `o.name` while `defaultFields` is `['key','commonName','legalName']`**, so the Markdown rendering disagrees with every other format. `type:bug`, low.

File only what the task reports actually confirm. Do not invent items, and do not file an item for anything a task already fixed.

### 5. Report, do not decide, on priority

Set `type` on each new item; leave `priority` and `effort` at `unspecified`. Triage is the manager's, per the follow-up schema's own rule.

## Validation

- `followups_list` against `/Users/zane/playground/sdlcforge/dev-core` shows `jY7C` and `DGt0` absent, and the new items present with a `type` tag and both provenance qualifiers.
- The item count reconciles: 13 initial − 2 closed + N added, with N enumerated in the task report.
- No item text names a plan, phase, or task as its identifying handle; each names files, symbols, or behavior.
- `git log -1 --stat` at the project root shows the follow-up commits the MCP tools made, touching only `plan/followups.yaml`.
- `git status` shows no modification anywhere under `sdlcforge/core-server` or `liquid-labs/`.
- If the MCP follow-up tools were unavailable, the task report contains the full removal and addition set, verbatim enough for the manager to apply without re-deriving it.

## Metadata

architectural_impact: false

## Assumptions

- Tasks 001-007 have all landed. This task's whole job is reconciliation; running it early produces a wrong reconciliation.
- `plan/followups.yaml` is written at the project root (`/Users/zane/playground/sdlcforge/dev-core`), not in the plan worktree, per the standards' write rule for this file.
- `type` values are drawn from the permanently-closed core set: `bug`, `security`, `optimization`, `style`, `documentation`, `enhancement`, `conflict`, `ambiguity`. Do not invent a new one; if none fits, flag it rather than improvising.

## References

- [manifest optional requirement](../notes/manifest-optional-requirement.md) — the core-server allowlist analysis and the `CNMB` reconciliation, with line citations.
- [orgs handler defect analysis](../notes/orgs-handler-defect-analysis.md) — the `Model.save()` upstream defect.
- [orgs security findings](../notes/orgs-security-findings.md) — the `DGt0` sub-issue (b) correction.
- [Project Plan Document Standards](flow-mcp:d) — the `plan/followups.yaml` schema, tag grammar, and the text rule.

## Procedure

1. `followups_list` and record the starting state.
2. Read tasks 001-007's reports.
3. Verify `jY7C` and `DGt0` are genuinely resolved, then `followups_remove` each.
4. Confirm `CNMB` is absent and record that.
5. `followups_add` the cross-project item, then each confirmed deferred-scope item.
6. `followups_list` again and reconcile the count.
