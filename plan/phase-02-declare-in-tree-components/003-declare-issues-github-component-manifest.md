# Declare Issues-Github Component Manifest

## Purpose and scope

Populate the `issues-github` entry of `plugable.host.builtins[0].components` in `core-server`'s `package.json`, derived from `src/integrations-issues-github/index.js` and the handler/integration modules it registers. This entry is where the resolved `conditional:` question (formerly Q3, an open judgment call as of the 2026-08-26 grounding pass) is applied. This task's scope is limited to the `issues-github` array entry; the `controls` and `credentials` entries are separate, independent tasks ([001](./001-declare-controls-component-manifest.md), [002](./002-declare-credentials-component-manifest.md)) touching the same file's other array entries.

This task assumes Phase 1 has already landed the empty, structure-only `components` array (see task 001's Purpose and scope for the same assumption, stated once there in full).

## Requirements

- In `package.json`, locate the `components` array entry for `"component": "issues-github"` and populate its `provides` and `requires`. Re-derive from real source rather than transcribing [plugin-set-inventory.md](../notes/plugin-set-inventory.md)'s draft unread; the draft, as a checkpoint:
  - `provides`:
    - `setupMethod:register github issues integrations`
    - `{ capability: 'integration:tickets', phase: setup, exclusive: false, conditional: true, via: "setup method 'register github issues integrations' (providerTest: usesGitHubIssues)" }`
    - `{ capability: 'integration:pull request', phase: setup, exclusive: false, conditional: true, via: "setup method 'register github issues integrations' (providerTest: usesGitHubIssues)" }`
    - `{ capability: 'integrationHook:tickets/getCurrentIntegrationUser', phase: setup, exclusive: false }`
    - `{ capability: 'integrationHook:tickets/getIssueURL', phase: setup, exclusive: false }`
    - `{ capability: 'integrationHook:tickets/getProjectURL', phase: setup, exclusive: false }`
    - `{ capability: 'integrationHook:pull request/createOrUpdatePullRequest', phase: setup, exclusive: false }`
    - `{ capability: 'integrationHook:pull request/getCurrentIntegrationUser', phase: setup, exclusive: false }`
    - `{ capability: 'integrationHook:pull request/getPullRequestURLsByHead', phase: setup, exclusive: false }`
    - `{ capability: 'integrationHook:pull request/getQALinkFileIndex', phase: setup, exclusive: false }`
  - `requires`:
    - `{ capability: appExt:setupMethods, phase: load }`
    - `setupMethod:setup integrations`
    - `{ capability: appExt:integrations, phase: setup }`
    - `{ capability: appExt:credentialsDB, phase: runtime }`
    - `{ capability: 'credential:GITHUB_API', phase: runtime, optional: true, reason: 'GitHub hooks fail at call time without it; the server is otherwise healthy' }`
    - `{ capability: appExt:_liqProjects, phase: runtime }`

### The resolved `conditional:` question

`src/integrations-issues-github/index.js` registers both `integration:tickets` and `integration:pull request` with `providerTest: usesGitHubIssues` rather than `() => true`, so a bare, unconditional `provides` over-claims: the graph would close and `No provider found for 'tickets'` could still fire at request time for a non-GitHub project. As of the 2026-08-26 grounding pass ([plugin-set-inventory.md](../notes/plugin-set-inventory.md)), the upstream schema had not yet adopted a `conditional:` marker into its decided grammar, so that note framed this as an open choice between an accepted, documented over-claim and omitting the two provides entirely.

**That choice no longer applies.** `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` (`### conditional`, merged 2026-08-28) documents `conditional: true` — and its own worked example is this exact `core-server` case, by name. Declare both `integration:tickets` and `integration:pull request` with `conditional: true` and the `via:` text shown above, citing the `providerTest`. Do not accept a silent unconditional over-claim, and do not omit the provides. See [2026-09-01-blocker-reverification.md](../notes/2026-09-01-blocker-reverification.md) (the "Q3" section) for the full resolution history.

### Other requirements

- Use the exact capability name `credential:GITHUB_API` (not `credentialType:GITHUB_API` or any other variant) — confirmed against `/Users/zane/playground/sdlcforge/dev-core/package.json`'s `"plugable"` block, whose own `projects`/`work` components use this exact spelling, and whose task 003 log records catching and correcting an invented `credentialType:GITHUB_API` mistake against the framework's canonical name. Getting this wrong here would silently fail to match `dev-core`'s `credential:GITHUB_API` provide once that dependency is refreshed.
- The `credential:GITHUB_API` requirement must be `optional: true` with the reason given above. A missing GitHub token does not make the server unstartable — it only makes three GitHub-integration hook bodies fail when actually called (`get-current-integration-user.mjs`, `create-or-update-pull-request.mjs`, `determine-current-milestone.mjs`, each via `credDB.getToken('GITHUB_API')` — re-verify these exact file names against real source). Marking it required would hard-fail a server that is perfectly serviceable for every non-GitHub-integration request.
- Confirm every capability's `phase` against `docs/plugin-manifest-schema.md`'s reserved-kinds table — `integration:` and `integrationHook:` both require an explicit `provides` phase and default `requires` to `runtime`; `setupMethod:` is fixed at `setup` on both sides.

## Validation

- Confirm `package.json` remains valid JSON after the edit.
- Re-read `src/integrations-issues-github/index.js` and the handler/integration modules under it (the GitHub-hook bodies reading `credDB.getToken('GITHUB_API')`) and confirm every `provides`/`requires` entry, including the three hook-body file names cited above, traces to a real site.
- Grep the finished `issues-github` component entry: both `integration:tickets` and `integration:pull request` provides entries must include `"conditional": true`; neither may appear without it.
- Grep for `credentialType:GITHUB_API` anywhere in the edited JSON — must be absent; the requirement must read `credential:GITHUB_API`.
- Confirm the `credential:GITHUB_API` requires entry carries `"optional": true` and a `reason`.
- If `node_modules/.bin/plugable-express-validate` is present, run `node_modules/.bin/plugable-express-validate --package-root . --format text` as a sanity check. Expect the two `integration:` provides to surface a `satisfied-conditionally`-shaped info-level finding once something actually requires them (nothing in `core-server`'s own tree does today) rather than an error; a `manifest-invalid` finding naming `issues-github` is a real defect. Findings naming the still-empty `controls`/`credentials` entries (if those tasks haven't landed yet) are expected and not this task's concern.
- `make test` / `make qa` are not expected to change behavior from this task alone — the validator is not wired into the build until Phase 4.

## References

- [plugin-set-inventory.md](../notes/plugin-set-inventory.md) — verified composition and derived declarations, with source citations.
- [2026-09-01-blocker-reverification.md](../notes/2026-09-01-blocker-reverification.md) — the Q3 resolution: `conditional: true` is now settled, shipped framework grammar, not an open plan-authored judgment call.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` — `### conditional` (the worked example naming this exact component), `### components:`, `## Reserved kinds and their defaults`.
- `/Users/zane/playground/sdlcforge/dev-core/package.json` `"plugable"` block — the authoritative reference for the exact `credential:GITHUB_API` spelling.
