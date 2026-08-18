# Phase 11 — projects-audit Dependency Remediation

## Purpose and scope

Phase summary for the first phase of the `dev-core-consolidation` plan-group's `plugable-projects-audit` slice. **Its single task executes in `plugable-projects-audit`** (`/Users/zane/playground/liquid-labs/plugable-projects-audit`).

## Goals

Make `@liquid-labs/plugable-projects-audit` installable and testable **from a fresh clone**, which it is not today.

`package.json` declares `"@liquid-labs/http-smart-response": "file:.yalc/@liquid-labs/http-smart-response"`. This is not working-tree residue — it is committed, and it is in the *published* `1.0.0-alpha.2` (visible in `sdlcforge/core-server/bun.lock:374`). `.yalc/` is gitignored, so it is absent from every fresh clone and every Flow task worktree, and the resulting failure is the quiet kind: `npm install` reports success while creating a dangling symlink, `make build` and `make lint` stay green, and only `make test` fails, with `Cannot find module '@liquid-labs/http-smart-response'`.

This phase exists as a phase, rather than as a step inside the restructure task, for one concrete reason: **every later task in this slice runs in a fresh Flow task worktree**, and until this lands none of them can run `make test` at all. It is also the only phase in this slice that is unblocked today, so dispatching it early costs nothing and de-risks everything after it.

The fix is a *defect repair*, not a D11-forbidden dependency upgrade. The `.yalc/` copy on disk is `1.0.0-alpha.6`, npm's `latest` is `1.0.0-alpha.6`, `liq-projects` (and therefore `@sdlcforge/dev-core`) already declares `^1.0.0-alpha.6`, and all three resolve to the identical published artifact. The resolved code does not change; only the resolution mechanism does. The precedent is the `liq-orgs` slice, directed to revert a stray `file:.yalc/@liquid-labs/playground-monitor` entry for the same class of reason.

## Inputs

- `plugable-projects-audit` at `main` = `c50da02`: green in the **main checkout** (1 suite / 1 test, lint clean, bundle built), and **not** green in a fresh clone.
- `plan/notes/plugable-projects-audit-source-inventory.md` — **A3**, which records the defect and the end-to-end verified remedy, and **A2**, the dependency table.
- The verified facts that `@liquid-labs/http-smart-response@1.0.0-alpha.6` is published, is npm's `latest`, and is what `.yalc/` currently holds.

## Outputs

- `package.json` with `"@liquid-labs/http-smart-response": "^1.0.0-alpha.6"` — a one-line diff.
- `package-lock.json` regenerated, with no `"link": true` entry and no `.yalc` reference anywhere. (A plain `npm install` after the `package.json` edit does **not** clear the stale lock entry; the lockfile must be deleted and rebuilt. This was measured.)
- A demonstration that a fresh clone with no `.yalc/` directory passes `npm install && make build && make test && make lint`, with the built bundle exporting the identical four routes — proved by a mechanical diff of the route list, not by inspection.
- No change under `src/`, and no change to `.yalc/` or `yalc.lock` (both gitignored user working-tree state; `yalc.lock` becoming stale is noted, not acted on).
