/**
 * Unified DSL for WGSL Shader Construction
 * 
 * 直接复用 types.js 和 builtins.js，提供统一的 shader 构建 API
 * 支持完整的类型推断和复杂类型系统
 */

import {
  WGSLType, ScalarType, VectorType, StructType, ArrayType, StructFields,
  Expr, VecExpr, StructExpr, ArrayExpr,
  bool, i32, u32, f32,
  vec2, vec3, vec4,
  mat2x2, mat3x3, mat4x4,
  array, struct,
  lit,
  BoolType, I32Type, U32Type, F32Type, F16Type,
  Vec2Type, Vec3Type, Vec4Type,
} from './types.js';

import * as builtins from './builtins.js';

// Re-export everything from types and builtins
export * from './types.js';
export * from './builtins.js';

// ============================================================================
// Type Registry - 自动收集 struct 定义
// ============================================================================

class TypeRegistry {
  private types = new Map<string, StructType>();

  register<T extends StructFields>(name: string, fields: T): StructType<T> {
    const structType = struct(name, fields);
    this.types.set(name, structType);
    return structType;
  }

  get(name: string): StructType | undefined {
    return this.types.get(name);
  }

  toWGSL(structType: StructType): string {
    const fields = Object.entries(structType.__fields)
      .map(([name, type]) => `  ${name}: ${type.__wgslType},`)
      .join('\n');
    return `struct ${structType.__structName} {\n${fields}\n}`;
  }

  clear(): void {
    this.types.clear();
  }
}

const globalRegistry = new TypeRegistry();

/**
 * 定义并注册一个 struct 类型
 */
export function defineStruct<T extends StructFields>(name: string, fields: T): StructType<T> {
  return globalRegistry.register(name, fields);
}

// ============================================================================
// Struct Layout Calculator - 计算 WGSL struct 的内存布局
// ============================================================================

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

/**
 * 获取 WGSL 类型的大小和对齐要求
 * 参考 https://www.w3.org/TR/WGSL/#alignment-and-size
 */
function getTypeLayout(type: WGSLType): { size: number; align: number } {
  const wgslType = type.__wgslType;
  
  // 标量类型
  if (wgslType === 'bool' || wgslType === 'i32' || wgslType === 'u32' || wgslType === 'f32') {
    return { size: 4, align: 4 };
  }
  if (wgslType === 'f16') {
    return { size: 2, align: 2 };
  }
  
  // 向量类型
  if (wgslType.startsWith('vec2')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 2, align: elemSize * 2 };
  }
  if (wgslType.startsWith('vec3')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 3, align: elemSize * 4 }; // vec3 对齐到 vec4
  }
  if (wgslType.startsWith('vec4')) {
    const elemSize = wgslType.includes('f16') ? 2 : 4;
    return { size: elemSize * 4, align: elemSize * 4 };
  }
  
  // 矩阵类型 (列主序)
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
  
  // Struct 类型
  if ('__fields' in type) {
    const layout = calculateStructLayout(type as StructType);
    return { size: layout.size, align: layout.align };
  }
  
  // 数组类型
  if (wgslType.startsWith('array')) {
    // 运行时大小的数组，返回元素的布局
    const elemType = (type as ArrayType).__elementType;
    const elemLayout = getTypeLayout(elemType);
    // 数组元素需要对齐到 16 字节边界（对于 uniform buffer）
    return { size: 0, align: Math.max(elemLayout.align, 16) };
  }
  
  // 默认
  return { size: 4, align: 4 };
}

/**
 * 计算 struct 的内存布局
 */
export function calculateStructLayout(structType: StructType): StructLayout {
  const fields: FieldLayout[] = [];
  let offset = 0;
  let maxAlign = 0;
  
  for (const [name, type] of Object.entries(structType.__fields)) {
    const { size, align } = getTypeLayout(type);
    
    // 对齐到字段的对齐要求
    offset = Math.ceil(offset / align) * align;
    
    fields.push({ name, type, offset, size, align });
    
    offset += size;
    maxAlign = Math.max(maxAlign, align);
  }
  
  // struct 的总大小需要对齐到最大对齐要求
  const structSize = Math.ceil(offset / maxAlign) * maxAlign;
  
  return { fields, size: structSize, align: maxAlign };
}

