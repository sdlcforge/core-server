# Convert Docker Integration Tier

## Purpose and scope

Convert the Docker multi-version integration tier's host-side npm invocation to Bun, confirm the container needs no dependency provisioning of its own, keep the Node 18–24 matrix intact, and delete the dead `test/setup-local-deps.sh`.

The container is simpler than it looks. `test/docker-compose.yml` bind-mounts the whole project read-write (`..:/project:rw`), and `test/run-tests.sh` only *verifies* that `dist/` and `node_modules/` already exist — it never installs dependencies. The host's `.yalc/`-derived `node_modules` is therefore transparently visible inside the container, and the yalc-provisioning problem does not arise there at all, as long as that architecture is preserved.

Scope is `test/`. The operational scripts are task 001's; documentation is phase 4's.

No standard skill covers this; follow the procedure below.

## Requirements

1. **Convert the host-side build.** `test/run-integration-tests.sh`'s Step 1 runs `npm run build`; it becomes `bun run build`. This is the only npm invocation in that script.

2. **Confirm the container needs no changes.** Verify rather than assume:
   - `test/Dockerfile` provisions Ubuntu plus nvm with Node 18–24 and installs no project dependencies. It needs **no Bun installation** — nothing inside the container installs packages, and the runtime under test is Node.
   - `test/docker-compose.yml`'s `..:/project:rw` bind mount is intact.
   - `test/run-tests.sh` continues to find `dist/` and `node_modules/` from the host build, and its `node -e` reads of `package.json` still work. It contains `npm --version` only as a diagnostic echo; leave it.
   - `.dockerignore` needs no change — it deliberately does not exclude `dist/` or `node_modules/`, and never referenced `package-lock.json`.

   Record each confirmation in the task report. If any of these turns out to be false, halt and report rather than redesigning the container architecture inside this task.

3. **Keep the Node 18–24 matrix exactly as it is.** The runtime decision keeps the `node` shebang and `engines.node >=18.0.0`, so this matrix remains the meaningful compatibility contract. Do **not** add a Bun dimension, do not narrow the version list, and do not alter `test/get-node-versions.js`, which derives the version set from `engines.node`.

4. **Delete `test/setup-local-deps.sh`.** It is dead code: no script, `Makefile`, `package.json` entry, or doc references it, and a repo-wide grep finds zero hits outside the file itself. It was orphaned by the very commit that introduced the directory-mount architecture it predates, and it assumes a `/home/testuser/...` layout that no longer matches the `/project` bind mount. It is not "broken by Bun" — it was already dead under npm.

   Before deleting, re-run the grep to confirm nothing has come to reference it since the research was done.

5. **Leave `test/test-ci.sh` on npm.** It runs `npm pack` and `npm install -g "$PACKAGE"` to validate that the **published npm package** installs and runs. That is npm's own packaging contract being exercised deliberately — the package is published to npm regardless of which tool manages development dependencies — and converting it would weaken the check. Record this as an explicit decision in the report, not an oversight.

6. **Run the full Docker tier.** `bun run test:integration` must pass across the matrix. Where a full seven-version run is impractical in the task environment, run `TEST_SINGLE_VERSION=22 bun run test:integration` as a minimum and say so plainly in the report — do not report a single-version run as a full-matrix pass.

## Validation

- `grep -rn 'npm ' test/run-integration-tests.sh` returns nothing.
- `bash -n test/run-integration-tests.sh` parses cleanly.
- `test ! -e test/setup-local-deps.sh`, and `grep -rn 'setup-local-deps' . --exclude-dir=node_modules --exclude-dir=.yalc --exclude-dir=worktrees --exclude-dir=.git` returns no hit.
- `git status` shows `test/setup-local-deps.sh` as a staged deletion.
- `git diff` shows no change to `test/Dockerfile`, `test/docker-compose.yml`, `test/run-tests.sh`, `test/get-node-versions.js`, `test/test-ci.sh`, or `.dockerignore`.
- `bun run test:integration` (or its documented single-version variant) completes, and `test-staging/integration-results/test-results-node-*.json` reports `failed: 0` for every version run.
- The explicit-plugin loading behavior the tier exists to catch is exercised — the results files show the plugin checks running, not skipped.
- `make test` still passes with the golden snapshots unchanged.

## Metadata

architectural_impact: true

## Assumptions

- Phase 2 has landed, and phase 3 task 001 has converted the operational scripts. This task and task 001 touch disjoint files and may run concurrently, but a full `test:integration` run depends on the host build working.
- This task's worktree needs `.yalc/` provisioned before `bun install` — use `scripts/provision-local-deps.sh`. The container inherits that provisioned tree through the bind mount, so no container-side provisioning is needed.
- Docker must be available and running. `test/run-integration-tests.sh` attempts to start Docker Desktop on macOS; if Docker is unavailable, halt and report rather than skipping the tier silently.
- A full seven-version matrix run is slow. `NO_CLEANUP=1` keeps the container alive for debugging if a version fails.
- The integration tier starts a real server, which will resolve its configuration root under the container's `HOME` per phase 1 task 004. That is expected; it is not a reason to modify the container.

## References

- [Bun `file:`/yalc resolution and provisioning](../notes/bun-yalc-provisioning.md) — Q3(c) on the bind-mount architecture needing no provisioning, and Q4 establishing `test/setup-local-deps.sh` as dead code.
- [Runtime-target decision](../notes/runtime-target-decision.md) — why the Node matrix stays meaningful.
- `test/README.md` — documents the tier, though it describes a stale "Alpine Linux" container; correcting that is phase 4's job, not this task's.

## Checkpoint hints

- After `test/run-integration-tests.sh` is converted and the container-unchanged confirmations are recorded.
- After `test/setup-local-deps.sh` is deleted and the grep sweep is clean.
- After the integration run completes.
