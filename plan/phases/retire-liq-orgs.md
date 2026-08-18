# Phase 6 — Retire liq-orgs

## Purpose and scope

Phase summary for the retirement phase of the `dev-core-consolidation` plan-group's `liq-orgs` slice. **All four tasks execute in `liq-orgs`** (`/Users/zane/playground/liquid-labs/liq-orgs`); task 001 additionally *reads* the `sdlcforge/dev-core` checkout without modifying it.

## Goals

End `@liquid-labs/liq-orgs` as a final, working, clearly-labelled superseded release, following D10 exactly: verify first, then documentation and metadata, then the publish attempt. `src/` is not stripped, and no re-export shim is published.

Two D10 details need adapting for this donor, and the adaptation is the reason this phase is not a copy of `liq-projects` phase 3:

- **D10 step 2 says "README.md rewritten as a superseded notice." liq-orgs has no README.** There is nothing to rewrite; the notice must be authored from scratch, and it is the only prose description this package will ever have. It has to say what the package did before it can meaningfully say what supersedes it.
- **D10's supporting claim that "the only npm dependent of any donor is `@sdlcforge/core-server`" is false for liq-orgs** (correction C2). `liq-roles` and `liq-test-lib` also declare it. Both are dormant and neither is loaded by the live server, so the retirement decision is unaffected — but D10 step 2 requires a *known-consumer inventory*, and inheriting liq-projects's wording would make that inventory wrong. The notice must name all three npm dependents and the `app.ext` consumers separately.

The verification gate exists because everything after it is either irreversible (`npm publish`, `npm deprecate`) or actively misleading if premature (a superseded notice pointing at a package that does not yet carry the code). It is read-only by construction.

## Inputs

- Phase 5 having fully landed: `src/orgs/**` present in dev-core with history preserved, dependencies unioned, aggregator wired, docs written, and dev-core green.
- `liq-orgs` at its post-restructure state: `src/orgs/…` in place, root `src/index.js` a thin re-export, still green at 1 suite / 37 tests, still publishable.
- `plan/notes/liq-orgs-source-inventory.md` for the file census and route/path-var/setup-method inventories the gate checks against, the three-dependent consumer inventory the notice must carry, and the pre-existing defects the notice must disclose.
- Current package metadata to be superseded: version `1.0.0-alpha.7`, `description: ""`.
- The precedent set by the completed sibling retirement of `@liquid-labs/liq-integrations` under `framework-consolidation`, and by `liq-projects` phase 3 in this same plan-group.

## Outputs

- A read-only verification report confirming dev-core carries everything liq-orgs had — or a halt, if it does not.
- `README.md`, newly authored: superseded banner naming `@sdlcforge/dev-core`, an accurate short statement of what the package did and what `app.ext` contracts it published, migration instructions, the honest three-npm-dependent plus `app.ext`-consumer inventory, and disclosure of the known-broken endpoints so no one adopts the final release expecting working routes.
- `package.json` with a deprecation-bearing `description` (replacing the empty string) and version `1.0.0-alpha.8`, `make qa` green.
- An attempted `npm publish` and `npm deprecate`, with the exact commands recorded verbatim for the user if the environment blocks them, and GitHub repository archival recorded as an explicit user decision rather than performed.