/**
 * 获取 struct 的字节大小（用于创建 buffer）
 */
export function structSize(structType: StructType): number {
  return calculateStructLayout(structType).size;
}

/**
 * 创建一个用于写入 uniform buffer 的 ArrayBuffer
 * 自动处理对齐和填充
 */
export function createUniformBuffer<T extends StructFields>(
  structType: StructType<T>,
  values: { [K in keyof T]?: number | number[] }
): ArrayBuffer {
  const layout = calculateStructLayout(structType);
  const buffer = new ArrayBuffer(layout.size);
  const view = new DataView(buffer);
  
  for (const field of layout.fields) {
    const value = values[field.name as keyof T];
    if (value === undefined) continue;
    
    const wgslType = field.type.__wgslType;
    
    if (typeof value === 'number') {
      // 标量
      if (wgslType === 'f32') {
        view.setFloat32(field.offset, value, true);
      } else if (wgslType === 'i32') {
        view.setInt32(field.offset, value, true);
      } else if (wgslType === 'u32') {
        view.setUint32(field.offset, value, true);
      }
    } else if (Array.isArray(value)) {
      // 向量或矩阵
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

// ============================================================================
// Type Helpers - 判断类型
// ============================================================================

function isVectorType(type: WGSLType): type is VectorType {
  return '__size' in type && '__elementType' in type;
}

function isStructType(type: WGSLType): type is StructType {
  return '__fields' in type && '__structName' in type;
}

function isArrayType(type: WGSLType): type is ArrayType {
  return '__elementType' in type && 
         typeof (type as any).__size !== 'number' && 
         type.__wgslType.startsWith('array');
}

// ============================================================================
// Typed Variables - 支持类型安全的赋值操作
// ============================================================================

/** 标量变量 */
export class Var<T extends WGSLType> extends Expr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true
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

/** 向量变量 - 支持 swizzle */
export class VecVar<T extends VectorType> extends VecExpr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true
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

/** Struct 变量 - 支持字段访问 */
export class StructVar<T extends StructType> extends StructExpr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true
  ) {
    super(type, name);
  }

  set(value: Expr<T>): string {
    return `${this.name} = ${value.toWGSL()}`;
  }

  /** 获取字段的可变引用 - 根据字段类型返回正确的引用类型 */
  $<K extends keyof T['__fields'] & string>(fieldName: K): FieldRefFor<T['__fields'][K]> {
    const fieldType = this.type.__fields[fieldName];
    return createFieldRef(`${this.name}.${fieldName}`, fieldType) as FieldRefFor<T['__fields'][K]>;
  }
}

/** 数组变量 - 支持索引访问 */
export class ArrayVar<T extends ArrayType> extends ArrayExpr<T> {
  constructor(
    public readonly name: string,
    type: T,
    public readonly mutable = true
  ) {
    super(type, name);
  }

  /** 获取元素的可变引用 */
  $at(index: Expr<U32Type | I32Type> | number): ElementRefFor<T['__elementType']> {
    const indexCode = typeof index === 'number' ? `${index}u` : index.toWGSL();
    return createElementRef(`${this.name}[${indexCode}]`, this.type.__elementType) as ElementRefFor<T['__elementType']>;
  }

  /** 数组长度 */
  len(): Expr<U32Type> {
    return new Expr(u32, `arrayLength(&${this.name})`);
  }
}

// ============================================================================
// Field References - 根据类型返回正确的引用类型
// ============================================================================

/** 标量字段引用 */
export class ScalarFieldRef<T extends ScalarType> extends Expr<T> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: Expr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  addEq(value: Expr<any>): string {
    return `${this.toWGSL()} += ${value.toWGSL()}`;
  }

  subEq(value: Expr<any>): string {
    return `${this.toWGSL()} -= ${value.toWGSL()}`;
  }

  mulEq(value: Expr<any>): string {
    return `${this.toWGSL()} *= ${value.toWGSL()}`;
  }
}

