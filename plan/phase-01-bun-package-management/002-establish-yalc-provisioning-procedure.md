# Establish Yalc Provisioning Procedure

## Purpose and scope

Turn the "how does a checkout other than the author's get a resolvable dependency tree" problem from tribal knowledge into a checked-in, repeatable mechanism — and correct the post-`yalc push` instruction, which is wrong under Bun in a way that fails silently.

`.yalc/` and `yalc.lock` are gitignored, so the two `file:.yalc/…` dependencies (`@liquid-labs/plugable-express`, `@liquid-labs/liq-projects`) resolve on the author's machine and nowhere else. Every task worktree in this plan hits this, and so does every future one.

Scope covers a new `scripts/` entry, the yalc-specific prose in `AGENTS.md`, and a recorded CI policy. It does **not** cover the rest of `AGENTS.md` (phase 4 owns that), the Docker tier (phase 3 owns that), or `package.json`.

No standard skill covers this; follow the procedure below.

## Requirements

1. **Add `scripts/provision-local-deps.sh`.** An executable, `#!/usr/bin/env bash`, `set -e` script that makes the current checkout installable. It must:
   - Resolve the main checkout from wherever it is run. `git rev-parse --git-common-dir` yields `<main-checkout>/.git` (or an absolute path to it) from inside a linked worktree, and `.git` from inside the main checkout itself; derive the main checkout directory from that and handle both cases.
   - If `.yalc/` is absent in the current directory and present in the main checkout, `cp -R` it in. Copy `yalc.lock` alongside it when present — Bun does not read it, but it keeps the checkout's state consistent if anyone runs `yalc` commands there later.
   - If `.yalc/` is absent from *both*, fail with a clear, actionable message naming the upstream sibling checkouts (`@liquid-labs/plugable-express`, `@liquid-labs/liq-projects`) and the `yalc push` step that populates it. Do not attempt to run `yalc` — it is a global tool on the developer's machine, not a project dependency, and the upstream repos are not guaranteed to exist.
   - Accept a `--refresh-lock` flag that runs `rm -f bun.lock` before installing, for the post-`yalc push` case described below.
   - Finish by running `bun install` in the current directory, and propagate its exit status.
   - Be idempotent and safe to re-run when `.yalc/` already exists.

2. **Correct the post-`yalc push` instruction in `AGENTS.md`.** Two places state it today — the fourth bullet of `## Conventions` ("Run `npm install` after any yalc push to ensure transitive dependencies stay in sync") and step 3 of `## Common tasks`. Both must become the Bun-correct instruction and must say *why*, because the failure is silent:

   > Under Bun, a bare `bun install` re-copies the linked package's **content** but does not re-resolve its **own dependency list** once `bun.lock` holds a resolved entry for the `file:` spec. `--force`, `--no-cache`, and a version bump are all equally ineffective. A newly-added transitive dependency simply never materializes, while `bun install` reports success. After any `yalc push` that changed the linked package's own `dependencies`, run `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`).

   Also note that Bun always *copies* a `file:` dependency and never symlinks it, regardless of `--backend`, so edits made directly under `.yalc/…` are invisible until the next install.

3. **Record the CI policy.** No CI workflow exists in this repository — there is no `.github/` directory, and `test/test-ci.sh` is a local script a developer runs by hand. Record, in the same `AGENTS.md` section, the chosen policy rather than leaving a future CI-setup task to guess:

   > yalc is a strictly local-development mechanism. CI, when introduced, installs against published versions and does not attempt to resolve `file:.yalc/…` links; it does not check out the upstream `plugable-express` / `liq-projects` repositories. A CI runner has neither those repos nor the developer's global yalc store, so `.yalc/` cannot be regenerated there from nothing.

   This is a policy record, not an instruction to build CI. Do not add any CI configuration in this task.

4. **State the worktree procedure.** Document, in the same section, that a Flow task worktree must be created with dependency installation suppressed and then provisioned:

   ```bash
   create-worktree.sh --no-install-deps …
   cd "$WORKTREE_PATH" && /path/to/main-checkout/scripts/provision-local-deps.sh
   ```

5. **Do not touch** the build/test/lint command blocks, the configuration table, the code-organization list, or the troubleshooting section of `AGENTS.md`. Phase 4 task 002 owns those and will be told this section is already correct.

## Validation

- `bash -n scripts/provision-local-deps.sh` parses cleanly, and the file has the executable bit set (`test -x`).
- End-to-end proof in a scratch directory, not just a read-through: create a throwaway `git worktree` of this repository, confirm `.yalc/` is absent and `bun install` fails there, run `scripts/provision-local-deps.sh` in it, and confirm `bun install` then succeeds and `node_modules/@liquid-labs/plugable-express` exists as a real directory. Remove the throwaway worktree afterward.
- Running the script a second time in the same directory succeeds and does not duplicate or corrupt `.yalc/`.
- `scripts/provision-local-deps.sh --refresh-lock` removes `bun.lock`, reinstalls, and leaves a regenerated `bun.lock` behind.
- Running the script in a directory that has neither a local nor a main-checkout `.yalc/` exits non-zero with the actionable message, rather than falling through to a confusing `bun install` failure.
- `grep -n 'npm install' AGENTS.md` returns no hit inside the yalc convention bullet or the `## Common tasks` yalc steps.
- `git diff` touches only `scripts/provision-local-deps.sh` and `AGENTS.md`.

## Assumptions

- Task 001 has landed, so `bun.lock` exists and `bun install` resolves the registry dependencies. Without it, the `--refresh-lock` path cannot be exercised meaningfully.
- This task's own worktree needs the same manual provisioning every other task in this plan does — copy `.yalc/` in before installing.
- `yalc` itself is a globally-installed developer tool (`/opt/homebrew/bin/yalc`, `1.0.0-pre.53` on the author's machine), not a project dependency. The script must not assume it is available.
- The upstream sibling checkouts (`/Users/zane/playground/liquid-labs/plugable-express`, `.../liq-projects`) exist on the author's machine but are not part of this repository and must not be referenced by absolute path in a checked-in script.

## References

- [Bun `file:`/yalc resolution and provisioning](../notes/bun-yalc-provisioning.md) — the full evidence: the copy-never-symlink finding, the reproduced `bun.lock` transitive-caching trap and every ineffective workaround tried, the three per-environment answers, and the confirmation that `bun.lock`'s `file:` encoding is portable but inert without matching bytes on disk.
- [`plan/overview.md`](../overview.md) — the plan-level statement of the worktree pre-condition.

## Checkpoint hints

- After `scripts/provision-local-deps.sh` is written and passes the throwaway-worktree test.
- After the `AGENTS.md` yalc section is rewritten.
