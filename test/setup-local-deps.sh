#!/bin/bash

set -e

COPY_DEPS="$1"

echo "Setting up local dependencies..."
echo "COPY_DEPS: $COPY_DEPS"

# Parse package.json for file: dependencies
PACKAGE_JSON="/home/testuser/package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
    echo "Error: package.json not found at $PACKAGE_JSON"
    exit 1
fi

# Extract file: dependencies using node
node -e "
const pkg = require('$PACKAGE_JSON');
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

for (const [name, version] of Object.entries(deps || {})) {
    if (version.startsWith('file:')) {
        const filePath = version.substring(5); // Remove 'file:' prefix
        
        // Check for absolute paths
        if (filePath.startsWith('/')) {
            console.error('Error: Absolute file path not supported: ' + filePath);
            process.exit(1);
        }
        
        console.log('FILE_DEP:' + name + ':' + filePath);
    }
}
" > /tmp/file_deps.txt

# Check if the node script failed
if [ $? -ne 0 ]; then
    echo "Error: Failed to parse package.json or found absolute file path"
    exit 1
fi

# Process each file dependency
while IFS= read -r line; do
    if [[ $line == FILE_DEP:* ]]; then
        # Extract name and path
        dep_info="${line#FILE_DEP:}"
        dep_name="${dep_info%%:*}"
        dep_path="${dep_info#*:}"
        
        echo "Processing dependency: $dep_name -> $dep_path"
        
        # Create the directory structure in the container
        target_dir="/home/testuser/$dep_path"
        mkdir -p "$(dirname "$target_dir")"
        
        # Check if this dependency was provided in COPY_DEPS
        dep_found=false
        IFS=',' read -ra DEPS_ARRAY <<< "$COPY_DEPS"
        for dep_dir in "${DEPS_ARRAY[@]}"; do
            dep_dir=$(echo "$dep_dir" | xargs) # trim whitespace
            if [ -d "/home/testuser/deps/$dep_dir" ]; then
                echo "Copying $dep_dir to $target_dir"
                cp -r "/home/testuser/deps/$dep_dir"/* "$target_dir/"
                dep_found=true
                break
            fi
        done
        
        if [ "$dep_found" = false ]; then
            echo "Warning: Dependency directory not found in COPY_DEPS: $dep_path"
            echo "Available dependencies: $COPY_DEPS"
        fi
    fi
done < /tmp/file_deps.txt

echo "Local dependencies setup complete"