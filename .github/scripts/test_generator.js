#!/usr/bin/env node

// Test suite for the adaptive build workflow generator
const fs = require('fs');
const path = require('path');
const generator = require('./generate_build_workflow.js');

console.log('Testing adaptive build workflow generator...');

// Test 1: Test component discovery
console.log('✓ Testing component discovery...');
try {
  const discoveredComponents = generator.discoverComponents();
  if (!discoveredComponents || discoveredComponents.length === 0) {
    throw new Error('No components discovered');
  }
  console.log(`✓ Discovered ${discoveredComponents.length} components with CMakeLists.txt`);
} catch (error) {
  console.error(`✗ Component discovery failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Test dependency analysis
console.log('✓ Testing dependency analysis...');
try {
  const discoveredComponents = generator.discoverComponents();
  const dependencyMap = generator.analyzeDependencies(discoveredComponents);
  if (!dependencyMap || dependencyMap.size === 0) {
    throw new Error('Dependency analysis failed');
  }
  console.log(`✓ Analyzed dependencies for ${dependencyMap.size} components`);
} catch (error) {
  console.error(`✗ Dependency analysis failed: ${error.message}`);
  process.exit(1);
}

// Test 3: Test topological sorting
console.log('✓ Testing topological sorting...');
try {
  const discoveredComponents = generator.discoverComponents();
  const dependencyMap = generator.analyzeDependencies(discoveredComponents);
  const sortedComponents = generator.topologicalSort(discoveredComponents, dependencyMap);
  if (!sortedComponents || sortedComponents.length === 0) {
    throw new Error('Topological sorting failed');
  }
  console.log(`✓ Sorted ${sortedComponents.length} components in dependency order`);
} catch (error) {
  console.error(`✗ Topological sorting failed: ${error.message}`);
  process.exit(1);
}

// Test 4: Test build sequence generation
console.log('✓ Testing build sequence generation...');
try {
  const buildResult = generator.getBuildSequence();
  if (!buildResult.components || buildResult.components.length === 0) {
    throw new Error('Build sequence generation failed');
  }
  console.log(`✓ Generated build sequence with ${buildResult.components.length} components`);
  console.log(`✓ Selected ${buildResult.selectedComponents.length} components out of ${buildResult.coreComponents.length + buildResult.optionalComponents.length} total`);
} catch (error) {
  console.error(`✗ Build sequence generation failed: ${error.message}`);
  process.exit(1);
}

// Test 5: Test workflow generation
console.log('✓ Testing workflow generation...');
try {
  const workflow = generator.generateWorkflow();
  if (!workflow || workflow.length < 1000) {
    throw new Error('Generated workflow is too short or empty');
  }
  console.log(`✓ Generated workflow (${workflow.length} characters)`);
} catch (error) {
  console.error(`✗ Workflow generation failed: ${error.message}`);
  process.exit(1);
}

// Test 6: Check if generated file exists and is valid
console.log('✓ Testing generated file...');
const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'ci-org-generalized.yml');
if (!fs.existsSync(workflowPath)) {
  console.error('✗ Generated workflow file does not exist');
  process.exit(1);
}

const workflowContent = fs.readFileSync(workflowPath, 'utf8');
if (!workflowContent.includes('name: CI Org Generalized')) {
  console.error('✗ Generated workflow file is invalid');
  process.exit(1);
}
console.log('✓ Generated workflow file is valid');

// Test 7: Verify all components have build steps
console.log('✓ Testing build step generation...');
const { validComponents } = generator.generateBuildSteps();
for (const component of validComponents) {
  if (!workflowContent.includes(`Build and Install ${component}`)) {
    console.error(`✗ Missing build step for component: ${component}`);
    process.exit(1);
  }
}
console.log(`✓ All ${validComponents.length} components have build steps`);

// Test 8: Verify core components are included
console.log('✓ Testing core component inclusion...');
const buildResult = generator.getBuildSequence();
const coreIncluded = ['cogutil', 'atomspace', 'ure', 'opencog'].every(core => 
  buildResult.components.includes(core)
);
if (!coreIncluded) {
  console.error('✗ Some core components are missing from build sequence');
  process.exit(1);
}
console.log('✓ All essential core components are included');

// Test 9: Verify dependency order is respected
console.log('✓ Testing dependency order...');
const components = buildResult.components;
const cogutilIndex = components.indexOf('cogutil');
const atomspaceIndex = components.indexOf('atomspace');
const ureIndex = components.indexOf('ure');
const unifyIndex = components.indexOf('unify');

if (cogutilIndex === -1 || atomspaceIndex === -1) {
  console.error('✗ Essential components missing from sequence');
  process.exit(1);
}

if (cogutilIndex >= atomspaceIndex) {
  console.error('✗ Dependency order violation: cogutil should come before atomspace');
  process.exit(1);
}

if (ureIndex !== -1 && unifyIndex !== -1 && unifyIndex >= ureIndex) {
  console.error('✗ Dependency order violation: unify should come before ure');
  process.exit(1);
}

console.log('✓ Dependency order is correctly maintained');

console.log('\n🎉 All tests passed! The adaptive build workflow generator is working correctly.');