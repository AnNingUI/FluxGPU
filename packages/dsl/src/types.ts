/**
 * Complete WGSL Type System with TypeScript type inference
 *
 * This module provides a fully type-safe DSL for WGSL shader programming.
 * Every WGSL type and operation is represented with proper TypeScript types.
 */

// ============================================================================
// Base Type System
// ============================================================================

/**
 * Base interface for all WGSL types
 */
export interface WGSLType<T extends string = string> {
  readonly __wgslType: T;
  readonly __tsType?: unknown;
}

/**
 * WGSL expression that can be used in shader code
 */
export interface WGSLExpr<T extends WGSLType = WGSLType> {
  readonly type: T;
  toWGSL(): string;
}

// ============================================================================
// Scalar Types
// ============================================================================

export interface BoolType extends WGSLType<'bool'> { __tsType: boolean }
export interface I32Type extends WGSLType<'i32'> { __tsType: number }
export interface U32Type extends WGSLType<'u32'> { __tsType: number }
export interface F32Type extends WGSLType<'f32'> { __tsType: number }
export interface F16Type extends WGSLType<'f16'> { __tsType: number }

export type ScalarType = BoolType | I32Type | U32Type | F32Type | F16Type;

// ============================================================================
// Vector Types
// ============================================================================

export interface Vec2Type<T extends ScalarType = F32Type> extends WGSLType<`vec2<${T['__wgslType']}>`> {
  __tsType: { x: T['__tsType'], y: T['__tsType'] };
  __elementType: T;
  __size: 2;
}

export interface Vec3Type<T extends ScalarType = F32Type> extends WGSLType<`vec3<${T['__wgslType']}>`> {
  __tsType: { x: T['__tsType'], y: T['__tsType'], z: T['__tsType'] };
  __elementType: T;
  __size: 3;
}

export interface Vec4Type<T extends ScalarType = F32Type> extends WGSLType<`vec4<${T['__wgslType']}>`> {
  __tsType: { x: T['__tsType'], y: T['__tsType'], z: T['__tsType'], w: T['__tsType'] };
  __elementType: T;
  __size: 4;
}

export type VectorType<T extends ScalarType = ScalarType> = 
  | Vec2Type<T> 
  | Vec3Type<T> 
  | Vec4Type<T>;

// ============================================================================
// Matrix Types
// ============================================================================

export interface Mat2x2Type<T extends F32Type | F16Type = F32Type> extends WGSLType<`mat2x2<${T['__wgslType']}>`> {
  __elementType: T;
  __cols: 2;
  __rows: 2;
}

export interface Mat3x3Type<T extends F32Type | F16Type = F32Type> extends WGSLType<`mat3x3<${T['__wgslType']}>`> {
  __elementType: T;
  __cols: 3;
  __rows: 3;
}

export interface Mat4x4Type<T extends F32Type | F16Type = F32Type> extends WGSLType<`mat4x4<${T['__wgslType']}>`> {
  __elementType: T;
  __cols: 4;
  __rows: 4;
}

export type MatrixType<T extends F32Type | F16Type = F32Type> = 
  | Mat2x2Type<T> 
  | Mat3x3Type<T> 
  | Mat4x4Type<T>;

// ============================================================================
// Array Types
// ============================================================================

export interface ArrayType<T extends WGSLType = WGSLType> extends WGSLType<`array<${T['__wgslType']}>`> {
  __elementType: T;
  __size?: number;
}

// ============================================================================
// Struct Types
// ============================================================================

export type StructFields = Record<string, WGSLType>;

export interface StructType<T extends StructFields = StructFields> extends WGSLType<string> {
  __fields: T;
  __structName: string;
}

// ============================================================================
// Texture and Sampler Types
// ============================================================================

// --- Sampler Types ---

/** 普通采样器 */
export interface SamplerType extends WGSLType<'sampler'> {
  readonly __samplerKind: 'filtering';
}

/** 比较采样器（用于阴影贴图等）*/
export interface SamplerComparisonType extends WGSLType<'sampler_comparison'> {
  readonly __samplerKind: 'comparison';
}

// --- Sampled Texture Types ---

/** 1D 纹理 */
export interface Texture1DType<T extends ScalarType = F32Type> extends WGSLType<`texture_1d<${T['__wgslType']}>`> {
  readonly __sampleType: T;
  readonly __dimension: '1d';
}

