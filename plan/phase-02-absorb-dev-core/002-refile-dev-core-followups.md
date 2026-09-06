# Refile Dev-Core Followups

## Purpose and scope

Task 001 resolved `plan/followups.yaml` `--ours`, which is mechanically correct and drops **22 live `@sdlcforge/dev-core` followups** — at least seven of them defects in code `core-server` now owns, including command injection in the `work` and `projects` shell-outs. This task triages all 22 against the merged tree and re-files the survivors into `core-server`'s registry through the followups MCP tool.

Scope is `plan/followups.yaml` at the `core-server` project root and nothing else. No source file is touched, no defect is fixed, and no dev-core file is read from the merged tree that could not equally be read from `dev-core-source/main`. This is a triage-and-transcribe task, not a remediation task.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

The judgment this task needs is "does this item still describe live code or documentation that `@sdlcforge/core-server` now owns?" — which requires reading the JavaScript the items point at.

### Mechanics, and why this task has no branch

`plan/followups.yaml` is written **only at the project root** (`/Users/zane/playground/sdlcforge/core-server`), never on a plan or task branch, through the `followups_add` / `followups_list` MCP commands, which commit each mutation to git themselves. See the [Project Plan Document Standards](flow-mcp:d) sections on `plan/followups.yaml` and its programmatic interface.

Consequences the implementer must honor:

- Do **not** hand-edit `plan/followups.yaml`, and do **not** merge YAML from either side of the conflict.
- Do **not** create a task worktree branch for this work, and do not expect a branch/commit/merge triple to report — the MCP tool's own commits at the project root are the whole output.
- IDs are **server-generated**. The re-filed items get new 4-character IDs; the donor IDs are preserved as provenance inside each item's `text`, which is what makes the phase's by-name verification possible.

Each added item carries, per the standards: a `title` of 45 characters or fewer, a `text` that references documentation and code (file paths, symbols, behavior) and never plan/phase/task names, and `tags` including a mandatory `type:` value from `{bug, security, optimization, style, documentation, enhancement, conflict, ambiguity}`. `priority` and `effort` are left at `unspecified` for the manager's triage pass. Add `plan/slug:sdlc-core-unification` and `plan/phase:absorb-dev-core` as provenance.

### Preserve the text, add the provenance

Each donor item's `text` already reads as a code-referencing description with concrete file paths and symbols — it is directly reusable. Carry it across **substantially verbatim**, with two mechanical edits:

1. Strip references to dev-core's own plan/phase/task machinery ("during this session's dev-core-consolidation absorption (phase 2 task 002)", "phase 8 gate", "task 007's report"), which the standards bar from `text` and which name torn-down artifacts. Keep the substantive evidence those clauses carried (commit SHAs, the "predates this consolidation" finding).
2. Rewrite path prefixes if the merge moved them. It did **not**: dev-core's `main` already carried `src/{projects,orgs,work,projects-audit}/…`, so every path in these items is valid verbatim in the merged tree. Verify a sample rather than assuming.

Append a provenance sentence to each carried item, in this shape:

```text
Originally filed against @sdlcforge/dev-core as followup AhMK; carried across when
that package was absorbed into @sdlcforge/core-server.
```

### The 22-item roster and its recommended dispositions

Read the donor registry directly:

```bash
git -C /Users/zane/playground/sdlcforge/core-server show dev-core-source/main:plan/followups.yaml
```

(or `git -C /Users/zane/playground/sdlcforge/dev-core show main:plan/followups.yaml` — identical content.) There are exactly 22 items and **no ID collisions** with `core-server`'s 30.

**Carry across (16).** The seven the phase document names by name are marked ★ and are non-negotiable:

