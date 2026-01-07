/**
 * WGSL Built-in Functions
 * 
 * 使用新的组合式类型系统
 */

import {
  type ScalarType,
  type NumericScalarType,
  type FloatScalarType,
  type VectorType,
  type BoolType,
  type F32Type,
  type I32Type,
  type U32Type,
  type Vec2Type,
  type Vec3Type,
  type Vec4Type,
  type SamplerType,
  type SamplerComparisonType,
  type Texture2DType,
  type TextureDepth2DType,
  bool,
  f32,
  u32,
  vec2,
  vec3,
  vec4,
} from './types.js';

import {
  BoolExpr,
  NumericExpr,
  IntegerExpr,
  NumericVecExpr,
  BoolVecExpr,
  BaseExpr,
} from './expr.js';

// ============================================================================
// Helper: Create expression of same kind (scalar vs vector)
// ============================================================================

function makeNumeric(x: any, code: string): any {
  if (x instanceof NumericVecExpr) {
    return new NumericVecExpr(x.type, code);
  }
  return new NumericExpr(x.type, code);
}

// ============================================================================
// Math Functions
// ============================================================================

export function abs<T extends NumericScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function abs<T extends VectorType<NumericScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function abs(x: any): any {
  return makeNumeric(x, `abs(${x.toWGSL()})`);
}

export function acos<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function acos<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function acos(x: any): any {
  return makeNumeric(x, `acos(${x.toWGSL()})`);
}

export function asin<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function asin<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function asin(x: any): any {
  return makeNumeric(x, `asin(${x.toWGSL()})`);
}

export function atan<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function atan<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function atan(x: any): any {
  return makeNumeric(x, `atan(${x.toWGSL()})`);
}

export function atan2<T extends FloatScalarType>(y: NumericExpr<T>, x: NumericExpr<T>): NumericExpr<T>;
export function atan2<T extends VectorType<FloatScalarType>>(y: NumericVecExpr<T>, x: NumericVecExpr<T>): NumericVecExpr<T>;
export function atan2(y: any, x: any): any {
  return makeNumeric(y, `atan2(${y.toWGSL()}, ${x.toWGSL()})`);
}

export function ceil<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function ceil<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function ceil(x: any): any {
  return makeNumeric(x, `ceil(${x.toWGSL()})`);
}

export function clamp<T extends NumericScalarType>(x: NumericExpr<T>, min: NumericExpr<T>, max: NumericExpr<T>): NumericExpr<T>;
export function clamp<T extends VectorType<NumericScalarType>>(x: NumericVecExpr<T>, min: NumericVecExpr<T>, max: NumericVecExpr<T>): NumericVecExpr<T>;
export function clamp(x: any, min: any, max: any): any {
  return makeNumeric(x, `clamp(${x.toWGSL()}, ${min.toWGSL()}, ${max.toWGSL()})`);
}

export function cos(x: NumericExpr<F32Type>): NumericExpr<F32Type>;
export function cos<T extends VectorType<F32Type>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function cos(x: any): any {
  return makeNumeric(x, `cos(${x.toWGSL()})`);
}

export function cosh<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function cosh<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function cosh(x: any): any {
  return makeNumeric(x, `cosh(${x.toWGSL()})`);
}

