# liq-credentials

Working notes for developers and AI agents contributing to liq-credentials. liq-credentials is a [`@liquid-labs/plugable-express`](https://www.npmjs.com/package/@liquid-labs/plugable-express) plugin that manages storage and retrieval of credentials for a plugable-express server; it registers as the `core-credentials` plugin and delegates the underlying storage, verification, and retrieval logic to [`@liquid-labs/liq-credentials-db`](https://www.npmjs.com/package/@liquid-labs/liq-credentials-db).

## Build and test

Requires Node.js >= 18. Install dependencies, then use the npm scripts — each delegates to a `make` target built on the shared [`@liquid-labs/catalyst-scripts-node-project`](https://www.npmjs.com/package/@liquid-labs/catalyst-scripts-node-project) toolchain (Rollup for the build, Babel + Jest for tests, ESLint for lint), rather than local config files in this repo:

```bash
npm install
npm run build      # make build   -- Rollup-bundles src/ into dist/liq-credentials.js
npm test           # make test    -- Babel-transpiles src/ into test-staging/, then runs Jest
npm run lint       # make lint    -- ESLint; report written to qa/lint.txt
npm run lint:fix   # make lint-fix
npm run qa         # make qa      -- test + lint together (also runs on `npm version` / `npm pack`)
```

Test files live alongside the code they cover (e.g. `src/handlers/credentials/test/list.test.js`); fixture data lives in sibling `test/data/` directories.

## Code organization

- `src/index.js` — plugin entry point; re-exports the handlers and `setup`, and declares the plugin's `name` (`core-credentials`) and `summary`.
- `src/setup.mjs` — the plugin's `setup` function, invoked by the host plugable-express server at load time: ensures the credentials storage directory exists under `serverConfigRoot`, instantiates `CredentialsDB` onto `app.ext.credentialsDB`, and registers the `credential` path variable (validation pattern plus a supported-key options fetcher).
- `src/handlers/credentials/` — the HTTP handlers: `import.mjs` (`PUT /credentials/:credential/import`) and `list.mjs` (`GET /credentials/list`). This is the plugin's complete handler set — there is no scope or rotate handler.
- `dist/` — build output (generated; not edited directly).
- `qa/` — build-produced test/lint reports (`unit-test.txt`, `lint.txt`) and pass markers.
- `test-staging/` — Babel-transpiled test tree Jest actually runs against (generated).

## External services and dependencies

- **Host server** — this package is not run standalone. It is loaded as a plugin by a `@liquid-labs/plugable-express` server, which supplies `app.ext`, `cache`, `registerPathVar`, and `serverConfigRoot` at plugin setup time.
- **Storage backend** — credential storage, verification, and retrieval logic is implemented by `@liquid-labs/liq-credentials-db`, not by this package's handlers directly.

## Conventions

- Source is a mix of `.js` and `.mjs` (ESM); handlers under `src/handlers/credentials/` are `.mjs`.
- This plugin's active surface is `import` and `list` only — no scope or rotate handler exists anywhere in the current source. Treat any documentation or discussion suggesting otherwise as out of date against [`docs/liq-credentials-spec.md`](./docs/liq-credentials-spec.md).

## Documentation

- [README.md](./README.md) — consumer-facing overview, installation, and usage.
- [docs/liq-credentials-spec.md](./docs/liq-credentials-spec.md) — the project specification: use cases, API definition, and security requirements.
- [docs/project-structure.md](./docs/project-structure.md) — repository layout reference.
</content>
