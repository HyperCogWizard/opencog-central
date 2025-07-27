#!/bin/bash

# Demo script showing how the new preservation logic works
# This script demonstrates the MOSES header preservation functionality

set -e

echo "=== MOSES Header Preservation Demo ==="
echo "This script demonstrates how local MOSES header modifications are preserved during CI builds."
echo ""

# Function to simulate the preservation logic
demo_preservation() {
    local component=$1
    echo "Component: $component"
    echo "Scenario: CI build detects local modifications to header files"
    echo ""
    
    echo "Steps performed by the enhanced CI workflow:"
    echo "1. Check if $component directory exists"
    echo "2. If exists, check if it's a git repository"
    echo "3. Check for uncommitted changes using 'git diff-index --quiet HEAD --'"
    echo "4. If modifications found:"
    echo "   a. Create timestamped backup directory"
    echo "   b. Backup all modified tracked files"
    echo "   c. Backup untracked header files (.h, .hpp, .hxx)"
    echo "   d. Stash changes with descriptive message"
    echo "   e. Perform safe git update (fetch + reset)"
    echo "   f. Attempt to reapply stashed changes"
    echo "   g. If conflicts, preserve backup for manual resolution"
    echo "5. If no modifications, proceed with regular git update"
    echo "6. Build component normally"
    echo ""
    
    echo "Benefits:"
    echo "✓ No destructive 'rm -rf' commands"
    echo "✓ Local experiments and modifications are preserved"
    echo "✓ Automatic backup system for safety"
    echo "✓ Transparent logging of all preservation steps"
    echo "✓ Fallback mechanisms for edge cases"
    echo "✓ Extensible to other components if needed"
    echo ""
}

# Demo for both MOSES components
demo_preservation "asmoses"
echo "---"
demo_preservation "moses"

echo "=== Key Improvements ==="
echo "Before: rm -rf moses && git clone ..."
echo "After:  Intelligent preservation with git-aware updates"
echo ""
echo "The workflow now ensures that any local modifications to MOSES headers"
echo "are safely preserved and reintegrated after updates, preventing loss"
echo "of experimental code and custom modifications."