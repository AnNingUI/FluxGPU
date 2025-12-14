/**
 * High-Level GPU Context API
 * 
 * 基于 DSL 的高级封装，极大简化 WebGPU 使用
 */

/// <reference types="@webgpu/types" />

import type { StructType, StructFields, ArrayType, WGSLType } from '@flux/dsl';
import { structSize, calculateStructLayout } from '@flux/dsl';

// ============================================================================
// Types
// ============================================================================

export interface GPUContextConfig {
  canvas: HTMLCanvasElement;
  powerPreference?: 'low-power' | 'high-performance';
}

export interface BufferBinding {
  group: number;
  binding: number;
  buffer: GPUBuffer;
}

export interface ComputePipelineConfig {
  shader: string;
  workgroupSize: [number, number?, number?];
}

export interface RenderPipelineConfig {
  vertex: string;
  fragment: string;
  topology?: GPUPrimitiveTopology;
  blend?: GPUBlendState;
}

// ============================================================================
// GPU Buffer Wrapper
// ============================================================================

export class TypedBuffer<T extends StructType> {
  readonly buffer: GPUBuffer;
  readonly structType: T;
  readonly count: number;
  readonly stride: number;
  
  constructor(
    private device: GPUDevice,
    structType: T,
    count: number,
    usage: GPUBufferUsageFlags
  ) {
    this.structType = structType;
    this.count = count;
    this.stride = structSize(structType);
    
    this.buffer = device.createBuffer({
      size: this.stride * count,
      usage: usage | GPUBufferUsage.COPY_DST,
    });
  }
  
  /** 写入单个元素 */
  write(index: number, data: Partial<StructFieldValues<T['__fields']>>): void {
    const buffer = createStructBuffer(this.structType, data);
    this.device.queue.writeBuffer(this.buffer, index * this.stride, buffer);
  }
  
  /** 写入所有元素 */
  writeAll(data: Array<Partial<StructFieldValues<T['__fields']>>>): void {
    const fullBuffer = new ArrayBuffer(this.stride * data.length);
    const view = new DataView(fullBuffer);
    
    for (let i = 0; i < data.length; i++) {
      const elemBuffer = createStructBuffer(this.structType, data[i]);
      const elemView = new Uint8Array(elemBuffer);
      new Uint8Array(fullBuffer, i * this.stride, this.stride).set(elemView);
    }
    
    this.device.queue.writeBuffer(this.buffer, 0, fullBuffer);
  }
  
  /** 使用 Float32Array 直接写入（高性能） */
  writeRaw(data: Float32Array | Uint32Array | Int32Array): void {
    this.device.queue.writeBuffer(this.buffer, 0, data.buffer, data.byteOffset, data.byteLength);
  }
  
  destroy(): void {
    this.buffer.destroy();
  }
}

// ============================================================================
// Uniform Buffer Wrapper
// ============================================================================

export class UniformBuffer<T extends StructType> {
  readonly buffer: GPUBuffer;
  readonly structType: T;
  readonly size: number;
  private layout: ReturnType<typeof calculateStructLayout>;
  
  constructor(
    private device: GPUDevice,
    structType: T
  ) {
    this.structType = structType;
    this.layout = calculateStructLayout(structType);
    this.size = this.layout.size;
    
    this.buffer = device.createBuffer({
      size: this.size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }
  
  /** 更新 uniform 数据 */
  update(data: Partial<StructFieldValues<T['__fields']>>): void {
    const buffer = createStructBuffer(this.structType, data);
    this.device.queue.writeBuffer(this.buffer, 0, buffer);
  }
  
  destroy(): void {
    this.buffer.destroy();
  }
}

// ============================================================================
// Compute Pass Builder
// ============================================================================

export class ComputePass {
  private pipeline: GPUComputePipeline;
  private bindGroups: Map<number, GPUBindGroup> = new Map();
  
  constructor(
    private device: GPUDevice,
    private shaderCode: string,
    private workgroupSize: [number, number, number]
  ) {
    const module = device.createShaderModule({ code: shaderCode });
    this.pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
  }
  
  /** 绑定资源 */
  bind(group: number, bindings: Array<{ binding: number; resource: GPUBuffer | GPUTextureView | GPUSampler }>): this {
    const entries: GPUBindGroupEntry[] = bindings.map(b => ({
      binding: b.binding,
      resource: b.resource instanceof GPUBuffer ? { buffer: b.resource } : b.resource,
    }));
    
    this.bindGroups.set(group, this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(group),
      entries,
    }));
    
    return this;
  }
  
  /** 执行计算 */
  dispatch(encoder: GPUCommandEncoder, count: number | [number, number?, number?]): void {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    
    for (const [group, bindGroup] of this.bindGroups) {
      pass.setBindGroup(group, bindGroup);
    }
    
    if (typeof count === 'number') {
      pass.dispatchWorkgroups(Math.ceil(count / this.workgroupSize[0]));
    } else {
      const [x, y = 1, z = 1] = count;
      pass.dispatchWorkgroups(
        Math.ceil(x / this.workgroupSize[0]),
        Math.ceil(y / this.workgroupSize[1]),
        Math.ceil(z / this.workgroupSize[2])
      );
    }
    
    pass.end();
  }
}

