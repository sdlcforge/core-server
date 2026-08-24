# liq-credentials

A [`@liquid-labs/plugable-express`](https://www.npmjs.com/package/@liquid-labs/plugable-express) plugin that manages storage and retrieval of credentials for a plugable-express server. It registers as the `core-credentials` plugin and is aimed at developers building or operating a plugable-express-based server.

## Installation

```bash
npm install @liquid-labs/liq-credentials
```

This package is consumed as a plugin by a `@liquid-labs/plugable-express` server; the host server loads it through its plugin registration mechanism rather than running it standalone.

## Usage

Once registered with a server, the plugin exposes credential endpoints under `/credentials`:

```bash
# import a credential from a local file (by default, referenced in-place;
# pass copyToStorage=true to copy it into centralized storage instead)
curl -X PUT "http://localhost:<port>/credentials/GITHUB_SSH/import?path=/local/path/to/key"

# list known credentials
curl "http://localhost:<port>/credentials/list"
```

Credentials are backed by [`@liquid-labs/liq-credentials-db`](https://www.npmjs.com/package/@liquid-labs/liq-credentials-db), a separate project that implements the underlying credential store.

## Additional documentation

- Working on this project (build, test, conventions): [AGENTS.md](./AGENTS.md)
- Specification: [docs/liq-credentials-spec.md](./docs/liq-credentials-spec.md)
- Repository layout reference: [docs/project-structure.md](./docs/project-structure.md)
