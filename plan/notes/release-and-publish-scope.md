# Release and publish scope

## Answer

No release step in this plan-group. The deliverable is the locally/yalc-consumed merge only — no version bump, no `npm publish` attempt for `@sdlcforge/core-server` as part of this plan. This matches how `core-server-domain-consolidation` and `dev-core-consolidation` both treated publish as a separate, often-blocked, handed-off step rather than a plan-blocking requirement. core-server's most recent publish attempt (`1.0.0-alpha.16`) already hit a registry-auth block (followup `1aTE`); there's no reason to expect this plan's merge would clear that block, so it isn't gated on trying.
