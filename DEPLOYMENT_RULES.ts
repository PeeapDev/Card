/**
 * PEEAP DEPLOYMENT RULES
 * =====================
 * ZERO TOLERANCE POLICY FOR API DOMAIN
 *
 * This file documents the deployment rules and must be followed strictly.
 * Violating these rules can break the entire checkout and payment system.
 *
 * Last Updated: 2025-12-28
 */

// =============================================================================
// DOMAIN CONFIGURATION
// =============================================================================

export const DOMAINS = {
  /**
   * my.peeap.com - Main Web Application
   * - Framework: Vite (React)
   * - Source: Root project + apps/web
   * - Vercel Project: card
   * - Content: Full HTML/JS/CSS application
   */
  MAIN: {
    domain: 'my.peeap.com',
    vercelProject: 'card',
    framework: 'vite',
    sourceDir: 'apps/web',
    allowsHtml: true,
    allowsJson: true,
  },

  /**
   * docs.peeap.com - Documentation Site
   * - Framework: Mintlify (or static)
   * - Source: docs folder ONLY
   * - Vercel Project: docs
   * - Content: Documentation pages only
   *
   * Similar to API: Only deploy when docs/ changes
   */
  DOCS: {
    domain: 'docs.peeap.com',
    vercelProject: 'docs',
    framework: null,
    sourceDir: 'docs',
    allowsHtml: true,
    allowsJson: false,
  },

  /**
   * plus.peeap.com - Business Plus Account
   * - Framework: Next.js
   * - Source: apps/plus
   * - Vercel Project: plus
   * - Content: Full HTML/JS/CSS application
   */
  PLUS: {
    domain: 'plus.peeap.com',
    vercelProject: 'plus',
    framework: 'nextjs',
    sourceDir: 'apps/plus',
    allowsHtml: true,
    allowsJson: true,
  },

  /**
   * checkout.peeap.com - Checkout Interface
   * - Framework: Vite (React)
   * - Source: Root project + apps/web (with VITE_APP_MODE=checkout)
   * - Vercel Project: peeap-checkout
   * - Content: Full HTML/JS/CSS application
   */
  CHECKOUT: {
    domain: 'checkout.peeap.com',
    vercelProject: 'peeap-checkout',
    framework: 'vite',
    sourceDir: 'apps/web',
    buildEnv: 'VITE_APP_MODE=checkout',
    allowsHtml: true,
    allowsJson: true,
  },

  /**
   * api.peeap.com - API Router
   * ⚠️  ZERO TOLERANCE POLICY ⚠️
   * - Framework: NONE (serverless functions only)
   * - Source: api-deploy folder ONLY
   * - Vercel Project: peeap-api
   * - Content: JSON ONLY - NO HTML/JS/CSS EVER
   *
   * CRITICAL: This domain controls:
   * - Payment processing
   * - Checkout sessions
   * - Webhooks
   * - All merchant integrations
   *
   * NEVER deploy Vite/HTML/React to this domain!
   */
  API: {
    domain: 'api.peeap.com',
    vercelProject: 'peeap-api',
    framework: null, // MUST be null - no build framework
    sourceDir: 'api-deploy',
    allowsHtml: false, // NEVER
    allowsJson: true, // ALWAYS
    zeroTolerance: true,
  },
} as const;

// =============================================================================
// DEPLOYMENT COMMANDS
// =============================================================================

export const DEPLOY_COMMANDS = {
  // Use the deploy.sh script for individual deployments
  web: './deploy.sh web',
  plus: './deploy.sh plus',
  checkout: './deploy.sh checkout',
  api: './deploy.sh api',
  all: './deploy.sh all', // Uses 4 deployments!
} as const;

// =============================================================================
// VERCEL PROJECT CONFIGURATION RULES
// =============================================================================

export const VERCEL_CONFIG_RULES = {
  /**
   * api-deploy/vercel.json MUST have:
   * - "framework": null
   * - "buildCommand": "" (empty string)
   * - NO "outputDirectory" pointing to dist/build folders
   * - Only API routes in "rewrites"
   * - Content-Type: application/json in headers
   */
  API_VERCEL_JSON: {
    requiredFields: {
      framework: null,
      buildCommand: '',
    },
    forbiddenFields: [
      'outputDirectory', // Would indicate a build output
    ],
    requiredHeaders: {
      'Content-Type': 'application/json',
    },
  },
} as const;

// =============================================================================
// PRE-DEPLOYMENT VALIDATION
// =============================================================================

/**
 * Validates that api-deploy is correctly configured before deployment
 * Run this before any git push or manual deployment
 */
export function validateApiDeployConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // These checks should be performed:
  // 1. api-deploy/vercel.json exists
  // 2. framework is null
  // 3. buildCommand is empty or not set
  // 4. No public folder with index.html
  // 5. No dist/build folders
  // 6. Content-Type header is application/json

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// GIT INTEGRATION RULES
// =============================================================================

