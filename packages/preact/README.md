# @fluxgpu/preact

Preact hooks and components for FluxGPU.

## Installation

```bash
pnpm add @fluxgpu/preact @fluxgpu/engine @fluxgpu/dsl preact
```

## Components

### GPUCanvas

Self-contained GPU canvas with automatic lifecycle management.

```tsx
import { GPUCanvas } from '@fluxgpu/preact';
import type { GPUContext } from '@fluxgpu/engine';

function App() {
  function handleReady(gpu: GPUContext) {
    // Initialize pipelines and buffers
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
      autoStart={true}
    >
      <div class="overlay">FPS: 60</div>
    </GPUCanvas>
  );
}
```

### GPUCanvas Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number` | `800` | Canvas width |
| `height` | `number` | `600` | Canvas height |
| `devicePixelRatio` | `boolean` | `true` | Use device pixel ratio |
| `autoStart` | `boolean` | `true` | Auto-start render loop |
| `onReady` | `(gpu: GPUContext) => void` | - | Called when GPU is ready |
| `onRender` | `(encoder, target, dt) => void` | - | Called each frame |
| `onError` | `(error: Error) => void` | - | Called on error |

## Hooks

### useGPUContext

Initialize GPU context from a canvas ref.

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null);
const { gpu, error, isLoading } = useGPUContext(canvasRef);
```

### useGPUFrame

Run a render callback every frame.

```tsx
useGPUFrame(gpu, (encoder, target, deltaTime) => {
  // Render logic
}, active);
```

### useAnimationFrame

Low-level animation frame hook.

```tsx
useAnimationFrame((deltaTime, time) => {
  // Called every frame
}, active);
```

### useComputePass / useRenderPass

Create GPU pipelines with automatic memoization.

```tsx
const computePass = useComputePass(gpu, shaderCode, [256]);
const renderPass = useRenderPass(gpu, vertexShader, fragmentShader);
```

### useUniformBuffer

Create typed uniform buffer.

```tsx
const uniformBuffer = useUniformBuffer(gpu, UniformsStruct);
uniformBuffer?.update({ time: 0, resolution: [800, 600] });
```

### useMouse

Track normalized mouse position (-1 to 1).

```tsx
const { x, y } = useMouse(canvasRef);
```

## API Compatibility

The @fluxgpu/preact API mirrors @fluxgpu/react exactly, making it easy to switch between frameworks or share code.

## Full Example

```tsx
import { useRef, useState, useCallback } from 'preact/hooks';
import { GPUCanvas } from '@fluxgpu/preact';
import { GPUContext } from '@fluxgpu/engine';

export default function ParticleDemo() {
  const [fps, setFps] = useState(0);
  const resourcesRef = useRef(null);

  const handleReady = useCallback((gpu: GPUContext) => {
    resourcesRef.current = {
      computePass: gpu.createComputePass(computeShader, [256]),
      renderPass: gpu.createRenderPass(vertexShader, fragmentShader),
    };
  }, []);

  const handleRender = useCallback((encoder, target, dt) => {
    const { computePass, renderPass } = resourcesRef.current;
    computePass.dispatch(encoder, PARTICLE_COUNT);
    renderPass.draw(encoder, target, PARTICLE_COUNT * 6);
  }, []);

  return (
    <GPUCanvas
      width={800}
      height={600}
      onReady={handleReady}
      onRender={handleRender}
    />
  );
}
```
