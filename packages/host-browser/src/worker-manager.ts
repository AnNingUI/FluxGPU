import { RingBuffer } from '@fluxgpu/protocol';

/**
 * Message types for worker communication
 */
export enum WorkerMessageType {
  Initialize = 'initialize',
  Command = 'command',
  Response = 'response',
  Error = 'error',
  Terminate = 'terminate',
}

/**
 * Base message structure for worker communication
 */
export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: unknown;
}

/**
 * Configuration for WorkerManager
 */
export interface WorkerManagerConfig {
  workerUrl: string;
  maxWorkers?: number;
  ringBufferSize?: number;
}

/**
 * Represents a managed worker instance
 */
interface ManagedWorker {
  id: string;
  worker: Worker;
  ringBuffer: RingBuffer;
  sharedBuffer: SharedArrayBuffer;
  isActive: boolean;
  messageHandlers: Map<string, (data: unknown) => void>;
}

/**
 * WorkerManager manages the lifecycle of Web Workers and handles
 * message routing between the main thread and worker threads.
 * Integrates with RingBuffer for efficient binary communication.
 */
export class WorkerManager {
  private workers: Map<string, ManagedWorker> = new Map();
  private config: Required<WorkerManagerConfig>;
  private nextWorkerId = 0;

  constructor(config: WorkerManagerConfig) {
    this.config = {
      workerUrl: config.workerUrl,
      maxWorkers: config.maxWorkers ?? 4,
      ringBufferSize: config.ringBufferSize ?? 1024 * 1024, // 1MB default
    };
  }

  /**
   * Creates and initializes a new worker
   * @returns Worker ID
   */
  createWorker(): string {
    if (this.workers.size >= this.config.maxWorkers) {
      throw new Error(`Maximum number of workers (${this.config.maxWorkers}) reached`);
    }

    const workerId = `worker-${this.nextWorkerId++}`;
    const worker = new Worker(this.config.workerUrl, { type: 'module' });

    // Create SharedArrayBuffer for RingBuffer communication
    // Add 8 bytes for control data (read/write indices)
    const sharedBuffer = new SharedArrayBuffer(this.config.ringBufferSize + 8);
    const ringBuffer = new RingBuffer(sharedBuffer, this.config.ringBufferSize);

    const managedWorker: ManagedWorker = {
      id: workerId,
      worker,
      ringBuffer,
      sharedBuffer,
      isActive: true,
      messageHandlers: new Map(),
    };

    // Set up message handler
    worker.onmessage = (event: MessageEvent) => {
      this.handleWorkerMessage(workerId, event.data);
    };

    // Set up error handler
    worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(workerId, error);
    };

    // Set up message error handler (for unserializable messages)
    worker.onmessageerror = (event: MessageEvent) => {
      this.handleWorkerMessageError(workerId, event);
    };

    this.workers.set(workerId, managedWorker);