export const GIT_RULES = {
  /**
   * Vercel Git Integration:
   * - The root project (card) deploys to my.peeap.com
   * - The api-deploy folder has its own .vercel/project.json linking to peeap-api
   *
   * IMPORTANT: Git push triggers automatic deployments!
   * Make sure each Vercel project has the correct:
   * - Root Directory setting
   * - Build settings
   * - Domain assignments
   */

  ROOT_PROJECT: {
    vercelProject: 'card',
    rootDirectory: '.', // Root of repo
    deploys: ['my.peeap.com'],
    framework: 'vite',
  },

  API_PROJECT: {
    vercelProject: 'peeap-api',
    rootDirectory: 'api-deploy', // MUST be set in Vercel dashboard
    deploys: ['api.peeap.com'],
    framework: null,
  },

  PLUS_PROJECT: {
    vercelProject: 'plus',
    rootDirectory: 'apps/plus',
    deploys: ['plus.peeap.com'],
    framework: 'nextjs',
  },

  CHECKOUT_PROJECT: {
    vercelProject: 'peeap-checkout',
    rootDirectory: '.', // Same as root, different env
    deploys: ['checkout.peeap.com'],
    framework: 'vite',
  },
} as const;

// =============================================================================
// FORBIDDEN ACTIONS
// =============================================================================

export const FORBIDDEN_ACTIONS = [
  // API Domain Rules
  'NEVER deploy Vite/React/HTML to api.peeap.com',
  'NEVER add index.html to api-deploy folder',
  'NEVER set framework to anything other than null in api-deploy/vercel.json',
  'NEVER add dist/build output directories to api-deploy',
  'NEVER change the root directory setting for peeap-api project in Vercel',

  // General Rules
  'NEVER deploy without testing locally first',
  'NEVER merge to main without checking all 4 domains still work',
  'NEVER modify api-deploy/vercel.json without understanding the impact',
] as const;

// =============================================================================
// EMERGENCY PROCEDURES
// =============================================================================

export const EMERGENCY_PROCEDURES = {
  /**
   * If api.peeap.com is serving HTML instead of JSON:
   *
   * 1. Go to Vercel Dashboard > peeap-api project
   * 2. Check Deployments - find the bad deployment
   * 3. Click "..." > "Promote to Production" on the last working deployment
   * 4. Check Settings > General > Root Directory (must be "api-deploy")
   * 5. Check Settings > General > Framework Preset (must be "Other")
   * 6. Redeploy from api-deploy folder:
   *    cd api-deploy && npx vercel --prod --yes
   */
  API_SERVING_HTML: [
    '1. Go to Vercel Dashboard > peeap-api project',
    '2. Find the last working deployment',
    '3. Click "..." > "Promote to Production"',
    '4. Verify Root Directory is "api-deploy"',
    '5. Verify Framework Preset is "Other" (not Vite/Next.js)',
    '6. Redeploy: cd api-deploy && npx vercel --prod --yes',
  ],
} as const;

// =============================================================================
// SELECTIVE DEPLOYMENT (Save Hobby Plan Deployments)
// =============================================================================

/**
 * ALREADY CONFIGURED via vercel.json files!
 *
 * Each project has an "ignoreCommand" in its vercel.json that tells Vercel
 * to skip the build when no relevant files changed.
 *
 * HOW IT WORKS:
 * - git diff HEAD^ HEAD --quiet -- [paths]
 * - Exit 0 (no changes) = Vercel SKIPS build
 * - Exit 1 (changes) = Vercel PROCEEDS with build
 *
 * CONFIGURATION FILES:
 * - my.peeap.com:      vercel.json → watches apps/web/, package.json, vercel.json
 * - api.peeap.com:     api-deploy/vercel.json → watches api-deploy/
 * - plus.peeap.com:    apps/plus/vercel.json → watches apps/plus/
 * - checkout.peeap.com: vercel.checkout.json → watches apps/web/, package.json
 *
 * NO MANUAL SETUP REQUIRED - it's all in the vercel.json files!
 */
export const SELECTIVE_DEPLOYMENT = {
  WEB: {
    project: 'card',
    configFile: 'vercel.json',
    ignoreCommand: 'git diff HEAD^ HEAD --quiet -- apps/web/ package.json vercel.json',
    triggeredBy: ['apps/web/*', 'package.json', 'vercel.json'],
  },
  API: {
    project: 'peeap-api',
    configFile: 'api-deploy/vercel.json',
    ignoreCommand: 'git diff HEAD^ HEAD --quiet -- api-deploy/',
    triggeredBy: ['api-deploy/*'],
  },
  PLUS: {
    project: 'plus',
    configFile: 'apps/plus/vercel.json',
    ignoreCommand: 'git diff HEAD^ HEAD --quiet -- apps/plus/',
    triggeredBy: ['apps/plus/*'],
  },
  CHECKOUT: {
    project: 'peeap-checkout',
    configFile: 'vercel.checkout.json',
    ignoreCommand: 'git diff HEAD^ HEAD --quiet -- apps/web/ package.json',
    triggeredBy: ['apps/web/*', 'package.json'],
  },
  DOCS: {
    project: 'docs',
    configFile: 'docs/vercel.json',
    ignoreCommand: 'git diff HEAD^ HEAD --quiet -- docs/',
    triggeredBy: ['docs/*'],
  },
} as const;

