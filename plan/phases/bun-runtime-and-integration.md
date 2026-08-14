# Bun Runtime And Integration

## Goals

Confirm the runtime target and bring the two integration tiers and the operational scripts into line with it.

The governing decision is settled and is a **no-change**: `dist/sdlcforge-server-exec.js` keeps `#!/usr/bin/env -S node --enable-source-maps`, `engines.node` stays `>=18.0.0`, and the Docker Node 18–24 matrix remains the meaningful compatibility contract. `@sdlcforge/core-server` is published to npm, and a `bun` shebang would make Bun a hard install-time requirement for every consumer; the [runtime-target decision](../notes/runtime-target-decision.md) declines that and defers a bun-if-available-else-node launcher to a followup outside this plan.

That reframes this phase. It is not "settle the runtime, then propagate the answer" — the answer is known, and the work is to *verify* that the built artifact, `engines`, and the Docker matrix are genuinely untouched, and to convert the npm invocations that surround them:

- `scripts/start.sh` runs `node ${SERVER_EXEC}` directly, bypassing the shebang. That stays `node`, consistent with the decision — but the surrounding `npm run stop` guidance it prints does not.
- `scripts/test.sh` calls `npm run build` and `node test/test-server.js`. The build invocation becomes Bun-driven; the `node` invocation stays.
- `test/run-integration-tests.sh` calls `npm run build` as its Step 1 host-side build.
- `test/test-ci.sh` uses `npm pack` and `npm install -g` to validate the *published npm package*. That is npm's own packaging contract being exercised deliberately, not an artifact of the package manager used for development, and it stays npm.

The Docker tier needs **no provisioning work of its own**. `docker-compose.yml` bind-mounts the whole project read-write (`..:/project:rw`) and `run-tests.sh` only verifies that `dist/` and `node_modules/` already exist from the host-side build — the container never installs dependencies. The host's `.yalc/`-derived `node_modules` is therefore transparently visible inside it. Preserving that bind-mount architecture is the requirement; the only related change is deleting `test/setup-local-deps.sh`, which is unreferenced by any script or doc in the current pipeline and was orphaned by the very commit that introduced the directory mount.

The golden-api-spec characterization test is the regression oracle throughout: the server's HTTP API surface must be unchanged by anything in this phase.

## Inputs

- Phase 2's verified build and unit-test toolchain.
- The answered [runtime-target decision](../notes/runtime-target-decision.md).
- Phase 1's `serverConfigRoot` change, whose effect on a *running* server (as opposed to the unit tests, which override `serverConfigRoot` explicitly) is first exercised here.
- The [yalc-provisioning research](../notes/bun-yalc-provisioning.md)'s findings on the Docker tier and on `test/setup-local-deps.sh`.
- `docs/core-server-spec.md`'s stated runtime requirements, which constrain what may be promised.

## Outputs

- Verified-unchanged runtime surface: the `node` shebang emitted by `make/50-sdlcforge-server-exec-js.mk`, `engines.node >=18.0.0`, and the Node 18–24 Docker matrix.
- Updated `scripts/start.sh` and `scripts/test.sh`.
- Updated `test/run-integration-tests.sh`, with `test/Dockerfile` and `test/docker-compose.yml` confirmed to need no change.
- `test/setup-local-deps.sh` deleted.
- All three test tiers passing: `make test`, `bun run test:local`, `bun run test:integration`.
- Working `bun run start` and `bun run stop` against the Node runtime and the new XDG configuration root.