/** 2D 纹理 */
export interface Texture2DType<T extends ScalarType = F32Type> extends WGSLType<`texture_2d<${T['__wgslType']}>`> {
  readonly __sampleType: T;
  readonly __dimension: '2d';
}

/** 2D 纹理数组 */
export interface Texture2DArrayType<T extends ScalarType = F32Type> extends WGSLType<`texture_2d_array<${T['__wgslType']}>`> {
  readonly __sampleType: T;
  readonly __dimension: '2d-array';
}

/** 3D 纹理 */
export interface Texture3DType<T extends ScalarType = F32Type> extends WGSLType<`texture_3d<${T['__wgslType']}>`> {
  readonly __sampleType: T;
  readonly __dimension: '3d';
}

/** 立方体纹理 */
export interface TextureCubeType<T extends ScalarType = F32Type> extends WGSLType<`texture_cube<${T['__wgslType']}>`> {
  readonly __sampleType: T;
  readonly __dimension: 'cube';
}

/** 立方体纹理数组 */
export interface TextureCubeArrayType<T extends ScalarType = F32Type> extends WGSLType<`texture_cube_array<${T['__wgslType']}>`> {
  readonly __sampleType: T;
  readonly __dimension: 'cube-array';
}

/** 多重采样 2D 纹理 */
export interface TextureMultisampled2DType<T extends ScalarType = F32Type> extends WGSLType<`texture_multisampled_2d<${T['__wgslType']}>`> {
  readonly __sampleType: T;
  readonly __dimension: '2d';
  readonly __multisampled: true;
}

// --- Depth Texture Types ---

/** 2D 深度纹理 */
export interface TextureDepth2DType extends WGSLType<'texture_depth_2d'> {
  readonly __dimension: '2d';
  readonly __depth: true;
}

/** 2D 深度纹理数组 */
export interface TextureDepth2DArrayType extends WGSLType<'texture_depth_2d_array'> {
  readonly __dimension: '2d-array';
  readonly __depth: true;
}

/** 立方体深度纹理 */
export interface TextureDepthCubeType extends WGSLType<'texture_depth_cube'> {
  readonly __dimension: 'cube';
  readonly __depth: true;
}

/** 立方体深度纹理数组 */
export interface TextureDepthCubeArrayType extends WGSLType<'texture_depth_cube_array'> {
  readonly __dimension: 'cube-array';
  readonly __depth: true;
}

/** 多重采样 2D 深度纹理 */
export interface TextureDepthMultisampled2DType extends WGSLType<'texture_depth_multisampled_2d'> {
  readonly __dimension: '2d';
  readonly __depth: true;
  readonly __multisampled: true;
}

// --- Storage Texture Types ---

/** 存储纹理格式 */
export type TextureStorageFormat =
  | 'rgba8unorm' | 'rgba8snorm' | 'rgba8uint' | 'rgba8sint'
  | 'rgba16uint' | 'rgba16sint' | 'rgba16float'
  | 'r32uint' | 'r32sint' | 'r32float'
  | 'rg32uint' | 'rg32sint' | 'rg32float'
  | 'rgba32uint' | 'rgba32sint' | 'rgba32float'
  | 'bgra8unorm';

/** 存储纹理访问模式 */
export type StorageTextureAccess = 'read' | 'write' | 'read_write';

/** 1D 存储纹理 */
export interface TextureStorage1DType<F extends TextureStorageFormat = 'rgba8unorm', A extends StorageTextureAccess = 'write'>
  extends WGSLType<`texture_storage_1d<${F}, ${A}>`> {
  readonly __format: F;
  readonly __access: A;
  readonly __dimension: '1d';
}

/** 2D 存储纹理 */
export interface TextureStorage2DType<F extends TextureStorageFormat = 'rgba8unorm', A extends StorageTextureAccess = 'write'>
  extends WGSLType<`texture_storage_2d<${F}, ${A}>`> {
  readonly __format: F;
  readonly __access: A;
  readonly __dimension: '2d';
}

/** 2D 存储纹理数组 */
export interface TextureStorage2DArrayType<F extends TextureStorageFormat = 'rgba8unorm', A extends StorageTextureAccess = 'write'>
  extends WGSLType<`texture_storage_2d_array<${F}, ${A}>`> {
  readonly __format: F;
  readonly __access: A;
  readonly __dimension: '2d-array';
}