| Donor ID | Title | Why it survives | `type` |
|---|---|---|---|
| ★ `AhMK` | Command injection risk in work shell-outs | 7 shell-string interpolation sites across `src/work/handlers/…`, now core-server's | `security` |
| ★ `g23a` | Command injection risk in projects shell-outs | 4 sites across `src/projects/handlers/…`, now core-server's | `security` |
| ★ `bTGn` | Fix inherited projects-audit defects | 4 defects + dead code in `src/projects-audit/`; fixing (1) or (2) changes the API spec | `bug` |
| ★ `X7IU` | parameters-set setUndefined/setNull error | `src/orgs/handlers/parameters-set.mjs` vs `src/orgs/resources/lib/settings.mjs` | `bug` |
| ★ `ZkAv` | orgs create.mjs creates directory only | `src/orgs/handlers/create.mjs` | `bug` |
| ★ `2Zug` | orgs list.mjs mdFormatter field mismatch | `src/orgs/handlers/list.mjs` | `bug` |
| ★ `Jbaz` | parameters-list.mjs mdFormatter arg shape | `src/orgs/handlers/parameters-list.mjs` | `bug` |
| `2aMD` | project-lifecycle test pre-existing failure | `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` — **the suite that will fail in task 004's gate**; also records the never-collected `src/projects/handlers/test/close-implied.mjs` | `bug` |
| `OmUC` | providerFor typo breaks pull-request hook | `src/work/handlers/_lib/answer-set-to-md.mjs:74` — live, reachable defect | `bug` |
| `Ymcf` | resource-model Model.save() always rejects | upstream `@liquid-labs/resource-model`; `src/orgs/resources/organization.mjs` carries the workaround | `bug` |
| `Hwdp` | create.mjs response discloses abs path | `src/orgs/handlers/create.mjs` response `directory` field | `security` |
| `pWxw` | octocache/octokit chain high-sev advisory | `@liquid-labs/octocache` is a core-server runtime dependency before and after the union | `security` |
| `7ZF2` | condition-eval Function() eval pattern | `@liquid-labs/condition-eval` joins the union; called from `src/work/` | `security` |
| `xehM` | get-org.mjs comment names retired helper | `src/orgs/handlers/get-org.mjs` doc comment naming `getOrgFromKey` | `documentation` |
| `hks9` | consumer-migration.md framing is stale | `docs/consumer-migration.md`, kept through this phase, disposition in `doc-updates` | `documentation` |
| `dsdl` | consolidation-contract.md:128 stale attribution | `docs/dev-core-consolidation-contract.md`, same | `documentation` |

Rewrite `hks9`'s and `dsdl`'s text so each stands alone against the file it names — both were written as asides inside a larger dev-core task and read as fragments otherwise. Note in each that the file's own survival is decided in the `doc-updates` phase, so the item may become moot.

**Drop deliberately (5).** Name each drop and its reason in the task report; a silent drop is indistinguishable from an oversight:

| Donor ID | Title | Why it does not survive |
|---|---|---|
| `AEsA` | sdlc-resource-babel-and-rollup is deprecated | Scoped to dev-core's own build. `core-server` builds under the `@liquid-labs/catalyst-resource-*` family and declares no `@liquid-labs/sdlc-resource-*` devDependency. |
| `0eWj` | README line 22 also slightly stale | Describes dev-core's `README.md`, which was resolved `--ours` and does not exist in the merged tree. |
| `IxJv` | Absorb task-doc template needs updates | Lessons for dev-core's own consolidation plan, which has closed. Its warnings about `git rm -r plan/` are already folded into task 001. |
| `x6x1` | core-server plugin-graph-gate allowlist | Phase 1 already trimmed `ALLOWLISTED_ERROR_FINDINGS` from two entries to one, which is exactly what this item asked for. **Verify that before dropping** — see Validation. |
| `JFTT` | Auto-filed followup tagging pattern | An observation about Flow's `apply-task-report` tagging behavior, not about `core-server` code or docs. Barred from `text` by the standards' code-and-docs-only rule. |

**Needs a judgment call (1).**

`0RpG` — "serialize-javascript RCE via terser pin" (GHSA-5c6j-r48x-rmvq, CVSS 8.1) is rooted in `@rollup/plugin-terser` reached through dev-core's pinned `@liquid-labs/sdlc-resource-babel-and-rollup@1.0.0-alpha.5`, a devDependency `core-server` does not have. Determine whether `core-server`'s own `@liquid-labs/catalyst-resource-babel-and-rollup` reaches the same `serialize-javascript` version:

