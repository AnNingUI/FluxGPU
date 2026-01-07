/**
 * Expression Classes - 基于组合的表达式系统
 * 
 * 核心设计：
 * 1. BaseExpr 只提供最基础的 toWGSL() 和类型信息
 * 2. 具体能力通过工厂函数组合，而非继承
 * 3. 根据类型自动选择正确的能力集
 */

import type { Emittable, ArithmeticOps, LogicalOps, EqualityOps, OrderingOps, BitwiseOps } from './traits.js';
import {
  type WGSLType,
  type ScalarType,
  type NumericScalarType,
  type BoolType,
  type IntegerScalarType,
  type VectorType,
  type Vec2Type,
  type Vec3Type,
  type Vec4Type,
  type StructType,
  type ArrayType,
  type StructFields,
  bool,
  vec2,
  vec3,
  vec4,
  isVectorType,
  isStructType,
  isArrayType,
  isBoolType,
  isNumericScalar,
  isBoolVector,
} from './types.js';

// ============================================================================
// Base Expression
// ============================================================================

/** 基础表达式 - 只有 toWGSL 和类型 */
export class BaseExpr<T extends WGSLType> implements Emittable {
  constructor(
    public readonly type: T,
    protected readonly code: string,
  ) {}

  toWGSL(): string {
    return this.code;
  }
}

// ============================================================================
// Scalar Expressions
// ============================================================================

/** Bool 表达式 - 只有逻辑运算 */
export class BoolExpr extends BaseExpr<BoolType> implements LogicalOps<BoolExpr>, EqualityOps<BoolExpr, BoolExpr> {
  and(other: BoolExpr): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} && ${other.toWGSL()})`);
  }

  or(other: BoolExpr): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} || ${other.toWGSL()})`);
  }

  not(): BoolExpr {
    return new BoolExpr(bool, `(!${this.toWGSL()})`);
  }

  eq(other: BoolExpr): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} == ${other.toWGSL()})`);
  }

  ne(other: BoolExpr): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} != ${other.toWGSL()})`);
  }
}

