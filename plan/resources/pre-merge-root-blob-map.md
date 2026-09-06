# Pre-Merge Root Blob Map

## Purpose

Record the blob/tree identity of every root-level tracked path at the point Phase 1's work lands, so Phase 2's post-merge verification is a mechanical comparison rather than recollection. All blob/tree SHAs below are relative to commit `cbd19fd820183e3ef7b1a98aa7434ef431d2f7d9`.

## Root-level tracked paths

| Path | Type | SHA |
|---|---|---|
| `.catalyst-data.yaml` | blob | `41b9a23be43471b554c5759c4c326356e13efae7` |
| `.dockerignore` | blob | `8ff43d9ffc435c68c12b4ee58350a2bae7edd6f2` |
| `.gitignore` | blob | `4814623820d954f83d71742361a70e8768c39f48` |
| `.readme-assets` | tree | `74b23867896fa474054f60f8fa3b7440221d2435` |
| `AGENTS.md` | blob | `40609a50c08da7e63732bd2c46ed26828ad6ebad` |
| `CLAUDE.md` | blob | `bbb39a031ad3dbd2eda1ced8e9e35ef7ed8c0095` |
| `Makefile` | blob | `5c46580237fc4d2ad78dba7d205b48e1999ad567` |
| `README.md` | blob | `129dec202c9f09672475ef9281111f86fa791896` |
| `bun.lock` | blob | `71ea62a09fc51d2e2f088694ef56fd1d604a050f` |
| `docs` | tree | `d685ac603402db592399eb69a9a838fd3d881fd2` |
| `make` | tree | `d594e86335fa80309f2a914fe0a0f4362ca7faa8` |
| `package.json` | blob | `ea8fc9c78101c9d2cdcaea276084e83785af7f90` |
| `plan` | tree | `b18c2f7f8fbcbcc5c33a97bb0d0e2745ebe124e2` |
| `scripts` | tree | `5df2dd11846f0e74d97e5f7fa46c8d4645e59ac4` |
| `server-settings.yaml` | blob | `9e8f3582f47e4e4a256e6b09d4cdba316d4f9f3a` |
| `src` | tree | `5aeee6692caefc2f80a49d9ff1d112f02fb2d1b7` |
| `test` | tree | `030d8538146600c5a2e4a320d7183c9b2f730925` |

## Critical paths: unaffected by the merge

The three paths below have no dev-core counterpart, so the merge cannot touch them. This record proves their blob identities were preserved:

| Path | Type | SHA | Why it matters |
|---|---|---|---|
| `src/lib/index.js` | blob | `e8791e8ba3c24a02539e9b0b9de8cd3fbf0655b2` | Core-server's library export surface; dev-core has no `src/lib/` directory. |
| `bun.lock` | blob | `71ea62a09fc51d2e2f088694ef56fd1d604a050f` | Core-server's dependency lock; dev-core uses npm lock. The two must never coexist in the merge. |
| `.catalyst-data.yaml` | blob | `41b9a23be43471b554c5759c4c326356e13efae7` | Core-server's generator inventory; dev-core uses `.sdlc-data.yaml` instead. |
