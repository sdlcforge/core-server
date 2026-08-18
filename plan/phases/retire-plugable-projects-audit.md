# Phase 13 — Retire plugable-projects-audit

## Purpose and scope

Phase summary for the retirement phase of the `dev-core-consolidation` plan-group's `plugable-projects-audit` slice. **All four tasks execute in `plugable-projects-audit`** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`); task 001 additionally *reads* the `sdlcforge/dev-core` checkout without modifying it.

This is the final phase of the fifth and last slice: when it completes, the federated `dev-core-consolidation` plan-group is done.

## Goals

End `@liquid-labs/plugable-projects-audit` as a final, working, clearly-labelled superseded release, following D10 exactly: verify first, then documentation and metadata, then the publish attempt. `src/` is not stripped, and no re-export shim is published.

Three D10 details need adapting for this donor, and the adaptations are why this phase is not a copy of any sibling's:

- **D10 step 2 says "README.md rewritten as a superseded notice." This package has no README** — and its `package.json` `description` is the empty string, so there is no prior prose anywhere to inherit. The notice must be authored from scratch and is the only description this package will ever have; it has to say what the package *did* before it can say what supersedes it. Same situation `liq-orgs` faced.
- **The packaging defect (correction C9) is at its worst here, and the remedy is part of this phase, not a follow-up.** `npm pack --dry-run` from the main checkout lists **50 files** against a published tarball of **24**. The 26 extras are Flow session metadata under `.flow/` (carrying local absolute paths and a session UUID), `plan/manifest.yaml`, and **23 files under `worktrees/` — a complete nested second copy of the package, including a 403 kB `package-lock.json`.** A final labelled release shipping that would be an odd last act. The remedy is a `files` allowlist derived from the actual published tarball, which is readable without a network call from an installed copy in `core-server`'s `node_modules/`.
- **The version equals npm's `latest`.** `1.0.0-alpha.2` locally, `1.0.0-alpha.2` on the registry — so, unlike a donor that is already ahead of its published version, the bump to `1.0.0-alpha.3` is not cosmetic: without it the publish is rejected outright.

The verification gate exists because everything after it is either irreversible (`npm publish`, `npm deprecate`) or actively misleading if premature (a superseded notice pointing at a package that does not yet carry the code). It is read-only by construction — and for this donor it carries one extra, load-bearing check that no sibling's gate has: **confirming that dev-core's `src/index.mjs` aggregator survived the absorption** (correction C17). That failure mode produces a green build in dev-core and would otherwise be caught by nothing.

Unlike the `liq-work` slice, this phase gates on **green** rather than on "failure set unchanged": correction C15 records that the plan-group's Node-26 `SlowBuffer` breakage does not reach this donor, because none of its four dependencies touches the `github-toolkit → octocache → octokit → jsonwebtoken` chain. Measured, not assumed.

## Inputs

- Phase 12 having fully landed: `src/projects-audit/**` present in dev-core with history preserved, the dependency union applied, the aggregator wired, the audit surface documented, and the consumer handoff extended.
- `plugable-projects-audit` at its post-phase-11, post-restructure state: `src/projects-audit/…` in place, root `src/index.mjs` a thin re-export, no `file:` dependency spec, still green at 1 suite / 1 test.
- `plan/notes/plugable-projects-audit-source-inventory.md` — **A1** the route table the gate checks against, **A6** the single-npm-dependent consumer inventory the notice must carry, **A7** the packaging defect and the 24-file published reference, **A8** the defects the notice must disclose, **A0** the current metadata to be superseded (`version 1.0.0-alpha.2`, `description ""`).
- The unpacked published tarball at `/Users/zane/playground/sdlcforge/core-server/node_modules/@liquid-labs/plugable-projects-audit/` — the reference the `files` allowlist is derived from, and against which its effect is checked.
- The precedent set by the completed sibling retirement of `@liquid-labs/liq-integrations` under `framework-consolidation`, and by the three sibling retirement phases in this plan-group.

## Outputs

- A read-only verification report confirming dev-core carries everything this package had — including the four routes with byte-identical `path`, `method`, `parameters`, and `help`, and the surviving aggregator — or a halt, if it does not.
- `README.md`, newly authored: superseded banner naming `@sdlcforge/dev-core`, an accurate short statement of what the package did (npm dependency auditing, explicitly **not** policy/compliance) with its four endpoints, migration instructions carrying both exact error strings a non-atomic swap produces, the honest single-npm-dependent inventory, and disclosure of the four inherited defects.
- `package.json` with a deprecation-bearing `description` (replacing the empty string), version `1.0.0-alpha.3`, and `"files": ["dist", "src", "make", "Makefile", ".sdlc-data.yaml"]` — taking the pack list from 50 files to 24–25 and silencing npm's `gitignore-fallback` warning, whose disappearance is the proof the allowlist is in effect. `make qa` green.
- An attempted `npm publish` and `npm deprecate`, with the exact commands recorded verbatim for the user if the environment blocks them (the expected outcome per D9), and GitHub repository archival recorded as an explicit user decision rather than performed.
