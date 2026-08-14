# Decision: Executable shebang / runtime target

## Question

Should `dist/sdlcforge-server-exec.js` keep `#!/usr/bin/env -S node --enable-source-maps` or become `#!/usr/bin/env -S bun`? This is consumer-facing: core-server is published to npm, so a `bun` shebang makes Bun a hard install-time requirement for every consumer. It also decides whether `engines.node >=18.0.0` stays or is replaced by an `engines.bun` constraint, and whether the Docker Node 18–24 matrix remains meaningful or should gain a Bun dimension.

## Answer

Keep the shebang using `node` for now, add a followup to use a script to launch with `bun` if available and fall back to `node`.

- `dist/sdlcforge-server-exec.js` keeps `#!/usr/bin/env -S node --enable-source-maps` in this plan's scope — no consumer-facing runtime requirement change, `engines.node >=18.0.0` and the Docker Node 18–24 matrix stay meaningful as-is.
- Record a followup (not in this plan's scope) to introduce a launcher that detects and prefers `bun` at runtime when available, falling back to `node` otherwise — deferred rather than built now.
