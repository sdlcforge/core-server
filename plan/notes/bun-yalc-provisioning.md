# Bun `file:`/yalc Resolution and Worktree/CI/Docker Provisioning

## Purpose and scope

Research spike answering: how `bun install` treats a `file:.yalc/…` dependency spec, whether it
resolves the linked package's own transitive dependencies, and what concrete provisioning
procedure is needed so `bun install` succeeds in a fresh task worktree, in CI, and in the Docker
integration-test container — all of which lack `.yalc/` by default, since it (and `yalc.lock`)
are gitignored. Evidence is drawn from (a) direct experiments against a scratch package built to
mirror core-server's exact pattern (`bun 1.3.14`, macOS/darwin-arm64), and (b) inspection of
`@sdlcforge/core-server`'s actual repo state (`package.json`, `AGENTS.md`, `.gitignore`, `test/`,
`.yalc/`, `yalc.lock`) and of Flow's `create-worktree.sh`, which is what will actually provision
every downstream task worktree for this plan.

All experiments live under a disposable scratch directory
(`/private/tmp/claude-502/.../scratchpad/bun-yalc-test/consumer`); nothing in the main core-server
checkout was modified.

## Q1 — Does `bun install` copy or symlink a `file:.yalc/…` dependency?

**It always copies, never symlinks — independent of the `--backend` flag.**

Built a scratch consumer with `"@scope/local-dep": "file:.yalc/@scope/local-dep"` (mirroring
core-server's exact pattern) and ran `bun install`:

```
+ @scope/local-dep@.yalc/@scope/local-dep
+ is-odd@3.0.1
8 packages installed [166.00ms]
```

`node_modules/@scope/local-dep` came out as a **real directory**, not a symlink (`readlink`
returned nothing; `ls -ld` showed `drwxr-xr-x`, not `lrwxr-xr-x`). Bun's own `--backend` flag
(`clonefile` default on macOS, also tested `symlink`, `hardlink`, `copyfile`) controls only how
*registry* packages are materialized from Bun's global cache — it has **no effect** on `file:`
dependencies:

```
bun install --backend=symlink
...
readlink node_modules/@scope/local-dep   →  (empty, not a symlink)
```

This contrasts with what's on disk in the **current npm-based** core-server checkout, where the
two on-disk states actually disagree with each other: `node_modules/@liquid-labs/liq-projects` is
a symlink to `../../.yalc/@liquid-labs/liq-projects`, while `node_modules/@liquid-labs/plugable-express`
is a real (copied) directory, even though both are declared identically as `file:.yalc/…` in
`package.json`. That inconsistency is npm-version/history-dependent (npm's `installLinks`
behavior has changed across major versions) and not something Bun inherits — **under Bun the
answer is uniform: `file:` dependencies are always copied.**

**Consequence:** editing the yalc-linked package's source directly under `.yalc/…` does not
affect a running consumer until the next `bun install` re-copies it (confirmed in Q2 below) — same
practical requirement as npm's `file:` copy-on-install path, different from a symlink-based
workflow where edits are visible immediately.

## Q2 — Does `bun install` resolve the linked package's own transitive dependencies? Does re-running `bun install` after a "yalc push" keep them in sync?

**Partially, and this is the most important and least obvious finding.** Three distinct
behaviors, verified in sequence against the same scratch consumer:

1. **A bare `bun install` re-copies the file: dependency's *content*, including a changed
   `package.json`, on every run.** Changed only `lib/index.js`'s exported value inside
   `.yalc/@scope/local-dep` (no `package.json` change, no version bump) and reran `bun install`
   with no flags — the new content was faithfully re-copied into `node_modules`. Content sync
   works exactly as expected, with no manual step beyond "run `bun install` again," matching
   `AGENTS.md`'s existing "run `npm install` after any yalc push" instruction.

2. **But a bare `bun install` (with or without `--force`, `--no-cache`, or `--force`+version bump)
   does *not* re-resolve the file: dependency's *own transitive dependency graph* once `bun.lock`
   already has a resolved entry for that `file:` spec.** Concretely: added a brand-new transitive
   dependency (`chalk`, later `ms`, later `debug`) to `.yalc/@scope/local-dep/package.json`'s own
   `dependencies`, then ran, in turn: bare `bun install`, `bun install --force`, a version bump
   (`1.0.0` → `1.0.1`) plus bare `bun install`, `bun install --no-cache`, and `bun add
   "@scope/local-dep@file:…"`. **None of these installed the new transitive package or updated
   `bun.lock`'s recorded `dependencies` for `@scope/local-dep`.** `node_modules/chalk` (etc.)
   never appeared; `bun.lock`'s entry for `@scope/local-dep` stayed frozen at whatever transitive
   set was last fully resolved.

3. **The only thing that reliably re-resolves it is deleting `bun.lock` (or the relevant lock
   entries) and reinstalling** — `node_modules` can stay in place; only the lockfile needs to go:

   ```
   rm -f bun.lock
   bun install
   + @scope/local-dep@.yalc/@scope/local-dep
   2 packages installed
   ```

   After that, the new transitive dependency (`ms` in the concrete run) appeared in both
   `node_modules` and the regenerated `bun.lock`.

**This is a materially bigger pain point than the npm-era note in `AGENTS.md` implies.** The
`AGENTS.md`/`CLAUDE.md` instruction — "run `npm install` after any yalc push to ensure transitive
dependencies stay in sync" — reads as a single, sufficient step. Under Bun, an equivalent plain
`bun install` is **not** sufficient whenever the yalc-pushed change to `plugable-express` or
`liq-projects` added/removed/changed one of *that package's own* dependencies (as opposed to just
changing its own source). Symptom in practice: a newly-added transitive dependency silently fails
to materialize, with no error and no visible signal — `bun install` reports success and "N
packages installed" for the *unrelated* changes, while the stale transitive set persists. The
reliable procedure after any `yalc push` that touched the linked package's `dependencies` (not
just its source) is:

