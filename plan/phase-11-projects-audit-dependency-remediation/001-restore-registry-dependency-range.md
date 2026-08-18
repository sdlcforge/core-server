# Restore Registry Dependency Range

## Purpose and scope

**Executes in the `plugable-projects-audit` repository** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`).

Replace the committed `file:.yalc/…` dependency spec for `@liquid-labs/http-smart-response` with the registry range it stands for, regenerate `package-lock.json`, and prove the package is green **from a fresh clone** — no `.yalc/` directory, no manual provisioning.

This is the gate for the whole slice. `.yalc/` is gitignored, so it is absent from every fresh clone and every Flow task worktree; without this fix, every later task in this slice runs `make test` in a tree where it cannot pass, and does so after an `npm install` that reported success.

Scope is exactly two files: `package.json` and `package-lock.json`. **No source file is touched.**

## Requirements

1. **Reproduce the defect first, so the fix is measured rather than assumed.** In a throwaway clone outside the repository (`git clone --no-hardlinks <repo> <tmpdir>`), run `npm install` and then `make test`. Record: that `npm install` **succeeds**, that `node_modules/@liquid-labs/http-smart-response` is a **dangling symlink** into `../../.yalc/@liquid-labs/http-smart-response`, that `make build` and `make lint` are **green**, and that `make test` **fails** with `Cannot find module '@liquid-labs/http-smart-response'`. If any of that does not reproduce, **halt and report** — the premise of this task has changed and the rest of the slice's sequencing depends on it.

2. **Capture the pre-change route baseline from the built bundle**, so requirement 6 has something real to compare against:

   ```bash
   node -e "const m=require('./dist/plugable-projects-audit.js');
     console.log(JSON.stringify(m.handlers.map(h=>({m:h.method,p:h.path,n:h.help.name,pa:h.parameters})),null,1))" > /tmp/ppa-routes-before.json
   ```

   Do this in the **main checkout** (where `.yalc/` exists and the package is green), not in the throwaway clone.

3. **Edit `package.json`: one value.** Change

   ```json
   "@liquid-labs/http-smart-response": "file:.yalc/@liquid-labs/http-smart-response"
   ```

   to

   ```json
   "@liquid-labs/http-smart-response": "^1.0.0-alpha.6"
   ```

   Change nothing else in the file — not the version, not the description, not the other three dependencies, not `_npm-check-plus`.

   **Why `^1.0.0-alpha.6` specifically, and why this is not a D11-forbidden upgrade:** the linked copy at `.yalc/@liquid-labs/http-smart-response/package.json` is version `1.0.0-alpha.6`; `npm view @liquid-labs/http-smart-response dist-tags` reports `latest: 1.0.0-alpha.6`; and `liq-projects` already declares exactly `^1.0.0-alpha.6`, which is what `@sdlcforge/dev-core` will carry. All three resolve to the identical published `1.0.0-alpha.6`. The resolved code does not change; only the resolution mechanism does. **Verify all three of those facts yourself** before writing the value — if the yalc copy is *not* `1.0.0-alpha.6`, or if the registry's `latest` is lower, halt and report rather than picking a range.

4. **Regenerate `package-lock.json`. This step is not optional and is the part that is easy to get wrong.** The existing lockfile carries

   ```json
   "node_modules/@liquid-labs/http-smart-response": { "resolved": ".yalc/@liquid-labs/http-smart-response", "link": true }
   ```

   plus a `.yalc/@liquid-labs/http-smart-response` package entry, and **a plain `npm install` after the `package.json` edit leaves both in place** — measured. The dangling symlink survives and `make test` still fails. Delete `node_modules/` and `package-lock.json`, then `npm install`.

5. **Do not create, populate, commit, or delete `.yalc/` or `yalc.lock`.** Both are gitignored working-tree state belonging to the user. `yalc.lock` will now be stale (it records `"replaced": "^1.0.0-alpha.4"`); leaving it alone is correct, and removing it is a user decision — note it in the report, do not act on it.

6. **Prove green from a fresh clone.** Clone the *committed* result into a fresh throwaway directory with no `.yalc/`, then `npm install && make build && make test && make lint`. All three gates must pass. This — not a run in the main checkout — is the acceptance test, because the main checkout has a `.yalc/` that masks the defect.

7. **Record the numbers in this task document's status notes**: the before/after `make test` result from a fresh clone, and the `npm install` warning delta.

## Validation

- **No `file:` spec and no `.yalc` reference survives in git.** All of these return nothing:
  - `git grep -n 'file:' -- package.json`
  - `git grep -n '\.yalc' -- package.json package-lock.json`
  - `python3 -c "import json;d=json.load(open('package-lock.json'));print([k for k,v in d['packages'].items() if v.get('link') or '.yalc' in str(v.get('resolved',''))])"` → `[]`
- **The dependency resolves to a real directory.** In a fresh clone after `npm install`: `test -d node_modules/@liquid-labs/http-smart-response && ! test -L node_modules/@liquid-labs/http-smart-response`, and `node -p "require('@liquid-labs/http-smart-response/package.json').version"` prints `1.0.0-alpha.6`.
- **Fresh-clone green, all three gates.** `make test` → **1 suite passed, 1 test passed**; `make lint` → clean; `make build` → `dist/plugable-projects-audit.js` produced. Per **C15** this donor is unaffected by the plan-group's Node-26 `SlowBuffer` failures, so the gate here is **green**, not "no new failures".
- **Route surface unchanged — the real behavioral check.** Rebuild in the fresh clone and re-extract the route list exactly as requirement 2 did, into `/tmp/ppa-routes-after.json`. `diff /tmp/ppa-routes-before.json /tmp/ppa-routes-after.json` must be **empty**: same 4 entries, same order, same `method`, same `path` arrays, same `help.name`, same `parameters`. Diff the files mechanically; do not eyeball.
- **Module shape unchanged.** `node -e "const m=require('./dist/plugable-projects-audit.js'); console.log(Object.keys(m), m.handlers.length, typeof m.setup)"` prints `[ 'handlers' ] 4 undefined`.
- **The bundle is not required to be byte-identical.** Regenerating the lockfile may pull a newer patch of a transitive Babel/Terser dev dependency; a measured rebuild differed from the committed artifact only by cosmetic parenthesisation of function expressions. `dist/` is gitignored and untracked, so this has no effect on the repository. **The route-list diff above, not a byte comparison, is the behavioral gate.** If the route-list diff is non-empty, halt.
- **Scope is two files.** `git diff --name-only` (against the task's base) lists exactly `package.json` and `package-lock.json`. Nothing under `src/`, no `Makefile`, no `make/*.mk`, no `.gitignore`.
- **`package.json` diff is one line.** `git diff package.json` shows a single changed line — the `http-smart-response` value.

## Assumptions

- The npm registry is reachable and `@liquid-labs/http-smart-response@1.0.0-alpha.6` is published. Both were verified at plan-authoring time (`npm view` succeeded and listed `1.0.0-alpha.1` … `1.0.0-alpha.6`). A resolution failure here is an environment problem to report, not a range to "fix".
- Node in the execution environment is v26.5.0, as at plan-authoring time. This donor is green on it (**C15**).
- Creating a throwaway clone under the session scratchpad is permitted. If it is not, the fresh-clone acceptance test can be approximated with `npm install --ignore-scripts` in a directory where `.yalc/` has been temporarily moved aside — but **say so in the report**, because the approximation is weaker and this is the task's whole point.
- `git clone` of the local repository is a local-filesystem operation; no network is involved for the clone itself.

## References

- `plan/notes/plugable-projects-audit-source-inventory.md` — **A3** (the defect and the verified remedy, in full), **A2** (the dependency table), **A9** (the measured baseline and why fresh-clone numbers differ from main-checkout numbers), **C12**, **C15**.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/overview.md` — the precedent: that slice was directed to revert a stray `file:.yalc/@liquid-labs/playground-monitor` entry for the same class of reason.
- `/Users/zane/playground/sdlcforge/core-server/bun.lock` lines 374 and 1776 — the evidence that this spec is in the *published* release, not just the working tree.
- `/Users/zane/playground/sdlcforge/core-server/scripts/provision-local-deps.sh` and `AGENTS.md:60` — the downstream workaround this fix eventually retires (executed by `core-server-domain-consolidation`, not here).

## Checkpoint hints

- After the defect is reproduced in a throwaway clone and the before-route baseline is captured.
- After the `package.json` edit and the lockfile regeneration, before the fresh-clone acceptance test.
- After the fresh-clone acceptance test passes and the route-list diff is empty, with the numbers recorded.
