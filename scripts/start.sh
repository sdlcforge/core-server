#!/bin/bash

# Start the comply-server and save the PID

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of scripts)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Clear/create log file
> local-server.log

# Start the server using the dist file, redirecting output to log
node dist/comply-server-exec.js > local-server.log 2>&1 &

# Save the PID
echo $! > start-pid
PID=$(cat start-pid)

echo "Starting comply-server with PID: $PID"
echo "Server output is being logged to: local-server.log"

function check_if_running() {
    if ! ps -p $PID > /dev/null 2>&1; then
        echo ""
        echo "Error: Server process died unexpectedly. Check local-server.log for details."
        rm -f start-pid
        return 1
    fi
    return 0
}

# Wait for server to start listening
echo "Waiting for server to start..."
while true; do
    sleep 1
    echo -n "."

    # Check for successful startup
    if tail -n 5 local-server.log | grep -q "listening on"; then
        echo ""
        echo "Server is ready!"
        echo "Server started successfully. Logs are in local-server.log"
        echo "Use 'npm run stop' to stop the server."
        break
    fi
    
    # Check for errors
    ERROR_LINES=$(tail -n 5 local-server.log | grep -i error)
    if [ -n "$ERROR_LINES" ]; then
        # Check if process is still running
        check_if_running
        echo ""
        echo "Error: Server failed to start. Error details:"
        echo "$ERROR_LINES"
        exit 1
    fi
    
    # Check if process is still running (general check)
    check_if_running || exit 1
done