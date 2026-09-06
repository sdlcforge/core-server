# Union Runtime Dependencies

## Purpose and scope

Apply the measured runtime-`dependencies` union to `core-server`'s `package.json`, regenerate `bun.lock` the Bun way as its own separately-reviewed commit, and write the durable record of the union's decisions to `plan/resources/`.

The union is **measured, not derived**: [`notes/dependency-union.md`](../notes/dependency-union.md) resolved all 32 rows against the live checkouts, the live `bun.lock`, the installed `node_modules` trees, and the npm registry. This task transcribes that table and verifies the transcription; it does not recompute `max()` on any range. Two mechanical traps make a from-scratch recomputation unsafe, and both are already handled in the table below.

Out of scope: removing `@sdlcforge/dev-core` from anywhere (Phase 3, atomically with the `explicitPlugins` removal), the `plugable` manifest block (Phase 3), and devDependencies (the recipe unions runtime dependencies only).

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### The dependency block is 33 entries during this phase, not 32

The union is 32 names **after dropping `@sdlcforge/dev-core`** — but this task does not drop it. `@sdlcforge/dev-core` is still an explicit npm plugin at this point: `src/lib/app-init.mjs`'s `explicitPlugins` array and `package.json`'s `plugable.host.explicitPlugins` both still name it, and nothing in-tree yet provides its 112 routes. Removing the dependency here would break plugin loading at startup while leaving the two declarations pointing at a package that is no longer installed.

