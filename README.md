# @liquid-labs/liq-controls

`@liquid-labs/liq-controls` is a plugin for a `@liquid-labs/plugable-express` server that enables and manages policy controls for the orgs the server hosts. It defines question-based policy controls, loads them per organization at server setup, and exposes them through HTTP endpoints and an integration hook other plugins can query.

## Installation

Install as a plugin dependency of a plugable-express server:

    npm install @liquid-labs/liq-controls

`liq-controls` itself depends on the `@liquid-labs/liq-projects` and `@liquid-labs/liq-orgs` plugins (declared in `plugable-express.yaml`); the host server's plugin loader resolves and loads them automatically.

## Usage

Once loaded, `liq-controls` exposes an endpoint to list the question controls loaded for an organization:

```bash
curl http://localhost:<port>/orgs/<orgKey>/controls/list
```

Organizations define their controls as `*.qcontrols.yaml` files under `data/org/controls/` in the org's project directory; `liq-controls` loads them at server setup, and other plugins can retrieve a named control set at runtime through the registered `getQuestionControls` integration hook.

## Additional documentation

- Working on this project (build, test, conventions): [AGENTS.md](./AGENTS.md)
- Specification: [docs/liq-controls-spec.md](./docs/liq-controls-spec.md)
- Repository layout reference: [docs/project-structure.md](./docs/project-structure.md)
