/**
 * Syntax Sugar - 语法糖
 *
 * 提供更便捷的 DSL 语法
 */

import {
  type WGSLType,
  type ScalarType,
  type NumericScalarType,
  type BoolType,
  type Vec2Type,
  type Vec3Type,
  type Vec4Type,
  type I32Type,
  type U32Type,
  type F32Type,
  type F16Type,
  bool,
  i32,
  u32,
  f32,
  f16,
  vec3,
  vec4,
} from './types.js';

import {
  BoolExpr,
  NumericExpr,
  IntegerExpr,
  NumericVecExpr,
  BoolVecExpr,
  litBool,
  litF32,
  litF16,
  litI32,
  litU32,
  makeVec2,
  makeVec3,
  makeVec4,
  type AnyExpr,
} from './expr.js';

import { type AnyVar } from './var.js';

import type { ShaderContext } from './builder.js';

// ============================================================================
// Switch Builder - 流式 switch 语句
// ============================================================================

type SwitchCase = [number, () => void];

interface SwitchBuilder {
  value(v: IntegerExpr<I32Type | U32Type>): SwitchBuilder;
  case(cs: SwitchCase): SwitchBuilder;
  def(body: () => void): SwitchBuilder;
  $(): void;
}

/**
 * 流式 switch 语句构建器
 *
 * @example
 * sw(ctx)
 *   .value(shapeType)
 *   .case([0, () => { ... }])
 *   .case([1, () => { ... }])
 *   .def(() => { ... })
 *   .$();
 */
export const sw = (ctx: ShaderContext): SwitchBuilder => {
  const cases: { case: number | 'default'; body: () => void }[] = [];
  let valueExpr: IntegerExpr<I32Type | U32Type>;

  const builder: SwitchBuilder = {
    value(v: IntegerExpr<I32Type | U32Type>) {
      valueExpr = v;
      return builder;
    },
    case(cs: SwitchCase) {
      cases.push({
        case: cs[0],
        body: cs[1],
      });
      return builder;
    },
    def(body: () => void) {
      cases.push({
        case: 'default',
        body,
      });
      return builder;
    },
    $() {
      ctx.switch(valueExpr, cases);
    },
  };

  return builder;
};

// ============================================================================
// For Loop Builder - 流式 for 循环
// ============================================================================

interface ForBuilder<T extends ScalarType> {
  /** 设置循环条件: i < n */
  lt(n: number | AnyExpr<T>): ForBuilder<T>;
  /** 设置循环条件: i <= n */
  le(n: number | AnyExpr<T>): ForBuilder<T>;
  /** 设置循环条件: i > n */
  gt(n: number | AnyExpr<T>): ForBuilder<T>;
  /** 设置循环条件: i >= n */
  ge(n: number | AnyExpr<T>): ForBuilder<T>;
  /** 设置步进: i += step (默认 1) */
  step(n: number): ForBuilder<T>;
  /** 设置步进: i -= step */
  stepDown(n: number): ForBuilder<T>;
  /** 执行循环体 */
  do(body: (i: AnyExpr<T>) => void): void;
}

/**
 * 流式 for 循环构建器
 *
 * @example
 * // for (var i: u32 = 0; i < 10; i += 1) { ... }
 * loop(ctx, 'i', u32).lt(10).do(i => {
 *   ctx.exec(y.addEq(lit(0.1, f32)));
 * });
 *
 * // for (var j: i32 = 100; j >= 0; j -= 2) { ... }
 * loop(ctx, 'j', i32, 100).ge(0).stepDown(2).do(j => { ... });
 *
 * // 使用表达式作为边界
 * loop(ctx, 'i', u32).lt(particles.len()).do(i => { ... });
 */