```bash
cd /Users/zane/playground/sdlcforge/core-server
grep -n 'serialize-javascript\|@rollup/plugin-terser' bun.lock
```

If it does, carry the item across **reworded against `core-server`'s actual devDependency chain** (`type:security`) rather than dev-core's. If it does not, drop it and say so. Either outcome is acceptable; an unrecorded one is not.

## Validation

1. `followups_list` against `/Users/zane/playground/sdlcforge/core-server` returns `core-server`'s 30 pre-existing items plus exactly the number of items this task carried across (16, or 17 if `0RpG` was carried). No pre-existing item was modified or removed.
2. All seven named items are present by donor ID:

   ```bash
   for id in AhMK g23a bTGn X7IU ZkAv 2Zug Jbaz; do
     grep -qF "$id" /Users/zane/playground/sdlcforge/core-server/plan/followups.yaml \
       && echo "OK   $id" || echo "MISSING $id"
   done
   ```

   All seven print `OK`.
3. Every added item carries a `type:` tag from the closed core vocabulary, `priority:unspecified`, `effort:unspecified`, `plan/slug:sdlc-core-unification`, and `plan/phase:absorb-dev-core`; every `title` is 45 characters or fewer.
4. No added item's `text` names a plan, phase, task, review lens, or gate — `grep -niE 'phase [0-9]|task [0-9]{3}|dev-core-consolidation|gate\)|review lens'` over the added items returns nothing.
5. Every code path named in an added item resolves in the merged tree:

   ```bash
   cd /Users/zane/playground/sdlcforge/core-server
   for f in src/work/handlers/_lib/answer-set-to-md.mjs src/orgs/handlers/create.mjs \
            src/orgs/handlers/list.mjs src/orgs/handlers/parameters-set.mjs \
            src/orgs/handlers/parameters-list.mjs src/orgs/handlers/get-org.mjs \
            src/orgs/resources/organization.mjs \
            src/projects/handlers/_lib/test/project-lifecycle.test.mjs \
            src/projects/handlers/_lib/create-lib.mjs src/work/handlers/_lib/work-db.mjs; do
     [ -f "$f" ] && echo "OK   $f" || echo "MISSING $f"
   done
   ```
6. Before dropping `x6x1`, confirm Phase 1's trim actually landed: `src/lib/test/plugin-graph-gate.test.js`'s `ALLOWLISTED_ERROR_FINDINGS` holds exactly one entry, the surviving `violated-by-source-order` / `appExt:_liqOrgs.orgs` / `@sdlcforge/core-server#controls` one. If it still holds two, carry `x6x1` across instead of dropping it and flag the discrepancy.
7. `plan/followups.yaml` at the project root is committed by the MCP tool's own commits; `git -C /Users/zane/playground/sdlcforge/core-server status --porcelain plan/followups.yaml` is empty.
8. The task report lists, per donor ID, the disposition (carried with new ID / dropped with reason), covering all 22.

## Assumptions

- Task 001 has landed on `main`, so the absorbed source is present for the path checks in Validation item 5. The followup *content* does not depend on the merge — it is read from `dev-core-source/main` — but the "does this describe code core-server now owns?" judgment does.
- Running concurrently with task 003 is safe: this task writes only `plan/followups.yaml` at the project root, while task 003 writes `package.json`, `bun.lock`, and `plan/resources/` on a task branch. The file sets are disjoint, and the project-root-only write rule keeps `plan/followups.yaml` off every branch.
- `2aMD` describes a suite that is expected to be red after the merge. Carrying it across is the point — it is task 004's evidence that the failure is inherited rather than merge-induced.

## References

- [`phases/absorb-dev-core.md`](../phases/absorb-dev-core.md) — goal 3, and the plan-level risk note that dropping these items is a silent loss rather than a courtesy.
- [`notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md) — the `plan/followups.yaml` conflict row and the "22 dev-core followups arrive with no home" observation.
- [Project Plan Document Standards](flow-mcp:d) — the `plan/followups.yaml` schema, the tag grammar and qualifier registry, the code-and-docs-only `text` rule, and the project-root-only write rule.
- [`../overview.md`](../overview.md) — the plan's risk notes.
