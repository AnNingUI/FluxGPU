# @fluxgpu/engine

WebGPU executor and high-level API for FluxGPU.

## Overview

This package provides the main GPU execution layer based on the hexagonal architecture:

- **AdapterExecutor**: High-level WebGPU executor that works with any `IGPUAdapter` implementation
- Resource management (buffers, textures, shaders, pipelines)
- Command encoding and submission
- Frame-based rendering

## Installation

```bash
pnpm add @fluxgpu/engine @fluxgpu/host-browser @fluxgpu/contracts
```

## Usage

### Initialize Executor

```typescript
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// Create adapter and executor
const adapter = new BrowserGPUAdapter({ canvas });
const executor = new AdapterExecutor({ adapter });

// Initialize (async)
await executor.initialize();
```

### Create Resources

```typescript
import { BufferUsage } from '@fluxgpu/contracts';

// Create buffer
const buffer = executor.createBuffer({
  size: 1024,
  usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
});

// Write data to buffer
const data = new Float32Array([1, 2, 3, 4]);
executor.writeBuffer(buffer, data);

// Read data from buffer
const result = await executor.readBuffer(buffer);

// Create texture
const texture = executor.createTexture({
  size: { width: 512, height: 512 },
  format: 'rgba8unorm',
  usage: TextureUsage.RENDER_ATTACHMENT | TextureUsage.TEXTURE_BINDING,
});

// Create shader module
const shader = executor.createShaderModule(wgslCode);
```

### Create Pipelines

```typescript
// Compute pipeline
const computePipeline = await executor.createComputePipeline({
  shader: computeShader,
  entryPoint: 'main',
});

// Render pipeline
const renderPipeline = await executor.createRenderPipeline({
  vertex: {
    shader: vertexShader,
    entryPoint: 'main',
  },
  fragment: {
    shader: fragmentShader,
    entryPoint: 'main',
    targets: [{ format: executor.getPreferredFormat() }],
  },
});
```

### Execute Commands

```typescript
// Single frame execution
executor.frame((encoder) => {
  // Compute pass
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, computeBindGroup);
  computePass.dispatchWorkgroups(64);
  computePass.end();

  // Render pass
  const renderTarget = executor.getCurrentTexture();
  if (renderTarget) {
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: renderTarget.createView(),
        clearValue: { r: 0, g: 0, b: 0.1, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(vertexCount);
    renderPass.end();
  }
});

// Or manual command encoding
const encoder = executor.createCommandEncoder();
// ... encode commands ...
executor.submit(encoder);
```

### Cleanup

```typescript
// Destroy specific resource
executor.destroyResource(buffer.id);

// Dispose all resources and executor
executor.dispose();
```

## API Reference

### AdapterExecutor

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the executor (async) |
| `isInitialized()` | Check if executor is initialized |
| `getPreferredFormat()` | Get preferred texture format |
| `supportsFeature(feature)` | Check if a GPU feature is supported |
| `createBuffer(descriptor)` | Create a GPU buffer |
| `createTexture(descriptor)` | Create a GPU texture |
| `createShaderModule(code)` | Create a shader module from WGSL code |
| `createComputePipeline(descriptor)` | Create a compute pipeline (async) |
| `createRenderPipeline(descriptor)` | Create a render pipeline (async) |
| `writeBuffer(buffer, data, offset?)` | Write data to a buffer |
| `readBuffer(buffer)` | Read data from a buffer (async) |
| `createCommandEncoder()` | Create a command encoder |
| `submit(encoder)` | Submit encoded commands |
| `frame(callback)` | Execute a frame with automatic command encoding |
| `getCurrentTexture()` | Get current render target texture |
| `getResource(id)` | Get a managed resource by ID |
| `destroyResource(id)` | Destroy a specific resource |
| `getAdapter()` | Get the underlying IGPUAdapter |
| `dispose()` | Dispose all resources and cleanup |

### Configuration

```typescript
interface AdapterExecutorConfig {
  /** GPU adapter - dependency injection */
  adapter: IGPUAdapter;
}
```

## Hexagonal Architecture

The `AdapterExecutor` is designed following hexagonal architecture principles:

- **Depends on interfaces**: Uses `IGPUAdapter` interface, not concrete implementations
- **Environment agnostic**: Can work with any adapter (browser, worker, node, etc.)
- **Testable**: Easy to mock the adapter for testing
- **Extensible**: New adapters can be created for different environments

```
┌─────────────────────────────────────────┐
│           AdapterExecutor               │
│         (Domain/Application)            │
└─────────────────────────────────────────┘
                    │
                    │ depends on
                    ▼
┌─────────────────────────────────────────┐
│            IGPUAdapter                  │
│              (Port)                     │
└─────────────────────────────────────────┘
                    │
                    │ implemented by
                    ▼
┌─────────────────────────────────────────┐
│         BrowserGPUAdapter               │
│            (Adapter)                    │
└─────────────────────────────────────────┘
```
