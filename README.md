# liq-integrations-issues-github

A GitHub-Issues-backed provider plugin for the `liq-integrations` hook-registry mechanism (now built into [`@liquid-labs/plugable-express`](https://github.com/liquid-labs/plugable-express)). It supplies pull-request create/update, issue and project URL resolution, current-integration-user lookup, and milestone determination against GitHub's Issues, Pull Requests, Projects, and Milestones APIs, for developers building `plugable-express`-based servers.

## Installation

```bash
npm install @liquid-labs/liq-integrations-issues-github
```

Once installed as a dependency of a `plugable-express`-based server, register it as an integration provider:

```bash
catalyst server plugins integrations add -- npmName=@liquid-labs/liq-integrations-issues-github
```

(`catalyst` may be replaced by the CLI for the particular `plugable-express`-based server.)

## Usage

The provider activates automatically for any project whose `package.json` declares a GitHub `bugs.url`:

```json
{
  "bugs": {
    "url": "https://github.com/<org>/<repo>/issues"
  }
}
```

Once registered, the host server's `IntegrationsManager` routes `tickets` and `pull request` hook calls — issue/project URL lookup, PR create/update, current-integration-user lookup, and milestone assignment — to this package for any project matching that test.

## Additional documentation

- Working on this project (build, test, conventions): [AGENTS.md](./AGENTS.md)
- Specification: [docs/liq-integrations-issues-github-spec.md](./docs/liq-integrations-issues-github-spec.md)
- Repository layout: [docs/project-structure.md](./docs/project-structure.md)
