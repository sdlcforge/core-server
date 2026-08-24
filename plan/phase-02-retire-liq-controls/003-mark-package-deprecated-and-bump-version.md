# Mark Package Deprecated And Bump Version

## Purpose and scope

Update `package.json` to reflect `liq-controls`'s retired status: a deprecation-leading `description` and a version bump, per the retirement policy in `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy`. Depends on [`001-verify-core-server-absorption.md`](./001-verify-core-server-absorption.md) having passed. Parallel-eligible with [`002-author-readme-superseded-notice.md`](./002-author-readme-superseded-notice.md) (disjoint files: `package.json` vs. `README.md`).

## Requirements

1. **`description`**: replace the current `"Enables and manages policy controls for a @liquid-labs/plugable-express server."` with a deprecation-leading description naming `@sdlcforge/core-server` as the successor — this string is the server-visible plugin `summary` read by `plugable-express`'s loader while the package is still loaded anywhere, so lead with the deprecation notice rather than burying it.
2. **`version`**: bump from `1.0.0-alpha.9` to the next `alpha` version (`1.0.0-alpha.10`), matching the `preversion` script's existing convention (`npm test && make lint`) — run `preversion`'s checks manually if not invoking `npm version` directly, since this task edits `package.json` by hand rather than through the CLI bump command per the sibling `liq-orgs` precedent.
3. **`files` allowlist.** Per `dev-core-consolidation-contract.md#publishing-hygiene`, verify the existing `files` array (`["dist/*", "plugable-express.yaml"]`) still matches what `npm pack --dry-run` would actually ship after Phase 1's relocation — Phase 1 should not have changed `dist/`'s shape (still `dist/liq-controls.js` + `dist/audit.schema.json`), but confirm rather than assume, since the schema file's build-source path moved.
4. Do not modify `dependencies`, `devDependencies`, `scripts`, or any other `package.json` field beyond `description` and `version` (and `files`, only if step 3's check finds an actual drift).

## Validation

- `description` leads with the deprecation notice and names `@sdlcforge/core-server`.
- `version` is bumped and follows the existing `1.0.0-alpha.x` line convention.
- `make qa` (tests + lint) passes green.
- `npm pack --dry-run` output matches the `files` allowlist and contains no unexpected local artifacts (planning-tool state, build/worktree copies, lockfiles) — per the publishing-hygiene requirement.
- `git diff package.json` shows only the intended field changes.

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy` and `#publishing-hygiene` — the policy this task implements.
- `liq-orgs`'s own `003-mark-package-deprecated-and-bump-version.md` outcome, recorded in its `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — precedent for deriving the `files` allowlist from the actually-published tarball rather than the working-tree `.gitignore`.
