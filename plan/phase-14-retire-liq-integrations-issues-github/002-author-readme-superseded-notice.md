# Author README As Superseded Notice

## Purpose and scope

Rewrite `liq-integrations-issues-github`'s existing `README.md` as its final-release superseded notice, per the [source-package retirement policy](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy). Depends on [`001-verify-core-server-absorption.md`](./001-verify-core-server-absorption.md) having passed. Parallel-eligible with [`003-mark-package-deprecated-and-bump-version.md`](./003-mark-package-deprecated-and-bump-version.md) (disjoint files: `README.md` vs. `package.json`).

**This is a rewrite, not from-scratch authoring.** `README.md`, `AGENTS.md`, `docs/liq-integrations-issues-github-spec.md`, and `docs/project-structure.md` are already committed to `main` (commit `af00846`, authored ahead of this plan-group's planning pass so the fold could be scoped against real documentation), and the spec and `AGENTS.md` were further corrected by Phase 12 task 002. The current `README.md` describes `liq-integrations-issues-github` as a current, standalone, installable plugin — accurate when written, but by the time this task executes `core-server` will carry the functionality it describes. Read the existing `README.md` and the corrected spec before rewriting; do not assume their content.

## Requirements

Rewrite `README.md` covering:

1. **Supersession banner**, leading the document: `@liquid-labs/liq-integrations-issues-github` is superseded by `@sdlcforge/core-server`, which now carries its functionality directly as an in-tree module (`src/integrations-issues-github/`) rather than as an npm-dependency plugin. This is a domain-specific absorption, not a framework-level fold-in.

2. **An accurate statement of what the package did.** Two integration-provider registrations — `tickets` and `pull request` — sharing one activation test (`usesGitHubIssues`: the project's `package.json` `bugs.url` matches `^https://(www.)?github.com/`), exposing seven hook registrations across the two: `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` on `tickets`; `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` on `pull request`.

   State plainly that the package registered **zero HTTP routes and zero path variables** — its entire contribution was those provider registrations. That is the distinguishing fact about this donor and the reason its absorption had to be verified from a registration baseline rather than a route snapshot; it belongs in the historical record. Cross-check against both [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) and the committed `docs/liq-integrations-issues-github-spec.md`.

3. **The `determineCurrentMilestone` inlining as part of the package's final history.** Late in its life this package stopped importing `determineCurrentMilestone` from `@liquid-labs/liq-projects-lib` and carried a verbatim local copy instead, so that `liq-projects-lib` could be deprecated. Anyone reading this repository's git history, or `core-server`'s absorbed tree, will encounter the change; say what it was and why. Note that `@liquid-labs/versioning` — supplying `minVersion` — is a live package and was **not** retired by this consolidation.

4. **Honest consumer inventory.** State plainly that the only npm dependent, confirmed by a playground-wide grep at plan-authoring time, was `@sdlcforge/core-server`. Re-run that grep as of this task's execution rather than restating the stale claim. Separately note that this package **consumed** two runtime contracts it did not own — `app.ext.credentialsDB` (published by `liq-credentials`, itself absorbed into `core-server` by a sibling slice of this same plan-group) and `app.ext._liqProjects.playgroundMonitor` — and that both live on inside `core-server`.

5. **Migration pointer.** Point readers at `@sdlcforge/core-server` for current functionality. Remove the standalone installation and `catalyst server plugins integrations add` registration instructions the current README carries — they are no longer valid guidance once this notice is authored.

6. **Known-defect disclosure**, carried forward from the source inventory, documented rather than fixed:
   - Both `app.ext.integrations.register()` calls omitted `name`, so `IntegrationsManager.listInstalledPlugins()`'s `name`-keyed de-duplication collapsed the two providers into a single entry in `GET /server/plugins/integrations/list`. Deliberately carried forward unchanged through the fold, so the absorption's parity baseline would stay meaningful.
   - `@liquid-labs/octocache` was imported by `create-or-update-pull-request.mjs` but declared nowhere in `package.json`, resolving only transitively, until the `determineCurrentMilestone` inlining declared it explicitly.
   - `package.json`'s `description` was the empty string, so the server-visible plugin `summary` (which `plugable-express` derives from the package description) was blank.
   - The package shipped no `files` allowlist while `.gitignore` excluded `/dist`, so the published tarball relied on npm's force-include of the `main` file and carried no other `dist/` artifact.

7. **Final version number**, matching whatever [`003-mark-package-deprecated-and-bump-version.md`](./003-mark-package-deprecated-and-bump-version.md) sets `package.json`'s `version` to (planned: `1.0.0-alpha.4`). The two tasks are parallel-eligible, so either order is possible — read task 003's own requirement, or the already-landed `package.json` if it ran first. Do not hardcode a version without checking.

8. **Note that the repository's source is left intact**, not deleted, per policy — and that no re-export shim is registered with any live server. The thin `export * from './integrations-issues-github'` left at `src/index.js` by Phase 13 is a build entry point inside this package's own bundle, not a second live plugin registration. This distinction matters more for this donor than for its siblings: because it registers no routes and no path variables, a stale second registration would **not** crash `plugable-express` the way a route-carrying donor's would — it would silently double-register providers. Saying so in the notice is worth the sentence.

9. **Keep the document reachable and consistent.** The current README links `AGENTS.md`, `docs/liq-integrations-issues-github-spec.md`, and `docs/project-structure.md`. Retain pointers to whichever of those remain meaningful as historical record; do not leave a dangling link. `docs/liq-integrations-issues-github-spec.md` may be left as historical record or annotated at the executor's discretion, but is not this task's primary deliverable.

## Validation

- `README.md` exists at the repository root and its content reflects the supersession notice, not the pre-fold standalone-plugin framing (npm install and `catalyst server plugins integrations add` instructions) it carried before this task ran.
- The supersession banner names `@sdlcforge/core-server` and appears at or near the top of the document.
- The two-provider/seven-hook statement is present, and the "zero HTTP routes, zero path variables" point is explicit.
- The `determineCurrentMilestone` inlining is described, including why it was done (unblocking `@liquid-labs/liq-projects-lib`'s deprecation).
- All four disclosed defects are present, each traceable to the specific file or `package.json` field named in the source inventory.
- The consumer inventory statement matches a grep re-run as of this task's execution, not a restated plan-authoring-time claim. If it has changed, report it rather than silently broadening or narrowing the claim.
- The version number stated in the README matches `package.json`'s actual `version` at the time this task lands.
- No internal link in the rewritten README is dangling.
- `make qa` (test + lint) remains green — README changes should not affect it, but confirm rather than assume.
- No other file is modified by this task.

## References

- [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) — source of the provider/hook surface, defect list, dependency inventory, and consumer inventory this README restates.
- [`dev-core-consolidation-contract.md#source-package-retirement-policy`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy) — the policy this README implements the documentation half of.
- `/Users/zane/playground/liquid-labs/liq-credentials/worktrees/plan/core-server-domain-consolidation/plan/phase-11-retire-liq-credentials/002-author-readme-superseded-notice.md` and `/Users/zane/playground/liquid-labs/liq-controls/worktrees/plan/core-server-domain-consolidation/plan/phase-02-retire-liq-controls/002-author-readme-superseded-notice.md` — the sibling donors' equivalent tasks in this same plan-group.
- `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — the original precedent (superseded banner, accurate description, consumer inventory, known-defect disclosure).
