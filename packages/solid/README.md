# @fluxgpu/solid

SolidJS primitives and components for FluxGPU.

## Installation

```bash
pnpm add @fluxgpu/solid @fluxgpu/engine @fluxgpu/dsl solid-js
```

## Components

### GPUCanvas

Self-contained GPU canvas component.

```tsx
import { GPUCanvas } from '@fluxgpu/solid';
import type { GPUContext } from '@fluxgpu/engine';

function App() {
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

  return (
    <GPUCanvas
      width={800}
      height={600}
      onReady={handleReady}
      onRender={handleRender}
    >
      <div class="overlay">FPS: 60</div>
    </GPUCanvas>
  );
}
```

## Primitives

### createGPU

Initialize GPU context.

```tsx
const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
const { gpu, error, isLoading } = createGPU(canvas);
```

### createGPUFrame

Run render callback every frame.

```tsx
const { start, stop, isRunning } = createGPUFrame(gpu, (encoder, target, dt) => {
  // Render logic - signals accessed here are reactive!
}, autoStart);
```

### createAnimationFrame

Low-level animation frame primitive.

```tsx
const { start, stop, isRunning } = createAnimationFrame((deltaTime, time) => {
  // Called every frame
});
```

### createComputePass / createRenderPass

Create GPU pipelines as reactive accessors.

```tsx
const computePass = createComputePass(gpu, shaderCode, [256]);
const renderPass = createRenderPass(gpu, vertexShader, fragmentShader);

// Access with ()
computePass()?.dispatch(encoder, count);
```

### createUniformBuffer

Create typed uniform buffer.

```tsx
const uniformBuffer = createUniformBuffer(gpu, UniformsStruct);
uniformBuffer()?.update({ time: 0 });
```

### createMouse

Track normalized mouse position.

```tsx
const { x, y } = createMouse(canvas);
// x() and y() are signals
```

## Full Example

```tsx
import { createSignal } from 'solid-js';
import { GPUCanvas } from '@fluxgpu/solid';
import { GPUContext } from '@fluxgpu/engine';

export default function ParticleDemo() {
  const [attraction, setAttraction] = createSignal(0.5);
  const [damping, setDamping] = createSignal(0.98);
  
  let resources: { computePass: any; renderPass: any } | null = null;

  function handleReady(gpu: GPUContext) {
    resources = {
      computePass: gpu.createComputePass(computeShader, [256]),
      renderPass: gpu.createRenderPass(vertexShader, fragmentShader),
    };
  }

  function handleRender(encoder, target, dt) {
    if (!resources) return;
    
    // Signals are reactive - changes trigger updates
    uniformBuffer.update({
      attraction: attraction(),
      damping: damping(),
    });
    
    resources.computePass.dispatch(encoder, PARTICLE_COUNT);
    resources.renderPass.draw(encoder, target, PARTICLE_COUNT * 6);
  }

  return (
    <>
      <GPUCanvas
        width={800}
        height={600}
        onReady={handleReady}
        onRender={handleRender}
      />
      <input
        type="range"
        value={attraction()}
        onInput={(e) => setAttraction(parseFloat(e.currentTarget.value))}
      />
    </>
  );
}
```

## Reactivity Note

In SolidJS, signals accessed inside `onRender` are automatically reactive. When you call `attraction()` or `damping()` inside the render callback, changes to these signals will be reflected in the next frame without any additional setup.
