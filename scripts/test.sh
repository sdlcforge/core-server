#!/bin/bash

# Run local tests for comply-server

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of scripts)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

echo "===================================================="
echo "Running local comply-server tests"
echo "===================================================="
echo ""

echo "Step 1: Building the project..."
npm run build

echo ""
echo "Step 2: Checking local server status..."
if [ ! -f start-pid ]; then
    echo "No local server running. Proceeding..."
else
    echo "Local server is running. Stopping it..."
    npm run stop
fi

echo ""
echo "Step 3: Running test suite..."
node test/test-server.js

echo ""
echo "===================================================="
if [ $TEST_RESULT -eq 0 ]; then
    echo "Tests completed successfully!"
else
    echo "Tests failed with exit code: $TEST_RESULT"
fi
echo "===================================================="

exit $TEST_RESULT