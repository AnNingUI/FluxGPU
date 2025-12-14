// Command Graph Builder
// Builds and validates Directed Acyclic Graphs (DAGs) for GPU operations
import type { NodeId, ResourceId, ValidationResult } from '@flux/contracts';
import { 
  Result, 
  Ok, 
  Err, 
  GraphTopologyError, 
  CircularDependencyError,
  ValidationError 
} from '@flux/contracts';

// Operation type representing a GPU operation
export interface Operation {
  type: string;
  params?: Record<string, unknown>;
}

// Graph node representing a single operation in the command graph
export interface GraphNode {
  id: NodeId;
  operation: Operation;
  inputs: ResourceId[];
  outputs: ResourceId[];
  dependencies: NodeId[];
}

// Command graph containing nodes and execution order
export interface CommandGraph {
  nodes: Map<NodeId, GraphNode>;
  executionOrder: NodeId[];
}

// Create a command graph from a list of nodes
export function createCommandGraph(nodes: GraphNode[]): Result<CommandGraph, ValidationError> {
  // Create nodes map
  const nodesMap = new Map<NodeId, GraphNode>();
  
  for (const node of nodes) {
    if (nodesMap.has(node.id)) {
      return Err(new GraphTopologyError(
        `Duplicate node ID: ${node.id}`,
        { nodeId: node.id }
      ));
    }
    nodesMap.set(node.id, node);
  }

  // Validate all dependencies exist
  for (const node of nodes) {
    for (const depId of node.dependencies) {
      if (!nodesMap.has(depId)) {
        return Err(new GraphTopologyError(
          `Node ${node.id} depends on non-existent node ${depId}`,
          { nodeId: node.id, missingDependency: depId }
        ));
      }
    }
  }

  // Perform topological sort to get execution order
  const sortResult = topologicalSort(nodesMap);
  
  if (!sortResult.success) {
    return Err(sortResult.error);
  }

  return Ok({
    nodes: nodesMap,
    executionOrder: sortResult.value,
  });
}

// Perform topological sort using Kahn's algorithm
function topologicalSort(nodes: Map<NodeId, GraphNode>): Result<NodeId[], CircularDependencyError> {
  // Calculate in-degree for each node (number of dependencies)
  const inDegree = new Map<NodeId, number>();
  
  for (const [nodeId] of nodes) {
    inDegree.set(nodeId, 0);
  }
  
  // Count incoming edges (dependencies)
  for (const node of nodes.values()) {
    const currentDegree = inDegree.get(node.id) || 0;
    inDegree.set(node.id, currentDegree + node.dependencies.length);
  }

  // Queue of nodes with no dependencies (in-degree = 0)
  const queue: NodeId[] = [];
  
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: NodeId[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    // Find all nodes that depend on this node
    for (const [otherId, otherNode] of nodes) {
      if (otherNode.dependencies.includes(nodeId)) {
        const newDegree = (inDegree.get(otherId) || 0) - 1;
        inDegree.set(otherId, newDegree);
        
        if (newDegree === 0) {
          queue.push(otherId);
        }
      }
    }
  }

  // If we haven't processed all nodes, there's a cycle
  if (result.length !== nodes.size) {
    // Find the cycle for better error reporting
    const unprocessed = Array.from(nodes.keys()).filter(id => !result.includes(id));
    return Err(new CircularDependencyError(
      unprocessed,
      { processedCount: result.length, totalCount: nodes.size }
    ));
  }

  return Ok(result);
}

// Detect cycles in the graph using DFS
export function detectCycle(graph: CommandGraph): string[] | null {
  const visited = new Set<NodeId>();
  const recursionStack = new Set<NodeId>();
  const path: NodeId[] = [];

  function dfs(nodeId: NodeId): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        if (dfs(depId)) {
          return true;
        }
      } else if (recursionStack.has(depId)) {
        // Found a cycle
        const cycleStart = path.indexOf(depId);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return false;
  }

  for (const [nodeId] of graph.nodes) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) {
        return path;
      }
    }
  }

  return null;
}

// Validate the command graph
export function validateGraph(graph: CommandGraph): ValidationResult {
  const errors: string[] = [];

  // Check if graph is empty
  if (graph.nodes.size === 0) {
    return {
      valid: true,
      errors: [],
    };
  }

  // Check for cycles
  const cycle = detectCycle(graph);
  if (cycle) {
    errors.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
  }

  // Validate each node
  for (const [nodeId, node] of graph.nodes) {
    // Check that node ID matches
    if (node.id !== nodeId) {
      errors.push(`Node ID mismatch: map key ${nodeId} vs node.id ${node.id}`);
    }

    // Check that all dependencies exist
    for (const depId of node.dependencies) {
      if (!graph.nodes.has(depId)) {
        errors.push(`Node ${nodeId} depends on non-existent node ${depId}`);
      }
    }

    // Check for self-dependencies
    if (node.dependencies.includes(nodeId)) {
      errors.push(`Node ${nodeId} has a self-dependency`);
    }
  }

  // Validate execution order
  if (graph.executionOrder.length !== graph.nodes.size) {
    errors.push(
      `Execution order length (${graph.executionOrder.length}) does not match node count (${graph.nodes.size})`
    );
  }

  // Check that all nodes in execution order exist
  for (const nodeId of graph.executionOrder) {
    if (!graph.nodes.has(nodeId)) {
      errors.push(`Execution order contains non-existent node ${nodeId}`);
    }
  }

  // Check that execution order respects dependencies
  const executed = new Set<NodeId>();
  for (const nodeId of graph.executionOrder) {
    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const depId of node.dependencies) {
        if (!executed.has(depId)) {
          errors.push(
            `Node ${nodeId} appears before its dependency ${depId} in execution order`
          );
        }
      }
    }
    executed.add(nodeId);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
