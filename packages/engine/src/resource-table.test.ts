import { describe, it, expect, vi } from 'vitest';
import { ResourceTable } from './resource-table.js';
import type { ResourceId, IGPUResource, ResourceType } from '@fluxgpu/contracts';

// Mock GPU resource for testing
function createMockResource(id: ResourceId, type: ResourceType): IGPUResource {
  return {
    id,
    type,
    dispose: vi.fn(),
  };
}

describe('ResourceTable', () => {
  describe('addResource', () => {
    it('should add a resource to the table', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      table.addResource(id, resource);

      expect(table.has(id)).toBe(true);
      expect(table.getResource(id)).toBe(resource);
    });

    it('should throw error when adding duplicate resource ID', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource1 = createMockResource(id, 'buffer' as ResourceType);
      const resource2 = createMockResource(id, 'buffer' as ResourceType);

      table.addResource(id, resource1);

      expect(() => table.addResource(id, resource2)).toThrow('Resource with id resource-1 already exists');
    });
  });

  describe('getResource', () => {
    it('should retrieve an existing resource', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      table.addResource(id, resource);

      expect(table.getResource(id)).toBe(resource);
    });

    it('should return undefined for non-existent resource', () => {
      const table = new ResourceTable();
      const id = 'non-existent' as ResourceId;

      expect(table.getResource(id)).toBeUndefined();
    });
  });

  describe('removeResource', () => {
    it('should remove and dispose a resource', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      table.addResource(id, resource);
      const result = table.removeResource(id);

      expect(result).toBe(true);
      expect(table.has(id)).toBe(false);
      expect(resource.dispose).toHaveBeenCalledOnce();
    });

    it('should return false when removing non-existent resource', () => {
      const table = new ResourceTable();
      const id = 'non-existent' as ResourceId;

      const result = table.removeResource(id);

      expect(result).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing resource', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      table.addResource(id, resource);

      expect(table.has(id)).toBe(true);
    });

    it('should return false for non-existent resource', () => {
      const table = new ResourceTable();
      const id = 'non-existent' as ResourceId;

      expect(table.has(id)).toBe(false);
    });
  });

  describe('ResourceTable interface methods', () => {
    it('should support get method', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      table.set(id, resource);

      expect(table.get(id)).toBe(resource);
    });

    it('should support set method', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      table.set(id, resource);

      expect(table.has(id)).toBe(true);
    });

    it('should support delete method', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      table.set(id, resource);
      const result = table.delete(id);

      expect(result).toBe(true);
      expect(table.has(id)).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct count of resources', () => {
      const table = new ResourceTable();

      expect(table.size()).toBe(0);

      table.addResource('resource-1' as ResourceId, createMockResource('resource-1' as ResourceId, 'buffer' as ResourceType));
      expect(table.size()).toBe(1);

      table.addResource('resource-2' as ResourceId, createMockResource('resource-2' as ResourceId, 'texture' as ResourceType));
      expect(table.size()).toBe(2);

      table.removeResource('resource-1' as ResourceId);
      expect(table.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove and dispose all resources', () => {
      const table = new ResourceTable();
      const resource1 = createMockResource('resource-1' as ResourceId, 'buffer' as ResourceType);
      const resource2 = createMockResource('resource-2' as ResourceId, 'texture' as ResourceType);

      table.addResource('resource-1' as ResourceId, resource1);
      table.addResource('resource-2' as ResourceId, resource2);

      table.clear();

      expect(table.size()).toBe(0);
      expect(resource1.dispose).toHaveBeenCalledOnce();
      expect(resource2.dispose).toHaveBeenCalledOnce();
    });
  });

  describe('getAllResourceIds', () => {
    it('should return all resource IDs', () => {
      const table = new ResourceTable();
      const id1 = 'resource-1' as ResourceId;
      const id2 = 'resource-2' as ResourceId;

      table.addResource(id1, createMockResource(id1, 'buffer' as ResourceType));
      table.addResource(id2, createMockResource(id2, 'texture' as ResourceType));

      const ids = table.getAllResourceIds();

      expect(ids).toHaveLength(2);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
    });

    it('should return empty array when table is empty', () => {
      const table = new ResourceTable();

      expect(table.getAllResourceIds()).toEqual([]);
    });
  });

  describe('resource lifecycle management', () => {
    it('should maintain resource lifecycle from creation to disposal', () => {
      const table = new ResourceTable();
      const id = 'resource-1' as ResourceId;
      const resource = createMockResource(id, 'buffer' as ResourceType);

      // Create
      table.addResource(id, resource);
      expect(table.has(id)).toBe(true);

      // Use
      const retrieved = table.getResource(id);
      expect(retrieved).toBe(resource);

      // Dispose
      table.removeResource(id);
      expect(table.has(id)).toBe(false);
      expect(resource.dispose).toHaveBeenCalledOnce();
    });

    it('should handle multiple resources independently', () => {
      const table = new ResourceTable();
      const id1 = 'resource-1' as ResourceId;
      const id2 = 'resource-2' as ResourceId;
      const resource1 = createMockResource(id1, 'buffer' as ResourceType);
      const resource2 = createMockResource(id2, 'texture' as ResourceType);

      table.addResource(id1, resource1);
      table.addResource(id2, resource2);

      // Remove one resource
      table.removeResource(id1);

      expect(table.has(id1)).toBe(false);
      expect(table.has(id2)).toBe(true);
      expect(resource1.dispose).toHaveBeenCalledOnce();
      expect(resource2.dispose).not.toHaveBeenCalled();
    });
  });
});
