# liq-work

`liq-work` owns the concept of a "unit of work" — a cross-repo, git-branch-scoped bundle of effort tying together GitHub issues and projects/repos through a lifecycle from creation to submission/merge. It orchestrates issues (GitHub) and projects (`liq-projects`) rather than defining either itself.

## Domain model

A unit of work is keyed by `workKey` (equal to its `workBranch`, e.g. derived from the primary issue ID). The persisted record, managed by `WorkDB` (`src/handlers/work/_lib/work-db.mjs`) and stored in a single YAML file at `<serverConfigRoot>/work/work-db.yaml`, tracks:

- `description` — a human-readable summary of the work (auto-derived from the primary issue's title when not supplied).
- `initiator` — the author who started the work.
- `issues` — the GitHub issues (`{ id, summary }`) attached to the unit of work.
- `projects` — the repos (`{ name, private }`) attached to the unit of work.
- `started` / `startedEpoch` — when the work was created.
- `workBranch` — the git branch name shared across all attached projects.

Creating a unit of work has real side effects beyond bookkeeping: it forks/branches the attached projects, sets up a `workspace` git remote, and pushes/pulls branches as needed.

## Route surface

Lifecycle operations are exposed as handlers under `/work`, most with both an explicit variant (`/work/:workKey/<op>`, operating on a named unit of work) and an implied variant (`/work/<op>`, operating on whatever unit of work is "current"). `start` and `resume` are explicit-only.

| Operation | Explicit route | Implied route |
|-----------|-----------------|----------------|
| start | `POST /work/start` | — (explicit-only) |
| resume | `/work/:workKey/resume` | — (explicit-only) |
| pause | `/work/:workKey/pause` | `/work/pause` |
| status | `/work/:workKey/status` | `/work/status` |
| build | `/work/:workKey/build` | `/work/build` |
| clean | `/work/:workKey/clean` | `/work/clean` |
| qa | `/work/:workKey/qa` | `/work/qa` |
| save | `/work/:workKey/save` | `/work/save` |
| submit | `/work/:workKey/submit` | `/work/submit` |
| close | `/work/:workKey/close` | `/work/close` |

Two nested sub-resource collections manage what is attached to a unit of work, each with the same explicit/implied pairing:

| Collection | Operations | Explicit route pattern | Implied route pattern |
|------------|------------|-------------------------|-------------------------|
| `work/issues` | `add`, `list`, `remove` | `/work/:workKey/issues/<op>` | `/work/issues/<op>` |
| `work/projects` | `add`, `list`, `remove` | `/work/:workKey/projects/<op>` | `/work/projects/<op>` |

In total this is 30 distinct route registrations.

## Plugin integration

`liq-work` is a plugin for `@liquid-labs/plugable-express` (the engine behind `@sdlcforge/core-server`). Its package entry point (`src/index.js`) exports the shape plugable-express expects:

- `name` (`'core-work'`) and `summary` — plugin identity.
- `handlers` — the flat array of ~30 handler modules, each exporting `{ func, help, method, parameters, path }`.
- `setup({ app, reporter })` — called by the host at plugin load time; registers `app.ext.constants.WORK_DB_PATH` (the `work-db.yaml` location) and `app.ext.pathResolvers.workKey` (a dynamic `:workKey` path-parameter resolver).

## Runtime dependencies on other plugins

`liq-work` has no `plugable-express.yaml` manifest today, so none of the following is declared anywhere — these are undeclared, `app.ext`-mediated runtime dependencies on other plugins being loaded in the same server process:

- **`app.ext._liqProjects.playgroundMonitor`** (registered by `liq-projects`) — called unconditionally, with no fallback, from `start-lib.mjs`, `qa-lib.mjs`, `build-lib.mjs`, `submit-lib.mjs`, `save-lib.mjs`, `delete-work-branches.mjs`, `work-db.mjs`, `issues/_lib/add-lib.mjs`, `projects/_lib/add-lib.mjs`, `determine-work-status.mjs`, and `answer-set-to-md.mjs` to resolve a project's filesystem path or `package.json`. **`liq-work` cannot function without `liq-projects` loaded in the same server process** — this is a hard, unguarded dependency, not an optional one.
- **`app.ext.credentialsDB`** (registered by `liq-credentials`/`liq-credentials-db`) — used in `start-lib.mjs`, `status-lib.mjs`, `close-lib.mjs`, `clean-lib.mjs`, `issues/_lib/add-lib.mjs`, `issues/_lib/remove-lib.mjs`, and `projects/_lib/add-lib.mjs` to obtain GitHub auth tokens.
- **`app.ext.integrations`** (registered by `liq-integrations`) — used in `submit-lib.mjs` and `answer-set-to-md.mjs`. Notably, `submit-lib.mjs` (around lines 94-107) calls `app.ext.integrations.hasHook({ providerFor: 'controls', hook: 'getQuestionControls' })` to fetch submitter-attestation questions. Unlike the `liqProjects` dependency above, **this one is already guarded**: the code checks `supportsControls === false` and degrades gracefully (returns `{}`, skipping the attestation step) when no controls provider is loaded. This is the one working example of an optional-capability boundary in this codebase, in contrast to the unconditional `liqProjects` dependency.

## Modernization status

This package is part of an active modernization effort and is a likely merge candidate into a future consolidated package (with `liq-projects`, and possibly `liq-orgs`), given the pervasive, unconditional coupling documented above. Don't be surprised if the package boundary described here looks different later.

## License

UNLICENSED.
