import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkerManager, WorkerMessageType } from './worker-manager.js';

// Mock Worker class for testing
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  
  postMessage = vi.fn();
  terminate = vi.fn();
  
  // Helper to simulate receiving a message
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
  
  // Helper to simulate an error
  simulateError(message: string) {
    if (this.onerror) {
      const error = {
        message,
        filename: 'test.js',
        lineno: 1,
        colno: 1,
      } as ErrorEvent;
      this.onerror(error);
    }
  }
}

// Mock Worker constructor
global.Worker = MockWorker as any;

describe('WorkerManager', () => {
  let workerManager: WorkerManager;
  
  beforeEach(() => {
    workerManager = new WorkerManager({
      workerUrl: '/worker.js',
      maxWorkers: 2,
      ringBufferSize: 1024,
    });
  });
  
  afterEach(() => {
    workerManager.terminateAll();
  });
  
  describe('Worker Creation', () => {
    it('should create a worker with unique ID', () => {
      const workerId = workerManager.createWorker();
      
      expect(workerId).toBe('worker-0');
      expect(workerManager.isWorkerActive(workerId)).toBe(true);
      expect(workerManager.getActiveWorkerCount()).toBe(1);
    });
    
    it('should create multiple workers with sequential IDs', () => {
      const workerId1 = workerManager.createWorker();
      const workerId2 = workerManager.createWorker();
      
      expect(workerId1).toBe('worker-0');
      expect(workerId2).toBe('worker-1');
      expect(workerManager.getActiveWorkerCount()).toBe(2);
    });
    
    it('should throw error when max workers limit is reached', () => {
      workerManager.createWorker();
      workerManager.createWorker();
      
      expect(() => workerManager.createWorker()).toThrow('Maximum number of workers (2) reached');
    });
    
    it('should provide ring buffer for each worker', () => {
      const workerId = workerManager.createWorker();
      const ringBuffer = workerManager.getRingBuffer(workerId);
      
      expect(ringBuffer).toBeDefined();
      expect(ringBuffer.getCapacity()).toBe(1024);
    });
  });
  
  describe('Worker Lifecycle', () => {
    it('should terminate a worker', () => {
      const workerId = workerManager.createWorker();
      
      workerManager.terminateWorker(workerId);
      
      expect(workerManager.isWorkerActive(workerId)).toBe(false);
      expect(workerManager.getActiveWorkerCount()).toBe(0);
    });
    
    it('should terminate all workers', () => {
      const workerId1 = workerManager.createWorker();
      const workerId2 = workerManager.createWorker();
      
      workerManager.terminateAll();
      
      expect(workerManager.isWorkerActive(workerId1)).toBe(false);
      expect(workerManager.isWorkerActive(workerId2)).toBe(false);
      expect(workerManager.getActiveWorkerCount()).toBe(0);
    });
    
    it('should handle terminating non-existent worker gracefully', () => {
      expect(() => workerManager.terminateWorker('non-existent')).not.toThrow();
    });
  });
  
  describe('Message Routing', () => {
    it('should post message to worker', () => {
      const workerId = workerManager.createWorker();
      const message = { type: WorkerMessageType.Command, payload: { test: 'data' } };
      
      // Get the mock worker instance
      const workers = (workerManager as any).workers;
      const managedWorker = workers.get(workerId);
      const postMessageSpy = managedWorker.worker.postMessage;
      
      workerManager.postMessage(workerId, message);
      
      expect(postMessageSpy).toHaveBeenCalledWith(message, []);
    });
    
    it('should throw error when posting to non-existent worker', () => {
      expect(() => {
        workerManager.postMessage('non-existent', { type: WorkerMessageType.Command });
      }).toThrow('Worker non-existent not found');
    });
    
    it('should throw error when posting to inactive worker', () => {
      const workerId = workerManager.createWorker();
      workerManager.terminateWorker(workerId);
      
      expect(() => {
        workerManager.postMessage(workerId, { type: WorkerMessageType.Command });
      }).toThrow('Worker worker-0 not found');
    });
    
    it('should route messages from worker to handlers', () => {
      const workerId = workerManager.createWorker();
      const handler = vi.fn();
      
      workerManager.onMessage(workerId, 'test-handler', handler);
      
      // Get the mock worker and simulate a message
      const workers = (workerManager as any).workers;
      const managedWorker = workers.get(workerId);
      managedWorker.worker.simulateMessage({ type: WorkerMessageType.Response, payload: 'test' });
      
      expect(handler).toHaveBeenCalledWith({ type: WorkerMessageType.Response, payload: 'test' });
    });
    
    it('should support multiple message handlers', () => {
      const workerId = workerManager.createWorker();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      workerManager.onMessage(workerId, 'handler1', handler1);
      workerManager.onMessage(workerId, 'handler2', handler2);
      
      const workers = (workerManager as any).workers;
      const managedWorker = workers.get(workerId);
      managedWorker.worker.simulateMessage({ type: WorkerMessageType.Response });
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
    
    it('should unregister message handlers', () => {
      const workerId = workerManager.createWorker();
      const handler = vi.fn();
      
      workerManager.onMessage(workerId, 'test-handler', handler);
      workerManager.offMessage(workerId, 'test-handler');
      
      const workers = (workerManager as any).workers;
      const managedWorker = workers.get(workerId);
      managedWorker.worker.simulateMessage({ type: WorkerMessageType.Response });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle worker errors and mark worker as inactive', () => {
      const workerId = workerManager.createWorker();
      const errorHandler = vi.fn();
      
      workerManager.onMessage(workerId, 'error-handler', errorHandler);
      
      const workers = (workerManager as any).workers;
      const managedWorker = workers.get(workerId);
      managedWorker.worker.simulateError('Test error');
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: WorkerMessageType.Error,
          payload: expect.objectContaining({
            message: 'Test error',
          }),
        })
      );
      
      // Worker should be auto-terminated after error
      expect(workerManager.isWorkerActive(workerId)).toBe(false);
    });
    
    it('should handle errors in message handlers gracefully', () => {
      const workerId = workerManager.createWorker();
      const faultyHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();
      
      workerManager.onMessage(workerId, 'faulty', faultyHandler);
      workerManager.onMessage(workerId, 'good', goodHandler);
      
      const workers = (workerManager as any).workers;
      const managedWorker = workers.get(workerId);
      
      // Should not throw, and good handler should still be called
      expect(() => {
        managedWorker.worker.simulateMessage({ type: WorkerMessageType.Response });
      }).not.toThrow();
      
      expect(faultyHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
    });
  });
  
  describe('RingBuffer Integration', () => {
    it('should write data to ring buffer', () => {
      const workerId = workerManager.createWorker();
      const data = new Uint8Array([1, 2, 3, 4]);
      
      const success = workerManager.writeToRingBuffer(workerId, data);
      
      expect(success).toBe(true);
    });
    
    it('should read data from ring buffer', () => {
      const workerId = workerManager.createWorker();
      const data = new Uint8Array([1, 2, 3, 4]);
      
      workerManager.writeToRingBuffer(workerId, data);
      const result = workerManager.readFromRingBuffer(workerId);
      
      expect(result).toEqual(data);
    });
    
    it('should return null when reading from empty buffer', () => {
      const workerId = workerManager.createWorker();
      
      const result = workerManager.readFromRingBuffer(workerId);
      
      expect(result).toBeNull();
    });
    
    it('should throw error when accessing ring buffer of non-existent worker', () => {
      expect(() => {
        workerManager.writeToRingBuffer('non-existent', new Uint8Array([1, 2, 3]));
      }).toThrow('Worker non-existent not found');
      
      expect(() => {
        workerManager.readFromRingBuffer('non-existent');
      }).toThrow('Worker non-existent not found');
    });
  });
  
  describe('Worker Queries', () => {
    it('should return all worker IDs', () => {
      const workerId1 = workerManager.createWorker();
      const workerId2 = workerManager.createWorker();
      
      const workerIds = workerManager.getWorkerIds();
      
      expect(workerIds).toContain(workerId1);
      expect(workerIds).toContain(workerId2);
      expect(workerIds.length).toBe(2);
    });
    
    it('should return correct active worker count', () => {
      workerManager.createWorker();
      workerManager.createWorker();
      
      expect(workerManager.getActiveWorkerCount()).toBe(2);
      
      workerManager.terminateWorker('worker-0');
      
      expect(workerManager.getActiveWorkerCount()).toBe(1);
    });
  });
});
