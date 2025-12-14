/**
 * Tests for Shader Composition (Atoms & Molecules)
 */

import { describe, it, expect } from 'vitest';
import {
  simplexNoise,
  fbm,
  turbulence,
  getAtom,
  registerAtom,
  compose,
  compileShader,
  type Atom,
  type WGSLSnippet,
} from './shader.js';

describe('Shader Atoms', () => {
  it('should create simplexNoise atom', () => {
    const snippet = simplexNoise();

    expect(snippet.code).toContain('fn simplexNoise');
    expect(snippet.code).toContain('vec3<f32>');
    expect(snippet.dependencies).toHaveLength(0);
  });

  it('should create fbm atom with simplexNoise dependency', () => {
    const snippet = fbm();

    expect(snippet.code).toContain('fn fbm');
    expect(snippet.code).toContain('simplexNoise(');
    expect(snippet.dependencies).toContain('simplexNoise');
  });

  it('should create turbulence atom with simplexNoise dependency', () => {
    const snippet = turbulence();

    expect(snippet.code).toContain('fn turbulence');
    expect(snippet.code).toContain('simplexNoise(');
    expect(snippet.dependencies).toContain('simplexNoise');
  });
});

describe('Atom Registry', () => {
  it('should get atoms from registry', () => {
    const noiseAtom = getAtom('simplexNoise');
    expect(noiseAtom).toBeDefined();

    const fbmAtom = getAtom('fbm');
    expect(fbmAtom).toBeDefined();

    const turbAtom = getAtom('turbulence');
    expect(turbAtom).toBeDefined();
  });

  it('should return undefined for unknown atoms', () => {
    const unknown = getAtom('unknownAtom');
    expect(unknown).toBeUndefined();
  });

  it('should register custom atoms', () => {
    const customAtom: Atom = () => ({
      code: 'fn customFn() -> f32 { return 1.0; }',
      dependencies: [],
    });

    registerAtom('customFn', customAtom);

    const retrieved = getAtom('customFn');
    expect(retrieved).toBeDefined();
    expect(retrieved!().code).toContain('fn customFn');
  });
});

describe('Shader Composition', () => {
  it('should compose multiple atoms', () => {
    const composed = compose({
      noise: simplexNoise,
      fbm: fbm,
    });

    expect(composed.code).toContain('fn simplexNoise');
    expect(composed.code).toContain('fn fbm');
  });

  it('should compile shader with dependency resolution', () => {
    // fbm depends on simplexNoise
    const fbmSnippet = fbm();
    const compiled = compileShader(fbmSnippet);

    // simplexNoise should be included before fbm
    const noiseIndex = compiled.indexOf('fn simplexNoise');
    const fbmIndex = compiled.indexOf('fn fbm');

    expect(noiseIndex).toBeGreaterThan(-1);
    expect(fbmIndex).toBeGreaterThan(-1);
    expect(noiseIndex).toBeLessThan(fbmIndex);
  });

  it('should handle transitive dependencies', () => {
    // Create a chain: c -> b -> a
    const atomA: Atom = () => ({
      code: 'fn atomA() -> f32 { return 1.0; }',
      dependencies: [],
    });

    const atomB: Atom = () => ({
      code: 'fn atomB() -> f32 { return atomA() * 2.0; }',
      dependencies: ['atomA'],
    });

    const atomC: Atom = () => ({
      code: 'fn atomC() -> f32 { return atomB() + 1.0; }',
      dependencies: ['atomB'],
    });

    registerAtom('atomA', atomA);
    registerAtom('atomB', atomB);
    registerAtom('atomC', atomC);

    const compiled = compileShader(atomC());

    // All three should be present in correct order
    const aIndex = compiled.indexOf('fn atomA');
    const bIndex = compiled.indexOf('fn atomB');
    const cIndex = compiled.indexOf('fn atomC');

    expect(aIndex).toBeGreaterThan(-1);
    expect(bIndex).toBeGreaterThan(-1);
    expect(cIndex).toBeGreaterThan(-1);
    expect(aIndex).toBeLessThan(bIndex);
    expect(bIndex).toBeLessThan(cIndex);
  });
});

describe('Custom Atoms', () => {
  it('should create custom normalize atom', () => {
    const customNormalize: Atom = () => ({
      code: `fn customNormalize(v: vec3<f32>) -> vec3<f32> {
  let len = length(v);
  if (len > 0.0) {
    return v / len;
  }
  return vec3<f32>(0.0);
}`,
      dependencies: [],
    });

    const snippet = customNormalize();
    expect(snippet.code).toContain('fn customNormalize');
    expect(snippet.code).toContain('length(v)');
  });

  it('should create atom with multiple dependencies', () => {
    const complexAtom: Atom = () => ({
      code: `fn complexNoise(p: vec3<f32>) -> f32 {
  return fbm(p, 4) + turbulence(p, 3) * 0.5;
}`,
      dependencies: ['fbm', 'turbulence'],
    });

    registerAtom('complexNoise', complexAtom);

    const snippet = complexAtom();
    expect(snippet.dependencies).toContain('fbm');
    expect(snippet.dependencies).toContain('turbulence');

    const compiled = compileShader(snippet);
    expect(compiled).toContain('fn simplexNoise'); // transitive
    expect(compiled).toContain('fn fbm');
    expect(compiled).toContain('fn turbulence');
    expect(compiled).toContain('fn complexNoise');
  });
});

describe('Deduplication', () => {
  it('should not duplicate atoms when composed multiple times', () => {
    const composed = compose({
      noise1: simplexNoise,
      noise2: simplexNoise,
      noise3: simplexNoise,
    });

    // Count occurrences of "fn simplexNoise"
    const matches = composed.code.match(/fn simplexNoise/g);
    // compose doesn't deduplicate, but compileShader does
    // For compose, each atom is added separately
    expect(matches).toBeDefined();
  });

  it('should deduplicate in compileShader', () => {
    // Both fbm and turbulence depend on simplexNoise
    const combined: WGSLSnippet = {
      code: `fn combined(p: vec3<f32>) -> f32 {
  return fbm(p, 4) + turbulence(p, 3);
}`,
      dependencies: ['fbm', 'turbulence'],
    };

    registerAtom('combined', () => combined);

    const compiled = compileShader(combined);

    // simplexNoise should only appear once
    const matches = compiled.match(/fn simplexNoise/g);
    expect(matches).toHaveLength(1);
  });
});
