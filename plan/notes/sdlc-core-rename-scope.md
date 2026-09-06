# sdlc-core rename scope

## Answer

Keep the rename out of scope for this plan-group. Merge dev-core into core-server under core-server's existing package identity (`@sdlcforge/core-server`). A future rename to `@sdlcforge/sdlc-core` — if it happens — will be its own separately-scoped plan-group, consistent with how `sdlcpilot-cli-rename` and `pluggable-express-rename` were both scoped separately from their respective consolidation work. The wave manifest's plan-group description (which names `@sdlcforge/sdlc-core` as the eventual target) should be understood as aspirational framing from wave-authoring time, not a settled decision for this plan-group's actual scope.
