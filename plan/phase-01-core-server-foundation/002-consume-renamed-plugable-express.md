# Consume Renamed Plugable-Express

## Purpose and scope

`@liquid-labs/pluggable-express`'s own plan (project `/Users/zane/playground/liquid-labs/pluggable-express`, same plan slug `modernization-foundation`, phase 1 `framework-rename`) renames that package to the single-g spelling `@liquid-labs/plugable-express` and publishes it via yalc for local consumption. This task is the consumer-side half of that handoff, in this repo.

**Dependency: this task must not start until `pluggable-express`'s phase 1 task 002 (`Publish Renamed Package for Local Consumption`) has landed** — this repo cannot meaningfully consume a package that hasn't been rebuilt and republished yet. Confirm that task's completion (check `pluggable-express`'s own `plan/TODO.yaml` via `todo_list_all`, or ask the manager) before starting.

## Requirements

- Run `yalc add @liquid-labs/plugable-express` (or whatever exact command `pluggable-express`'s task 002 documented as its publish-side command) in this repo's checkout to pull in the freshly renamed/republished package, replacing the stale `1.0.0-alpha.55` snapshot currently in `.yalc/@liquid-labs/plugable-express/`.
- Confirm `package.json`'s dependency on `@liquid-labs/plugable-express` did not need to change (it already references the single-g name — only the underlying yalc snapshot is stale, not the dependency declaration itself).
- Run `npm install` to ensure transitive dependencies stay consistent, per this repo's existing yalc workflow convention (see `AGENTS.md`'s "Dependency Updates" section).
- Re-run task 001's golden API-spec characterization test (`npm test`) and confirm it still passes against the updated dependency — this is the concrete proof that the rename was consumption-transparent.
- Re-run `npm run test:local` (quick local integration pass) to confirm the server still starts and serves correctly with the renamed dependency.

## Validation

- `cat .yalc/@liquid-labs/plugable-express/package.json | grep -E '"name"|"version"'` shows `@liquid-labs/plugable-express` at the new version from `pluggable-express` task 002 (not `1.0.0-alpha.55`).
- `npm test` passes, including the golden API-spec characterization test from task 001.
- `npm run test:local` passes.
- `npm start` followed by `curl localhost:<port>/heartbeat` returns 200.

## Metadata

architectural_impact: false
