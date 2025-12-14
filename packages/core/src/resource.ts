// Resource Composition Utilities
// Factory functions and wrappers for composing resource capabilities
import { ResourceType, type ResourceId } from '@flux/contracts';
import { ShadowStateManager, type Resource } from './shadow-state.js';

// Base buffer handle - raw resource without additional capabilities
export interface BufferHandle {
  readonly id: ResourceId;
  readonly type: ResourceType;
  readonly size: number;
  readonly usage: number;
}

// Double buffering capability - adds swap functionality
export interface DoubleBufferedHandle extends BufferHandle {
  readonly frontBuffer: ResourceId;
  readonly backBuffer: ResourceId;
  swap(): void;
  getCurrentBuffer(): ResourceId;
}

// Host sync capability - adds async readback
export interface HostSyncHandle extends BufferHandle {
  readback(): Promise<ArrayBuffer>;
}

// Persistence capability - adds storage
export interface PersistentHandle extends BufferHandle {
  save(key: string): Promise<void>;
  load(key: string): Promise<void>;
}

// Storage interface for persistence (can be implemented by infrastructure)
export interface IStorage {
  set(key: string, data: ArrayBuffer): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
}

// Create a raw buffer handle
// Returns a simple handle without additional capabilities
export function createBuffer(
  manager: ShadowStateManager,
  size: number,
  usage: number
): BufferHandle {
  const resource = manager.createResource(ResourceType.Buffer, size, usage);
  
  return {
    id: resource.id,
    type: resource.type,
    size: resource.size,
    usage: resource.usage,
  };
}

// Wrap a buffer with double buffering capability
// Adds swap functionality for ping-pong rendering patterns
export function withDoubleBuffering<T extends BufferHandle>(
  manager: ShadowStateManager,
  handle: T
): T & DoubleBufferedHandle {
  // Create a second buffer with same properties
  const backResource = manager.createResource(
    ResourceType.Buffer,
    handle.size,
    handle.usage
  );

  let currentIsFront = true;

  return {
    ...handle,
    frontBuffer: handle.id,
    backBuffer: backResource.id,
    
    swap(): void {
      currentIsFront = !currentIsFront;
    },
    
    getCurrentBuffer(): ResourceId {
      return currentIsFront ? handle.id : backResource.id;
    },
  };
}

// Wrap a buffer with host sync capability
// Adds async readback functionality
export function withHostSync<T extends BufferHandle>(
  handle: T,
  readbackFn?: (id: ResourceId) => Promise<ArrayBuffer>
): T & HostSyncHandle {
  // Default readback function (will be replaced by infrastructure)
  const defaultReadback = async (id: ResourceId): Promise<ArrayBuffer> => {
    // This is a placeholder - actual implementation provided by infrastructure
    throw new Error(`Readback not implemented for resource ${id}`);
  };

  const actualReadback = readbackFn || defaultReadback;

  return {
    ...handle,
    
    async readback(): Promise<ArrayBuffer> {
      return actualReadback(handle.id);
    },
  };
}

// Wrap a buffer with persistence capability
// Adds save/load functionality using provided storage
export function withPersistence<T extends BufferHandle>(
  handle: T,
  storage: IStorage,
  readbackFn?: (id: ResourceId) => Promise<ArrayBuffer>,
  uploadFn?: (id: ResourceId, data: ArrayBuffer) => Promise<void>
): T & PersistentHandle {
  // Default functions (will be replaced by infrastructure)
  const defaultReadback = async (id: ResourceId): Promise<ArrayBuffer> => {
    throw new Error(`Readback not implemented for resource ${id}`);
  };

  const defaultUpload = async (id: ResourceId, data: ArrayBuffer): Promise<void> => {
    throw new Error(`Upload not implemented for resource ${id}`);
  };

  const actualReadback = readbackFn || defaultReadback;
  const actualUpload = uploadFn || defaultUpload;

  return {
    ...handle,
    
    async save(key: string): Promise<void> {
      // Read data from GPU
      const data = await actualReadback(handle.id);
      // Store to persistent storage
      await storage.set(key, data);
    },
    
    async load(key: string): Promise<void> {
      // Load from persistent storage
      const data = await storage.get(key);
      if (data === null) {
        throw new Error(`No data found for key: ${key}`);
      }
      // Upload to GPU
      await actualUpload(handle.id, data);
    },
  };
}
