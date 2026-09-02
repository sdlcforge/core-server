# Phase — Declare The In-Tree Component Manifests

## Goals

Fill in the capability declarations for the three plugin components `core-server` actually owns — `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/` — turning the structural block from the previous phase into a real graph node with provides and requires.

This is the phase that writes down the facts that exist today only in code, in a test comment, or nowhere. Three of them are named in the change request:

- **`src/credentials/` requires `setupArg:serverConfigRoot`.** `src/credentials/setup.mjs:6` destructures it from the `setup()` argument object; a rename that removes the name yields `undefined` at destructure with no property access to fault on. This is the in-tree half of `ynGa`, and declaring it is what makes the original `serverHome` → `serverConfigRoot` break detectable at build time instead of at a crash somewhere downstream.
- **`src/credentials/` provides `appExt:credentialsDB` at `load`.** A bare property assignment with no checkpoint and no duplicate detection. This is the provider half of the GITHUB_API ordering gap; declaring it with a provable load position is the precondition for anything ever checking it, even though nothing in `core-server`'s own tree requires it at `load`.
- **All three components collide with their absorbed donors.** `liq-controls`, `liq-credentials`, and `liq-integrations-issues-github` are installed but inert. Each duplicates an exclusive `provides` of an in-tree component, so re-introducing any one becomes a `conflict` naming both providers — including `liq-integrations-issues-github`, whose double-load today is completely silent and registers both integration providers twice with no error ever emitted. This is the one substantial defect class this plan closes with no dependency on any third party.

The phase separates from the previous one because a wrong capability declaration is a different failure than a wrong participant list, and because the structural block plus its drift guard is independently useful and independently reviewable.

## Inputs

- The `plugable.host` block and the `verifyHostDeclaration()` drift guard from the preceding phase.
- The derived declarations in [plugin-set-inventory.md](../notes/plugin-set-inventory.md), each with its source citation. These were derived from this worktree's real source, in the upstream's decided vocabulary, and are the starting draft — not a specification to transcribe unread.
- The framework's intrinsic manifest, which is what `setupArg:serverConfigRoot`, `appExt:setupMethods`, `appExt:integrations`, and `setupMethod:setup integrations` resolve against. Without it these requirements dangle and the phase cannot produce a closing graph.
- `src/controls/setup.mjs`, `src/credentials/setup.mjs`, `src/integrations-issues-github/index.js`, and the handler and integration modules each reaches — the authoritative statement of what is actually coupled.

## Outputs

- Three populated `components:` entries under `plugable.host.builtins`, in `submodules` order, each declaring its provides and requires with `via:` text naming the mechanism so a diagnostic reads as a sentence rather than a symbol.
- Both `integration:` provides that carry `providerTest: usesGitHubIssues` (`integration:tickets`, `integration:pull request`) declared with `conditional: true` and a `via:` note citing the `providerTest`, per the framework's now-shipped `conditional` grammar (`plugable-express`'s `docs/plugin-manifest-schema.md`, `### conditional` — merged 2026-08-28, and whose own worked example is this exact `core-server` case). A static, unconditional `provides` would over-claim: the graph would close and `No provider found for 'tickets'` could still fire at request time for a non-GitHub project. `conditional: true` keeps the requirement fatal when no provider exists at all, while recording a `satisfied-conditionally` finding at info severity rather than asserting something false. This was an open question as of the 2026-08-26 grounding pass ([plugin-set-inventory.md](../notes/plugin-set-inventory.md)) and is resolved by [2026-09-01-blocker-reverification.md](../notes/2026-09-01-blocker-reverification.md)'s Q3 finding — no plan-authored choice between accepting an over-claim or omitting the provides is needed.
- A recorded note that `@liquid-labs/liq-credentials-db` is covered **transitively** — it receives `serverConfigRoot` as an ordinary constructor argument, which no capability kind names, and `src/credentials/`'s own declaration is the coupling that stands for it. Without this written down, a reader correctly concludes the manifest says nothing about that package and draws the wrong conclusion about why.
- A `credential:GITHUB_API` requirement declared `optional: true` on the `issues-github` component, with its reason. A missing GitHub token does not make the server unstartable; it makes three hook bodies fail when called. Marking it required would hard-fail a server that is perfectly serviceable for every non-GitHub request.
- Explicitly **not** produced: a `credential:GITHUB_API` *provide*. `src/credentials/setup.mjs` constructs an empty `CredentialsDB` and registers no credential type; the registrar is `@liquid-labs/liq-projects`, via a dependency of its own. Declaring a provide `core-server` does not perform would be a false claim in a graph whose whole value is that its claims are true.
