# Write Stopgap README and Description

## Purpose and scope

`liq-projects` has no `README.md` and an empty `package.json` `description` field — a notable gap since this plugin itself exposes a `/projects/:projectName/document` route that generates documentation *for other projects* (`package.json` even carries the `liq.tags` entry `implements:documentation`). The modernization synthesis (`/tmp/flow-sdlc-modernization/synthesis.md` §6) upgrades this from "optional stopgap" to **required**, specifically because of that irony, while explicitly deferring the *full* Flow doc set (spec, architecture) until this package's boundary is settled — `liq-projects` is a near-certain merge candidate into a consolidated `sdlc-core` package alongside `liq-work` and `liq-orgs` (see synthesis §2), and a full doc set written now would likely need a rewrite within the same modernization cycle.

This task writes a scope-and-routes README good enough to survive that eventual merge as a section of the merged package's docs — not a throwaway.

## Requirements

- Fill in `package.json`'s empty `"description"` field with a one-line description of this package's actual role (a "project" = the union of an NPM package, a local playground clone, and a GitHub repository, and this plugin owns that triad's full lifecycle — see the domain summary in `/tmp/flow-sdlc-modernization/liq-projects.md`, "Domain & Capabilities" section, for source material).
- Write `README.md` covering:
  - What a "project" means in this system (the three-artifact triad above) and this plugin's role managing it.
  - The route surface at a summary level: create, setup, detail, rename, close, archive, destroy, document, update, releases/publish (each under `/projects`, most with both explicit-`:projectName` and current-directory-"implied" variants) — a table or bulleted list is fine; do not reproduce full per-parameter API documentation (the auto-generated JSDoc HTML under `docs/` already covers that level of detail — link to it rather than duplicating it).
  - How this plugin integrates with `@liquid-labs/plugable-express` (the `name`/`summary`/`handlers`/`setup` export shape) at a brief, orienting level — not a deep architecture writeup.
  - A short "Note on package naming" callout disambiguating this package (`@liquid-labs/liq-projects`) from the separate, similarly-named `@liquid-labs/liq-projects-lib` package — the modernization research explicitly found this naming collision "nearly derailed the research itself" and flagged it as a hazard for future contributors. State plainly that they are different packages with different purposes.
  - A brief note that this package is part of an active modernization effort and is a likely merge candidate into a future consolidated package — so a reader isn't surprised if the package boundary looks different later.
- Do **not** write `docs/architecture.md`, a spec document, or any other Flow-standard doc beyond this README — those are explicitly deferred (see the synthesis's documentation recommendation for this project) until the merge/consolidation decision lands.
- Source material for this README already exists in `/tmp/flow-sdlc-modernization/liq-projects.md` (the modernization research note for this package) — read it for accurate route names, dependency facts, and the naming-collision detail rather than re-deriving everything from scratch, but verify claims against the actual current source before writing them into the README (the note is a research artifact, not itself authoritative).

## Validation

- `README.md` exists at the package root.
- `cat package.json | grep '"description"'` shows a non-empty, accurate description.
- README does not claim capabilities the code doesn't have — spot-check the route list against `src/handlers/projects/index.js` and `src/handlers/projects/releases/index.js`.
- README explicitly disambiguates `liq-projects` from `liq-projects-lib`.
- No `docs/architecture.md`, spec doc, or other new Flow-standard doc file was created by this task.

## Metadata

architectural_impact: false
