/**
 * @fluxgpu/contracts - Port Interfaces
 *
 * 六边形架构的核心端口定义
 * Domain 层通过这些接口与外部世界交互，实现环境无关
 */

import type { ResourceId } from './types.js';

// ============================================================================
// GPU Adapter Port - 核心适配器接口
// ============================================================================

/**
 * GPU 设备适配器接口 - 所有环境必须实现
 * 这是核心的 Port，Domain 层通过它与外部世界交互
 */
export interface IGPUAdapter {
  /** 初始化适配器 */
  initialize(): Promise<void>;

  /** 检查是否已初始化 */
  isInitialized(): boolean;

  /** 获取首选纹理格式 */
  getPreferredFormat(): GPUTextureFormatType;

  /** 检查是否支持某特性 */
  supportsFeature(feature: string): boolean;

  /** 创建 Buffer */
  createBuffer(descriptor: BufferDescriptor): IBuffer;

  /** 创建 Texture */
  createTexture(descriptor: TextureDescriptor): ITexture;

  /** 创建 Shader Module */
  createShaderModule(code: string): IShaderModule;

  /** 创建 Compute Pipeline */
  createComputePipeline(descriptor: ComputePipelineDescriptor): Promise<IComputePipeline>;

  /** 创建 Render Pipeline */
  createRenderPipeline(descriptor: RenderPipelineDescriptor): Promise<IRenderPipeline>;

  /** 创建命令编码器 */
  createCommandEncoder(): ICommandEncoder;

  /** 提交命令 */
  submit(commandBuffers: ICommandBuffer[]): void;

  /** 写入 Buffer 数据 */
  writeBuffer(buffer: IBuffer, data: ArrayBuffer | ArrayBufferView, offset?: number): void;

  /** 读取 Buffer 数据 */
  readBuffer(buffer: IBuffer): Promise<ArrayBuffer>;

  /** 写入 Texture 数据 */
  writeTexture(
    destination: ImageCopyTexture,
    data: ArrayBuffer | ArrayBufferView,
    dataLayout: ImageDataLayout,
    size: TextureSize
  ): void;

  /** 获取渲染目标（如果有） */
  getRenderTarget(): IRenderTarget | null;

  /** 创建 BindGroup */
  createBindGroup(descriptor: BindGroupDescriptor): IBindGroup;

  /** 创建 Sampler */
  createSampler(descriptor?: SamplerDescriptor): ISampler;

  /** 清理资源 */
  dispose(): void;
}

// ============================================================================
// 资源描述符
// ============================================================================

/** Buffer 使用标志 */
export enum BufferUsage {
  MAP_READ = 0x0001,
  MAP_WRITE = 0x0002,
  COPY_SRC = 0x0004,
  COPY_DST = 0x0008,
  INDEX = 0x0010,
  VERTEX = 0x0020,
  UNIFORM = 0x0040,
  STORAGE = 0x0080,
  INDIRECT = 0x0100,
  QUERY_RESOLVE = 0x0200,
}

/** Texture 使用标志 */
export enum TextureUsage {
  COPY_SRC = 0x01,
  COPY_DST = 0x02,
  TEXTURE_BINDING = 0x04,
  STORAGE_BINDING = 0x08,
  RENDER_ATTACHMENT = 0x10,
}

/** Buffer 描述符 */
export interface BufferDescriptor {
  size: number;
  usage: number;
  mappedAtCreation?: boolean;
  label?: string;
}

/** Texture 描述符 */
export interface TextureDescriptor {
  size: TextureSize;
  format: GPUTextureFormatType;
  usage: number;
  dimension?: '1d' | '2d' | '3d';
  mipLevelCount?: number;
  sampleCount?: number;
  label?: string;
}

export interface TextureSize {
  width: number;
  height?: number;
  depthOrArrayLayers?: number;
}

/** Compute Pipeline 描述符 */
export interface ComputePipelineDescriptor {
  shader: IShaderModule;
  entryPoint?: string;
  constants?: Record<string, number>;
  label?: string;
}

