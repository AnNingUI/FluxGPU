/**
 * @fluxgpu/host-browser - Worker GPU Adapter
 *
 * 在 Worker 中运行 WebGPU，通过 protocol 与主线程通信
 */

import { Opcode, type CommandBuffer, type CommandId } from '@fluxgpu/contracts';
import { serializeCommand } from '@fluxgpu/protocol';

// ============================================================================
// Worker 消息类型
// ============================================================================

export enum WorkerMessageType {
  // 主线程 -> Worker
  Init = 'init',
  Command = 'command',
  Frame = 'frame',

  // Worker -> 主线程
  Ready = 'ready',
  Error = 'error',
  Result = 'result',
  FrameComplete = 'frame-complete',
}

export interface WorkerInitMessage {
  type: WorkerMessageType.Init;
  canvas: OffscreenCanvas;
  config?: {
    powerPreference?: 'low-power' | 'high-performance';
  };
}

export interface WorkerCommandMessage {
  type: WorkerMessageType.Command;
  data: ArrayBuffer;
}

export interface WorkerFrameMessage {
  type: WorkerMessageType.Frame;
  uniforms?: ArrayBuffer;
}

export interface WorkerReadyMessage {
  type: WorkerMessageType.Ready;
  preferredFormat: string;
}

export interface WorkerErrorMessage {
  type: WorkerMessageType.Error;
  error: string;
}

export interface WorkerResultMessage {
  type: WorkerMessageType.Result;
  commandId: string;
  data?: ArrayBuffer;
}

export interface WorkerFrameCompleteMessage {
  type: WorkerMessageType.FrameComplete;
  frameTime: number;
}

export type MainToWorkerMessage = WorkerInitMessage | WorkerCommandMessage | WorkerFrameMessage;
export type WorkerToMainMessage = WorkerReadyMessage | WorkerErrorMessage | WorkerResultMessage | WorkerFrameCompleteMessage;

// ============================================================================
// 命令构建器 - 用于构建发送到 Worker 的命令
// ============================================================================

let commandIdCounter = 0;
function generateCommandId(): CommandId {
  return `cmd_${++commandIdCounter}` as CommandId;
}

export interface CreateBufferPayload {
  size: number;
  usage: number;
  label?: string;
}

export interface WriteBufferPayload {
  bufferId: string;
  offset: number;
  data: ArrayBuffer;
}

export interface DispatchPayload {
  computePipelineId: string;
  bindGroupId: string;
  workgroupsX: number;
  workgroupsY?: number;
  workgroupsZ?: number;
}

export interface RenderPayload {
  renderPipelineId: string;
  bindGroupId: string;
  vertexCount: number;
  clearColor: { r: number; g: number; b: number; a: number };
}

/**
 * 序列化 CreateBuffer 命令
 */
export function createBufferCommand(payload: CreateBufferPayload): Uint8Array {
  const encoder = new TextEncoder();
  const labelBytes = payload.label ? encoder.encode(payload.label) : new Uint8Array(0);

  const buffer = new ArrayBuffer(12 + labelBytes.length);
  const view = new DataView(buffer);
  view.setUint32(0, payload.size, true);
  view.setUint32(4, payload.usage, true);
  view.setUint32(8, labelBytes.length, true);
  new Uint8Array(buffer, 12).set(labelBytes);

  const command: CommandBuffer = {
    id: generateCommandId(),
    opcode: Opcode.CreateBuffer,
    payload: new Uint8Array(buffer),
    dependencies: [],
  };

  return serializeCommand(command);
}

/**
 * 序列化 WriteBuffer 命令
 */
export function writeBufferCommand(payload: WriteBufferPayload): Uint8Array {
  const encoder = new TextEncoder();
  const idBytes = encoder.encode(payload.bufferId);

  const buffer = new ArrayBuffer(12 + idBytes.length + payload.data.byteLength);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  let offset = 0;
  view.setUint32(offset, idBytes.length, true);
  offset += 4;
  uint8.set(idBytes, offset);
  offset += idBytes.length;
  view.setUint32(offset, payload.offset, true);
  offset += 4;
  view.setUint32(offset, payload.data.byteLength, true);
  offset += 4;
  uint8.set(new Uint8Array(payload.data), offset);

  const command: CommandBuffer = {
    id: generateCommandId(),
    opcode: Opcode.WriteBuffer,
    payload: new Uint8Array(buffer),
    dependencies: [],
  };

  return serializeCommand(command);
}

/**
 * 序列化 Dispatch 命令
 */
export function dispatchCommand(payload: DispatchPayload): Uint8Array {
  const encoder = new TextEncoder();
  const pipelineIdBytes = encoder.encode(payload.computePipelineId);
  const bindGroupIdBytes = encoder.encode(payload.bindGroupId);

  const buffer = new ArrayBuffer(24 + pipelineIdBytes.length + bindGroupIdBytes.length);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  let offset = 0;
  view.setUint32(offset, pipelineIdBytes.length, true);
  offset += 4;
  uint8.set(pipelineIdBytes, offset);
  offset += pipelineIdBytes.length;
  view.setUint32(offset, bindGroupIdBytes.length, true);
  offset += 4;
  uint8.set(bindGroupIdBytes, offset);
  offset += bindGroupIdBytes.length;
  view.setUint32(offset, payload.workgroupsX, true);
  offset += 4;
  view.setUint32(offset, payload.workgroupsY ?? 1, true);
  offset += 4;
  view.setUint32(offset, payload.workgroupsZ ?? 1, true);

  const command: CommandBuffer = {
    id: generateCommandId(),
    opcode: Opcode.Dispatch,
    payload: new Uint8Array(buffer),
    dependencies: [],
  };

  return serializeCommand(command);
}

// ============================================================================
// 扩展 Opcode - 添加更多命令类型
// ============================================================================

export enum ExtendedOpcode {
  // 基础命令 (来自 contracts)
  CreateBuffer = 0x01,
  WriteBuffer = 0x02,
  Dispatch = 0x03,
  ReadBuffer = 0x04,

  // 扩展命令
  CreateShaderModule = 0x10,
  CreateComputePipeline = 0x11,
  CreateRenderPipeline = 0x12,
  CreateBindGroup = 0x13,
  Render = 0x14,
  SetUniforms = 0x15,
}

// ============================================================================
// Worker Host - 主线程端
// ============================================================================

export interface WorkerHostConfig {
  canvas: HTMLCanvasElement;
  /** Worker URL 或直接传入 Worker 实例 */
  worker: string | Worker;
  powerPreference?: 'low-power' | 'high-performance';
}

/**
 * WorkerHost - 主线程端的 Worker 管理器
 *
 * 将 canvas 转移到 Worker，通过消息传递命令
 */
export class WorkerHost {
  private worker: Worker | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private preferredFormat: string = 'bgra8unorm';
  private initialized = false;
  private pendingResults: Map<string, { resolve: (data?: ArrayBuffer) => void; reject: (error: Error) => void }> =
    new Map();
  private onFrameComplete?: (frameTime: number) => void;

  constructor(private config: WorkerHostConfig) {}

  /**
   * 初始化 Worker
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      try {
        // 创建 OffscreenCanvas
        this.offscreenCanvas = this.config.canvas.transferControlToOffscreen();

        // 创建或使用传入的 Worker
        if (typeof this.config.worker === 'string') {
          this.worker = new Worker(this.config.worker, { type: 'module' });
        } else {
          this.worker = this.config.worker;
        }

        // 设置消息处理
        this.worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
          this.handleWorkerMessage(event.data, resolve);
        };

        this.worker.onerror = (error) => {
          reject(new Error(`Worker error: ${error.message}`));
        };

        // 发送初始化消息
        const initMessage: WorkerInitMessage = {
          type: WorkerMessageType.Init,
          canvas: this.offscreenCanvas,
          config: {
            powerPreference: this.config.powerPreference,
          },
        };

        this.worker.postMessage(initMessage, [this.offscreenCanvas]);
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleWorkerMessage(message: WorkerToMainMessage, onReady?: (value: void) => void): void {
    switch (message.type) {
      case WorkerMessageType.Ready:
        this.preferredFormat = message.preferredFormat;
        this.initialized = true;
        onReady?.();
        break;

      case WorkerMessageType.Error:
        console.error('[WorkerHost] Worker error:', message.error);
        break;

      case WorkerMessageType.Result:
        const pending = this.pendingResults.get(message.commandId);
        if (pending) {
          pending.resolve(message.data);
          this.pendingResults.delete(message.commandId);
        }
        break;

      case WorkerMessageType.FrameComplete:
        this.onFrameComplete?.(message.frameTime);
        break;
    }
  }

  /**
   * 发送命令到 Worker
   */
  sendCommand(data: Uint8Array): void {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const transferBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const message: WorkerCommandMessage = {
      type: WorkerMessageType.Command,
      data: transferBuffer,
    };

    this.worker.postMessage(message, [transferBuffer]);
  }

  /**
   * 请求渲染一帧
   */
  requestFrame(uniforms?: ArrayBuffer): void {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const message: WorkerFrameMessage = {
      type: WorkerMessageType.Frame,
      uniforms,
    };

    if (uniforms) {
      this.worker.postMessage(message, [uniforms]);
    } else {
      this.worker.postMessage(message);
    }
  }

  /**
   * 设置帧完成回调
   */
  setOnFrameComplete(callback: (frameTime: number) => void): void {
    this.onFrameComplete = callback;
  }

  /**
   * 获取首选格式
   */
  getPreferredFormat(): string {
    return this.preferredFormat;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 销毁 Worker
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
  }
}
