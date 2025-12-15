/**
 * Core Flux API - 六边形架构
 *
 * 所有 GPU 操作通过 IGPUAdapter 接口进行，与具体环境解耦
 */

import type { IGPUAdapter } from '@fluxgpu/contracts';
import {
  Result,
  Ok,
  Err,
  InitializationError,
  NotInitializedError,
  ValidationError,
  ErrorRecoveryContext,
} from '@fluxgpu/contracts';
import { ShadowStateManager } from './shadow-state.js';
import { createCommandGraph, validateGraph, type GraphNode, type CommandGraph } from './command-graph.js';

// ============================================================================
// 配置接口
// ============================================================================

/**
 * Flux 配置
 */
export interface FluxConfig {
  /** GPU 适配器 - 依赖注入 */
  adapter: IGPUAdapter;
}

// Initialization state enum
enum InitializationState {
  NotInitialized = 'not-initialized',
  Initializing = 'initializing',
  Initialized = 'initialized',
  Failed = 'failed',
}

// ============================================================================
// Flux 实例接口
// ============================================================================

export interface FluxInstance {
  /** 初始化 */
  initialize(): Promise<Result<void, InitializationError>>;

  /** 检查是否已初始化 */
  isInitialized(): boolean;

  /** 获取初始化状态 */
  getInitializationState(): InitializationState;

  /** 获取 Shadow State 管理器 */
  getShadowStateManager(): ShadowStateManager;

  /** 构建命令图 */
  buildCommandGraph(nodes: GraphNode[]): Result<CommandGraph, ValidationError | NotInitializedError>;

  /** 验证命令图 */
  validateCommandGraph(graph: CommandGraph): Result<void, ValidationError | NotInitializedError>;

  /** 获取 GPU 适配器 */
  getAdapter(): IGPUAdapter;

  /** 获取错误恢复上下文 */
  getErrorRecoveryContext(): ErrorRecoveryContext;

  /** 清理资源 */
  dispose(): void;
}

// ============================================================================
// Flux 实现
// ============================================================================

class Flux implements FluxInstance {
  private adapter: IGPUAdapter;
  private state: InitializationState;
  private shadowStateManager: ShadowStateManager;
  private errorRecoveryContext: ErrorRecoveryContext;

  constructor(config: FluxConfig) {
    this.adapter = config.adapter;
    this.state = InitializationState.NotInitialized;
    this.shadowStateManager = new ShadowStateManager();
    this.errorRecoveryContext = new ErrorRecoveryContext();
  }

  async initialize(): Promise<Result<void, InitializationError>> {
    if (this.state === InitializationState.Initialized) {
      return Ok(undefined);
    }

    if (this.state === InitializationState.Initializing) {
      return Err(new InitializationError('Initialization already in progress', { state: this.state }));
    }

    try {
      this.state = InitializationState.Initializing;

      // 注册清理回调
      this.errorRecoveryContext.registerCleanup(async () => {
        this.adapter.dispose();
      });

      // 初始化适配器
      await this.adapter.initialize();

      this.state = InitializationState.Initialized;
      return Ok(undefined);
    } catch (error) {
      this.state = InitializationState.Failed;
      const errorMessage = error instanceof Error ? error.message : String(error);

      try {
        await this.errorRecoveryContext.executeCleanup();
      } catch {
        // 清理失败，忽略
      }

      return Err(new InitializationError(errorMessage, { originalError: errorMessage, state: this.state }));
    }
  }

  isInitialized(): boolean {
    return this.state === InitializationState.Initialized;
  }

  getInitializationState(): InitializationState {
    return this.state;
  }

  getShadowStateManager(): ShadowStateManager {
    return this.shadowStateManager;
  }

  buildCommandGraph(nodes: GraphNode[]): Result<CommandGraph, ValidationError | NotInitializedError> {
    if (!this.isInitialized()) {
      return Err(new NotInitializedError('buildCommandGraph', { state: this.state }));
    }

    const graphResult = createCommandGraph(nodes);

    if (!graphResult.success) {
      return Err(graphResult.error);
    }

    const validation = validateGraph(graphResult.value);

    if (!validation.valid) {
      const errorMessages = validation.errors?.join('; ') || 'Unknown validation error';
      return Err(new ValidationError(`Command graph validation failed: ${errorMessages}`, { errors: validation.errors }));
    }

    return Ok(graphResult.value);
  }

  validateCommandGraph(graph: CommandGraph): Result<void, ValidationError | NotInitializedError> {
    if (!this.isInitialized()) {
      return Err(new NotInitializedError('validateCommandGraph', { state: this.state }));
    }

    const validation = validateGraph(graph);

    if (!validation.valid) {
      const errorMessages = validation.errors?.join('; ') || 'Unknown validation error';
      return Err(new ValidationError(`Command graph validation failed: ${errorMessages}`, { errors: validation.errors }));
    }

    return Ok(undefined);
  }

  getAdapter(): IGPUAdapter {
    return this.adapter;
  }

  getErrorRecoveryContext(): ErrorRecoveryContext {
    return this.errorRecoveryContext;
  }

  dispose(): void {
    this.adapter.dispose();
    this.state = InitializationState.NotInitialized;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 Flux 实例
 *
 * @example
 * import { createFlux } from '@fluxgpu/core';
 * import { BrowserGPUAdapter } from '@fluxgpu/host-browser';
 *
 * const adapter = new BrowserGPUAdapter({ canvas });
 * const flux = createFlux({ adapter });
 * await flux.initialize();
 *
 * const gpu = flux.getAdapter();
 * const buffer = gpu.createBuffer({ size: 1024, usage: BufferUsage.STORAGE });
 */
export function createFlux(config: FluxConfig): FluxInstance {
  if (!config.adapter) {
    throw new InitializationError('FluxConfig must include an adapter', { providedConfig: config });
  }

  return new Flux(config);
}
