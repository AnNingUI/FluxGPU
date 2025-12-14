// Resource Composition Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { ShadowStateManager } from './shadow-state.js';
import {
  createBuffer,
  withDoubleBuffering,
  withHostSync,
  withPersistence,
  type IStorage,
  type BufferHandle,
} from './resource.js';
import type { ResourceId } from '@fluxgpu/contracts';

describe('Resource Composition Utilities', () => {
  let manager: ShadowStateManager;

  beforeEach(() => {
    manager = new ShadowStateManager();
  });

  describe('createBuffer', () => {
    it('should create a raw buffer handle', () => {
      const buffer = createBuffer(manager, 1024, 0x80); // 0x80 = COPY_DST

      expect(buffer).toBeDefined();
      expect(buffer.size).toBe(1024);
      expect(buffer.usage).toBe(0x80);
      expect(buffer.id).toBeDefined();
    });

    it('should create buffers with different sizes', () => {
      const buffer1 = createBuffer(manager, 512, 0x80);
      const buffer2 = createBuffer(manager, 2048, 0x80);

      expect(buffer1.size).toBe(512);
      expect(buffer2.size).toBe(2048);
      expect(buffer1.id).not.toBe(buffer2.id);
    });

    it('should track created buffer in shadow state', () => {
      const buffer = createBuffer(manager, 1024, 0x80);

      expect(manager.hasResource(buffer.id)).toBe(true);
      const resource = manager.getResource(buffer.id);
      expect(resource).toBeDefined();
      expect(resource?.size).toBe(1024);
    });
  });

  describe('withDoubleBuffering', () => {
    it('should add double buffering capability', () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const doubleBuffered = withDoubleBuffering(manager, buffer);

      expect(doubleBuffered.frontBuffer).toBeDefined();
      expect(doubleBuffered.backBuffer).toBeDefined();
      expect(doubleBuffered.frontBuffer).not.toBe(doubleBuffered.backBuffer);
    });

    it('should start with front buffer as current', () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const doubleBuffered = withDoubleBuffering(manager, buffer);

      expect(doubleBuffered.getCurrentBuffer()).toBe(doubleBuffered.frontBuffer);
    });

    it('should swap between front and back buffers', () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const doubleBuffered = withDoubleBuffering(manager, buffer);

      const initialCurrent = doubleBuffered.getCurrentBuffer();
      expect(initialCurrent).toBe(doubleBuffered.frontBuffer);

      doubleBuffered.swap();
      expect(doubleBuffered.getCurrentBuffer()).toBe(doubleBuffered.backBuffer);

      doubleBuffered.swap();
      expect(doubleBuffered.getCurrentBuffer()).toBe(doubleBuffered.frontBuffer);
    });

    it('should preserve original buffer properties', () => {
      const buffer = createBuffer(manager, 2048, 0x40);
      const doubleBuffered = withDoubleBuffering(manager, buffer);

      expect(doubleBuffered.size).toBe(2048);
      expect(doubleBuffered.usage).toBe(0x40);
      expect(doubleBuffered.id).toBe(buffer.id);
    });

    it('should create back buffer with same properties', () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const doubleBuffered = withDoubleBuffering(manager, buffer);

      const backResource = manager.getResource(doubleBuffered.backBuffer);
      expect(backResource).toBeDefined();
      expect(backResource?.size).toBe(1024);
      expect(backResource?.usage).toBe(0x80);
    });
  });

  describe('withHostSync', () => {
    it('should add readback capability', () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const syncBuffer = withHostSync(buffer);

      expect(syncBuffer.readback).toBeDefined();
      expect(typeof syncBuffer.readback).toBe('function');
    });

    it('should preserve original buffer properties', () => {
      const buffer = createBuffer(manager, 2048, 0x40);
      const syncBuffer = withHostSync(buffer);

      expect(syncBuffer.size).toBe(2048);
      expect(syncBuffer.usage).toBe(0x40);
      expect(syncBuffer.id).toBe(buffer.id);
    });

    it('should use custom readback function when provided', async () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const testData = new ArrayBuffer(1024);
      
      const customReadback = async (id: ResourceId): Promise<ArrayBuffer> => {
        expect(id).toBe(buffer.id);
        return testData;
      };

      const syncBuffer = withHostSync(buffer, customReadback);
      const result = await syncBuffer.readback();

      expect(result).toBe(testData);
    });

    it('should throw error when no readback function provided', async () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const syncBuffer = withHostSync(buffer);

      await expect(syncBuffer.readback()).rejects.toThrow();
    });
  });

  describe('withPersistence', () => {
    let mockStorage: IStorage;
    let storedData: Map<string, ArrayBuffer>;

    beforeEach(() => {
      storedData = new Map();
      mockStorage = {
        async set(key: string, data: ArrayBuffer): Promise<void> {
          storedData.set(key, data);
        },
        async get(key: string): Promise<ArrayBuffer | null> {
          return storedData.get(key) || null;
        },
        async has(key: string): Promise<boolean> {
          return storedData.has(key);
        },
        async delete(key: string): Promise<boolean> {
          return storedData.delete(key);
        },
      };
    });

    it('should add save and load capabilities', () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const persistent = withPersistence(buffer, mockStorage);

      expect(persistent.save).toBeDefined();
      expect(persistent.load).toBeDefined();
      expect(typeof persistent.save).toBe('function');
      expect(typeof persistent.load).toBe('function');
    });

    it('should preserve original buffer properties', () => {
      const buffer = createBuffer(manager, 2048, 0x40);
      const persistent = withPersistence(buffer, mockStorage);

      expect(persistent.size).toBe(2048);
      expect(persistent.usage).toBe(0x40);
      expect(persistent.id).toBe(buffer.id);
    });

    it('should save data using readback and storage', async () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const testData = new ArrayBuffer(1024);
      
      const readbackFn = async (id: ResourceId): Promise<ArrayBuffer> => {
        expect(id).toBe(buffer.id);
        return testData;
      };

      const persistent = withPersistence(buffer, mockStorage, readbackFn);
      await persistent.save('test-key');

      expect(storedData.has('test-key')).toBe(true);
      expect(storedData.get('test-key')).toBe(testData);
    });

    it('should load data from storage and upload', async () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const testData = new ArrayBuffer(1024);
      storedData.set('test-key', testData);

      let uploadedData: ArrayBuffer | null = null;
      let uploadedId: ResourceId | null = null;

      const uploadFn = async (id: ResourceId, data: ArrayBuffer): Promise<void> => {
        uploadedId = id;
        uploadedData = data;
      };

      const persistent = withPersistence(buffer, mockStorage, undefined, uploadFn);
      await persistent.load('test-key');

      expect(uploadedId).toBe(buffer.id);
      expect(uploadedData).toBe(testData);
    });

    it('should throw error when loading non-existent key', async () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const persistent = withPersistence(buffer, mockStorage);

      await expect(persistent.load('non-existent')).rejects.toThrow('No data found for key: non-existent');
    });
  });

  describe('Wrapper Composition', () => {
    it('should compose double buffering with host sync', () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const doubleBuffered = withDoubleBuffering(manager, buffer);
      const composed = withHostSync(doubleBuffered);

      // Should have both capabilities
      expect(composed.swap).toBeDefined();
      expect(composed.getCurrentBuffer).toBeDefined();
      expect(composed.readback).toBeDefined();

      // Should preserve properties
      expect(composed.size).toBe(1024);
      expect(composed.id).toBe(buffer.id);
    });

    it('should compose host sync with persistence', async () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const testData = new ArrayBuffer(1024);
      const storedData = new Map<string, ArrayBuffer>();

      const mockStorage: IStorage = {
        async set(key: string, data: ArrayBuffer): Promise<void> {
          storedData.set(key, data);
        },
        async get(key: string): Promise<ArrayBuffer | null> {
          return storedData.get(key) || null;
        },
        async has(key: string): Promise<boolean> {
          return storedData.has(key);
        },
        async delete(key: string): Promise<boolean> {
          return storedData.delete(key);
        },
      };

      const readbackFn = async (): Promise<ArrayBuffer> => testData;
      const uploadFn = async (): Promise<void> => {};

      const syncBuffer = withHostSync(buffer, readbackFn);
      const composed = withPersistence(syncBuffer, mockStorage, readbackFn, uploadFn);

      // Should have both capabilities
      expect(composed.readback).toBeDefined();
      expect(composed.save).toBeDefined();
      expect(composed.load).toBeDefined();

      // Should work correctly
      await composed.save('test');
      expect(storedData.has('test')).toBe(true);
    });

    it('should compose all three wrappers', async () => {
      const buffer = createBuffer(manager, 1024, 0x80);
      const testData = new ArrayBuffer(1024);
      const storedData = new Map<string, ArrayBuffer>();

      const mockStorage: IStorage = {
        async set(key: string, data: ArrayBuffer): Promise<void> {
          storedData.set(key, data);
        },
        async get(key: string): Promise<ArrayBuffer | null> {
          return storedData.get(key) || null;
        },
        async has(key: string): Promise<boolean> {
          return storedData.has(key);
        },
        async delete(key: string): Promise<boolean> {
          return storedData.delete(key);
        },
      };

      const readbackFn = async (): Promise<ArrayBuffer> => testData;
      const uploadFn = async (): Promise<void> => {};

      // Compose all three wrappers
      const doubleBuffered = withDoubleBuffering(manager, buffer);
      const withSync = withHostSync(doubleBuffered, readbackFn);
      const fullyComposed = withPersistence(withSync, mockStorage, readbackFn, uploadFn);

      // Should have all capabilities
      expect(fullyComposed.swap).toBeDefined();
      expect(fullyComposed.getCurrentBuffer).toBeDefined();
      expect(fullyComposed.readback).toBeDefined();
      expect(fullyComposed.save).toBeDefined();
      expect(fullyComposed.load).toBeDefined();

      // All capabilities should work
      fullyComposed.swap();
      expect(fullyComposed.getCurrentBuffer()).toBe(doubleBuffered.backBuffer);

      const readData = await fullyComposed.readback();
      expect(readData).toBe(testData);

      await fullyComposed.save('composed-test');
      expect(storedData.has('composed-test')).toBe(true);
    });

    it('should preserve properties through multiple compositions', () => {
      const buffer = createBuffer(manager, 2048, 0x40);
      const storedData = new Map<string, ArrayBuffer>();

      const mockStorage: IStorage = {
        async set(key: string, data: ArrayBuffer): Promise<void> {
          storedData.set(key, data);
        },
        async get(key: string): Promise<ArrayBuffer | null> {
          return storedData.get(key) || null;
        },
        async has(key: string): Promise<boolean> {
          return storedData.has(key);
        },
        async delete(key: string): Promise<boolean> {
          return storedData.delete(key);
        },
      };

      const composed = withPersistence(
        withHostSync(
          withDoubleBuffering(manager, buffer)
        ),
        mockStorage
      );

      expect(composed.size).toBe(2048);
      expect(composed.usage).toBe(0x40);
      expect(composed.id).toBe(buffer.id);
    });
  });
});
