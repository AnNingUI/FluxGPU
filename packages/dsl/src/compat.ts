/**
 * Compatibility Layer
 * 
 * 提供旧 API 的兼容性支持，让现有代码继续工作
 */

// Re-export everything from core
export * from './core/index.js';

// Re-export with old names for compatibility
import {
  BaseExpr,
  BoolExpr,
  NumericExpr,
  IntegerExpr,
  NumericVecExpr,
  BoolVecExpr,
  StructExpr as CoreStructExpr,
  ArrayExpr as CoreArrayExpr,
  createExpr,
  lit,
  litBool,
  litF32,
  litI32,
  litU32,
  makeVec2,
  makeVec3,
  makeVec4,
  type AnyExpr,
} from './core/expr.js';

import {
  createVar,
  NumericVar,
  IntegerVar,
  BoolVar,
  NumericVecVar,
  BoolVecVar,
  StructVar as CoreStructVar,
  ArrayVar as CoreArrayVar,
  type AnyVar,
} from './core/var.js';

import {
  type WGSLType,
  type ScalarType,
  type NumericScalarType,
  type BoolType,
  type VectorType,
  type StructType,
  type ArrayType,
  type Vec2Type,
  type Vec3Type,
  type Vec4Type,
  type F32Type,
  type I32Type,
  type U32Type,
  bool,
  f32,
  i32,
  u32,
  vec2,
  vec3,
  vec4,
  isBoolType,
  isBoolVector,
} from './core/types.js';

// ============================================================================
// Legacy Expr class (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use specific expression types (NumericExpr, BoolExpr, etc.) instead
 */
export class Expr<T extends WGSLType = WGSLType> extends BaseExpr<T> {
  // Add legacy methods that work for all types (even if semantically wrong)
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

  neg(): Expr<T> {
    return new Expr(this.type, `(-${this.toWGSL()})`);
  }

