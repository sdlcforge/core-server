---
created: 2026-08-24
creators: Zane Rockenbaugh <zane@liquid-labs.com>
maintainers: Zane Rockenbaugh <zane@liquid-labs.com>
---

# liq-integrations-issues-github Specification

## Purpose and scope

This document specifies what `liq-integrations-issues-github` is required to do. It is the canonical statement of the package's functional commitments for developers and AI agents implementing or modifying it, and for reviewers checking proposed changes against requirements.

`liq-integrations-issues-github` is a GitHub-Issues-backed provider plugin for the `liq-integrations` hook-registry mechanism now built into [`@liquid-labs/plugable-express`](https://github.com/liquid-labs/plugable-express). It maps that mechanism's abstract `tickets` and `pull request` integration interfaces onto GitHub's Issues, Pull Requests, Projects, and Milestones APIs. The audience is developers building or maintaining `plugable-express`-based servers and developers working on this plugin itself.

This spec covers the plugin's registered hooks, the activation condition that determines when it participates for a given project, and the cross-cutting behaviors all hooks share. It does not cover build, test, or contribution workflow (see [AGENTS.md](../AGENTS.md)) or repository layout (see [docs/project-structure.md](./project-structure.md)). The plugin has no separate architecture document at this time; its internal design is small enough to be fully covered by this spec and the source itself.

## Table of contents

1. [Key use cases](#key-use-cases)
2. [General features](#general-features)
3. [API definition](#api-definition)
4. [Constraints and assumptions](#constraints-and-assumptions)
5. [Pointers to deeper docs](#pointers-to-deeper-docs)

## Key use cases

### Provider activation

- **Actor**: the host `plugable-express` server's `IntegrationsManager`.
- **Action**: for a given project, evaluates the plugin's activation test against that project's `package.json`.
- **Outcome**: the plugin registers itself as the `tickets` and `pull request` provider only for projects whose `bugs.url` is a `github.com` URL (e.g. `https://github.com/<org>/<repo>/issues`). Projects that don't match are routed to a different provider, if any.

### Pull request create-or-update

- **Actor**: the host server, on behalf of a developer completing a unit of work.
- **Action**: calls the `createOrUpdatePullRequest` hook with the project, work-branch (`workKey`), work-unit description, close-target issue(s), and PR body.
- **Outcome**: if an open PR already exists for the work branch's head, the plugin pushes the latest commits and updates the PR body; otherwise it pushes the branch and creates a new PR, setting the PR title from the work-unit description, assigning the current GitHub user (or supplied assignees) as author/assignee, assigning the project's current milestone, and requesting a single reviewer from eligible collaborators. The hook returns the resulting PR URL(s). Milestone determination is implemented locally via `determineCurrentMilestone` (see [Constraints and assumptions](#constraints-and-assumptions)).

### Issue URL resolution

- **Actor**: the host server.
- **Action**: calls the `getIssueURL` hook with a GitHub org, project (repo) name, and issue reference.
- **Outcome**: returns the canonical `https://github.com/<org>/<project>/issues/<ref>` URL, with no network call required.

### Project URL resolution

- **Actor**: the host server.
- **Action**: calls the `getProjectURL` hook with a GitHub org and project (repo) name.
- **Outcome**: returns the canonical `https://github.com/<org>/<project>` URL, with no network call required.

### Pull request URLs by head lookup

- **Actor**: the host server.
- **Action**: calls the `getPullRequestURLsByHead` hook with a GitHub org, project (repo) name, and a head branch reference.
- **Outcome**: returns a GitHub PR search URL scoped to that head branch (`.../pulls?q=head%3A<head>`), with no network call required.

### Current integration user lookup

- **Actor**: the host server.
- **Action**: calls the `getCurrentIntegrationUser` hook.
- **Outcome**: returns the GitHub login associated with the credential registered under `GITHUB_API` in the host app's credentials database.

### QA link file index lookup

- **Actor**: the host server.
- **Action**: calls the `getQALinkFileIndex` hook with the project's `package.json`, project path, and a reporter.
- **Outcome**: returns an index of QA-relevant file links resolved against the project's GitHub org, for use in surfacing QA artifacts in PRs or other integration output.

## General features

- **Single activation test governs both provider registrations.** Both the `tickets` and `pull request` provider registrations share the same `usesGitHubIssues` activation test: a project participates in this provider if and only if its `package.json` `bugs.url` matches `^https://(www.)?github.com/`.
- **Credential handling is centralized.** Every hook that needs GitHub API access retrieves its auth token from the host app's `credentialsDB` under the `GITHUB_API` key; callers never pass credentials directly.
- **PR creation is idempotent per branch.** `createOrUpdatePullRequest` checks for an existing open PR against the work branch's head before creating one; at most one open PR is maintained per branch, and repeat calls update rather than duplicate it.
- **Non-critical PR setup failures do not fail the operation.** If assignee, milestone, or reviewer assignment (on create) or body update (on update) fails after the PR itself has been created or pushed, the hook catches the error, reports it via the supplied `reporter`, and still returns the PR URL.
- **Reviewer selection is randomized among eligible collaborators.** When creating a PR, one reviewer is chosen at random from repository collaborators with `triage` permission, excluding the assignees (falling back to the assignee list if no other eligible collaborator exists) and always excluding the PR author.
- **Pure URL-construction hooks make no network calls.** `getIssueURL`, `getProjectURL`, and `getPullRequestURLsByHead` are synchronous, deterministic string builders against the fixed `https://github.com` base.

## API definition

The plugin's external surface is a `setup` function (`src/index.js`) that registers two provider entries with the host `IntegrationsManager`, plus the individual hook functions each registration exposes. The surface is small enough to define inline; there is no separate API reference document for this project.

| Registration `providerFor` | Hooks exposed | Activation test |
|---|---|---|
| `tickets` | `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` | `usesGitHubIssues` |
| `pull request` | `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` | `usesGitHubIssues` |

Hook function signatures (all exported from `src/*.mjs`):

| Hook | Signature | Returns |
|---|---|---|
| `createOrUpdatePullRequest` | `({ app, assignees, cache, closes, closeTarget, isPrivate, prBody, projectBasename, projectFQN, projectPath, qaFiles, reporter, workKey, workUnit })` | `Promise<string[]>` — PR URL(s) |
| `getCurrentIntegrationUser` | `({ app })` | `Promise<string>` — GitHub login |
| `getIssueURL` | `({ gitHubOrg, project, ref })` | `string` — issue URL |
| `getProjectURL` | `({ gitHubOrg, project })` | `string` — repo URL |
| `getPullRequestURLsByHead` | `({ gitHubOrg, project, head })` | `string` — PR search URL |
| `getQALinkFileIndex` | `({ app, pkgJSON, projectPath, reporter })` | `Promise<object>` — QA link file index |
| `usesGitHubIssues` | `({ pkgJSON })` | `boolean` — activation test result |

Every hook that performs GitHub API calls (`createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getQALinkFileIndex`) requires the host app to have a working `credentialsDB` with a `GITHUB_API` token registered; those hooks fail if that precondition is not met.

## Constraints and assumptions

- **Milestone determination is implemented locally.** `createOrUpdatePullRequest` assigns a milestone when creating a PR via `determineCurrentMilestone`, implemented at `src/determine-current-milestone.mjs` — copied verbatim from `@liquid-labs/liq-projects-lib` and no longer imported from it. It still requires a `GITHUB_API` token from the host `credentialsDB`, and it still depends on `minVersion` from the live, separately-maintained `@liquid-labs/versioning`.
- **Dependent on the broader `liq`/`liquid-labs` toolkit libraries.** The plugin relies on `@liquid-labs/git-toolkit` (origin/main resolution, shell push), `@liquid-labs/github-toolkit` (GitHub login and org/repo resolution from `package.json`), `@liquid-labs/liq-qa-lib` (QA file link resolution), `@liquid-labs/octocache` (cached GitHub API client), `@liquid-labs/shell-toolkit` (shell command execution), and `@liquid-labs/versioning` (`minVersion` for milestone selection) as external dependencies, all of type-checked against the versions pinned in `package.json`.
- **Requires a `plugable-express`-based host.** The plugin only functions when loaded by a host server exposing `app.ext.integrations.register`, `app.ext.credentialsDB`, and `app.ext._liqProjects.playgroundMonitor` — it is not a standalone runnable package.
- **Node.js `>=18.0.0`** per `package.json` `engines`.
- **Private vs. workspace PR head resolution.** For private projects (`isPrivate === true`), the PR head branch is pushed to and referenced from the project's own resolved remote; for non-private (workspace) projects, the head is namespaced to the current GitHub user's fork (`<login>:<workKey>`) and pushed to the fixed `workspace` remote.

## Pointers to deeper docs

- [AGENTS.md](../AGENTS.md) — build, test, and contribution conventions for developers and AI agents working on this repository.
- [docs/project-structure.md](./project-structure.md) — repository layout reference: what each directory and key root-level file is for.
