import { describe, it, expect } from 'vitest';
import {
  createCommandGraph,
  validateGraph,
  detectCycle,
  type GraphNode,
  type CommandGraph,
  type Operation,
} from './command-graph.js';
import type { NodeId, ResourceId } from '@flux/contracts';

// Helper function to create a test node
function createNode(
  id: string,
  operation: Operation,
  inputs: string[] = [],
  outputs: string[] = [],
  dependencies: string[] = []
): GraphNode {
  return {
    id: id as NodeId,
    operation,
    inputs: inputs as ResourceId[],
    outputs: outputs as ResourceId[],
    dependencies: dependencies as NodeId[],
  };
}

describe('createCommandGraph', () => {
  it('should create a graph from a single node', () => {
    const node = createNode('node1', { type: 'compute' });
    const result = createCommandGraph([node]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.nodes.size).toBe(1);
      expect(result.value.executionOrder).toEqual(['node1']);
    }
  });

  it('should create a graph with multiple independent nodes', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }),
      createNode('node2', { type: 'compute' }),
      createNode('node3', { type: 'compute' }),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.nodes.size).toBe(3);
      expect(result.value.executionOrder).toHaveLength(3);
    }
  });

  it('should create a graph with dependencies', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }),
      createNode('node2', { type: 'compute' }, [], [], ['node1']),
      createNode('node3', { type: 'compute' }, [], [], ['node2']),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.nodes.size).toBe(3);
      expect(result.value.executionOrder).toEqual(['node1', 'node2', 'node3']);
    }
  });

  it('should handle diamond dependency pattern', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }),
      createNode('node2', { type: 'compute' }, [], [], ['node1']),
      createNode('node3', { type: 'compute' }, [], [], ['node1']),
      createNode('node4', { type: 'compute' }, [], [], ['node2', 'node3']),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.nodes.size).toBe(4);
      expect(result.value.executionOrder).toHaveLength(4);
      
      // node1 should come first
      expect(result.value.executionOrder[0]).toBe('node1');
      
      // node4 should come last
      expect(result.value.executionOrder[3]).toBe('node4');
      
      // node2 and node3 should come before node4
      const node2Index = result.value.executionOrder.indexOf('node2' as NodeId);
      const node3Index = result.value.executionOrder.indexOf('node3' as NodeId);
      const node4Index = result.value.executionOrder.indexOf('node4' as NodeId);
      expect(node2Index).toBeLessThan(node4Index);
      expect(node3Index).toBeLessThan(node4Index);
    }
  });

  it('should reject duplicate node IDs', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }),
      createNode('node1', { type: 'compute' }),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Duplicate node ID');
    }
  });

  it('should reject non-existent dependencies', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }, [], [], ['nonexistent']),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('non-existent node');
    }
  });

  it('should detect circular dependencies', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }, [], [], ['node2']),
      createNode('node2', { type: 'compute' }, [], [], ['node1']),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Circular dependency');
    }
  });

  it('should detect circular dependencies in longer chains', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }, [], [], ['node3']),
      createNode('node2', { type: 'compute' }, [], [], ['node1']),
      createNode('node3', { type: 'compute' }, [], [], ['node2']),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Circular dependency');
    }
  });

  it('should handle empty node list', () => {
    const result = createCommandGraph([]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.nodes.size).toBe(0);
      expect(result.value.executionOrder).toHaveLength(0);
    }
  });
});

describe('detectCycle', () => {
  it('should return null for acyclic graph', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }),
      createNode('node2', { type: 'compute' }, [], [], ['node1']),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(true);
    if (result.success) {
      const cycle = detectCycle(result.value);
      expect(cycle).toBeNull();
    }
  });

  it('should detect simple cycle', () => {
    // Create a graph with a cycle manually (bypassing createCommandGraph validation)
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node1', { type: 'compute' }, [], [], ['node2'])],
        ['node2' as NodeId, createNode('node2', { type: 'compute' }, [], [], ['node1'])],
      ]),
      executionOrder: [],
    };

    const cycle = detectCycle(graph);
    expect(cycle).not.toBeNull();
    expect(cycle).toHaveLength(2);
  });

  it('should return null for empty graph', () => {
    const graph: CommandGraph = {
      nodes: new Map(),
      executionOrder: [],
    };

    const cycle = detectCycle(graph);
    expect(cycle).toBeNull();
  });
});

describe('validateGraph', () => {
  it('should validate a correct graph', () => {
    const nodes = [
      createNode('node1', { type: 'compute' }),
      createNode('node2', { type: 'compute' }, [], [], ['node1']),
    ];
    const result = createCommandGraph(nodes);

    expect(result.success).toBe(true);
    if (result.success) {
      const validation = validateGraph(result.value);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    }
  });

  it('should validate empty graph', () => {
    const result = createCommandGraph([]);

    expect(result.success).toBe(true);
    if (result.success) {
      const validation = validateGraph(result.value);
      expect(validation.valid).toBe(true);
    }
  });

  it('should detect node ID mismatch', () => {
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node2', { type: 'compute' })],
      ]),
      executionOrder: ['node1' as NodeId],
    };

    const validation = validateGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors?.some(e => e.includes('ID mismatch'))).toBe(true);
  });

  it('should detect non-existent dependencies', () => {
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node1', { type: 'compute' }, [], [], ['nonexistent'])],
      ]),
      executionOrder: ['node1' as NodeId],
    };

    const validation = validateGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors?.some(e => e.includes('non-existent node'))).toBe(true);
  });

  it('should detect self-dependencies', () => {
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node1', { type: 'compute' }, [], [], ['node1'])],
      ]),
      executionOrder: ['node1' as NodeId],
    };

    const validation = validateGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors?.some(e => e.includes('self-dependency'))).toBe(true);
  });

  it('should detect execution order length mismatch', () => {
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node1', { type: 'compute' })],
        ['node2' as NodeId, createNode('node2', { type: 'compute' })],
      ]),
      executionOrder: ['node1' as NodeId],
    };

    const validation = validateGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors?.some(e => e.includes('does not match node count'))).toBe(true);
  });

  it('should detect non-existent nodes in execution order', () => {
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node1', { type: 'compute' })],
      ]),
      executionOrder: ['node1' as NodeId, 'nonexistent' as NodeId],
    };

    const validation = validateGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors?.some(e => e.includes('non-existent node'))).toBe(true);
  });

  it('should detect incorrect execution order', () => {
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node1', { type: 'compute' })],
        ['node2' as NodeId, createNode('node2', { type: 'compute' }, [], [], ['node1'])],
      ]),
      executionOrder: ['node2' as NodeId, 'node1' as NodeId],
    };

    const validation = validateGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors?.some(e => e.includes('appears before its dependency'))).toBe(true);
  });

  it('should detect cycles', () => {
    const graph: CommandGraph = {
      nodes: new Map([
        ['node1' as NodeId, createNode('node1', { type: 'compute' }, [], [], ['node2'])],
        ['node2' as NodeId, createNode('node2', { type: 'compute' }, [], [], ['node1'])],
      ]),
      executionOrder: [],
    };

    const validation = validateGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors?.some(e => e.includes('Circular dependency'))).toBe(true);
  });
});
