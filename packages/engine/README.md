# @flux/engine

WebGPU executor and high-level API for FluxGPU.

## Overview

This package provides the main GPU abstraction layer:

- **GPUContext**: High-level WebGPU wrapper
- **ComputePass**: Compute pipeline management
- **RenderPass**: Render pipeline management
- **UniformBuffer**: Type-safe uniform buffer handling

## Installation

```bash
pnpm add @flux/engine @flux/dsl
```

## Usage

### Initialize GPU Context

```typescript
import { GPUContext } from '@flux/engine';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gpu = await GPUContext.create({ canvas });
```

### Create Compute Pass

```typescript
const computePass = gpu.createComputePass(computeShaderCode, [256]);

// Bind resources
computePass.bind(0, [
  { binding: 0, resource: particleBuffer },
  { binding: 1, resource: uniformBuffer.buffer },
]);

// Dispatch
gpu.frame((encoder, target) => {
  computePass.dispatch(encoder, particleCount);
});
```

### Create Render Pass

```typescript
const renderPass = gpu.createRenderPass(vertexShader, fragmentShader, {
  topology: 'triangle-list',
});

renderPass.bind(0, [
  { binding: 0, resource: particleBuffer },
]);

gpu.frame((encoder, target) => {
  renderPass.draw(encoder, target, vertexCount, {
    clearColor: { r: 0, g: 0, b: 0, a: 1 },
  });
});
```

### Uniform Buffers

```typescript
import { defineStruct, f32, vec2 } from '@flux/dsl';

const Uniforms = defineStruct('Uniforms', {
  time: f32,
  resolution: vec2(f32),
});

const uniformBuffer = gpu.createUniformBuffer(Uniforms);

// Update with type safety
uniformBuffer.update({
  time: performance.now() / 1000,
  resolution: [canvas.width, canvas.height],
});
```

## API Reference

### GPUContext

| Method | Description |
|--------|-------------|
| `create(options)` | Create GPU context from canvas |
| `createComputePass(shader, workgroupSize)` | Create compute pipeline |
| `createRenderPass(vertex, fragment, options)` | Create render pipeline |
| `createUniformBuffer(structType)` | Create typed uniform buffer |
| `frame(callback)` | Execute frame with command encoder |

### ComputePass

| Method | Description |
|--------|-------------|
| `bind(group, bindings)` | Bind resources to group |
| `dispatch(encoder, count)` | Dispatch compute work |

### RenderPass

| Method | Description |
|--------|-------------|
| `bind(group, bindings)` | Bind resources to group |
| `draw(encoder, target, count, options)` | Draw vertices |
