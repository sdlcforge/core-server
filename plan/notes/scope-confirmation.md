# Scope Confirmation

## Purpose and scope

Records a direct conflict between the plan-group's own wave-manifest entry and the planning request this plan was authored from, plus two smaller scope items that need a decision before task breakdown. Target note for the corresponding user questions.

## Conflict: is `liq-integrations-issues-github` absorbed or not?

The `core-server-domain-consolidation` entry in [`plan/waves/sdlcforge-modernization/manifest.yaml`](../waves/sdlcforge-modernization/manifest.yaml) states:

> Fold `@liquid-labs/liq-controls` … and `@liquid-labs/liq-credentials` … into `@sdlcforge/core-server` directly. **`liq-integrations-issues-github` stays a separate product-level plugin** (real GitHub business logic, depends on `liq-projects-lib`) rather than folding in here, but is tracked as a participant because this plan must also harden the currently-implicit, undeclared, load-order-dependent contract where it calls `credentialsDB.getToken('GITHUB_API')` trusting `liq-projects` (via `credentials-db-plugin-github`) already registered that key — no schema or startup-time check exists today.

The `framework-consolidation` plan summary in `plugable-express` says the same thing from the other side: "`@liquid-labs/liq-integrations-issues-github` — the concrete GitHub provider — is explicitly out of scope for this plan-group and stays a product-level package, tracked in the sibling `core-server-domain-consolidation` plan-group."

The planning request this plan was authored from says the opposite: all three plugins fold in, all three donor repositories retire, and each donor's own retirement phase declares a dependency on this project's absorb phase. It also anticipates the `determineCurrentMilestone` inlining happening in the donor's own slice — which only makes sense if the donor is being absorbed here.

This plan is written on the assumption that **the request supersedes the manifest** (it is the more recent, more specific instruction, and it accounts for the donor-side retirement work). The manifest entry's description should be amended to match once confirmed, the same way this wave's earlier plan-groups amended theirs in place.

## Open: is the `GITHUB_API` credential-contract hardening in scope?

The manifest entry names a second deliverable for this plan-group that the request does not mention: hardening the implicit, load-order-dependent contract where the GitHub integration calls `credentialsDB.getToken('GITHUB_API')` and trusts that `liq-projects` (via `credentials-db-plugin-github`) has already registered that key, with no schema or startup-time check.

Absorbing both sides of that contract into `core-server` (the credentials DB wiring and the GitHub provider) makes this plan the natural place to add a startup-time check — but Wave 3's `compile-time-manifest-framework` / `compile-time-manifest-sdlc-server` plan-groups are explicitly chartered to fix this class of problem at the mechanism level. Doing it twice would be waste. Needs an in/out call.

## Open: does this plan bump and publish `@sdlcforge/core-server`?

Each donor's retirement phase depends on this project's absorb phase landing. If those retirements include unpublishing or archiving, and if any consumer resolves `@sdlcforge/core-server` from the registry rather than locally, a version bump and publish belongs at the end of this plan — as it did in the `framework-consolidation` plan for `plugable-express`. That plan also established that `npm publish` is reliably blocked by this environment's Bash-permission classifier and has to be reported for manual user action. The request does not mention release at all.

## Recommendations from the second planning pass

Stated so the decisions can be confirmed rather than re-derived.

**On the `liq-integrations-issues-github` conflict: the request wins, and the manifest entry should be amended.** The planning request is both more recent and more specific, and it is internally coherent in a way the manifest entry is not — it accounts for the donor's own retirement phase and for the `determineCurrentMilestone` inlining task, neither of which makes sense unless the donor is being absorbed. This plan is written on that basis. The manifest's `core-server-domain-consolidation` description should be amended in place, exactly as this wave's `pluggable-express-rename` and `sdlcpilot-cli-rename` entries were amended when reality diverged from their original text. That amendment is a manager action, not something this plan's own phases perform.

**On the `GITHUB_API` hardening: recommend out of scope here, deferred to Wave 3.** Wave 3's `compile-time-manifest-framework` and `compile-time-manifest-sdlc-server` are chartered in the manifest's own words to fix "the class of bug that includes ynGa … and the GITHUB_API credential-registration-order risk flagged in Wave 2 — both are instances of undeclared runtime `app.ext` coupling this framework should make declared and checkable." Building a one-off startup check here means building it twice and then deleting the first one. Absorbing both sides of the contract into `core-server` does make the coupling *easier* to fix later, which is a genuine contribution of this plan without doing the fix. Record it as a follow-up item rather than a task.

**On the release: recommend yes, one task at the end of the final phase**, mirroring `framework-consolidation`'s own precedent — a version bump plus an attempted `npm publish`, with the exact command handed to the user verbatim when the environment blocks it. The donors' retirements are gated on this project's absorption landing, and a donor that has been deprecated on npm while `core-server`'s replacement is unpublished leaves a window where neither is installable. Low cost to include; the failure mode of omitting it is only discovered by a consumer.
