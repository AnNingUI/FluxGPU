import type { 
  IExecutor, 
  CommandBuffer, 
  ResourceId, 
  IGPUResource
} from '@fluxgpu/contracts';
import { ResourceType, Opcode } from '@fluxgpu/contracts';
import { 
  InitializationError,
  RuntimeError,
  DeviceLostError,
  CommandExecutionError,
  InvalidResourceError,
  InvalidOpcodeError,
  ErrorRecoveryContext
} from '@fluxgpu/contracts';
import { ResourceTable } from './resource-table.js';
import { RingBuffer, deserializeCommand } from '@fluxgpu/protocol';

// Import WebGPU types - this is the ONLY package that should import these
/// <reference types="@webgpu/types" />

/**
 * WebGPU resource wrapper implementing IGPUResource interface
 */
class GPUResourceWrapper implements IGPUResource {
  constructor(
    public id: ResourceId,
    public type: ResourceType,
    private gpuResource: GPUBuffer | GPUTexture | GPUSampler
  ) {}

  dispose(): void {
    if ('destroy' in this.gpuResource) {
      this.gpuResource.destroy();
    }
  }

  getGPUResource(): GPUBuffer | GPUTexture | GPUSampler {
    return this.gpuResource;
  }
}

/**
 * WebGPU Executor - The sole consumer of WebGPU APIs
 * Implements command loop that processes commands and translates them to WebGPU API calls
 * 
 * Requirements:
 * - 9.1: Only package importing WebGPU types or accessing navigator.gpu
 * - 9.2: Implements command loop that processes operations
 * - 9.4: Translates abstract operations into concrete WebGPU API calls
 */
export class WebGPUExecutor implements IExecutor {
  private device: GPUDevice | null = null;
  private resourceTable: ResourceTable;
  private ringBuffer: RingBuffer | null = null;
  private isRunning = false;
  private errorRecoveryContext: ErrorRecoveryContext;

  constructor() {
    this.resourceTable = new ResourceTable();
    this.errorRecoveryContext = new ErrorRecoveryContext();
  }

