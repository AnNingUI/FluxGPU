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
  // Texture and Sampler types
  SamplerType, SamplerComparisonType,
  Texture1DType, Texture2DType, Texture2DArrayType, Texture3DType,
  TextureCubeType, TextureCubeArrayType, TextureMultisampled2DType,
  TextureDepth2DType, TextureDepth2DArrayType, TextureDepthCubeType,
  TextureDepthCubeArrayType, TextureDepthMultisampled2DType,
  TextureStorage1DType, TextureStorage2DType, TextureStorage2DArrayType, TextureStorage3DType,
  TextureExternalType,
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

export function mix<T extends F32Type | F16Type | VectorType>(x: Expr<T>, y: Expr<T>, a: T extends F32Type | F16Type ? Expr<T> : Expr<F32Type | F16Type | T>): Expr<T> {
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

// --- Texture Sampling ---

/**
 * textureSample - 使用采样器对纹理进行采样
 * @param texture 采样纹理
 * @param sampler 采样器
 * @param coords 纹理坐标
 * @param offset 可选的常量偏移
 */
export function textureSample(
  texture: Expr<Texture2DType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec2Type<F32Type>>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>>;
export function textureSample(
  texture: Expr<Texture3DType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec3Type<F32Type>>,
  offset?: Expr<Vec3Type<I32Type>>
): VecExpr<Vec4Type<F32Type>>;
export function textureSample(
  texture: Expr<TextureCubeType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec3Type<F32Type>>
): VecExpr<Vec4Type<F32Type>>;
export function textureSample(
  texture: Expr<any>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<any>,
  offset?: Expr<any>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureSample(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}${offsetStr})`);
}

/**
 * textureSampleBias - 使用 LOD 偏移进行采样
 */
export function textureSampleBias(
  texture: Expr<Texture2DType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec2Type<F32Type>>,
  bias: Expr<F32Type>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureSampleBias(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${bias.toWGSL()}${offsetStr})`);
}

/**
 * textureSampleLevel - 指定 LOD 级别采样
 */
export function textureSampleLevel(
  texture: Expr<Texture2DType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec2Type<F32Type>>,
  level: Expr<F32Type>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>>;
export function textureSampleLevel(
  texture: Expr<Texture3DType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec3Type<F32Type>>,
  level: Expr<F32Type>,
  offset?: Expr<Vec3Type<I32Type>>
): VecExpr<Vec4Type<F32Type>>;
export function textureSampleLevel(
  texture: Expr<TextureCubeType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec3Type<F32Type>>,
  level: Expr<F32Type>
): VecExpr<Vec4Type<F32Type>>;
export function textureSampleLevel(
  texture: Expr<any>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<any>,
  level: Expr<F32Type>,
  offset?: Expr<any>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureSampleLevel(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${level.toWGSL()}${offsetStr})`);
}

/**
 * textureSampleGrad - 使用显式梯度进行采样
 */
export function textureSampleGrad(
  texture: Expr<Texture2DType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec2Type<F32Type>>,
  ddx: Expr<Vec2Type<F32Type>>,
  ddy: Expr<Vec2Type<F32Type>>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureSampleGrad(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${ddx.toWGSL()}, ${ddy.toWGSL()}${offsetStr})`);
}

// --- Depth Texture Sampling ---

/**
 * textureSampleCompare - 深度纹理比较采样（用于阴影贴图）
 */
export function textureSampleCompare(
  texture: Expr<TextureDepth2DType>,
  samplerExpr: Expr<SamplerComparisonType>,
  coords: Expr<Vec2Type<F32Type>>,
  depthRef: Expr<F32Type>,
  offset?: Expr<Vec2Type<I32Type>>
): Expr<F32Type> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new Expr(f32, `textureSampleCompare(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${depthRef.toWGSL()}${offsetStr})`);
}

/**
 * textureSampleCompareLevel - 深度纹理比较采样（指定 LOD 为 0）
 */
export function textureSampleCompareLevel(
  texture: Expr<TextureDepth2DType>,
  samplerExpr: Expr<SamplerComparisonType>,
  coords: Expr<Vec2Type<F32Type>>,
  depthRef: Expr<F32Type>,
  offset?: Expr<Vec2Type<I32Type>>
): Expr<F32Type> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new Expr(f32, `textureSampleCompareLevel(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${depthRef.toWGSL()}${offsetStr})`);
}

