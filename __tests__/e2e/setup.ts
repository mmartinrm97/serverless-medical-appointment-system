/**
 * E2E Test Setup
 * Verifies LocalStack is running and optionally cleans data
 */

import { execSync } from 'child_process';

/**
 * Enhanced setup with data cleaning option
 */
async function setupE2EEnvironment() {
  console.log('\n🔧 Setting up E2E test environment...\n');

  const cleanData = process.env.E2E_CLEAN_DATA === 'true';

  if (cleanData) {
    console.log('🧹 Cleaning LocalStack data...');
    try {
      // Reset LocalStack data
      execSync('curl -X POST http://localhost:4566/_localstack/state/reset', {
        stdio: 'pipe',
      });
      console.log('✅ LocalStack data cleaned');

      // Recreate resources
      console.log('🛠️  Recreating AWS resources...');
      execSync('node scripts/setup-localstack.js', { stdio: 'inherit' });
    } catch {
      console.warn('⚠️  Could not clean LocalStack data, continuing...');
    }
  }

  // Verify LocalStack is running
  try {
    execSync('curl -f http://localhost:4566/_localstack/health', {
      stdio: 'pipe',
    });
    console.log('✅ LocalStack is healthy and ready for tests\n');
  } catch {
    console.error('❌ LocalStack not available.');
    console.error(
      '💡 Please run "pnpm run local:start" first, then "pnpm run local:setup"\n'
    );
    console.error('💡 Or for clean environment: "pnpm run test:e2e:clean"\n');
    throw new Error(
      'LocalStack is not running. Please start it before running E2E tests.'
    );
  }
}

// Run setup
await setupE2EEnvironment();
