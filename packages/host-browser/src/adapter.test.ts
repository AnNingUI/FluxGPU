import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserHost } from './adapter.js';

// Mock navigator.gpu
const mockGPU = {
  requestAdapter: vi.fn(),
};

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  postMessage = vi.fn();
  terminate = vi.fn();

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
}

describe('BrowserHost', () => {
  let originalNavigator: any;
  let originalWorker: any;
  let createdWorkers: MockWorker[] = [];

  beforeEach(() => {
    // Save originals
    originalNavigator = globalThis.navigator;
    originalWorker = globalThis.Worker;
    createdWorkers = [];

    // Setup global mocks using Object.defineProperty
    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: mockGPU },
      writable: true,
      configurable: true,
    });
    
    // Create a factory function that tracks created workers
    const WorkerFactory = function(this: MockWorker, url: string) {
      const worker = new MockWorker();
      createdWorkers.push(worker);
      return worker;
    } as any;
    WorkerFactory.prototype = MockWorker.prototype;
    
    Object.defineProperty(globalThis, 'Worker', {
      value: WorkerFactory,
      writable: true,
      configurable: true,
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(globalThis, 'Worker', {
      value: originalWorker,
      writable: true,
      configurable: true,
    });
  });

  describe('Feature Detection', () => {
    it('should detect WebGPU support', () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      expect(host.supportsFeature('webgpu')).toBe(true);
    });

    it('should detect SharedArrayBuffer support', () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      expect(host.supportsFeature('sharedarraybuffer')).toBe(true);
    });

    it('should detect Workers support', () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      expect(host.supportsFeature('workers')).toBe(true);
    });

    it('should detect Atomics support', () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      expect(host.supportsFeature('atomics')).toBe(true);
    });

    it('should return false for unsupported features', () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      expect(host.supportsFeature('unknown-feature')).toBe(false);
    });

    it('should return false for WebGPU when not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      expect(host.supportsFeature('webgpu')).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with all required features', async () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      // Simulate worker initialization response
      const initPromise = host.initialize();
      
      // Wait a bit for worker creation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Get the worker manager and simulate initialization response
      const workerManager = host.getWorkerManager();
      expect(workerManager).not.toBeNull();
      
      const workerIds = workerManager!.getWorkerIds();
      expect(workerIds.length).toBe(1);
      
      // Simulate worker responding to initialization
      expect(createdWorkers.length).toBe(1);
      createdWorkers[0].simulateMessage({
        type: 'response',
        payload: { initialized: true },
      });
      
      await initPromise;
      
      expect(host.isInitialized()).toBe(true);
    });

    it('should throw error when WebGPU is not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      await expect(host.initialize()).rejects.toThrow('WebGPU is not supported');
    });

    it('should throw error when SharedArrayBuffer is not supported', async () => {
      const originalSAB = globalThis.SharedArrayBuffer;
      Object.defineProperty(globalThis, 'SharedArrayBuffer', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      await expect(host.initialize()).rejects.toThrow('SharedArrayBuffer is not supported');
      
      // Restore
      Object.defineProperty(globalThis, 'SharedArrayBuffer', {
        value: originalSAB,
        writable: true,
        configurable: true,
      });
    });

    it('should not reinitialize if already initialized', async () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      // First initialization
      const initPromise1 = host.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createdWorkers.length).toBe(1);
      createdWorkers[0].simulateMessage({ type: 'response' });
      await initPromise1;
      
      const workerCountBefore = createdWorkers.length;
      
      // Second initialization should not create new workers
      await host.initialize();
      const workerCountAfter = createdWorkers.length;
      
      expect(workerCountAfter).toBe(workerCountBefore);
    });
  });

  describe('Executor Creation', () => {
    it('should throw error when creating executor before initialization', () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      expect(() => host.createExecutor()).toThrow('must be initialized');
    });

    it('should create executor after initialization', async () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      const initPromise = host.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createdWorkers.length).toBe(1);
      createdWorkers[0].simulateMessage({ type: 'response' });
      await initPromise;
      
      const executor = host.createExecutor();
      expect(executor).toBeDefined();
      expect(executor.dispatch).toBeDefined();
      expect(executor.getResourceTable).toBeDefined();
    });

    it('should create multiple executors', async () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      const initPromise = host.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createdWorkers.length).toBe(1);
      createdWorkers[0].simulateMessage({ type: 'response' });
      await initPromise;
      
      const executor1 = host.createExecutor();
      const executor2 = host.createExecutor();
      
      expect(executor1).toBeDefined();
      expect(executor2).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', async () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      const initPromise = host.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createdWorkers.length).toBe(1);
      createdWorkers[0].simulateMessage({ type: 'response' });
      await initPromise;
      
      const workerManager = host.getWorkerManager();
      expect(workerManager).not.toBeNull();
    });

    it('should use custom configuration values', async () => {
      const host = new BrowserHost({
        workerUrl: '/custom-worker.js',
        maxWorkers: 4,
        ringBufferSize: 2048 * 1024,
      });
      
      const initPromise = host.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createdWorkers.length).toBe(1);
      createdWorkers[0].simulateMessage({ type: 'response' });
      await initPromise;
      
      expect(host.isInitialized()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources', async () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      const initPromise = host.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createdWorkers.length).toBe(1);
      createdWorkers[0].simulateMessage({ type: 'response' });
      await initPromise;
      
      expect(host.isInitialized()).toBe(true);
      
      host.dispose();
      
      expect(host.isInitialized()).toBe(false);
      expect(host.getWorkerManager()).toBeNull();
    });

    it('should handle dispose when not initialized', () => {
      const host = new BrowserHost({ workerUrl: '/worker.js' });
      
      expect(() => host.dispose()).not.toThrow();
    });
  });
});