/** 向量分量引用 - 支持对单个分量的赋值操作 */
export class ScalarComponentRef<T extends ScalarType> extends Expr<T> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: Expr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  addEq(value: Expr<any>): string {
    return `${this.toWGSL()} += ${value.toWGSL()}`;
  }

  subEq(value: Expr<any>): string {
    return `${this.toWGSL()} -= ${value.toWGSL()}`;
  }

  mulEq(value: Expr<any>): string {
    return `${this.toWGSL()} *= ${value.toWGSL()}`;
  }

  divEq(value: Expr<any>): string {
    return `${this.toWGSL()} /= ${value.toWGSL()}`;
  }
}

/** 向量字段引用 - 支持 swizzle 和分量赋值 */
export class VecFieldRef<T extends VectorType> extends VecExpr<T> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: Expr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  addEq(value: Expr<any>): string {
    return `${this.toWGSL()} += ${value.toWGSL()}`;
  }

  subEq(value: Expr<any>): string {
    return `${this.toWGSL()} -= ${value.toWGSL()}`;
  }

  mulEq(value: Expr<any>): string {
    return `${this.toWGSL()} *= ${value.toWGSL()}`;
  }

  // 覆盖 swizzle 访问器，返回可变引用
  get x(): ScalarComponentRef<T['__elementType']> {
    return new ScalarComponentRef(`${this.toWGSL()}.x`, this.type.__elementType);
  }

  get y(): ScalarComponentRef<T['__elementType']> {
    return new ScalarComponentRef(`${this.toWGSL()}.y`, this.type.__elementType);
  }

  get z(): ScalarComponentRef<T['__elementType']> {
    return new ScalarComponentRef(`${this.toWGSL()}.z`, this.type.__elementType);
  }

  get w(): ScalarComponentRef<T['__elementType']> {
    return new ScalarComponentRef(`${this.toWGSL()}.w`, this.type.__elementType);
  }
}

/** Struct 字段引用 */
export class StructFieldRef<T extends StructType> extends StructExpr<T> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: Expr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  /** 嵌套字段访问 */
  $<K extends keyof T['__fields'] & string>(fieldName: K): FieldRefFor<T['__fields'][K]> {
    const fieldType = this.type.__fields[fieldName];
    return createFieldRef(`${this.toWGSL()}.${fieldName}`, fieldType) as FieldRefFor<T['__fields'][K]>;
  }
}

/** 通用字段引用（用于未知类型） */
export class FieldRef<T extends WGSLType> extends Expr<T> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: Expr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }
}

// 类型映射：根据 WGSLType 返回对应的 FieldRef 类型
type FieldRefFor<T extends WGSLType> =
  T extends VectorType ? VecFieldRef<T> :
  T extends StructType ? StructFieldRef<T> :
  T extends ScalarType ? ScalarFieldRef<T> :
  FieldRef<T>;

// 工厂函数：创建正确类型的 FieldRef
function createFieldRef<T extends WGSLType>(code: string, type: T): FieldRefFor<T> {
  if (isVectorType(type)) {
    return new VecFieldRef(code, type) as FieldRefFor<T>;
  }
  if (isStructType(type)) {
    return new StructFieldRef(code, type) as FieldRefFor<T>;
  }
  if (type === f32 || type === i32 || type === u32 || type === bool) {
    return new ScalarFieldRef(code, type as ScalarType) as FieldRefFor<T>;
  }
  return new FieldRef(code, type) as FieldRefFor<T>;
}

// ============================================================================
// Element References - 数组元素引用
// ============================================================================

/** Struct 元素引用 */
export class StructElementRef<T extends StructType> extends StructExpr<T> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: Expr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }

  $<K extends keyof T['__fields'] & string>(fieldName: K): FieldRefFor<T['__fields'][K]> {
    const fieldType = this.type.__fields[fieldName];
    return createFieldRef(`${this.toWGSL()}.${fieldName}`, fieldType) as FieldRefFor<T['__fields'][K]>;
  }
}