    return workerId;
  }

  /**
   * Initializes a worker with the shared buffer
   * @param workerId Worker ID
   */
  async initializeWorker(workerId: string): Promise<void> {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Worker ${workerId} initialization timeout`));
      }, 5000);

      // Set up one-time handler for initialization response
      const handler = (data: unknown) => {
        clearTimeout(timeoutId);
        const message = data as WorkerMessage;
        if (message.type === WorkerMessageType.Response) {
          resolve();
        } else if (message.type === WorkerMessageType.Error) {
          reject(new Error(`Worker initialization failed: ${message.payload}`));
        }
      };

      managedWorker.messageHandlers.set('init', handler);

      // Send initialization message with shared buffer
      this.postMessage(workerId, {
        type: WorkerMessageType.Initialize,
        payload: {
          sharedBuffer: managedWorker.sharedBuffer,
        },
      });
    });
  }

  /**
   * Terminates a worker and cleans up resources
   * @param workerId Worker ID
   */
  terminateWorker(workerId: string): void {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      return;
    }

    // Send termination message
    try {
      this.postMessage(workerId, {
        type: WorkerMessageType.Terminate,
      });
    } catch (error) {
      // Worker may already be dead, ignore errors
    }

    // Terminate the worker
    managedWorker.worker.terminate();
    managedWorker.isActive = false;

    // Clean up
    managedWorker.messageHandlers.clear();
    this.workers.delete(workerId);
  }

  /**
   * Terminates all workers
   */
  terminateAll(): void {
    const workerIds = Array.from(this.workers.keys());
    for (const workerId of workerIds) {
      this.terminateWorker(workerId);
    }
  }

  /**
   * Posts a message to a worker
   * @param workerId Worker ID
   * @param message Message to send
   * @param transfer Optional transferable objects
   */
  postMessage(workerId: string, message: WorkerMessage, transfer?: Transferable[]): void {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    if (!managedWorker.isActive) {
      throw new Error(`Worker ${workerId} is not active`);
    }

    managedWorker.worker.postMessage(message, transfer ?? []);
  }

  /**
   * Writes binary data to a worker's ring buffer
   * @param workerId Worker ID
   * @param data Binary data to write
   * @returns true if write succeeded, false if buffer is full
   */
  writeToRingBuffer(workerId: string, data: Uint8Array): boolean {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    return managedWorker.ringBuffer.write(data);
  }

  /**
   * Reads binary data from a worker's ring buffer
   * @param workerId Worker ID
   * @returns Binary data or null if buffer is empty
   */
  readFromRingBuffer(workerId: string): Uint8Array | null {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    return managedWorker.ringBuffer.read();
  }

  /**
   * Registers a message handler for a specific worker
   * @param workerId Worker ID
   * @param handlerId Unique handler ID
   * @param handler Message handler function
   */
  onMessage(workerId: string, handlerId: string, handler: (data: unknown) => void): void {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    managedWorker.messageHandlers.set(handlerId, handler);
  }

  /**
   * Unregisters a message handler
   * @param workerId Worker ID
   * @param handlerId Handler ID to remove
   */
  offMessage(workerId: string, handlerId: string): void {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      return;
    }

    managedWorker.messageHandlers.delete(handlerId);
  }

  /**
   * Gets the ring buffer for a worker
   * @param workerId Worker ID
   * @returns RingBuffer instance
   */
  getRingBuffer(workerId: string): RingBuffer {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    return managedWorker.ringBuffer;
  }

  /**
   * Checks if a worker is active
   * @param workerId Worker ID
   * @returns true if worker is active
   */
  isWorkerActive(workerId: string): boolean {
    const managedWorker = this.workers.get(workerId);
    return managedWorker?.isActive ?? false;
  }

  /**
   * Gets the number of active workers
   */
  getActiveWorkerCount(): number {
    return Array.from(this.workers.values()).filter((w) => w.isActive).length;
  }

  /**
   * Gets all worker IDs
   */
  getWorkerIds(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Handles incoming messages from workers
   */
  private handleWorkerMessage(workerId: string, data: unknown): void {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      return;
    }

    // Call all registered handlers
    for (const handler of managedWorker.messageHandlers.values()) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in message handler for worker ${workerId}:`, error);
      }
    }
  }

  /**
   * Handles worker errors
   */
  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      return;
    }

    console.error(`Worker ${workerId} error:`, error.message);

    // Mark worker as inactive
    managedWorker.isActive = false;

    // Notify handlers of the error
    const errorMessage: WorkerMessage = {
      type: WorkerMessageType.Error,
      payload: {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
      },
    };

    for (const handler of managedWorker.messageHandlers.values()) {
      try {
        handler(errorMessage);
      } catch (handlerError) {
        console.error(`Error in error handler for worker ${workerId}:`, handlerError);
      }
    }

    // Auto-cleanup crashed worker
    this.terminateWorker(workerId);
  }

  /**
   * Handles message serialization errors
   */
  private handleWorkerMessageError(workerId: string, event: MessageEvent): void {
    console.error(`Worker ${workerId} message error:`, event);

    const managedWorker = this.workers.get(workerId);
    if (!managedWorker) {
      return;
    }

    // Notify handlers of the error
    const errorMessage: WorkerMessage = {
      type: WorkerMessageType.Error,
      payload: {
        message: 'Message serialization error',
        event,
      },
    };

    for (const handler of managedWorker.messageHandlers.values()) {
      try {
        handler(errorMessage);
      } catch (handlerError) {
        console.error(`Error in message error handler for worker ${workerId}:`, handlerError);
      }
    }
  }
}
