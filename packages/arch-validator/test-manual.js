// Manual test script to verify the validator works
// Run with: node packages/arch-validator/test-manual.js

import { GlobalAccessValidator } from './src/validators/global-access-validator.js';
import { InheritanceValidator } from './src/validators/inheritance-validator.js';
import { glob } from 'glob';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('FluxGPU Architectural Constraint Validator - Manual Test\n');

  const rootDir = path.resolve(__dirname, '../..');
  const domainPackages = ['packages/contracts', 'packages/core', 'packages/dsl'];

  // Collect files
  const allFiles = [];
  for (const pkg of domainPackages) {
    const pattern = path.join(rootDir, pkg, 'src', '**', '*.ts');
    const files = await glob(pattern, {
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**']
    });
    allFiles.push(...files);
  }

  console.log(`Found ${allFiles.length} files to validate\n`);

  // Run validators
  const globalValidator = new GlobalAccessValidator();
  const inheritanceValidator = new InheritanceValidator();

  console.log('Running GlobalAccessValidator...');
  const globalResult = await globalValidator.validate(allFiles);
  console.log(`  Result: ${globalResult.valid ? '✓ PASS' : '✗ FAIL'}`);
  if (!globalResult.valid) {
    console.log(`  Errors: ${globalResult.errors.length}`);
    globalResult.errors.forEach(err => {
      console.log(`    ${err.file}:${err.line} - ${err.message}`);
    });
  }

  console.log('\nRunning InheritanceValidator...');
  const inheritanceResult = await inheritanceValidator.validate(allFiles);
  console.log(`  Result: ${inheritanceResult.valid ? '✓ PASS' : '✗ FAIL'}`);
  if (!inheritanceResult.valid) {
    console.log(`  Errors: ${inheritanceResult.errors.length}`);
    inheritanceResult.errors.forEach(err => {
      console.log(`    ${err.file}:${err.line} - ${err.message}`);
    });
  }

  const allValid = globalResult.valid && inheritanceResult.valid;
  console.log(`\n${allValid ? '✓' : '✗'} Overall: ${allValid ? 'PASS' : 'FAIL'}`);
  process.exit(allValid ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