export function cross<T extends Vec3Type<FloatScalarType>>(x: NumericVecExpr<T>, y: NumericVecExpr<T>): NumericVecExpr<T> {
  return new NumericVecExpr(x.type, `cross(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function degrees<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function degrees<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function degrees(x: any): any {
  return makeNumeric(x, `degrees(${x.toWGSL()})`);
}

export function distance<T extends VectorType<F32Type>>(x: NumericVecExpr<T>, y: NumericVecExpr<T>): NumericExpr<F32Type> {
  return new NumericExpr(f32, `distance(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function dot<T extends VectorType<F32Type>>(x: NumericVecExpr<T>, y: NumericVecExpr<T>): NumericExpr<F32Type> {
  return new NumericExpr(f32, `dot(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function exp<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function exp<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function exp(x: any): any {
  return makeNumeric(x, `exp(${x.toWGSL()})`);
}

export function exp2<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function exp2<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function exp2(x: any): any {
  return makeNumeric(x, `exp2(${x.toWGSL()})`);
}

export function floor<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function floor<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function floor(x: any): any {
  return makeNumeric(x, `floor(${x.toWGSL()})`);
}

export function fma<T extends FloatScalarType>(a: NumericExpr<T>, b: NumericExpr<T>, c: NumericExpr<T>): NumericExpr<T>;
export function fma<T extends VectorType<FloatScalarType>>(a: NumericVecExpr<T>, b: NumericVecExpr<T>, c: NumericVecExpr<T>): NumericVecExpr<T>;
export function fma(a: any, b: any, c: any): any {
  return makeNumeric(a, `fma(${a.toWGSL()}, ${b.toWGSL()}, ${c.toWGSL()})`);
}

export function fract<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function fract<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function fract(x: any): any {
  return makeNumeric(x, `fract(${x.toWGSL()})`);
}

export function inverseSqrt<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function inverseSqrt<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function inverseSqrt(x: any): any {
  return makeNumeric(x, `inverseSqrt(${x.toWGSL()})`);
}

export function length<T extends VectorType<F32Type>>(x: NumericVecExpr<T>): NumericExpr<F32Type> {
  return new NumericExpr(f32, `length(${x.toWGSL()})`);
}

export function log<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function log<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function log(x: any): any {
  return makeNumeric(x, `log(${x.toWGSL()})`);
}

export function log2<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function log2<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function log2(x: any): any {
  return makeNumeric(x, `log2(${x.toWGSL()})`);
}

export function max<T extends NumericScalarType>(x: NumericExpr<T>, y: NumericExpr<T>): NumericExpr<T>;
export function max<T extends VectorType<NumericScalarType>>(x: NumericVecExpr<T>, y: NumericVecExpr<T>): NumericVecExpr<T>;
export function max(x: any, y: any): any {
  return makeNumeric(x, `max(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function min<T extends NumericScalarType>(x: NumericExpr<T>, y: NumericExpr<T>): NumericExpr<T>;
export function min<T extends VectorType<NumericScalarType>>(x: NumericVecExpr<T>, y: NumericVecExpr<T>): NumericVecExpr<T>;
export function min(x: any, y: any): any {
  return makeNumeric(x, `min(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function mix<T extends FloatScalarType>(x: NumericExpr<T>, y: NumericExpr<T>, a: NumericExpr<T>): NumericExpr<T>;
export function mix<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>, y: NumericVecExpr<T>, a: NumericVecExpr<T> | NumericExpr<FloatScalarType>): NumericVecExpr<T>;
export function mix(x: any, y: any, a: any): any {
  return makeNumeric(x, `mix(${x.toWGSL()}, ${y.toWGSL()}, ${a.toWGSL()})`);
}

export function normalize<T extends VectorType<F32Type>>(x: NumericVecExpr<T>): NumericVecExpr<T> {
  return new NumericVecExpr(x.type, `normalize(${x.toWGSL()})`);
}

export function pow<T extends FloatScalarType>(x: NumericExpr<T>, y: NumericExpr<T>): NumericExpr<T>;
export function pow<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>, y: NumericVecExpr<T>): NumericVecExpr<T>;
export function pow(x: any, y: any): any {
  return makeNumeric(x, `pow(${x.toWGSL()}, ${y.toWGSL()})`);
}

export function radians<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function radians<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function radians(x: any): any {
  return makeNumeric(x, `radians(${x.toWGSL()})`);
}

export function reflect<T extends VectorType<FloatScalarType>>(i: NumericVecExpr<T>, n: NumericVecExpr<T>): NumericVecExpr<T> {
  return new NumericVecExpr(i.type, `reflect(${i.toWGSL()}, ${n.toWGSL()})`);
}

export function refract<T extends VectorType<FloatScalarType>>(i: NumericVecExpr<T>, n: NumericVecExpr<T>, eta: NumericExpr<FloatScalarType>): NumericVecExpr<T> {
  return new NumericVecExpr(i.type, `refract(${i.toWGSL()}, ${n.toWGSL()}, ${eta.toWGSL()})`);
}

export function round<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function round<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function round(x: any): any {
  return makeNumeric(x, `round(${x.toWGSL()})`);
}

export function saturate<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function saturate<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function saturate(x: any): any {
  return makeNumeric(x, `saturate(${x.toWGSL()})`);
}

export function sign<T extends NumericScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function sign<T extends VectorType<NumericScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function sign(x: any): any {
  return makeNumeric(x, `sign(${x.toWGSL()})`);
}

export function sin(x: NumericExpr<F32Type>): NumericExpr<F32Type>;
export function sin<T extends VectorType<F32Type>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function sin(x: any): any {
  return makeNumeric(x, `sin(${x.toWGSL()})`);
}

export function sinh<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function sinh<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function sinh(x: any): any {
  return makeNumeric(x, `sinh(${x.toWGSL()})`);
}

export function smoothstep<T extends FloatScalarType>(low: NumericExpr<T>, high: NumericExpr<T>, x: NumericExpr<T>): NumericExpr<T>;
export function smoothstep<T extends VectorType<FloatScalarType>>(low: NumericVecExpr<T>, high: NumericVecExpr<T>, x: NumericVecExpr<T>): NumericVecExpr<T>;
export function smoothstep(low: any, high: any, x: any): any {
  return makeNumeric(x, `smoothstep(${low.toWGSL()}, ${high.toWGSL()}, ${x.toWGSL()})`);
}

export function sqrt<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function sqrt<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function sqrt(x: any): any {
  return makeNumeric(x, `sqrt(${x.toWGSL()})`);
}

export function step<T extends FloatScalarType>(edge: NumericExpr<T>, x: NumericExpr<T>): NumericExpr<T>;
export function step<T extends VectorType<FloatScalarType>>(edge: NumericVecExpr<T>, x: NumericVecExpr<T>): NumericVecExpr<T>;
export function step(edge: any, x: any): any {
  return makeNumeric(x, `step(${edge.toWGSL()}, ${x.toWGSL()})`);
}

export function tan<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function tan<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function tan(x: any): any {
  return makeNumeric(x, `tan(${x.toWGSL()})`);
}

export function tanh<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function tanh<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function tanh(x: any): any {
  return makeNumeric(x, `tanh(${x.toWGSL()})`);
}

export function trunc<T extends FloatScalarType>(x: NumericExpr<T>): NumericExpr<T>;
export function trunc<T extends VectorType<FloatScalarType>>(x: NumericVecExpr<T>): NumericVecExpr<T>;
export function trunc(x: any): any {
  return makeNumeric(x, `trunc(${x.toWGSL()})`);
}

// ============================================================================
// Integer Functions
// ============================================================================

export function countOneBits<T extends I32Type | U32Type>(x: IntegerExpr<T>): IntegerExpr<T> {
  return new IntegerExpr(x.type, `countOneBits(${x.toWGSL()})`);
}

export function reverseBits<T extends I32Type | U32Type>(x: IntegerExpr<T>): IntegerExpr<T> {
  return new IntegerExpr(x.type, `reverseBits(${x.toWGSL()})`);
}

// ============================================================================
// Comparison Functions
// ============================================================================

export function all<T extends VectorType<BoolType>>(x: BoolVecExpr<T>): BoolExpr {
  return new BoolExpr(bool, `all(${x.toWGSL()})`);
}

export function any<T extends VectorType<BoolType>>(x: BoolVecExpr<T>): BoolExpr {
  return new BoolExpr(bool, `any(${x.toWGSL()})`);
}

export function select<T extends NumericScalarType>(falseValue: NumericExpr<T>, trueValue: NumericExpr<T>, condition: BoolExpr): NumericExpr<T>;
export function select<T extends VectorType<NumericScalarType>>(falseValue: NumericVecExpr<T>, trueValue: NumericVecExpr<T>, condition: BoolExpr | BoolVecExpr<any>): NumericVecExpr<T>;
export function select(falseValue: any, trueValue: any, condition: any): any {
  return makeNumeric(falseValue, `select(${falseValue.toWGSL()}, ${trueValue.toWGSL()}, ${condition.toWGSL()})`);
}

// ============================================================================
// Texture Functions
// ============================================================================

export function textureSample(
  texture: BaseExpr<Texture2DType<F32Type>>,
  samplerExpr: BaseExpr<SamplerType>,
  coords: NumericVecExpr<Vec2Type<F32Type>>,
): NumericVecExpr<Vec4Type<F32Type>> {
  return new NumericVecExpr(vec4(f32), `textureSample(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()})`);
}

export function textureSampleLevel(
  texture: BaseExpr<Texture2DType<F32Type>>,
  samplerExpr: BaseExpr<SamplerType>,
  coords: NumericVecExpr<Vec2Type<F32Type>>,
  level: NumericExpr<F32Type>,
): NumericVecExpr<Vec4Type<F32Type>> {
  return new NumericVecExpr(vec4(f32), `textureSampleLevel(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${level.toWGSL()})`);
}

export function textureSampleCompare(
  texture: BaseExpr<TextureDepth2DType>,
  samplerExpr: BaseExpr<SamplerComparisonType>,
  coords: NumericVecExpr<Vec2Type<F32Type>>,
  depthRef: NumericExpr<F32Type>,
): NumericExpr<F32Type> {
  return new NumericExpr(f32, `textureSampleCompare(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${depthRef.toWGSL()})`);
}

export function textureLoad(
  texture: BaseExpr<Texture2DType>,
  coords: NumericVecExpr<Vec2Type<I32Type | U32Type>>,
  level: IntegerExpr<I32Type | U32Type>,
): NumericVecExpr<Vec4Type<F32Type>> {
  return new NumericVecExpr(vec4(f32), `textureLoad(${texture.toWGSL()}, ${coords.toWGSL()}, ${level.toWGSL()})`);
}

export function textureStore(
  texture: BaseExpr<any>,
  coords: NumericVecExpr<Vec2Type<I32Type | U32Type>>,
  value: NumericVecExpr<Vec4Type<any>>,
): string {
  return `textureStore(${texture.toWGSL()}, ${coords.toWGSL()}, ${value.toWGSL()})`;
}

export function textureDimensions(
  texture: BaseExpr<Texture2DType>,
  level?: IntegerExpr<I32Type | U32Type>,
): NumericVecExpr<Vec2Type<U32Type>> {
  const levelStr = level ? `, ${level.toWGSL()}` : '';
  return new NumericVecExpr(vec2(u32), `textureDimensions(${texture.toWGSL()}${levelStr})`);
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

import { i32, f16 } from './types.js';

export function toBool(x: BaseExpr<any>): BoolExpr {
  return new BoolExpr(bool, `bool(${x.toWGSL()})`);
}

export function toI32(x: BaseExpr<any>): IntegerExpr<I32Type> {
  return new IntegerExpr(i32, `i32(${x.toWGSL()})`);
}

export function toU32(x: BaseExpr<any>): IntegerExpr<U32Type> {
  return new IntegerExpr(u32, `u32(${x.toWGSL()})`);
}

export function toF32(x: BaseExpr<any>): NumericExpr<F32Type> {
  return new NumericExpr(f32, `f32(${x.toWGSL()})`);
}

export function toVec2<T extends ScalarType>(x: BaseExpr<T>, y?: BaseExpr<T>): NumericVecExpr<Vec2Type<any>> {
  const args = y ? `${x.toWGSL()}, ${y.toWGSL()}` : x.toWGSL();
  return new NumericVecExpr(vec2(x.type as any), `vec2<${x.type.__wgslType}>(${args})`);
}

export function toVec3<T extends ScalarType>(x: BaseExpr<T>, y?: BaseExpr<T>, z?: BaseExpr<T>): NumericVecExpr<Vec3Type<any>> {
  const args = y && z ? `${x.toWGSL()}, ${y.toWGSL()}, ${z.toWGSL()}` : x.toWGSL();
  return new NumericVecExpr(vec3(x.type as any), `vec3<${x.type.__wgslType}>(${args})`);
}

export function toVec4<T extends ScalarType>(x: BaseExpr<T>, y?: BaseExpr<T>, z?: BaseExpr<T>, w?: BaseExpr<T>): NumericVecExpr<Vec4Type<any>> {
  const args = y && z && w ? `${x.toWGSL()}, ${y.toWGSL()}, ${z.toWGSL()}, ${w.toWGSL()}` : x.toWGSL();
  return new NumericVecExpr(vec4(x.type as any), `vec4<${x.type.__wgslType}>(${args})`);
}
