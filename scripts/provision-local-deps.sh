#!/usr/bin/env bash
#
# Make the current checkout installable under Bun.
#
# .yalc/ and yalc.lock are gitignored, so a freshly created checkout or git worktree has
# neither, and `bun install` fails hard on the file:.yalc/... dependencies bun.lock resolves
# (two, both direct: @liquid-labs/plugable-express and @sdlcforge/dev-core; no transitive
# file:.yalc/... resolution remains). This script copies .yalc/ in from the main checkout
# when the current directory doesn't already have it, verifies every required package is
# actually present under .yalc/, then runs `bun install`.
#
# Usage:
#   scripts/provision-local-deps.sh [--refresh-lock]
#
#   --refresh-lock   Remove bun.lock before installing. Bun caches a file: dependency's own
#                     transitive-dependency graph in bun.lock and will not refresh it on a
#                     bare `bun install`; use this after any `yalc push` that changed a
#                     linked package's own `dependencies` (see AGENTS.md's Conventions
#                     section for the full explanation).
#
# Safe to re-run: if .yalc/ is already present in the current directory, it is left as-is
# and only the presence check and `bun install` run.

set -e

# Packages bun.lock currently resolves via file:.yalc/... — kept in sync with bun.lock by
# hand; re-check with `grep -n 'file:\.yalc' bun.lock` whenever a dependency changes, since
# the set can shift as pinned versions move (a package may start or stop needing a local
# link).
REQUIRED_YALC_PACKAGES=(
    "@liquid-labs/plugable-express"
    "@sdlcforge/dev-core"
)

REFRESH_LOCK=0
for arg in "$@"; do
    case "$arg" in
        --refresh-lock)
            REFRESH_LOCK=1
            ;;
        *)
            echo "provision-local-deps.sh: unrecognized argument: $arg" >&2
            exit 1
            ;;
    esac
done

CURRENT_DIR="$(pwd)"

# Resolve the main checkout directory. `git rev-parse --git-common-dir` yields
# "<main-checkout>/.git" (absolute, or relative to the cwd) from inside a linked worktree,
# and ".git" from inside the main checkout itself. Resolve to an absolute path either way,
# then take its parent directory to get the main checkout.
COMMON_DIR="$(git rev-parse --git-common-dir)"
case "$COMMON_DIR" in
    /*)
        ;;
    *)
        COMMON_DIR="$(cd "$COMMON_DIR" && pwd)"
        ;;
esac
MAIN_CHECKOUT="$(dirname "$COMMON_DIR")"

if [ -d "$CURRENT_DIR/.yalc" ]; then
    echo "provision-local-deps.sh: .yalc/ already present in $CURRENT_DIR; leaving it as-is."
elif [ -d "$MAIN_CHECKOUT/.yalc" ]; then
    echo "provision-local-deps.sh: copying .yalc/ from main checkout ($MAIN_CHECKOUT) into $CURRENT_DIR..."
    cp -R "$MAIN_CHECKOUT/.yalc" "$CURRENT_DIR/.yalc"
    if [ -f "$MAIN_CHECKOUT/yalc.lock" ]; then
        cp "$MAIN_CHECKOUT/yalc.lock" "$CURRENT_DIR/yalc.lock"
    fi
else
    cat >&2 <<EOF
provision-local-deps.sh: no .yalc/ directory found here or in the main checkout ($MAIN_CHECKOUT).

This project depends on the following packages via yalc (both direct):
  - @liquid-labs/plugable-express
  - @sdlcforge/dev-core

To populate .yalc/, run \`yalc push\` from each of those packages' own checkouts (yalc is a
globally-installed developer tool, not a project dependency of this repo, so it is not
installed automatically and this script will not attempt to run it). Once .yalc/ exists in
the main checkout, re-run this script.
EOF
    exit 1
fi

# .yalc/ existing (either already present or just copied) doesn't guarantee every package
# bun.lock needs is actually in it — a stale or partially-populated .yalc/ would otherwise
# only surface as an opaque failure deep inside `bun install`'s resolution. Check each
# required package explicitly and fail fast with an actionable message.
MISSING_PACKAGES=()
for pkg in "${REQUIRED_YALC_PACKAGES[@]}"; do
    if [ ! -d "$CURRENT_DIR/.yalc/$pkg" ]; then
        MISSING_PACKAGES+=("$pkg")
    fi
done

if [ "${#MISSING_PACKAGES[@]}" -gt 0 ]; then
    {
        echo "provision-local-deps.sh: .yalc/ in $CURRENT_DIR is missing the following package(s) that bun.lock resolves via file:.yalc/...:"
        for pkg in "${MISSING_PACKAGES[@]}"; do
            echo "  - $pkg"
        done
        echo
        echo "To populate them, run \`yalc push\` from each missing package's own checkout (yalc is a"
        echo "globally-installed developer tool, not a project dependency of this repo, so it is not"
        echo "installed automatically and this script will not attempt to run it). Once .yalc/ in the"
        echo "main checkout ($MAIN_CHECKOUT) has every required package, re-run this script."
    } >&2
    exit 1
fi

if [ "$REFRESH_LOCK" -eq 1 ]; then
    echo "provision-local-deps.sh: --refresh-lock: removing bun.lock before installing..."
    rm -f "$CURRENT_DIR/bun.lock"
fi

echo "provision-local-deps.sh: running bun install in $CURRENT_DIR..."
bun install
