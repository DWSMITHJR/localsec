#!/usr/bin/env node

/**
 * Build Hook Script
 * This script runs after the build process to perform any additional tasks
 */

const fs = require('fs');
const path = require('path');

console.log('Running post-build hook...');

// Create a build info file
const buildInfo = {
  buildTime: new Date().toISOString(),
  version: require('../package.json').version,
  nodeVersion: process.version,
  platform: process.platform
};

// Write build info to dist directory
const buildInfoPath = path.join(__dirname, '../dist/build-info.json');
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

console.log('Build hook completed successfully!');
console.log(`Build info written to: ${buildInfoPath}`);