/** 通用元素引用 */
export class ElementRef<T extends WGSLType> extends Expr<T> {
  constructor(code: string, type: T) {
    super(type, code);
  }

  set(value: Expr<T>): string {
    return `${this.toWGSL()} = ${value.toWGSL()}`;
  }
}

// 类型映射
type ElementRefFor<T extends WGSLType> =
  T extends StructType ? StructElementRef<T> :
  ElementRef<T>;

// 工厂函数
function createElementRef<T extends WGSLType>(code: string, type: T): ElementRefFor<T> {
  if (isStructType(type)) {
    return new StructElementRef(code, type) as ElementRefFor<T>;
  }
  return new ElementRef(code, type) as ElementRefFor<T>;
}

// ============================================================================
// Shader Context - 着色器函数体构建器
// ============================================================================

export interface ShaderContext {
  // 变量声明
  let<T extends WGSLType>(name: string, type: T, value: Expr<any>): VarFor<T>;
  var<T extends WGSLType>(name: string, type: T, value?: Expr<any>): VarFor<T>;
  const<T extends WGSLType>(name: string, type: T, value: Expr<any>): VarFor<T>;

  // 执行语句
  exec(statement: string): void;

  // 控制流
  if(condition: Expr<BoolType>, then: () => void, otherwise?: () => void): void;
  for(
    init: { name: string; type: ScalarType; start: number },
    condition: (i: Expr<any>) => Expr<BoolType>,
    update: (i: Var<any>) => string,
    body: (i: Expr<any>) => void
  ): void;
  while(condition: Expr<BoolType>, body: () => void): void;
  switch(value: Expr<U32Type | I32Type>, cases: Array<{ case: number | 'default'; body: () => void }>): void;

  // 语句
  return(value?: Expr<any>): void;
  discard(): void;
  break(): void;
  continue(): void;

  // 内置函数
  builtins: typeof builtins;

  // 原始 WGSL 注入
  raw(code: string): void;
}

// 根据类型返回对应的变量类型
type VarFor<T extends WGSLType> =
  T extends VectorType ? VecVar<T> :
  T extends StructType ? StructVar<T> :
  T extends ArrayType ? ArrayVar<T> :
  Var<T>;

// ============================================================================
// Compute Shader Builtins
// ============================================================================

export interface ComputeBuiltins {
  globalInvocationId: VecExpr<Vec3Type<U32Type>>;
  localInvocationId: VecExpr<Vec3Type<U32Type>>;
  workgroupId: VecExpr<Vec3Type<U32Type>>;
  numWorkgroups: VecExpr<Vec3Type<U32Type>>;
  localInvocationIndex: Expr<U32Type>;
}

// ============================================================================
// Vertex Shader Builtins
// ============================================================================

export interface VertexBuiltins {
  vertexIndex: Expr<U32Type>;
  instanceIndex: Expr<U32Type>;
}

/** 顶点输入属性配置 */
export interface VertexAttribute {
  location: number;
  type: WGSLType;
}

/** 顶点输出配置 */
export interface VertexOutputConfig {
  /** 输出到 @builtin(position) 的 vec4<f32> */
  position: VecExpr<Vec4Type<F32Type>>;
  /** 其他输出到 @location(n) 的变量 */
  varyings?: Record<string, { location: number; value: Expr<any> }>;
}

// ============================================================================
// Fragment Shader Builtins
// ============================================================================

export interface FragmentBuiltins {
  position: VecExpr<Vec4Type<F32Type>>;
  frontFacing: Expr<BoolType>;
  sampleIndex: Expr<U32Type>;
  sampleMask: Expr<U32Type>;
}

/** 片段输入配置（来自顶点着色器的 varyings）*/
export interface FragmentInput {
  location: number;
  type: WGSLType;
}

/** 片段输出配置 */
export interface FragmentOutputConfig {
  /** 输出颜色，可以是单个或多个 render target */
  colors: Array<{ location: number; value: VecExpr<Vec4Type<F32Type>> }>;
  /** 可选的深度输出 */
  depth?: Expr<F32Type>;
}

