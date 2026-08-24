# liq-credentials Specification

## Purpose and scope

This document is the canonical statement of what the `liq-credentials` plugin does and is required to do. It is written for developers and AI agents implementing or modifying the plugin, for reviewers checking proposed changes against requirements, and for stakeholders verifying what has actually been built. It is distinct from [`README.md`](../README.md), which pitches the project to a consumer, and from any future `docs/architecture.md`, which would describe *how* the plugin is built rather than *what* it must do.

`liq-credentials` registers as the `core-credentials` plugin for a [`@liquid-labs/plugable-express`](https://www.npmjs.com/package/@liquid-labs/plugable-express) server. It exposes HTTP handlers for importing and listing credentials, and delegates the actual storage, verification, and retrieval logic to the separate [`@liquid-labs/liq-credentials-db`](https://www.npmjs.com/package/@liquid-labs/liq-credentials-db) package. This spec covers the plugin's current, active, standalone surface: the `import` and `list` handlers and the plugin-registration behavior that wires them into a host server. It does not cover the internal implementation of `@liquid-labs/liq-credentials-db` beyond the behavior surfaced through this plugin's handlers.

This repository is a participant in a longer-term plan to consolidate several `@liquid-labs/plugable-express` plugins into `core-server`, but that consolidation has not happened. This spec documents `liq-credentials` as it stands today: a current, standalone, active plugin.

## Table of contents

1. [Key use cases](#key-use-cases)
2. [General features](#general-features)
3. [API definition](#api-definition)
   - [`PUT /credentials/:credential/import`](#put-credentialscredentialimport)
   - [`GET /credentials/list`](#get-credentialslist)
4. [Security requirements](#security-requirements)
5. [Constraints and assumptions](#constraints-and-assumptions)
6. [Non-goals](#non-goals)
7. [Pointers to deeper docs](#pointers-to-deeper-docs)

## Key use cases

### Import a credential

- **Actor**: a developer or operator with access to the host server's HTTP interface (directly, or through a CLI/tooling layer built on it).
- **Action**: issues `PUT /credentials/:credential/import`, naming the credential's key (e.g. `GITHUB_SSH`) and supplying a `path` to a local credential file. Optionally sets `replace=true` to update an existing credential, or `copyToStorage=true` to have the file(s) copied into centralized storage rather than referenced in place.
- **Outcome**: the plugin records the credential against the named key in the credentials database. A new key must not already exist; an existing key is only updated when `replace=true` is explicitly supplied. Unless the underlying import call is told otherwise, the newly imported credential is verified against its type's verification logic before the operation completes, and the credential's stored status reflects the outcome.

### List known credentials

- **Actor**: a developer or operator wanting visibility into what credentials are currently known to the server.
- **Action**: issues `GET /credentials/list`, optionally with `verify=true` to force re-verification of existing credentials before the list is produced, and optionally with output-format selectors (JSON, markdown, terminal, or plain text).
- **Outcome**: the plugin returns the set of known credential entries — each with its key, display name, description, status, and backing file references — rendered in the requested format. JSON is the default format when no format is requested.

### Register with a plugable-express host

- **Actor**: the host `@liquid-labs/plugable-express` server, at plugin load/setup time.
- **Action**: the host invokes the plugin's `setup` function, supplying its extension registry (`app.ext`), cache, path-variable registration hook, and `serverConfigRoot`.
- **Outcome**: the plugin ensures its credentials storage directory exists under the server's config root, instantiates a `CredentialsDB` bound to that server and registers it on `app.ext.credentialsDB` for handlers to use, and registers the `credential` path variable with a validation pattern and an options-fetcher that restricts valid values to currently supported credential types.

## General features

- All credential handlers operate against a single shared `CredentialsDB` instance, exposed on `app.ext.credentialsDB` by the plugin's `setup` step; storage, verification, and retrieval semantics are implemented by `@liquid-labs/liq-credentials-db`, not by this plugin's handlers directly.
- The `:credential` path parameter is constrained by a validation pattern (uppercase alphanumeric/underscore, starting with a letter or digit) and, via the host's path-variable options fetcher, is further restricted to credential keys the server currently supports — arbitrary or unregistered keys are rejected before a handler runs.
- Credential storage location is a request-time choice, not a fixed policy: by default a credential's backing file(s) are referenced in place at the caller-supplied path; supplying `copyToStorage=true` on import instead copies the file(s) into the server's centralized credentials directory (`<serverConfigRoot>/credentials`).
- Import is overwrite-protected: creating a credential under a key that already exists fails unless `replace=true` is explicitly supplied, and supplying `replace=true` against a key that does not yet exist likewise fails. There is no silent overwrite path.
- Each stored credential carries one of a fixed set of status values (not set, set but untested, set and ready, set but invalid, set but expired), and `list` reports the current status for every known credential.
- List output is field- and format-configurable through the shared output-formatting conventions used elsewhere in the host ecosystem (`@liquid-labs/liq-handlers-lib`), supporting JSON (default), markdown, terminal, and plain-text rendering.

## API definition

The plugin's HTTP surface is small; it is defined inline here rather than in a separate API reference document.

### `PUT /credentials/:credential/import`

| Parameter | Location | Required | Type | Description |
|---|---|---|---|---|
| `credential` | path | yes | string | Credential key to import under; must match a currently supported credential type. |
| `path` | query | yes | string | Local filesystem path to the credential file. |
| `replace` | query | no (default `false`) | boolean | Must be `true` to update an existing credential; must be omitted/`false` when importing a new key. |
| `copyToStorage` | query | no (default `false`) | boolean | When `true`, copies the credential file(s) from `path` into the server's centralized credentials storage instead of referencing them in place. |

Must import (create or, with `replace=true`, update) the named credential's entry in the credentials database and respond with a success acknowledgment. Must reject an attempt to create a credential under a key that already exists unless `replace=true` is supplied, and must reject `replace=true` against a key that does not yet exist.

### `GET /credentials/list`

| Parameter | Location | Required | Type | Description |
|---|---|---|---|---|
| `verify` | query | no (default `false`) | boolean | When `true`, (re-)verifies known credentials before the list is produced. |
| output/field selectors | query | no | — | Common output-formatting parameters (format, field selection) shared across the host's handlers. |

Must return every credential currently known to the server, each with its key, name, description, status, and file references, rendered in the requested output format (JSON by default).

## Security requirements

- Credential keys accepted by `import` and resolvable by `list` are restricted to the set of credential types the host currently has registered; the path-variable validation and options-fetcher enforce this before a handler body executes.
- `import` must not silently overwrite an existing credential's stored entry; overwriting requires the caller to explicitly opt in with `replace=true`.
- A newly imported credential is, by default, verified against its registered type's verification logic before the import completes; a failed verification must be reflected in the credential's stored status (rather than the credential being silently accepted as usable) and must roll back the failed import.
- `list` must not expose internal, non-serializable implementation detail (such as verification or token-retrieval function references) for a credential — only its declared metadata fields (key, name, description, status, files).

## Constraints and assumptions

- The plugin assumes it is loaded by a `@liquid-labs/plugable-express`-compatible host, which supplies `app.ext`, a cache, `registerPathVar`, and `serverConfigRoot` at setup time.
- The plugin assumes `@liquid-labs/liq-credentials-db` is present and correctly configured as its storage/verification backend; this spec does not restate that package's internal contract beyond the behavior surfaced through `import` and `list`.
- The credential file(s) named by `path` on import must already be readable at the location the host process can reach; the plugin does not fetch credential material from remote sources.

## Non-goals

- **Credential scoping** — restricting a stored credential's applicability to specific consumers, environments, or contexts — is not implemented. `src/handlers/credentials/` contains only `import` and `list`; there is no scoping handler or scoping concept anywhere in the current source.
- **Credential rotation** — automated or managed rotation/renewal of stored credentials — is not implemented. There is no rotation handler in the current source.
- If scoping or rotation are genuinely intended as future capabilities, they should be captured as new use cases and endpoints in a future revision of this spec once the corresponding handlers exist, rather than assumed from this document.

## Pointers to deeper docs

- [`README.md`](../README.md) — consumer-facing introduction, installation, and quick usage.
- [`AGENTS.md`](../AGENTS.md) — build, test, and contribution conventions for developers and AI agents working on this repository.
- [`docs/project-structure.md`](./project-structure.md) — repository layout reference.
- [`@liquid-labs/liq-credentials-db`](https://www.npmjs.com/package/@liquid-labs/liq-credentials-db) — the external package implementing the credential storage, verification, and retrieval logic this plugin delegates to.
