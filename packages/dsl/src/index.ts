/**
 * @fluxgpu/dsl - Unified shader DSL
 *
 * 新的组合式类型系统 + 旧 API 兼容层
 */

// ============================================================================
// Core Types - 核心类型
// ============================================================================
export {
  // Primitive types
  type WGSLType,
  type ScalarType,
  type NumericScalarType,
  type BoolType,
  type IntegerScalarType,
  type FloatScalarType,
  type I32Type,
  type U32Type,
  type F32Type,
  type F16Type,

  // Vector types
  type VectorType,
  type NumericVectorType,
  type BoolVectorType,
  type Vec2Type,
  type Vec3Type,
  type Vec4Type,

  // Matrix types
  type MatrixType,
  type Mat2x2Type,
  type Mat3x3Type,
  type Mat4x4Type,

  // Composite types
  type ArrayType,
  type StructType,
  type StructFields,

  // Texture & Sampler types
  type SamplerType,
  type SamplerComparisonType,
  type Texture2DType,
  type Texture3DType,
  type TextureCubeType,
  type TextureDepth2DType,
  type TextureStorage2DType,
  type TextureStorageFormat,
  type StorageTextureAccess,

  // Type constructors
  bool,
  i32,
  u32,
  f32,
  f16,
  vec2,
  vec3,
  vec4,
  mat2x2,
  mat3x3,
  mat4x4,
  array,
  struct,
  sampler,
  samplerComparison,
  texture2d,
  textureDepth2d,
  textureStorage2d,

  // Type guards
  isBoolType,
  isNumericScalar,
  isIntegerType,
  isFloatType,
  isVectorType,
  isBoolVector,
  isNumericVector,
  isMatrixType,
  isArrayType,
  isStructType,
} from './core/index.js';

// ============================================================================
// Expression Types - 表达式类型
// ============================================================================
export {
  // Base expression
  BaseExpr,

  // Scalar expressions
  BoolExpr,
  NumericExpr,
  IntegerExpr,

  // Vector expressions
  NumericVecExpr,
  BoolVecExpr,

  // Composite expressions
  StructExpr as CoreStructExpr,
  ArrayExpr as CoreArrayExpr,

  // Type helpers
  type AnyExpr,
  createExpr,

  // Literal constructors
  lit,
  litBool,
  litF32,
  litF16,
  litI32,
  litU32,

  // Vector constructors
  makeVec2,
  makeVec3,
  makeVec4,
} from './core/index.js';

// ============================================================================
// Variable Types - 变量类型
// ============================================================================
export {
  // Base variable
  BaseVar,

  // Scalar variables
  BoolVar,
  NumericVar,
  IntegerVar,

  // Vector variables
  NumericVecVar,
  BoolVecVar,

  // Composite variables
  StructVar as CoreStructVar,
  ArrayVar as CoreArrayVar,

  // Reference types (for field/element access)
  ScalarRef,
  VecRef,
  StructRef,

  // Type helpers
  type AnyVar,
  type AnyRef,
  createVar,
  createRef,
} from './core/index.js';

// ============================================================================
// Builder - Shader 构建器
// ============================================================================
export {
  ShaderBuilder,
  shader,
  defineStruct,
  type ShaderContext,
  type ComputeBuiltins,
  type VertexBuiltins,
  type FragmentBuiltins,
  type VertexAttribute,
  type VertexOutputConfig,
  type FragmentInput,
  type FragmentOutputConfig,
} from './core/index.js';

// ============================================================================
// Built-in Functions - 内置函数
// ============================================================================
export { builtins } from './core/index.js';

// Individual builtin exports for convenience
export {
  // Math functions
  abs,
  acos,
  asin,
  atan,
  atan2,
  ceil,
  clamp,
  cos,
  cosh,
  cross,
  degrees,
  distance,
  dot,
  exp,
  exp2,
  floor,
  fma,
  fract,
  inverseSqrt,
  length,
  log,
  log2,
  max,
  min,
  mix,
  normalize,
  pow,
  radians,
  reflect,
  refract,
  round,
  saturate,
  sign,
  sin,
  sinh,
  smoothstep,
  sqrt,
  step,
  tan,
  tanh,
  trunc,

  // Integer functions
  countOneBits,
  reverseBits,

  // Comparison functions
  all,
  any,
  select,

  // Texture functions
  textureSample,
  textureSampleLevel,
  textureSampleCompare,
  textureLoad,
  textureStore,
  textureDimensions,

  // Synchronization
  storageBarrier,
  workgroupBarrier,

  // Type conversion
  toBool,
  toI32,
  toU32,
  toF32,
  toVec2,
  toVec3,
  toVec4,
} from './core/index.js';

// ============================================================================
// Custom Functions - 自定义函数
// ============================================================================
export { Fn, type FnArg, tuple, $2 } from './core/index.js';

// ============================================================================
// Syntax Sugar - 语法糖
// ============================================================================
export {
  // Control flow
  sw,
  loop,

  // Vector helpers
  vec4FromVec2,
  vec4FromVec3,
  vec3FromVec2,

  // Value namespace (constants & constructors)
  Value,

  // Struct utilities
  calculateStructLayout,
  structSize,
  createUniformBuffer,
} from './core/index.js';

// ============================================================================
// Traits - 类型特征
// ============================================================================
export {
  type Emittable,
  type Typed,
  type Assignable,
  type CompoundAssignable,
  type ArithmeticOps,
  type EqualityOps,
  type OrderingOps,
  type LogicalOps,
  type BitwiseOps,
  type Vec2Components,
  type Vec3Components,
  type Vec4Components,
  type Swizzle2,
  type Swizzle3,
  type Swizzle4,
  type FieldAccess,
  type IndexAccess,
} from './core/index.js';

// ============================================================================
// Compatibility Layer - 兼容层 (旧 API)
// ============================================================================
export {
  Expr,
  VecExpr,
  StructExpr,
  ArrayExpr,
  Var,
  VecVar,
  StructVar,
  ArrayVar,
  VecBoolExpr,
} from './compat.js';

// ============================================================================
// Shader Composition - 可组合函数库
// ============================================================================
export {
  // Noise functions
  simplexNoise3D,
  fbm,

  // SDF functions
  sdSphere,
  sdBox,

  // Color functions
  hsv2rgb,
  rgb2hsv,

  // Utility functions
  lerpSat,
  remap,
} from './shader.js';