// ============================================================================
// Shader Builder - 主 API
// ============================================================================

export class ShaderBuilder {
  private usedTypes = new Set<string>();
  private bindings: string[] = [];
  private globals: string[] = [];
  private functions: string[] = [];
  private currentLines: string[] = [];
  private indent = 0;

  /** 声明 storage buffer 绑定 */
  storage<T extends WGSLType>(
    name: string,
    type: T,
    group: number,
    binding: number,
    access: 'read' | 'read_write' = 'read'
  ): VarFor<T> {
    this.collectType(type);
    this.bindings.push(
      `@group(${group}) @binding(${binding}) var<storage, ${access}> ${name}: ${type.__wgslType};`
    );
    return this.createTypedVar(name, type) as VarFor<T>;
  }

  /** 声明 uniform buffer 绑定 */
  uniform<T extends WGSLType>(
    name: string,
    type: T,
    group: number,
    binding: number
  ): VarFor<T> {
    this.collectType(type);
    this.bindings.push(
      `@group(${group}) @binding(${binding}) var<uniform> ${name}: ${type.__wgslType};`
    );
    return this.createTypedVar(name, type) as VarFor<T>;
  }

  /** 定义 compute shader 入口 */
  compute(
    workgroupSize: [number, number?, number?],
    body: (ctx: ShaderContext, builtins: ComputeBuiltins) => void
  ): this {
    const [x, y = 1, z = 1] = workgroupSize;
    this.currentLines = [];
    this.indent = 0;

    const computeBuiltins: ComputeBuiltins = {
      globalInvocationId: new VecExpr(vec3(u32), 'global_invocation_id'),
      localInvocationId: new VecExpr(vec3(u32), 'local_invocation_id'),
      workgroupId: new VecExpr(vec3(u32), 'workgroup_id'),
      numWorkgroups: new VecExpr(vec3(u32), 'num_workgroups'),
      localInvocationIndex: new Expr(u32, 'local_invocation_index'),
    };

    this.emit(`@compute @workgroup_size(${x}, ${y}, ${z})`);
    this.emit(`fn main(`);
    this.emit(`  @builtin(global_invocation_id) global_invocation_id: vec3<u32>,`);
    this.emit(`  @builtin(local_invocation_id) local_invocation_id: vec3<u32>,`);
    this.emit(`  @builtin(workgroup_id) workgroup_id: vec3<u32>,`);
    this.emit(`  @builtin(num_workgroups) num_workgroups: vec3<u32>,`);
    this.emit(`  @builtin(local_invocation_index) local_invocation_index: u32`);
    this.emit(`) {`);
    this.indent++;

    body(this.createContext(), computeBuiltins);

    this.indent--;
    this.emit(`}`);

    this.functions.push(this.currentLines.join('\n'));
    return this;
  }