  /**
   * Initialize the WebGPU device
   * @throws {InitializationError} if WebGPU is not supported or initialization fails
   */
  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new InitializationError(
        'WebGPU is not supported in this environment',
        { hasNavigator: typeof navigator !== 'undefined' }
      );
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new InitializationError(
          'Failed to get WebGPU adapter',
          { gpuAvailable: !!navigator.gpu }
        );
      }

      this.device = await adapter.requestDevice();
      if (!this.device) {
        throw new InitializationError(
          'Failed to get WebGPU device',
          { adapterAvailable: !!adapter }
        );
      }

      // Register cleanup handler
      this.errorRecoveryContext.registerCleanup(async () => {
        this.resourceTable.clear();
        if (this.device) {
          this.device.destroy();
          this.device = null;
        }
      });

      // Handle device lost
      this.device.lost.then((info) => {
        const error = new DeviceLostError(
          info.message,
          { reason: info.reason }
        );
        console.error('WebGPU device lost:', error.toUserMessage());
        this.device = null;
        
        // Attempt recovery
        this.errorRecoveryContext.executeCleanup().catch(cleanupError => {
          console.error('Cleanup failed after device lost:', cleanupError);
        });
      });
    } catch (error) {
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
   * Set the ring buffer for command processing
   */
  setRingBuffer(ringBuffer: RingBuffer): void {
    this.ringBuffer = ringBuffer;
  }

  /**
   * Start the command loop
   */
  startCommandLoop(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.processCommands();
  }

  /**
   * Stop the command loop
   */
  stopCommandLoop(): void {
    this.isRunning = false;
  }

  /**
   * Command loop that processes commands from ring buffer
   */
  private async processCommands(): Promise<void> {
    while (this.isRunning) {
      if (!this.ringBuffer || this.ringBuffer.isEmpty()) {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1));
        continue;
      }

      const commandData = this.ringBuffer.read();
      if (commandData) {
        try {
          // Deserialize and dispatch command using protocol deserializer
          const command = deserializeCommand(commandData);
          this.dispatch(command);
        } catch (error) {
          // Log error with context
          if (error instanceof CommandExecutionError) {
            console.error('Command execution failed:', error.toUserMessage());
          } else {
            console.error('Error processing command:', error);
          }
        }
      }
    }
  }

  /**
   * Dispatch a command for execution
   * Translates abstract commands to WebGPU API calls
   * @throws {CommandExecutionError} if command execution fails
   * @throws {InvalidOpcodeError} if opcode is unknown
   */
  dispatch(command: CommandBuffer): void {
    if (!this.device) {
      throw new RuntimeError(
        'WebGPU device not initialized',
        { commandId: command.id }
      );
    }

    try {
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
          throw new InvalidOpcodeError(
            command.opcode,
            { commandId: command.id }
          );
      }
    } catch (error) {
      if (error instanceof InvalidOpcodeError || error instanceof CommandExecutionError) {
        throw error;
      }
      throw new CommandExecutionError(
        command.id,
        error instanceof Error ? error.message : String(error),
        { opcode: command.opcode, originalError: error }
      );
    }
  }

  /**
   * Handle CreateBuffer command
   * @throws {CommandExecutionError} if buffer creation fails
   */
  private handleCreateBuffer(command: CommandBuffer): void {
    if (!this.device) {
      throw new RuntimeError('Device not initialized', { commandId: command.id });
    }

    try {
      // Parse payload: [resourceId length (4 bytes)][resourceId][size (8 bytes)][usage (4 bytes)]
      const view = new DataView(command.payload.buffer, command.payload.byteOffset, command.payload.byteLength);
      let offset = 0;

      const idLength = view.getUint32(offset, true);
      offset += 4;
      const idBytes = command.payload.slice(offset, offset + idLength);
      const resourceId = new TextDecoder().decode(idBytes) as ResourceId;
      offset += idLength;

      const size = Number(view.getBigUint64(offset, true));
      offset += 8;

      const usage = view.getUint32(offset, true);

      // Create the GPU buffer
      const gpuBuffer = this.device.createBuffer({
        size,
        usage,
      });

      // Wrap and store in resource table
      const resource = new GPUResourceWrapper(resourceId, ResourceType.Buffer, gpuBuffer);
      this.resourceTable.set(resourceId, resource);
    } catch (error) {
      throw new CommandExecutionError(
        command.id,
        `Failed to create buffer: ${error instanceof Error ? error.message : String(error)}`,
        { opcode: command.opcode, originalError: error }
      );
    }
  }

  /**
   * Handle WriteBuffer command
   * @throws {CommandExecutionError} if buffer write fails
   * @throws {InvalidResourceError} if resource not found
   */
  private handleWriteBuffer(command: CommandBuffer): void {
    if (!this.device) {
      throw new RuntimeError('Device not initialized', { commandId: command.id });
    }

    try {
      // Parse payload: [resourceId length (4 bytes)][resourceId][offset (8 bytes)][data length (4 bytes)][data]
      const view = new DataView(command.payload.buffer, command.payload.byteOffset, command.payload.byteLength);
      let offset = 0;

      const idLength = view.getUint32(offset, true);
      offset += 4;
      const idBytes = command.payload.slice(offset, offset + idLength);
      const resourceId = new TextDecoder().decode(idBytes) as ResourceId;
      offset += idLength;

      const bufferOffset = Number(view.getBigUint64(offset, true));
      offset += 8;

      const dataLength = view.getUint32(offset, true);
      offset += 4;
      const data = command.payload.slice(offset, offset + dataLength);

      // Get the buffer from resource table
      const resource = this.resourceTable.get(resourceId);
      if (!resource || resource.type !== ResourceType.Buffer) {
        throw new InvalidResourceError(
          resourceId,
          'Buffer resource not found or wrong type',
          { expectedType: ResourceType.Buffer, actualType: resource?.type }
        );
      }

      const gpuBuffer = (resource as GPUResourceWrapper).getGPUResource() as GPUBuffer;
      this.device.queue.writeBuffer(gpuBuffer, bufferOffset, data);
    } catch (error) {
      if (error instanceof InvalidResourceError) {
        throw error;
      }
      throw new CommandExecutionError(
        command.id,
        `Failed to write buffer: ${error instanceof Error ? error.message : String(error)}`,
        { opcode: command.opcode, originalError: error }
      );
    }
  }

  /**
   * Handle Dispatch command (compute shader dispatch)
   */
  private handleDispatch(command: CommandBuffer): void {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    // Parse payload: [workgroupX (4)][workgroupY (4)][workgroupZ (4)][pipeline data...]
    const view = new DataView(command.payload.buffer, command.payload.byteOffset, command.payload.byteLength);
    
    const workgroupX = view.getUint32(0, true);
    const workgroupY = view.getUint32(4, true);
    const workgroupZ = view.getUint32(8, true);

    // For now, this is a simplified implementation
    // In a full implementation, would need to:
    // 1. Parse compute pipeline configuration
    // 2. Create/retrieve compute pipeline
    // 3. Create bind groups
    // 4. Encode and submit compute pass
    
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    
    // Would set pipeline and bind groups here
    // passEncoder.setPipeline(computePipeline);
    // passEncoder.setBindGroup(0, bindGroup);
    
    passEncoder.dispatchWorkgroups(workgroupX, workgroupY, workgroupZ);
    passEncoder.end();
    
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Handle ReadBuffer command (async readback)
   */
  private async handleReadBuffer(command: CommandBuffer): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    // Parse payload: [resourceId length (4 bytes)][resourceId][offset (8 bytes)][size (8 bytes)]
    const view = new DataView(command.payload.buffer, command.payload.byteOffset, command.payload.byteLength);
    let offset = 0;

    const idLength = view.getUint32(offset, true);
    offset += 4;
    const idBytes = command.payload.slice(offset, offset + idLength);
    const resourceId = new TextDecoder().decode(idBytes) as ResourceId;
    offset += idLength;

    const bufferOffset = Number(view.getBigUint64(offset, true));
    offset += 8;

    const size = Number(view.getBigUint64(offset, true));

    // Get the buffer from resource table
    const resource = this.resourceTable.get(resourceId);
    if (!resource || resource.type !== ResourceType.Buffer) {
      throw new Error(`Buffer resource not found: ${resourceId}`);
    }

    const gpuBuffer = (resource as GPUResourceWrapper).getGPUResource() as GPUBuffer;

    // Create staging buffer for readback
    const stagingBuffer = this.device.createBuffer({
      size,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Copy from GPU buffer to staging buffer
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(gpuBuffer, bufferOffset, stagingBuffer, 0, size);
    this.device.queue.submit([commandEncoder.finish()]);

    // Map and read the staging buffer
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = stagingBuffer.getMappedRange();
    const data = new Uint8Array(arrayBuffer).slice(); // Copy the data
    stagingBuffer.unmap();
    stagingBuffer.destroy();

    // In a full implementation, would send this data back through a response channel
    // For now, just log it
    console.log('Read buffer data:', data);
  }

  /**
   * Get the resource table
   */
  getResourceTable(): ResourceTable {
    return this.resourceTable;
  }

  /**
   * Get the GPU device (for testing/debugging)
   */
  getDevice(): GPUDevice | null {
    return this.device;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.stopCommandLoop();
    
    try {
      await this.errorRecoveryContext.executeCleanup();
    } catch (error) {
      console.error('Error during disposal:', error);
    }
  }

  /**
   * Get error recovery context
   */
  getErrorRecoveryContext(): ErrorRecoveryContext {
    return this.errorRecoveryContext;
  }
}