export function loop<T extends ScalarType>(
  ctx: ShaderContext,
  name: string,
  type: T,
  start: number = 0,
): ForBuilder<T> {
  let conditionFn: (i: AnyExpr<T>) => BoolExpr;
  let updateFn: (i: AnyVar<T>) => string;
  let stepValue = 1;
  let stepDir: 'up' | 'down' = 'up';

  const toExpr = (n: number | AnyExpr<T>): AnyExpr<T> => {
    if (typeof n === 'number') {
      // 根据类型创建字面量
      if (type === u32) return litU32(n) as unknown as AnyExpr<T>;
      if (type === i32) return litI32(n) as unknown as AnyExpr<T>;
      if (type === f32) return litF32(n) as unknown as AnyExpr<T>;
      if (type === f16) return litF16(n) as unknown as AnyExpr<T>;
      return litI32(n) as unknown as AnyExpr<T>;
    }
    return n;
  };

  const builder: ForBuilder<T> = {
    lt(n) {
      conditionFn = (i) => (i as IntegerExpr<any>).lt(toExpr(n) as IntegerExpr<any>);
      return builder;
    },
    le(n) {
      conditionFn = (i) => (i as IntegerExpr<any>).le(toExpr(n) as IntegerExpr<any>);
      return builder;
    },
    gt(n) {
      conditionFn = (i) => (i as IntegerExpr<any>).gt(toExpr(n) as IntegerExpr<any>);
      return builder;
    },
    ge(n) {
      conditionFn = (i) => (i as IntegerExpr<any>).ge(toExpr(n) as IntegerExpr<any>);
      return builder;
    },
    step(n) {
      stepValue = n;
      stepDir = 'up';
      return builder;
    },
    stepDown(n) {
      stepValue = n;
      stepDir = 'down';
      return builder;
    },
    do(body) {
      // 设置默认更新函数
      if (!updateFn) {
        updateFn = (i) => {
          const stepExpr = toExpr(stepValue);
          if (stepDir === 'up') {
            return (i as any).addEq(stepExpr);
          } else {
            return (i as any).subEq(stepExpr);
          }
        };
      }

      ctx.for({ name, type, start }, conditionFn, updateFn, body);
    },
  };

  return builder;
}

// ============================================================================
// Vector From Lower Dimension
// ============================================================================

/** vec4 from vec2 + z + w */
export function vec4FromVec2<T extends NumericScalarType>(
  xy: NumericVecExpr<Vec2Type<T>>,
  z: number,
  w: number,
): NumericVecExpr<Vec4Type<T>> {
  const elementType = xy.type.__elementType;
  return new NumericVecExpr(
    vec4(elementType),
    `vec4<${elementType.__wgslType}>(${xy.toWGSL()}, ${z}, ${w})`,
  );
}

/** vec4 from vec3 + w */
export function vec4FromVec3<T extends NumericScalarType>(
  xyz: NumericVecExpr<Vec3Type<T>>,
  w: number,
): NumericVecExpr<Vec4Type<T>> {
  const elementType = xyz.type.__elementType;
  return new NumericVecExpr(
    vec4(elementType),
    `vec4<${elementType.__wgslType}>(${xyz.toWGSL()}, ${w})`,
  );
}

/** vec3 from vec2 + z */
export function vec3FromVec2<T extends NumericScalarType>(
  xy: NumericVecExpr<Vec2Type<T>>,
  z: number,
): NumericVecExpr<Vec3Type<T>> {
  const elementType = xy.type.__elementType;
  return new NumericVecExpr(
    vec3(elementType),
    `vec3<${elementType.__wgslType}>(${xy.toWGSL()}, ${z})`,
  );
}

// ============================================================================
// Value Namespace - 常量和便捷构造器
// ============================================================================

export namespace Value {
  // ============================
  // Constants
  // ============================

  export namespace Consts {
    export namespace F32 {
      export const ZERO = litF32(0.0);
      export const ONE = litF32(1.0);
      export const PI = litF32(3.1415927);
      export const MAX = litF32(3.40282347e38);
      export const MIN = litF32(-3.40282347e38);
      export const EPSILON = litF32(1.1920929e-7);
    }

    export namespace F16 {
      export const ZERO = litF16(0.0);
      export const ONE = litF16(1.0);
      export const PI = litF16(3.14);
      export const MAX = litF16(65504);
      export const MIN = litF16(-65504);
      export const EPSILON = litF16(0.00097656);
    }

    export namespace I32 {
      export const ZERO = litI32(0);
      export const ONE = litI32(1);
      export const NEG_ONE = litI32(-1);
      export const MAX = litI32(2147483647);
      export const MIN = litI32(-2147483648);
    }

    export namespace U32 {
      export const ZERO = litU32(0);
      export const ONE = litU32(1);
      export const MAX = litU32(0xffffffff);
      export const MIN = ZERO;
    }

    export namespace Bool {
      export const TRUE = litBool(true);
      export const FALSE = litBool(false);
    }
  }

  // ============================
  // Internal Helpers
  // ============================

