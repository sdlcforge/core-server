# Bun Runtime And Integration

## Goals

Settle what runtime the server actually runs on, then bring the two integration test tiers and the operational scripts into line with that answer.

The governing decision is the executable shebang. `make/50-sdlcforge-server-exec-js.mk` currently emits `#!/usr/bin/env -S node --enable-source-maps`; the author's stale local build output carries `#!/usr/bin/env -S bun`. This is the plan's one genuinely consumer-facing choice — `@sdlcforge/core-server` is published to npm, so a `bun` shebang makes Bun a hard install-time requirement for every consumer and drops `--enable-source-maps` (Bun enables source maps natively, but the flag's removal should be deliberate rather than incidental). It also governs whether `engines.node >= 18.0.0` stays, is replaced by an `engines.bun` constraint, or both are declared.

The Docker multi-version matrix resolves as a **consequence** of that answer rather than as an independent decision. `test/Dockerfile` provisions nvm with Node 18–24, and `docs/architecture.md` records that this tier exists primarily to catch explicit-plugin loading regressions across Node versions. If the shebang stays `node`, that matrix remains the meaningful compatibility contract and is preserved as-is. If the shebang becomes `bun`, testing plugin loading across seven Node versions largely stops describing how the artifact is run, and the matrix should gain — or be replaced by — a Bun dimension. Either way the tier itself survives; the three-tier structure is a stated constraint.

Three scripts hardcode Node or npm and need updating to match:

- `scripts/start.sh` runs `node ${SERVER_EXEC}` directly, bypassing the shebang entirely.
- `scripts/test.sh` calls `npm run build` and `node test/test-server.js`.
- `test/setup-local-deps.sh` parses `package.json` for `file:` dependencies and copies them into the container using `node -e`. It is the container-side counterpart to Phase 1's yalc-provisioning problem and must stay consistent with whatever Phase 1 established.

This phase also resolves the **`serverConfigRoot`** question. If the user selects the HOME-based root, it is added as a `@liquid-labs/comply-defaults` accessor rather than inlined in `app-init.mjs` — `AGENTS.md` names comply-defaults as the project's centralized configuration mechanism — and it must be guarded, since the WIP branch's unguarded `process.env.HOME` yields a `TypeError` from `fsPath.join` wherever `HOME` is undefined. If the user selects `main`'s existing `myPackagePath`, no source change is made and the WIP branch's value is dropped.

The golden-api-spec characterization test is the regression oracle throughout: the server's HTTP API surface must be unchanged by anything in this phase.

## Inputs

- Phase 2's working build and unit-test toolchain.
- The user's answer on the executable shebang and runtime target.
- The user's answer on `serverConfigRoot`.
- Phase 1's dependency-provisioning procedure, which the Docker tier must reuse.
- `docs/core-server-spec.md`'s stated runtime requirements, which constrain what may be promised.

## Outputs

- A settled runtime: the shebang emitted by `make/50-sdlcforge-server-exec-js.mk`, and a matching `engines` declaration in `package.json`.
- Updated `scripts/start.sh` and `scripts/test.sh`.
- Updated `test/Dockerfile`, `test/docker-compose.yml`, `test/run-integration-tests.sh`, and `test/setup-local-deps.sh` as the runtime answer requires.
- A resolved `serverConfigRoot`, implemented through comply-defaults and guarded if the HOME-based root is adopted.
- All three test tiers passing: `make test`, `npm run test:local`, `npm run test:integration`.
- Working `npm start` and `npm stop` against the chosen runtime.
