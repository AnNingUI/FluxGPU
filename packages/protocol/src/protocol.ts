import { CommandBuffer, CommandId, Opcode } from '@fluxgpu/contracts';
import { 
  SerializationError, 
  DeserializationError, 
  BufferOverflowError,
  CorruptedMessageError 
} from '@fluxgpu/contracts';

// Re-export Command interface from contracts as Command for convenience
export type Command = CommandBuffer;

// Memory layout constants for SharedArrayBuffer
export const COMMAND_HEADER_SIZE = 24; // bytes
export const COMMAND_ID_OFFSET = 0;
export const OPCODE_OFFSET = 8;
export const PAYLOAD_LENGTH_OFFSET = 12;
export const DEPENDENCIES_COUNT_OFFSET = 16;
export const DEPENDENCIES_OFFSET = 20;

// RingBuffer constants
const BUFFER_START_OFFSET = 8;

/**
 * Serializes a Command to a Uint8Array for binary transmission
 * @throws {SerializationError} if serialization fails
 */
export function serializeCommand(command: Command): Uint8Array {
  try {
    const encoder = new TextEncoder();
    
    // Validate command
    if (!command.id) {
      throw new SerializationError('Command ID is required', { command });
    }
    
    // Encode command ID
    const idBytes = encoder.encode(command.id);
    
    // Calculate total size
    const dependenciesBytes = command.dependencies.map((dep: CommandId) => encoder.encode(dep));
    const totalDepsSize = dependenciesBytes.reduce((sum: number, bytes: Uint8Array) => sum + bytes.length + 4, 0); // +4 for length prefix
    const totalSize = COMMAND_HEADER_SIZE + idBytes.length + command.payload.length + totalDepsSize;
    
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);
    
    let offset = 0;
    
    // Write command ID length and data
    view.setUint32(offset, idBytes.length, true);
    offset += 4;
    buffer.set(idBytes, offset);
    offset += idBytes.length;
    
    // Write opcode
    view.setUint32(offset, command.opcode, true);
    offset += 4;
    
    // Write payload length and data
    view.setUint32(offset, command.payload.length, true);
    offset += 4;
    buffer.set(command.payload, offset);
    offset += command.payload.length;
    
    // Write dependencies count
    view.setUint32(offset, command.dependencies.length, true);
    offset += 4;
    
    // Write each dependency
    for (const depBytes of dependenciesBytes) {
      view.setUint32(offset, depBytes.length, true);
      offset += 4;
      buffer.set(depBytes, offset);
      offset += depBytes.length;
    }
    
    return buffer;
  } catch (error) {
    if (error instanceof SerializationError) {
      throw error;
    }
    throw new SerializationError(
      error instanceof Error ? error.message : String(error),
      { command, originalError: error }
    );
  }
}

/**
 * Deserializes a Uint8Array back to a Command
 * @throws {DeserializationError} if deserialization fails
 * @throws {CorruptedMessageError} if message is corrupted
 */
export function deserializeCommand(buffer: Uint8Array): Command {
  try {
    if (!buffer || buffer.length < COMMAND_HEADER_SIZE) {
      throw new CorruptedMessageError(
        'Buffer too small for command header',
        { bufferLength: buffer?.length || 0, requiredMinimum: COMMAND_HEADER_SIZE }
      );
    }

    const decoder = new TextDecoder();
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    
    let offset = 0;
    
    // Read command ID
    const idLength = view.getUint32(offset, true);
    offset += 4;
    
    if (offset + idLength > buffer.length) {
      throw new CorruptedMessageError(
        'Command ID length exceeds buffer size',
        { idLength, bufferLength: buffer.length, offset }
      );
    }
    
    const idBytes = buffer.slice(offset, offset + idLength);
    const id = decoder.decode(idBytes) as CommandId;
    offset += idLength;
    
    // Read opcode
    if (offset + 4 > buffer.length) {
      throw new CorruptedMessageError(
        'Buffer too small for opcode',
        { bufferLength: buffer.length, offset }
      );
    }
    const opcode = view.getUint32(offset, true) as Opcode;
    offset += 4;
    
    // Read payload
    if (offset + 4 > buffer.length) {
      throw new CorruptedMessageError(
        'Buffer too small for payload length',
        { bufferLength: buffer.length, offset }
      );
    }
    const payloadLength = view.getUint32(offset, true);
    offset += 4;
    
    if (offset + payloadLength > buffer.length) {
      throw new CorruptedMessageError(
        'Payload length exceeds buffer size',
        { payloadLength, bufferLength: buffer.length, offset }
      );
    }
    const payload = buffer.slice(offset, offset + payloadLength);
    offset += payloadLength;
    
    // Read dependencies
    if (offset + 4 > buffer.length) {
      throw new CorruptedMessageError(
        'Buffer too small for dependencies count',
        { bufferLength: buffer.length, offset }
      );
    }
    const depsCount = view.getUint32(offset, true);
    offset += 4;
    
    const dependencies: CommandId[] = [];
    for (let i = 0; i < depsCount; i++) {
      if (offset + 4 > buffer.length) {
        throw new CorruptedMessageError(
          `Buffer too small for dependency ${i} length`,
          { dependencyIndex: i, bufferLength: buffer.length, offset }
        );
      }
      const depLength = view.getUint32(offset, true);
      offset += 4;
      
      if (offset + depLength > buffer.length) {
        throw new CorruptedMessageError(
          `Dependency ${i} length exceeds buffer size`,
          { dependencyIndex: i, depLength, bufferLength: buffer.length, offset }
        );
      }
      const depBytes = buffer.slice(offset, offset + depLength);
      dependencies.push(decoder.decode(depBytes) as CommandId);
      offset += depLength;
    }
    
    return {
      id,
      opcode,
      payload,
      dependencies,
    };
  } catch (error) {
    if (error instanceof CorruptedMessageError || error instanceof DeserializationError) {
      throw error;
    }
    throw new DeserializationError(
      error instanceof Error ? error.message : String(error),
      { bufferLength: buffer?.length, originalError: error }
    );
  }
}

