#!/bin/bash

# Stop the comply-server using the saved PID

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of scripts)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Check if start-pid file exists
if [ ! -f "start-pid" ]; then
    echo "No running comply-server found (start-pid file does not exist)"
    exit 0
fi

# Read the PID
PID=$(cat start-pid)

# Check if the process is running
if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping comply-server (PID: $PID)..."
    kill $PID
    
    # Wait a moment for graceful shutdown
    sleep 1
    
    # Check if still running and force kill if necessary
    if ps -p $PID > /dev/null 2>&1; then
        echo "Process didn't stop gracefully, force killing..."
        kill -9 $PID
    fi
    
    echo "comply-server stopped"
else
    echo "Process with PID $PID is not running"
fi

# Remove the PID file
rm -f start-pid
echo "Cleaned up start-pid file"