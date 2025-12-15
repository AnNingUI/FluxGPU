/**
 * @fluxgpu/host-browser - Browser GPU Adapter
 *
 * 实现 IGPUAdapter 接口，直接与 WebGPU API 交互
 * 这是六边形架构中的 Adapter 层实现
 */

/// <reference types="@webgpu/types" />

import type {
  IGPUAdapter,
  IBuffer,
  ITexture,
  ITextureView,
  IShaderModule,
  IComputePipeline,
  IRenderPipeline,
  IBindGroupLayout,
  IBindGroup,
  ICommandEncoder,
  ICommandBuffer,
  IComputePassEncoder,
  IRenderPassEncoder,
  IRenderTarget,
  ISampler,
  BufferDescriptor,
  TextureDescriptor,
  TextureViewDescriptor,
  ComputePipelineDescriptor,
  RenderPipelineDescriptor,
  ComputePassDescriptor,
  RenderPassDescriptor,
  BindGroupDescriptor,
  SamplerDescriptor,
  GPUTextureFormatType,
  ColorValue,
  TextureSize,
  ImageCopyTexture,
} from '@fluxgpu/contracts';
import type { ResourceId } from '@fluxgpu/contracts';
import { InitializationError, RuntimeError } from '@fluxgpu/contracts';

// ============================================================================
// ID 生成器
// ============================================================================

let resourceIdCounter = 0;
function generateResourceId(): ResourceId {
  return `res_${++resourceIdCounter}` as ResourceId;
}

// ============================================================================
// Browser GPU Adapter 配置
// ============================================================================

export interface BrowserGPUAdapterConfig {
  /** Canvas 元素（可选，用于渲染） */
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  /** 电源偏好 */
  powerPreference?: 'low-power' | 'high-performance';
  /** 是否强制回退适配器 */
  forceFallbackAdapter?: boolean;
  /** 需要的特性 */
  requiredFeatures?: GPUFeatureName[];
  /** 需要的限制 */
  requiredLimits?: Record<string, number>;
}

// ============================================================================
// Browser GPU Adapter 实现
// ============================================================================

/**
 * BrowserGPUAdapter - 浏览器环境的 GPU 适配器
 *
 * 直接实现 IGPUAdapter 接口，与 WebGPU API 交互
 */
export class BrowserGPUAdapter implements IGPUAdapter {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private context: GPUCanvasContext | null = null;
  private preferredFormat: GPUTextureFormatType = 'bgra8unorm';
  private initialized = false;
  private renderTarget: BrowserRenderTarget | null = null;