  eq(other: Expr<any>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} == ${other.toWGSL()})`);
  }

  ne(other: Expr<any>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} != ${other.toWGSL()})`);
  }

  lt(other: Expr<any>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} < ${other.toWGSL()})`);
  }

  le(other: Expr<any>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} <= ${other.toWGSL()})`);
  }

  gt(other: Expr<any>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} > ${other.toWGSL()})`);
  }

  ge(other: Expr<any>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} >= ${other.toWGSL()})`);
  }

  and(other: Expr<BoolType>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} && ${other.toWGSL()})`);
  }

  or(other: Expr<BoolType>): Expr<BoolType> {
    return new Expr(bool, `(${this.toWGSL()} || ${other.toWGSL()})`);
  }

  not(): Expr<BoolType> {
    return new Expr(bool, `(!${this.toWGSL()})`);
  }
}

/**
 * @deprecated Use NumericVecExpr or BoolVecExpr instead
 */
export class VecExpr<T extends VectorType> extends Expr<T> {
  static asExpr<T extends VectorType>(expr: Expr<T>): VecExpr<T> {
    return new VecExpr(expr.type, expr.toWGSL());
  }

  get x(): Expr<T['__elementType']> {
    return new Expr(this.type.__elementType, `${this.toWGSL()}.x`);
  }

  get y(): Expr<T['__elementType']> {
    return new Expr(this.type.__elementType, `${this.toWGSL()}.y`);
  }

  get z(): Expr<T['__elementType']> {
    return new Expr(this.type.__elementType, `${this.toWGSL()}.z`);
  }

  get w(): Expr<T['__elementType']> {
    return new Expr(this.type.__elementType, `${this.toWGSL()}.w`);
  }

  get xy(): VecExpr<Vec2Type<T['__elementType']>> {
    return new VecExpr(vec2(this.type.__elementType), `${this.toWGSL()}.xy`);
  }

  get xyz(): VecExpr<Vec3Type<T['__elementType']>> {
    return new VecExpr(vec3(this.type.__elementType), `${this.toWGSL()}.xyz`);
  }

  get rgb(): VecExpr<Vec3Type<T['__elementType']>> {
    return new VecExpr(vec3(this.type.__elementType), `${this.toWGSL()}.rgb`);
  }

  get rgba(): VecExpr<Vec4Type<T['__elementType']>> {
    return new VecExpr(vec4(this.type.__elementType), `${this.toWGSL()}.rgba`);
  }
}

/**
 * @deprecated Use StructExpr from core instead
 */
export class StructExpr<T extends StructType> extends Expr<T> {
  field<K extends keyof T['__fields'] & string>(name: K): Expr<T['__fields'][K]> {
    const fieldType = this.type.__fields[name];
    return new Expr(fieldType, `${this.toWGSL()}.${name}`) as Expr<T['__fields'][K]>;
  }
}

/**
 * @deprecated Use ArrayExpr from core instead
 */
export class ArrayExpr<T extends ArrayType> extends Expr<T> {
  at(index: Expr<U32Type> | Expr<I32Type>): Expr<T['__elementType']> {
    return new Expr(this.type.__elementType, `${this.toWGSL()}[${index.toWGSL()}]`);
  }
}

// ============================================================================
// Legacy Variable classes
// ============================================================================

/**
 * @deprecated Use specific variable types instead
 */
export class Var<T extends WGSLType> extends Expr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true,
  ) {
    super(type, name);
  }

  set(value: Expr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  addEq(value: Expr<any>): string {
    return `${this.name} += ${value.toWGSL()}`;
  }

  subEq(value: Expr<any>): string {
    return `${this.name} -= ${value.toWGSL()}`;
  }

  mulEq(value: Expr<any>): string {
    return `${this.name} *= ${value.toWGSL()}`;
  }

  divEq(value: Expr<any>): string {
    return `${this.name} /= ${value.toWGSL()}`;
  }
}

/**
 * @deprecated Use NumericVecVar or BoolVecVar instead
 */
export class VecVar<T extends VectorType> extends VecExpr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true,
  ) {
    super(type, name);
  }

  set(value: Expr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  addEq(value: Expr<any>): string {
    return `${this.name} += ${value.toWGSL()}`;
  }

  subEq(value: Expr<any>): string {
    return `${this.name} -= ${value.toWGSL()}`;
  }

  mulEq(value: Expr<any>): string {
    return `${this.name} *= ${value.toWGSL()}`;
  }
}

/**
 * @deprecated Use StructVar from core instead
 */
export class StructVar<T extends StructType> extends StructExpr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true,
  ) {
    super(type, name);
  }

  set(value: Expr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }
}

/**
 * @deprecated Use ArrayVar from core instead
 */
export class ArrayVar<T extends ArrayType> extends ArrayExpr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true,
  ) {
    super(type, name);
  }
}

// ============================================================================
// VecBoolExpr compatibility
// ============================================================================

/**
 * @deprecated Use BoolVecExpr instead - this is now just an alias
 */
export class VecBoolExpr<T extends 2 | 3 | 4 = 2> {
  private expr: BoolVecExpr<VectorType<BoolType>>;
  private _mutable = true;
  private _name: string | null = null;

  private constructor(expr: BoolVecExpr<VectorType<BoolType>>) {
    this.expr = expr;
  }

  get mutable() {
    return this._mutable;
  }

  get dim(): T {
    return this.expr.type.__size as T;
  }

  get __wgslType() {
    return this.expr.type.__wgslType;
  }

  toWGSL(): string {
    return this._name ?? this.expr.toWGSL();
  }

  static vec2(x: Expr<BoolType> | boolean, y: Expr<BoolType> | boolean): VecBoolExpr<2> {
    const xCode = typeof x === 'boolean' ? (x ? 'true' : 'false') : x.toWGSL();
    const yCode = typeof y === 'boolean' ? (y ? 'true' : 'false') : y.toWGSL();
    const expr = new BoolVecExpr(vec2(bool), `vec2<bool>(${xCode}, ${yCode})`);
    return new VecBoolExpr(expr) as VecBoolExpr<2>;
  }

  static vec3(
    x: Expr<BoolType> | boolean,
    y: Expr<BoolType> | boolean,
    z: Expr<BoolType> | boolean,
  ): VecBoolExpr<3> {
    const xCode = typeof x === 'boolean' ? (x ? 'true' : 'false') : x.toWGSL();
    const yCode = typeof y === 'boolean' ? (y ? 'true' : 'false') : y.toWGSL();
    const zCode = typeof z === 'boolean' ? (z ? 'true' : 'false') : z.toWGSL();
    const expr = new BoolVecExpr(vec3(bool), `vec3<bool>(${xCode}, ${yCode}, ${zCode})`);
    return new VecBoolExpr(expr) as VecBoolExpr<3>;
  }

  static vec4(
    x: Expr<BoolType> | boolean,
    y: Expr<BoolType> | boolean,
    z: Expr<BoolType> | boolean,
    w: Expr<BoolType> | boolean,
  ): VecBoolExpr<4> {
    const xCode = typeof x === 'boolean' ? (x ? 'true' : 'false') : x.toWGSL();
    const yCode = typeof y === 'boolean' ? (y ? 'true' : 'false') : y.toWGSL();
    const zCode = typeof z === 'boolean' ? (z ? 'true' : 'false') : z.toWGSL();
    const wCode = typeof w === 'boolean' ? (w ? 'true' : 'false') : w.toWGSL();
    const expr = new BoolVecExpr(vec4(bool), `vec4<bool>(${xCode}, ${yCode}, ${zCode}, ${wCode})`);
    return new VecBoolExpr(expr) as VecBoolExpr<4>;
  }

  get x(): Expr<BoolType> {
    return new Expr(bool, `${this.toWGSL()}.x`);
  }

  get y(): Expr<BoolType> {
    return new Expr(bool, `${this.toWGSL()}.y`);
  }

  get z(): Expr<BoolType> {
    return new Expr(bool, `${this.toWGSL()}.z`);
  }

  get w(): Expr<BoolType> {
    return new Expr(bool, `${this.toWGSL()}.w`);
  }

  and(other: VecBoolExpr<T>): VecBoolExpr<T> {
    const result = this.expr.and(other.expr as any);
    return new VecBoolExpr(result) as VecBoolExpr<T>;
  }

  or(other: VecBoolExpr<T>): VecBoolExpr<T> {
    const result = this.expr.or(other.expr as any);
    return new VecBoolExpr(result) as VecBoolExpr<T>;
  }

  not(): VecBoolExpr<T> {
    const result = this.expr.not();
    return new VecBoolExpr(result) as VecBoolExpr<T>;
  }

  set(value: VecBoolExpr<T>): string {
    if (!this._name) {
      throw new Error('the value must init by shader body');
    }
    if (!this._mutable) {
      throw new Error('the value must mutable');
    }
    return `${this._name} = ${value.toWGSL()}`;
  }

  val(ctx: any, name: string): this {
    const builder = ctx[Symbol.for('ShaderBuilder::GetBuilder')]?.() ?? ctx;
    if (builder.emit) {
      builder.emit(`let ${name}: ${this.__wgslType} = ${this.toWGSL()};`);
    }
    this._name = name;
    this._mutable = false;
    return this;
  }

  var(ctx: any, name: string): this {
    const builder = ctx[Symbol.for('ShaderBuilder::GetBuilder')]?.() ?? ctx;
    if (builder.emit) {
      builder.emit(`var ${name}: ${this.__wgslType} = ${this.toWGSL()};`);
    }
    this._name = name;
    this._mutable = true;
    return this;
  }
}
