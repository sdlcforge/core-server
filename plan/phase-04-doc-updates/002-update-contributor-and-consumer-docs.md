# Update Contributor And Consumer Docs

## Purpose and scope

Bring the contributor and consumer documentation into line with the completed Bun conversion: `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/project-structure.md`, and `test/README.md`.

The architecture and specification documents belong to task 001 of this phase and must not be edited here. The **yalc section of `AGENTS.md`** — the `## Conventions` bullet about post-`yalc push` behavior, the `## Common tasks` steps, and the recorded CI policy — was already rewritten by phase 1 task 002 and is correct; leave it alone and do not duplicate its content elsewhere.

No standard skill covers this; follow the procedure below.

## Requirements

1. **`AGENTS.md`.**
   - Convert every command in `## Build and test` and `## Run` to its Bun form: `bun run build`, `bun run test` (or `make test`), `bun run test:local`, `bun run test:integration`, `bun run lint`, `bun run lint:fix`, `bun run qa`, `bun run start`, `bun run stop`. Keep `TEST_SINGLE_VERSION=22 bun run test:integration` and `./test/test-ci.sh` as they are in shape.
   - State the toolchain prerequisites plainly, because a reader will otherwise conclude npm is gone: Bun installs the dependency tree, and **Node and the `npm` binary must still be on `PATH`** — every Catalyst tool is a Node-targeted CLI, and `make/10-resources.mk` resolves its four tool configs through `npm explore … -- pwd`.
   - Add a getting-started install line: dependencies are installed with `bun install`, and a checkout without `.yalc/` needs `./scripts/provision-local-deps.sh` first.
   - Add `COMPLY_SERVER_CONFIG_ROOT()` to the `## Environment variables and configuration` table, with its `${XDG_DATA_HOME:-$HOME/.local/share}/sdlcforge-core` resolution, and note that the packaged `server-settings.yaml` defaults are seeded there on first run.
   - Add `scripts/provision-local-deps.sh` to the `## Code organization` `scripts/` entry.
   - In `## Troubleshooting`, replace the "run `npm install` on the host first" advice with the Bun equivalent, including the `rm -f bun.lock && bun install` case.
   - Do **not** change the `prepack` / `preversion` description: those hooks still run `make build` and `make test && make lint`, and publication is still via npm.

2. **`CLAUDE.md`.** It largely mirrors `AGENTS.md`. Make the same command conversions in `## Common Commands`, add `COMPLY_SERVER_CONFIG_ROOT()` to the `### Configuration Pattern` list, and update `### Yalc Local Development` and `### Dependency Updates` to the `rm -f bun.lock && bun install` instruction. Correct `### Build Artifacts`, which is right about the `node` shebang — verify rather than assume, then leave it.

3. **`README.md`.** This is the consumer-facing document, and it must not acquire a Bun requirement.
   - `npm install @sdlcforge/core-server` stays. The package is published to npm and installs with any npm-compatible client.
   - The `## Usage` `npm start` example describes running from a checkout; convert it to `bun run start` only if the surrounding text is clearly about developing on this repository. If it reads as consumer guidance, leave it on npm and let `AGENTS.md` carry the contributor form.
   - Add nothing implying Bun is needed to consume the package.

4. **`docs/project-structure.md`.**
   - Replace the `package-lock.json` entry in the repository tree and in the file table with `bun.lock`, described as the pinned dependency graph for reproducible installs.
   - Add `scripts/provision-local-deps.sh` to the `scripts/` listing and its description.
   - Remove `test/setup-local-deps.sh` if it is listed.
   - Update the `package.json` row's "npm manifest" phrasing if it now misleads.
   - The note about `node_modules/` and `.yalc/` being generated and gitignored stays; extend it with the fact that `.yalc/` is not reproducible from a clone.

5. **`test/README.md`.** It describes a stale "Alpine Linux" container that does not match `test/Dockerfile` (`ubuntu:latest`), and documents `setup-local-deps.sh`-era behavior. Correct the container description and remove any reference to the now-deleted `test/setup-local-deps.sh`. Convert its command examples to the Bun forms where they invoke `npm run …` project scripts.

6. **Sweep for stragglers.** After the targeted edits, grep the repository's Markdown (excluding `node_modules/`, `.yalc/`, `worktrees/`, and `plan/`) for `npm run`, `npm install`, `npm test`, and `package-lock` and confirm every surviving hit is deliberate — `npm pack` / `npm install -g` in the `test/test-ci.sh` description, `npm install @sdlcforge/core-server` in `README.md`, `npm explore` in the toolchain-prerequisite statement, and npm publication references.

## Validation

- `grep -rn 'package-lock' --include='*.md' . --exclude-dir=node_modules --exclude-dir=.yalc --exclude-dir=worktrees --exclude-dir=plan` returns nothing.
- `grep -rn 'setup-local-deps' . --exclude-dir=node_modules --exclude-dir=.yalc --exclude-dir=worktrees --exclude-dir=.git` returns nothing.
- `grep -rn -i 'alpine' test/README.md docs/` returns no hit describing the integration container.
- `grep -n 'COMPLY_SERVER_CONFIG_ROOT' AGENTS.md CLAUDE.md` finds it in both configuration tables.
- `grep -n 'provision-local-deps' AGENTS.md docs/project-structure.md` finds it in both.
- Every remaining `npm` mention in `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/project-structure.md`, and `test/README.md` is one of the deliberate cases enumerated in requirement 6 — enumerate them in the task report.
- `AGENTS.md`'s yalc section is unchanged from what phase 1 task 002 left (`git diff` shows no edit inside it).
- No document claims Bun is required to install or run the published package.
- Every command block is language-tagged, section titles are sentence case, and the docs carry no frontmatter.
- Every document remains reachable from `README.md` through a link chain.

## Assumptions

- Phases 1 through 3 are complete and merged. Verify claims against the code and scripts, not only against the task documents.
- Task 001 of this phase owns `docs/architecture.md`, `docs/core-server-spec.md`, and `docs/architecture/plugin-loading-tiers.md`. The two tasks touch disjoint files and may run concurrently.
- `bun run <script>` runs `package.json` scripts; the bare `bun <name>` form does not and must not appear in the docs.
- `README.md` follows the README document standards, which grant it exemptions the other docs do not have — do not restructure it beyond the command and claim corrections above.

## References

- [`plan/overview.md`](../overview.md) — the decision table listing what changed and what deliberately did not.
- `plan/phase-01-bun-package-management/002-establish-yalc-provisioning-procedure.md` — the `AGENTS.md` section this task must not re-edit, and the provisioning script it introduced.
- [Runtime-target decision](../notes/runtime-target-decision.md) — the bound on what may be claimed about the runtime.

## Checkpoint hints

- After `AGENTS.md` and `CLAUDE.md`.
- After `README.md` and `docs/project-structure.md`.
- After `test/README.md` and the straggler sweep.