  /** 定义 vertex shader 入口 */
  vertex<TVaryings extends Record<string, { location: number; type: WGSLType }>>(
    config: {
      /** 顶点属性输入 */
      attributes?: Record<string, VertexAttribute>;
      /** 输出到片段着色器的 varyings */
      varyings?: TVaryings;
    },
    body: (
      ctx: ShaderContext,
      builtins: VertexBuiltins,
      inputs: { [K in keyof typeof config.attributes]: VarFor<NonNullable<typeof config.attributes>[K]['type']> }
    ) => VertexOutputConfig
  ): this {
    this.currentLines = [];
    this.indent = 0;

    const { attributes = {}, varyings = {} } = config;

    // 生成 VertexOutput struct
    const varyingFields: string[] = [];
    varyingFields.push(`  @builtin(position) position: vec4<f32>,`);
    for (const [name, v] of Object.entries(varyings) as [string, { location: number; type: WGSLType }][]) {
      varyingFields.push(`  @location(${v.location}) ${name}: ${v.type.__wgslType},`);
    }
    
    this.emit(`struct VertexOutput {`);
    for (const field of varyingFields) {
      this.emit(field);
    }
    this.emit(`}`);
    this.emit(``);

    // 生成函数签名
    const params: string[] = [];
    params.push(`@builtin(vertex_index) vertex_index: u32`);
    params.push(`@builtin(instance_index) instance_index: u32`);
    for (const [name, attr] of Object.entries(attributes)) {
      params.push(`@location(${attr.location}) ${name}: ${attr.type.__wgslType}`);
    }

    this.emit(`@vertex`);
    this.emit(`fn main(`);
    for (let i = 0; i < params.length; i++) {
      this.emit(`  ${params[i]}${i < params.length - 1 ? ',' : ''}`);
    }
    this.emit(`) -> VertexOutput {`);
    this.indent++;

    // 创建 builtins
    const vertexBuiltins: VertexBuiltins = {
      vertexIndex: new Expr(u32, 'vertex_index'),
      instanceIndex: new Expr(u32, 'instance_index'),
    };

    // 创建输入变量
    const inputs: Record<string, any> = {};
    for (const [name, attr] of Object.entries(attributes)) {
      inputs[name] = this.createTypedVar(name, attr.type);
    }

    // 执行 body
    const output = body(this.createContext(), vertexBuiltins, inputs as any);

    // 生成输出
    this.emit(`var output: VertexOutput;`);
    this.emit(`output.position = ${output.position.toWGSL()};`);
    if (output.varyings) {
      for (const [name, v] of Object.entries(output.varyings)) {
        this.emit(`output.${name} = ${v.value.toWGSL()};`);
      }
    }
    this.emit(`return output;`);

    this.indent--;
    this.emit(`}`);

    this.functions.push(this.currentLines.join('\n'));
    return this;
  }

  /** 定义 fragment shader 入口 */
  fragment<TInputs extends Record<string, FragmentInput>>(
    config: {
      /** 来自顶点着色器的输入 */
      inputs?: TInputs;
      /** 输出 render target 数量 */
      targets?: number;
    },
    body: (
      ctx: ShaderContext,
      builtins: FragmentBuiltins,
      inputs: { [K in keyof TInputs]: VarFor<TInputs[K]['type']> }
    ) => FragmentOutputConfig
  ): this {
    this.currentLines = [];
    this.indent = 0;

    const { inputs: inputConfig = {}, targets = 1 } = config;

    // 生成 FragmentInput struct (如果有输入)
    const hasInputs = Object.keys(inputConfig).length > 0;
    if (hasInputs) {
      this.emit(`struct FragmentInput {`);
      this.emit(`  @builtin(position) position: vec4<f32>,`);
      for (const [name, inp] of Object.entries(inputConfig) as [string, FragmentInput][]) {
        this.emit(`  @location(${inp.location}) ${name}: ${inp.type.__wgslType},`);
      }
      this.emit(`}`);
      this.emit(``);
    }

    // 生成 FragmentOutput struct
    this.emit(`struct FragmentOutput {`);
    for (let i = 0; i < targets; i++) {
      this.emit(`  @location(${i}) color${i}: vec4<f32>,`);
    }
    this.emit(`}`);
    this.emit(``);

    // 生成函数签名
    this.emit(`@fragment`);
    if (hasInputs) {
      this.emit(`fn main(input: FragmentInput) -> FragmentOutput {`);
    } else {
      this.emit(`fn main(`);
      this.emit(`  @builtin(position) frag_position: vec4<f32>,`);
      this.emit(`  @builtin(front_facing) front_facing: bool,`);
      this.emit(`  @builtin(sample_index) sample_index: u32,`);
      this.emit(`  @builtin(sample_mask) sample_mask: u32`);
      this.emit(`) -> FragmentOutput {`);
    }
    this.indent++;

    // 创建 builtins
    const fragmentBuiltins: FragmentBuiltins = {
      position: new VecExpr(vec4(f32), hasInputs ? 'input.position' : 'frag_position'),
      frontFacing: new Expr(bool, hasInputs ? 'true' : 'front_facing'), // 简化处理
      sampleIndex: new Expr(u32, hasInputs ? '0u' : 'sample_index'),
      sampleMask: new Expr(u32, hasInputs ? '0u' : 'sample_mask'),
    };

    // 创建输入变量
    const inputs: Record<string, any> = {};
    for (const [name, inp] of Object.entries(inputConfig) as [string, FragmentInput][]) {
      inputs[name] = this.createTypedVar(hasInputs ? `input.${name}` : name, inp.type);
    }

    // 执行 body
    const output = body(this.createContext(), fragmentBuiltins, inputs as any);

    // 生成输出
    this.emit(`var output: FragmentOutput;`);
    for (const color of output.colors) {
      this.emit(`output.color${color.location} = ${color.value.toWGSL()};`);
    }
    this.emit(`return output;`);

    this.indent--;
    this.emit(`}`);

    this.functions.push(this.currentLines.join('\n'));
    return this;
  }