  constructor(private config: BrowserGPUAdapterConfig = {}) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 检查 WebGPU 支持
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      throw new InitializationError('WebGPU is not supported in this environment', {
        hasNavigator: typeof navigator !== 'undefined',
        hasGPU: typeof navigator !== 'undefined' && 'gpu' in navigator,
      });
    }

    // 请求适配器
    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: this.config.powerPreference,
      forceFallbackAdapter: this.config.forceFallbackAdapter,
    });

    if (!this.adapter) {
      throw new InitializationError('Failed to get GPU adapter', {
        powerPreference: this.config.powerPreference,
      });
    }

    // 请求设备
    this.device = await this.adapter.requestDevice({
      requiredFeatures: this.config.requiredFeatures,
      requiredLimits: this.config.requiredLimits,
    });

    // 获取首选格式
    this.preferredFormat = navigator.gpu.getPreferredCanvasFormat() as GPUTextureFormatType;

    // 如果提供了 canvas，配置上下文
    if (this.config.canvas) {
      this.context = this.config.canvas.getContext('webgpu') as GPUCanvasContext;
      if (this.context) {
        this.context.configure({
          device: this.device,
          format: this.preferredFormat,
          alphaMode: 'premultiplied',
        });
        this.renderTarget = new BrowserRenderTarget(this.context, this.preferredFormat);
      }
    }

    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getPreferredFormat(): GPUTextureFormatType {
    return this.preferredFormat;
  }

  supportsFeature(feature: string): boolean {
    if (!this.adapter) {
      return false;
    }
    return this.adapter.features.has(feature as GPUFeatureName);
  }

  createBuffer(descriptor: BufferDescriptor): IBuffer {
    this.ensureInitialized();
    const gpuBuffer = this.device!.createBuffer({
      size: descriptor.size,
      usage: descriptor.usage,
      mappedAtCreation: descriptor.mappedAtCreation,
      label: descriptor.label,
    });
    return new BrowserBuffer(generateResourceId(), gpuBuffer, descriptor);
  }

  createTexture(descriptor: TextureDescriptor): ITexture {
    this.ensureInitialized();
    const gpuTexture = this.device!.createTexture({
      size: descriptor.size,
      format: descriptor.format,
      usage: descriptor.usage,
      dimension: descriptor.dimension,
      mipLevelCount: descriptor.mipLevelCount,
      sampleCount: descriptor.sampleCount,
      label: descriptor.label,
    });
    return new BrowserTexture(generateResourceId(), gpuTexture, descriptor);
  }

  createShaderModule(code: string): IShaderModule {
    this.ensureInitialized();
    const gpuModule = this.device!.createShaderModule({ code });
    return new BrowserShaderModule(generateResourceId(), gpuModule);
  }

  async createComputePipeline(descriptor: ComputePipelineDescriptor): Promise<IComputePipeline> {
    this.ensureInitialized();
    const shaderModule = (descriptor.shader as BrowserShaderModule).gpuModule;
    const gpuPipeline = await this.device!.createComputePipelineAsync({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: descriptor.entryPoint ?? 'main',
        constants: descriptor.constants,
      },
      label: descriptor.label,
    });
    return new BrowserComputePipeline(generateResourceId(), gpuPipeline, descriptor.label);
  }

  async createRenderPipeline(descriptor: RenderPipelineDescriptor): Promise<IRenderPipeline> {
    this.ensureInitialized();
    const vertexModule = (descriptor.vertex.shader as BrowserShaderModule).gpuModule;
    const fragmentModule = descriptor.fragment
      ? (descriptor.fragment.shader as BrowserShaderModule).gpuModule
      : undefined;

    const gpuDescriptor: GPURenderPipelineDescriptor = {
      layout: 'auto',
      vertex: {
        module: vertexModule,
        entryPoint: descriptor.vertex.entryPoint ?? 'main',
        buffers: descriptor.vertex.buffers?.map((b) => ({
          arrayStride: b.arrayStride,
          stepMode: b.stepMode,
          attributes: b.attributes.map((a) => ({
            format: a.format as GPUVertexFormat,
            offset: a.offset,
            shaderLocation: a.shaderLocation,
          })),
        })),
      },
      primitive: descriptor.primitive
        ? {
            topology: descriptor.primitive.topology as GPUPrimitiveTopology,
            stripIndexFormat: descriptor.primitive.stripIndexFormat as GPUIndexFormat,
            frontFace: descriptor.primitive.frontFace as GPUFrontFace,
            cullMode: descriptor.primitive.cullMode as GPUCullMode,
          }
        : undefined,
      label: descriptor.label,
    };

    if (descriptor.fragment && fragmentModule) {
      gpuDescriptor.fragment = {
        module: fragmentModule,
        entryPoint: descriptor.fragment.entryPoint ?? 'main',
        targets: descriptor.fragment.targets.map((t) => ({
          format: t.format as GPUTextureFormat,
          blend: t.blend
            ? {
                color: {
                  operation: t.blend.color.operation as GPUBlendOperation,
                  srcFactor: t.blend.color.srcFactor as GPUBlendFactor,
                  dstFactor: t.blend.color.dstFactor as GPUBlendFactor,
                },
                alpha: {
                  operation: t.blend.alpha.operation as GPUBlendOperation,
                  srcFactor: t.blend.alpha.srcFactor as GPUBlendFactor,
                  dstFactor: t.blend.alpha.dstFactor as GPUBlendFactor,
                },
              }
            : undefined,
          writeMask: t.writeMask,
        })),
      };
    }

    const gpuPipeline = await this.device!.createRenderPipelineAsync(gpuDescriptor);
    return new BrowserRenderPipeline(generateResourceId(), gpuPipeline, descriptor.label);
  }

  createCommandEncoder(): ICommandEncoder {
    this.ensureInitialized();
    const gpuEncoder = this.device!.createCommandEncoder();
    return new BrowserCommandEncoder(generateResourceId(), gpuEncoder, this.device!);
  }

  submit(commandBuffers: ICommandBuffer[]): void {
    this.ensureInitialized();
    const gpuBuffers = commandBuffers.map((cb) => (cb as BrowserCommandBuffer).gpuBuffer);
    this.device!.queue.submit(gpuBuffers);
  }

  writeBuffer(buffer: IBuffer, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    this.ensureInitialized();
    const gpuBuffer = (buffer as BrowserBuffer).gpuBuffer;
    if (data instanceof ArrayBuffer) {
      this.device!.queue.writeBuffer(gpuBuffer, offset, data);
    } else {
      this.device!.queue.writeBuffer(gpuBuffer, offset, data.buffer, data.byteOffset, data.byteLength);
    }
  }

  async readBuffer(buffer: IBuffer): Promise<ArrayBuffer> {
    this.ensureInitialized();
    const gpuBuffer = (buffer as BrowserBuffer).gpuBuffer;

    // 创建一个用于读取的 staging buffer
    const stagingBuffer = this.device!.createBuffer({
      size: buffer.size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // 复制数据到 staging buffer
    const encoder = this.device!.createCommandEncoder();
    encoder.copyBufferToBuffer(gpuBuffer, 0, stagingBuffer, 0, buffer.size);
    this.device!.queue.submit([encoder.finish()]);

    // 映射并读取
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const data = stagingBuffer.getMappedRange().slice(0);
    stagingBuffer.unmap();
    stagingBuffer.destroy();

    return data;
  }

  getRenderTarget(): IRenderTarget | null {
    return this.renderTarget;
  }

  createBindGroup(descriptor: BindGroupDescriptor): IBindGroup {
    this.ensureInitialized();
    const layout = (descriptor.layout as BrowserBindGroupLayout).gpuLayout;
    const entries: GPUBindGroupEntry[] = descriptor.entries.map((e) => {
      let resource: GPUBindingResource;
      if ('buffer' in e.resource) {
        resource = {
          buffer: (e.resource.buffer as BrowserBuffer).gpuBuffer,
          offset: e.resource.offset,
          size: e.resource.size,
        };
      } else if ('texture' in (e.resource as ITextureView)) {
        resource = (e.resource as BrowserTextureView).gpuView;
      } else {
        resource = (e.resource as BrowserSampler).gpuSampler;
      }
      return { binding: e.binding, resource };
    });

    const gpuBindGroup = this.device!.createBindGroup({
      layout,
      entries,
      label: descriptor.label,
    });
    return new BrowserBindGroup(generateResourceId(), gpuBindGroup);
  }

  createSampler(descriptor: SamplerDescriptor = {}): ISampler {
    this.ensureInitialized();
    const gpuSampler = this.device!.createSampler({
      addressModeU: descriptor.addressModeU as GPUAddressMode,
      addressModeV: descriptor.addressModeV as GPUAddressMode,
      addressModeW: descriptor.addressModeW as GPUAddressMode,
      magFilter: descriptor.magFilter as GPUFilterMode,
      minFilter: descriptor.minFilter as GPUFilterMode,
      mipmapFilter: descriptor.mipmapFilter as GPUMipmapFilterMode,
      lodMinClamp: descriptor.lodMinClamp,
      lodMaxClamp: descriptor.lodMaxClamp,
      compare: descriptor.compare as GPUCompareFunction,
      maxAnisotropy: descriptor.maxAnisotropy,
      label: descriptor.label,
    });
    return new BrowserSampler(generateResourceId(), gpuSampler);
  }

  dispose(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.context = null;
    this.renderTarget = null;
    this.initialized = false;
  }

  // 内部方法：获取原生设备（高级用例）
  getNativeDevice(): GPUDevice | null {
    return this.device;
  }

  getNativeAdapter(): GPUAdapter | null {
    return this.adapter;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.device) {
      throw new RuntimeError('BrowserGPUAdapter is not initialized', {
        initialized: this.initialized,
        hasDevice: !!this.device,
      });
    }
  }
}


