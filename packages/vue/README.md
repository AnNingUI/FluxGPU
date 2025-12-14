# @flux/vue

Vue composables and components for FluxGPU.

## Installation

```bash
pnpm add @flux/vue @flux/engine @flux/dsl vue
```

## Components

### GPUCanvas

Self-contained GPU canvas component.

```vue
<script setup lang="ts">
import { GPUCanvas } from '@flux/vue';
import type { GPUContext } from '@flux/engine';

function handleReady(gpu: GPUContext) {
  // Initialize pipelines
}

function handleRender(
  encoder: GPUCommandEncoder,
  target: GPUTextureView,
  deltaTime: number
) {
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

## Composables

### useGPU

Initialize GPU context.

```ts
const canvasRef = ref<HTMLCanvasElement | null>(null);
const { gpu, error, isLoading } = useGPU(canvasRef);
```

### useGPUFrame

Run render callback every frame.

```ts
const { start, stop, isRunning } = useGPUFrame(gpu, (encoder, target, dt) => {
  // Render logic
});
```

### useAnimationFrame

Low-level animation frame composable.

```ts
const { start, stop, isRunning } = useAnimationFrame((deltaTime, time) => {
  // Called every frame
});
```

### useComputePass / useRenderPass

Create GPU pipelines.

```ts
const computePass = useComputePass(gpu, shaderCode, [256]);
const renderPass = useRenderPass(gpu, vertexShader, fragmentShader);
```

### useUniformBuffer

Create typed uniform buffer.

```ts
const uniformBuffer = useUniformBuffer(gpu, UniformsStruct);
uniformBuffer.value?.update({ time: 0 });
```

### useMouse

Track normalized mouse position.

```ts
const mousePos = useMouse(canvasRef);
// mousePos.value.x, mousePos.value.y
```

## Full Example

```vue
<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { GPUCanvas } from '@flux/vue';
import { GPUContext } from '@flux/engine';

const attraction = ref(0.5);
const damping = ref(0.98);
const resources = shallowRef(null);

function handleReady(gpu: GPUContext) {
  resources.value = {
    computePass: gpu.createComputePass(computeShader, [256]),
    renderPass: gpu.createRenderPass(vertexShader, fragmentShader),
  };
}

function handleRender(encoder, target, dt) {
  const { computePass, renderPass } = resources.value;
  computePass.dispatch(encoder, PARTICLE_COUNT);
  renderPass.draw(encoder, target, PARTICLE_COUNT * 6);
}
</script>

<template>
  <GPUCanvas
    :width="800"
    :height="600"
    @ready="handleReady"
    @render="handleRender"
  />
</template>
```
