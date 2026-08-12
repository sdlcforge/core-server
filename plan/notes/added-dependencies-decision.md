# Decision: The five unexplained dependencies on the WIP branch

## Question

The WIP branch (`work-sdlcforge/core-server/64`) adds `@liquid-labs/git-toolkit`, `github-toolkit`, `npm-toolkit`, `playground-monitor`, and `sdlc-lib-build` as dependencies. None is imported by any core-server source file, and the `explicitPlugins` array is unchanged, so none is registered as a plugin either. Were these meant to become new explicit plugins, are they manual transitive-dependency backfill for the yalc links, or are they leftovers to drop?

## Answer

Drop them. Treat as WIP leftovers/exploration — do not carry any of the five into the `bun-conversion` plan's dependency set or task scope.
