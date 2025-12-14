import { describe, it, expect } from 'vitest';
import { serializeCommand, deserializeCommand, RingBuffer, Command } from './protocol.js';
import { CommandId, Opcode } from '@flux/contracts';

describe('Protocol Serialization', () => {
  it('should serialize and deserialize a simple command', () => {
    const command: Command = {
      id: 'cmd-123' as CommandId,
      opcode: Opcode.CreateBuffer,
      payload: new Uint8Array([1, 2, 3, 4]),
      dependencies: [],
    };

    const serialized = serializeCommand(command);
    const deserialized = deserializeCommand(serialized);

    expect(deserialized.id).toBe(command.id);
    expect(deserialized.opcode).toBe(command.opcode);
    expect(deserialized.payload).toEqual(command.payload);
    expect(deserialized.dependencies).toEqual(command.dependencies);
  });

  it('should serialize and deserialize a command with dependencies', () => {
    const command: Command = {
      id: 'cmd-456' as CommandId,
      opcode: Opcode.Dispatch,
      payload: new Uint8Array([10, 20, 30]),
      dependencies: ['cmd-123' as CommandId, 'cmd-789' as CommandId],
    };

    const serialized = serializeCommand(command);
    const deserialized = deserializeCommand(serialized);

    expect(deserialized.id).toBe(command.id);
    expect(deserialized.opcode).toBe(command.opcode);
    expect(deserialized.payload).toEqual(command.payload);
    expect(deserialized.dependencies).toEqual(command.dependencies);
  });

  it('should handle empty payload', () => {
    const command: Command = {
      id: 'cmd-empty' as CommandId,
      opcode: Opcode.ReadBuffer,
      payload: new Uint8Array([]),
      dependencies: [],
    };

    const serialized = serializeCommand(command);
    const deserialized = deserializeCommand(serialized);

    expect(deserialized.id).toBe(command.id);
    expect(deserialized.payload.length).toBe(0);
  });
});

describe('RingBuffer', () => {
  it('should write and read data', () => {
    const bufferSize = 1024;
    const sharedBuffer = new SharedArrayBuffer(bufferSize + 8);
    const ringBuffer = new RingBuffer(sharedBuffer, bufferSize);

    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const writeSuccess = ringBuffer.write(data);
    expect(writeSuccess).toBe(true);

    const readData = ringBuffer.read();
    expect(readData).toEqual(data);
  });

  it('should handle multiple writes and reads', () => {
    const bufferSize = 1024;
    const sharedBuffer = new SharedArrayBuffer(bufferSize + 8);
    const ringBuffer = new RingBuffer(sharedBuffer, bufferSize);

    const data1 = new Uint8Array([1, 2, 3]);
    const data2 = new Uint8Array([4, 5, 6, 7]);
    const data3 = new Uint8Array([8, 9]);

    ringBuffer.write(data1);
    ringBuffer.write(data2);
    ringBuffer.write(data3);

    expect(ringBuffer.read()).toEqual(data1);
    expect(ringBuffer.read()).toEqual(data2);
    expect(ringBuffer.read()).toEqual(data3);
  });

  it('should return null when buffer is empty', () => {
    const bufferSize = 1024;
    const sharedBuffer = new SharedArrayBuffer(bufferSize + 8);
    const ringBuffer = new RingBuffer(sharedBuffer, bufferSize);

    expect(ringBuffer.read()).toBeNull();
    expect(ringBuffer.isEmpty()).toBe(true);
  });

  it('should return false when buffer is full', () => {
    const bufferSize = 32;
    const sharedBuffer = new SharedArrayBuffer(bufferSize + 8);
    const ringBuffer = new RingBuffer(sharedBuffer, bufferSize);

    // Fill the buffer
    const largeData = new Uint8Array(24);
    const success = ringBuffer.write(largeData);
    expect(success).toBe(true);

    // Try to write more data than available space
    const moreData = new Uint8Array(10);
    const failedWrite = ringBuffer.write(moreData);
    expect(failedWrite).toBe(false);
  });

  it('should handle wrap-around correctly', () => {
    const bufferSize = 64;
    const sharedBuffer = new SharedArrayBuffer(bufferSize + 8);
    const ringBuffer = new RingBuffer(sharedBuffer, bufferSize);

    // Write and read to move pointers forward
    for (let i = 0; i < 5; i++) {
      const data = new Uint8Array([i, i + 1, i + 2]);
      ringBuffer.write(data);
      ringBuffer.read();
    }

    // Now write data that will wrap around
    const wrapData = new Uint8Array([100, 101, 102, 103]);
    ringBuffer.write(wrapData);
    const readData = ringBuffer.read();
    expect(readData).toEqual(wrapData);
  });
});
