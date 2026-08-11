#!/usr/bin/env bash
#
# Make the current checkout installable under Bun.
#
# .yalc/ and yalc.lock are gitignored, so a freshly created checkout or git worktree has
# neither, and `bun install` fails hard on the two file:.yalc/... dependencies
# (@liquid-labs/plugable-express, @liquid-labs/liq-projects). This script copies .yalc/ in
# from the main checkout when the current directory doesn't already have it, then runs
# `bun install`.
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
# and only `bun install` runs.

set -e

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

This project depends on two locally-linked packages via yalc:
  - @liquid-labs/plugable-express
  - @liquid-labs/liq-projects

To populate .yalc/, run \`yalc push\` from each of those packages' own checkouts (yalc is a
globally-installed developer tool, not a project dependency of this repo, so it is not
installed automatically and this script will not attempt to run it). Once .yalc/ exists in
the main checkout, re-run this script.
EOF
    exit 1
fi

if [ "$REFRESH_LOCK" -eq 1 ]; then
    echo "provision-local-deps.sh: --refresh-lock: removing bun.lock before installing..."
    rm -f "$CURRENT_DIR/bun.lock"
fi

echo "provision-local-deps.sh: running bun install in $CURRENT_DIR..."
bun install
