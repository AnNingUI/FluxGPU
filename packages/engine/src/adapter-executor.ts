/**
 * @fluxgpu/engine - Adapter-based Executor
 *
 * 基于 IGPUAdapter 的执行器，与具体环境解耦
 * 这是六边形架构中 Domain 层的一部分
 */

import type {
  IGPUAdapter,
  IBuffer,
  ITexture,
  IShaderModule,
  IComputePipeline,
  IRenderPipeline,
  ICommandEncoder,
  ISampler,
  BufferDescriptor,
  TextureDescriptor,
  ComputePipelineDescriptor,
  RenderPipelineDescriptor,
  SamplerDescriptor,
  BindGroupDescriptor,
  ImageDataLayout,
  TextureSize,
  ImageCopyTexture,
  GPUTextureFormatType,
  ResourceId,
  IBindGroup,
} from '@fluxgpu/contracts';
import { NotInitializedError } from '@fluxgpu/contracts';

// ============================================================================
// Executor 配置
// ============================================================================

export interface AdapterExecutorConfig {
  /** GPU 适配器 - 依赖注入 */
  adapter: IGPUAdapter;
}

// ============================================================================
// 资源管理
// ============================================================================

interface ManagedResource {
  type: 'buffer' | 'texture' | 'shader' | 'computePipeline' | 'renderPipeline' | 'bindGroup' | 'sampler';
  resource: IBuffer | ITexture | IShaderModule | IComputePipeline | IRenderPipeline | IBindGroup | ISampler;
}

// ============================================================================
// Adapter Executor
// ============================================================================

/**
 * AdapterExecutor - 基于适配器的执行器
 *
 * 特点：
 * - 依赖 IGPUAdapter 接口，不直接使用 WebGPU API
 * - 可在任何实现了 IGPUAdapter 的环境中运行
 * - 管理资源生命周期
 */
export class AdapterExecutor {
  private adapter: IGPUAdapter;
  private resources: Map<ResourceId, ManagedResource> = new Map();
  private initialized = false;

  constructor(config: AdapterExecutorConfig) {
    this.adapter = config.adapter;
  }

  /**
   * 初始化执行器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.adapter.isInitialized()) {
      await this.adapter.initialize();
    }

    this.initialized = true;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取首选纹理格式
   */
  getPreferredFormat(): GPUTextureFormatType {
    this.ensureInitialized();
    return this.adapter.getPreferredFormat();
  }

  /**
   * 检查特性支持
   */
  supportsFeature(feature: string): boolean {
    return this.adapter.supportsFeature(feature);
  }

  // ========== 资源创建 ==========

  /**
   * 创建 Buffer
   */
  createBuffer(descriptor: BufferDescriptor): IBuffer {
    this.ensureInitialized();
    const buffer = this.adapter.createBuffer(descriptor);
    this.resources.set(buffer.id, { type: 'buffer', resource: buffer });
    return buffer;
  }

  /**
   * 创建 Texture
   */
  createTexture(descriptor: TextureDescriptor): ITexture {
    this.ensureInitialized();
    const texture = this.adapter.createTexture(descriptor);
    this.resources.set(texture.id, { type: 'texture', resource: texture });
    return texture;
  }

  /**
   * 创建 Shader Module
   */
  createShaderModule(code: string): IShaderModule {
    this.ensureInitialized();
    const shader = this.adapter.createShaderModule(code);
    this.resources.set(shader.id, { type: 'shader', resource: shader });
    return shader;
  }

  /**
   * 创建 Compute Pipeline
   */
  async createComputePipeline(descriptor: ComputePipelineDescriptor): Promise<IComputePipeline> {
    this.ensureInitialized();
    const pipeline = await this.adapter.createComputePipeline(descriptor);
    this.resources.set(pipeline.id, { type: 'computePipeline', resource: pipeline });
    return pipeline;
  }

  /**
   * 创建 Render Pipeline
   */
  async createRenderPipeline(descriptor: RenderPipelineDescriptor): Promise<IRenderPipeline> {
    this.ensureInitialized();
    const pipeline = await this.adapter.createRenderPipeline(descriptor);
    this.resources.set(pipeline.id, { type: 'renderPipeline', resource: pipeline });
    return pipeline;
  }

  // ========== 数据操作 ==========

  /**
   * 写入 Buffer 数据
   */
  writeBuffer(buffer: IBuffer, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    this.ensureInitialized();
    this.adapter.writeBuffer(buffer, data, offset);
  }

  /**
   * 读取 Buffer 数据
   */
  async readBuffer(buffer: IBuffer): Promise<ArrayBuffer> {
    this.ensureInitialized();
    return this.adapter.readBuffer(buffer);
  }

  /**
   * 写入 Texture 数据
   */
  writeTexture(
    destination: ImageCopyTexture,
    data: ArrayBuffer | ArrayBufferView,
    dataLayout: ImageDataLayout,
    size: TextureSize
  ): void {
    this.ensureInitialized();
    this.adapter.writeTexture(destination, data, dataLayout, size);
  }

  /**
   * 创建 Sampler
   */
  createSampler(descriptor: SamplerDescriptor = {}): ISampler {
    this.ensureInitialized();
    const sampler = this.adapter.createSampler(descriptor);
    return sampler;
  }

  /**
   * 创建 BindGroup
   */
  createBindGroup(descriptor: BindGroupDescriptor): IBindGroup {
    this.ensureInitialized();
    const bindGroup = this.adapter.createBindGroup(descriptor);
    this.resources.set(bindGroup.id, { type: 'bindGroup', resource: bindGroup });
    return bindGroup;
  }

  // ========== 命令执行 ==========

  /**
   * 创建命令编码器
   */
  createCommandEncoder(): ICommandEncoder {
    this.ensureInitialized();
    return this.adapter.createCommandEncoder();
  }

  /**
   * 提交命令
   */
  submit(encoder: ICommandEncoder): void {
    this.ensureInitialized();
    const commandBuffer = encoder.finish();
    this.adapter.submit([commandBuffer]);
  }

  /**
   * 执行一帧渲染
   */
  frame(callback: (encoder: ICommandEncoder) => void): void {
    this.ensureInitialized();
    const encoder = this.createCommandEncoder();
    callback(encoder);
    this.submit(encoder);
  }

  // ========== 渲染目标 ==========

  /**
   * 获取当前渲染目标的纹理
   */
  getCurrentTexture(): ITexture | null {
    this.ensureInitialized();
    const target = this.adapter.getRenderTarget();
    return target?.getCurrentTexture() ?? null;
  }

  // ========== 资源管理 ==========

  /**
   * 获取资源
   */
  getResource(id: ResourceId): ManagedResource | undefined {
    return this.resources.get(id);
  }

  /**
   * 销毁资源
   */
  destroyResource(id: ResourceId): boolean {
    const managed = this.resources.get(id);
    if (!managed) {
      return false;
    }

    const resource = managed.resource;
    if ('destroy' in resource && typeof resource.destroy === 'function') {
      resource.destroy();
    }

    this.resources.delete(id);
    return true;
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    for (const [id] of this.resources) {
      this.destroyResource(id);
    }
    this.resources.clear();
    this.adapter.dispose();
    this.initialized = false;
  }

  // ========== 内部方法 ==========

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new NotInitializedError('AdapterExecutor', {
        initialized: this.initialized,
        adapterInitialized: this.adapter.isInitialized(),
      });
    }
  }

  /**
   * 获取底层适配器（高级用例）
   */
  getAdapter(): IGPUAdapter {
    return this.adapter;
  }
}
