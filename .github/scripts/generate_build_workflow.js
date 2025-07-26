#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define the dependency order for OpenCog components
// Based on the current ci-org-v7.yml and typical OpenCog build dependencies
const COMPONENT_DEPENDENCIES = [
  'cogutil',      // Base utilities - no dependencies
  'atomspace',    // Depends on cogutil
  'cogserver',    // Depends on atomspace
  'opencog',      // Depends on cogserver
  'asmoses',      // Depends on opencog
  'ure',          // Depends on opencog (Unified Rule Engine)
  'unify',        // Depends on opencog
  'attention',    // Depends on opencog
  'miner',        // Depends on opencog/ure
];

// Template for build step
const BUILD_STEP_TEMPLATE = `      # Build and Install {{dir_name}}
      - name: Build and Install {{dir_name}}
        run: |
          # Clean existing directory
          rm -rf {{dir_name}}
          # Clone the repository
          git clone https://github.com/opencog/{{dir_name}}.git
          mkdir -p {{dir_name}}/build
          cd {{dir_name}}/build
          cmake -DCMAKE_BUILD_TYPE=Release ..
          make -j2
          sudo make install
          sudo ldconfig
          cd ../..`;

// Template for the complete workflow
const WORKFLOW_TEMPLATE = `# .github/workflows/ci-org-generalized.yml
# Auto-generated workflow for building and installing OpenCog components

name: CI Org Generalized

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  CCACHE_DIR: /ws/ccache
  MAKEFLAGS: -j2

jobs:
  build-and-test:
    name: Build and Test All Components
    runs-on: ubuntu-latest
    container:
      image: opencog/opencog-deps
      options: --user root
      env:
        CCACHE_DIR: /ws/ccache
        MAKEFLAGS: -j2
    services:
      opencog-postgres:
        image: opencog/postgres
        env:
          POSTGRES_USER: opencog_test
          POSTGRES_PASSWORD: cheese
          POSTGRES_DB: atomspace_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      # 1. Checkout the Repository
      - name: Checkout Repository
        uses: actions/checkout@v4

      # 2. Install Build Dependencies
      - name: Install Build Dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y ccache pkg-config cmake build-essential git

{{build_steps}}

{{test_steps}}

      # Upload Test Logs
      - name: Upload Test Logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-logs
          path: |
{{test_log_paths}}

      # (Optional) Package Components
      - name: Package Components
        if: github.ref == 'refs/heads/main'
        run: |
{{package_steps}}

      # Upload Build Artifacts
      - name: Upload Build Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
{{artifact_paths}}`;

/**
 * Check if a directory exists and contains CMakeLists.txt indicating it's a buildable component
 */
function isOpenCogComponent(dirPath, componentName) {
  const cmakeFile = path.join(dirPath, componentName, 'CMakeLists.txt');
  return fs.existsSync(cmakeFile);
}

/**
 * Generate build steps for all components in dependency order
 */
function generateBuildSteps() {
  const rootDir = process.cwd();
  const validComponents = [];
  
  // Filter components that actually exist and are buildable
  for (const component of COMPONENT_DEPENDENCIES) {
    if (isOpenCogComponent(rootDir, component)) {
      validComponents.push(component);
    } else {
      console.log(`Warning: Component '${component}' not found or not buildable, skipping...`);
    }
  }
  
  // Generate build steps
  const buildSteps = validComponents.map(component => {
    return BUILD_STEP_TEMPLATE.replace(/{{dir_name}}/g, component);
  }).join('\n\n');
  
  return { validComponents, buildSteps };
}

/**
 * Generate test steps for all valid components
 */
function generateTestSteps(validComponents) {
  const testCommands = validComponents.map(component => {
    return `          # ${component} Tests
          cd ${component}/build
          make tests
          make check ARGS="$MAKEFLAGS"
          cd ../..`;
  }).join('\n\n');
  
  return `      # Run Tests for Each Component
      - name: Run Tests
        run: |
${testCommands}`;
}

/**
 * Generate test log paths for artifact upload
 */
function generateTestLogPaths(validComponents) {
  return validComponents.map(component => 
    `            ${component}/build/Testing/Temporary/LastTest.log`
  ).join('\n');
}

/**
 * Generate package steps for components
 */
function generatePackageSteps(validComponents) {
  return validComponents.map(component => {
    return `          # ${component} Packaging
          cd ${component}/build
          make package || echo "${component} package target not defined."
          cd ../..`;
  }).join('\n\n');
}

/**
 * Generate artifact paths for build artifacts
 */
function generateArtifactPaths(validComponents) {
  return validComponents.map(component => 
    `            ${component}/build/`
  ).join('\n');
}

/**
 * Main function to generate the complete workflow
 */
function generateWorkflow() {
  console.log('Generating generalized build workflow...');
  
  const { validComponents, buildSteps } = generateBuildSteps();
  const testSteps = generateTestSteps(validComponents);
  const testLogPaths = generateTestLogPaths(validComponents);
  const packageSteps = generatePackageSteps(validComponents);
  const artifactPaths = generateArtifactPaths(validComponents);
  
  console.log(`Found ${validComponents.length} valid components: ${validComponents.join(', ')}`);
  
  const workflow = WORKFLOW_TEMPLATE
    .replace('{{build_steps}}', buildSteps)
    .replace('{{test_steps}}', testSteps)
    .replace('{{test_log_paths}}', testLogPaths)
    .replace('{{package_steps}}', packageSteps)
    .replace('{{artifact_paths}}', artifactPaths);
    
  return workflow;
}

/**
 * Save the generated workflow to file
 */
function saveWorkflow() {
  try {
    const workflow = generateWorkflow();
    const outputPath = path.join(process.cwd(), '.github', 'workflows', 'ci-org-generalized.yml');
    
    fs.writeFileSync(outputPath, workflow);
    console.log(`Generated workflow saved to: ${outputPath}`);
    console.log('Workflow generation completed successfully!');
    
    return true;
  } catch (error) {
    console.error('Error generating workflow:', error);
    return false;
  }
}

// Export functions for testing
module.exports = {
  generateWorkflow,
  generateBuildSteps,
  isOpenCogComponent,
  COMPONENT_DEPENDENCIES
};

// Run if called directly
if (require.main === module) {
  saveWorkflow();
}