  function assertFinite(value: number, type: string) {
    if (!Number.isFinite(value)) {
      throw new Error(`${type} literal must be finite, got ${value}`);
    }
  }

  function formatFloat(value: number, digits: number): string {
    const s = value.toFixed(digits);
    return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
  }

  // ============================
  // Scalar Constructors
  // ============================

  export function $f16(value: number): NumericExpr<F16Type> {
    assertFinite(value, 'f16');
    return new NumericExpr(f16, `${formatFloat(value, 2)}h`);
  }

  export function $f32(value: number): NumericExpr<F32Type> {
    assertFinite(value, 'f32');
    return new NumericExpr(f32, formatFloat(value, 7));
  }

  export function $i32(value: number): IntegerExpr<I32Type> {
    if (!Number.isInteger(value)) {
      throw new Error(`i32 must be integer, got ${value}`);
    }
    if (value < -2147483648 || value > 2147483647) {
      throw new Error(`i32 out of range: ${value}`);
    }
    return new IntegerExpr(i32, `${value}i`);
  }

  export function $u32(value: number): IntegerExpr<U32Type> {
    if (!Number.isInteger(value)) {
      throw new Error(`u32 must be integer, got ${value}`);
    }
    if (value < 0 || value > 0xffffffff) {
      throw new Error(`u32 out of range: ${value}`);
    }
    return new IntegerExpr(u32, `${value}u`);
  }

  export function $bool(value: boolean): BoolExpr {
    return litBool(value);
  }

  // ============================
  // Vector Constructors
  // ============================

  export function $vec2f(
    x: NumericExpr<F32Type> | number,
    y: NumericExpr<F32Type> | number,
  ): NumericVecExpr<Vec2Type<F32Type>> {
    return makeVec2(f32, x, y);
  }

  export function $vec3f(
    x: NumericExpr<F32Type> | number,
    y: NumericExpr<F32Type> | number,
    z: NumericExpr<F32Type> | number,
  ): NumericVecExpr<Vec3Type<F32Type>> {
    return makeVec3(f32, x, y, z);
  }

  export function $vec4f(
    x: NumericExpr<F32Type> | number,
    y: NumericExpr<F32Type> | number,
    z: NumericExpr<F32Type> | number,
    w: NumericExpr<F32Type> | number,
  ): NumericVecExpr<Vec4Type<F32Type>> {
    return makeVec4(f32, x, y, z, w);
  }

  export function $vec2i(
    x: IntegerExpr<I32Type> | number,
    y: IntegerExpr<I32Type> | number,
  ): NumericVecExpr<Vec2Type<I32Type>> {
    return makeVec2(i32, x, y);
  }

  export function $vec3i(
    x: IntegerExpr<I32Type> | number,
    y: IntegerExpr<I32Type> | number,
    z: IntegerExpr<I32Type> | number,
  ): NumericVecExpr<Vec3Type<I32Type>> {
    return makeVec3(i32, x, y, z);
  }

  export function $vec4i(
    x: IntegerExpr<I32Type> | number,
    y: IntegerExpr<I32Type> | number,
    z: IntegerExpr<I32Type> | number,
    w: IntegerExpr<I32Type> | number,
  ): NumericVecExpr<Vec4Type<I32Type>> {
    return makeVec4(i32, x, y, z, w);
  }

  export function $vec2u(
    x: IntegerExpr<U32Type> | number,
    y: IntegerExpr<U32Type> | number,
  ): NumericVecExpr<Vec2Type<U32Type>> {
    return makeVec2(u32, x, y);
  }

  export function $vec3u(
    x: IntegerExpr<U32Type> | number,
    y: IntegerExpr<U32Type> | number,
    z: IntegerExpr<U32Type> | number,
  ): NumericVecExpr<Vec3Type<U32Type>> {
    return makeVec3(u32, x, y, z);
  }

  export function $vec4u(
    x: IntegerExpr<U32Type> | number,
    y: IntegerExpr<U32Type> | number,
    z: IntegerExpr<U32Type> | number,
    w: IntegerExpr<U32Type> | number,
  ): NumericVecExpr<Vec4Type<U32Type>> {
    return makeVec4(u32, x, y, z, w);
  }

  // ============================
  // Bool Vector Constructors
  // ============================

  export function $vec2b(
    x: BoolExpr | boolean,
    y: BoolExpr | boolean,
  ): BoolVecExpr<Vec2Type<BoolType>> {
    return makeVec2(bool, x, y);
  }

