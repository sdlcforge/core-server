# Decision: `serverConfigRoot` value

## Question

Should the server's `serverConfigRoot` remain `main`'s package-relative `myPackagePath`, or become `~/.config/comply-server` as the WIP branch and a local Bun spike build both use? `main`'s value came from a completed plan whose task was an explicit behavior-preserving rename; the HOME-based value is arguably more correct for a globally-installed or `bunx`-run package. If HOME-based, it needs guarding (`process.env.HOME` is undefined on Windows and would throw from `fsPath.join`) and should go through `@liquid-labs/comply-defaults` per the project's centralized-config convention.

## Answer

Use `${XDG_DATA_HOME}/sdlcforge-core/`. `XDG_DATA_HOME` defaults to `${HOME}/.local/share`.

Neither the package-relative path nor the raw `~/.config/comply-server` WIP-branch value — use the XDG Base Directory spec's data-home convention instead, with the standard default fallback when `XDG_DATA_HOME` is unset. This should be resolved through `@liquid-labs/comply-defaults` per the project's centralized-config convention, and needs the same Windows/undefined-env-var guarding called out in the original question.
