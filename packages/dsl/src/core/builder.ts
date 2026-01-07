/**
 * Shader Builder - 着色器构建器
 * 
 * 提供声明式的 shader 构建 API
 */

import {
  type WGSLType,
  type ScalarType,
  type NumericScalarType,
  type BoolType,
  type VectorType,
  type StructType,
  type ArrayType,
  type StructFields,
  type SamplerType,
  type SamplerComparisonType,
  type F32Type,
  type U32Type,
  type I32Type,
  type Vec2Type,
  type Vec3Type,
  type Vec4Type,
  bool,
  f32,
  u32,
  vec2,
  vec3,
  vec4,
  struct,
  sampler,
  samplerComparison,
  isVectorType,
  isStructType,
  isArrayType,
} from './types.js';

import {
  BaseExpr,
  BoolExpr,
  NumericExpr,
  IntegerExpr,
  NumericVecExpr,
  BoolVecExpr,
  StructExpr,
  ArrayExpr,
  createExpr,
  type AnyExpr,
} from './expr.js';

import {
  createVar,
  type AnyVar,
} from './var.js';

import * as builtins from './builtins.js';
import { Fn, type FnArg } from './fn.js';

// ============================================================================
// Type Registry
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

export function defineStruct<T extends StructFields>(name: string, fields: T): StructType<T> {
  return globalRegistry.register(name, fields);
}

// ============================================================================
// Shader Context
// ============================================================================

const GetBuilderByContext = Symbol('ShaderBuilder::GetBuilder');

export interface ShaderContext {
  [GetBuilderByContext]: () => ShaderBuilder;
  
  // Variable declarations
  let<T extends WGSLType>(name: string, type: T, value: AnyExpr<T>): AnyVar<T>;
  val<T extends WGSLType>(name: string, value: AnyExpr<T>): AnyVar<T>;
  var<T extends WGSLType>(name: string, type: T, value?: AnyExpr<T>): AnyVar<T>;
  const<T extends WGSLType>(name: string, type: T, value: AnyExpr<T>): AnyVar<T>;

  // Statements
  exec(statement: string): void;

  // Control flow
  if(condition: BoolExpr, then: () => void, otherwise?: () => void): void;
  for<T extends ScalarType>(
    init: { name: string; type: T; start: number },
    condition: (i: AnyExpr<T>) => BoolExpr,
    update: (i: AnyVar<T>) => string,
    body: (i: AnyExpr<T>) => void,
  ): void;
  while(condition: BoolExpr, body: () => void): void;
  switch(
    value: IntegerExpr<U32Type | I32Type>,
    cases: Array<{ case: number | 'default'; body: () => void }>,
  ): void;

  // Statements
  return(value?: AnyExpr<any>): void;
  discard(): void;
  break(): void;
  continue(): void;

  // Builtins
  builtins: typeof builtins;

  // Raw WGSL
  raw(code: string): void;
}

// ============================================================================
// Compute Shader Builtins
// ============================================================================

export interface ComputeBuiltins {
  globalInvocationId: NumericVecExpr<Vec3Type<U32Type>>;
  localInvocationId: NumericVecExpr<Vec3Type<U32Type>>;
  workgroupId: NumericVecExpr<Vec3Type<U32Type>>;
  numWorkgroups: NumericVecExpr<Vec3Type<U32Type>>;
  localInvocationIndex: IntegerExpr<U32Type>;
}

// ============================================================================
// Vertex Shader Types
// ============================================================================

export interface VertexBuiltins {
  vertexIndex: IntegerExpr<U32Type>;
  instanceIndex: IntegerExpr<U32Type>;
}

export interface VertexAttribute {
  location: number;
  type: WGSLType;
}

export interface VertexOutputConfig {
  position: NumericVecExpr<Vec4Type<F32Type>>;
  varyings?: Record<string, { location: number; value: AnyExpr<any> }>;
}

// ============================================================================
// Fragment Shader Types
// ============================================================================

export interface FragmentBuiltins {
  position: NumericVecExpr<Vec4Type<F32Type>>;
  frontFacing: BoolExpr;
  sampleIndex: IntegerExpr<U32Type>;
  sampleMask: IntegerExpr<U32Type>;
}

export interface FragmentInput {
  location: number;
  type: WGSLType;
}

export interface FragmentOutputConfig {
  colors: Array<{ location: number; value: NumericVecExpr<Vec4Type<F32Type>> }>;
  depth?: NumericExpr<F32Type>;
}

// ============================================================================
// Shader Builder
// ============================================================================

export class ShaderBuilder {
  private usedTypes = new Set<string>();
  private bindings: string[] = [];
  private globals: string[] = [];
  private functions: string[] = [];
  private currentLines: string[] = [];
  private indent = 0;