/** 3D 存储纹理 */
export interface TextureStorage3DType<F extends TextureStorageFormat = 'rgba8unorm', A extends StorageTextureAccess = 'write'>
  extends WGSLType<`texture_storage_3d<${F}, ${A}>`> {
  readonly __format: F;
  readonly __access: A;
  readonly __dimension: '3d';
}

// --- External Texture ---

/** 外部纹理（用于视频等）*/
export interface TextureExternalType extends WGSLType<'texture_external'> {
  readonly __external: true;
}

// --- Union Types ---

export type SampledTextureType<T extends ScalarType = ScalarType> =
  | Texture1DType<T>
  | Texture2DType<T>
  | Texture2DArrayType<T>
  | Texture3DType<T>
  | TextureCubeType<T>
  | TextureCubeArrayType<T>
  | TextureMultisampled2DType<T>;

export type DepthTextureType =
  | TextureDepth2DType
  | TextureDepth2DArrayType
  | TextureDepthCubeType
  | TextureDepthCubeArrayType
  | TextureDepthMultisampled2DType;

export type StorageTextureType =
  | TextureStorage1DType<any, any>
  | TextureStorage2DType<any, any>
  | TextureStorage2DArrayType<any, any>
  | TextureStorage3DType<any, any>;

export type TextureType = SampledTextureType | DepthTextureType | StorageTextureType | TextureExternalType;

// ============================================================================
// Type Constructors
// ============================================================================

export const bool: BoolType = { __wgslType: 'bool' } as BoolType;
export const i32: I32Type = { __wgslType: 'i32' } as I32Type;
export const u32: U32Type = { __wgslType: 'u32' } as U32Type;
export const f32: F32Type = { __wgslType: 'f32' } as F32Type;
export const f16: F16Type = { __wgslType: 'f16' } as F16Type;

export function vec2<T extends ScalarType = F32Type>(elementType?: T): Vec2Type<T> {
  return {
    __wgslType: `vec2<${(elementType || f32).__wgslType}>`,
    __elementType: elementType || f32,
    __size: 2,
  } as Vec2Type<T>;
}

export function vec3<T extends ScalarType = F32Type>(elementType?: T): Vec3Type<T> {
  return {
    __wgslType: `vec3<${(elementType || f32).__wgslType}>`,
    __elementType: elementType || f32,
    __size: 3,
  } as Vec3Type<T>;
}

export function vec4<T extends ScalarType = F32Type>(elementType?: T): Vec4Type<T> {
  return {
    __wgslType: `vec4<${(elementType || f32).__wgslType}>`,
    __elementType: elementType || f32,
    __size: 4,
  } as Vec4Type<T>;
}

export function mat2x2<T extends F32Type | F16Type = F32Type>(elementType?: T): Mat2x2Type<T> {
  return {
    __wgslType: `mat2x2<${(elementType || f32).__wgslType}>`,
    __elementType: elementType || f32,
    __cols: 2,
    __rows: 2,
  } as Mat2x2Type<T>;
}

export function mat3x3<T extends F32Type | F16Type = F32Type>(elementType?: T): Mat3x3Type<T> {
  return {
    __wgslType: `mat3x3<${(elementType || f32).__wgslType}>`,
    __elementType: elementType || f32,
    __cols: 3,
    __rows: 3,
  } as Mat3x3Type<T>;
}

export function mat4x4<T extends F32Type | F16Type = F32Type>(elementType?: T): Mat4x4Type<T> {
  return {
    __wgslType: `mat4x4<${(elementType || f32).__wgslType}>`,
    __elementType: elementType || f32,
    __cols: 4,
    __rows: 4,
  } as Mat4x4Type<T>;
}

export function array<T extends WGSLType>(elementType: T, size?: number): ArrayType<T> {
  return {
    __wgslType: `array<${elementType.__wgslType}>`,
    __elementType: elementType,
    __size: size,
  } as ArrayType<T>;
}

export function struct<T extends StructFields>(name: string, fields: T): StructType<T> {
  return {
    __wgslType: name,
    __fields: fields,
    __structName: name,
  } as StructType<T>;
}

// --- Sampler Type Constructors ---

/** 创建普通采样器类型 */
export const sampler: SamplerType = {
  __wgslType: 'sampler',
  __samplerKind: 'filtering',
} as SamplerType;

/** 创建比较采样器类型 */
export const samplerComparison: SamplerComparisonType = {
  __wgslType: 'sampler_comparison',
  __samplerKind: 'comparison',
} as SamplerComparisonType;

// --- Texture Type Constructors ---

