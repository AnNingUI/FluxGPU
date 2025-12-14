/**
 * WGSL Built-in Functions
 * 
 * Complete type-safe wrappers for all WGSL built-in functions
 */

import {
  Expr, VecExpr, ArrayExpr,
  WGSLType, ScalarType, VectorType, MatrixType,
  BoolType, I32Type, U32Type, F32Type, F16Type,
  Vec2Type, Vec3Type, Vec4Type,
  Mat2x2Type, Mat3x3Type, Mat4x4Type,
  bool, i32, u32, f32, f16, vec2, vec3, vec4,
} from './types.js';

// ============================================================================
// Math Functions
// ============================================================================

export function abs<T extends ScalarType | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `abs(${x.toWGSL()})`);
}

export function acos<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `acos(${x.toWGSL()})`);
}

export function asin<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `asin(${x.toWGSL()})`);
}

export function atan<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `atan(${x.toWGSL()})`);
}

export function atan2<T extends F32Type | F16Type | VectorType>(y: Expr<T>, x: Expr<T>): Expr<T> {
  return new Expr(y.type, `atan2(${y.toWGSL()}, ${x.toWGSL()})`);
}

export function ceil<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `ceil(${x.toWGSL()})`);
}

export function clamp<T extends ScalarType | VectorType>(x: Expr<T>, min: Expr<T>, max: Expr<T>): Expr<T> {
  return new Expr(x.type, `clamp(${x.toWGSL()}, ${min.toWGSL()}, ${max.toWGSL()})`);
}

export function cos(x: Expr<F32Type>): Expr<F32Type>;
export function cos<T extends VectorType<F32Type>>(x: Expr<T>): Expr<T>;
export function cos(x: Expr<any>): Expr<any> {
  return new Expr(x.type, `cos(${x.toWGSL()})`);
}

export function cosh<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `cosh(${x.toWGSL()})`);
}

export function cross<T extends Vec3Type>(x: Expr<T>, y: Expr<T>): VecExpr<T> {
  return new VecExpr(x.type as T, `cross(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function degrees<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `degrees(${x.toWGSL()})`);
}

export function distance<T extends VectorType>(x: Expr<T>, y: Expr<T>): Expr<T['__elementType']> {
  return new Expr((x.type as any).__elementType, `distance(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function dot<T extends VectorType>(x: Expr<T>, y: Expr<T>): Expr<T['__elementType']> {
  return new Expr((x.type as any).__elementType, `dot(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function exp<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `exp(${x.toWGSL()})`);
}

export function exp2<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `exp2(${x.toWGSL()})`);
}

export function faceForward<T extends VectorType>(n: Expr<T>, i: Expr<T>, nref: Expr<T>): VecExpr<T> {
  return new VecExpr(n.type as T, `faceForward(${n.toWGSL()}, ${i.toWGSL()}, ${nref.toWGSL()})`);
}

export function floor<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `floor(${x.toWGSL()})`);
}

export function fma<T extends F32Type | F16Type | VectorType>(a: Expr<T>, b: Expr<T>, c: Expr<T>): Expr<T> {
  return new Expr(a.type, `fma(${a.toWGSL()}, ${b.toWGSL()}, ${c.toWGSL()})`);
}

export function fract<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `fract(${x.toWGSL()})`);
}

export function inverseSqrt<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `inverseSqrt(${x.toWGSL()})`);
}

export function length<T extends VectorType<F32Type>>(x: Expr<T>): Expr<F32Type> {
  return new Expr(f32, `length(${x.toWGSL()})`);
}

export function log<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `log(${x.toWGSL()})`);
}

export function log2<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `log2(${x.toWGSL()})`);
}

export function max<T extends ScalarType | VectorType>(x: Expr<T>, y: Expr<T>): Expr<T> {
  return new Expr(x.type, `max(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function min<T extends ScalarType | VectorType>(x: Expr<T>, y: Expr<T>): Expr<T> {
  return new Expr(x.type, `min(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function mix<T extends F32Type | F16Type | VectorType>(x: Expr<T>, y: Expr<T>, a: Expr<T>): Expr<T> {
  return new Expr(x.type, `mix(${x.toWGSL()}, ${y.toWGSL()}, ${a.toWGSL()})`);
}

export function modf<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `modf(${x.toWGSL()})`);
}

export function normalize<T extends VectorType<F32Type>>(x: Expr<T>): VecExpr<T> {
  return new VecExpr(x.type, `normalize(${x.toWGSL()})`);
}

export function pow<T extends F32Type | F16Type | VectorType>(x: Expr<T>, y: Expr<T>): Expr<T> {
  return new Expr(x.type, `pow(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function radians<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `radians(${x.toWGSL()})`);
}

export function reflect<T extends VectorType>(i: Expr<T>, n: Expr<T>): VecExpr<T> {
  return new VecExpr(i.type as T, `reflect(${i.toWGSL()}, ${n.toWGSL()})`);
}

export function refract<T extends VectorType>(i: Expr<T>, n: Expr<T>, eta: Expr<T['__elementType']>): VecExpr<T> {
  return new VecExpr(i.type as T, `refract(${i.toWGSL()}, ${n.toWGSL()}, ${eta.toWGSL()})`);
}

export function round<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `round(${x.toWGSL()})`);
}

export function saturate<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `saturate(${x.toWGSL()})`);
}

export function sign<T extends ScalarType | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `sign(${x.toWGSL()})`);
}

export function sin(x: Expr<F32Type>): Expr<F32Type>;
export function sin<T extends VectorType<F32Type>>(x: Expr<T>): Expr<T>;
export function sin(x: Expr<any>): Expr<any> {
  return new Expr(x.type, `sin(${x.toWGSL()})`);
}

export function sinh<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `sinh(${x.toWGSL()})`);
}