  /** Declare storage buffer binding */
  storage<T extends WGSLType>(
    name: string,
    type: T,
    group: number,
    binding: number,
    access: 'read' | 'read_write' = 'read',
  ): AnyVar<T> {
    this.collectType(type);
    this.bindings.push(
      `@group(${group}) @binding(${binding}) var<storage, ${access}> ${name}: ${type.__wgslType};`,
    );
    return createVar(name, type);
  }

  /** Declare uniform buffer binding */
  uniform<T extends WGSLType>(
    name: string,
    type: T,
    group: number,
    binding: number,
  ): AnyVar<T> {
    this.collectType(type);
    this.bindings.push(
      `@group(${group}) @binding(${binding}) var<uniform> ${name}: ${type.__wgslType};`,
    );
    return createVar(name, type);
  }

  /** Declare texture binding */
  texture<T extends WGSLType>(
    name: string,
    type: T,
    group: number,
    binding: number,
  ): BaseExpr<T> {
    this.collectType(type);
    this.bindings.push(
      `@group(${group}) @binding(${binding}) var ${name}: ${type.__wgslType};`,
    );
    return new BaseExpr(type, name);
  }

  /** Declare sampler binding */
  sampler(name: string, group: number, binding: number): BaseExpr<SamplerType> {
    this.bindings.push(
      `@group(${group}) @binding(${binding}) var ${name}: sampler;`,
    );
    return new BaseExpr(sampler, name);
  }

  /** Declare comparison sampler binding */
  samplerComparison(name: string, group: number, binding: number): BaseExpr<SamplerComparisonType> {
    this.bindings.push(
      `@group(${group}) @binding(${binding}) var ${name}: sampler_comparison;`,
    );
    return new BaseExpr(samplerComparison, name);
  }

  /** Inject custom function into shader */
  injectFn<Args extends FnArg[], Output extends WGSLType | void, Name extends string>(
    fn: Fn<Args, Output, Name>,
  ): this {
    // Save current state
    const prevLines = this.currentLines;
    const prevIndent = this.indent;

    // Create new lines for function
    this.currentLines = [];
    this.indent = 0;

    // Generate function code
    fn.toWGSL(
      (line) => this.emit(line),
      () => this.createContext(),
    );

    // Add to functions list
    this.functions.push(this.currentLines.join('\n'));

    // Restore state
    this.currentLines = prevLines;
    this.indent = prevIndent;

    return this;
  }

