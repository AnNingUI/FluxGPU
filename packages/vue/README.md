# @fluxgpu/vue

Vue composables and components for FluxGPU.

## Installation

```bash
pnpm add @fluxgpu/vue
# Dependencies are re-exported, but you can also install directly:
# pnpm add @fluxgpu/engine @fluxgpu/host-browser @fluxgpu/contracts
```

## Composables

### useGPU

Initialize GPU adapter and executor.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useGPU } from '@fluxgpu/vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { adapter, executor, error, isLoading } = useGPU(canvasRef);
</script>

<template>
  <div v-if="isLoading">Loading WebGPU...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <canvas v-else ref="canvasRef" width="800" height="600" />
</template>
```

### useGPUFrame

Run render callback every frame.

```ts
import { useGPU, useGPUFrame } from '@fluxgpu/vue';
import type { ICommandEncoder } from '@fluxgpu/contracts';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { executor } = useGPU(canvasRef);

const { start, stop, isRunning } = useGPUFrame(
  executor,
  (encoder: ICommandEncoder, deltaTime: number) => {
    // Render logic
  }
);
```

### useAnimationFrame

Low-level animation frame composable.

```ts
import { useAnimationFrame } from '@fluxgpu/vue';

const { start, stop, isRunning } = useAnimationFrame((deltaTime, time) => {
  // Called every frame
});
```

### useMouse

Track normalized mouse position (-1 to 1).

```ts
import { useMouse } from '@fluxgpu/vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const mousePos = useMouse(canvasRef);
// mousePos.value.x, mousePos.value.y
```

## Components

### GPUCanvas

Self-contained GPU canvas component.

```vue
<script setup lang="ts">
import { GPUCanvas } from '@fluxgpu/vue';
import type { ICommandEncoder } from '@fluxgpu/contracts';
import type { AdapterExecutor } from '@fluxgpu/vue';

function handleReady(executor: AdapterExecutor) {
  // Initialize pipelines
}

function handleRender({ encoder, deltaTime, executor }) {
  // Render frame
}
</script>

<template>
  <GPUCanvas
    :width="800"
    :height="600"
    @ready="handleReady"
    @render="handleRender"
  >
    <div class="overlay">FPS: 60</div>
  </GPUCanvas>
</template>
```

### GPUCanvas Props & Events

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number` | `800` | Canvas width |
| `height` | `number` | `600` | Canvas height |
| `devicePixelRatio` | `boolean` | `true` | Use device pixel ratio |
| `autoStart` | `boolean` | `true` | Auto-start render loop |

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | `AdapterExecutor` | Emitted when GPU is ready |
| `error` | `Error` | Emitted on error |
| `render` | `{ encoder, deltaTime, executor }` | Emitted each frame |

### GPUStats

Display GPU statistics overlay.

```vue
<GPUStats :executor="executor" position="top-right" />
```

## Full Example

```vue
<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';
import { useGPU, useGPUFrame, BrowserGPUAdapter } from '@fluxgpu/vue';
import type { ICommandEncoder, IComputePipeline, IRenderPipeline, IBuffer, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage } from '@fluxgpu/contracts';

const PARTICLE_COUNT = 10000;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { executor, isLoading, error } = useGPU(canvasRef);

const resources = shallowRef<{
  computePipeline: IComputePipeline;
  renderPipeline: IRenderPipeline;
  particleBuffer: IBuffer;
  computeBindGroup: IBindGroup;
  renderBindGroup: IBindGroup;
} | null>(null);

// Initialize resources when executor is ready
watch(executor, async (exec) => {
  if (!exec || resources.value) return;
  
  const adapter = exec.getAdapter() as BrowserGPUAdapter;
  
  // Create shader modules
  const computeModule = exec.createShaderModule(computeShaderCode);
  const vertexModule = exec.createShaderModule(vertexShaderCode);
  const fragmentModule = exec.createShaderModule(fragmentShaderCode);
  
  // Create pipelines
  const computePipeline = await exec.createComputePipeline({
    shader: computeModule,
    entryPoint: 'main',
  });
  
  const renderPipeline = await exec.createRenderPipeline({
    vertex: { shader: vertexModule, entryPoint: 'main' },
    fragment: {
      shader: fragmentModule,
      entryPoint: 'main',
      targets: [{ format: exec.getPreferredFormat() }],
    },
  });
  
  // Create buffers
  const particleBuffer = exec.createBuffer({
    size: PARTICLE_COUNT * 32,
    usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
  });
  
  // Create bind groups
  const computeBindGroup = adapter.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: particleBuffer } }],
  });
  
  const renderBindGroup = adapter.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: particleBuffer } }],
  });
  
  resources.value = {
    computePipeline,
    renderPipeline,
    particleBuffer,
    computeBindGroup,
    renderBindGroup,
  };
});

// Render loop
useGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
  const res = resources.value;
  if (!res || !executor.value) return;
  
  // Compute pass
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(res.computePipeline);
  computePass.setBindGroup(0, res.computeBindGroup);
  computePass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
  computePass.end();
  
  // Render pass
  const renderTarget = executor.value.getCurrentTexture();
  if (renderTarget) {
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: renderTarget.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    renderPass.setPipeline(res.renderPipeline);
    renderPass.setBindGroup(0, res.renderBindGroup);
    renderPass.draw(PARTICLE_COUNT * 6);
    renderPass.end();
  }
});
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <canvas
    v-else
    ref="canvasRef"
    :width="800 * devicePixelRatio"
    :height="600 * devicePixelRatio"
    :style="{ width: '800px', height: '600px' }"
  />
</template>
```

## Re-exports

For convenience, this package re-exports commonly used types and classes:

```ts
import {
  // Composables
  useGPU,
  useGPUFrame,
  useAnimationFrame,
  useMouse,
  
  // Components
  GPUCanvas,
  GPUStats,
  
  // Re-exported from @fluxgpu/engine
  AdapterExecutor,
  
  // Re-exported from @fluxgpu/host-browser
  BrowserGPUAdapter,
  
  // Re-exported types from @fluxgpu/contracts
  type IGPUAdapter,
  type ICommandEncoder,
  type IBuffer,
  type ITexture,
} from '@fluxgpu/vue';
```
