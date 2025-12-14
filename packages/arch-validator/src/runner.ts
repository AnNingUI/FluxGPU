// Main runner for architectural validation
import { glob } from 'glob';
import * as path from 'path';
import { GlobalAccessValidator } from './validators/global-access-validator.js';
import { InheritanceValidator } from './validators/inheritance-validator.js';
import { DependencyValidator } from './validators/dependency-validator.js';
import { mergeResults, type ValidationResult, type Validator } from './validators/validator.js';

export interface ValidatorConfig {
  domainPackages: string[];
  rootDir: string;
  validators?: Validator[];
}

export class ArchitectureValidator {
  private validators: Validator[];
  private config: ValidatorConfig;

  constructor(config: ValidatorConfig) {
    this.config = config;
    this.validators = config.validators || [
      new GlobalAccessValidator(),
      new InheritanceValidator(),
      new DependencyValidator()
    ];
  }

  async validate(): Promise<ValidationResult> {
    const files = await this.collectFiles();
    
    if (files.length === 0) {
      return {
        valid: true,
        errors: []
      };
    }

    const results = await Promise.all(
      this.validators.map(validator => validator.validate(files))
    );

    return mergeResults(...results);
  }

  private async collectFiles(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pkg of this.config.domainPackages) {
      const pattern = path.join(this.config.rootDir, pkg, 'src', '**', '*.ts');
      const files = await glob(pattern, {
        ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/dist/**']
      });
      allFiles.push(...files);
    }

    return allFiles;
  }

  printResults(result: ValidationResult): void {
    if (result.valid) {
      console.log('âœ?All architectural constraints validated successfully');
      return;
    }

    console.error(`âœ?Found ${result.errors.length} architectural constraint violation(s):\n`);

    // Group errors by file
    const errorsByFile = new Map<string, typeof result.errors>();
    for (const error of result.errors) {
      const existing = errorsByFile.get(error.file) || [];
      existing.push(error);
      errorsByFile.set(error.file, existing);
    }

    for (const [file, errors] of errorsByFile.entries()) {
      console.error(`\n${file}:`);
      for (const error of errors) {
        const location = error.line ? `:${error.line}:${error.column || 0}` : '';
        console.error(`  ${location} [${error.rule}] ${error.message}`);
      }
    }

    console.error(`\nâœ?${result.errors.length} error(s) found`);
  }
}

export async function validateArchitecture(config: ValidatorConfig): Promise<boolean> {
  const validator = new ArchitectureValidator(config);
  const result = await validator.validate();
  validator.printResults(result);
  return result.valid;
}
