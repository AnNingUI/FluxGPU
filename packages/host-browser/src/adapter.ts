import type { IRuntimeAdapter, IExecutor } from '@fluxgpu/contracts';
import { 
  InitializationError, 
  RuntimeError, 
  CommandExecutionError,
  BufferOverflowError 
} from '@fluxgpu/contracts';
import { serializeCommand } from '@fluxgpu/protocol';
import { WorkerManager, type WorkerManagerConfig } from './worker-manager.js';

/**
 * Configuration for BrowserHost
 */
export interface BrowserHostConfig {
  workerUrl: string;
  maxWorkers?: number;
  ringBufferSize?: number;
}

/**
 * Browser-specific executor that wraps worker communication
 * This is a lightweight proxy that delegates to the WebGPU executor running in a worker
 */
class BrowserExecutor implements IExecutor {
  constructor(
    private workerId: string,
    private workerManager: WorkerManager
  ) {}

  dispatch(command: any): void {
    try {
      // Serialize command using protocol serializer
      const serialized = serializeCommand(command);
      const success = this.workerManager.writeToRingBuffer(this.workerId, serialized);
      
      if (!success) {
        throw new BufferOverflowError(
          serialized.length,
          0, // Available space unknown
          { commandId: command.id, workerId: this.workerId }
        );
      }
    } catch (error) {
      if (error instanceof BufferOverflowError) {
        throw error;
      }
      throw new CommandExecutionError(
        command.id,
        error instanceof Error ? error.message : String(error),
        { workerId: this.workerId, originalError: error }
      );
    }
  }

  getResourceTable(): any {
    // In the browser host, the resource table lives in the worker
    // This returns a proxy that can query the worker for resource information
    return this.workerManager.getRingBuffer(this.workerId);
  }
}

/**
 * BrowserHost - Browser runtime adapter implementing IRuntimeAdapter
 * 
 * Responsibilities:
 * - Initialize Web Workers for GPU execution
 * - Set up communication channels via WorkerManager
 * - Provide executor instances that communicate with workers
 * - Detect browser capabilities
 * 
 * Requirements:
 * - 6.1: Requires passing concrete runtime adapter at initialization
 * - 6.2: Interacts only through IRuntimeAdapter interface
 */
export class BrowserHost implements IRuntimeAdapter {
  private workerManager: WorkerManager | null = null;
  private initialized = false;
  private config: BrowserHostConfig;
  private primaryWorkerId: string | null = null;

  constructor(config: BrowserHostConfig) {
    this.config = {
      workerUrl: config.workerUrl,
      maxWorkers: config.maxWorkers ?? 1,
      ringBufferSize: config.ringBufferSize ?? 1024 * 1024,
    };
  }

  /**
   * Initialize the browser runtime
   * Sets up workers and GPU context
   * @throws {InitializationError} if initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check for WebGPU support
      if (!this.supportsFeature('webgpu')) {
        throw new InitializationError(
          'WebGPU is not supported in this browser',
          { 
            hasNavigator: typeof navigator !== 'undefined',
            hasGPU: typeof navigator !== 'undefined' && 'gpu' in navigator 
          }
        );
      }

      // Check for SharedArrayBuffer support (required for ring buffer)
      if (!this.supportsFeature('sharedarraybuffer')) {
        throw new InitializationError(
          'SharedArrayBuffer is not supported - required for worker communication',
          { 
            hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
            crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false
          }
        );
      }

      // Create worker manager
      const workerConfig: WorkerManagerConfig = {
        workerUrl: this.config.workerUrl,
        maxWorkers: this.config.maxWorkers,
        ringBufferSize: this.config.ringBufferSize,
      };

      this.workerManager = new WorkerManager(workerConfig);

      // Create and initialize primary worker
      this.primaryWorkerId = this.workerManager.createWorker();
      await this.workerManager.initializeWorker(this.primaryWorkerId);

      this.initialized = true;
    } catch (error) {
      // Cleanup on failure
      if (this.workerManager) {
        this.workerManager.terminateAll();
        this.workerManager = null;
      }
      this.primaryWorkerId = null;
      
      if (error instanceof InitializationError) {
        throw error;
      }
      throw new InitializationError(
        error instanceof Error ? error.message : String(error),
        { originalError: error }
      );
    }
  }

  /**
   * Create an executor instance
   * Returns an executor that communicates with a worker
   * @throws {RuntimeError} if not initialized
   */
  createExecutor(): IExecutor {
    if (!this.initialized || !this.workerManager || !this.primaryWorkerId) {
      throw new RuntimeError(
        'BrowserHost must be initialized before creating executors',
        { 
          initialized: this.initialized,
          hasWorkerManager: !!this.workerManager,
          hasPrimaryWorker: !!this.primaryWorkerId
        }
      );
    }

    // For now, return an executor connected to the primary worker
    // In a more advanced implementation, could load-balance across multiple workers
    return new BrowserExecutor(this.primaryWorkerId, this.workerManager);
  }

  /**
   * Check if a feature is supported
   * Capability detection for browser features
   */
  supportsFeature(feature: string): boolean {
    switch (feature.toLowerCase()) {
      case 'webgpu':
        // Check if WebGPU is available
        return typeof navigator !== 'undefined' && 'gpu' in navigator;

      case 'sharedarraybuffer':
        // Check if SharedArrayBuffer is available
        return typeof SharedArrayBuffer !== 'undefined';

      case 'workers':
        // Check if Web Workers are available
        return typeof Worker !== 'undefined';

      case 'offscreencanvas':
        // Check if OffscreenCanvas is available
        return typeof OffscreenCanvas !== 'undefined';

      case 'atomics':
        // Check if Atomics are available
        return typeof Atomics !== 'undefined';

      default:
        return false;
    }
  }

  /**
   * Get the worker manager (for advanced use cases)
   */
  getWorkerManager(): WorkerManager | null {
    return this.workerManager;
  }

  /**
   * Check if the host is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.workerManager) {
      this.workerManager.terminateAll();
      this.workerManager = null;
    }
    this.primaryWorkerId = null;
    this.initialized = false;
  }
}
