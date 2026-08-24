# Mark Package Deprecated And Bump Version

## Purpose and scope

Update `package.json` to reflect `liq-integrations-issues-github`'s retired status: a deprecation-leading `description` and a version bump, per the [source-package retirement policy](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy). Depends on [`001-verify-core-server-absorption.md`](./001-verify-core-server-absorption.md) having passed. Parallel-eligible with [`002-author-readme-superseded-notice.md`](./002-author-readme-superseded-notice.md) (disjoint files: `package.json` vs. `README.md`).

## Requirements

1. **`description`.** The current value is the **empty string** — which is why this plugin has always reported a blank server-visible `summary` (`plugable-express`'s loader derives `summary` from the package `description`). Replace it with a deprecation-leading description naming `@sdlcforge/core-server` as the successor. Lead with the deprecation notice rather than burying it: while the package remains loaded anywhere, this string *is* the server-visible summary.

2. **`version`.** Bump from `1.0.0-alpha.3` to `1.0.0-alpha.4`, staying on the existing prerelease line. `npm view @liquid-labs/liq-integrations-issues-github versions` showed `1.0.0-alpha.1`, `.2`, `.3` published at plan-authoring time, so `1.0.0-alpha.3` is already taken and `1.0.0-alpha.4` is free — re-check that before settling on it, and take the next free value on the `1.0.0-alpha.x` line if it has moved. This task edits `package.json` by hand rather than invoking `npm version`, so run the `preversion` script's checks manually — `make test && make lint`, or equivalently `make qa` — per the sibling `liq-orgs` precedent.

3. **`files` allowlist / publishing hygiene.** Per [`dev-core-consolidation-contract.md#publishing-hygiene`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#publishing-hygiene), determine what `npm pack --dry-run` **actually** ships. Note the pre-existing condition recorded as anomaly 7 in the [source inventory](../notes/liq-integrations-issues-github-source-inventory.md#anomalies-and-flags): there is **no `files` array** and no `.npmignore`, so npm falls back to `.gitignore`, which excludes `/dist` — leaving the tarball dependent on npm's force-include of `package.json`, `README.md`, and the `main` file (`dist/liq-integrations-issues-github.js`).

   Run `npm pack --dry-run` and inspect the result. If `dist/liq-integrations-issues-github.js` is present and no local artifact leaks in (`plan/`, `worktrees/`, `.flow/`, `qa/`, `test-staging/`, `node_modules/`, lockfiles beyond the intended one), leave the manifest alone and record the finding. If the final tarball would be **unusable** — the `main` file missing, or local artifacts leaking — add a minimal `files` allowlist (`["dist/*"]`) to fix it, and say so explicitly in the report. Do not add a `files` array purely for tidiness on a package about to be deprecated.

4. **Change nothing else.** Do not modify `dependencies`, `devDependencies`, `scripts`, `main`, `repository`, or any other field beyond `description` and `version` (and `files`, only if requirement 3's check finds an actual, publishing-breaking drift). In particular, **do not revisit the dependency block** — Phase 12 task 001 set it deliberately (`@liquid-labs/liq-projects-lib` removed, `@liquid-labs/versioning` and `@liquid-labs/octocache` added) and a retirement task is the wrong place to second-guess it.

## Validation

- `description` is non-empty, leads with the deprecation notice, and names `@sdlcforge/core-server`.
- `version` is `1.0.0-alpha.4` (or the next free value on the `1.0.0-alpha.x` line if `1.0.0-alpha.4` turns out already published — check `npm view @liquid-labs/liq-integrations-issues-github versions` before settling on it).
- `dependencies` is byte-identical to its post-Phase-12 state: no `@liquid-labs/liq-projects-lib`, and both `@liquid-labs/versioning` and `@liquid-labs/octocache` present.
- `make qa` (test + lint) passes green.
- `npm pack --dry-run` output is recorded in the task report, listing every file the tarball would contain, and contains no unexpected local artifact (planning-tool state, build/worktree copies, stray lockfiles).
- `git diff package.json` shows only the intended field changes — two fields, or three if requirement 3 justified a `files` addition.
- No other file is modified by this task.

## References

- [`dev-core-consolidation-contract.md#source-package-retirement-policy`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy) and its `#publishing-hygiene` section — the policy this task implements.
- [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) — the package-identity table and anomalies 6 and 7, which this task acts on.
- `/Users/zane/playground/liquid-labs/liq-credentials/worktrees/plan/core-server-domain-consolidation/plan/phase-11-retire-liq-credentials/003-mark-package-deprecated-and-bump-version.md` — the sibling donor's equivalent task.
- `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — precedent for deriving the shipped file set from the actual tarball rather than from the working-tree `.gitignore`.
