import { describe, it, expect } from 'vitest';
import { InheritanceValidator } from './inheritance-validator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('InheritanceValidator', () => {
  const validator = new InheritanceValidator();

  async function createTempFile(content: string): Promise<string> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flux-test-'));
    const filePath = path.join(tmpDir, 'test.ts');
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  async function cleanup(filePath: string) {
    try {
      await fs.unlink(filePath);
      await fs.rmdir(path.dirname(filePath));
    } catch {
      // Ignore cleanup errors
    }
  }

  it('should pass for classes with no inheritance', async () => {
    const content = `
      export class MyClass {
        value: number = 0;
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    } finally {
      await cleanup(filePath);
    }
  });

  it('should pass for classes with depth 1 inheritance', async () => {
    const content = `
      export class Base {
        value: number = 0;
      }
      
      export class Derived extends Base {
        name: string = '';
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    } finally {
      await cleanup(filePath);
    }
  });

  it('should fail for classes with depth 2 inheritance', async () => {
    const content = `
      export class Base {
        value: number = 0;
      }
      
      export class Middle extends Base {
        name: string = '';
      }
      
      export class Derived extends Middle {
        id: string = '';
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Derived');
      expect(result.errors[0].message).toContain('depth of 2');
      expect(result.errors[0].rule).toBe('max-inheritance-depth');
    } finally {
      await cleanup(filePath);
    }
  });

  it('should fail for classes with depth 3 inheritance', async () => {
    const content = `
      export class Level0 {
        a: number = 0;
      }
      
      export class Level1 extends Level0 {
        b: number = 0;
      }
      
      export class Level2 extends Level1 {
        c: number = 0;
      }
      
      export class Level3 extends Level2 {
        d: number = 0;
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(false);
      // Should have errors for Level2 (depth 2) and Level3 (depth 3)
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    } finally {
      await cleanup(filePath);
    }
  });

  it('should handle multiple independent class hierarchies', async () => {
    const content = `
      export class Base1 {
        value: number = 0;
      }
      
      export class Derived1 extends Base1 {
        name: string = '';
      }
      
      export class Base2 {
        id: string = '';
      }
      
      export class Derived2 extends Base2 {
        count: number = 0;
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(true);
    } finally {
      await cleanup(filePath);
    }
  });

  it('should handle classes extending external classes', async () => {
    const content = `
      import { EventEmitter } from 'events';
      
      export class MyEmitter extends EventEmitter {
        value: number = 0;
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      // Should pass because we only count depth within the file
      expect(result.valid).toBe(true);
    } finally {
      await cleanup(filePath);
    }
  });
});