/**
 * Lock-free ring buffer using SharedArrayBuffer and Atomics
 * Supports single producer, single consumer pattern
 */
export class RingBuffer {
  private controlBuffer: Int32Array;
  private dataBuffer: Uint8Array;
  private capacity: number;

  /**
   * Creates a new RingBuffer
   * @param sharedBuffer SharedArrayBuffer to use for the ring buffer
   * @param capacity Maximum number of bytes that can be stored (excluding control data)
   */
  constructor(sharedBuffer: SharedArrayBuffer, capacity: number) {
    // First 8 bytes for read/write indices
    this.controlBuffer = new Int32Array(sharedBuffer, 0, 2);
    // Remaining bytes for data
    this.dataBuffer = new Uint8Array(sharedBuffer, BUFFER_START_OFFSET, capacity);
    this.capacity = capacity;
    
    // Initialize indices to 0
    Atomics.store(this.controlBuffer, 0, 0); // read index
    Atomics.store(this.controlBuffer, 1, 0); // write index
  }

  /**
   * Writes data to the ring buffer
   * @returns true if write succeeded, false if buffer is full
   * @throws {BufferOverflowError} if data is too large for buffer capacity
   */
  write(data: Uint8Array): boolean {
    const required = 4 + data.length;
    
    // Check if data can ever fit in the buffer
    if (required > this.capacity) {
      throw new BufferOverflowError(
        required,
        this.capacity,
        { dataLength: data.length, capacity: this.capacity }
      );
    }

    const writeIndex = Atomics.load(this.controlBuffer, 1);
    const readIndex = Atomics.load(this.controlBuffer, 0);
    
    // Calculate available space
    const available = readIndex <= writeIndex
      ? this.capacity - (writeIndex - readIndex)
      : readIndex - writeIndex;
    
    if (available < required) {
      return false; // Buffer full
    }
    
    // Write length prefix
    const lengthPos = writeIndex % this.capacity;
    
    // Handle wrap-around for length
    for (let i = 0; i < 4; i++) {
      const pos = (lengthPos + i) % this.capacity;
      const byte = (data.length >> (i * 8)) & 0xff;
      this.dataBuffer[pos] = byte;
    }
    
    // Write data
    let dataWritePos = (writeIndex + 4) % this.capacity;
    for (let i = 0; i < data.length; i++) {
      this.dataBuffer[dataWritePos] = data[i];
      dataWritePos = (dataWritePos + 1) % this.capacity;
    }
    
    // Update write index atomically
    Atomics.store(this.controlBuffer, 1, (writeIndex + required) % this.capacity);
    
    return true;
  }

  /**
   * Reads data from the ring buffer
   * @returns Uint8Array if data available, null if buffer is empty
   */
  read(): Uint8Array | null {
    const readIndex = Atomics.load(this.controlBuffer, 0);
    const writeIndex = Atomics.load(this.controlBuffer, 1);
    
    if (readIndex === writeIndex) {
      return null; // Buffer empty
    }
    
    // Read length prefix
    const lengthPos = readIndex % this.capacity;
    let length = 0;
    for (let i = 0; i < 4; i++) {
      const pos = (lengthPos + i) % this.capacity;
      length |= this.dataBuffer[pos] << (i * 8);
    }
    
    // Read data
    const result = new Uint8Array(length);
    let dataReadPos = (readIndex + 4) % this.capacity;
    for (let i = 0; i < length; i++) {
      result[i] = this.dataBuffer[dataReadPos];
      dataReadPos = (dataReadPos + 1) % this.capacity;
    }
    
    // Update read index atomically
    Atomics.store(this.controlBuffer, 0, (readIndex + 4 + length) % this.capacity);
    
    return result;
  }

  /**
   * Returns the number of bytes available for reading
   */
  available(): number {
    const writeIndex = Atomics.load(this.controlBuffer, 1);
    const readIndex = Atomics.load(this.controlBuffer, 0);
    
    if (writeIndex >= readIndex) {
      return writeIndex - readIndex;
    } else {
      return this.capacity - (readIndex - writeIndex);
    }
  }

  /**
   * Checks if the buffer is empty
   */
  isEmpty(): boolean {
    const readIndex = Atomics.load(this.controlBuffer, 0);
    const writeIndex = Atomics.load(this.controlBuffer, 1);
    return readIndex === writeIndex;
  }

  /**
   * Returns the capacity of the ring buffer
   */
  getCapacity(): number {
    return this.capacity;
  }
}