// ============================================================================
// Browser 资源包装类
// ============================================================================

/** Browser Buffer 实现 */
class BrowserBuffer implements IBuffer {
  constructor(
    readonly id: ResourceId,
    readonly gpuBuffer: GPUBuffer,
    private descriptor: BufferDescriptor
  ) {}

  get size(): number {
    return this.descriptor.size;
  }

  get usage(): number {
    return this.descriptor.usage;
  }

  get label(): string | undefined {
    return this.descriptor.label;
  }

  destroy(): void {
    this.gpuBuffer.destroy();
  }
}

/** Browser Texture 实现 */
class BrowserTexture implements ITexture {
  readonly width: number;
  readonly height: number;
  readonly format: GPUTextureFormatType;
  readonly usage: number;
  readonly label?: string;

  constructor(
    readonly id: ResourceId,
    readonly gpuTexture: GPUTexture,
    descriptor: TextureDescriptor
  ) {
    this.width = descriptor.size.width;
    this.height = descriptor.size.height ?? 1;
    this.format = descriptor.format;
    this.usage = descriptor.usage;
    this.label = descriptor.label;
  }

  createView(viewDescriptor?: TextureViewDescriptor): ITextureView {
    const gpuView = this.gpuTexture.createView(
      viewDescriptor
        ? {
            format: viewDescriptor.format as GPUTextureFormat,
            dimension: viewDescriptor.dimension as GPUTextureViewDimension,
            aspect: viewDescriptor.aspect as GPUTextureAspect,
            baseMipLevel: viewDescriptor.baseMipLevel,
            mipLevelCount: viewDescriptor.mipLevelCount,
            baseArrayLayer: viewDescriptor.baseArrayLayer,
            arrayLayerCount: viewDescriptor.arrayLayerCount,
          }
        : undefined
    );
    return new BrowserTextureView(generateResourceId(), gpuView, this);
  }