/** Render Pipeline 描述符 */
export interface RenderPipelineDescriptor {
  vertex: {
    shader: IShaderModule;
    entryPoint?: string;
    buffers?: VertexBufferLayout[];
  };
  fragment?: {
    shader: IShaderModule;
    entryPoint?: string;
    targets: ColorTargetState[];
  };
  primitive?: PrimitiveState;
  depthStencil?: DepthStencilState;
  multisample?: MultisampleState;
  label?: string;
}

export interface VertexBufferLayout {
  arrayStride: number;
  stepMode?: 'vertex' | 'instance';
  attributes: VertexAttribute[];
}

export interface VertexAttribute {
  format: VertexFormatType;
  offset: number;
  shaderLocation: number;
}

export interface ColorTargetState {
  format: GPUTextureFormatType;
  blend?: BlendState;
  writeMask?: number;
}

export interface BlendState {
  color: BlendComponent;
  alpha: BlendComponent;
}

export interface BlendComponent {
  operation?: BlendOperation;
  srcFactor?: BlendFactor;
  dstFactor?: BlendFactor;
}

export type BlendOperation = 'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max';
export type BlendFactor =
  | 'zero'
  | 'one'
  | 'src'
  | 'one-minus-src'
  | 'src-alpha'
  | 'one-minus-src-alpha'
  | 'dst'
  | 'one-minus-dst'
  | 'dst-alpha'
  | 'one-minus-dst-alpha'
  | 'src-alpha-saturated'
  | 'constant'
  | 'one-minus-constant';

export interface PrimitiveState {
  topology?: PrimitiveTopology;
  stripIndexFormat?: 'uint16' | 'uint32';
  frontFace?: 'ccw' | 'cw';
  cullMode?: 'none' | 'front' | 'back';
}

export type PrimitiveTopology =
  | 'point-list'
  | 'line-list'
  | 'line-strip'
  | 'triangle-list'
  | 'triangle-strip';

export interface DepthStencilState {
  format: GPUTextureFormatType;
  depthWriteEnabled?: boolean;
  depthCompare?: CompareFunction;
}

export type CompareFunction =
  | 'never'
  | 'less'
  | 'equal'
  | 'less-equal'
  | 'greater'
  | 'not-equal'
  | 'greater-equal'
  | 'always';

export interface MultisampleState {
  count?: number;
  mask?: number;
  alphaToCoverageEnabled?: boolean;
}

// ============================================================================
// 抽象资源接口
// ============================================================================

/** 抽象 Buffer 接口 */
export interface IBuffer {
  readonly id: ResourceId;
  readonly size: number;
  readonly usage: number;
  readonly label?: string;
  destroy(): void;
}

/** 抽象 Texture 接口 */
export interface ITexture {
  readonly id: ResourceId;
  readonly width: number;
  readonly height: number;
  readonly format: GPUTextureFormatType;
  readonly usage: number;
  readonly label?: string;
  createView(descriptor?: TextureViewDescriptor): ITextureView;
  destroy(): void;
}

export interface TextureViewDescriptor {
  format?: GPUTextureFormatType;
  dimension?: '1d' | '2d' | '2d-array' | 'cube' | 'cube-array' | '3d';
  aspect?: 'all' | 'stencil-only' | 'depth-only';
  baseMipLevel?: number;
  mipLevelCount?: number;
  baseArrayLayer?: number;
  arrayLayerCount?: number;
}

/** 抽象 TextureView 接口 */
export interface ITextureView {
  readonly id: ResourceId;
  readonly texture: ITexture;
}

/** 抽象 Shader Module 接口 */
export interface IShaderModule {
  readonly id: ResourceId;
  readonly label?: string;
}

/** 抽象 Compute Pipeline 接口 */
export interface IComputePipeline {
  readonly id: ResourceId;
  readonly label?: string;
  getBindGroupLayout(index: number): IBindGroupLayout;
}

/** 抽象 Render Pipeline 接口 */
export interface IRenderPipeline {
  readonly id: ResourceId;
  readonly label?: string;
  getBindGroupLayout(index: number): IBindGroupLayout;
}

