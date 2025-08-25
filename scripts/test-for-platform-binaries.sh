#!/bin/bash

# Script to check for platform-specific binaries in node_modules
# This helps determine if copying node_modules to Docker containers will work across platforms

set -e

echo "=================================================="
echo "Testing for Platform-Specific Binaries"
echo "=================================================="

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_MODULES_PATH="$PROJECT_ROOT/node_modules"

if [ ! -d "$NODE_MODULES_PATH" ]; then
    echo "❌ node_modules directory not found at: $NODE_MODULES_PATH"
    echo "   Please run 'npm install' first"
    exit 1
fi

echo "Checking node_modules at: $NODE_MODULES_PATH"
echo ""

# 1. Find executable files with platform-specific permissions
echo "1. Checking executable files..."
EXECUTABLE_COUNT=$(find "$NODE_MODULES_PATH" -type f -perm +111 | wc -l)
echo "   Found $EXECUTABLE_COUNT executable files"

# Sample some executable files to check their types
echo "   Checking sample executable file types:"
find "$NODE_MODULES_PATH" -type f -perm +111 | head -5 | while read -r file; do
    file_type=$(file "$file" 2>/dev/null || echo "unknown")
    echo "   - $(basename "$file"): $file_type"
done
echo ""

# 2. Look for binary directories
echo "2. Checking for binary directories..."
BIN_DIRS=$(find "$NODE_MODULES_PATH" -name "bin" -type d | wc -l)
echo "   Found $BIN_DIRS 'bin' directories"

# 3. Check for native Node.js modules (.node files)
echo "3. Checking for native Node.js modules..."
NATIVE_MODULES=$(find "$NODE_MODULES_PATH" -name "*.node" 2>/dev/null || true)
if [ -n "$NATIVE_MODULES" ]; then
    NATIVE_COUNT=$(echo "$NATIVE_MODULES" | wc -l)
    echo "   Found $NATIVE_COUNT native modules:"
    echo "$NATIVE_MODULES" | while read -r module; do
        if [ -f "$module" ]; then
            module_type=$(file "$module" 2>/dev/null || echo "unknown")
            echo "   - $(basename "$module"): $module_type"
        fi
    done
else
    echo "   No native modules (.node files) found ✓"
fi
echo ""

# 4. Check for platform-specific build directories
echo "4. Checking for platform-specific build directories..."
BUILD_DIRS=$(find "$NODE_MODULES_PATH" -path "*/prebuilds/*" -o -path "*/build/Release/*" 2>/dev/null || true)
if [ -n "$BUILD_DIRS" ]; then
    BUILD_COUNT=$(echo "$BUILD_DIRS" | wc -l)
    echo "   Found $BUILD_COUNT platform-specific build files:"
    echo "$BUILD_DIRS" | head -5
else
    echo "   No platform-specific build directories found ✓"
fi
echo ""

# 5. Look for shared libraries
echo "5. Checking for shared libraries..."
SHARED_LIBS=$(find "$NODE_MODULES_PATH" -name "*.so" -o -name "*.dylib" -o -name "*.dll" 2>/dev/null || true)
if [ -n "$SHARED_LIBS" ]; then
    LIB_COUNT=$(echo "$SHARED_LIBS" | wc -l)
    echo "   Found $LIB_COUNT shared libraries:"
    echo "$SHARED_LIBS"
else
    echo "   No shared libraries found ✓"
fi
echo ""

# 6. Check node_modules/.bin/ directory specifically
echo "6. Checking node_modules/.bin/ directory..."
BIN_PATH="$NODE_MODULES_PATH/.bin"
if [ -d "$BIN_PATH" ]; then
    BIN_FILES=$(ls -la "$BIN_PATH" | wc -l)
    echo "   Found $BIN_FILES entries in .bin/ directory"
    echo "   Sample entries:"
    ls -la "$BIN_PATH" | head -8 | tail -5
    
    # Check if these are mostly symlinks (good) or actual binaries (potentially problematic)
    SYMLINKS=$(find "$BIN_PATH" -type l | wc -l)
    REGULAR_FILES=$(find "$BIN_PATH" -type f | wc -l)
    echo "   - Symlinks: $SYMLINKS (good - platform independent)"
    echo "   - Regular files: $REGULAR_FILES (check if these are scripts or binaries)"
    
    # Check a few regular files
    if [ "$REGULAR_FILES" -gt 0 ]; then
        echo "   Checking types of regular files in .bin/:"
        find "$BIN_PATH" -type f | head -3 | while read -r file; do
            file_type=$(file "$file" 2>/dev/null || echo "unknown")
            echo "   - $(basename "$file"): $file_type"
        done
    fi
else
    echo "   No .bin/ directory found"
fi
echo ""

# 7. Summary and recommendation
echo "=================================================="
echo "SUMMARY AND RECOMMENDATION"
echo "=================================================="

ISSUES=0

if [ -n "$NATIVE_MODULES" ]; then
    echo "⚠️  Native modules found - may need platform-specific versions"
    ISSUES=$((ISSUES + 1))
fi

if [ -n "$BUILD_DIRS" ]; then
    echo "⚠️  Platform-specific build directories found"
    ISSUES=$((ISSUES + 1))
fi

if [ -n "$SHARED_LIBS" ]; then
    echo "⚠️  Shared libraries found - platform-specific"
    ISSUES=$((ISSUES + 1))
fi

if [ "$ISSUES" -eq 0 ]; then
    echo "✅ SAFE TO COPY node_modules to Docker containers"
    echo "   - No significant platform-specific binaries found"
    echo "   - Most executables appear to be Node.js scripts"
    echo "   - Cross-platform Docker copying should work well"
else
    echo "⚠️  POTENTIAL ISSUES copying node_modules to Docker containers"
    echo "   - $ISSUES potential platform-specific issues found"
    echo "   - Consider testing in target Docker environment first"
    echo "   - Most issues are typically handled gracefully by Node.js"
fi

echo ""
echo "Note: Even with platform-specific files, npm usually handles"
echo "cross-platform compatibility automatically. Test in your target"
echo "Docker environment to confirm compatibility."
echo "=================================================="