  /** Define compute shader entry */
  compute(
    workgroupSize: [number, number?, number?],
    body: (ctx: ShaderContext, builtins: ComputeBuiltins) => void,
  ): this {
    const [x, y = 1, z = 1] = workgroupSize;
    this.currentLines = [];
    this.indent = 0;

    const computeBuiltins: ComputeBuiltins = {
      globalInvocationId: new NumericVecExpr(vec3(u32), 'global_invocation_id'),
      localInvocationId: new NumericVecExpr(vec3(u32), 'local_invocation_id'),
      workgroupId: new NumericVecExpr(vec3(u32), 'workgroup_id'),
      numWorkgroups: new NumericVecExpr(vec3(u32), 'num_workgroups'),
      localInvocationIndex: new IntegerExpr(u32, 'local_invocation_index'),
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

  /** Define vertex shader entry */
  vertex<
    TAttributes extends Record<string, VertexAttribute>,
    TVaryings extends Record<string, { location: number; type: WGSLType }>,
  >(
    config: {
      attributes?: TAttributes;
      varyings?: TVaryings;
    },
    body: (
      ctx: ShaderContext,
      builtins: VertexBuiltins,
      inputs: { [K in keyof TAttributes]: AnyVar<TAttributes[K]['type']> },
    ) => VertexOutputConfig,
  ): this {
    this.currentLines = [];
    this.indent = 0;

    const { attributes = {}, varyings = {} } = config;

    // Generate VertexOutput struct
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

    // Generate function signature
    const params: string[] = [];
    params.push(`@builtin(vertex_index) vertex_index: u32`);
    params.push(`@builtin(instance_index) instance_index: u32`);
    for (const [name, attr] of Object.entries(attributes) as [string, VertexAttribute][]) {
      params.push(`@location(${attr.location}) ${name}: ${attr.type.__wgslType}`);
    }

    this.emit(`@vertex`);
    this.emit(`fn main(`);
    for (let i = 0; i < params.length; i++) {
      this.emit(`  ${params[i]}${i < params.length - 1 ? ',' : ''}`);
    }
    this.emit(`) -> VertexOutput {`);
    this.indent++;

    const vertexBuiltins: VertexBuiltins = {
      vertexIndex: new IntegerExpr(u32, 'vertex_index'),
      instanceIndex: new IntegerExpr(u32, 'instance_index'),
    };

    const inputs: Record<string, any> = {};
    for (const [name, attr] of Object.entries(attributes) as [string, VertexAttribute][]) {
      inputs[name] = createVar(name, attr.type);
    }

    const output = body(this.createContext(), vertexBuiltins, inputs as any);

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

  /** Define fragment shader entry */
  fragment<TInputs extends Record<string, FragmentInput>>(
    config: {
      inputs?: TInputs;
      targets?: number;
    },
    body: (
      ctx: ShaderContext,
      builtins: FragmentBuiltins,
      inputs: { [K in keyof TInputs]: AnyVar<TInputs[K]['type']> },
    ) => FragmentOutputConfig,
  ): this {
    this.currentLines = [];
    this.indent = 0;

    const { inputs: inputConfig = {}, targets = 1 } = config;

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

    this.emit(`struct FragmentOutput {`);
    for (let i = 0; i < targets; i++) {
      this.emit(`  @location(${i}) color${i}: vec4<f32>,`);
    }
    this.emit(`}`);
    this.emit(``);

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

    const fragmentBuiltins: FragmentBuiltins = {
      position: new NumericVecExpr(vec4(f32), hasInputs ? 'input.position' : 'frag_position'),
      frontFacing: new BoolExpr(bool, hasInputs ? 'true' : 'front_facing'),
      sampleIndex: new IntegerExpr(u32, hasInputs ? '0u' : 'sample_index'),
      sampleMask: new IntegerExpr(u32, hasInputs ? '0u' : 'sample_mask'),
    };

    const inputs: Record<string, any> = {};
    for (const [name, inp] of Object.entries(inputConfig) as [string, FragmentInput][]) {
      inputs[name] = createVar(hasInputs ? `input.${name}` : name, inp.type);
    }

    const output = body(this.createContext(), fragmentBuiltins, inputs as any);

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

  /** Build final WGSL code */
  build(): string {
    const parts: string[] = [];

    // Struct definitions
    const structDefs = Array.from(this.usedTypes)
      .map((name) => globalRegistry.get(name))
      .filter((t): t is StructType => t !== undefined)
      .map((t) => globalRegistry.toWGSL(t));

    if (structDefs.length > 0) {
      parts.push(structDefs.join('\n\n'));
    }

    if (this.bindings.length > 0) {
      parts.push(this.bindings.join('\n'));
    }

    if (this.globals.length > 0) {
      parts.push(this.globals.join('\n'));
    }

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

  private createContext(): ShaderContext {
    const self = this;

    return {
      [GetBuilderByContext]: () => self,

      let<T extends WGSLType>(name: string, type: T, value: AnyExpr<T>): AnyVar<T> {
        self.emit(`let ${name}: ${type.__wgslType} = ${value.toWGSL()};`);
        return createVar(name, type, false) as AnyVar<T>;
      },

      val<T extends WGSLType>(name: string, value: AnyExpr<T>): AnyVar<T> {
        const type = value.type;
        self.emit(`let ${name}: ${type.__wgslType} = ${value.toWGSL()};`);
        return createVar(name, type, false) as AnyVar<T>;
      },

      var<T extends WGSLType>(name: string, type: T, value?: AnyExpr<T>): AnyVar<T> {
        const init = value ? ` = ${value.toWGSL()}` : '';
        self.emit(`var ${name}: ${type.__wgslType}${init};`);
        return createVar(name, type, true) as AnyVar<T>;
      },

      const<T extends WGSLType>(name: string, type: T, value: AnyExpr<T>): AnyVar<T> {
        self.emit(`const ${name}: ${type.__wgslType} = ${value.toWGSL()};`);
        return createVar(name, type, false) as AnyVar<T>;
      },

      exec(statement: string): void {
        self.emit(`${statement};`);
      },

      if(condition: BoolExpr, then: () => void, otherwise?: () => void): void {
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
        const iVar = createVar(name, type);
        const iExpr = createExpr(type, name);
        self.emit(
          `for (var ${name}: ${type.__wgslType} = ${start}; ${condition(iExpr).toWGSL()}; ${update(iVar as any)}) {`,
        );
        self.indent++;
        body(iExpr);
        self.indent--;
        self.emit(`}`);
      },

      while(condition: BoolExpr, body: () => void): void {
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

      return(value?: AnyExpr<any>): void {
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

/** Create shader builder */
export function shader(): ShaderBuilder {
  return new ShaderBuilder();
}
