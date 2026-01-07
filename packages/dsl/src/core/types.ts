/**
 * WGSL Type Definitions
 * 
 * 纯类型定义，不包含任何运行时行为
 */

// ============================================================================
// Scalar Types
// ============================================================================

export interface BoolType {
  readonly __wgslType: 'bool';
  readonly __brand: 'bool';
}

export interface I32Type {
  readonly __wgslType: 'i32';
  readonly __brand: 'i32';
}

export interface U32Type {
  readonly __wgslType: 'u32';
  readonly __brand: 'u32';
}

export interface F32Type {
  readonly __wgslType: 'f32';
  readonly __brand: 'f32';
}

export interface F16Type {
  readonly __wgslType: 'f16';
  readonly __brand: 'f16';
}

/** 所有标量类型 */
export type ScalarType = BoolType | I32Type | U32Type | F32Type | F16Type;

/** 数值标量类型 (不含 bool) */
export type NumericScalarType = I32Type | U32Type | F32Type | F16Type;

/** 整数标量类型 */
export type IntegerScalarType = I32Type | U32Type;

/** 浮点标量类型 */
export type FloatScalarType = F32Type | F16Type;

// ============================================================================
// Vector Types
// ============================================================================

export interface Vec2Type<T extends ScalarType = F32Type> {
  readonly __wgslType: `vec2<${T['__wgslType']}>`;
  readonly __elementType: T;
  readonly __size: 2;
}

export interface Vec3Type<T extends ScalarType = F32Type> {
  readonly __wgslType: `vec3<${T['__wgslType']}>`;
  readonly __elementType: T;
  readonly __size: 3;
}

export interface Vec4Type<T extends ScalarType = F32Type> {
  readonly __wgslType: `vec4<${T['__wgslType']}>`;
  readonly __elementType: T;
  readonly __size: 4;
}

export type VectorType<T extends ScalarType = ScalarType> =
  | Vec2Type<T>
  | Vec3Type<T>
  | Vec4Type<T>;

/** 数值向量类型 */
export type NumericVectorType = VectorType<NumericScalarType>;

/** Bool 向量类型 */
export type BoolVectorType = VectorType<BoolType>;

// ============================================================================
// Matrix Types
// ============================================================================

export interface Mat2x2Type<T extends FloatScalarType = F32Type> {
  readonly __wgslType: `mat2x2<${T['__wgslType']}>`;
  readonly __elementType: T;
  readonly __cols: 2;
  readonly __rows: 2;
}

export interface Mat3x3Type<T extends FloatScalarType = F32Type> {
  readonly __wgslType: `mat3x3<${T['__wgslType']}>`;
  readonly __elementType: T;
  readonly __cols: 3;
  readonly __rows: 3;
}

export interface Mat4x4Type<T extends FloatScalarType = F32Type> {
  readonly __wgslType: `mat4x4<${T['__wgslType']}>`;
  readonly __elementType: T;
  readonly __cols: 4;
  readonly __rows: 4;
}

export type MatrixType<T extends FloatScalarType = F32Type> =
  | Mat2x2Type<T>
  | Mat3x3Type<T>
  | Mat4x4Type<T>;

// ============================================================================
// Array & Struct Types
// ============================================================================

export interface ArrayType<T extends WGSLType = WGSLType> {
  readonly __wgslType: `array<${string}>`;
  readonly __elementType: T;
  readonly __size?: number;
}

export type StructFields = Record<string, WGSLType>;

export interface StructType<T extends StructFields = StructFields> {
  readonly __wgslType: string;
  readonly __fields: T;
  readonly __structName: string;
}

// ============================================================================
// Sampler & Texture Types
// ============================================================================

export interface SamplerType {
  readonly __wgslType: 'sampler';
}

export interface SamplerComparisonType {
  readonly __wgslType: 'sampler_comparison';
}

export interface Texture2DType<T extends ScalarType = F32Type> {
  readonly __wgslType: `texture_2d<${T['__wgslType']}>`;
  readonly __sampleType: T;
}

export interface Texture3DType<T extends ScalarType = F32Type> {
  readonly __wgslType: `texture_3d<${T['__wgslType']}>`;
  readonly __sampleType: T;
}

export interface TextureCubeType<T extends ScalarType = F32Type> {
  readonly __wgslType: `texture_cube<${T['__wgslType']}>`;
  readonly __sampleType: T;
}

export interface TextureDepth2DType {
  readonly __wgslType: 'texture_depth_2d';
}

export type TextureStorageFormat =
  | 'rgba8unorm' | 'rgba8snorm' | 'rgba8uint' | 'rgba8sint'
  | 'rgba16uint' | 'rgba16sint' | 'rgba16float'
  | 'r32uint' | 'r32sint' | 'r32float'
  | 'rg32uint' | 'rg32sint' | 'rg32float'
  | 'rgba32uint' | 'rgba32sint' | 'rgba32float'
  | 'bgra8unorm';

export type StorageTextureAccess = 'read' | 'write' | 'read_write';

export interface TextureStorage2DType<
  F extends TextureStorageFormat = 'rgba8unorm',
  A extends StorageTextureAccess = 'write'
> {
  readonly __wgslType: `texture_storage_2d<${F}, ${A}>`;
  readonly __format: F;
  readonly __access: A;
}

// ============================================================================
// Union Type
// ============================================================================