// --- Texture Array Sampling ---

/**
 * textureSample for 2D array texture
 */
export function textureSampleArray(
  texture: Expr<Texture2DArrayType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec2Type<F32Type>>,
  arrayIndex: Expr<I32Type | U32Type>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureSample(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${arrayIndex.toWGSL()}${offsetStr})`);
}

/**
 * textureSampleLevel for 2D array texture
 */
export function textureSampleLevelArray(
  texture: Expr<Texture2DArrayType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec2Type<F32Type>>,
  arrayIndex: Expr<I32Type | U32Type>,
  level: Expr<F32Type>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureSampleLevel(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${arrayIndex.toWGSL()}, ${level.toWGSL()}${offsetStr})`);
}

// --- Texture Gather ---

/**
 * textureGather - 从 4 个纹素中聚集单个分量
 * @param component 要聚集的分量 (0=x, 1=y, 2=z, 3=w)
 */
export function textureGather(
  component: 0 | 1 | 2 | 3,
  texture: Expr<Texture2DType<F32Type>>,
  samplerExpr: Expr<SamplerType>,
  coords: Expr<Vec2Type<F32Type>>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureGather(${component}, ${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}${offsetStr})`);
}

/**
 * textureGatherCompare - 从 4 个深度纹素中聚集比较结果
 */
export function textureGatherCompare(
  texture: Expr<TextureDepth2DType>,
  samplerExpr: Expr<SamplerComparisonType>,
  coords: Expr<Vec2Type<F32Type>>,
  depthRef: Expr<F32Type>,
  offset?: Expr<Vec2Type<I32Type>>
): VecExpr<Vec4Type<F32Type>> {
  const offsetStr = offset ? `, ${offset.toWGSL()}` : '';
  return new VecExpr(vec4(f32), `textureGatherCompare(${texture.toWGSL()}, ${samplerExpr.toWGSL()}, ${coords.toWGSL()}, ${depthRef.toWGSL()}${offsetStr})`);
}

// --- Texture Load (Direct Access) ---

/**
 * textureLoad - 直接加载单个纹素（不使用采样器）
 */
export function textureLoad(
  texture: Expr<Texture2DType>,
  coords: Expr<Vec2Type<I32Type | U32Type>>,
  level: Expr<I32Type | U32Type>
): VecExpr<Vec4Type<F32Type>>;
export function textureLoad(
  texture: Expr<Texture3DType>,
  coords: Expr<Vec3Type<I32Type | U32Type>>,
  level: Expr<I32Type | U32Type>
): VecExpr<Vec4Type<F32Type>>;
export function textureLoad(
  texture: Expr<TextureMultisampled2DType>,
  coords: Expr<Vec2Type<I32Type | U32Type>>,
  sampleIndex: Expr<I32Type | U32Type>
): VecExpr<Vec4Type<F32Type>>;
export function textureLoad(
  texture: Expr<TextureDepth2DType>,
  coords: Expr<Vec2Type<I32Type | U32Type>>,
  level: Expr<I32Type | U32Type>
): Expr<F32Type>;
export function textureLoad(
  texture: Expr<any>,
  coords: Expr<any>,
  levelOrSample: Expr<I32Type | U32Type>
): VecExpr<Vec4Type<F32Type>> | Expr<F32Type> {
  // 简化处理，返回 vec4<f32>
  return new VecExpr(vec4(f32), `textureLoad(${texture.toWGSL()}, ${coords.toWGSL()}, ${levelOrSample.toWGSL()})`);
}

/**
 * textureLoad for 2D array texture
 */
export function textureLoadArray(
  texture: Expr<Texture2DArrayType>,
  coords: Expr<Vec2Type<I32Type | U32Type>>,
  arrayIndex: Expr<I32Type | U32Type>,
  level: Expr<I32Type | U32Type>
): VecExpr<Vec4Type<F32Type>> {
  return new VecExpr(vec4(f32), `textureLoad(${texture.toWGSL()}, ${coords.toWGSL()}, ${arrayIndex.toWGSL()}, ${level.toWGSL()})`);
}

// --- Texture Store (Storage Texture Write) ---

/**
 * textureStore - 写入存储纹理
 */
export function textureStore(
  texture: Expr<TextureStorage2DType<any, 'write'> | TextureStorage2DType<any, 'read_write'>>,
  coords: Expr<Vec2Type<I32Type | U32Type>>,
  value: Expr<Vec4Type<F32Type>> | Expr<Vec4Type<I32Type>> | Expr<Vec4Type<U32Type>>
): string {
  return `textureStore(${texture.toWGSL()}, ${coords.toWGSL()}, ${value.toWGSL()})`;
}

/**
 * textureStore for 3D storage texture
 */
export function textureStore3D(
  texture: Expr<TextureStorage3DType<any, 'write'> | TextureStorage3DType<any, 'read_write'>>,
  coords: Expr<Vec3Type<I32Type | U32Type>>,
  value: Expr<Vec4Type<F32Type>> | Expr<Vec4Type<I32Type>> | Expr<Vec4Type<U32Type>>
): string {
  return `textureStore(${texture.toWGSL()}, ${coords.toWGSL()}, ${value.toWGSL()})`;
}

/**
 * textureStore for 2D array storage texture
 */
export function textureStoreArray(
  texture: Expr<TextureStorage2DArrayType<any, 'write'> | TextureStorage2DArrayType<any, 'read_write'>>,
  coords: Expr<Vec2Type<I32Type | U32Type>>,
  arrayIndex: Expr<I32Type | U32Type>,
  value: Expr<Vec4Type<F32Type>> | Expr<Vec4Type<I32Type>> | Expr<Vec4Type<U32Type>>
): string {
  return `textureStore(${texture.toWGSL()}, ${coords.toWGSL()}, ${arrayIndex.toWGSL()}, ${value.toWGSL()})`;
}

// --- Texture Dimensions ---

/**
 * textureDimensions - 获取纹理尺寸
 */
export function textureDimensions(
  texture: Expr<Texture1DType>,
  level?: Expr<I32Type | U32Type>
): Expr<U32Type>;
export function textureDimensions(
  texture: Expr<Texture2DType | TextureDepth2DType | TextureMultisampled2DType | TextureStorage2DType<any, any> | TextureExternalType>,
  level?: Expr<I32Type | U32Type>
): VecExpr<Vec2Type<U32Type>>;
export function textureDimensions(
  texture: Expr<Texture3DType | TextureCubeType | TextureStorage3DType<any, any>>,
  level?: Expr<I32Type | U32Type>
): VecExpr<Vec3Type<U32Type>>;
export function textureDimensions(
  texture: Expr<any>,
  level?: Expr<I32Type | U32Type>
): VecExpr<Vec2Type<U32Type>> | VecExpr<Vec3Type<U32Type>> | Expr<U32Type> {
  const levelStr = level ? `, ${level.toWGSL()}` : '';
  // 默认返回 vec2<u32>
  return new VecExpr(vec2(u32), `textureDimensions(${texture.toWGSL()}${levelStr})`);
}

/**
 * textureNumLayers - 获取数组纹理的层数
 */
export function textureNumLayers(
  texture: Expr<Texture2DArrayType | TextureDepth2DArrayType | TextureCubeArrayType | TextureDepthCubeArrayType | TextureStorage2DArrayType<any, any>>
): Expr<U32Type> {
  return new Expr(u32, `textureNumLayers(${texture.toWGSL()})`);
}

/**
 * textureNumLevels - 获取纹理的 mipmap 级别数
 */
export function textureNumLevels(
  texture: Expr<Texture1DType | Texture2DType | Texture2DArrayType | Texture3DType | TextureCubeType | TextureCubeArrayType | TextureDepth2DType | TextureDepth2DArrayType | TextureDepthCubeType | TextureDepthCubeArrayType>
): Expr<U32Type> {
  return new Expr(u32, `textureNumLevels(${texture.toWGSL()})`);
}

/**
 * textureNumSamples - 获取多重采样纹理的采样数
 */
export function textureNumSamples(
  texture: Expr<TextureMultisampled2DType | TextureDepthMultisampled2DType>
): Expr<U32Type> {
  return new Expr(u32, `textureNumSamples(${texture.toWGSL()})`);
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