export function smoothstep<T extends F32Type | F16Type | VectorType>(low: Expr<T>, high: Expr<T>, x: Expr<T>): Expr<T> {
  return new Expr(x.type, `smoothstep(${low.toWGSL()}, ${high.toWGSL()}, ${x.toWGSL()})`);
}

export function sqrt<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `sqrt(${x.toWGSL()})`);
}

export function step<T extends F32Type | F16Type | VectorType>(edge: Expr<T>, x: Expr<T>): Expr<T> {
  return new Expr(x.type, `step(${edge.toWGSL()}, ${x.toWGSL()})`);
}

export function tan<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `tan(${x.toWGSL()})`);
}

export function tanh<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `tanh(${x.toWGSL()})`);
}

export function trunc<T extends F32Type | F16Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `trunc(${x.toWGSL()})`);
}

// ============================================================================
// Integer Functions
// ============================================================================

export function countOneBits<T extends I32Type | U32Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `countOneBits(${x.toWGSL()})`);
}

export function reverseBits<T extends I32Type | U32Type | VectorType>(x: Expr<T>): Expr<T> {
  return new Expr(x.type, `reverseBits(${x.toWGSL()})`);
}

// ============================================================================
// Matrix Functions
// ============================================================================

export function determinant<T extends MatrixType>(m: Expr<T>): Expr<T['__elementType']> {
  return new Expr((m.type as any).__elementType, `determinant(${m.toWGSL()})`);
}

export function transpose<T extends MatrixType>(m: Expr<T>): Expr<T> {
  return new Expr(m.type, `transpose(${m.toWGSL()})`);
}

// ============================================================================
// Comparison Functions
// ============================================================================

export function all(x: Expr<BoolType> | VecExpr<any>): Expr<BoolType> {
  return new Expr(bool, `all(${x.toWGSL()})`);
}

export function any(x: Expr<BoolType> | VecExpr<any>): Expr<BoolType> {
  return new Expr(bool, `any(${x.toWGSL()})`);
}

export function select<T extends WGSLType>(falseValue: Expr<T>, trueValue: Expr<T>, condition: Expr<BoolType>): Expr<T> {
  return new Expr(falseValue.type, `select(${falseValue.toWGSL()}, ${trueValue.toWGSL()}, ${condition.toWGSL()})`);
}

// ============================================================================
// Array Functions
// ============================================================================

export function arrayLength<T extends ArrayExpr<any>>(arr: T): Expr<U32Type> {
  return new Expr(u32, `arrayLength(&${arr.toWGSL()})`);
}

// ============================================================================
// Texture Functions
// ============================================================================

export function textureSample(
  texture: Expr<any>,
  sampler: Expr<any>,
  coords: VecExpr<Vec2Type<F32Type>>
): VecExpr<Vec4Type<F32Type>> {
  return new VecExpr(vec4(f32), `textureSample(${texture.toWGSL()}, ${sampler.toWGSL()}, ${coords.toWGSL()})`);
}

export function textureLoad(
  texture: Expr<any>,
  coords: VecExpr<Vec2Type<I32Type>>,
  level?: Expr<I32Type>
): VecExpr<Vec4Type<F32Type>> {
  const levelStr = level ? `, ${level.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureLoad(${texture.toWGSL()}, ${coords.toWGSL()}${levelStr})`);
}

export function textureDimensions(texture: Expr<any>): VecExpr<Vec2Type<U32Type>> {
  return new VecExpr(vec2(u32), `textureDimensions(${texture.toWGSL()})`);
}

// ============================================================================
// Synchronization Functions
// ============================================================================

export function storageBarrier(): string {
  return 'storageBarrier()';
}

export function workgroupBarrier(): string {
  return 'workgroupBarrier()';
}

// ============================================================================
// Type Conversion Functions
// ============================================================================

export function toBool(x: Expr<any>): Expr<BoolType> {
  return new Expr(bool, `bool(${x.toWGSL()})`);
}

export function toI32(x: Expr<any>): Expr<I32Type> {
  return new Expr(i32, `i32(${x.toWGSL()})`);
}

export function toU32(x: Expr<any>): Expr<U32Type> {
  return new Expr(u32, `u32(${x.toWGSL()})`);
}

export function toF32(x: Expr<any>): Expr<F32Type> {
  return new Expr(f32, `f32(${x.toWGSL()})`);
}

export function toVec2<T extends ScalarType = F32Type>(
  x: Expr<T>,
  y?: Expr<T>
): VecExpr<Vec2Type<T>> {
  const args = y ? `${x.toWGSL()}, ${y.toWGSL()}` : x.toWGSL();
  return new VecExpr(vec2(x.type), `vec2<${x.type.__wgslType}>(${args})`);
}

export function toVec3<T extends ScalarType = F32Type>(
  x: Expr<T>,
  y?: Expr<T>,
  z?: Expr<T>
): VecExpr<Vec3Type<T>> {
  const args = y && z ? `${x.toWGSL()}, ${y.toWGSL()}, ${z.toWGSL()}` : x.toWGSL();
  return new VecExpr(vec3(x.type), `vec3<${x.type.__wgslType}>(${args})`);
}

export function toVec4<T extends ScalarType = F32Type>(
  x: Expr<T>,
  y?: Expr<T>,
  z?: Expr<T>,
  w?: Expr<T>
): VecExpr<Vec4Type<T>> {
  const args = y && z && w ? `${x.toWGSL()}, ${y.toWGSL()}, ${z.toWGSL()}, ${w.toWGSL()}` : x.toWGSL();
  return new VecExpr(vec4(x.type), `vec4<${x.type.__wgslType}>(${args})`);
}
