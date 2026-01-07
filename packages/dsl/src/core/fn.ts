/**
 * Fn - 可注入的函数定义
 *
 * 使用新的组合式类型系统
 */

import {
  type WGSLType,
  type ScalarType,
  type VectorType,
  type StructType,
  type ArrayType,
  isVectorType,
  isStructType,
  isArrayType,
  isBoolType,
  isBoolVector,
  isNumericScalar,
} from "./types.js";

import {
  BaseExpr,
  BoolExpr,
  NumericExpr,
  IntegerExpr,
  NumericVecExpr,
  BoolVecExpr,
  StructExpr,
  ArrayExpr,
  type AnyExpr,
} from "./expr.js";

import type { ShaderContext } from "./builder.js";

// ============================================================================
// Type Helpers
// ============================================================================

/** 函数参数定义元组 [name, type] */
export type FnArg<
  N extends string = string,
  T extends WGSLType = WGSLType,
> = readonly [N, T];

/** 从参数元组数组提取参数记录类型 */
type ArgsToRecord<Args extends FnArg[]> = {
  [K in Args[number] as K[0]]: K[1];
};

/** 函数上下文 - 扩展 ShaderContext，添加参数访问 */
export interface FnContext<Args extends Record<string, WGSLType>>
  extends ShaderContext {
  /** 获取函数参数表达式 */
  $<K extends keyof Args & string>(argName: K): AnyExpr<Args[K]>;
  args(): {
    [K in keyof Args]: AnyExpr<Args[K]>;
  };
}

/** 函数调用参数类型 */
type FnCallArgs<Args extends FnArg[]> = {
  [K in keyof Args]: Args[K] extends FnArg<any, infer T>
    ? AnyExpr<T> | number
    : never;
};


// ============================================================================
// Expression Factory
// ============================================================================

/** 根据类型创建对应的表达式 */
function createTypedExpr<T extends WGSLType>(code: string, type: T): AnyExpr<T> {
  if (isBoolType(type)) {
    return new BoolExpr(type, code) as AnyExpr<T>;
  }

  if (isNumericScalar(type)) {
    if (type.__wgslType === "i32" || type.__wgslType === "u32") {
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
// Fn Class
// ============================================================================

/**
 * Fn 类 - 可定义并注入到 ShaderBuilder 的函数
 */
export class Fn<
  Args extends FnArg[] = [],
  Output extends WGSLType | void = void,
  Name extends string = string,
> {
  private constructor(
    readonly fnName: Name,
    readonly args: Args,
    readonly outputType: Output,
    readonly bodyFn:
      | ((
          ctx: FnContext<ArgsToRecord<Args>>,
        ) => Output extends void ? void : AnyExpr<Output & WGSLType>)
      | null,
  ) {}

  /** 开始定义函数 - 设置函数名 */
  static name<N extends string>(name: N): FnBuilder1<N> {
    return new FnBuilder1(name);
  }

  /** 获取函数的 WGSL 代码 */
  toWGSL(
    emitFn: (line: string) => void,
    createContext: () => ShaderContext,
  ): void {
    if (!this.bodyFn) return;

    // 构建参数列表
    const params = this.args
      .map(([name, type]) => `${name}: ${type.__wgslType}`)
      .join(", ");

    // 构建返回类型
    const returnType = this.outputType
      ? ` -> ${(this.outputType as WGSLType).__wgslType}`
      : "";

    emitFn(`fn ${this.fnName}(${params})${returnType} {`);

    // 创建函数上下文
    const baseCtx = createContext();
    const fnCtx: FnContext<ArgsToRecord<Args>> = {
      ...baseCtx,
      $: (argName: string): any => {
        const argDef = this.args.find(([n]) => n === argName);
        if (!argDef) throw new Error(`Unknown argument: ${argName}`);
        const type = argDef[1];
        return createTypedExpr(argName, type);
      },
      args: () => {
        const result: any = {};
        for (const [argName, argType] of this.args) {
          result[argName] = createTypedExpr(argName, argType);
        }
        return result;
      },
    };

    const result = this.bodyFn(fnCtx);
    if (result && this.outputType) {
      emitFn(`  return ${(result as BaseExpr<any>).toWGSL()};`);
    }

    emitFn(`}`);
  }

  /** 调用此函数 */
  call(
    ...args: FnCallArgs<Args>
  ): Output extends void ? void : AnyExpr<Output & WGSLType> {
    const argsCode = args
      .map((arg) =>
        typeof arg === "number" ? `${arg}` : (arg as BaseExpr<any>).toWGSL(),
      )
      .join(", ");
    const callCode = `${this.fnName}(${argsCode})`;

    if (!this.outputType) {
      return undefined as any;
    }

    return createTypedExpr(callCode, this.outputType as WGSLType) as any;
  }

  /** 作为语句调用（用于无返回值函数）*/
  callStmt(...args: FnCallArgs<Args>): string {
    const argsCode = args
      .map((arg) =>
        typeof arg === "number" ? `${arg}` : (arg as BaseExpr<any>).toWGSL(),
      )
      .join(", ");
    return `${this.fnName}(${argsCode})`;
  }
}


// ============================================================================
// Builder Classes
// ============================================================================

/** 阶段1：已设置名称 */
class FnBuilder1<Name extends string> {
  constructor(readonly fnName: Name) {}

  /** 设置输入参数 */
  input<A extends FnArg[]>(...args: A): FnBuilder2<Name, A> {
    return new FnBuilder2(this.fnName, args);
  }

  /** 无输入参数，直接设置输出 */
  output<O extends WGSLType>(type: O): FnBuilder3<Name, [], O> {
    return new FnBuilder3(this.fnName, [], type);
  }

  /** 无输入参数，无返回值 */
  body(fn: (ctx: FnContext<{}>) => void): Fn<[], void, Name> {
    return new (Fn as any)(this.fnName, [], undefined, fn);
  }
}

/** 阶段2：已设置输入 */
class FnBuilder2<Name extends string, Args extends FnArg[]> {
  constructor(
    readonly fnName: Name,
    readonly args: Args,
  ) {}

  /** 设置输出类型 */
  output<O extends WGSLType>(type: O): FnBuilder3<Name, Args, O> {
    return new FnBuilder3(this.fnName, this.args, type);
  }

  /** 无返回值函数体 */
  body(fn: (ctx: FnContext<ArgsToRecord<Args>>) => void): Fn<Args, void, Name> {
    return new (Fn as any)(this.fnName, this.args, undefined, fn);
  }
}

/** 阶段3：已设置输出 */
class FnBuilder3<
  Name extends string,
  Args extends FnArg[],
  Output extends WGSLType,
> {
  constructor(
    readonly fnName: Name,
    readonly args: Args,
    readonly outputType: Output,
  ) {}

  /** 定义函数体 */
  body(
    fn: (ctx: FnContext<ArgsToRecord<Args>>) => AnyExpr<Output>,
  ): Fn<Args, Output, Name> {
    return new (Fn as any)(this.fnName, this.args, this.outputType, fn);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/** 创建参数元组 */
export const tuple = <N extends string, T extends WGSLType>(
  name: N,
  type: T,
): readonly [N, T] => {
  return [name, type] as const;
};

/** tuple 的别名 */
export const $2 = tuple;