/** 创建 1D 纹理类型 */
export function texture1d<T extends ScalarType = F32Type>(sampleType?: T): Texture1DType<T> {
  const st = sampleType || f32;
  return {
    __wgslType: `texture_1d<${st.__wgslType}>`,
    __sampleType: st,
    __dimension: '1d',
  } as Texture1DType<T>;
}

/** 创建 2D 纹理类型 */
export function texture2d<T extends ScalarType = F32Type>(sampleType?: T): Texture2DType<T> {
  const st = sampleType || f32;
  return {
    __wgslType: `texture_2d<${st.__wgslType}>`,
    __sampleType: st,
    __dimension: '2d',
  } as Texture2DType<T>;
}

/** 创建 2D 纹理数组类型 */
export function texture2dArray<T extends ScalarType = F32Type>(sampleType?: T): Texture2DArrayType<T> {
  const st = sampleType || f32;
  return {
    __wgslType: `texture_2d_array<${st.__wgslType}>`,
    __sampleType: st,
    __dimension: '2d-array',
  } as Texture2DArrayType<T>;
}

/** 创建 3D 纹理类型 */
export function texture3d<T extends ScalarType = F32Type>(sampleType?: T): Texture3DType<T> {
  const st = sampleType || f32;
  return {
    __wgslType: `texture_3d<${st.__wgslType}>`,
    __sampleType: st,
    __dimension: '3d',
  } as Texture3DType<T>;
}

/** 创建立方体纹理类型 */
export function textureCube<T extends ScalarType = F32Type>(sampleType?: T): TextureCubeType<T> {
  const st = sampleType || f32;
  return {
    __wgslType: `texture_cube<${st.__wgslType}>`,
    __sampleType: st,
    __dimension: 'cube',
  } as TextureCubeType<T>;
}

/** 创建立方体纹理数组类型 */
export function textureCubeArray<T extends ScalarType = F32Type>(sampleType?: T): TextureCubeArrayType<T> {
  const st = sampleType || f32;
  return {
    __wgslType: `texture_cube_array<${st.__wgslType}>`,
    __sampleType: st,
    __dimension: 'cube-array',
  } as TextureCubeArrayType<T>;
}

/** 创建多重采样 2D 纹理类型 */
export function textureMultisampled2d<T extends ScalarType = F32Type>(sampleType?: T): TextureMultisampled2DType<T> {
  const st = sampleType || f32;
  return {
    __wgslType: `texture_multisampled_2d<${st.__wgslType}>`,
    __sampleType: st,
    __dimension: '2d',
    __multisampled: true,
  } as TextureMultisampled2DType<T>;
}

// --- Depth Texture Type Constructors ---

/** 创建 2D 深度纹理类型 */
export const textureDepth2d: TextureDepth2DType = {
  __wgslType: 'texture_depth_2d',
  __dimension: '2d',
  __depth: true,
} as TextureDepth2DType;

/** 创建 2D 深度纹理数组类型 */
export const textureDepth2dArray: TextureDepth2DArrayType = {
  __wgslType: 'texture_depth_2d_array',
  __dimension: '2d-array',
  __depth: true,
} as TextureDepth2DArrayType;

/** 创建立方体深度纹理类型 */
export const textureDepthCube: TextureDepthCubeType = {
  __wgslType: 'texture_depth_cube',
  __dimension: 'cube',
  __depth: true,
} as TextureDepthCubeType;

/** 创建立方体深度纹理数组类型 */
export const textureDepthCubeArray: TextureDepthCubeArrayType = {
  __wgslType: 'texture_depth_cube_array',
  __dimension: 'cube-array',
  __depth: true,
} as TextureDepthCubeArrayType;

/** 创建多重采样 2D 深度纹理类型 */
export const textureDepthMultisampled2d: TextureDepthMultisampled2DType = {
  __wgslType: 'texture_depth_multisampled_2d',
  __dimension: '2d',
  __depth: true,
  __multisampled: true,
} as TextureDepthMultisampled2DType;

// --- Storage Texture Type Constructors ---

/** 创建 1D 存储纹理类型 */
export function textureStorage1d<
  F extends TextureStorageFormat = 'rgba8unorm',
  A extends StorageTextureAccess = 'write'
>(format: F, access: A): TextureStorage1DType<F, A> {
  return {
    __wgslType: `texture_storage_1d<${format}, ${access}>`,
    __format: format,
    __access: access,
    __dimension: '1d',
  } as TextureStorage1DType<F, A>;
}