  destroy(): void {
    this.gpuTexture.destroy();
  }
}

/** Browser TextureView 实现 */
class BrowserTextureView implements ITextureView {
  readonly texture: ITexture;

  constructor(
    readonly id: ResourceId,
    readonly gpuView: GPUTextureView,
    texture: BrowserTexture
  ) {
    this.texture = texture;
  }
}

/** Browser ShaderModule 实现 */
class BrowserShaderModule implements IShaderModule {
  constructor(
    readonly id: ResourceId,
    readonly gpuModule: GPUShaderModule,
    readonly label?: string
  ) {}
}

/** Browser ComputePipeline 实现 */
class BrowserComputePipeline implements IComputePipeline {
  constructor(
    readonly id: ResourceId,
    readonly gpuPipeline: GPUComputePipeline,
    readonly label?: string
  ) {}

  getBindGroupLayout(index: number): IBindGroupLayout {
    const gpuLayout = this.gpuPipeline.getBindGroupLayout(index);
    return new BrowserBindGroupLayout(generateResourceId(), gpuLayout);
  }
}

/** Browser RenderPipeline 实现 */
class BrowserRenderPipeline implements IRenderPipeline {
  constructor(
    readonly id: ResourceId,
    readonly gpuPipeline: GPURenderPipeline,
    readonly label?: string
  ) {}

  getBindGroupLayout(index: number): IBindGroupLayout {
    const gpuLayout = this.gpuPipeline.getBindGroupLayout(index);
    return new BrowserBindGroupLayout(generateResourceId(), gpuLayout);
  }
}

/** Browser BindGroupLayout 实现 */
class BrowserBindGroupLayout implements IBindGroupLayout {
  constructor(
    readonly id: ResourceId,
    readonly gpuLayout: GPUBindGroupLayout
  ) {}
}

/** Browser BindGroup 实现 */
class BrowserBindGroup implements IBindGroup {
  constructor(
    readonly id: ResourceId,
    readonly gpuBindGroup: GPUBindGroup
  ) {}
}

