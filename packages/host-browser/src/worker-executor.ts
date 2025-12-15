/**
 * @fluxgpu/host-browser - Worker Executor
 *
 * 在 Worker 中运行，接收命令并执行 WebGPU 操作
 * 这是一个通用的执行器，具体的渲染逻辑由用户实现
 */

/// <reference types="@webgpu/types" />

import { Opcode, type CommandBuffer } from '@fluxgpu/contracts';
import { deserializeCommand } from '@fluxgpu/protocol';
import {
  WorkerMessageType,
  type MainToWorkerMessage,
  type WorkerReadyMessage,
  type WorkerErrorMessage,
  type WorkerFrameCompleteMessage,
} from './worker-adapter.js';

// ============================================================================
// 渲染器接口 - 用户实现具体渲染逻辑
// ============================================================================

/**
 * Worker 渲染器接口
 * 用户实现此接口来定义具体的渲染逻辑
 */
export interface IWorkerRenderer {
  /** 初始化渲染器（在 WebGPU 设备创建后调用） */
  initialize(device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat): Promise<void>;

  /** 渲染一帧，返回帧时间（毫秒） */
  renderFrame(uniforms?: ArrayBuffer): number;

  /** 销毁资源 */
  dispose(): void;
}

/**
 * 渲染器工厂函数类型
 */
export type WorkerRendererFactory = () => IWorkerRenderer;

// ============================================================================
// Worker Executor - 通用 Worker 端执行器
// ============================================================================

export interface WorkerExecutorConfig {
  /** 渲染器工厂函数 */
  rendererFactory?: WorkerRendererFactory;
}

/**
 * WorkerExecutor - 在 Worker 中执行 WebGPU 命令
 *
 * 这是一个通用的执行器，负责：
 * - WebGPU 设备初始化
 * - 命令反序列化和执行
 * - 资源管理
 *
 * 具体的渲染逻辑由 IWorkerRenderer 实现
 */
export class WorkerExecutor {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private preferredFormat: GPUTextureFormat = 'bgra8unorm';

  // 资源存储
  private buffers: Map<string, GPUBuffer> = new Map();
  private shaderModules: Map<string, GPUShaderModule> = new Map();
  private computePipelines: Map<string, GPUComputePipeline> = new Map();
  private renderPipelines: Map<string, GPURenderPipeline> = new Map();
  private bindGroups: Map<string, GPUBindGroup> = new Map();

  private resourceIdCounter = 0;
  private renderer: IWorkerRenderer | null = null;

  constructor(private config: WorkerExecutorConfig = {}) {}

  /**
   * 初始化 WebGPU
   */
  async initialize(canvas: OffscreenCanvas, powerPreference?: 'low-power' | 'high-performance'): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter({ powerPreference });
    if (!adapter) {
      throw new Error('Failed to get GPU adapter');
    }

    this.device = await adapter.requestDevice();
    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    this.preferredFormat = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.preferredFormat,
      alphaMode: 'premultiplied',
    });

    // 初始化用户渲染器
    if (this.config.rendererFactory) {
      this.renderer = this.config.rendererFactory();
      await this.renderer.initialize(this.device, this.context, this.preferredFormat);
    }
  }

  /**
   * 获取 GPU 设备
   */
  getDevice(): GPUDevice | null {
    return this.device;
  }

  /**
   * 获取 Canvas 上下文
   */
  getContext(): GPUCanvasContext | null {
    return this.context;
  }

  /**
   * 执行命令
   */
  executeCommand(data: ArrayBuffer): void {
    const command = deserializeCommand(new Uint8Array(data));
    this.processCommand(command);
  }

  private processCommand(command: CommandBuffer): void {
    if (!this.device) return;

    switch (command.opcode) {
      case Opcode.CreateBuffer:
        this.handleCreateBuffer(command);
        break;
      case Opcode.WriteBuffer:
        this.handleWriteBuffer(command);
        break;
      case Opcode.Dispatch:
        this.handleDispatch(command);
        break;
      case Opcode.ReadBuffer:
        this.handleReadBuffer(command);
        break;
      default:
        console.warn(`[WorkerExecutor] Unknown opcode: ${command.opcode}`);
    }
  }

  private handleCreateBuffer(command: CommandBuffer): void {
    const view = new DataView(command.payload.buffer, command.payload.byteOffset);
    const size = view.getUint32(0, true);
    const usage = view.getUint32(4, true);
    const labelLength = view.getUint32(8, true);
    const label = labelLength > 0 ? new TextDecoder().decode(command.payload.slice(12, 12 + labelLength)) : undefined;

    const buffer = this.device!.createBuffer({ size, usage, label });
    const id = `buffer_${++this.resourceIdCounter}`;
    this.buffers.set(id, buffer);

    console.log(`[WorkerExecutor] Created buffer: ${id}, size: ${size}`);
  }

  private handleWriteBuffer(command: CommandBuffer): void {
    const view = new DataView(command.payload.buffer, command.payload.byteOffset);
    let offset = 0;

    const idLength = view.getUint32(offset, true);
    offset += 4;
    const bufferId = new TextDecoder().decode(command.payload.slice(offset, offset + idLength));
    offset += idLength;

    const bufferOffset = view.getUint32(offset, true);
    offset += 4;

    const dataLength = view.getUint32(offset, true);
    offset += 4;

    const data = command.payload.slice(offset, offset + dataLength);

    const buffer = this.buffers.get(bufferId);
    if (buffer) {
      this.device!.queue.writeBuffer(buffer, bufferOffset, data);
    }
  }

  private handleDispatch(_command: CommandBuffer): void {
    // TODO: 实现通用的 dispatch
    console.warn('[WorkerExecutor] Generic dispatch not implemented');
  }

  private handleReadBuffer(_command: CommandBuffer): void {
    // TODO: 实现 buffer 读取
    console.warn('[WorkerExecutor] ReadBuffer not implemented');
  }

  /**
   * 渲染一帧
   */
  renderFrame(uniforms?: ArrayBuffer): number {
    if (!this.renderer) {
      return 0;
    }
    return this.renderer.renderFrame(uniforms);
  }

  /**
   * 获取首选格式
   */
  getPreferredFormat(): string {
    return this.preferredFormat;
  }

  /**
   * 获取 Buffer
   */
  getBuffer(id: string): GPUBuffer | undefined {
    return this.buffers.get(id);
  }

  /**
   * 销毁资源
   */
  dispose(): void {
    this.renderer?.dispose();
    this.buffers.forEach((buffer) => buffer.destroy());
    this.buffers.clear();
    this.shaderModules.clear();
    this.computePipelines.clear();
    this.renderPipelines.clear();
    this.bindGroups.clear();
    this.device?.destroy();
  }
}

// ============================================================================
// Worker 入口点辅助函数
// ============================================================================

export interface CreateWorkerHandlerConfig {
  /** 渲染器工厂函数 */
  rendererFactory?: WorkerRendererFactory;
}

/**
 * 创建 Worker 消息处理器
 */
export function createWorkerHandler(config: CreateWorkerHandlerConfig = {}): void {
  let executor: WorkerExecutor | null = null;

  self.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
    const message = event.data;

    try {
      switch (message.type) {
        case WorkerMessageType.Init: {
          executor = new WorkerExecutor({
            rendererFactory: config.rendererFactory,
          });
          await executor.initialize(message.canvas, message.config?.powerPreference);

          const response: WorkerReadyMessage = {
            type: WorkerMessageType.Ready,
            preferredFormat: executor.getPreferredFormat(),
          };
          self.postMessage(response);
          break;
        }

        case WorkerMessageType.Command: {
          if (executor) {
            executor.executeCommand(message.data);
          }
          break;
        }

        case WorkerMessageType.Frame: {
          if (executor) {
            const frameTime = executor.renderFrame(message.uniforms);
            const response: WorkerFrameCompleteMessage = {
              type: WorkerMessageType.FrameComplete,
              frameTime,
            };
            self.postMessage(response);
          }
          break;
        }
      }
    } catch (error) {
      const response: WorkerErrorMessage = {
        type: WorkerMessageType.Error,
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    }
  };
}