/** 抽象 BindGroupLayout 接口 */
export interface IBindGroupLayout {
  readonly id: ResourceId;
}

/** 抽象 BindGroup 接口 */
export interface IBindGroup {
  readonly id: ResourceId;
}

// ============================================================================
// 命令编码接口
// ============================================================================

/** 命令编码器接口 */
export interface ICommandEncoder {
  beginComputePass(descriptor?: ComputePassDescriptor): IComputePassEncoder;
  beginRenderPass(descriptor: RenderPassDescriptor): IRenderPassEncoder;
  copyBufferToBuffer(
    source: IBuffer,
    sourceOffset: number,
    destination: IBuffer,
    destinationOffset: number,
    size: number
  ): void;
  copyTextureToTexture(
    source: ImageCopyTexture,
    destination: ImageCopyTexture,
    copySize: TextureSize
  ): void;
  finish(): ICommandBuffer;
}

export interface ComputePassDescriptor {
  label?: string;
}

export interface RenderPassDescriptor {
  colorAttachments: (RenderPassColorAttachment | null)[];
  depthStencilAttachment?: RenderPassDepthStencilAttachment;
  label?: string;
}

export interface RenderPassColorAttachment {
  view: ITextureView;
  resolveTarget?: ITextureView;
  clearValue?: ColorValue;
  loadOp: 'load' | 'clear';
  storeOp: 'store' | 'discard';
}

export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface RenderPassDepthStencilAttachment {
  view: ITextureView;
  depthClearValue?: number;
  depthLoadOp?: 'load' | 'clear';
  depthStoreOp?: 'store' | 'discard';
  depthReadOnly?: boolean;
  stencilClearValue?: number;
  stencilLoadOp?: 'load' | 'clear';
  stencilStoreOp?: 'store' | 'discard';
  stencilReadOnly?: boolean;
}

export interface ImageCopyTexture {
  texture: ITexture;
  mipLevel?: number;
  origin?: { x?: number; y?: number; z?: number };
  aspect?: 'all' | 'stencil-only' | 'depth-only';
}

/** Image data layout for texture writes */
export interface ImageDataLayout {
  offset?: number;
  bytesPerRow?: number;
  rowsPerImage?: number;
}

/** Compute Pass 编码器接口 */
export interface IComputePassEncoder {
  setPipeline(pipeline: IComputePipeline): void;
  setBindGroup(index: number, bindGroup: IBindGroup, dynamicOffsets?: number[]): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  dispatchWorkgroupsIndirect(indirectBuffer: IBuffer, indirectOffset: number): void;
  end(): void;
}

/** Render Pass 编码器接口 */
export interface IRenderPassEncoder {
  setPipeline(pipeline: IRenderPipeline): void;
  setBindGroup(index: number, bindGroup: IBindGroup, dynamicOffsets?: number[]): void;
  setVertexBuffer(slot: number, buffer: IBuffer, offset?: number, size?: number): void;
  setIndexBuffer(buffer: IBuffer, indexFormat: 'uint16' | 'uint32', offset?: number, size?: number): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  drawIndexed(
    indexCount: number,
    instanceCount?: number,
    firstIndex?: number,
    baseVertex?: number,
    firstInstance?: number
  ): void;
  drawIndirect(indirectBuffer: IBuffer, indirectOffset: number): void;
  drawIndexedIndirect(indirectBuffer: IBuffer, indirectOffset: number): void;
  setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): void;
  setScissorRect(x: number, y: number, width: number, height: number): void;
  setBlendConstant(color: ColorValue): void;
  setStencilReference(reference: number): void;
  end(): void;
}

/** 命令缓冲区接口 */
export interface ICommandBuffer {
  readonly id: ResourceId;
  readonly label?: string;
}

// ============================================================================
// 渲染目标接口
// ============================================================================

/** 渲染目标接口 - Canvas/OffscreenCanvas/Texture */
export interface IRenderTarget {
  /** 获取当前帧的纹理 */
  getCurrentTexture(): ITexture;