So the block this task lands has **33 entries**: the 32-row union plus the transient `@sdlcforge/dev-core` row. Phase 3 removes it in all three places at once (`package.json` dependency, `package.json` manifest `explicitPlugins`, `src/lib/app-init.mjs`'s runtime array).

### The exact resulting `dependencies` block

Replace the whole `dependencies` object with this, verbatim (npm/Bun sort order — `@liquid-labs/*`, then `@sdlcforge/*`, then unscoped):

```json
  "dependencies": {
    "@liquid-labs/comply-defaults": "^1.0.0-alpha.8",
    "@liquid-labs/condition-eval": "^1.0.0-alpha.17",
    "@liquid-labs/credentials-db-plugin-github": "^1.0.0-alpha.5",
    "@liquid-labs/dependency-runner": "^1.0.0-alpha.8",
    "@liquid-labs/federated-json": "^1.0.0-alpha.34",
    "@liquid-labs/find-plus": "^1.0.1",
    "@liquid-labs/git-toolkit": "^1.0.0-alpha.16",
    "@liquid-labs/github-toolkit": "^1.0.0-alpha.25",
    "@liquid-labs/http-smart-response": "^1.0.0-alpha.6",
    "@liquid-labs/liq-credentials-db": "^1.0.0-alpha.9",
    "@liquid-labs/liq-handlers-lib": "^1.0.0-alpha.17",
    "@liquid-labs/liq-qa-lib": "^1.0.0-alpha.9",
    "@liquid-labs/npm-toolkit": "^1.0.0-alpha.21",
    "@liquid-labs/octocache": "^1.0.0-alpha.4",
    "@liquid-labs/playground-monitor": "^1.0.0-beta.4",
    "@liquid-labs/plugable-defaults": "^1.0.0-alpha.4",
    "@liquid-labs/plugable-express": "file:.yalc/@liquid-labs/plugable-express",
    "@liquid-labs/resource-item": "^1.0.0-alpha.4",
    "@liquid-labs/resource-model": "^1.0.0-alpha.10",
    "@liquid-labs/sdlc-projects-badges-coverage": "^1.0.0-alpha.2",
    "@liquid-labs/sdlc-projects-badges-github-workflows": "^1.0.0-alpha.2",
    "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd": "^1.0.0-alpha.2",
    "@liquid-labs/sdlc-projects-workflow-local-node-build": "^1.0.0-alpha.7",
    "@liquid-labs/semver-plus": "^1.0.0-alpha.11",
    "@liquid-labs/shell-toolkit": "^1.0.0-alpha.10",
    "@liquid-labs/versioning": "^1.0.0-alpha.4",
    "@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core",
    "highlight.js": "^11.9.0",
    "http-errors": "^2.0.0",
    "js-yaml": "^4.1.0",
    "natural-sort": "^1.0.0",
    "npm-check-plus": "^1.0.0-alpha.5",
    "shelljs": "^0.8.5"
  },
```

Change nothing else in `package.json` — not `devDependencies`, not `_comply`, not `plugable`, not `scripts`.

### What each row is, and why

Six ranges move up, one `core-server` already wins and must be kept at its own higher floor, five are identical, eleven are new, and nine are `core-server`-only and unchanged.

| Dependency | `core-server` before | dev-core | Result | Move |
|---|---|---|---|---|
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.16` | `^1.0.0-alpha.16` | up |
| `@liquid-labs/github-toolkit` | `^1.0.0-alpha.16` | `^1.0.0-alpha.25` | `^1.0.0-alpha.25` | up |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.16` | `^1.0.0-alpha.17` | `^1.0.0-alpha.17` | up |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.8` | `^1.0.0-alpha.9` | `^1.0.0-alpha.9` | up |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.15` | `^1.0.0-alpha.21` | `^1.0.0-alpha.21` | up |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.7` | `^1.0.0-alpha.10` | `^1.0.0-alpha.10` | up |
| `@liquid-labs/liq-credentials-db` | `^1.0.0-alpha.9` | `^1.0.0-alpha.7` | `^1.0.0-alpha.9` | ours wins |
| `@liquid-labs/http-smart-response` | `^1.0.0-alpha.6` | same | unchanged | tie |
| `@liquid-labs/octocache` | `^1.0.0-alpha.4` | same | unchanged | tie |
| `@liquid-labs/resource-model` | `^1.0.0-alpha.10` | same | unchanged | tie |
| `http-errors` | `^2.0.0` | same | unchanged | tie |
| `js-yaml` | `^4.1.0` | same | unchanged | tie |

The eleven additions are `@liquid-labs/{condition-eval, credentials-db-plugin-github, dependency-runner, federated-json, playground-monitor, plugable-defaults, semver-plus}`, `highlight.js`, `natural-sort`, `npm-check-plus`, and `shelljs`. Every one is load-bearing for arriving source — the undeclared-bare-specifier sweep found dev-core's 23 declared runtime dependencies map one-to-one onto its actual imports, with no undeclared imports and no declared-but-unimported entries.

Two traps, both already resolved in the table:

- **Prerelease identifiers compare numerically, not lexically.** `@liquid-labs/shell-toolkit` is the one row a naive string comparison inverts (`"^1.0.0-alpha.7" > "^1.0.0-alpha.10"` lexically). A string-sorted union produces eleven correct rows and one wrong one.
- **A caret on a prerelease is far wider than it looks.** `^1.0.0-alpha.15` expands to `>=1.0.0-alpha.15 <2.0.0-0`, which admits `1.0.0-alpha.25` and even `1.0.0-beta.4`.

The six upward moves are low-risk, and that was measured rather than argued: because dev-core is already consumed through a `file:` yalc link, `bun.lock` already resolves all six at or above the higher floor today. The union changes the declaration and introduces **zero** new resolved versions. An exhaustive symbol-by-symbol check of all 18 bare specifiers in `core-server/src/` against the packages actually installed for them produced exactly one failure, and Phase 1 has already fixed it (`src/controls/handlers/orgs/controls/list-implied.mjs`, `getPackageOrgAndBasename` → `await getPackageOrgBasenameAndVersion`).

### The `_npm-check-plus` block: rewrite or drop, never copy

dev-core's `package.json` carries a tooling-config block that did **not** arrive (its `package.json` was resolved `--ours`):

```json
"_npm-check-plus": {
  "depcheck": { "ignoreMatches": ["@liquid-labs/sdlc-resource-*"] }
}
```

Carried across verbatim it is inert: it suppresses depcheck false positives for `@liquid-labs/sdlc-resource-*` packages `core-server` does not have, while leaving `core-server`'s actual `@liquid-labs/catalyst-resource-{babel-and-rollup,eslint,jest}` devDependencies unsuppressed. Either add it with the glob rewritten to `@liquid-labs/catalyst-resource-*`, or deliberately do not add it. **Recommended: do not add it.** `core-server` has never carried the block, `npm-check-plus` is here as a runtime dependency of `src/projects-audit/handlers/_lib/{audit-lib,audit-fix-lib}.mjs` rather than as a build tool, and nothing in `core-server`'s toolchain runs depcheck. Whichever is chosen, record the choice in the record document.

### The lockfile refresh is its own commit

Under Bun, a bare `bun install` does not re-resolve a linked package's transitive dependency list once `bun.lock` holds a resolved `file:` entry. Never `npm install`; never the recipe's literal `package-lock.json` step.

```bash
scripts/provision-local-deps.sh --refresh-lock
```

(equivalently `rm -f bun.lock && bun install` once `.yalc/` is present — the script copies `.yalc/` in from the main checkout, which a fresh worktree lacks, then removes `bun.lock` and installs).

Read the resulting `bun.lock` diff deliberately. It floats roughly 20 caret-on-prerelease ranges, a far wider blast radius than the union it serves. One drift is known and already cleared as safe: `@liquid-labs/plugable-defaults` moves from `1.0.0-alpha.4` on disk to `1.0.0-alpha.7`; both versions export `PLUGABLE_CLI_SETTINGS_PATH` and `PLUGABLE_PLAYGROUND`, and the absorbed code uses only `PLUGABLE_PLAYGROUND` (`src/work/handlers/resume.mjs:7`, `src/projects/_lib/remove-lib.mjs:7`, `src/work/handlers/_lib/pause-lib.mjs:7`, `src/work/handlers/_lib/work-db.mjs:14`). Every other union member's registry latest already equals what `bun.lock` resolves. Any *other* version change in the diff is a new fact: name it in the report with the package, the before/after versions, and whether the symbols the merged tree imports from it still exist.

`finalize-task-commit.sh`'s yalc-override guard refuses to commit `bun.lock` in this repository, because `bun.lock` permanently carries `file:.yalc/…` entries by design here (followups `Z2Ar`, `xsRt`, `K3cL`). The accepted pattern is a documented manual `git add bun.lock && git commit`. Expect to need it; say so in the report.

### Do not apply the `file:` gate literally

The consolidation contract says to verify `grep -n 'file:' package.json` returns nothing. That is **wrong for `core-server`**. The correct expectation at the end of this task is **exactly two** hits:

- `@liquid-labs/plugable-express` — a pre-existing yalc link, `core-server`'s documented local-development mechanism, permanent, neither created nor touched by this plan.
- `@sdlcforge/dev-core` — transient, removed in Phase 3.

Anyone treating this as a "zero `file:` hits" gate will try to "fix" a mechanism the project depends on.

### The record document

Write `plan/resources/dev-core-absorption-dependency-union.md`, modelled on the predecessor absorption's [`plan/resources/absorption-dependency-union.md`](../resources/absorption-dependency-union.md) (same repository, one absorption earlier). It is the durable record, outliving this plan's `plan/notes/`. It must contain:

1. The full 32-row resolved table with the before/after range for every row and the `up` / `ours wins` / `tie` / `new` classification.
2. The measured justification for the six upward moves — that today's `bun.lock` already resolves all six at or above the new floor, so the union introduces zero new resolved versions.
3. The `_npm-check-plus` decision and its reason.
4. The `bun.lock` refresh outcome: what actually changed, with the `plugable-defaults` alpha.4 → alpha.7 move called out as pre-cleared, and any other drift named.
5. Anything deliberately **not** carried across, and why — at minimum the `_npm-check-plus` block (if dropped), dev-core's devDependencies (out of the recipe's scope; `core-server` keeps its `catalyst-resource-*` toolchain wholesale), and the `@sdlcforge/dev-core` row, which is retained here only until Phase 3.
6. The `file:` expectation, stated as two entries and why, so the next reader does not re-litigate it.
7. The inherited liability: `shelljs` is the subject of wave-plan followup `hwbY` — found incompatible with bundled Bun output during the `sdlcpilot-cli` single-binary spike and recommended for replacement with `node:child_process` before the downstream `cli-mcp-binary-generation` plan-group. Absorbing dev-core moves that liability into `core-server`. Out of scope to fix; recorded so it is not rediscovered.

## Validation

1. `jq -r '.dependencies | keys | length' package.json` is **33**, and `jq -r '.dependencies | keys[]' package.json` matches the 33 names in the block above exactly (`diff` the two lists rather than eyeballing).
2. Every range matches the block above:

   ```bash
   jq -r '.dependencies | to_entries[] | "\(.key)=\(.value)"' package.json | sort
   ```

   Compare against the block. Pay particular attention to `@liquid-labs/shell-toolkit` = `^1.0.0-alpha.10` (not `alpha.7`) and `@liquid-labs/liq-credentials-db` = `^1.0.0-alpha.9` (not dev-core's `alpha.7`).
3. `git diff HEAD~ -- package.json` (the union commit) touches only the `dependencies` object — plus the `_npm-check-plus` block if it was deliberately added. `jq -S '.plugable' package.json` and `jq -S '.devDependencies' package.json` are unchanged from the pre-task values.
4. `grep -n 'file:' package.json` returns **exactly two** lines: `@liquid-labs/plugable-express` and `@sdlcforge/dev-core`. Not zero, not one, not three.
5. `jq empty package.json` exits 0 (valid JSON).
6. `scripts/provision-local-deps.sh --refresh-lock` completed; `bun.lock` is regenerated and committed as its own commit, separate from the `package.json` commit. `git log --oneline -3` shows the two (or three) distinct commits.
7. The `bun.lock` diff was read and summarized in the report: every changed resolved version is named, with `@liquid-labs/plugable-defaults` `1.0.0-alpha.4` → `1.0.0-alpha.7` expected and pre-cleared, and any additional drift accompanied by a symbol-availability check against the importing site.
8. All eleven newly-direct packages resolve after the install:

   ```bash
   for p in @liquid-labs/condition-eval @liquid-labs/credentials-db-plugin-github \
            @liquid-labs/dependency-runner @liquid-labs/federated-json \
            @liquid-labs/playground-monitor @liquid-labs/plugable-defaults \
            @liquid-labs/semver-plus highlight.js natural-sort npm-check-plus shelljs; do
     v=$(node -e "console.log(require('./node_modules/$p/package.json').version)" 2>/dev/null) \
       && echo "OK   $p@$v" || echo "MISSING $p"
   done
   ```
9. `plan/resources/dev-core-absorption-dependency-union.md` exists, opens with `## Purpose and scope`, carries no frontmatter, and covers all seven required contents listed above.
10. `@sdlcforge/dev-core` is still present in `package.json`'s `dependencies`, in `package.json`'s `plugable.host.explicitPlugins`, and in `src/lib/app-init.mjs`'s `explicitPlugins` array. This task removes it from none of the three.

## Checkpoint hints

- After the `package.json` union edit, verified against the table — commit as the union commit.
- After `scripts/provision-local-deps.sh --refresh-lock` and reading the diff — commit `bun.lock` alone (expect to need the manual `git add`/`git commit` workaround for the yalc-override guard).
- After writing `plan/resources/dev-core-absorption-dependency-union.md`.

## Assumptions

- Task 001 has landed on `main` and this task's branch is cut from it, so `src/{projects,orgs,work,projects-audit}/` are present and the eleven newly-direct packages have real import sites to justify them.
- Phase 1's `list-implied.mjs` fix has landed. Without it the refreshed install surfaces a live `getPackageOrgAndBasename is not a function` break in `src/controls/handlers/orgs/controls/list-implied.mjs` that this task would appear to have caused. If that fix is absent, halt and report rather than fixing it here — landing it inside the union commit is exactly what Phase 1 was ordered to prevent.
- `node_modules` is not provisioned in a fresh worktree; `.yalc/` and `yalc.lock` are gitignored. `scripts/provision-local-deps.sh` copies `.yalc/` in from the main checkout, so the main checkout must have it. If it does not, the script prints the `yalc push` instructions and halts — report that rather than improvising.
- `make test` may be red at the end of this task and that is not this task's gate. Task 004 owns the build/test/lint gate, and at least one absorbed suite (`src/projects/handlers/_lib/test/project-lifecycle.test.mjs`) is a known inherited failure.
- This task may run concurrently with task 002, which writes only `plan/followups.yaml` at the project root.

## References

- [`notes/dependency-union.md`](../notes/dependency-union.md) — the authority for every range, every classification, and the measurements behind the risk assessment. Its "Summary of things to act on" is this task's checklist.
- [`phases/absorb-dev-core.md`](../phases/absorb-dev-core.md) — goal 6 and the corresponding outputs.
- [`../resources/absorption-dependency-union.md`](../resources/absorption-dependency-union.md) — the predecessor absorption's record document; the shape to model.
- `CLAUDE.md` / `AGENTS.md` — the documented Bun refresh procedure and the yalc local-development mechanism.
- `scripts/provision-local-deps.sh` — its header comment explains `--refresh-lock` and the `.yalc/` copy-in behavior.
