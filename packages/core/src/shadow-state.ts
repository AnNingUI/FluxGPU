// Shadow State Management
// Maintains proxy objects for remote GPU resources
import type { ResourceId, ResourceType, IGPUResource } from '@fluxgpu/contracts';

// Resource interface with metadata
export interface Resource {
  id: ResourceId;
  type: ResourceType;
  size: number;
  usage: number; // GPUBufferUsageFlags or GPUTextureUsageFlags
}

// Resource lifecycle state
export enum ResourceState {
  Created = 'created',
  InUse = 'in-use',
  Disposed = 'disposed',
}

// Resource metadata tracked by shadow state
interface ResourceMetadata {
  resource: Resource;
  state: ResourceState;
  dependencies: Set<ResourceId>;
  dependents: Set<ResourceId>;
  createdAt: number;
  lastUsedAt: number;
}

// Shadow State Manager
// Tracks proxy objects representing remote GPU resources
export class ShadowStateManager {
  private resources: Map<ResourceId, ResourceMetadata>;
  private nextId: number;

  constructor() {
    this.resources = new Map();
    this.nextId = 0;
  }

  // Create a new resource and return its proxy
  createResource(type: ResourceType, size: number, usage: number): Resource {
    const id = this.generateResourceId();
    const resource: Resource = { id, type, size, usage };
    
    const metadata: ResourceMetadata = {
      resource,
      state: ResourceState.Created,
      dependencies: new Set(),
      dependents: new Set(),
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    this.resources.set(id, metadata);
    return resource;
  }

  // Get resource by ID
  getResource(id: ResourceId): Resource | undefined {
    const metadata = this.resources.get(id);
    return metadata?.resource;
  }

  // Get resource state
  getResourceState(id: ResourceId): ResourceState | undefined {
    return this.resources.get(id)?.state;
  }

  // Mark resource as in use
  markInUse(id: ResourceId): void {
    const metadata = this.resources.get(id);
    if (metadata) {
      metadata.state = ResourceState.InUse;
      metadata.lastUsedAt = Date.now();
    }
  }

  // Dispose a resource
  disposeResource(id: ResourceId): boolean {
    const metadata = this.resources.get(id);
    if (!metadata) {
      return false;
    }

    // Mark as disposed
    metadata.state = ResourceState.Disposed;

    // Remove from dependents' dependency lists
    for (const dependentId of metadata.dependents) {
      const dependent = this.resources.get(dependentId);
      if (dependent) {
        dependent.dependencies.delete(id);
      }
    }

    return true;
  }

  // Add dependency relationship
  addDependency(resourceId: ResourceId, dependsOn: ResourceId): void {
    const resource = this.resources.get(resourceId);
    const dependency = this.resources.get(dependsOn);

    if (resource && dependency) {
      resource.dependencies.add(dependsOn);
      dependency.dependents.add(resourceId);
    }
  }

  // Get all dependencies of a resource
  getDependencies(id: ResourceId): ResourceId[] {
    const metadata = this.resources.get(id);
    return metadata ? Array.from(metadata.dependencies) : [];
  }

  // Get all dependents of a resource
  getDependents(id: ResourceId): ResourceId[] {
    const metadata = this.resources.get(id);
    return metadata ? Array.from(metadata.dependents) : [];
  }

  // Check if resource exists
  hasResource(id: ResourceId): boolean {
    return this.resources.has(id);
  }

  // Get all resources
  getAllResources(): Resource[] {
    return Array.from(this.resources.values()).map(m => m.resource);
  }

  // Get resources by state
  getResourcesByState(state: ResourceState): Resource[] {
    return Array.from(this.resources.values())
      .filter(m => m.state === state)
      .map(m => m.resource);
  }

  // Clear all resources
  clear(): void {
    this.resources.clear();
  }

  // Generate unique resource ID
  private generateResourceId(): ResourceId {
    const id = `resource_${this.nextId++}`;
    return id as ResourceId;
  }
}

// Create a resource proxy that implements IGPUResource
export function createResourceProxy(
  manager: ShadowStateManager,
  type: ResourceType,
  size: number,
  usage: number
): IGPUResource {
  const resource = manager.createResource(type, size, usage);

  return {
    id: resource.id,
    type: resource.type,
    dispose(): void {
      manager.disposeResource(resource.id);
    },
  };
}
