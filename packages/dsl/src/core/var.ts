/**
 * Variable Classes - 可变引用
 * 
 * 变量是可以被赋值的表达式
 */

import type { Assignable, CompoundAssignable } from './traits.js';
import {
  type WGSLType,
  type ScalarType,
  type NumericScalarType,
  type BoolType,
  type IntegerScalarType,
  type VectorType,
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
import {
  BaseExpr,
  BoolExpr,
  NumericExpr,
  IntegerExpr,
  BoolVecExpr,
  NumericVecExpr,
  StructExpr,
  ArrayExpr,
  createExpr,
  type AnyExpr,
} from './expr.js';

// ============================================================================
// Variable Base
// ============================================================================

/** 变量基类 - 添加赋值能力 */
export class BaseVar<T extends WGSLType> extends BaseExpr<T> implements Assignable<AnyExpr<T>> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable: boolean = true,
  ) {
    super(type, name);
  }

  set(value: AnyExpr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }
}

// ============================================================================
// Scalar Variables
// ============================================================================

/** Bool 变量 */
export class BoolVar extends BoolExpr implements Assignable<BoolExpr> {
  constructor(
    public readonly name: string,
    public readonly mutable: boolean = true,
  ) {
    super(bool, name);
  }

  set(value: BoolExpr): string {
    return `${this.name} = ${value.toWGSL()}`;
  }
}

/** 数值变量 */
export class NumericVar<T extends NumericScalarType> extends NumericExpr<T>
  implements Assignable<NumericExpr<T>>, CompoundAssignable<NumericExpr<T>> {
  
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable: boolean = true,
  ) {
    super(type, name);
  }

  set(value: NumericExpr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  addEq(value: NumericExpr<T>): string {
    return `${this.name} += ${value.toWGSL()}`;
  }

  subEq(value: NumericExpr<T>): string {
    return `${this.name} -= ${value.toWGSL()}`;
  }

  mulEq(value: NumericExpr<T>): string {
    return `${this.name} *= ${value.toWGSL()}`;
  }

  divEq(value: NumericExpr<T>): string {
    return `${this.name} /= ${value.toWGSL()}`;
  }
}

/** 整数变量 */
export class IntegerVar<T extends IntegerScalarType> extends IntegerExpr<T>
  implements Assignable<IntegerExpr<T>>, CompoundAssignable<IntegerExpr<T>> {
  
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable: boolean = true,
  ) {
    super(type, name);
  }

  set(value: IntegerExpr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  addEq(value: IntegerExpr<T>): string {
    return `${this.name} += ${value.toWGSL()}`;
  }

  subEq(value: IntegerExpr<T>): string {
    return `${this.name} -= ${value.toWGSL()}`;
  }

  mulEq(value: IntegerExpr<T>): string {
    return `${this.name} *= ${value.toWGSL()}`;
  }

  divEq(value: IntegerExpr<T>): string {
    return `${this.name} /= ${value.toWGSL()}`;
  }
}

// ============================================================================
// Vector Variables
// ============================================================================

/** Bool 向量变量 */
export class BoolVecVar<T extends VectorType<BoolType>> extends BoolVecExpr<T>
  implements Assignable<BoolVecExpr<T>> {
  
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable: boolean = true,
  ) {
    super(type, name);
  }

  set(value: BoolVecExpr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }
}

