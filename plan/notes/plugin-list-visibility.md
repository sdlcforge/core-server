# Plugin List Visibility

## Purpose and scope

Records the one place where "no consumer-facing behavior change" and "these are no longer separate plugins" genuinely conflict, so the conflict is decided deliberately rather than discovered during implementation. Target note for the corresponding user question.

## The conflict

Two endpoints report *which plugins are loaded*, by identity, and both change content when a plugin stops being a plugin:

- **`GET /server/plugins/list`** renders `app.ext.handlerPlugins`, which `plugable-express`'s `loadPlugin()` appends to as `{ summary, npmName, version }` — `npmName` from the package's `name`, `summary` from its `description`, `version` from its `version`. After absorption, `@liquid-labs/liq-controls` and `@liquid-labs/liq-credentials` are no longer discovered packages, so nothing appends an entry for them.
- **`GET /server/plugins/integrations/list`** renders `app.ext.integrations.listInstalledPlugins()`, which is built from the `npmName` each provider passes to `register(...)`. `@liquid-labs/liq-controls` (provider for `controls`) and `@liquid-labs/liq-integrations-issues-github` (providers for `tickets` and `pull request`) both self-identify by npm package name there.

The route, status code, and response *shape* of both endpoints are unaffected. The *content* is not: three package identities disappear from a client's view of the server.

## The options

1. **Accept the content change.** The three packages genuinely stop existing as packages; a client asking "which plugins are installed" gets a truthful answer. This matches what `plugable-express` did for its own two absorbed packages under `framework-consolidation` — absorbed capability became built-in and stopped being reported as an installed plugin. Requires the change to be stated in the docs updated by this plan.
2. **Preserve the entries** by having the in-tree registration path keep supplying the historical `npmName` values (`@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, `@liquid-labs/liq-integrations-issues-github`), so both endpoints report exactly what they report today. Byte-identical output, at the cost of the server permanently reporting npm packages that no longer exist — and of the retired repositories' names outliving the repositories.
3. **Re-identify under `@sdlcforge/core-server`'s own identity** — report the absorbed capability under the host package name (or under a first-party name such as `core-controls`/`core-credentials`), preserving the shape and the fact that the capability is present, while telling the truth about where it now lives. A middle option: content changes, but no capability silently vanishes from discovery.

Whichever is chosen applies to `providerFor`/`providerTest` registration identity as well as to `handlerPlugins`, since the integrations registry keys provider lookup on `providerFor` (unchanged in all three options) but reports `npmName`.

## Recommendation

**Option 3**, with option 1 as an acceptable fallback and option 2 rejected.

Option 2 is the only one that keeps the output byte-identical, but it buys that by making the server permanently assert the existence of three npm packages that will have been deprecated and archived by the end of this plan-group — a client asking "what is installed" would be told something false, and the answer gets more false over time rather than less. That is a worse outcome than a truthful diff, and it also outlives every reason for it.

Option 1 has direct precedent: `framework-consolidation` absorbed `liq-integrations` and `plugable-server-documentation` into `plugable-express` and let both simply stop being reported. But those two were *mechanism* packages, and no capability visibly vanished from the integrations registry when they went. Here, `liq-controls` and `liq-integrations-issues-github` are registered **integration providers** — under option 1 the `controls`, `tickets`, and `pull request` providers keep working while `GET /server/plugins/integrations/list` stops naming anything as their source, which reads as a capability having disappeared when it has not.

Option 3 keeps every provider attributable, tells the truth about where the code now lives, and preserves the property a client actually depends on: every registered capability has a named source. Concretely, register the absorbed submodules under `@sdlcforge/core-server`'s own package name and version, so `handlerPlugins` gains no phantom entries and `providerFor` lookup — which keys on the unchanged `providerFor` noun, never on `npmName` — is untouched.

Note that the same value also becomes the `npmName` provenance stamped into every absorbed endpoint's `app.ext.handlers` entry, which is what `GET /server/api` and the golden API spec snapshot record. That change is unavoidable under any of the three options except 2, and matches what `dev-core` accepted for its own four absorbed submodules.

## Consequence for the parity check

The characterization baseline this plan builds has to know the answer in advance: under option 1 or 3 the baseline for these two endpoints is expected to differ before and after absorption, and the accepted diff must be enumerated rather than treated as a regression. Under option 2 the baseline is expected to match exactly.
