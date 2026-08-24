# Author README As Superseded Notice

## Purpose and scope

Rewrite `liq-credentials`'s existing `README.md` as its final-release superseded notice, per the [source-package retirement policy](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy). Depends on [`001-verify-core-server-absorption.md`](./001-verify-core-server-absorption.md) having passed. Parallel-eligible with [`003-mark-package-deprecated-and-bump-version.md`](./003-mark-package-deprecated-and-bump-version.md) (disjoint files: `README.md` vs. `package.json`).

**This is a rewrite, not from-scratch authoring.** `README.md`, `AGENTS.md`, `docs/liq-credentials-spec.md`, and `docs/project-structure.md` are already committed to `main` (commit `6ef7645`, authored ahead of this plan-group's planning pass so the fold could be scoped against real documentation). They describe `liq-credentials` as a current, standalone, active plugin — accurate when written, but by the time this task executes `core-server` will carry the functionality they describe. Read the existing `README.md` and spec before rewriting; do not assume their content.

## Requirements

Rewrite `README.md` covering:

1. **Supersession banner**, leading the document: `@liquid-labs/liq-credentials` is superseded by `@sdlcforge/core-server`, which now carries its functionality directly as an in-tree module (`src/credentials/`) rather than as an npm-dependency plugin. This is a domain-specific absorption, not a framework-level fold-in.

2. **An accurate statement of what the package did.** Two handlers only — `PUT /credentials/:credential/import` and `GET /credentials/list` — plus a `setup()` that published `app.ext.credentialsDB` and registered the `credential` path variable, delegating all storage, verification, and retrieval logic to the separate, **still-live** `@liquid-labs/liq-credentials-db` package. State plainly that **no credential scoping and no credential rotation ever existed** in this package's source; any documentation or discussion suggesting otherwise was wrong. Cross-check against both [`plan/notes/liq-credentials-source-inventory.md`](../notes/liq-credentials-source-inventory.md) and the committed `docs/liq-credentials-spec.md`.

3. **Honest consumer inventory.** State plainly that the only npm dependent, confirmed by a playground-wide grep at plan-authoring time, was `@sdlcforge/core-server`. Separately note that the runtime contract `app.ext.credentialsDB` was read by `@sdlcforge/dev-core` and `@liquid-labs/liq-integrations-issues-github` without either declaring an npm dependency on this package — that contract lives on inside `core-server`.

4. **Migration pointer.** Point readers at `@sdlcforge/core-server` for current functionality, and at `@liquid-labs/liq-credentials-db` for the storage layer (which is **not** retired by this consolidation). Remove the standalone installation and usage instructions the current README carries — they are no longer valid guidance once this notice is authored.

5. **Known-defect disclosure**, carried forward from the source inventory, documented rather than fixed:
   - `list.mjs`'s `textFormatter` called `terminalFormatter` positionally while `terminalFormatter` destructured a single object argument, so plain-text-format `GET /credentials/list` output threw rather than rendering.
   - `package.json`'s `description` was the empty string, so the server-visible plugin `summary` (which `plugable-express` derives from the package description, not from the `summary` const exported by `src/index.js`) was blank.
   - The package shipped no `files` allowlist while `.gitignore` excluded `/dist`, so the published tarball relied on npm's force-include of the `main` file and carried no other `dist/` artifact.

6. **Final version number**, matching whatever [`003-mark-package-deprecated-and-bump-version.md`](./003-mark-package-deprecated-and-bump-version.md) sets `package.json`'s `version` to (planned: `1.0.0-alpha.5`). The two tasks are parallel-eligible, so either order is possible — read task 003's own requirement, or the already-landed `package.json` if it ran first. Do not hardcode a version without checking.

7. **Note that the repository's source is left intact**, not deleted, per policy — and that no re-export shim is registered with any live server. The thin `export * from './credentials'` left at `src/index.js` by Phase 10 is a build entry point inside this package's own bundle, not a second live plugin registration.

8. **Keep the document reachable and consistent.** The current README links `AGENTS.md`, `docs/liq-credentials-spec.md`, and `docs/project-structure.md`. Retain pointers to whichever of those remain meaningful as historical record; do not leave a dangling link. `docs/liq-credentials-spec.md` may be left as historical record or annotated at the executor's discretion, but is not this task's primary deliverable.

## Validation

- `README.md` exists at the repository root and its content reflects the supersession notice, not the pre-fold standalone-plugin framing (installation and `curl` usage examples) it carried before this task ran.
- The supersession banner names `@sdlcforge/core-server` and appears at or near the top of the document.
- The two-handler statement is present and the "no scoping, no rotation" point is explicit.
- All three disclosed defects are present, each traceable to the specific file or `package.json` field named in the source inventory.
- The consumer inventory statement matches the source inventory's own finding (single npm dependent: `core-server`). Re-run the grep as of this task's execution rather than restating a stale claim — a new dependent could plausibly have appeared across the Phase 10 → Phase 11 gate delay. If it has changed, report it rather than silently broadening or narrowing the claim.
- The version number stated in the README matches `package.json`'s actual `version` at the time this task lands.
- No internal link in the rewritten README is dangling.
- `make qa` (test + lint) remains green — README changes should not affect it, but confirm rather than assume.
- No other file is modified by this task.

## References

- [`plan/notes/liq-credentials-source-inventory.md`](../notes/liq-credentials-source-inventory.md) — source of the route surface, defect list, and consumer inventory this README restates.
- [`dev-core-consolidation-contract.md#source-package-retirement-policy`](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy) — the policy this README implements the documentation half of.
- `/Users/zane/playground/liquid-labs/liq-controls/worktrees/plan/core-server-domain-consolidation/plan/phase-02-retire-liq-controls/002-author-readme-superseded-notice.md` — the sibling donor's equivalent task in this same plan-group.
- `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — the original precedent (superseded banner, accurate description, consumer inventory, known-defect disclosure).
