# Generalized Build System

This directory contains scripts and workflows for the generalized OpenCog build system.

## Overview

The generalized build system automatically generates GitHub Actions workflows that build and install OpenCog components in the correct dependency order.

## Files

- `generate_build_workflow.js` - Main script that generates the build workflow
- `../workflows/ci-org-generalized.yml` - Generated workflow file (auto-generated, do not edit manually)
- `../workflows/generate-build-workflow.yml` - Workflow to auto-regenerate the build workflow

## How it Works

1. The script scans for OpenCog components that have `CMakeLists.txt` files
2. It builds them in dependency order: cogutil → atomspace → cogserver → opencog → asmoses → ure → unify → attention → miner
3. Each component follows the standardized build pattern:
   - Clean existing directory
   - Clone from https://github.com/opencog/{component}.git
   - Create build directory
   - Run cmake with Release configuration
   - Build with make -j2
   - Install with sudo make install
   - Run ldconfig

## Usage

### Manual Generation
```bash
node .github/scripts/generate_build_workflow.js
```

### Automatic Generation
The workflow is automatically regenerated when:
- The generator script is modified
- Any CMakeLists.txt file is added/modified
- Manually triggered via GitHub Actions

## Adding New Components

To add a new component to the build system:

1. Ensure the component has a `CMakeLists.txt` file in its root directory
2. Add the component name to the `COMPONENT_DEPENDENCIES` array in `generate_build_workflow.js` in the correct dependency order
3. Run the generator script or wait for automatic regeneration

## Component Dependencies

The current dependency order is:

1. **cogutil** - Base utilities (no dependencies)
2. **atomspace** - Depends on cogutil
3. **cogserver** - Depends on atomspace
4. **opencog** - Depends on cogserver  
5. **asmoses** - Depends on opencog
6. **ure** - Depends on opencog (Unified Rule Engine)
7. **unify** - Depends on opencog
8. **attention** - Depends on opencog
9. **miner** - Depends on opencog/ure

## Generated Workflow Features

The generated workflow includes:
- Component build and installation in dependency order
- Test execution for all components
- Test log artifact upload
- Build artifact upload
- Package generation (when available)
- PostgreSQL service for components that need it