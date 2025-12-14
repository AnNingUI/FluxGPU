import type { ResourceId, IGPUResource, ResourceTable as IResourceTable } from '@fluxgpu/contracts';

/**
 * ResourceTable manages the mapping from ResourceId to actual GPU resources.
 * This is the single source of truth for resource lifecycle in the engine.
 * 
 * Requirements: 9.3 - Resource table mapping IDs to actual GPUBuffer instances
 */
export class ResourceTable implements IResourceTable {
  private resources: Map<ResourceId, IGPUResource>;

  constructor() {
    this.resources = new Map();
  }

  /**
   * Register a new GPU resource in the table.
   * @param id - Unique identifier for the resource
   * @param resource - The GPU resource instance
   */
  addResource(id: ResourceId, resource: IGPUResource): void {
    if (this.resources.has(id)) {
      throw new Error(`Resource with id ${id} already exists`);
    }
    this.resources.set(id, resource);
  }

  /**
   * Retrieve a GPU resource by its ID.
   * @param id - The resource identifier
   * @returns The GPU resource or undefined if not found
   */
  getResource(id: ResourceId): IGPUResource | undefined {
    return this.resources.get(id);
  }

  /**
   * Remove a resource from the table and dispose of it.
   * @param id - The resource identifier
   * @returns true if the resource was removed, false if it didn't exist
   */
  removeResource(id: ResourceId): boolean {
    const resource = this.resources.get(id);
    if (!resource) {
      return false;
    }
    
    // Dispose the resource before removing it
    resource.dispose();
    
    return this.resources.delete(id);
  }

  /**
   * Check if a resource exists in the table.
   * @param id - The resource identifier
   * @returns true if the resource exists
   */
  has(id: ResourceId): boolean {
    return this.resources.has(id);
  }

  /**
   * Get a resource by ID (implements ResourceTable interface).
   * @param id - The resource identifier
   * @returns The GPU resource or undefined if not found
   */
  get(id: ResourceId): IGPUResource | undefined {
    return this.getResource(id);
  }

  /**
   * Set a resource in the table (implements ResourceTable interface).
   * @param id - The resource identifier
   * @param resource - The GPU resource instance
   */
  set(id: ResourceId, resource: IGPUResource): void {
    this.addResource(id, resource);
  }

  /**
   * Delete a resource from the table (implements ResourceTable interface).
   * @param id - The resource identifier
   * @returns true if the resource was removed
   */
  delete(id: ResourceId): boolean {
    return this.removeResource(id);
  }

  /**
   * Get the total number of resources in the table.
   * @returns The count of resources
   */
  size(): number {
    return this.resources.size;
  }

  /**
   * Clear all resources from the table and dispose of them.
   */
  clear(): void {
    for (const resource of this.resources.values()) {
      resource.dispose();
    }
    this.resources.clear();
  }

  /**
   * Get all resource IDs currently in the table.
   * @returns Array of resource IDs
   */
  getAllResourceIds(): ResourceId[] {
    return Array.from(this.resources.keys());
  }
}