/** 创建 2D 存储纹理类型 */
export function textureStorage2d<
  F extends TextureStorageFormat = 'rgba8unorm',
  A extends StorageTextureAccess = 'write'
>(format: F, access: A): TextureStorage2DType<F, A> {
  return {
    __wgslType: `texture_storage_2d<${format}, ${access}>`,
    __format: format,
    __access: access,
    __dimension: '2d',
  } as TextureStorage2DType<F, A>;
}

/** 创建 2D 存储纹理数组类型 */
export function textureStorage2dArray<
  F extends TextureStorageFormat = 'rgba8unorm',
  A extends StorageTextureAccess = 'write'
>(format: F, access: A): TextureStorage2DArrayType<F, A> {
  return {
    __wgslType: `texture_storage_2d_array<${format}, ${access}>`,
    __format: format,
    __access: access,
    __dimension: '2d-array',
  } as TextureStorage2DArrayType<F, A>;
}

/** 创建 3D 存储纹理类型 */
export function textureStorage3d<
  F extends TextureStorageFormat = 'rgba8unorm',
  A extends StorageTextureAccess = 'write'
>(format: F, access: A): TextureStorage3DType<F, A> {
  return {
    __wgslType: `texture_storage_3d<${format}, ${access}>`,
    __format: format,
    __access: access,
    __dimension: '3d',
  } as TextureStorage3DType<F, A>;
}

// --- External Texture Type Constructor ---

/** 创建外部纹理类型 */
export const textureExternal: TextureExternalType = {
  __wgslType: 'texture_external',
  __external: true,
} as TextureExternalType;

// ============================================================================
// Expression Base Class
// ============================================================================

export class Expr<T extends WGSLType = WGSLType> implements WGSLExpr<T> {
  constructor(
    public readonly type: T,
    private readonly code: string
  ) {}

  toWGSL(): string {
    return this.code;
  }