/** Browser Sampler 实现 */
class BrowserSampler implements ISampler {
  constructor(
    readonly id: ResourceId,
    readonly gpuSampler: GPUSampler
  ) {}
}

/** Browser CommandBuffer 实现 */
class BrowserCommandBuffer implements ICommandBuffer {
  constructor(
    readonly id: ResourceId,
    readonly gpuBuffer: GPUCommandBuffer,
    readonly label?: string
  ) {}
}

// ============================================================================
// Browser 命令编码器
// ============================================================================

/** Browser CommandEncoder 实现 */
class BrowserCommandEncoder implements ICommandEncoder {
  constructor(
    readonly id: ResourceId,
    private gpuEncoder: GPUCommandEncoder,
    private device: GPUDevice
  ) {}

  beginComputePass(descriptor?: ComputePassDescriptor): IComputePassEncoder {
    const gpuPass = this.gpuEncoder.beginComputePass({
      label: descriptor?.label,
    });
    return new BrowserComputePassEncoder(gpuPass);
  }

  beginRenderPass(descriptor: RenderPassDescriptor): IRenderPassEncoder {
    const colorAttachments: GPURenderPassColorAttachment[] = descriptor.colorAttachments
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .map((a) => ({
        view: ((a.view as unknown) as BrowserTextureView).gpuView,
        resolveTarget: a.resolveTarget ? ((a.resolveTarget as unknown) as BrowserTextureView).gpuView : undefined,
        clearValue: a.clearValue,
        loadOp: a.loadOp,
        storeOp: a.storeOp,
      }));

    const gpuDescriptor: GPURenderPassDescriptor = {
      colorAttachments,
      label: descriptor.label,
    };

    if (descriptor.depthStencilAttachment) {
      const ds = descriptor.depthStencilAttachment;
      gpuDescriptor.depthStencilAttachment = {
        view: ((ds.view as unknown) as BrowserTextureView).gpuView,
        depthClearValue: ds.depthClearValue,
        depthLoadOp: ds.depthLoadOp,
        depthStoreOp: ds.depthStoreOp,
        depthReadOnly: ds.depthReadOnly,
        stencilClearValue: ds.stencilClearValue,
        stencilLoadOp: ds.stencilLoadOp,
        stencilStoreOp: ds.stencilStoreOp,
        stencilReadOnly: ds.stencilReadOnly,
      };
    }

    const gpuPass = this.gpuEncoder.beginRenderPass(gpuDescriptor);
    return new BrowserRenderPassEncoder(gpuPass);
  }

  copyBufferToBuffer(
    source: IBuffer,
    sourceOffset: number,
    destination: IBuffer,
    destinationOffset: number,
    size: number
  ): void {
    this.gpuEncoder.copyBufferToBuffer(
      (source as BrowserBuffer).gpuBuffer,
      sourceOffset,
      (destination as BrowserBuffer).gpuBuffer,
      destinationOffset,
      size
    );
  }

  copyTextureToTexture(
    source: ImageCopyTexture,
    destination: ImageCopyTexture,
    copySize: TextureSize
  ): void {
    this.gpuEncoder.copyTextureToTexture(
      {
        texture: (source.texture as BrowserTexture).gpuTexture,
        mipLevel: source.mipLevel,
        origin: source.origin,
        aspect: source.aspect as GPUTextureAspect,
      },
      {
        texture: (destination.texture as BrowserTexture).gpuTexture,
        mipLevel: destination.mipLevel,
        origin: destination.origin,
        aspect: destination.aspect as GPUTextureAspect,
      },
      copySize
    );
  }

  finish(): ICommandBuffer {
    const gpuBuffer = this.gpuEncoder.finish();
    return new BrowserCommandBuffer(generateResourceId(), gpuBuffer);
  }
}

/** Browser ComputePassEncoder 实现 */
class BrowserComputePassEncoder implements IComputePassEncoder {
  constructor(private gpuPass: GPUComputePassEncoder) {}

  setPipeline(pipeline: IComputePipeline): void {
    this.gpuPass.setPipeline((pipeline as BrowserComputePipeline).gpuPipeline);
  }

