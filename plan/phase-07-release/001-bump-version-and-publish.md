# Bump Version And Publish

## Purpose and scope

Bump `@sdlcforge/core-server`'s version and attempt an `npm publish`, so the three donor repositories' own retirement phases have a published replacement to point at.

The scheduling reason this task exists: each donor's retirement deprecates its npm package. A donor deprecated while `core-server`'s replacement is unpublished leaves a window in which neither the donor nor its replacement is installable by a consumer resolving from the registry. Publishing here closes that window before any retirement is dispatched.

This is the plan's final task. It runs **after** the documentation phase so the published tarball carries documentation matching the code inside it.

## Requirements

1. **Confirm the preconditions before touching the version.** Phase 5 task 004's parity gate passed, Phase 6's documentation updates landed, and the working tree is clean. `make build`, `make test`, and `make lint` are green from a clean tree — `package.json`'s own `preversion` hook re-runs `make test && make lint` and `prepack` re-runs `make build`, so a failure here surfaces as a confusing mid-publish abort rather than as a clear signal. Run them first, deliberately.

2. **Bump from `1.0.0-alpha.15` to the next alpha.** This is an alpha-track prerelease bump, consistent with every sibling package in this wave. Ensure `package.json` and `bun.lock` end consistent with each other.

3. **Attempt the publish**, tagged for the alpha track and scoped for public access:

   ```bash
   npm publish --access public --tag alpha
   ```

4. **Expect the attempt to be blocked, and handle that as an outcome rather than a failure.** Two independent blockers have precedent in this wave. This environment's Bash-permission classifier reliably blocks `npm publish` (established by the `framework-consolidation` plan-group); and the `sdlcpilot-cli-rename` plan-group additionally hit an npm registry 401 credential issue. If either fires:
   - Do **not** attempt a workaround, a re-scoped invocation, a credential edit, or any indirection intended to get the command past the classifier.
   - Hand the user the **exact command, verbatim**, together with the directory to run it from and the expected published version.
   - Record it in `plan/followups.yaml` (`type:enhancement`, referencing `package.json`'s version and the publish command) so the outstanding action survives the session, matching the precedent `sdlcpilot-cli-rename` set for its own unpublished bump.

5. **Verify whichever outcome occurred.** On success: `npm view @sdlcforge/core-server versions` shows the new version and the `alpha` dist-tag points at it. On a block: state explicitly that the package is **not** published, so the manager does not schedule a donor retirement against a publish that never happened.

6. **State the unblocking verdict.** The single fact the dispatching manager needs from this phase: whether the three donors' retirement phases are now unblocked. A blocked publish means they are **not** — the manual publish must complete first.

## Validation

- `make build`, `make test`, and `make lint` are green before the bump and after it.
- `package.json`'s `version` is the new alpha value and `bun.lock` agrees.
- `git diff --stat` shows changes confined to `package.json` and `bun.lock` (plus `plan/followups.yaml` if a follow-up was recorded). No source file changed.
- Exactly one of these is true and clearly stated in the report: the package is published and verified via `npm view`, or the publish was blocked with the verbatim command handed to the user and a follow-up recorded.
- The report names the unblocking verdict for the donors' retirement phases explicitly.

## Assumptions

- The alpha track is the right dist-tag; `@sdlcforge/core-server` has never been published on `latest` in this wave's working model.
- Publishing requires network access and valid registry credentials, neither of which this task can provision. Their absence is a blocked outcome, not a task failure.
- No further code change is expected in this plan after this task. If the preconditions in requirement 1 are not met, halt rather than bumping — a published version that does not correspond to a verified parity gate is worse than an unpublished one.

## References

- [`plan/notes/scope-confirmation.md`](../notes/scope-confirmation.md) — the user's confirmation that this plan bumps and attempts to publish, and the reasoning about the donor-retirement window.
- The `sdlcpilot-cli-rename` plan-group's own outcome (recorded in `plan/waves/sdlcforge-modernization/manifest.yaml`) — the precedent for handing a blocked publish to the user and tracking it as a follow-up.
- `plan/phase-05-absorb-donor-plugins/004-verify-post-absorption-parity.md` — the gate whose PASS is this task's precondition.
