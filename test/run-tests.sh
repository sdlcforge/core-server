#!/bin/bash

set -e

echo "=================================================="
echo "Comply Server Integration Tests"
echo "=================================================="

# Source nvm
source $NVM_DIR/nvm.sh

# Find the package tarball
PACKAGE_TARBALL=$(ls /home/testuser/comply-server-*.tgz | head -n 1)
if [ -z "$PACKAGE_TARBALL" ]; then
    echo "Error: No package tarball found"
    exit 1
fi

echo "Found package: $PACKAGE_TARBALL"

# Check if Node is already available (from base image)
if command -v node &> /dev/null; then
    echo "Using pre-installed Node $(node --version) for setup"
else
    # Install a default Node version if not available
    echo "Installing initial Node version for setup..."
    nvm install 18
    nvm use 18
fi

# Get test versions from the Node.js script
echo "Determining Node versions to test..."
cd /home/testuser
node test/get-node-versions.js > /tmp/versions.json
cat /tmp/versions.json

# Parse the test versions
TEST_VERSIONS=$(node -e "const v = require('/tmp/versions.json'); console.log(v.testVersions.join(' '))")

echo ""
echo "Will test with Node versions: $TEST_VERSIONS"
echo ""

# Track overall test results
OVERALL_PASSED=0
OVERALL_FAILED=0
FAILED_VERSIONS=""

# Test each Node version
for NODE_VERSION in $TEST_VERSIONS; do
    echo ""
    echo "=================================================="
    echo "Testing with Node v$NODE_VERSION"
    echo "=================================================="
    
    # Install the Node version
    echo "Installing Node v$NODE_VERSION..."
    nvm install $NODE_VERSION || {
        echo "Warning: Could not install Node v$NODE_VERSION, skipping..."
        continue
    }
    
    # Use the installed version
    nvm use $NODE_VERSION
    node --version
    npm --version
    
    # Clean up any previous installation
    echo "Cleaning up previous installation..."
    rm -rf /home/testuser/test-install
    mkdir -p /home/testuser/test-install
    cd /home/testuser/test-install
    
    # Initialize npm project
    echo "Initializing test project..."
    npm init -y > /dev/null 2>&1
    
    # Install the package
    echo "Installing comply-server package..."
    npm install --global-style $PACKAGE_TARBALL
    
    # Verify installation
    if [ ! -f "node_modules/.bin/comply-server" ]; then
        echo "Error: comply-server not found in node_modules/.bin/"
        OVERALL_FAILED=$((OVERALL_FAILED + 1))
        FAILED_VERSIONS="$FAILED_VERSIONS $NODE_VERSION"
        continue
    fi
    
    # Make comply-server available in PATH for testing
    export PATH="/home/testuser/test-install/node_modules/.bin:$PATH"
    
    # Run the test suite
    echo "Running test suite..."
    if node /home/testuser/test/test-server.js; then
        echo "✓ Tests PASSED for Node v$NODE_VERSION"
        OVERALL_PASSED=$((OVERALL_PASSED + 1))
    else
        echo "✗ Tests FAILED for Node v$NODE_VERSION"
        OVERALL_FAILED=$((OVERALL_FAILED + 1))
        FAILED_VERSIONS="$FAILED_VERSIONS $NODE_VERSION"
    fi
    
    # Clean up for next iteration
    cd /home/testuser
    pkill -f comply-server || true
    sleep 2
done

# Final summary
echo ""
echo "=================================================="
echo "FINAL TEST SUMMARY"
echo "=================================================="
echo "Node versions tested: $TEST_VERSIONS"
echo "Passed: $OVERALL_PASSED"
echo "Failed: $OVERALL_FAILED"

if [ ! -z "$FAILED_VERSIONS" ]; then
    echo "Failed versions:$FAILED_VERSIONS"
fi

echo "=================================================="

# Copy test results to mounted volume if available
if [ -d "/results" ]; then
    cp /tmp/test-results-*.json /results/ 2>/dev/null || true
    echo "Test results copied to /results/"
fi

# Exit with appropriate code
if [ $OVERALL_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi