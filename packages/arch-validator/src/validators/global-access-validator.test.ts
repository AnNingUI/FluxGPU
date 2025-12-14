import { describe, it, expect } from 'vitest';
import { GlobalAccessValidator } from './global-access-validator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('GlobalAccessValidator', () => {
  const validator = new GlobalAccessValidator();

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

  it('should pass for code without global access', async () => {
    const content = `
      import { IRuntimeAdapter } from '@fluxgpu/contracts';
      
      export function createAdapter(adapter: IRuntimeAdapter) {
        return adapter;
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

  it('should detect window access', async () => {
    const content = `
      export function getWidth() {
        return window.innerWidth;
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('window');
      expect(result.errors[0].rule).toBe('no-global-access');
    } finally {
      await cleanup(filePath);
    }
  });

  it('should detect navigator access', async () => {
    const content = `
      export function getGPU() {
        return navigator.gpu;
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('navigator');
    } finally {
      await cleanup(filePath);
    }
  });

  it('should detect Worker access', async () => {
    const content = `
      export function createWorker() {
        return new Worker('./worker.js');
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Worker');
    } finally {
      await cleanup(filePath);
    }
  });

  it('should ignore globals in comments', async () => {
    const content = `
      // This function should not use window
      export function doSomething() {
        return 42;
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

  it('should ignore globals in string literals', async () => {
    const content = `
      export function getMessage() {
        return "Do not use window object";
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

  it('should detect multiple violations in one file', async () => {
    const content = `
      export function bad1() {
        return window.innerWidth;
      }
      
      export function bad2() {
        return document.body;
      }
      
      export function bad3() {
        return navigator.userAgent;
      }
    `;
    
    const filePath = await createTempFile(content);
    try {
      const result = await validator.validate([filePath]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    } finally {
      await cleanup(filePath);
    }
  });
});