  /** 获取首选格式 */
  getPreferredFormat(): GPUTextureFormatType;

  /** 获取尺寸 */
  getSize(): { width: number; height: number };

  /** 配置渲染目标 */
  configure(config: RenderTargetConfig): void;
}

export interface RenderTargetConfig {
  format?: GPUTextureFormatType;
  usage?: number;
  alphaMode?: 'opaque' | 'premultiplied';
  colorSpace?: 'srgb' | 'display-p3';
}

// ============================================================================
// BindGroup 创建接口
// ============================================================================

/** BindGroup 描述符 */
export interface BindGroupDescriptor {
  layout: IBindGroupLayout;
  entries: BindGroupEntry[];
  label?: string;
}

export interface BindGroupEntry {
  binding: number;
  resource: BindingResource;
}

export type BindingResource =
  | { buffer: IBuffer; offset?: number; size?: number }
  | ITextureView
  | ISampler;

/** Sampler 接口 */
export interface ISampler {
  readonly id: ResourceId;
}

/** Sampler 描述符 */
export interface SamplerDescriptor {
  addressModeU?: AddressMode;
  addressModeV?: AddressMode;
  addressModeW?: AddressMode;
  magFilter?: FilterMode;
  minFilter?: FilterMode;
  mipmapFilter?: MipmapFilterMode;
  lodMinClamp?: number;
  lodMaxClamp?: number;
  compare?: CompareFunction;
  maxAnisotropy?: number;
  label?: string;
}

export type AddressMode = 'clamp-to-edge' | 'repeat' | 'mirror-repeat';
export type FilterMode = 'nearest' | 'linear';
export type MipmapFilterMode = 'nearest' | 'linear';

// ============================================================================
// 类型别名 - 保持与 WebGPU 兼容
// ============================================================================

/** GPU 纹理格式类型 */
export type GPUTextureFormatType =
  | 'r8unorm'
  | 'r8snorm'
  | 'r8uint'
  | 'r8sint'
  | 'r16uint'
  | 'r16sint'
  | 'r16float'
  | 'rg8unorm'
  | 'rg8snorm'
  | 'rg8uint'
  | 'rg8sint'
  | 'r32uint'
  | 'r32sint'
  | 'r32float'
  | 'rg16uint'
  | 'rg16sint'
  | 'rg16float'
  | 'rgba8unorm'
  | 'rgba8unorm-srgb'
  | 'rgba8snorm'
  | 'rgba8uint'
  | 'rgba8sint'
  | 'bgra8unorm'
  | 'bgra8unorm-srgb'
  | 'rgb10a2unorm'
  | 'rg32uint'
  | 'rg32sint'
  | 'rg32float'
  | 'rgba16uint'
  | 'rgba16sint'
  | 'rgba16float'
  | 'rgba32uint'
  | 'rgba32sint'
  | 'rgba32float'
  | 'depth16unorm'
  | 'depth24plus'
  | 'depth24plus-stencil8'
  | 'depth32float'
  | 'depth32float-stencil8'
  | 'stencil8';

/** 顶点格式类型 */
export type VertexFormatType =
  | 'uint8x2'
  | 'uint8x4'
  | 'sint8x2'
  | 'sint8x4'
  | 'unorm8x2'
  | 'unorm8x4'
  | 'snorm8x2'
  | 'snorm8x4'
  | 'uint16x2'
  | 'uint16x4'
  | 'sint16x2'
  | 'sint16x4'
  | 'unorm16x2'
  | 'unorm16x4'
  | 'snorm16x2'
  | 'snorm16x4'
  | 'float16x2'
  | 'float16x4'
  | 'float32'
  | 'float32x2'
  | 'float32x3'
  | 'float32x4'
  | 'uint32'
  | 'uint32x2'
  | 'uint32x3'
  | 'uint32x4'
  | 'sint32'
  | 'sint32x2'
  | 'sint32x3'
  | 'sint32x4';
