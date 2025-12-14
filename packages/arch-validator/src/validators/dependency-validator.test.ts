import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DependencyValidator } from './dependency-validator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('DependencyValidator', () => {
  let validator: DependencyValidator;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test packages
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dep-validator-test-'));
    
    // Create packages directory
    await fs.mkdir(path.join(tempDir, 'packages'), { recursive: true });
    
    // Create validator with temp directory as root
    validator = new DependencyValidator(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createPackage(name: string, dependencies: Record<string, string> = {}) {
    const pkgDir = path.join(tempDir, 'packages', name.replace('@flux/', ''));
    await fs.mkdir(pkgDir, { recursive: true });
    
    const pkgJson = {
      name,
      version: '1.0.0',
      dependencies
    };
    
    await fs.writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify(pkgJson, null, 2)
    );
  }

  it('should pass when contracts has zero runtime dependencies', async () => {
    await createPackage('@flux/contracts');
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when contracts has runtime dependencies', async () => {
    await createPackage('@flux/contracts', {
      '@flux/core': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('contracts-zero-dependencies');
    expect(result.errors[0].message).toContain('@flux/core');
  });

  it('should pass when core depends only on contracts', async () => {
    await createPackage('@flux/contracts');
    await createPackage('@flux/core', {
      '@flux/contracts': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when core depends on non-contracts packages', async () => {
    await createPackage('@flux/core', {
      '@flux/contracts': 'workspace:*',
      '@flux/protocol': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('domain-layer-dependencies');
    expect(result.errors[0].message).toContain('@flux/protocol');
  });

  it('should pass when dsl depends only on contracts', async () => {
    await createPackage('@flux/contracts');
    await createPackage('@flux/dsl', {
      '@flux/contracts': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when dsl depends on non-contracts packages', async () => {
    await createPackage('@flux/dsl', {
      '@flux/contracts': 'workspace:*',
      '@flux/engine': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('domain-layer-dependencies');
    expect(result.errors[0].message).toContain('@flux/engine');
  });

  it('should pass when protocol depends only on contracts', async () => {
    await createPackage('@flux/contracts');
    await createPackage('@flux/protocol', {
      '@flux/contracts': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when protocol depends on non-contracts packages', async () => {
    await createPackage('@flux/protocol', {
      '@flux/contracts': 'workspace:*',
      '@flux/core': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('protocol-dependencies');
    expect(result.errors[0].message).toContain('@flux/core');
  });

  it('should pass when infrastructure packages depend only on contracts and protocol', async () => {
    await createPackage('@flux/contracts');
    await createPackage('@flux/protocol', {
      '@flux/contracts': 'workspace:*'
    });
    await createPackage('@flux/engine', {
      '@flux/contracts': 'workspace:*',
      '@flux/protocol': 'workspace:*'
    });
    await createPackage('@flux/host-browser', {
      '@flux/contracts': 'workspace:*',
      '@flux/protocol': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when infrastructure packages depend on domain packages', async () => {
    await createPackage('@flux/engine', {
      '@flux/contracts': 'workspace:*',
      '@flux/protocol': 'workspace:*',
      '@flux/core': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe('infrastructure-dependencies');
    expect(result.errors[0].message).toContain('@flux/core');
  });

  it('should handle multiple violations across packages', async () => {
    await createPackage('@flux/contracts', {
      '@flux/core': 'workspace:*'
    });
    await createPackage('@flux/core', {
      '@flux/contracts': 'workspace:*',
      '@flux/protocol': 'workspace:*'
    });
    await createPackage('@flux/engine', {
      '@flux/contracts': 'workspace:*',
      '@flux/dsl': 'workspace:*'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('should ignore non-@flux dependencies', async () => {
    await createPackage('@flux/contracts');
    await createPackage('@flux/engine', {
      '@flux/contracts': 'workspace:*',
      '@flux/protocol': 'workspace:*',
      '@webgpu/types': '^0.1.40'
    });
    
    const result = await validator.validate([]);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
