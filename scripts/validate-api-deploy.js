#!/usr/bin/env node
/**
 * Pre-deployment validation for api.peeap.com
 *
 * ZERO TOLERANCE POLICY: api.peeap.com must ONLY return JSON
 *
 * This script validates:
 * 1. api-deploy/vercel.json is correctly configured
 * 2. No HTML/index files exist in api-deploy
 * 3. No build output directories exist
 * 4. framework is null (no Vite/Next.js)
 *
 * Run before any deployment: node scripts/validate-api-deploy.js
 */

const fs = require('fs');
const path = require('path');

const API_DEPLOY_DIR = path.join(__dirname, '..', 'api-deploy');
const VERCEL_JSON_PATH = path.join(API_DEPLOY_DIR, 'vercel.json');

const FORBIDDEN_FILES = [
  'index.html',
  'index.htm',
  '200.html',
  '404.html',
  '_app.js',
  '_app.tsx',
];

const FORBIDDEN_DIRS = [
  'dist',
  'build',
  '.next',
  'out',
  '.output',
];

let hasErrors = false;

function error(msg) {
  console.error(`\x1b[31m✗ ERROR:\x1b[0m ${msg}`);
  hasErrors = true;
}

function success(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.warn(`\x1b[33m⚠ WARNING:\x1b[0m ${msg}`);
}

console.log('\n=== API Deployment Validation ===\n');
console.log('Domain: api.peeap.com');
console.log('Policy: ZERO TOLERANCE - JSON ONLY\n');

// Check 1: vercel.json exists
if (!fs.existsSync(VERCEL_JSON_PATH)) {
  error('api-deploy/vercel.json not found!');
} else {
  success('api-deploy/vercel.json exists');

  // Check 2: Parse and validate vercel.json
  try {
    const config = JSON.parse(fs.readFileSync(VERCEL_JSON_PATH, 'utf8'));

    // framework must be null
    if (config.framework !== null) {
      error(`framework must be null, got: ${JSON.stringify(config.framework)}`);
      error('This would deploy a frontend framework to the API domain!');
    } else {
      success('framework is null (correct)');
    }

    // buildCommand should be empty
    if (config.buildCommand && config.buildCommand.trim() !== '') {
      error(`buildCommand should be empty, got: "${config.buildCommand}"`);
    } else {
      success('buildCommand is empty (correct)');
    }

    // outputDirectory should not be set
    if (config.outputDirectory) {
      error(`outputDirectory should not be set, got: "${config.outputDirectory}"`);
    } else {
      success('outputDirectory is not set (correct)');
    }

    // Check headers for Content-Type: application/json
    const headers = config.headers || [];
    let hasJsonContentType = false;
    for (const headerConfig of headers) {
      const headerList = headerConfig.headers || [];
      for (const h of headerList) {
        if (h.key === 'Content-Type' && h.value === 'application/json') {
          hasJsonContentType = true;
        }
      }
    }
    if (hasJsonContentType) {
      success('Content-Type: application/json header is set');
    } else {
      warn('Content-Type header not explicitly set to application/json');
    }

  } catch (e) {
    error(`Failed to parse vercel.json: ${e.message}`);
  }
}

// Check 3: No forbidden files in api-deploy
console.log('\nChecking for forbidden files...');
for (const file of FORBIDDEN_FILES) {
  const filePath = path.join(API_DEPLOY_DIR, file);
  if (fs.existsSync(filePath)) {
    error(`Found forbidden file: api-deploy/${file}`);
  }
}

// Also check public folder
const publicDir = path.join(API_DEPLOY_DIR, 'public');
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  for (const file of publicFiles) {
    if (FORBIDDEN_FILES.includes(file)) {
      error(`Found forbidden file in public: api-deploy/public/${file}`);
    }
    if (file.endsWith('.html') || file.endsWith('.htm')) {
      error(`Found HTML file in public: api-deploy/public/${file}`);
    }
  }
  // Check if public folder only has allowed files
  const allowedPublicFiles = ['health.json', '.gitkeep'];
  for (const file of publicFiles) {
    if (!allowedPublicFiles.includes(file) && !file.endsWith('.json')) {
      warn(`Non-JSON file in public: api-deploy/public/${file}`);
    }
  }
}

success('No forbidden HTML files found');

// Check 4: No forbidden directories
console.log('\nChecking for forbidden directories...');
for (const dir of FORBIDDEN_DIRS) {
  const dirPath = path.join(API_DEPLOY_DIR, dir);
  if (fs.existsSync(dirPath)) {
    error(`Found forbidden directory: api-deploy/${dir}`);
    error('This indicates a build output that should not be deployed!');
  }
}
success('No forbidden directories found');

// Check 5: Verify .vercel/project.json points to correct project
console.log('\nChecking Vercel project link...');
const vercelProjectPath = path.join(API_DEPLOY_DIR, '.vercel', 'project.json');
if (fs.existsSync(vercelProjectPath)) {
  try {
    const projectConfig = JSON.parse(fs.readFileSync(vercelProjectPath, 'utf8'));
    if (projectConfig.projectName === 'peeap-api') {
      success(`Linked to correct project: ${projectConfig.projectName}`);
    } else {
      error(`Linked to wrong project: ${projectConfig.projectName}`);
      error('Expected: peeap-api');
    }
  } catch (e) {
    error(`Failed to parse .vercel/project.json: ${e.message}`);
  }
} else {
  warn('.vercel/project.json not found - run "npx vercel link" in api-deploy');
}

// Summary
console.log('\n=== Validation Summary ===\n');
if (hasErrors) {
  console.error('\x1b[31m✗ VALIDATION FAILED\x1b[0m');
  console.error('\nDO NOT DEPLOY until these issues are fixed!');
  console.error('Deploying with these errors could break api.peeap.com\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✓ VALIDATION PASSED\x1b[0m');
  console.log('\napi-deploy is correctly configured for JSON-only responses.');
  console.log('Safe to deploy to api.peeap.com\n');
  process.exit(0);
}
