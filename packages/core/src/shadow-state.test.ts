import { describe, it, expect, beforeEach } from 'vitest';
import { ShadowStateManager, createResourceProxy, ResourceState } from './shadow-state.js';
import { ResourceType } from '@fluxgpu/contracts';

describe('ShadowStateManager', () => {
  let manager: ShadowStateManager;

  beforeEach(() => {
    manager = new ShadowStateManager();
  });

  describe('Resource Creation', () => {
    it('should create a resource with unique ID', () => {
      const resource = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      
      expect(resource.id).toBeDefined();
      expect(resource.type).toBe(ResourceType.Buffer);
      expect(resource.size).toBe(1024);
      expect(resource.usage).toBe(0x80);
    });

    it('should create multiple resources with unique IDs', () => {
      const resource1 = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      const resource2 = manager.createResource(ResourceType.Texture, 2048, 0x04);
      
      expect(resource1.id).not.toBe(resource2.id);
    });

    it('should track created resources', () => {
      const resource = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      
      expect(manager.hasResource(resource.id)).toBe(true);
      expect(manager.getResource(resource.id)).toEqual(resource);
    });
  });

  describe('Resource Lifecycle', () => {
    it('should initialize resources in Created state', () => {
      const resource = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      
      expect(manager.getResourceState(resource.id)).toBe(ResourceState.Created);
    });

    it('should transition to InUse state', () => {
      const resource = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      manager.markInUse(resource.id);
      
      expect(manager.getResourceState(resource.id)).toBe(ResourceState.InUse);
    });

    it('should transition to Disposed state', () => {
      const resource = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      const disposed = manager.disposeResource(resource.id);
      
      expect(disposed).toBe(true);
      expect(manager.getResourceState(resource.id)).toBe(ResourceState.Disposed);
    });

    it('should return false when disposing non-existent resource', () => {
      const disposed = manager.disposeResource('non-existent' as any);
      
      expect(disposed).toBe(false);
    });
  });

  describe('Resource Dependencies', () => {
    it('should track dependencies between resources', () => {
      const resource1 = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      const resource2 = manager.createResource(ResourceType.Buffer, 2048, 0x80);
      
      manager.addDependency(resource2.id, resource1.id);
      
      const dependencies = manager.getDependencies(resource2.id);
      expect(dependencies).toContain(resource1.id);
    });

    it('should track dependents of resources', () => {
      const resource1 = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      const resource2 = manager.createResource(ResourceType.Buffer, 2048, 0x80);
      
      manager.addDependency(resource2.id, resource1.id);
      
      const dependents = manager.getDependents(resource1.id);
      expect(dependents).toContain(resource2.id);
    });

    it('should handle multiple dependencies', () => {
      const resource1 = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      const resource2 = manager.createResource(ResourceType.Buffer, 2048, 0x80);
      const resource3 = manager.createResource(ResourceType.Buffer, 4096, 0x80);
      
      manager.addDependency(resource3.id, resource1.id);
      manager.addDependency(resource3.id, resource2.id);
      
      const dependencies = manager.getDependencies(resource3.id);
      expect(dependencies).toHaveLength(2);
      expect(dependencies).toContain(resource1.id);
      expect(dependencies).toContain(resource2.id);
    });

    it('should clean up dependencies when resource is disposed', () => {
      const resource1 = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      const resource2 = manager.createResource(ResourceType.Buffer, 2048, 0x80);
      
      manager.addDependency(resource2.id, resource1.id);
      manager.disposeResource(resource1.id);
      
      const dependencies = manager.getDependencies(resource2.id);
      expect(dependencies).not.toContain(resource1.id);
    });
  });

  describe('Resource Queries', () => {
    it('should get all resources', () => {
      manager.createResource(ResourceType.Buffer, 1024, 0x80);
      manager.createResource(ResourceType.Texture, 2048, 0x04);
      
      const allResources = manager.getAllResources();
      expect(allResources).toHaveLength(2);
    });

    it('should get resources by state', () => {
      const resource1 = manager.createResource(ResourceType.Buffer, 1024, 0x80);
      const resource2 = manager.createResource(ResourceType.Buffer, 2048, 0x80);
      
      manager.markInUse(resource1.id);
      
      const inUseResources = manager.getResourcesByState(ResourceState.InUse);
      expect(inUseResources).toHaveLength(1);
      expect(inUseResources[0].id).toBe(resource1.id);
      
      const createdResources = manager.getResourcesByState(ResourceState.Created);
      expect(createdResources).toHaveLength(1);
      expect(createdResources[0].id).toBe(resource2.id);
    });

    it('should clear all resources', () => {
      manager.createResource(ResourceType.Buffer, 1024, 0x80);
      manager.createResource(ResourceType.Texture, 2048, 0x04);
      
      manager.clear();
      
      expect(manager.getAllResources()).toHaveLength(0);
    });
  });
});

describe('createResourceProxy', () => {
  let manager: ShadowStateManager;

  beforeEach(() => {
    manager = new ShadowStateManager();
  });

  it('should create a proxy implementing IGPUResource', () => {
    const proxy = createResourceProxy(manager, ResourceType.Buffer, 1024, 0x80);
    
    expect(proxy.id).toBeDefined();
    expect(proxy.type).toBe(ResourceType.Buffer);
    expect(typeof proxy.dispose).toBe('function');
  });

  it('should register resource in manager', () => {
    const proxy = createResourceProxy(manager, ResourceType.Buffer, 1024, 0x80);
    
    expect(manager.hasResource(proxy.id)).toBe(true);
  });

  it('should dispose resource when proxy dispose is called', () => {
    const proxy = createResourceProxy(manager, ResourceType.Buffer, 1024, 0x80);
    
    proxy.dispose();
    
    expect(manager.getResourceState(proxy.id)).toBe(ResourceState.Disposed);
  });
});
