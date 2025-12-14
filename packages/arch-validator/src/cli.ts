#!/usr/bin/env node
// CLI for architectural validation
import { validateArchitecture } from './runner.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Determine root directory (assuming we're in packages/arch-validator/dist)
  const rootDir = path.resolve(__dirname, '../../..');

  // Domain packages that should be validated
  const domainPackages = [
    'packages/contracts',
    'packages/core',
    'packages/dsl'
  ];

  console.log('FluxGPU Architectural Constraint Validator\n');
  console.log('Validating domain packages:');
  domainPackages.forEach(pkg => console.log(`  - ${pkg}`));
  console.log('');

  const isValid = await validateArchitecture({
    domainPackages,
    rootDir
  });

  process.exit(isValid ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
