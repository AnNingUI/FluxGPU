/**
 * Core Module - 导出所有核心类型和表达式
 */

// Types
export * from './types.js';

// Traits
export * from './traits.js';

// Expressions
export * from './expr.js';

// Variables
export * from './var.js';

// Builtins - both as namespace and individual exports
export * as builtins from './builtins.js';
export {
  abs, acos, asin, atan, atan2, ceil, clamp, cos, cosh, cross,
  degrees, distance, dot, exp, exp2, floor, fma, fract, inverseSqrt,
  length, log, log2, max, min, mix, normalize, pow, radians,
  reflect, refract, round, saturate, sign, sin, sinh, smoothstep,
  sqrt, step, tan, tanh, trunc,
  countOneBits, reverseBits,
  all, any, select,
  textureSample, textureSampleLevel, textureSampleCompare, textureLoad, textureStore, textureDimensions,
  storageBarrier, workgroupBarrier,
  toBool, toI32, toU32, toF32, toVec2, toVec3, toVec4,
} from './builtins.js';

// Builder
export * from './builder.js';

// Functions
export * from './fn.js';

// Syntax Sugar
export * from './sugar.js';