```bash
rm -f bun.lock && bun install
```

not a bare `bun install`. Phase 1 (or its docs) should say this explicitly — the existing
`AGENTS.md` wording ("run `npm install` after any yalc push") should not be mechanically
translated to "run `bun install` after any yalc push"; it needs to become "run `rm -f bun.lock &&
bun install`" or equivalent, at least when the pushed package's own dependency *list* changed.

## Q3 — Concrete provisioning procedure for worktree / CI / Docker

**Groundwork fact, confirmed against the live repo:** `.yalc/`, `yalc.lock` are gitignored
(`.gitignore`: `/.yalc`, `/yalc.lock`) and, per `git worktree`'s semantics, a new worktree checks
out only tracked content — a freshly created task worktree for this plan will have **no
`.yalc/` directory at all**, not a stale one. This was reproduced directly: with a `bun.lock`
present but `.yalc/` absent, `bun install` (and `bun install --frozen-lockfile`, which is exactly
what Flow's `create-worktree.sh` runs when a lockfile exists) fails hard:

```
bun install v1.3.14 (0d9b296a)
FileNotFound: failed opening cache/package/version dir for package @scope/local-dep
+ is-odd@3.0.1
15 packages installed [8.00ms]
Failed to install 1 package
exit code: 1
```

Every other (non-`file:`) dependency installs fine; only the `file:` entries fail, and the whole
`bun install` invocation exits non-zero. `create-worktree.sh`'s `install_dependencies()` would
report `dependencies=bun-failed` for a fresh core-server task worktree today, exactly matching the
plan overview's own finding ("Every task worktree in this plan will hit this").

**Where `yalc push`/`yalc add` can and cannot help.** `yalc` is installed globally on the
developer's machine (`/opt/homebrew/bin/yalc`, `1.0.0-pre.53`), not as a core-server
`devDependency`, and the current `.yalc/` content was populated by `yalc push` runs from the
*upstream* sibling checkouts (e.g. `/Users/zane/playground/liquid-labs/liq-projects`,
`.../plugable-express`), which exist on this developer's machine but are **not part of
core-server's repo** and are not guaranteed to exist, at the right commit, anywhere else.
Concretely:

- A **task worktree created on the same machine, in the same session**, has trivial access to a
  perfectly good source of truth: the main checkout's own already-populated `.yalc/` directory.
  Copying it is cheap (`du -sh .yalc` → 1.6 MB across the six currently-linked packages) and
  requires no `yalc` invocation at all — Bun does not care how the directory got there, only that
  real files exist at the declared relative path (verified: the scratch experiment's `.yalc/`
  was hand-built with `mkdir`/`Write`, no `yalc` tool involved, and `bun install` worked
  identically to a real yalc-populated tree).
- A **CI runner or Docker image on a different machine** has neither the upstream sibling repos
  nor the developer's global yalc store (`~/.yalc/packages/`, itself only populated by prior
  `yalc push` runs on that same developer machine) — so neither `yalc push` (nothing to push
  *from*) nor `yalc add` (nothing in the store to pull) can regenerate `.yalc/` there from
  nothing. This is a hard structural gap, not a missing-command issue.

**Recommended procedure per environment:**

**(a) Task worktree, for this plan's own downstream Phase 2/3 tasks.** `create-worktree.sh` runs
its install step immediately after `git worktree add`, before any task-specific setup can run, so
the sequence has to be: create the worktree with dependency installation suppressed, inject
`.yalc/`, then install:

```bash
plugins/flow/scripts/create-worktree.sh --no-install-deps --plan-slug bun-conversion "…" 2 1
cp -R "$PROJECT_ROOT/.yalc" "$WORKTREE_PATH/.yalc"
(cd "$WORKTREE_PATH" && bun install)
```

This is the one piece Phase 1 should turn into an actual, named, repeatable step (a small script
or a documented dispatch-time instruction) rather than leaving it as manual knowledge — every
Phase 2/3 task dispatch in this plan depends on it. `yalc.lock` is not required for `bun install`
to succeed (it's purely `yalc`'s own bookkeeping file, not read by Bun), but copying it alongside
`.yalc/` keeps a worktree's state consistent should anyone run `yalc` commands inside it later.

**(b) CI.** There is currently **no CI workflow configured in this repo** (no `.github/`
directory; the closest analog, `test/test-ci.sh`, is a local script the developer runs by hand,
and it has its own pre-existing, orphaned relationship to `file:` deps — see the aside below). This
means the "provisioning procedure for CI" is a policy decision as much as a technical one, and
Phase 1 (or a Phase 1 task) should make it explicit rather than let it stay implicit. Two
substantively different strategies exist, and they are not equivalent:
  1. **CI never sees `file:.yalc/…` deps at all** — treat the yalc link as a strictly local-dev-only
     mechanism, and have CI (whenever it's introduced) install against whatever `package.json`
     resolves to *without* the local override (i.e., don't run CI directly off the developer's
     `package.json`/`bun.lock` that carries `file:` specs; either substitute a released semver
     range for CI's install, or accept that CI tests the last-published version of
     `plugable-express`/`liq-projects` rather than the in-flight local one). This is the
     lower-maintenance option and matches how most yalc-based workflows are actually meant to be
     used — yalc's own docs frame it as a pre-publish local-loop tool, not a CI mechanism.
  2. **CI reproduces the full local dev loop** — checks out the upstream `plugable-express`/
     `liq-projects` repos too (as a submodule, sibling checkout, or multi-repo CI job) and runs
     `yalc push`-equivalent packaging into `.yalc/` before `bun install`. This is materially more
     infrastructure (multi-repo checkout, keeping upstream refs in sync with what the developer
     actually tested) for a benefit (testing genuinely unreleased upstream code in CI) that may
     not be needed if CI's job is just to validate core-server's own conversion.
  Given no CI exists yet, this spike does not resolve which strategy applies — it flags the choice
  as a concrete decision Phase 1 needs to make (or explicitly defer) rather than something the
  "provisioning procedure" can silently assume.

**(c) Docker integration-test container.** This one is simpler than it looks, and differently
shaped from (a)/(b): the container **does not run its own dependency install at all** today. Its
`docker-compose.yml` bind-mounts the whole project directory read-write (`..:/project:rw`), and
`run-tests.sh`'s own comment says it plainly: *"Using pre-built package from host … Verifying
pre-built files … Found dist/ and node_modules/ directories."* The container only checks that
`dist/` and `node_modules/` already exist (from a host-side `npm run build` that
`run-integration-tests.sh` performs as its own Step 1, before Docker is even invoked) — it never
installs dependencies inside the container. Because the mount is a live bind (not a copy), the
host's `.yalc/`-derived `node_modules` is transparently visible inside the container too, with
**zero additional provisioning needed there**, as long as this bind-mount architecture is
preserved under the Bun conversion (i.e., `test/run-integration-tests.sh` continues to build the
project on the host before Docker runs, whether that build step becomes `bun run build` or stays
`npm run build`). If a future change moves to building *inside* the container instead of
bind-mounting a host-built tree, this whole problem reappears there and needs the same treatment
as (a)/(b).

**Aside — `test/setup-local-deps.sh` and (c).** This script (see Q4) looks purpose-built for
exactly this problem (copying `file:` dependency sources into a container by parsing
`package.json`), but it is not invoked by anything in the current pipeline — see Q4. Its presence
suggests an earlier container architecture that *did* copy the whole project into the image
(consistent with the git log message on this exact file: "update to use directory mount rather
than copy everything; this speeds things up, makes the image smaller, and fixes sync issues").
The bind-mount approach superseded it; it's effectively dead code under the current pipeline,
independent of Bun.

## Q4 — Does `test/setup-local-deps.sh` still work under Bun?

**The question is moot: it is not called from anywhere in the current pipeline**, npm or Bun.
Confirmed by:

- Reading `test/run-tests.sh` (the actual Docker entrypoint) end to end — it never references
  `setup-local-deps.sh` or `COPY_DEPS`.
- Reading `test/run-integration-tests.sh`, `test/Dockerfile`, `test/docker-compose.yml` — none
  reference it either.
- A repo-wide grep for `setup-local-deps` (excluding `node_modules/`, `.yalc/`, `worktrees/`)
  turns up **zero** hits outside the file itself.
- `test/README.md` (which otherwise documents every file in `test/` in some detail, down to
  `test-basic.js` and `test-integration-quick.js`) does not mention it at all, and in fact
  describes a stale "Alpine Linux" container that no longer matches the actual `ubuntu:latest`
  `Dockerfile` — corroborating that this doc/script pair predates the directory-mount rewrite.
- `git log --oneline -- test/setup-local-deps.sh` shows one relevant commit: "update to use
  directory mount rather than copy everything; this speeds things up, makes the image smaller,
  and fixes sync issues" — i.e., the commit that introduced the current bind-mount architecture
  is the same commit associated with this file, consistent with it having been orphaned by that
  same change rather than actively maintained since.

On its own technical merits, the script would likely still *run* under a Bun-managed tree — it
parses `package.json` for `file:` specs with plain `node -e "require(...)"` (works identically
under Node regardless of which tool installed `node_modules`) and does directory copies with
`cp -r`, neither of which is npm-specific. But whether it "works" is not a meaningful question
while nothing invokes it. **Recommendation for Phase 1/3:** either delete it as dead code, or, if
the plan later decides to move the Docker tier away from host bind-mounting (see Q3c), repurpose
and re-wire it rather than resurrecting it silently — it would need updating regardless, since it
assumes a `/home/testuser/...` layout that doesn't match the current `/project` bind-mount
convention.

## Q5 — Is `bun.lock`'s encoding of `file:` dependencies portable across machines?

**Two separate questions bundled into one, with different answers:**

1. **Is the *encoding itself* portable (no machine-specific absolute paths, hostnames, or other
   baked-in local state)?** Yes. `bun.lock`'s entry for a `file:` dependency is a plain
   project-relative path string and nothing else:

   ```json
   "@scope/local-dep": ["@scope/local-dep@file:.yalc/@scope/local-dep", { "dependencies": { "is-even": "^1.0.0" } }],
   ```

   No absolute path, no hostname, no content hash/integrity field (registry packages get a
   `sha512-…` integrity string in the same lockfile; `file:` entries never do). So the lockfile
   file itself is safe to commit and share across machines/CI runners in the sense that it
   contains nothing machine-specific that would need editing.

2. **Does that lockfile work correctly on a different machine where `.yalc/` doesn't already
   exist at that relative path?** No — confirmed directly (Q3 above): `bun install` and `bun
   install --frozen-lockfile` both fail hard (`FileNotFound: failed opening cache/package/version
   dir for package @scope/local-dep`, exit 1) when the path the lockfile references doesn't exist
   on disk. The lockfile records *where to look*, not *what's there* — there is no embedded
   fallback to fetch from a registry, and no content check that would let Bun substitute something
   else. A machine that hasn't independently regenerated (or otherwise provisioned, per Q3) `.yalc/`
   at the exact relative path the lockfile names will always fail on the `file:` entries,
   regardless of the lockfile's own validity for every other (registry) dependency.

**Practical implication:** committing `bun.lock` is necessary but nowhere near sufficient for
reproducibility here. It fixes exact versions for the ~10 registry dependencies; for the `file:`
entries, the lockfile is inert unless paired with one of the Q3 provisioning steps to first put
matching bytes at `.yalc/@liquid-labs/plugable-express` and `.yalc/@liquid-labs/liq-projects` (the
two `package.json`-declared file: deps — the plan's own minimization work, per
`plan/phases/bun-package-management.md`, may reduce this further from today's six on-disk
`.yalc/` entries).

## Overall verdict

`bun install`'s behavior with `file:.yalc/…` dependencies is close enough to npm's that the
existing yalc-based local-dev workflow survives the Bun conversion conceptually unchanged, but two
things about Bun specifically demand new, explicit handling in Phase 1 rather than a mechanical
find-and-replace of `npm` → `bun` in `AGENTS.md`:

1. **Bun caches the `file:` dependency's transitive-dependency graph in `bun.lock` and does not
   refresh it on a bare `bun install`, `--force`, or a version bump** — only deleting `bun.lock`
   (or the specific entry) forces re-resolution. The existing `AGENTS.md`/`CLAUDE.md` instruction
   ("run `npm install` after any yalc push") needs to become "run `rm -f bun.lock && bun install`
   after any yalc push that changed the linked package's own dependency list" — a strictly
   stronger requirement than before, and one that fails silently (no error, just a stale
   transitive set) if skipped.

2. **There is no single "provisioning procedure" — the three target environments need three
   different answers, and Phase 1 should record all three explicitly:**
   - **Task worktree** (this plan's own Phase 2/3 dispatches, same machine/session as the plan
     worktree): create with `create-worktree.sh --no-install-deps`, `cp -R` the main checkout's
     `.yalc/` into the new worktree, then run `bun install`. Cheap (1.6 MB), mechanical, and
     requires no `yalc` invocation.
   - **CI** (not yet configured in this repo): a policy decision, not just a technical step —
     either CI never resolves the `file:` links at all (treats yalc as strictly local-dev,
     substitutes released versions), or CI is given the same upstream-repo access the developer
     has and reproduces the push. Phase 1 should pick one explicitly rather than let a future CI
     setup task guess.
   - **Docker integration-test container**: needs no provisioning of its own today, because it
     bind-mounts the host's already-`bun install`ed tree rather than installing independently —
     this falls out of the existing architecture "for free" as long as that architecture is kept.

`test/setup-local-deps.sh` is dead code under the current (bind-mount) Docker architecture and
should be explicitly retired or explicitly re-wired, not left in an ambiguous state — it is not
"broken by Bun," it was already orphaned by an earlier npm-era architecture change.
