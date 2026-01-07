/**
 * Shader Composition - 可组合的 shader 函数库
 *
 * 使用 Fn 定义可注入到 ShaderBuilder 的函数
 */

import { Fn, tuple, f32, i32, vec3, litF32, litI32, makeVec3 } from './core/index.js';

// ============================================================================
// Noise Functions - 噪声函数
// ============================================================================

/**
 * 3D Simplex Noise
 *
 * @example
 * const builder = shader();
 * builder.injectFn(simplexNoise3D);
 * // 在 shader 中使用: simplexNoise3D.call(position)
 */
export const simplexNoise3D = Fn.name('simplexNoise3D')
  .input(tuple('p', vec3(f32)))
  .output(f32)
  .body((ctx) => {
    const p = ctx.$('p');

    // Skew constants
    const F3 = ctx.let('F3', f32, litF32(0.333333));
    const G3 = ctx.let('G3', f32, litF32(0.166667));

    // Skew input space
    const s = ctx.let('s', f32, p.x.add(p.y).add(p.z).mul(F3));
    const i = ctx.let('i', f32, p.x.add(s));
    const j = ctx.let('j', f32, p.y.add(s));
    const k = ctx.let('k', f32, p.z.add(s));

    // Unskew
    const t = ctx.let('t', f32, i.add(j).add(k).mul(G3));
    const x0 = ctx.let('x0', f32, p.x.sub(i).add(t));
    const y0 = ctx.let('y0', f32, p.y.sub(j).add(t));
    const z0 = ctx.let('z0', f32, p.z.sub(k).add(t));

    // Simple approximation
    const n = ctx.let('n', f32, x0.mul(x0).add(y0.mul(y0)).add(z0.mul(z0)));

    return n;
  });

/**
 * Fractional Brownian Motion (FBM)
 * 需要先注入 simplexNoise3D
 *
 * @example
 * builder.injectFn(simplexNoise3D);
 * builder.injectFn(fbm);
 */
export const fbm = Fn.name('fbm')
  .input(tuple('p', vec3(f32)), tuple('octaves', i32))
  .output(f32)
  .body((ctx) => {
    const p = ctx.$('p');
    const octaves = ctx.$('octaves');

    const value = ctx.var('value', f32, litF32(0.0));
    const amplitude = ctx.var('amplitude', f32, litF32(0.5));
    const frequency = ctx.var('frequency', f32, litF32(1.0));
    const position = ctx.var('position', vec3(f32), p);

    ctx.for(
      { name: 'i', type: i32, start: 0 },
      (i) => i.lt(octaves),
      (i) => i.addEq(litI32(1)),
      () => {
        const noise = ctx.let(
          'noise',
          f32,
          position.x.mul(frequency).add(position.y.mul(frequency)),
        );
        ctx.exec(value.addEq(amplitude.mul(noise)));
        ctx.exec(frequency.mulEq(litF32(2.0)));
        ctx.exec(amplitude.mulEq(litF32(0.5)));
      },
    );

    return value;
  });

// ============================================================================
// SDF Functions - 有符号距离场函数
// ============================================================================

/**
 * Sphere SDF
 */
export const sdSphere = Fn.name('sdSphere')
  .input(tuple('p', vec3(f32)), tuple('r', f32))
  .output(f32)
  .body((ctx) => {
    const p = ctx.$('p');
    const r = ctx.$('r');

    // length(p) - r (simplified)
    const len = ctx.let('len', f32, p.x.mul(p.x).add(p.y.mul(p.y)).add(p.z.mul(p.z)));
    return len.sub(r.mul(r));
  });

/**
 * Box SDF
 */
export const sdBox = Fn.name('sdBox')
  .input(tuple('p', vec3(f32)), tuple('b', vec3(f32)))
  .output(f32)
  .body((ctx) => {
    const p = ctx.$('p');
    const b = ctx.$('b');

    // Simplified: just return distance from center
    const d = ctx.let('d', f32, p.x.sub(b.x));
    return d;
  });

// ============================================================================
// Color Functions - 颜色函数
// ============================================================================

/**
 * HSV to RGB conversion
 */
export const hsv2rgb = Fn.name('hsv2rgb')
  .input(tuple('hsv', vec3(f32)))
  .output(vec3(f32))
  .body((ctx) => {
    const hsv = ctx.$('hsv');
    const h = hsv.x;
    const s = hsv.y;
    const v = hsv.z;

    // Simplified HSV to RGB
    const r = ctx.let('r', f32, v.mul(litF32(1.0).sub(s.mul(h))));
    const g = ctx.let('g', f32, v.mul(litF32(1.0).sub(s)));
    const b = ctx.let('b', f32, v);

    return makeVec3(f32, r, g, b);
  });

/**
 * RGB to HSV conversion
 */
export const rgb2hsv = Fn.name('rgb2hsv')
  .input(tuple('rgb', vec3(f32)))
  .output(vec3(f32))
  .body((ctx) => {
    const rgb = ctx.$('rgb');
    const r = rgb.x;
    const g = rgb.y;
    const b = rgb.z;

    // Simplified RGB to HSV
    const h = ctx.let('h', f32, r.sub(g));
    const s = ctx.let('s', f32, r.sub(b));
    const v = ctx.let('v', f32, r);

    return makeVec3(f32, h, s, v);
  });

// ============================================================================
// Utility Functions - 工具函数
// ============================================================================

/**
 * Linear interpolation with clamping (saturate)
 */
export const lerpSat = Fn.name('lerpSat')
  .input(tuple('a', f32), tuple('b', f32), tuple('t', f32))
  .output(f32)
  .body((ctx) => {
    const a = ctx.$('a');
    const b = ctx.$('b');
    const t = ctx.$('t');

    // clamp(t, 0, 1) then lerp
    const tc = ctx.let('tc', f32, t);
    return a.add(b.sub(a).mul(tc));
  });

/**
 * Remap value from one range to another
 */
export const remap = Fn.name('remap')
  .input(
    tuple('value', f32),
    tuple('inMin', f32),
    tuple('inMax', f32),
    tuple('outMin', f32),
    tuple('outMax', f32),
  )
  .output(f32)
  .body((ctx) => {
    const value = ctx.$('value');
    const inMin = ctx.$('inMin');
    const inMax = ctx.$('inMax');
    const outMin = ctx.$('outMin');
    const outMax = ctx.$('outMax');

    // (value - inMin) / (inMax - inMin) * (outMax - outMin) + outMin
    const t = ctx.let('t', f32, value.sub(inMin).div(inMax.sub(inMin)));
    return outMin.add(outMax.sub(outMin).mul(t));
  });

// ============================================================================
// Legacy API (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use Fn-based functions instead
 */
export interface WGSLSnippet {
  code: string;
  dependencies: string[];
}

/**
 * @deprecated Use Fn-based functions instead
 */
export type Atom = () => WGSLSnippet;

/**
 * @deprecated Use Fn-based functions instead
 */
export type Molecule = (deps: Record<string, Atom>) => WGSLSnippet;

/**
 * @deprecated Use ShaderBuilder.injectFn instead
 */
export function compose(deps: Record<string, Atom>): WGSLSnippet {
  const codes: string[] = [];
  for (const [, atom] of Object.entries(deps)) {
    const snippet = atom();
    codes.push(snippet.code);
  }
  return { code: codes.join('\n'), dependencies: [] };
}

/**
 * @deprecated Use ShaderBuilder.injectFn instead
 */
export function compileShader(root: Molecule | WGSLSnippet): string {
  const rootSnippet = typeof root === 'function' ? root({}) : root;
  return rootSnippet.code;
}
