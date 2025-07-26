#!/usr/bin/env node

// Demo script showing how to add a new component to the build system
const fs = require('fs');
const path = require('path');

console.log('🚀 Demo: Adding a new component to the generalized build system\n');

// Simulate adding a new component
console.log('Step 1: Adding "pln" component to dependency order...');

const generatorPath = path.join(__dirname, 'generate_build_workflow.js');
let generatorContent = fs.readFileSync(generatorPath, 'utf8');

// Show current dependencies
const currentDeps = generatorContent.match(/const COMPONENT_DEPENDENCIES = \[([^\]]+)\]/s);
if (currentDeps) {
  console.log('Current dependencies:');
  console.log(currentDeps[1].replace(/'/g, '').split(',').map(s => s.trim()).filter(s => s).map((dep, i) => `  ${i + 1}. ${dep}`).join('\n'));
}

// Check if PLN component exists
const plnPath = path.join(process.cwd(), 'pln');
if (fs.existsSync(path.join(plnPath, 'CMakeLists.txt'))) {
  console.log('\n✅ PLN component found with CMakeLists.txt');
  
  // Add PLN to dependencies if not already there
  if (!generatorContent.includes("'pln'")) {
    console.log('\nStep 2: Adding PLN to dependency array...');
    const newDeps = generatorContent.replace(
      /'miner',\s*\n/,
      "'miner',        // Depends on opencog/ure\n  'pln',          // Depends on ure/miner (Probabilistic Logic Networks)\n"
    );
    
    // Save to temp file for demo
    const tempPath = path.join(__dirname, 'generate_build_workflow_demo.js');
    fs.writeFileSync(tempPath, newDeps);
    
    console.log('✅ PLN added to dependency order');
    console.log('\nStep 3: Regenerating workflow...');
    
    // Run the updated generator
    const { exec } = require('child_process');
    exec('node ' + tempPath, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error:', error);
        return;
      }
      console.log(stdout);
      
      // Clean up demo file
      fs.unlinkSync(tempPath);
      
      console.log('🎉 Demo complete! PLN would now be included in the build workflow.');
      console.log('\nTo make this permanent:');
      console.log('1. Edit .github/scripts/generate_build_workflow.js');
      console.log('2. Add "pln" to COMPONENT_DEPENDENCIES array');
      console.log('3. Commit the changes');
      console.log('4. The workflow will auto-regenerate via GitHub Actions');
    });
  } else {
    console.log('\n✅ PLN is already included in the build system');
  }
} else {
  console.log('\n⚠️  PLN component exists but no CMakeLists.txt found');
  console.log('   The generator will automatically skip components without CMakeLists.txt');
}

console.log('\n📚 Documentation:');
console.log('   See .github/scripts/README.md for full details on adding components');