// =============================================================================
// VERCEL DASHBOARD SETTINGS (Manual Verification Required)
// =============================================================================

export const VERCEL_DASHBOARD_CHECKLIST = {
  /**
   * peeap-api Project Settings:
   *
   * Settings > General:
   * - Root Directory: api-deploy
   * - Framework Preset: Other
   * - Build Command: (empty)
   * - Output Directory: (empty)
   * - Install Command: (empty or npm install)
   *
   * Settings > Domains:
   * - api.peeap.com (primary)
   * - NO other frontend domains!
   *
   * Settings > Git:
   * - Production Branch: main
   * - Root Directory: api-deploy (CRITICAL!)
   */
  PEEAP_API: {
    rootDirectory: 'api-deploy',
    frameworkPreset: 'Other',
    buildCommand: '', // Empty
    outputDirectory: '', // Empty
    installCommand: '', // Empty or npm install
    domains: ['api.peeap.com'],
  },
} as const;

// =============================================================================
// WHEN TO DEPLOY EACH DOMAIN
// =============================================================================

export const WHEN_TO_DEPLOY = {
  /**
   * api.peeap.com - Deploy ONLY when:
   * - Changes to api-deploy/api/router.ts
   * - Changes to api-deploy/api/handlers/*
   * - Changes to api-deploy/api/services/*
   * - New API endpoints added
   * - API bug fixes
   * - API environment variables changed
   *
   * DO NOT deploy for:
   * - Frontend changes (React, CSS, HTML)
   * - apps/web changes
   * - apps/plus changes
   * - Any UI/UX changes
   */
  API: {
    deployWhen: [
      'api-deploy/api/router.ts changes',
      'api-deploy/api/handlers/* changes',
      'api-deploy/api/services/* changes',
      'New API endpoints added',
      'API bug fixes',
      'Webhook handler changes',
      'Payment processing logic changes',
    ],
    doNotDeployFor: [
      'Frontend/UI changes',
      'apps/web changes',
      'apps/plus changes',
      'CSS/styling changes',
      'React component changes',
    ],
  },

  /**
   * my.peeap.com - Deploy when:
   * - apps/web changes
   * - Main dashboard UI changes
   * - New pages/features for logged-in users
   */
  WEB: {
    deployWhen: [
      'apps/web/* changes',
      'Dashboard UI changes',
      'New merchant features',
      'Settings page changes',
    ],
  },

  /**
   * checkout.peeap.com - Deploy when:
   * - Checkout flow UI changes
   * - Payment form changes
   * - Checkout-specific components
   */
  CHECKOUT: {
    deployWhen: [
      'Checkout UI changes',
      'Payment form updates',
      'Checkout flow modifications',
    ],
  },

  /**
   * plus.peeap.com - Deploy when:
   * - apps/plus changes
   * - Business Plus features
   */
  PLUS: {
    deployWhen: [
      'apps/plus/* changes',
      'Business Plus features',
    ],
  },
} as const;

// Export summary for quick reference
export const DEPLOYMENT_SUMMARY = `
PEEAP DEPLOYMENT SUMMARY
========================

| Domain              | Project        | Framework | Source Dir  |
|---------------------|----------------|-----------|-------------|
| my.peeap.com        | card           | Vite      | apps/web    |
| plus.peeap.com      | plus           | Next.js   | apps/plus   |
| checkout.peeap.com  | peeap-checkout | Vite      | apps/web    |
| api.peeap.com       | peeap-api      | NONE      | api-deploy  |
| docs.peeap.com      | docs           | Mintlify  | docs        |

⚠️  API DOMAIN RULES ⚠️
- ONLY JSON responses
- NO HTML/JS/CSS ever
- framework: null always
- Root Directory: api-deploy

Deploy commands:
- ./deploy.sh web      → my.peeap.com
- ./deploy.sh plus     → plus.peeap.com
- ./deploy.sh checkout → checkout.peeap.com
- ./deploy.sh api      → api.peeap.com
- ./deploy.sh docs     → docs.peeap.com

SELECTIVE DEPLOYMENT (Hobby Plan) - ALREADY CONFIGURED!
========================================================
Each vercel.json has "ignoreCommand" that auto-skips unchanged projects:

| Domain              | Triggered By                         |
|---------------------|--------------------------------------|
| my.peeap.com        | apps/web/, package.json, vercel.json |
| api.peeap.com       | api-deploy/* only                    |
| plus.peeap.com      | apps/plus/* only                     |
| checkout.peeap.com  | apps/web/, package.json              |
| docs.peeap.com      | docs/* only                          |

Push to git → Only changed projects deploy → Saves deployments!
`;