  setBindGroup(index: number, bindGroup: IBindGroup, dynamicOffsets?: number[]): void {
    this.gpuPass.setBindGroup(index, (bindGroup as BrowserBindGroup).gpuBindGroup, dynamicOffsets);
  }

  dispatchWorkgroups(x: number, y?: number, z?: number): void {
    this.gpuPass.dispatchWorkgroups(x, y, z);
  }

  dispatchWorkgroupsIndirect(indirectBuffer: IBuffer, indirectOffset: number): void {
    this.gpuPass.dispatchWorkgroupsIndirect((indirectBuffer as BrowserBuffer).gpuBuffer, indirectOffset);
  }

  end(): void {
    this.gpuPass.end();
  }
}

/** Browser RenderPassEncoder 实现 */
class BrowserRenderPassEncoder implements IRenderPassEncoder {
  constructor(private gpuPass: GPURenderPassEncoder) {}

  setPipeline(pipeline: IRenderPipeline): void {
    this.gpuPass.setPipeline((pipeline as BrowserRenderPipeline).gpuPipeline);
  }

  setBindGroup(index: number, bindGroup: IBindGroup, dynamicOffsets?: number[]): void {
    this.gpuPass.setBindGroup(index, (bindGroup as BrowserBindGroup).gpuBindGroup, dynamicOffsets);
  }

  setVertexBuffer(slot: number, buffer: IBuffer, offset?: number, size?: number): void {
    this.gpuPass.setVertexBuffer(slot, (buffer as BrowserBuffer).gpuBuffer, offset, size);
  }

  setIndexBuffer(buffer: IBuffer, indexFormat: 'uint16' | 'uint32', offset?: number, size?: number): void {
    this.gpuPass.setIndexBuffer((buffer as BrowserBuffer).gpuBuffer, indexFormat, offset, size);
  }

  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void {
    this.gpuPass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
  }

  drawIndexed(
    indexCount: number,
    instanceCount?: number,
    firstIndex?: number,
    baseVertex?: number,
    firstInstance?: number
  ): void {
    this.gpuPass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
  }

  drawIndirect(indirectBuffer: IBuffer, indirectOffset: number): void {
    this.gpuPass.drawIndirect((indirectBuffer as BrowserBuffer).gpuBuffer, indirectOffset);
  }

  drawIndexedIndirect(indirectBuffer: IBuffer, indirectOffset: number): void {
    this.gpuPass.drawIndexedIndirect((indirectBuffer as BrowserBuffer).gpuBuffer, indirectOffset);
  }

  setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): void {
    this.gpuPass.setViewport(x, y, width, height, minDepth, maxDepth);
  }

  setScissorRect(x: number, y: number, width: number, height: number): void {
    this.gpuPass.setScissorRect(x, y, width, height);
  }

  setBlendConstant(color: ColorValue): void {
    this.gpuPass.setBlendConstant(color);
  }

  setStencilReference(reference: number): void {
    this.gpuPass.setStencilReference(reference);
  }

  end(): void {
    this.gpuPass.end();
  }
}

// ============================================================================
// Browser 渲染目标
// ============================================================================

/** Browser RenderTarget 实现 */
class BrowserRenderTarget implements IRenderTarget {
  constructor(
    private context: GPUCanvasContext,
    private format: GPUTextureFormatType
  ) {}

  getCurrentTexture(): ITexture {
    const gpuTexture = this.context.getCurrentTexture();
    return new BrowserTexture(generateResourceId(), gpuTexture, {
      size: { width: gpuTexture.width, height: gpuTexture.height },
      format: this.format,
      usage: gpuTexture.usage,
    });
  }

  getPreferredFormat(): GPUTextureFormatType {
    return this.format;
  }

  getSize(): { width: number; height: number } {
    const texture = this.context.getCurrentTexture();
    return { width: texture.width, height: texture.height };
  }

  configure(config: { format?: GPUTextureFormatType; usage?: number; alphaMode?: 'opaque' | 'premultiplied' }): void {
    // 注意：重新配置需要设备引用，这里简化处理
    // 实际使用中应该在 BrowserGPUAdapter 中处理
  }
}
