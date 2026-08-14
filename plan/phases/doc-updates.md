# Doc Updates

## Goals

Make the project's documentation describe the project as it now is: Bun-managed dependencies, an XDG-compliant configuration root, and a Node runtime that did not change.

The conversion trips the architectural-implications check on two counts. It **changes spec-defined behavior** — `docs/core-server-spec.md` describes the runtime and configuration constraints a consumer can rely on, and the server's configuration root moves out of the package directory. And it **relocates significant tracked state** — both the `package-lock.json` → `bun.lock` swap and the move of `<serverConfigRoot>/server-settings.yaml` from the package root to `${XDG_DATA_HOME}/sdlcforge-core/`.

Beyond the architecture and spec docs, essentially every command in the contributor and consumer docs is stated as an `npm` invocation, and several statements are now wrong rather than merely stale:

- `AGENTS.md`'s "Run `npm install` after any yalc push" is actively misleading under Bun, which silently fails to re-resolve a linked package's new transitive dependencies without `rm -f bun.lock && bun install`. Phase 1 already corrects the yalc section specifically; this phase must not re-do it, and must cover everything else.
- `AGENTS.md`'s configuration table omits the new `COMPLY_SERVER_CONFIG_ROOT()` accessor.
- `docs/architecture.md` still says `app-init.mjs` passes `serverHome` — stale since the `modernization-foundation` rename, independent of this plan — and describes the Docker tier as running "inside Alpine containers" when `test/Dockerfile` is `ubuntu:latest`.
- `docs/project-structure.md` lists `package-lock.json` in the repository tree and file table.
- `README.md` and `CLAUDE.md` state every build, test, lint, and run command as `npm …`.

The phase must be precise about what did **not** change, since a naive `npm` → `bun` sweep would misstate it: the published artifact's `node` shebang, `engines.node >=18.0.0`, the Docker Node 18–24 matrix, `npm publish`/`npm pack` as the packaging path, and the continuing requirement for Node and the npm binary on a contributor's `PATH`.

## Inputs

- The completed implementation work of phases 1 through 3.
- The decisions recorded in `plan/overview.md`'s decision table and in each phase's task documents.
- The [runtime-target decision](../notes/runtime-target-decision.md), which bounds what may be claimed about the runtime.

## Outputs

- `docs/architecture.md` and `docs/core-server-spec.md` describing the current tech stack, build pipeline, configuration root, and runtime contract.
- `AGENTS.md`, `CLAUDE.md`, `README.md`, and `docs/project-structure.md` carrying correct commands, a correct file inventory, and a correct configuration table.
- No remaining documentation claim that the project is npm-managed, and no new claim that Bun is required to run the published package.