/** 数值标量表达式 - 有算术、比较、位运算 */
export class NumericExpr<T extends NumericScalarType> extends BaseExpr<T>
  implements ArithmeticOps<NumericExpr<T>>, EqualityOps<NumericExpr<T>, BoolExpr>, OrderingOps<NumericExpr<T>, BoolExpr> {
  
  add(other: NumericExpr<T> | number): NumericExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericExpr(this.type, `(${this.toWGSL()} + ${otherCode})`);
  }

  sub(other: NumericExpr<T> | number): NumericExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericExpr(this.type, `(${this.toWGSL()} - ${otherCode})`);
  }

  mul(other: NumericExpr<T> | number): NumericExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericExpr(this.type, `(${this.toWGSL()} * ${otherCode})`);
  }

  div(other: NumericExpr<T> | number): NumericExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericExpr(this.type, `(${this.toWGSL()} / ${otherCode})`);
  }

  mod(other: NumericExpr<T> | number): NumericExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericExpr(this.type, `(${this.toWGSL()} % ${otherCode})`);
  }

  neg(): NumericExpr<T> {
    return new NumericExpr(this.type, `(-${this.toWGSL()})`);
  }

  eq(other: NumericExpr<T>): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} == ${other.toWGSL()})`);
  }

  ne(other: NumericExpr<T>): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} != ${other.toWGSL()})`);
  }

  lt(other: NumericExpr<T>): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} < ${other.toWGSL()})`);
  }

  le(other: NumericExpr<T>): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} <= ${other.toWGSL()})`);
  }

  gt(other: NumericExpr<T>): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} > ${other.toWGSL()})`);
  }

  ge(other: NumericExpr<T>): BoolExpr {
    return new BoolExpr(bool, `(${this.toWGSL()} >= ${other.toWGSL()})`);
  }
}

/** 整数表达式 - 额外支持位运算 */
export class IntegerExpr<T extends IntegerScalarType> extends NumericExpr<T> implements BitwiseOps<IntegerExpr<T>> {
  // Override arithmetic methods to return IntegerExpr
  override add(other: NumericExpr<T> | number): IntegerExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new IntegerExpr(this.type, `(${this.toWGSL()} + ${otherCode})`);
  }

  override sub(other: NumericExpr<T> | number): IntegerExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new IntegerExpr(this.type, `(${this.toWGSL()} - ${otherCode})`);
  }

  override mul(other: NumericExpr<T> | number): IntegerExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new IntegerExpr(this.type, `(${this.toWGSL()} * ${otherCode})`);
  }

  override div(other: NumericExpr<T> | number): IntegerExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new IntegerExpr(this.type, `(${this.toWGSL()} / ${otherCode})`);
  }

  override mod(other: NumericExpr<T> | number): IntegerExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new IntegerExpr(this.type, `(${this.toWGSL()} % ${otherCode})`);
  }

  override neg(): IntegerExpr<T> {
    return new IntegerExpr(this.type, `(-${this.toWGSL()})`);
  }

  bitAnd(other: IntegerExpr<T>): IntegerExpr<T> {
    return new IntegerExpr(this.type, `(${this.toWGSL()} & ${other.toWGSL()})`);
  }

  bitOr(other: IntegerExpr<T>): IntegerExpr<T> {
    return new IntegerExpr(this.type, `(${this.toWGSL()} | ${other.toWGSL()})`);
  }

  bitXor(other: IntegerExpr<T>): IntegerExpr<T> {
    return new IntegerExpr(this.type, `(${this.toWGSL()} ^ ${other.toWGSL()})`);
  }

  bitNot(): IntegerExpr<T> {
    return new IntegerExpr(this.type, `(~${this.toWGSL()})`);
  }

  shl(other: IntegerExpr<T>): IntegerExpr<T> {
    return new IntegerExpr(this.type, `(${this.toWGSL()} << ${other.toWGSL()})`);
  }

  shr(other: IntegerExpr<T>): IntegerExpr<T> {
    return new IntegerExpr(this.type, `(${this.toWGSL()} >> ${other.toWGSL()})`);
  }
}

// ============================================================================
// Vector Expressions
// ============================================================================

/** Bool 向量表达式 - 只有逻辑运算和 swizzle */
export class BoolVecExpr<T extends VectorType<BoolType>> extends BaseExpr<T> implements LogicalOps<BoolVecExpr<T>> {
  and(other: BoolVecExpr<T>): BoolVecExpr<T> {
    return new BoolVecExpr(this.type, `(${this.toWGSL()} && ${other.toWGSL()})`);
  }

  or(other: BoolVecExpr<T>): BoolVecExpr<T> {
    return new BoolVecExpr(this.type, `(${this.toWGSL()} || ${other.toWGSL()})`);
  }

  not(): BoolVecExpr<T> {
    return new BoolVecExpr(this.type, `(!${this.toWGSL()})`);
  }

  // Swizzle accessors
  get x(): BoolExpr {
    return new BoolExpr(bool, `${this.toWGSL()}.x`);
  }

  get y(): BoolExpr {
    return new BoolExpr(bool, `${this.toWGSL()}.y`);
  }

  get z(): BoolExpr {
    return new BoolExpr(bool, `${this.toWGSL()}.z`);
  }

  get w(): BoolExpr {
    return new BoolExpr(bool, `${this.toWGSL()}.w`);
  }

  get xy(): BoolVecExpr<Vec2Type<BoolType>> {
    return new BoolVecExpr(vec2(bool), `${this.toWGSL()}.xy`);
  }

  get xyz(): BoolVecExpr<Vec3Type<BoolType>> {
    return new BoolVecExpr(vec3(bool), `${this.toWGSL()}.xyz`);
  }
}

/** 数值向量表达式 - 有算术运算和 swizzle */
export class NumericVecExpr<T extends VectorType<NumericScalarType>> extends BaseExpr<T>
  implements ArithmeticOps<NumericVecExpr<T>, NumericExpr<T['__elementType']>> {
  
  add(other: NumericVecExpr<T> | NumericExpr<T['__elementType']> | number): NumericVecExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericVecExpr(this.type, `(${this.toWGSL()} + ${otherCode})`);
  }

  sub(other: NumericVecExpr<T> | NumericExpr<T['__elementType']> | number): NumericVecExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericVecExpr(this.type, `(${this.toWGSL()} - ${otherCode})`);
  }

  mul(other: NumericVecExpr<T> | NumericExpr<T['__elementType']> | number): NumericVecExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericVecExpr(this.type, `(${this.toWGSL()} * ${otherCode})`);
  }

  div(other: NumericVecExpr<T> | NumericExpr<T['__elementType']> | number): NumericVecExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericVecExpr(this.type, `(${this.toWGSL()} / ${otherCode})`);
  }

  mod(other: NumericVecExpr<T> | NumericExpr<T['__elementType']> | number): NumericVecExpr<T> {
    const otherCode = typeof other === 'number' ? `${other}` : other.toWGSL();
    return new NumericVecExpr(this.type, `(${this.toWGSL()} % ${otherCode})`);
  }

  neg(): NumericVecExpr<T> {
    return new NumericVecExpr(this.type, `(-${this.toWGSL()})`);
  }

  // Comparison - returns bool vector
  eq(other: NumericVecExpr<T>): BoolVecExpr<VectorType<BoolType>> {
    const boolVecType = this.type.__size === 2 ? vec2(bool) : this.type.__size === 3 ? vec3(bool) : vec4(bool);
    return new BoolVecExpr(boolVecType as any, `(${this.toWGSL()} == ${other.toWGSL()})`);
  }

  ne(other: NumericVecExpr<T>): BoolVecExpr<VectorType<BoolType>> {
    const boolVecType = this.type.__size === 2 ? vec2(bool) : this.type.__size === 3 ? vec3(bool) : vec4(bool);
    return new BoolVecExpr(boolVecType as any, `(${this.toWGSL()} != ${other.toWGSL()})`);
  }

  lt(other: NumericVecExpr<T>): BoolVecExpr<VectorType<BoolType>> {
    const boolVecType = this.type.__size === 2 ? vec2(bool) : this.type.__size === 3 ? vec3(bool) : vec4(bool);
    return new BoolVecExpr(boolVecType as any, `(${this.toWGSL()} < ${other.toWGSL()})`);
  }

  gt(other: NumericVecExpr<T>): BoolVecExpr<VectorType<BoolType>> {
    const boolVecType = this.type.__size === 2 ? vec2(bool) : this.type.__size === 3 ? vec3(bool) : vec4(bool);
    return new BoolVecExpr(boolVecType as any, `(${this.toWGSL()} > ${other.toWGSL()})`);
  }

  // Swizzle accessors - return element type expression
  get x(): T['__elementType'] extends IntegerScalarType ? IntegerExpr<T['__elementType']> : NumericExpr<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerExpr(elemType as any, `${this.toWGSL()}.x`) as any;
    }
    return new NumericExpr(elemType, `${this.toWGSL()}.x`) as any;
  }

  get y(): T['__elementType'] extends IntegerScalarType ? IntegerExpr<T['__elementType']> : NumericExpr<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerExpr(elemType as any, `${this.toWGSL()}.y`) as any;
    }
    return new NumericExpr(elemType, `${this.toWGSL()}.y`) as any;
  }

  get z(): T['__elementType'] extends IntegerScalarType ? IntegerExpr<T['__elementType']> : NumericExpr<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerExpr(elemType as any, `${this.toWGSL()}.z`) as any;
    }
    return new NumericExpr(elemType, `${this.toWGSL()}.z`) as any;
  }

  get w(): T['__elementType'] extends IntegerScalarType ? IntegerExpr<T['__elementType']> : NumericExpr<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerExpr(elemType as any, `${this.toWGSL()}.w`) as any;
    }
    return new NumericExpr(elemType, `${this.toWGSL()}.w`) as any;
  }

  get xy(): NumericVecExpr<Vec2Type<T['__elementType']>> {
    return new NumericVecExpr(vec2(this.type.__elementType), `${this.toWGSL()}.xy`);
  }

  get xyz(): NumericVecExpr<Vec3Type<T['__elementType']>> {
    return new NumericVecExpr(vec3(this.type.__elementType), `${this.toWGSL()}.xyz`);
  }

  get rgb(): NumericVecExpr<Vec3Type<T['__elementType']>> {
    return new NumericVecExpr(vec3(this.type.__elementType), `${this.toWGSL()}.rgb`);
  }

  get rgba(): NumericVecExpr<Vec4Type<T['__elementType']>> {
    return new NumericVecExpr(vec4(this.type.__elementType), `${this.toWGSL()}.rgba`);
  }
}

// ============================================================================
// Struct & Array Expressions
// ============================================================================

/** Struct 表达式 */
export class StructExpr<T extends StructType> extends BaseExpr<T> {
  field<K extends keyof T['__fields'] & string>(name: K): AnyExpr<T['__fields'][K]> {
    const fieldType = this.type.__fields[name];
    return createExpr(fieldType, `${this.toWGSL()}.${name}`) as AnyExpr<T['__fields'][K]>;
  }
}

/** Array 表达式 */
export class ArrayExpr<T extends ArrayType> extends BaseExpr<T> {
  at(index: NumericExpr<any> | number): AnyExpr<T['__elementType']> {
    const indexCode = typeof index === 'number' ? `${index}u` : index.toWGSL();
    return createExpr(this.type.__elementType, `${this.toWGSL()}[${indexCode}]`) as AnyExpr<T['__elementType']>;
  }

  len(): IntegerExpr<any> {
    return new IntegerExpr({ __wgslType: 'u32' } as any, `arrayLength(&${this.toWGSL()})`);
  }
}

// ============================================================================
// Type-safe Expression Union & Factory
// ============================================================================

/** 根据类型返回对应的表达式类型 */
export type AnyExpr<T extends WGSLType> =
  T extends BoolType ? BoolExpr :
  T extends IntegerScalarType ? IntegerExpr<T> :
  T extends NumericScalarType ? NumericExpr<T> :
  T extends VectorType<BoolType> ? BoolVecExpr<T> :
  T extends VectorType<NumericScalarType> ? NumericVecExpr<T> :
  T extends StructType ? StructExpr<T> :
  T extends ArrayType ? ArrayExpr<T> :
  BaseExpr<T>;

/** 工厂函数：根据类型创建正确的表达式 */
export function createExpr<T extends WGSLType>(type: T, code: string): AnyExpr<T> {
  if (isBoolType(type)) {
    return new BoolExpr(type, code) as AnyExpr<T>;
  }
  
  if (isNumericScalar(type)) {
    if (type.__wgslType === 'i32' || type.__wgslType === 'u32') {
      return new IntegerExpr(type as any, code) as AnyExpr<T>;
    }
    return new NumericExpr(type as any, code) as AnyExpr<T>;
  }
  
  if (isVectorType(type)) {
    if (isBoolVector(type)) {
      return new BoolVecExpr(type as any, code) as AnyExpr<T>;
    }
    return new NumericVecExpr(type as any, code) as AnyExpr<T>;
  }
  
  if (isStructType(type)) {
    return new StructExpr(type, code) as AnyExpr<T>;
  }
  
  if (isArrayType(type)) {
    return new ArrayExpr(type, code) as AnyExpr<T>;
  }
  
  return new BaseExpr(type, code) as AnyExpr<T>;
}

// ============================================================================
// Literal Constructors
// ============================================================================

import { i32, u32, f32, f16 } from './types.js';

export function litBool(value: boolean): BoolExpr {
  return new BoolExpr(bool, value ? 'true' : 'false');
}

export function litI32(value: number): IntegerExpr<typeof i32> {
  return new IntegerExpr(i32, `${value}i`);
}

export function litU32(value: number): IntegerExpr<typeof u32> {
  return new IntegerExpr(u32, `${value}u`);
}

export function litF32(value: number): NumericExpr<typeof f32> {
  return new NumericExpr(f32, `${value}`);
}

export function litF16(value: number): NumericExpr<typeof f16> {
  return new NumericExpr(f16, `${value}h`);
}

/** 通用字面量 */
export function lit<T extends ScalarType>(value: number | boolean, type: T): AnyExpr<T> {
  if (isBoolType(type)) {
    return litBool(value as boolean) as AnyExpr<T>;
  }
  if (type.__wgslType === 'i32') {
    return litI32(value as number) as AnyExpr<T>;
  }
  if (type.__wgslType === 'u32') {
    return litU32(value as number) as AnyExpr<T>;
  }
  if (type.__wgslType === 'f16') {
    return litF16(value as number) as AnyExpr<T>;
  }
  return litF32(value as number) as AnyExpr<T>;
}

// ============================================================================
// Vector Constructors
// ============================================================================

export function makeVec2<T extends ScalarType>(
  elementType: T,
  x: AnyExpr<T> | number | boolean,
  y: AnyExpr<T> | number | boolean,
): T extends BoolType ? BoolVecExpr<Vec2Type<T>> : NumericVecExpr<Vec2Type<T & NumericScalarType>> {
  const xCode = typeof x === 'number' ? `${x}` : typeof x === 'boolean' ? (x ? 'true' : 'false') : (x as any).toWGSL();
  const yCode = typeof y === 'number' ? `${y}` : typeof y === 'boolean' ? (y ? 'true' : 'false') : (y as any).toWGSL();
  const code = `vec2<${elementType.__wgslType}>(${xCode}, ${yCode})`;
  
  if (isBoolType(elementType)) {
    return new BoolVecExpr(vec2(elementType), code) as any;
  }
  return new NumericVecExpr(vec2(elementType as NumericScalarType), code) as any;
}

export function makeVec3<T extends ScalarType>(
  elementType: T,
  x: AnyExpr<T> | number | boolean,
  y: AnyExpr<T> | number | boolean,
  z: AnyExpr<T> | number | boolean,
): T extends BoolType ? BoolVecExpr<Vec3Type<T>> : NumericVecExpr<Vec3Type<T & NumericScalarType>> {
  const xCode = typeof x === 'number' ? `${x}` : typeof x === 'boolean' ? (x ? 'true' : 'false') : (x as any).toWGSL();
  const yCode = typeof y === 'number' ? `${y}` : typeof y === 'boolean' ? (y ? 'true' : 'false') : (y as any).toWGSL();
  const zCode = typeof z === 'number' ? `${z}` : typeof z === 'boolean' ? (z ? 'true' : 'false') : (z as any).toWGSL();
  const code = `vec3<${elementType.__wgslType}>(${xCode}, ${yCode}, ${zCode})`;
  
  if (isBoolType(elementType)) {
    return new BoolVecExpr(vec3(elementType), code) as any;
  }
  return new NumericVecExpr(vec3(elementType as NumericScalarType), code) as any;
}

export function makeVec4<T extends ScalarType>(
  elementType: T,
  x: AnyExpr<T> | number | boolean,
  y: AnyExpr<T> | number | boolean,
  z: AnyExpr<T> | number | boolean,
  w: AnyExpr<T> | number | boolean,
): T extends BoolType ? BoolVecExpr<Vec4Type<T>> : NumericVecExpr<Vec4Type<T & NumericScalarType>> {
  const xCode = typeof x === 'number' ? `${x}` : typeof x === 'boolean' ? (x ? 'true' : 'false') : (x as any).toWGSL();
  const yCode = typeof y === 'number' ? `${y}` : typeof y === 'boolean' ? (y ? 'true' : 'false') : (y as any).toWGSL();
  const zCode = typeof z === 'number' ? `${z}` : typeof z === 'boolean' ? (z ? 'true' : 'false') : (z as any).toWGSL();
  const wCode = typeof w === 'number' ? `${w}` : typeof w === 'boolean' ? (w ? 'true' : 'false') : (w as any).toWGSL();
  const code = `vec4<${elementType.__wgslType}>(${xCode}, ${yCode}, ${zCode}, ${wCode})`;
  
  if (isBoolType(elementType)) {
    return new BoolVecExpr(vec4(elementType), code) as any;
  }
  return new NumericVecExpr(vec4(elementType as NumericScalarType), code) as any;
}
