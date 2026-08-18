# dev-core

`@sdlcforge/dev-core` is the consolidated development-lifecycle plugin for `@sdlcforge/core-server`. It is planned to bring together project lifecycle management, work orchestration, organization settings, and project auditing into a single `plugable-express` plugin, in place of four packages that previously shipped these capabilities separately.

## Planned composition

`dev-core` is not yet a shipped, working plugin — this repository currently holds only its package scaffolding, a buildable-but-empty plugin entry point, and this documentation, with no submodule yet landed. Its target internal shape is one top-level directory under `src/` per submodule:

- **`projects`** — project lifecycle: creation, setup, rename, update, archive, close, destroy, and release publishing.
- **`work`** — work-item orchestration on top of the project lifecycle.
- **`orgs`** — organization-level settings and configuration.
- **`projects-audit`** — auditing checks over existing projects.

Each submodule will expose only `handlers` and, where applicable, `setup` from its own `src/<submodule>/index.mjs` — no other file under a submodule directory is part of its public surface. The full layout convention, the runtime contracts each submodule must preserve, and the procedure for bringing a submodule's source in are recorded in [`docs/dev-core-consolidation-contract.md`](./docs/dev-core-consolidation-contract.md).

## How it loads

`dev-core` is loaded by `@sdlcforge/core-server` as an explicit `plugable-express` plugin: the server dynamic-imports this package's `main` entry (`dist/dev-core.js`, built from `src/index.mjs`) and reads exactly two exports from it — a merged `handlers` array and a composite, asynchronous `setup` function. No other export is read. Today, before any submodule has landed, `src/index.mjs` already exists and builds to `dist/dev-core.js` — it just exports an empty `handlers` array and a no-op `setup`, since no submodule has landed yet.

## Build and test

Once source exists, `dev-core` builds and tests through the same Make-based toolchain its constituent submodules already use:

```bash
make build   # Babel + Rollup -> dist/dev-core.js
make test    # Jest, via a Babel-transpiled test-staging/ build
make lint    # ESLint
```

## Additional documentation

- [`docs/dev-core-consolidation-contract.md`](./docs/dev-core-consolidation-contract.md) — the durable reference for this package's layout convention, submodule interface, root-file ownership, absorption recipe, and the runtime contracts it must preserve.
- [`docs/consumer-migration.md`](./docs/consumer-migration.md) — the per-donor specification of the exact edits `@sdlcforge/core-server` must make to repoint from each absorbed package to `@sdlcforge/dev-core`.

## License

UNLICENSED — see [`package.json`](./package.json).
