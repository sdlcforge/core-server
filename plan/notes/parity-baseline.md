# Parity Baseline

## Purpose and scope

Records why this plan cannot verify its own central constraint yet, and what a research pass must establish before Phase 3's tasks can be written. The constraint is "no consumer-facing behavior change"; the problem is that `core-server` currently has no test, snapshot, or artifact that observes any of the three donors' behavior at all, so there is nothing to compare against.

## What exists today

- `src/lib/test/app-init.test.js` and `src/lib/test/golden-api-spec.test.js` both pass `skipCorePlugins: true`, which makes `appInit` skip the `loadPlugins` call over the server package root entirely — the only call site that ever reads `explicitPlugins`. No donor is loaded in either test.
- `test/__snapshots__/golden-api-spec.json` holds 35 routes, all of them `plugable-express` core routes.
- `test/__snapshots__/golden-plugins-list.json` is `[]`.
- `test/test-server.js` (the local integration pass) and `test/run-integration-tests.sh` (the Docker multi-version pass) start a real server. The Docker pass's stated primary purpose is exactly to verify explicit-plugin loading on first startup, so it is the most promising existing home for a real baseline — but it checks that startup *succeeds*, not what the loaded surface *contains*.

## The open feasibility question

The wave manifest's Wave 3 entries name a live bug, `ynGa`: "`appInit()` crash from the `serverHome` to `serverConfigRoot` rename because `liq-credentials`/`liq-credentials-db`/`liq-integrations`/`liq-work` still read the old key." If `appInit` still crashes against the full 11-package explicit tier, a real loaded-surface baseline cannot be captured by simply removing `skipCorePlugins: true`, and Phase 3 has to either fix enough of that first or capture the baseline a different way.

Partial evidence: `liq-credentials`' own source has since been updated — `src/setup.mjs` and `src/handlers/credentials/import.mjs` both read `serverConfigRoot`, not `serverHome`. That is one of the four packages named. The state of the other three, and of the transitive `@liquid-labs/liq-credentials-db`, is unverified.

**This must be answered empirically, by actually starting the server against the real explicit tier, before Phase 3's tasks are written.** The answer determines whether Phase 3 is "add assertions to an already-working path" or "make the path work first."

## What the baseline must capture

Whatever form it takes, it has to cover every observable the absorption could perturb — not just routes, since one of the three donors contributes no routes at all:

- **Registered endpoints** — each handler's `method` and its `path`/`paths` array, plus the `npmName` provenance recorded into `app.ext.handlers` by `register-handlers.js`. Note that `npmName` provenance necessarily changes for absorbed endpoints; see [plugin list visibility](./plugin-list-visibility.md).
- **Registered path variables** — the merged set, and that each name is registered exactly once. `registerPathVar` throws `Path variable '<name>' is already registered.` on a duplicate, and `pathToRe` throws `Unknown variable path element type '<name>'` on an unregistered one used in a route. `liq-credentials` registers `credential`; `liq-controls` registers none but consumes `orgKey` from `liq-orgs`.
- **Enqueued setup methods** — each method's `name` and `deps`, and that `@liquid-labs/dependency-runner` finds every `deps` entry satisfiable. This is where the [`load orgs` hazard](./in-tree-plugin-registration.md#the-load-orgs-hazard) shows up.
- **Registered integration providers and hooks** — the `providerFor`/`name`/`npmName` triple and the hook names under each. Seven hook registrations across two providers from `issues-github`, plus one provider with one hook from `controls`.
- **`app.ext` keys installed by setup** — notably `app.ext.credentialsDB`, which `liq-work` and `issues-github` both read.
- **The two plugin-list endpoints' response bodies** — with the accepted diff enumerated in advance, per the visibility decision.

## Sequencing

Phase 3 runs first precisely because this baseline is independent of the registration-mechanism decision: it observes the *current* npm-dependency world, which no pending decision changes. It is also the artifact that makes Phase 5's per-donor absorb tasks verifiable one at a time rather than only in aggregate at the end.

## Related documents

- [`absorbed-surface-inventory.md`](./absorbed-surface-inventory.md) — the hand-taken inventory this baseline mechanizes.
- [`plugin-list-visibility.md`](./plugin-list-visibility.md) — the one baseline diff that is expected rather than a regression.