  /** 构建最终的 WGSL 代码 */
  build(): string {
    const parts: string[] = [];

    // Struct 定义
    const structDefs = Array.from(this.usedTypes)
      .map(name => globalRegistry.get(name))
      .filter((t): t is StructType => t !== undefined)
      .map(t => globalRegistry.toWGSL(t));
    
    if (structDefs.length > 0) {
      parts.push(structDefs.join('\n\n'));
    }

    // Bindings
    if (this.bindings.length > 0) {
      parts.push(this.bindings.join('\n'));
    }

    // Globals
    if (this.globals.length > 0) {
      parts.push(this.globals.join('\n'));
    }

    // Functions
    if (this.functions.length > 0) {
      parts.push(this.functions.join('\n\n'));
    }

    return parts.join('\n\n');
  }

  private emit(line: string): void {
    this.currentLines.push('  '.repeat(this.indent) + line);
  }

  private collectType(type: WGSLType): void {
    if (isStructType(type)) {
      this.usedTypes.add(type.__structName);
      for (const fieldType of Object.values(type.__fields)) {
        this.collectType(fieldType);
      }
    }
    if ('__elementType' in type) {
      this.collectType((type as any).__elementType);
    }
  }

  private createTypedVar<T extends WGSLType>(name: string, type: T): VarFor<T> {
    if (isArrayType(type)) {
      return new ArrayVar(name, type) as VarFor<T>;
    }
    if (isStructType(type)) {
      return new StructVar(name, type) as VarFor<T>;
    }
    if (isVectorType(type)) {
      return new VecVar(name, type) as VarFor<T>;
    }
    return new Var(name, type) as VarFor<T>;
  }

