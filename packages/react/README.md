# @flux/react

React hooks and components for FluxGPU.

## Installation

```bash
pnpm add @flux/react @flux/engine @flux/dsl react
```

## Components

### GPUCanvas

Self-contained GPU canvas with automatic lifecycle management.

```tsx
import { GPUCanvas } from '@flux/react';
import { GPUContext } from '@flux/engine';

function App() {
  const handleReady = (gpu: GPUContext) => {
    // Initialize pipelines and buffers
  };

  const handleRender = (
    encoder: GPUCommandEncoder,
    target: GPUTextureView,
    deltaTime: number
  ) => {
    // Render frame
  };

  return (
    <GPUCanvas
      width={800}
      height={600}
      onReady={handleReady}
      onRender={handleRender}
      autoStart={true}
    >
      <div className="overlay">FPS: 60</div>
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

## Full Example

```tsx
import { useRef, useState, useCallback } from 'react';
import { GPUCanvas } from '@flux/react';
import { GPUContext } from '@flux/engine';

export default function ParticleDemo() {
  const [fps, setFps] = useState(0);
  const resourcesRef = useRef(null);

  const handleReady = useCallback((gpu: GPUContext) => {
    const computePass = gpu.createComputePass(computeShader, [256]);
    const renderPass = gpu.createRenderPass(vertexShader, fragmentShader);
    resourcesRef.current = { computePass, renderPass };
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
