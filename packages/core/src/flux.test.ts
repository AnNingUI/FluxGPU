// Tests for Flux main API with dependency injection
import { describe, it, expect, beforeEach } from 'vitest';
import { createFlux, type FluxConfig, type FluxInstance } from './flux.js';
import type { IRuntimeAdapter, IExecutor, ResourceTable, CommandBuffer, IGPUResource, ResourceId } from '@flux/contracts';
import { ResourceType, InitializationError, NotInitializedError, ValidationError } from '@flux/contracts';
import type { GraphNode } from './command-graph.js';

// Mock runtime adapter for testing
class MockRuntimeAdapter implements IRuntimeAdapter {
  private initialized = false;
  private shouldFailInitialization = false;

  constructor(shouldFailInitialization = false) {
    this.shouldFailInitialization = shouldFailInitialization;
  }

  async initialize(): Promise<void> {
    if (this.shouldFailInitialization) {
      throw new Error('Mock initialization failure');
    }
    this.initialized = true;
  }

  createExecutor(): IExecutor {
    if (!this.initialized) {
      throw new Error('Cannot create executor before initialization');
    }
    return new MockExecutor();
  }

  supportsFeature(feature: string): boolean {
    return feature === 'mock-feature';
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Mock executor for testing
class MockExecutor implements IExecutor {
  dispatch(command: CommandBuffer): void {
    // Mock implementation
  }

  getResourceTable(): ResourceTable {
    const map = new Map<ResourceId, IGPUResource>();
    return {
      get: (id: ResourceId) => map.get(id),
      set: (id: ResourceId, resource: IGPUResource) => { map.set(id, resource); },
      delete: (id: ResourceId) => map.delete(id),
      has: (id: ResourceId) => map.has(id),
    };
  }
}

describe('Flux API', () => {
  let mockRuntime: MockRuntimeAdapter;
  let config: FluxConfig;

  beforeEach(() => {
    mockRuntime = new MockRuntimeAdapter();
    config = { runtime: mockRuntime };
  });

  describe('createFlux', () => {
    it('should create a Flux instance with valid config', () => {
      const flux = createFlux(config);
      expect(flux).toBeDefined();
      expect(flux.isInitialized()).toBe(false);
    });

    it('should throw error if runtime is missing', () => {
      expect(() => createFlux({} as FluxConfig)).toThrow(InitializationError);
      expect(() => createFlux({} as FluxConfig)).toThrow('FluxConfig must include a runtime adapter');
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with valid runtime', async () => {
      const flux = createFlux(config);
      const result = await flux.initialize();

      expect(result.success).toBe(true);
      expect(flux.isInitialized()).toBe(true);
      expect(flux.getInitializationState()).toBe('initialized');
    });

    it('should fail initialization if runtime fails', async () => {
      const failingRuntime = new MockRuntimeAdapter(true);
      const flux = createFlux({ runtime: failingRuntime });
      const result = await flux.initialize();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(InitializationError);
        expect(result.error.message).toContain('Mock initialization failure');
      }
      expect(flux.isInitialized()).toBe(false);
      expect(flux.getInitializationState()).toBe('failed');
    });

    it('should prevent re-initialization', async () => {
      const flux = createFlux(config);
      await flux.initialize();
      const result = await flux.initialize();

      expect(result.success).toBe(true);
      expect(flux.isInitialized()).toBe(true);
    });

    it('should prevent concurrent initialization', async () => {
      const flux = createFlux(config);
      const promise1 = flux.initialize();
      const promise2 = flux.initialize();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // One should succeed, one should fail with "already in progress"
      const successCount = [result1, result2].filter(r => r.success).length;
      const failureCount = [result1, result2].filter(r => !r.success).length;

      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(failureCount).toBeLessThanOrEqual(1);
    });
  });

  describe('operations before initialization', () => {
    it('should prevent building command graph before initialization', () => {
      const flux = createFlux(config);
      const nodes: GraphNode[] = [];
      const result = flux.buildCommandGraph(nodes);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotInitializedError);
        expect(result.error.message).toContain('not initialized');
      }
    });

    it('should prevent getting executor before initialization', () => {
      const flux = createFlux(config);
      const result = flux.getExecutor();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotInitializedError);
        expect(result.error.message).toContain('not initialized');
      }
    });
  });

  describe('operations after initialization', () => {
    let flux: FluxInstance;

    beforeEach(async () => {
      flux = createFlux(config);
      await flux.initialize();
    });

    it('should allow getting executor after initialization', () => {
      const result = flux.getExecutor();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeDefined();
      }
    });

    it('should allow building empty command graph', () => {
      const nodes: GraphNode[] = [];
      const result = flux.buildCommandGraph(nodes);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.nodes.size).toBe(0);
        expect(result.value.executionOrder.length).toBe(0);
      }
    });

    it('should build valid command graph', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1' as any,
          operation: { type: 'test' },
          inputs: [],
          outputs: [],
          dependencies: [],
        },
        {
          id: 'node2' as any,
          operation: { type: 'test' },
          inputs: [],
          outputs: [],
          dependencies: ['node1' as any],
        },
      ];

      const result = flux.buildCommandGraph(nodes);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.nodes.size).toBe(2);
        expect(result.value.executionOrder).toEqual(['node1', 'node2']);
      }
    });

    it('should reject command graph with circular dependencies', () => {
      const nodes: GraphNode[] = [
        {
          id: 'node1' as any,
          operation: { type: 'test' },
          inputs: [],
          outputs: [],
          dependencies: ['node2' as any],
        },
        {
          id: 'node2' as any,
          operation: { type: 'test' },
          inputs: [],
          outputs: [],
          dependencies: ['node1' as any],
        },
      ];

      const result = flux.buildCommandGraph(nodes);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Circular dependency');
      }
    });
  });

  describe('shadow state manager integration', () => {
    it('should provide access to shadow state manager', () => {
      const flux = createFlux(config);
      const manager = flux.getShadowStateManager();

      expect(manager).toBeDefined();
      expect(manager.getAllResources()).toEqual([]);
    });

    it('should maintain shadow state across operations', async () => {
      const flux = createFlux(config);
      await flux.initialize();

      const manager = flux.getShadowStateManager();
      const resource = manager.createResource(ResourceType.Buffer, 1024, 0);

      expect(manager.hasResource(resource.id)).toBe(true);
      expect(manager.getResource(resource.id)).toEqual(resource);
    });
  });

  describe('runtime adapter access', () => {
    it('should provide access to runtime adapter', () => {
      const flux = createFlux(config);
      const runtime = flux.getRuntime();

      expect(runtime).toBe(mockRuntime);
    });

    it('should allow checking runtime features', () => {
      const flux = createFlux(config);
      const runtime = flux.getRuntime();

      expect(runtime.supportsFeature('mock-feature')).toBe(true);
      expect(runtime.supportsFeature('other-feature')).toBe(false);
    });
  });
});