  private createContext(): ShaderContext {
    const self = this;

    return {
      let<T extends WGSLType>(name: string, type: T, value: Expr<any>): VarFor<T> {
        self.emit(`let ${name}: ${type.__wgslType} = ${value.toWGSL()};`);
        return self.createTypedVar(name, type) as VarFor<T>;
      },

      var<T extends WGSLType>(name: string, type: T, value?: Expr<any>): VarFor<T> {
        const init = value ? ` = ${value.toWGSL()}` : '';
        self.emit(`var ${name}: ${type.__wgslType}${init};`);
        return self.createTypedVar(name, type) as VarFor<T>;
      },

      const<T extends WGSLType>(name: string, type: T, value: Expr<any>): VarFor<T> {
        self.emit(`const ${name}: ${type.__wgslType} = ${value.toWGSL()};`);
        return self.createTypedVar(name, type) as VarFor<T>;
      },

      exec(statement: string): void {
        self.emit(`${statement};`);
      },

      if(condition: Expr<BoolType>, then: () => void, otherwise?: () => void): void {
        self.emit(`if (${condition.toWGSL()}) {`);
        self.indent++;
        then();
        self.indent--;
        if (otherwise) {
          self.emit(`} else {`);
          self.indent++;
          otherwise();
          self.indent--;
        }
        self.emit(`}`);
      },

      for(init, condition, update, body): void {
        const { name, type, start } = init;
        const iVar = new Var(name, type);
        const iExpr = new Expr(type, name);
        self.emit(`for (var ${name}: ${type.__wgslType} = ${start}; ${condition(iExpr).toWGSL()}; ${update(iVar)}) {`);
        self.indent++;
        body(iExpr);
        self.indent--;
        self.emit(`}`);
      },

      while(condition: Expr<BoolType>, body: () => void): void {
        self.emit(`while (${condition.toWGSL()}) {`);
        self.indent++;
        body();
        self.indent--;
        self.emit(`}`);
      },

      switch(value, cases): void {
        self.emit(`switch (${value.toWGSL()}) {`);
        self.indent++;
        for (const c of cases) {
          if (c.case === 'default') {
            self.emit(`default: {`);
          } else {
            self.emit(`case ${c.case}u: {`);
          }
          self.indent++;
          c.body();
          self.indent--;
          self.emit(`}`);
        }
        self.indent--;
        self.emit(`}`);
      },

      return(value?: Expr<any>): void {
        if (value) {
          self.emit(`return ${value.toWGSL()};`);
        } else {
          self.emit(`return;`);
        }
      },

      discard(): void {
        self.emit(`discard;`);
      },

      break(): void {
        self.emit(`break;`);
      },

      continue(): void {
        self.emit(`continue;`);
      },

      builtins,

      raw(code: string): void {
        for (const line of code.split('\n')) {
          if (line.trim()) {
            self.emit(line);
          }
        }
      },
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/** 创建 shader builder */
export function shader(): ShaderBuilder {
  return new ShaderBuilder();
}

/** 创建 vec2 表达式 */
export function makeVec2<T extends ScalarType>(
  elementType: T,
  x: Expr<T> | number,
  y: Expr<T> | number
): VecExpr<Vec2Type<T>> {
  const xCode = typeof x === 'number' ? `${x}` : x.toWGSL();
  const yCode = typeof y === 'number' ? `${y}` : y.toWGSL();
  return new VecExpr(vec2(elementType), `vec2<${elementType.__wgslType}>(${xCode}, ${yCode})`);
}

/** 创建 vec3 表达式 */
export function makeVec3<T extends ScalarType>(
  elementType: T,
  x: Expr<any> | number,
  y: Expr<any> | number,
  z: Expr<any> | number
): VecExpr<Vec3Type<T>> {
  const xCode = typeof x === 'number' ? `${x}` : x.toWGSL();
  const yCode = typeof y === 'number' ? `${y}` : y.toWGSL();
  const zCode = typeof z === 'number' ? `${z}` : z.toWGSL();
  return new VecExpr(vec3(elementType), `vec3<${elementType.__wgslType}>(${xCode}, ${yCode}, ${zCode})`);
}

/** 创建 vec4 表达式 */
export function makeVec4<T extends ScalarType>(
  elementType: T,
  x: Expr<T> | number,
  y: Expr<T> | number,
  z: Expr<T> | number,
  w: Expr<T> | number
): VecExpr<Vec4Type<T>> {
  const xCode = typeof x === 'number' ? `${x}` : x.toWGSL();
  const yCode = typeof y === 'number' ? `${y}` : y.toWGSL();
  const zCode = typeof z === 'number' ? `${z}` : z.toWGSL();
  const wCode = typeof w === 'number' ? `${w}` : w.toWGSL();
  return new VecExpr(vec4(elementType), `vec4<${elementType.__wgslType}>(${xCode}, ${yCode}, ${zCode}, ${wCode})`);
}

/** vec4 from vec2 */
export function vec4FromVec2<T extends ScalarType>(
  xy: Expr<Vec2Type<T>>,
  z: number,
  w: number
): VecExpr<Vec4Type<T>> {
  const elementType = (xy.type as Vec2Type<T>).__elementType;
  return new VecExpr(vec4(elementType), `vec4<${elementType.__wgslType}>(${xy.toWGSL()}, ${z}, ${w})`);
}

/** vec4 from vec3 */
export function vec4FromVec3<T extends ScalarType>(
  xyz: Expr<Vec3Type<T>>,
  w: number
): VecExpr<Vec4Type<T>> {
  const elementType = (xyz.type as Vec3Type<T>).__elementType;
  return new VecExpr(vec4(elementType), `vec4<${elementType.__wgslType}>(${xyz.toWGSL()}, ${w})`);
}