export type WGSLType =
  | ScalarType
  | VectorType
  | MatrixType
  | ArrayType
  | StructType
  | SamplerType
  | SamplerComparisonType
  | Texture2DType
  | Texture3DType
  | TextureCubeType
  | TextureDepth2DType
  | TextureStorage2DType;

// ============================================================================
// Type Constructors (Runtime Values)
// ============================================================================

export const bool: BoolType = { __wgslType: 'bool' } as BoolType;
export const i32: I32Type = { __wgslType: 'i32' } as I32Type;
export const u32: U32Type = { __wgslType: 'u32' } as U32Type;
export const f32: F32Type = { __wgslType: 'f32' } as F32Type;
export const f16: F16Type = { __wgslType: 'f16' } as F16Type;

export function vec2<T extends ScalarType = F32Type>(elementType?: T): Vec2Type<T> {
  const et = elementType ?? f32;
  return {
    __wgslType: `vec2<${et.__wgslType}>`,
    __elementType: et,
    __size: 2,
  } as Vec2Type<T>;
}

export function vec3<T extends ScalarType = F32Type>(elementType?: T): Vec3Type<T> {
  const et = elementType ?? f32;
  return {
    __wgslType: `vec3<${et.__wgslType}>`,
    __elementType: et,
    __size: 3,
  } as Vec3Type<T>;
}

export function vec4<T extends ScalarType = F32Type>(elementType?: T): Vec4Type<T> {
  const et = elementType ?? f32;
  return {
    __wgslType: `vec4<${et.__wgslType}>`,
    __elementType: et,
    __size: 4,
  } as Vec4Type<T>;
}

export function mat2x2<T extends FloatScalarType = F32Type>(elementType?: T): Mat2x2Type<T> {
  const et = elementType ?? f32;
  return {
    __wgslType: `mat2x2<${et.__wgslType}>`,
    __elementType: et,
    __cols: 2,
    __rows: 2,
  } as Mat2x2Type<T>;
}

export function mat3x3<T extends FloatScalarType = F32Type>(elementType?: T): Mat3x3Type<T> {
  const et = elementType ?? f32;
  return {
    __wgslType: `mat3x3<${et.__wgslType}>`,
    __elementType: et,
    __cols: 3,
    __rows: 3,
  } as Mat3x3Type<T>;
}

export function mat4x4<T extends FloatScalarType = F32Type>(elementType?: T): Mat4x4Type<T> {
  const et = elementType ?? f32;
  return {
    __wgslType: `mat4x4<${et.__wgslType}>`,
    __elementType: et,
    __cols: 4,
    __rows: 4,
  } as Mat4x4Type<T>;
}

export function array<T extends WGSLType>(elementType: T, size?: number): ArrayType<T> {
  const result: any = {
    __wgslType: size ? `array<${elementType.__wgslType}, ${size}>` : `array<${elementType.__wgslType}>`,
    __elementType: elementType,
  };
  if (size !== undefined) {
    result.__size = size;
  }
  return result as ArrayType<T>;
}

export function struct<T extends StructFields>(name: string, fields: T): StructType<T> {
  return {
    __wgslType: name,
    __fields: fields,
    __structName: name,
  } as StructType<T>;
}

export const sampler: SamplerType = { __wgslType: 'sampler' } as SamplerType;
export const samplerComparison: SamplerComparisonType = { __wgslType: 'sampler_comparison' } as SamplerComparisonType;

export function texture2d<T extends ScalarType = F32Type>(sampleType?: T): Texture2DType<T> {
  const st = sampleType ?? f32;
  return {
    __wgslType: `texture_2d<${st.__wgslType}>`,
    __sampleType: st,
  } as Texture2DType<T>;
}

export function textureDepth2d(): TextureDepth2DType {
  return { __wgslType: 'texture_depth_2d' } as TextureDepth2DType;
}

export function textureStorage2d<
  F extends TextureStorageFormat = 'rgba8unorm',
  A extends StorageTextureAccess = 'write'
>(format: F, access: A): TextureStorage2DType<F, A> {
  return {
    __wgslType: `texture_storage_2d<${format}, ${access}>`,
    __format: format,
    __access: access,
  } as TextureStorage2DType<F, A>;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isBoolType(type: WGSLType): type is BoolType {
  return type.__wgslType === 'bool';
}

export function isNumericScalar(type: WGSLType): type is NumericScalarType {
  return ['i32', 'u32', 'f32', 'f16'].includes(type.__wgslType);
}

export function isIntegerType(type: WGSLType): type is IntegerScalarType {
  return type.__wgslType === 'i32' || type.__wgslType === 'u32';
}

export function isFloatType(type: WGSLType): type is FloatScalarType {
  return type.__wgslType === 'f32' || type.__wgslType === 'f16';
}

export function isVectorType(type: WGSLType): type is VectorType {
  return '__size' in type && '__elementType' in type;
}

export function isBoolVector(type: WGSLType): type is BoolVectorType {
  return isVectorType(type) && isBoolType(type.__elementType);
}

export function isNumericVector(type: WGSLType): type is NumericVectorType {
  return isVectorType(type) && isNumericScalar(type.__elementType);
}

export function isMatrixType(type: WGSLType): type is MatrixType {
  return '__cols' in type && '__rows' in type;
}

export function isArrayType(type: WGSLType): type is ArrayType {
  return '__elementType' in type && type.__wgslType.startsWith('array');
}

export function isStructType(type: WGSLType): type is StructType {
  return '__fields' in type && '__structName' in type;
}
