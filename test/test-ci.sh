#!/bin/bash

# Simplified test runner for CI environments
# Tests only with the current Node version

set -e

echo "=================================================="
echo "Comply Server CI Test"
echo "Node Version: $(node --version)"
echo "=================================================="

# Build package
echo "Building package..."
npm pack

# Install globally
echo "Installing comply-server..."
PACKAGE=$(ls comply-server-*.tgz | head -n 1)
npm install -g "$PACKAGE"

# Start server in background
echo "Starting server..."
comply-server --port 8080 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run tests
echo "Running tests..."
node test/test-server.js

TEST_EXIT_CODE=$?

# Cleanup
kill $SERVER_PID 2>/dev/null || true

exit $TEST_EXIT_CODE