  // Arithmetic operators - 支持向量和标量混合运算
  add(other: Expr<any>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} + ${other.toWGSL()})`);
  }

  sub(other: Expr<any>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} - ${other.toWGSL()})`);
  }

  mul(other: Expr<any>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} * ${other.toWGSL()})`);
  }

  div(other: Expr<any>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} / ${other.toWGSL()})`);
  }

  mod(other: Expr<any>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} % ${other.toWGSL()})`);
  }

  // Comparison operators
  eq<U extends T>(other: Expr<U>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} == ${other.toWGSL()})`);
  }

  ne<U extends T>(other: Expr<U>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} != ${other.toWGSL()})`);
  }

  lt<U extends T>(other: Expr<U>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} < ${other.toWGSL()})`);
  }

  le<U extends T>(other: Expr<U>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} <= ${other.toWGSL()})`);
  }

  gt<U extends T>(other: Expr<U>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} > ${other.toWGSL()})`);
  }

  ge<U extends T>(other: Expr<U>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} >= ${other.toWGSL()})`);
  }

  // Logical operators (for bool types)
  and(other: Expr<BoolType>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} && ${other.toWGSL()})`);
  }

  or(other: Expr<BoolType>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} || ${other.toWGSL()})`);
  }

  not(): Expr<BoolType> {
    return new Expr(bool, `(!${this.toWGSL()})`);
  }

  // Bitwise operators
  bitAnd<U extends T>(other: Expr<U>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} & ${other.toWGSL()})`);
  }

  bitOr<U extends T>(other: Expr<U>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} | ${other.toWGSL()})`);
  }

  bitXor<U extends T>(other: Expr<U>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} ^ ${other.toWGSL()})`);
  }

  bitNot(): Expr<T> {
    return new Expr(this.type, `(~${this.toWGSL()})`);
  }

  shl<U extends T>(other: Expr<U>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} << ${other.toWGSL()})`);
  }

  shr<U extends T>(other: Expr<U>): Expr<T> {
    return new Expr(this.type, `(${this.toWGSL()} >> ${other.toWGSL()})`);
  }

  // Unary operators
  neg(): Expr<T> {
    return new Expr(this.type, `(-${this.toWGSL()})`);
  }

  // Assignment
  assign<U extends T>(value: Expr<U>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  addAssign<U extends T>(value: Expr<U>): string {
    return `${this.toWGSL()} += ${value.toWGSL()}`;
  }

  subAssign<U extends T>(value: Expr<U>): string {
    return `${this.toWGSL()} -= ${value.toWGSL()}`;
  }

  mulAssign<U extends T>(value: Expr<U>): string {
    return `${this.toWGSL()} *= ${value.toWGSL()}`;
  }

  divAssign<U extends T>(value: Expr<U>): string {
    return `${this.toWGSL()} /= ${value.toWGSL()}`;
  }

  modAssign<U extends T>(value: Expr<U>): string {
    return `${this.toWGSL()} %= ${value.toWGSL()}`;
  }
}

// ============================================================================
// Vector Expression with Swizzling
// ============================================================================

export class VecExpr<T extends VectorType> extends Expr<T> {
  static asExpr<T extends VectorType>(expr: Expr<T>) {
    return new VecExpr(expr.type, expr.toWGSL());
  }

  // Swizzle accessors for vec2
  get x(): Expr<T['__elementType']> {
    return new Expr((this.type as any).__elementType, `${this.toWGSL()}.x`);
  }

  get y(): Expr<T['__elementType']> {
    return new Expr((this.type as any).__elementType, `${this.toWGSL()}.y`);
  }

  // Swizzle accessors for vec3/vec4
  get z(): Expr<T['__elementType']> {
    return new Expr((this.type as any).__elementType, `${this.toWGSL()}.z`);
  }

  get w(): Expr<T['__elementType']> {
    return new Expr((this.type as any).__elementType, `${this.toWGSL()}.w`);
  }

  // Common swizzles
  get xy(): VecExpr<Vec2Type<T['__elementType']>> {
    return new VecExpr(vec2((this.type as any).__elementType), `${this.toWGSL()}.xy`);
  }

  get xyz(): VecExpr<Vec3Type<T['__elementType']>> {
    return new VecExpr(vec3((this.type as any).__elementType), `${this.toWGSL()}.xyz`);
  }

  get rgb(): VecExpr<Vec3Type<T['__elementType']>> {
    return new VecExpr(vec3((this.type as any).__elementType), `${this.toWGSL()}.rgb`);
  }

  get rgba(): VecExpr<Vec4Type<T['__elementType']>> {
    return new VecExpr(vec4((this.type as any).__elementType), `${this.toWGSL()}.rgba`);
  }

  // Custom swizzle
  swizzle(pattern: string): Expr<any> {
    const size = pattern.length as 2 | 3 | 4;
    const elementType = (this.type as any).__elementType;
    const vecType = size === 2 ? vec2(elementType) : size === 3 ? vec3(elementType) : vec4(elementType);
    return new Expr(vecType, `${this.toWGSL()}.${pattern}`);
  }
}

// ============================================================================
// Struct Expression with Field Access
// ============================================================================

export class StructExpr<T extends StructType> extends Expr<T> {
  field<K extends keyof T['__fields'] & string>(name: K): Expr<T['__fields'][K]> {
    const fieldType = this.type.__fields[name];
    return new Expr(fieldType, `${this.toWGSL()}.${name}`) as Expr<T['__fields'][K]>;
  }
}

// ============================================================================
// Array Expression with Indexing
// ============================================================================

export class ArrayExpr<T extends ArrayType> extends Expr<T> {
  at(index: Expr<U32Type> | Expr<I32Type>): Expr<T['__elementType']> {
    return new Expr(this.type.__elementType, `${this.toWGSL()}[${index.toWGSL()}]`);
  }
}

// ============================================================================
// Literal Constructors
// ============================================================================

export function lit<T extends ScalarType>(value: number, type: T): Expr<T> {
  if (type === bool) {
    return new Expr(type, value ? 'true' : 'false');
  }
  return new Expr(type, `${value}`);
}

export function litBool(value: boolean): Expr<BoolType> {
  return new Expr(bool, value ? 'true' : 'false');
}

export function litVec2(x: number, y: number): VecExpr<Vec2Type<F32Type>> {
  return new VecExpr(vec2(f32), `vec2<f32>(${x}, ${y})`);
}

export function litVec3(x: number, y: number, z: number): VecExpr<Vec3Type<F32Type>> {
  return new VecExpr(vec3(f32), `vec3<f32>(${x}, ${y}, ${z})`);
}

export function litVec4(x: number, y: number, z: number, w: number): VecExpr<Vec4Type<F32Type>> {
  return new VecExpr(vec4(f32), `vec4<f32>(${x}, ${y}, ${z}, ${w})`);
}