// ============================================================================
// Render Pass Builder
// ============================================================================

export class RenderPass {
  private pipeline: GPURenderPipeline;
  private bindGroups: Map<number, GPUBindGroup> = new Map();
  
  constructor(
    private device: GPUDevice,
    vertexShader: string,
    fragmentShader: string,
    format: GPUTextureFormat,
    options: {
      topology?: GPUPrimitiveTopology;
      blend?: GPUBlendState;
    } = {}
  ) {
    const vertexModule = device.createShaderModule({ code: vertexShader });
    const fragmentModule = device.createShaderModule({ code: fragmentShader });
    
    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: vertexModule, entryPoint: 'main' },
      fragment: {
        module: fragmentModule,
        entryPoint: 'main',
        targets: [{
          format,
          blend: options.blend ?? {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
          },
        }],
      },
      primitive: { topology: options.topology ?? 'triangle-list' },
    });
  }
  
  /** 绑定资源 */
  bind(group: number, bindings: Array<{ binding: number; resource: GPUBuffer | GPUTextureView | GPUSampler }>): this {
    const entries: GPUBindGroupEntry[] = bindings.map(b => ({
      binding: b.binding,
      resource: b.resource instanceof GPUBuffer ? { buffer: b.resource } : b.resource,
    }));
    
    this.bindGroups.set(group, this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(group),
      entries,
    }));
    
    return this;
  }
  
  /** 执行渲染 */
  draw(
    encoder: GPUCommandEncoder,
    target: GPUTextureView,
    vertexCount: number,
    options: {
      clearColor?: GPUColor;
      instanceCount?: number;
    } = {}
  ): void {
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: target,
        clearValue: options.clearColor ?? { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    
    pass.setPipeline(this.pipeline);
    
    for (const [group, bindGroup] of this.bindGroups) {
      pass.setBindGroup(group, bindGroup);
    }
    
    pass.draw(vertexCount, options.instanceCount ?? 1);
    pass.end();
  }
}


// ============================================================================
// GPU Context - 主入口
// ============================================================================

export class GPUContext {
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;
  readonly canvas: HTMLCanvasElement;
  
  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
    canvas: HTMLCanvasElement
  ) {
    this.device = device;
    this.context = context;
    this.format = format;
    this.canvas = canvas;
  }
  
  /** 初始化 GPU 上下文 */
  static async create(config: GPUContextConfig): Promise<GPUContext> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }
    
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: config.powerPreference,
    });
    
    if (!adapter) {
      throw new Error('Failed to get GPU adapter');
    }
    
    const device = await adapter.requestDevice();
    const context = config.canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    
    context.configure({
      device,
      format,
      alphaMode: 'premultiplied',
    });
    
    return new GPUContext(device, context, format, config.canvas);
  }
  
  // ========== Buffer 创建 ==========
  
  /** 创建类型化的 storage buffer */
  createStorageBuffer<T extends StructType>(
    structType: T,
    count: number,
    options: { readOnly?: boolean } = {}
  ): TypedBuffer<T> {
    const usage = options.readOnly
      ? GPUBufferUsage.STORAGE
      : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC;
    return new TypedBuffer(this.device, structType, count, usage);
  }
  
  /** 创建 uniform buffer */
  createUniformBuffer<T extends StructType>(structType: T): UniformBuffer<T> {
    return new UniformBuffer(this.device, structType);
  }
  
  // ========== Pipeline 创建 ==========
  
  /** 创建计算管线 */
  createComputePass(
    shaderCode: string,
    workgroupSize: [number, number?, number?] = [256]
  ): ComputePass {
    const [x, y = 1, z = 1] = workgroupSize;
    return new ComputePass(this.device, shaderCode, [x, y, z]);
  }
  
  /** 创建渲染管线 */
  createRenderPass(
    vertexShader: string,
    fragmentShader: string,
    options: {
      topology?: GPUPrimitiveTopology;
      blend?: GPUBlendState;
    } = {}
  ): RenderPass {
    return new RenderPass(this.device, vertexShader, fragmentShader, this.format, options);
  }
  
  // ========== 执行 ==========
  
  /** 创建命令编码器 */
  createEncoder(): GPUCommandEncoder {
    return this.device.createCommandEncoder();
  }
  
  /** 提交命令 */
  submit(encoder: GPUCommandEncoder): void {
    this.device.queue.submit([encoder.finish()]);
  }
  
  /** 获取当前帧的渲染目标 */
  getCurrentTexture(): GPUTextureView {
    return this.context.getCurrentTexture().createView();
  }
  
  /** 执行一帧（简化 API） */
  frame(callback: (encoder: GPUCommandEncoder, target: GPUTextureView) => void): void {
    const encoder = this.createEncoder();
    const target = this.getCurrentTexture();
    callback(encoder, target);
    this.submit(encoder);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/** 简化的字段值类型 - 标量用 number，向量/矩阵用 number[] */
type StructFieldValues<T extends StructFields> = {
  [K in keyof T]?: number | number[];
};

function createStructBuffer<T extends StructFields>(
  structType: StructType<T>,
  values: StructFieldValues<T>
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
        }
      }
    }
  }
  
  return buffer;
}
