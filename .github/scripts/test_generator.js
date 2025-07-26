#!/usr/bin/env node

// Simple test for the build workflow generator
const fs = require('fs');
const path = require('path');
const generator = require('./generate_build_workflow.js');

console.log('Testing build workflow generator...');

// Test 1: Check if dependency array is defined
console.log('✓ Testing dependency array...');
if (!generator.COMPONENT_DEPENDENCIES || generator.COMPONENT_DEPENDENCIES.length === 0) {
  console.error('✗ COMPONENT_DEPENDENCIES is not defined or empty');
  process.exit(1);
}
console.log(`✓ Found ${generator.COMPONENT_DEPENDENCIES.length} components in dependency order`);

// Test 2: Test component detection
console.log('✓ Testing component detection...');
const rootDir = process.cwd();
let foundComponents = 0;
for (const component of generator.COMPONENT_DEPENDENCIES) {
  if (generator.isOpenCogComponent(rootDir, component)) {
    foundComponents++;
  }
}
console.log(`✓ Found ${foundComponents} valid components`);

// Test 3: Test workflow generation
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

// Test 4: Check if generated file exists and is valid
console.log('✓ Testing generated file...');
const workflowPath = path.join(rootDir, '.github', 'workflows', 'ci-org-generalized.yml');
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

// Test 5: Verify all components have build steps
console.log('✓ Testing build step generation...');
const { validComponents } = generator.generateBuildSteps();
for (const component of validComponents) {
  if (!workflowContent.includes(`Build and Install ${component}`)) {
    console.error(`✗ Missing build step for component: ${component}`);
    process.exit(1);
  }
}
console.log(`✓ All ${validComponents.length} components have build steps`);

console.log('\n🎉 All tests passed! The build workflow generator is working correctly.');