// Dependency validator - ensures architectural dependency rules are followed
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Validator, ValidationResult, ValidationError } from './validator.js';

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface PackageInfo {
  name: string;
  path: string;
  dependencies: string[];
}

export class DependencyValidator implements Validator {
  name = 'dependency-validator';
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  async validate(_files: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    try {
      const packages = await this.loadPackages();
      
      // Validate each package according to architectural rules
      for (const pkg of packages) {
        const pkgErrors = this.validatePackage(pkg);
        errors.push(...pkgErrors);
      }
    } catch (error) {
      errors.push({
        file: 'package.json',
        message: `Failed to validate dependencies: ${error instanceof Error ? error.message : String(error)}`,
        rule: 'dependency-validation'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async loadPackages(): Promise<PackageInfo[]> {
    const packagesDir = path.join(this.rootDir, 'packages');
    const packageDirs = await fs.readdir(packagesDir);
    
    const packages: PackageInfo[] = [];
    
    for (const dir of packageDirs) {
      const pkgPath = path.join(packagesDir, dir, 'package.json');
      
      try {
        const content = await fs.readFile(pkgPath, 'utf-8');
        const pkgJson: PackageJson = JSON.parse(content);
        
        // Extract runtime dependencies (not devDependencies)
        const dependencies = Object.keys(pkgJson.dependencies || {})
          .filter(dep => dep.startsWith('@flux/'));
        
        packages.push({
          name: pkgJson.name,
          path: pkgPath,
          dependencies
        });
      } catch (error) {
        // Skip if package.json doesn't exist or can't be read
        continue;
      }
    }
    
    return packages;
  }

  private validatePackage(pkg: PackageInfo): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Determine package type
    if (pkg.name === '@flux/contracts') {
      // Contracts must have zero runtime dependencies
      if (pkg.dependencies.length > 0) {
        errors.push({
          file: pkg.path,
          message: `Contracts package must have zero runtime dependencies, but found: ${pkg.dependencies.join(', ')}`,
          rule: 'contracts-zero-dependencies'
        });
      }
    } else if (pkg.name === '@flux/core' || pkg.name === '@flux/dsl') {
      // Core and DSL must depend only on contracts
      const invalidDeps = pkg.dependencies.filter(dep => dep !== '@flux/contracts');
      if (invalidDeps.length > 0) {
        errors.push({
          file: pkg.path,
          message: `${pkg.name} must depend only on @flux/contracts, but found: ${invalidDeps.join(', ')}`,
          rule: 'domain-layer-dependencies'
        });
      }
    } else if (pkg.name === '@flux/protocol') {
      // Protocol must depend only on contracts
      const invalidDeps = pkg.dependencies.filter(dep => dep !== '@flux/contracts');
      if (invalidDeps.length > 0) {
        errors.push({
          file: pkg.path,
          message: `Protocol package must depend only on @flux/contracts, but found: ${invalidDeps.join(', ')}`,
          rule: 'protocol-dependencies'
        });
      }
    } else if (pkg.name === '@flux/engine') {
      // Engine can depend on contracts, protocol, and dsl (for type-safe uniform buffers)
      const allowedDeps = ['@flux/contracts', '@flux/protocol', '@flux/dsl'];
      const invalidDeps = pkg.dependencies.filter(dep => !allowedDeps.includes(dep));
      if (invalidDeps.length > 0) {
        errors.push({
          file: pkg.path,
          message: `Engine package must depend only on @flux/contracts, @flux/protocol, and @flux/dsl, but found: ${invalidDeps.join(', ')}`,
          rule: 'engine-dependencies'
        });
      }
    } else if (pkg.name.startsWith('@flux/host-')) {
      // Host packages must depend only on contracts and protocol
      const invalidDeps = pkg.dependencies.filter(
        dep => dep !== '@flux/contracts' && dep !== '@flux/protocol'
      );
      if (invalidDeps.length > 0) {
        errors.push({
          file: pkg.path,
          message: `Host package ${pkg.name} must depend only on @flux/contracts and @flux/protocol, but found: ${invalidDeps.join(', ')}`,
          rule: 'host-dependencies'
        });
      }
    }
    
    return errors;
  }
}