/** 数值向量变量 */
export class NumericVecVar<T extends VectorType<NumericScalarType>> extends NumericVecExpr<T>
  implements Assignable<NumericVecExpr<T>>, CompoundAssignable<NumericVecExpr<T>> {
  
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable: boolean = true,
  ) {
    super(type, name);
  }

  set(value: NumericVecExpr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  addEq(value: NumericVecExpr<T>): string {
    return `${this.name} += ${value.toWGSL()}`;
  }

  subEq(value: NumericVecExpr<T>): string {
    return `${this.name} -= ${value.toWGSL()}`;
  }

  mulEq(value: NumericVecExpr<T> | NumericExpr<T['__elementType']>): string {
    return `${this.name} *= ${value.toWGSL()}`;
  }

  divEq(value: NumericVecExpr<T> | NumericExpr<T['__elementType']>): string {
    return `${this.name} /= ${value.toWGSL()}`;
  }

  // Override swizzle to return mutable refs for single components
  override get x(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.name}.x`, elemType as any, this.mutable) as any;
    }
    return new ScalarRef(`${this.name}.x`, elemType) as any;
  }

  override get y(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.name}.y`, elemType as any, this.mutable) as any;
    }
    return new ScalarRef(`${this.name}.y`, elemType) as any;
  }

  override get z(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.name}.z`, elemType as any, this.mutable) as any;
    }
    return new ScalarRef(`${this.name}.z`, elemType) as any;
  }

  override get w(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.name}.w`, elemType as any, this.mutable) as any;
    }
    return new ScalarRef(`${this.name}.w`, elemType) as any;
  }
}

// ============================================================================
// Struct & Array Variables
// ============================================================================

/** Struct 变量 */
export class StructVar<T extends StructType> extends StructExpr<T> implements Assignable<StructExpr<T>> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable: boolean = true,
  ) {
    super(type, name);
  }

  set(value: StructExpr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  /** 获取字段的可变引用 */
  $<K extends keyof T['__fields'] & string>(fieldName: K): AnyRef<T['__fields'][K]> {
    const fieldType = this.type.__fields[fieldName];
    return createRef(`${this.name}.${fieldName}`, fieldType) as AnyRef<T['__fields'][K]>;
  }
}

/** Array 变量 */
export class ArrayVar<T extends ArrayType> extends ArrayExpr<T> implements Assignable<ArrayExpr<T>> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable: boolean = true,
  ) {
    super(type, name);
  }

  set(value: ArrayExpr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  /** 获取元素的可变引用 */
  $at(index: NumericExpr<any> | number): AnyRef<T['__elementType']> {
    const indexCode = typeof index === 'number' ? `${index}u` : index.toWGSL();
    return createRef(`${this.name}[${indexCode}]`, this.type.__elementType) as AnyRef<T['__elementType']>;
  }
}

// ============================================================================
// Field/Element References (可变引用)
// ============================================================================

/** 标量引用 */
export class ScalarRef<T extends NumericScalarType> extends NumericExpr<T>
  implements Assignable<NumericExpr<T>>, CompoundAssignable<NumericExpr<T>> {
  
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: NumericExpr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  addEq(value: NumericExpr<T>): string {
    return `${this.toWGSL()} += ${value.toWGSL()}`;
  }

  subEq(value: NumericExpr<T>): string {
    return `${this.toWGSL()} -= ${value.toWGSL()}`;
  }

  mulEq(value: NumericExpr<T>): string {
    return `${this.toWGSL()} *= ${value.toWGSL()}`;
  }

  divEq(value: NumericExpr<T>): string {
    return `${this.toWGSL()} /= ${value.toWGSL()}`;
  }
}

