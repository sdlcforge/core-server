# Phase 9 — Retire liq-work

## Purpose and scope

Phase summary for the retirement phase of the `dev-core-consolidation` plan-group's `liq-work` slice. **All four tasks execute in `liq-work`** (`/Users/zane/playground/liquid-labs/liq-work`); task 001 additionally **reads** the `sdlcforge/dev-core` checkout without modifying it.

## Goals

End `@liquid-labs/liq-work` as a final, working, clearly-labelled superseded release, following D10 and the shape the two sibling slices established: **verify first**, then documentation and metadata, then the publish attempt. No code deletion, no re-export shim, no repository archival.

The ordering is not stylistic. Everything after task 001 is either irreversible (`npm publish`, `npm deprecate`) or actively false if premature — a superseded notice and a deprecation message both *assert* that `@sdlcforge/dev-core` carries the code. So task 001 is a read-only gate that halts the phase on any gap and repairs nothing, because repairs belong to phases 7 and 8, re-run.

Two things distinguish this gate from its siblings', and both are checks of guarantees unique to this slice:

- **`crossLinkDevProjects` must be present in dev-core as inlined source, not as a dependency** — `diff`ed against its `liq-projects-lib` origin, imported relatively by `work-db.mjs`, and actually present in the built bundle (an externals misconfiguration that dropped it would be invisible until runtime).
- **The test fixture must be reproducible in dev-core**, demonstrated from a fresh dev-core clone rather than assumed from phase 7's report. That is the entire point of phase 7 task 001, and dev-core is where it has to hold.

Two things this phase deliberately does **not** do:

- **It does not gate on `make qa` green.** The sibling retirements do, and cannot here: `work-db.test.js` fails to load on Node ≥ 24 (`buffer-equal-constant-time` dereferences the removed `SlowBuffer`), a pre-existing environment-wide defect that also fails 5 of `liq-projects`'s 8 suites, is out of scope under D11, and is flagged to the manager. The gate throughout is *"the failure set is unchanged"*. Forcing it green with an `overrides` entry or a Jest polyfill would smuggle a real dependency change into a metadata task and would make the final published artifact differ from every prior release in a way nobody reviewed. It also means `npm version` cannot be used for the bump (its `preversion` hook runs `qa`), so task 003 edits the `version` field directly.
- **It does not hide the Node ≥ 24 breakage.** Both the README notice and the handoff say plainly that the package does not run on current Node, that this is pre-existing rather than caused by the retirement, and that migrating to dev-core does **not** fix it — because dev-core inherits it. A superseded notice that quietly omits this would be a disservice to the one person most likely to read it.

Retirement is a labelled final release rather than a deletion because stripping `src/` would break any server still loading the old package, and no shim is published because — per correction C1 — loading a shim alongside dev-core does not silently shadow, it **crashes at startup** with `Path variable 'workKey' is already registered.` A clean atomic swap is strictly better than either.

## Inputs

- **Phase 8 fully landed and merged in both repositories.** If dev-core has no `src/work/` at all, task 001 reports that immediately and stops rather than enumerating detail.
- Task 008-001's recorded post-restructure file census and task 008-002's recorded pre-merge baseline and post-absorption counts — the real measured numbers the gate compares against, rather than numbers derived from a plan document.
- `plan/notes/liq-work-source-inventory.md` — the authoritative 30-route table (**W1**), file census and mapping (**W2**), dependency union (**W3**), `crossLinkDevProjects` evidence (**W4**), measured baseline and both defects (**W5**), the single-npm-dependent consumer inventory (**W6**), and the `app.ext` contracts (**W7**).
- The current package facts: `@liquid-labs/liq-work@1.0.0-alpha.10` locally **and** as npm's `latest` — the working tree matches the published release, so `1.0.0-alpha.11` is the next free version (re-checked by task 003 before it is written).
- The verified consumer inventory: **exactly one** npm dependent, `@sdlcforge/core-server`, via a registry range `^1.0.0-alpha.9`. D10's "the only npm dependent of any donor is core-server" **holds** for liq-work — do not inherit `liq-orgs`'s three-dependent wording (correction C2 was that package's situation, not this one).
- The existing `README.md`, whose accurate substance is preserved in `@sdlcforge/dev-core` by phase 8 task 002, so this phase can condense rather than duplicate it.
- The known `http-errors` defect: used by 16 modules, undeclared in `package.json`, resolving today only by hoisting from `octocache`. Task 003 treats declaring it as an explicit decision point, with the recommendation to add it and a byte-identical-`dist` check as the evidence that nothing changed.

## Outputs

- A recorded pass/fail verdict from task 001, per numbered requirement, with actual command output as evidence — and a clear separation between **known-and-accepted** failures (the `SlowBuffer` suites) and **gaps** (anything else), so a reader cannot mistake one for the other. Nothing modified in either checkout.
- `README.md` rewritten as a superseded notice: `@sdlcforge/dev-core` named above the fold; a condensed but accurate statement of the domain model and the 30-route surface; migration instructions covering server operators (atomic swap, with the exact error string), route consumers (no change), and `work-db.yaml` holders (no data migration, because `WORK_DB_PATH` is preserved); an honest single-dependent inventory; the Node ≥ 24 disclosure; and the stale `liq-integrations` and "Modernization status" claims removed or corrected.
- `package.json` carrying a deprecation-bearing `description` that leads with `@sdlcforge/dev-core` within the first 80 characters, `version` `1.0.0-alpha.11`, and a recorded decision on `http-errors`.
- An attempted `npm publish` and a whole-package `npm deprecate`, with their exact commands and exact outputs recorded — and, when the permission classifier blocks them (the established outcome for `@sdlcforge/core-cli` and `@liquid-labs/liq-integrations` in this same wave), a copy-pasteable handoff block for the user with no placeholders and no paraphrase.
- GitHub repository archival recorded as an explicit **user decision** with the `gh repo archive liquid-labs/liq-work` command, deliberately not performed — noting that the repository carries several `work-liquid-labs/liq-work/*` branches on its `origin` and `workspace` remotes, and that the same decision will want making consistently across all four donors.
