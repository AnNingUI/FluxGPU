/**
 * WGSL DSL Core Traits (Interfaces)
 * 
 * 基于组合的类型系统，每个 trait 代表一种能力
 * 类型通过组合 traits 来获得对应的方法
 */

// ============================================================================
// Base Traits
// ============================================================================

/** 可以生成 WGSL 代码 */
export interface Emittable {
  toWGSL(): string;
}

/** 有 WGSL 类型信息 */
export interface Typed<T extends string = string> {
  readonly __wgslType: T;
}

/** 可赋值 */
export interface Assignable<T> {
  set(value: T): string;
}

/** 复合赋值操作 */
export interface CompoundAssignable<T> {
  addEq(value: T): string;
  subEq(value: T): string;
  mulEq(value: T): string;
  divEq(value: T): string;
}

// ============================================================================
// Arithmetic Traits (数值运算 - 仅限数值类型)
// ============================================================================

/** 算术运算 - 仅数值类型 (i32, u32, f32, f16, vec<numeric>) */
export interface ArithmeticOps<Self, Scalar = Self> {
  add(other: Self | Scalar): Self;
  sub(other: Self | Scalar): Self;
  mul(other: Self | Scalar): Self;
  div(other: Self | Scalar): Self;
  mod(other: Self | Scalar): Self;
  neg(): Self;
}

// ============================================================================
// Comparison Traits
// ============================================================================

/** 相等比较 - 所有类型 */
export interface EqualityOps<Self, BoolResult> {
  eq(other: Self): BoolResult;
  ne(other: Self): BoolResult;
}

/** 顺序比较 - 仅数值类型 */
export interface OrderingOps<Self, BoolResult> {
  lt(other: Self): BoolResult;
  le(other: Self): BoolResult;
  gt(other: Self): BoolResult;
  ge(other: Self): BoolResult;
}

// ============================================================================
// Logical Traits (逻辑运算 - 仅 bool 类型)
// ============================================================================

/** 逻辑运算 - 仅 bool 和 vec<bool> */
export interface LogicalOps<Self> {
  and(other: Self): Self;
  or(other: Self): Self;
  not(): Self;
}

// ============================================================================
// Bitwise Traits (位运算 - 仅整数类型)
// ============================================================================

/** 位运算 - 仅 i32, u32, vec<i32>, vec<u32> */
export interface BitwiseOps<Self> {
  bitAnd(other: Self): Self;
  bitOr(other: Self): Self;
  bitXor(other: Self): Self;
  bitNot(): Self;
  shl(other: Self): Self;
  shr(other: Self): Self;
}

// ============================================================================
// Vector Traits
// ============================================================================

/** 向量分量访问 */
export interface Vec2Components<Elem> {
  readonly x: Elem;
  readonly y: Elem;
}

export interface Vec3Components<Elem> extends Vec2Components<Elem> {
  readonly z: Elem;
}

export interface Vec4Components<Elem> extends Vec3Components<Elem> {
  readonly w: Elem;
}

/** Swizzle 操作 */
export interface Swizzle2<Vec2, Vec3, Vec4> {
  readonly xy: Vec2;
  readonly yx: Vec2;
}

export interface Swizzle3<Vec2, Vec3, Vec4> extends Swizzle2<Vec2, Vec3, Vec4> {
  readonly xyz: Vec3;
  readonly xzy: Vec3;
  readonly zyx: Vec3;
}

export interface Swizzle4<Vec2, Vec3, Vec4> extends Swizzle3<Vec2, Vec3, Vec4> {
  readonly xyzw: Vec4;
  readonly rgba: Vec4;
  readonly rgb: Vec3;
}

// ============================================================================
// Struct Traits
// ============================================================================

/** 结构体字段访问 */
export interface FieldAccess<Fields extends Record<string, unknown>> {
  field<K extends keyof Fields & string>(name: K): Fields[K];
}

// ============================================================================
// Array Traits
// ============================================================================

/** 数组索引访问 */
export interface IndexAccess<Elem, Index> {
  at(index: Index): Elem;
}