/** 向量引用 */
export class VecRef<T extends VectorType<NumericScalarType>> extends NumericVecExpr<T>
  implements Assignable<NumericVecExpr<T>>, CompoundAssignable<NumericVecExpr<T>> {
  
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: NumericVecExpr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  addEq(value: NumericVecExpr<T>): string {
    return `${this.toWGSL()} += ${value.toWGSL()}`;
  }

  subEq(value: NumericVecExpr<T>): string {
    return `${this.toWGSL()} -= ${value.toWGSL()}`;
  }

  mulEq(value: NumericVecExpr<T> | NumericExpr<T['__elementType']>): string {
    return `${this.toWGSL()} *= ${value.toWGSL()}`;
  }

  divEq(value: NumericVecExpr<T> | NumericExpr<T['__elementType']>): string {
    return `${this.toWGSL()} /= ${value.toWGSL()}`;
  }

  // Mutable component access (override parent to return ScalarRef or IntegerVar)
  override get x(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.toWGSL()}.x`, elemType as any, true) as any;
    }
    return new ScalarRef(`${this.toWGSL()}.x`, elemType) as any;
  }

  override get y(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.toWGSL()}.y`, elemType as any, true) as any;
    }
    return new ScalarRef(`${this.toWGSL()}.y`, elemType) as any;
  }

  override get z(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.toWGSL()}.z`, elemType as any, true) as any;
    }
    return new ScalarRef(`${this.toWGSL()}.z`, elemType) as any;
  }

  override get w(): T['__elementType'] extends IntegerScalarType ? IntegerVar<T['__elementType']> : ScalarRef<T['__elementType']> {
    const elemType = this.type.__elementType;
    if (elemType.__wgslType === 'i32' || elemType.__wgslType === 'u32') {
      return new IntegerVar(`${this.toWGSL()}.w`, elemType as any, true) as any;
    }
    return new ScalarRef(`${this.toWGSL()}.w`, elemType) as any;
  }
}

/** Struct 引用 */
export class StructRef<T extends StructType> extends StructExpr<T> implements Assignable<StructExpr<T>> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: StructExpr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  $<K extends keyof T['__fields'] & string>(fieldName: K): AnyRef<T['__fields'][K]> {
    const fieldType = this.type.__fields[fieldName];
    return createRef(`${this.toWGSL()}.${fieldName}`, fieldType) as AnyRef<T['__fields'][K]>;
  }
}

// ============================================================================
// Type-safe Variable/Ref Union & Factory
// ============================================================================

/** 根据类型返回对应的变量类型 */
export type AnyVar<T extends WGSLType> =
  T extends BoolType ? BoolVar :
  T extends IntegerScalarType ? IntegerVar<T> :
  T extends NumericScalarType ? NumericVar<T> :
  T extends VectorType<BoolType> ? BoolVecVar<T> :
  T extends VectorType<NumericScalarType> ? NumericVecVar<T> :
  T extends StructType ? StructVar<T> :
  T extends ArrayType ? ArrayVar<T> :
  BaseVar<T>;

/** 根据类型返回对应的引用类型 */
export type AnyRef<T extends WGSLType> =
  T extends NumericScalarType ? ScalarRef<T> :
  T extends VectorType<NumericScalarType> ? VecRef<T> :
  T extends StructType ? StructRef<T> :
  BaseVar<T>;

/** 工厂函数：创建变量 */
export function createVar<T extends WGSLType>(name: string, type: T, mutable = true): AnyVar<T> {
  if (isBoolType(type)) {
    return new BoolVar(name, mutable) as AnyVar<T>;
  }
  
  if (isNumericScalar(type)) {
    if (type.__wgslType === 'i32' || type.__wgslType === 'u32') {
      return new IntegerVar(name, type as any, mutable) as AnyVar<T>;
    }
    return new NumericVar(name, type as any, mutable) as AnyVar<T>;
  }
  
  if (isVectorType(type)) {
    if (isBoolVector(type)) {
      return new BoolVecVar(name, type as any, mutable) as AnyVar<T>;
    }
    return new NumericVecVar(name, type as any, mutable) as AnyVar<T>;
  }
  
  if (isStructType(type)) {
    return new StructVar(name, type, mutable) as AnyVar<T>;
  }
  
  if (isArrayType(type)) {
    return new ArrayVar(name, type, mutable) as AnyVar<T>;
  }
  
  return new BaseVar(name, type, mutable) as AnyVar<T>;
}

/** 工厂函数：创建引用 */
export function createRef<T extends WGSLType>(code: string, type: T): AnyRef<T> {
  if (isNumericScalar(type)) {
    return new ScalarRef(code, type as any) as AnyRef<T>;
  }
  
  if (isVectorType(type) && !isBoolVector(type)) {
    return new VecRef(code, type as any) as AnyRef<T>;
  }
  
  if (isStructType(type)) {
    return new StructRef(code, type) as AnyRef<T>;
  }
  
  return new BaseVar(code, type, true) as AnyRef<T>;
}
