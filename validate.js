#!/usr/bin/env node

/**
 * Validation Script
 * Validates project structure and required files
 */

const fs = require('fs');
const path = require('path');

console.log('Validating project structure...');

const requiredFiles = [
  'src/App.jsx',
  'src/index.jsx',
  'public/index.html',
  'package.json',
  'README.md'
];

const requiredDirectories = [
  'src',
  'src/components',
  'src/utils',
  'src/services',
  'tests'
];

let errors = [];

// Check required files
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${file}`);
  }
});

// Check required directories
requiredDirectories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    errors.push(`Missing required directory: ${dir}`);
  }
});

// Check package.json for required scripts
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredScripts = ['start', 'build', 'test'];
  
  requiredScripts.forEach(script => {
    if (!packageJson.scripts || !packageJson.scripts[script]) {
      errors.push(`Missing required script: ${script}`);
    }
  });
}

if (errors.length > 0) {
  console.error('Validation failed:');
  errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
} else {
  console.log('✓ Validation passed!');
}