  export function $vec3b(
    x: BoolExpr | boolean,
    y: BoolExpr | boolean,
    z: BoolExpr | boolean,
  ): BoolVecExpr<Vec3Type<BoolType>> {
    return makeVec3(bool, x, y, z);
  }

  export function $vec4b(
    x: BoolExpr | boolean,
    y: BoolExpr | boolean,
    z: BoolExpr | boolean,
    w: BoolExpr | boolean,
  ): BoolVecExpr<Vec4Type<BoolType>> {
    return makeVec4(bool, x, y, z, w);
  }
}

// ============================================================================
// Struct Layout Calculator
// ============================================================================

import type { StructType, ArrayType, StructFields } from './types.js';

interface FieldLayout {
  name: string;
  type: WGSLType;
  offset: number;
  size: number;
  align: number;
}

interface StructLayout {
  fields: FieldLayout[];
  size: number;
  align: number;
}

function getTypeLayout(type: WGSLType): { size: number; align: number } {
  const wgslType = type.__wgslType;

  // Scalar types
  if (['bool', 'i32', 'u32', 'f32'].includes(wgslType)) {
    return { size: 4, align: 4 };
  }
  if (wgslType === 'f16') {
    return { size: 2, align: 2 };
  }

  // Vector types
  if (wgslType.startsWith('vec2')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 2, align: elemSize * 2 };
  }
  if (wgslType.startsWith('vec3')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 3, align: elemSize * 4 };
  }
  if (wgslType.startsWith('vec4')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 4, align: elemSize * 4 };
  }

  // Matrix types
  if (wgslType.startsWith('mat2x2')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 4, align: elemSize * 2 };
  }
  if (wgslType.startsWith('mat3x3')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 12, align: elemSize * 4 };
  }
  if (wgslType.startsWith('mat4x4')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 16, align: elemSize * 4 };
  }

  // Struct type
  if ('__fields' in type) {
    const layout = calculateStructLayout(type as StructType);
    return { size: layout.size, align: layout.align };
  }

  // Array type
  if (wgslType.startsWith('array')) {
    const elemType = (type as ArrayType).__elementType;
    const elemLayout = getTypeLayout(elemType);
    return { size: 0, align: Math.max(elemLayout.align, 16) };
  }

  return { size: 4, align: 4 };
}

/** Calculate struct memory layout */
export function calculateStructLayout(structType: StructType): StructLayout {
  const fields: FieldLayout[] = [];
  let offset = 0;
  let maxAlign = 0;

  for (const [name, type] of Object.entries(structType.__fields)) {
    const { size, align } = getTypeLayout(type);
    offset = Math.ceil(offset / align) * align;
    fields.push({ name, type, offset, size, align });
    offset += size;
    maxAlign = Math.max(maxAlign, align);
  }

  const structSize = Math.ceil(offset / maxAlign) * maxAlign;
  return { fields, size: structSize, align: maxAlign };
}

/** Get struct byte size */
export function structSize(structType: StructType): number {
  return calculateStructLayout(structType).size;
}

/** Create ArrayBuffer for uniform buffer with proper alignment */
export function createUniformBuffer<T extends StructFields>(
  structType: StructType<T>,
  values: { [K in keyof T]?: number | number[] },
): ArrayBuffer {
  const layout = calculateStructLayout(structType);
  const buffer = new ArrayBuffer(layout.size);
  const view = new DataView(buffer);

  for (const field of layout.fields) {
    const value = values[field.name as keyof T];
    if (value === undefined) continue;

    const wgslType = field.type.__wgslType;

    if (typeof value === 'number') {
      if (wgslType === 'f32') {
        view.setFloat32(field.offset, value, true);
      } else if (wgslType === 'i32') {
        view.setInt32(field.offset, value, true);
      } else if (wgslType === 'u32') {
        view.setUint32(field.offset, value, true);
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (wgslType.includes('f32') || wgslType.startsWith('vec') || wgslType.startsWith('mat')) {
          view.setFloat32(field.offset + i * 4, value[i], true);
        } else if (wgslType.includes('i32')) {
          view.setInt32(field.offset + i * 4, value[i], true);
        } else if (wgslType.includes('u32')) {
          view.setUint32(field.offset + i * 4, value[i], true);
        }
      }
    }
  }

  return buffer;
}
