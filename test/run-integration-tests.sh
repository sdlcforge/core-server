#!/bin/bash

# Integration test runner for comply-server
# This script builds the package and runs tests in Docker across multiple Node versions

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "=================================================="
echo "Comply Server Integration Test Suite"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
echo -e "${YELLOW}Checking Docker status...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker is not running. Attempting to start Docker Desktop...${NC}"
    
    # Try to start Docker Desktop (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        
        # Wait for Docker to start (max 30 seconds)
        echo "Waiting for Docker to start..."
        WAIT_TIME=0
        MAX_WAIT=30
        
        while ! docker info > /dev/null 2>&1; do
            if [ $WAIT_TIME -ge $MAX_WAIT ]; then
                echo -e "${RED}Docker failed to start within ${MAX_WAIT} seconds${NC}"
                echo "Please start Docker Desktop manually and run this script again"
                exit 1
            fi
            
            sleep 1
            WAIT_TIME=$((WAIT_TIME + 1))
            echo -n "."
        done
        
        echo ""
        echo -e "${GREEN}✓ Docker is now running${NC}"
    else
        echo -e "${RED}Docker is not running and automatic start is not supported on this platform${NC}"
        echo "Please start Docker manually and run this script again"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Docker is running${NC}"
fi

echo ""

# Step 1: Build the package
echo -e "${YELLOW}Step 1: Building comply-server package...${NC}"
cd "$PROJECT_ROOT"

# Clean up old packages
rm -f comply-server-*.tgz

# Build the package
if npm pack; then
    echo -e "${GREEN}✓ Package built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build package${NC}"
    exit 1
fi

# Step 2: Create results directory
echo -e "${YELLOW}Step 2: Setting up test environment...${NC}"
mkdir -p "$SCRIPT_DIR/results"
rm -f "$SCRIPT_DIR/results/"*.json

# Step 3: Make scripts executable
chmod +x "$SCRIPT_DIR"/*.sh
chmod +x "$SCRIPT_DIR"/*.js

# Step 4: Build and run Docker container
echo -e "${YELLOW}Step 3: Building Docker image...${NC}"
cd "$PROJECT_ROOT"

if docker compose -f test/docker-compose.yml build; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Docker image${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Running integration tests...${NC}"
echo ""

# Run the tests
if docker compose -f test/docker-compose.yml run --rm comply-server-test; then
    TEST_EXIT_CODE=0
    echo -e "${GREEN}✓ All tests completed successfully${NC}"
else
    TEST_EXIT_CODE=$?
    echo -e "${RED}✗ Some tests failed${NC}"
fi

# Step 5: Process results
echo ""
echo -e "${YELLOW}Step 5: Processing test results...${NC}"

if [ -d "$SCRIPT_DIR/results" ] && [ "$(ls -A $SCRIPT_DIR/results)" ]; then
    echo "Test results available in: $SCRIPT_DIR/results/"
    echo ""
    echo "Summary by Node version:"
    for result_file in "$SCRIPT_DIR/results"/*.json; do
        if [ -f "$result_file" ]; then
            NODE_VERSION=$(basename "$result_file" | sed 's/test-results-node-//;s/.json//;s/_/./g')
            PASSED=$(jq -r '.passed' "$result_file" 2>/dev/null || echo "0")
            FAILED=$(jq -r '.failed' "$result_file" 2>/dev/null || echo "0")
            
            if [ "$FAILED" == "0" ]; then
                echo -e "  ${GREEN}✓ Node $NODE_VERSION: $PASSED passed, $FAILED failed${NC}"
            else
                echo -e "  ${RED}✗ Node $NODE_VERSION: $PASSED passed, $FAILED failed${NC}"
            fi
        fi
    done
else
    echo "No test results found"
fi

# Step 6: Cleanup
echo ""
echo -e "${YELLOW}Step 6: Cleaning up...${NC}"
docker compose -f test/docker-compose.yml down 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"

echo ""
echo "=================================================="
echo "Integration Test Suite Complete"
echo "=================================================="

exit $TEST_EXIT_CODE