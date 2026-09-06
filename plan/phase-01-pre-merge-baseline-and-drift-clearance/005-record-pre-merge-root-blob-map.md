# Record Pre-Merge Root Blob Map

## Purpose and scope

Record the pre-merge blob/tree identity of every root-level tracked path, as this phase's final step, so Phase 2's post-merge verification is a mechanical comparison rather than a recollection. This task must run last within this phase, after tasks 001–004 have landed, so the recorded map reflects the actual tree Phase 2 will merge against — task 001 changes `list-implied.mjs`'s blob, task 002 changes `bun.lock`'s blob, and tasks 003–004 add new files under `plan/resources/`.

## Requirements

role_doc: plugins/flow/roles/developer.md

1. Confirm tasks 001 through 004 are already present on this branch before starting.
2. Record the exact commit this phase's work lands at: `git rev-parse HEAD`. This is the canonical pre-merge reference point — every blob identity below is independently retrievable from it via `git show <sha>:<path>` or `git ls-tree <sha> -- <path>`, even if this document were lost.
3. Enumerate every top-level tracked path via `git ls-tree --name-only HEAD` (non-recursive, run at the repository root) and record each entry's object type and SHA via `git ls-tree HEAD` (which reports `<mode> <type> <sha>\t<path>` for each top-level entry — `blob` for files, `tree` for directories). A directory's tree SHA changes if *any* file nested under it changes, so recording top-level tree SHAs for directories is a complete, cheap proxy for their entire recursive contents; there is no need to recurse manually.
4. Call out, explicitly and by name, the blob SHAs for the three paths a careless Phase 2 conflict resolution could most plausibly clobber: `src/lib/index.js`, `bun.lock`, and `.catalyst-data.yaml`. Per `plan/notes/merge-arrival-inventory.md`'s findings, none of these has a `dev-core` counterpart, so none should ever be touched by the merge — this record is what lets Phase 2 prove that mechanically rather than by inspection.
5. Author `plan/resources/pre-merge-root-blob-map.md` containing:
   - The pinned commit SHA from Requirements item 2, with a one-line note that all blob/tree SHAs below are relative to it.
   - A table of every top-level tracked path (from Requirements item 3), its object type (`blob`/`tree`), and its SHA.
   - The three call-out paths from Requirements item 4, restated prominently (even though they also appear in the general table) with a one-line reminder of why each matters.

## Validation

1. `plan/resources/pre-merge-root-blob-map.md` exists, states the pinned commit SHA, and lists every entry `git ls-tree --name-only HEAD` reports at the repository root — cross-check that the row count matches `git ls-tree --name-only HEAD | wc -l` exactly.
2. `src/lib/index.js`, `bun.lock`, and `.catalyst-data.yaml` each appear with a recorded blob SHA matching a direct `git rev-parse HEAD:<path>` check for each.
3. The recorded commit SHA is reachable (`git cat-file -t <sha>` returns `commit`) and is the actual `HEAD` of the branch this phase's work lands on at the time this task runs.
4. `git diff --stat` shows only the new `plan/resources/pre-merge-root-blob-map.md` file — this task makes no source, test, or dependency change.

## References

- [`plan/notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md) — the three call-out paths and why they matter; the broader per-path arrival map this blob map supports.
- [`plan/phases/pre-merge-baseline-and-drift-clearance.md`](../phases/pre-merge-baseline-and-drift-clearance.md) — this phase's goal 5.
