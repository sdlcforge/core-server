# Update Architecture Docs

## Purpose and scope

Update this project's architecture and specification documents to reflect the changes made by the `bun-conversion` plan: npm is replaced by Bun for package management, and the server's configuration root moves out of the package directory to an XDG data-home location. The runtime contract does **not** change, and the docs must be precise about that.

Follow the `update-architecture-docs` task-procedure at `<plugin_root>/plugins/flow/task-procedures/update-architecture-docs/SKILL.md` (on this machine, `/Users/zane/playground/sdlcforge/flow/plugins/flow/task-procedures/update-architecture-docs/SKILL.md`).

## Requirements

`role_doc: plugins/flow/roles/architect-backend.md` — resolved against `plugin_root`; on this machine, `/Users/zane/playground/sdlcforge/flow/plugins/flow/roles/architect-backend.md`. The implications are backend, configuration, and build-pipeline in nature, with no data-model, cloud-topology, or frontend dimension.

### Task documents that surfaced the architectural implications

These are the plan's implementation task documents, all completed by the time this phase runs. Read each one's requirements and the report it produced before editing any doc.

- `plan/phase-01-bun-package-management/001-pin-dependencies-and-adopt-bun-lockfile.md` — the `package-lock.json` → `bun.lock` swap and the dependency-specifier change.
- `plan/phase-01-bun-package-management/002-establish-yalc-provisioning-procedure.md` — the provisioning mechanism and the recorded CI policy.
- `plan/phase-01-bun-package-management/003-add-server-config-root-accessor-to-comply-defaults.md` — the new `COMPLY_SERVER_CONFIG_ROOT()` accessor in `@liquid-labs/comply-defaults`.
- `plan/phase-01-bun-package-management/004-adopt-xdg-server-config-root.md` — the configuration-root relocation and the `server-settings.yaml` seeding it required.
- `plan/phase-02-bun-build-and-test-toolchain/001-verify-build-and-lint-under-bun.md` — the determination that the Catalyst toolchain needs no change, and that Node and npm remain toolchain prerequisites.
- `plan/phase-02-bun-build-and-test-toolchain/002-verify-unit-test-tier.md` — the Jest-stays decision.
- `plan/phase-03-bun-runtime-and-integration/001-convert-local-integration-tier.md` — the confirmed-unchanged runtime target.
- `plan/phase-03-bun-runtime-and-integration/002-convert-docker-integration-tier.md` — the preserved Node 18–24 matrix and the bind-mount container architecture.

### Files to review and update

- `docs/architecture.md`. At minimum:
  - **Tech stack** — add package management (Bun for dependency installation; Node and npm still required on a contributor's `PATH` for the Catalyst toolchain). Update **Configuration** to name the new `COMPLY_SERVER_CONFIG_ROOT()` accessor alongside the existing ones. Correct **Test**, which says the Docker tier uses "Alpine + nvm" — `test/Dockerfile` is `ubuntu:latest`.
  - **Runtime** — confirm and leave `Node.js, >=18.0.0` as-is. Do not introduce a Bun runtime claim.
  - **Core initialization** — the prose still says `app-init.mjs` passes `serverHome`; the field has been `serverConfigRoot` since the `modernization-foundation` rename, and its *value* has now changed from the package directory to `${XDG_DATA_HOME}/sdlcforge-core/`. Describe where server configuration state now lives, and that the packaged `server-settings.yaml` defaults are seeded into it on first run.
  - **Build pipeline** — the pipeline itself is unchanged (Rollup, Babel, Catalyst makefiles), and the `#!/usr/bin/env -S node --enable-source-maps` preamble is unchanged. Say so, and record that the makefiles were deliberately not modified because they are generated.
  - **Testing strategy** — the Docker tier's purpose and the Node 18–24 range are unchanged; correct the Alpine reference.
  - **Design decisions and tradeoffs** — the yalc local-dev-loop entry needs the Bun-specific consequence: a bare `bun install` does not re-resolve a linked package's own dependency list, so `rm -f bun.lock && bun install` is required after a `yalc push` that changed it.
- `docs/core-server-spec.md` (the file `docs/*-spec.md` resolves to). At minimum:
  - **Constraints and assumptions** — `Node.js >=18.0.0` stays exactly as written; it is not weakened, strengthened, or supplemented with a Bun requirement.
  - The build/publish use case's `npm run build` / `make` phrasing, and the test use case's `npm test` / `npm run test:local` / `npm run test:integration` phrasing, become the Bun forms.
  - Add or extend the statement of where server configuration state is kept, now that it is a user-level XDG location rather than the installed package directory. This is the spec-defined behavior change that triggered this phase.
- `docs/architecture/plugin-loading-tiers.md` — review for any claim about where plugins or configuration are resolved from that the config-root move invalidates. Update only if something is actually wrong; this document may need no change.

### What must not be claimed

- That Bun is required to install or run the published package. It is not; `engines.node >=18.0.0` and the `node` shebang are unchanged.
- That npm has been removed from the toolchain. `npm explore` still resolves the Catalyst tool configs, `npm pack` / `npm install -g` still drive `test/test-ci.sh`, and publication is still to npm.
- That the unit-test runner changed. Jest stays.
- That `make/*.mk` was modified. It was not.

## Validation

- `docs/architecture.md` and `docs/core-server-spec.md` were both reviewed, and every change made is traceable to one of the task documents listed above.
- `grep -rn 'serverHome' docs/` returns no hit describing the current `app-init.mjs` interface.
- `grep -rn -i 'alpine' docs/` returns no hit describing the Docker integration container.
- `grep -rn 'package-lock' docs/` returns no hit.
- No doc asserts a Bun runtime requirement: `grep -rn -i 'bun' docs/` yields only statements about package management, the local dev loop, and developer commands — never about running the published artifact.
- `docs/core-server-spec.md` still states `Node.js >=18.0.0` as the minimum supported runtime and still names the Docker 18–24 validation range.
- Both documents conform to Flow's Markdown design and style standards — sentence-case section titles, language-tagged code blocks, no frontmatter, inline cross-references rather than "see"-style pointers.
- Every document remains reachable from `README.md` through a link chain.

## Assumptions

- Phases 1 through 3 are complete and merged, so the described state is the actual state. Read the code, not just the task docs, where the two could differ.
- `docs/project-structure.md`, `AGENTS.md`, `CLAUDE.md`, and `README.md` belong to task 002 of this phase and must not be edited here.
- The yalc section of `AGENTS.md` was already corrected by phase 1 task 002.

## References

- [`plan/overview.md`](../overview.md) — the plan's decision table, which is the authoritative summary of what changed and what deliberately did not.
- [Runtime-target decision](../notes/runtime-target-decision.md) — the bound on what may be claimed about the runtime.
- [Catalyst toolchain compatibility under Bun](../notes/catalyst-bun-compatibility.md) — the evidence behind the "Node and npm remain toolchain prerequisites" statement.
