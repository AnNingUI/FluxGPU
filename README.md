# FluxGPU v5.0

A modern WebGPU framework with Hexagonal Architecture, type-safe shader DSL, and first-class framework bindings.

## Features

- 🎯 **Type-safe Shader DSL** - Write WGSL shaders with TypeScript, full type inference
- 🏗️ **Hexagonal Architecture** - Clean separation of concerns with Ports & Adapters
- ⚛️ **Framework Bindings** - React, Vue, Solid, Preact support out of the box
- 🚀 **High Performance** - Optimized for real-time graphics and compute
- 📦 **Tree-shakeable** - Only bundle what you use

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                   Framework Layer                                 │
│   @fluxgpu/react  @fluxgpu/vue  @fluxgpu/solid  @fluxgpu/preact   │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                              │
│           @fluxgpu/engine    @fluxgpu/host-browser                │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                    Bridge Layer                                   │
│                   @fluxgpu/protocol                               │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│                    Domain Layer                                   │
│        @fluxgpu/contracts  @fluxgpu/core  @fluxgpu/dsl            │
└───────────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| [@fluxgpu/contracts](./packages/contracts) | Pure TypeScript interfaces (zero dependencies) |
| [@fluxgpu/core](./packages/core) | Graph orchestration and shadow state |
| [@fluxgpu/dsl](./packages/dsl) | Functional shader composition DSL |
| [@fluxgpu/protocol](./packages/protocol) | Binary communication protocol |
| [@fluxgpu/engine](./packages/engine) | WebGPU executor and high-level API |
| [@fluxgpu/host-browser](./packages/host-browser) | Browser runtime adapter |
| [@fluxgpu/react](./packages/react) | React hooks and components |
| [@fluxgpu/vue](./packages/vue) | Vue composables and components |
| [@fluxgpu/solid](./packages/solid) | SolidJS primitives and components |
| [@fluxgpu/preact](./packages/preact) | Preact hooks and components |

## Quick Start

```bash
# Install core packages
pnpm add @fluxgpu/engine @fluxgpu/host-browser @fluxgpu/contracts

# Add framework bindings (choose one)
pnpm add @fluxgpu/react    # for React
pnpm add @fluxgpu/vue      # for Vue
pnpm add @fluxgpu/solid    # for SolidJS
pnpm add @fluxgpu/preact   # for Preact

# Optional: Type-safe shader DSL
pnpm add @fluxgpu/dsl
```

### React Example

```tsx
import { useRef } from 'react';
import { useGPU, useGPUFrame } from '@fluxgpu/react';
import type { ICommandEncoder } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { executor, isLoading, error } = useGPU(canvasRef);

  // Render loop
  useGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
    // Your render logic here
  });

  return (
    <canvas
      ref={canvasRef}
      width={800 * devicePixelRatio}
      height={600 * devicePixelRatio}
      style={{ width: 800, height: 600 }}
    />
  );
}
```

### Vue Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useGPU, useGPUFrame } from '@fluxgpu/vue';
import type { ICommandEncoder } from '@fluxgpu/contracts';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { executor, isLoading, error } = useGPU(canvasRef);

useGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
  // Your render logic here
});
</script>

<template>
  <canvas ref="canvasRef" :width="800 * devicePixelRatio" :height="600 * devicePixelRatio" />
</template>
```

### SolidJS Example

```tsx
import { createSignal } from 'solid-js';
import { createGPU, createGPUFrame } from '@fluxgpu/solid';
import type { ICommandEncoder } from '@fluxgpu/contracts';

function App() {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  const { executor, isLoading, error } = createGPU(canvas);

  createGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
    // Your render logic here
  });

  return <canvas ref={setCanvas} width={800} height={600} />;
}
```

### Shader DSL Example

```typescript
import { ShaderBuilder, defineStruct, f32, u32, vec2, vec3, array } from '@fluxgpu/dsl';

// Define struct types
const Particle = defineStruct('Particle', {
  position: vec2(f32),
  velocity: vec2(f32),
  color: vec3(f32),
  life: f32,
});

const Uniforms = defineStruct('Uniforms', {
  deltaTime: f32,
  time: f32,
});

// Build compute shader
const computeShader = new ShaderBuilder()
  .storage('particles', array(Particle), 0, 0, 'read_write')
  .uniform('uniforms', Uniforms, 0, 1)
  .compute([256], (ctx, { globalInvocationId }) => {
    const index = ctx.let('index', u32, globalInvocationId.x);
    ctx.if(index.ge(particles.len()), () => ctx.return());
    // ... shader logic
  })
  .build();
```

## Core API

### AdapterExecutor

The main entry point for GPU operations:

```typescript
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';
import { BufferUsage } from '@fluxgpu/contracts';

// Initialize
const adapter = new BrowserGPUAdapter({ canvas });
const executor = new AdapterExecutor({ adapter });
await executor.initialize();

// Create resources
const buffer = executor.createBuffer({
  size: 1024,
  usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
});
const shader = executor.createShaderModule(wgslCode);
const pipeline = await executor.createComputePipeline({
  shader,
  entryPoint: 'main',
});

// Execute commands
executor.frame((encoder) => {
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(64);
  pass.end();
});

// Cleanup
executor.dispose();
```

### Framework Bindings API

| Framework | Hooks/Primitives | Components |
|-----------|------------------|------------|
| React | `useGPU`, `useGPUFrame`, `useMouse`, `useAnimationFrame` | `GPUCanvas`, `FluxCanvas`, `GPUStats` |
| Vue | `useGPU`, `useGPUFrame`, `useMouse`, `useAnimationFrame` | `GPUCanvas`, `GPUStats` |
| SolidJS | `createGPU`, `createGPUFrame`, `createMouse`, `createAnimationFrame` | `GPUCanvas`, `GPUStats` |
| Preact | `useGPU`, `useGPUFrame`, `useMouse`, `useAnimationFrame` | `GPUCanvas`, `GPUStats` |

## Examples

```bash
# Run examples
pnpm --filter "@fluxgpu/example-vanilla" dev         # http://localhost:8000
pnpm --filter "@fluxgpu/example-react" dev           # http://localhost:8001
pnpm --filter "@fluxgpu/example-vue" dev             # http://localhost:8002
pnpm --filter "@fluxgpu/example-solid" dev           # http://localhost:8003
pnpm --filter "@fluxgpu/example-preact" dev          # http://localhost:8004
pnpm --filter "@fluxgpu/example-vanilla-worker" dev  # http://localhost:8005 (host-browser)
```

### Example Descriptions

| Example | Description |
|---------|-------------|
| vanilla | Basic TypeScript with AdapterExecutor (direct mode) |
| vanilla-worker | Using @fluxgpu/host-browser Worker APIs |
| react | React hooks and components |
| vue | Vue composables and components |
| solid | SolidJS primitives and components |
| preact | Preact hooks and components |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## License

MIT
