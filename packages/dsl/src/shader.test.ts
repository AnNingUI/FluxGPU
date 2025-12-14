import { describe, it, expect } from 'vitest';
import {
  simplexNoise,
  fbm,
  turbulence,
  compose,
  compileShader,
  registerAtom,
  type Atom,
  type WGSLSnippet,
} from './shader.js';

describe('DSL Shader Composition', () => {
  describe('Atoms', () => {
    it('should create simplexNoise atom', () => {
      const snippet = simplexNoise();
      expect(snippet.code).toContain('fn simplexNoise');
      expect(snippet.dependencies).toEqual([]);
    });

    it('should create fbm atom with simplexNoise dependency', () => {
      const snippet = fbm();
      expect(snippet.code).toContain('fn fbm');
      expect(snippet.dependencies).toContain('simplexNoise');
    });

    it('should create turbulence atom with simplexNoise dependency', () => {
      const snippet = turbulence();
      expect(snippet.code).toContain('fn turbulence');
      expect(snippet.dependencies).toContain('simplexNoise');
    });
  });

  describe('Molecule Composition', () => {
    it('should compose multiple atoms', () => {
      const molecule = compose({
        noise: simplexNoise,
        fbm: fbm,
      });
      
      expect(molecule.code).toContain('fn simplexNoise');
      expect(molecule.code).toContain('fn fbm');
      expect(molecule.dependencies).toContain('simplexNoise');
    });

    it('should aggregate dependencies from multiple atoms', () => {
      const molecule = compose({
        fbm: fbm,
        turbulence: turbulence,
      });
      
      expect(molecule.dependencies).toContain('simplexNoise');
    });
  });

  describe('Shader Compilation', () => {
    it('should compile shader with dependencies', () => {
      const shader = compileShader(fbm());
      
      // Should include simplexNoise (dependency) before fbm
      expect(shader).toContain('fn simplexNoise');
      expect(shader).toContain('fn fbm');
      
      const noiseIndex = shader.indexOf('fn simplexNoise');
      const fbmIndex = shader.indexOf('fn fbm');
      expect(noiseIndex).toBeLessThan(fbmIndex);
    });

    it('should perform tree shaking - exclude unused atoms', () => {
      // Register a custom atom that won't be used
      const unusedAtom: Atom = () => ({
        code: 'fn unused() -> f32 { return 0.0; }',
        dependencies: [],
      });
      registerAtom('unused', unusedAtom);
      
      // Compile shader that doesn't use the unused atom
      const shader = compileShader(simplexNoise());
      
      expect(shader).toContain('fn simplexNoise');
      expect(shader).not.toContain('fn unused');
    });

    it('should handle transitive dependencies', () => {
      const shader = compileShader(turbulence());
      
      // Should include simplexNoise (transitive dependency)
      expect(shader).toContain('fn simplexNoise');
      expect(shader).toContain('fn turbulence');
    });

    it('should compile molecule', () => {
      const molecule = compose({
        noise: simplexNoise,
        fbm: fbm,
      });
      
      const shader = compileShader(molecule);
      
      expect(shader).toContain('fn simplexNoise');
      expect(shader).toContain('fn fbm');
    });
  });

  describe('Custom Atoms', () => {
    it('should register and use custom atoms', () => {
      const customAtom: Atom = () => ({
        code: 'fn custom() -> f32 { return 1.0; }',
        dependencies: [],
      });
      
      registerAtom('custom', customAtom);
      
      const snippet: WGSLSnippet = {
        code: 'fn main() { let x = custom(); }',
        dependencies: ['custom'],
      };
      
      const shader = compileShader(snippet);
      expect(shader).toContain('fn custom');
      expect(shader).toContain('fn main');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing dependency', () => {
      const snippet: WGSLSnippet = {
        code: 'fn main() { let x = missing(); }',
        dependencies: ['missing'],
      };
      
      expect(() => compileShader(snippet)).toThrow("Dependency 'missing' not found");
    });
  });
});
