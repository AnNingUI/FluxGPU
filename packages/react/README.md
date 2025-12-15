# @fluxgpu/react

React hooks and components for FluxGPU.

## Installation

```bash
pnpm add @fluxgpu/react
# Dependencies are re-exported, but you can also install directly:
# pnpm add @fluxgpu/engine @fluxgpu/host-browser @fluxgpu/contracts
```

## Hooks

### useGPU

Initialize GPU adapter and executor from a canvas ref.

```tsx
import { useRef } from 'react';
import { useGPU } from '@fluxgpu/react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { adapter, executor, error, isLoading } = useGPU(canvasRef);

  if (isLoading) return <div>Loading WebGPU...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <canvas ref={canvasRef} width={800} height={600} />;
}
```

### useGPUFrame

Run a render callback every frame.

```tsx
import { useGPU, useGPUFrame } from '@fluxgpu/react';
import type { ICommandEncoder } from '@fluxgpu/contracts';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { executor } = useGPU(canvasRef);

  useGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
    // Render logic here
  });

  return <canvas ref={canvasRef} width={800} height={600} />;
}
```

### useAnimationFrame

Low-level animation frame hook.

```tsx
import { useAnimationFrame } from '@fluxgpu/react';

useAnimationFrame((deltaTime, time) => {
  // Called every frame
}, active);
```

### useMouse

Track normalized mouse position (-1 to 1).

```tsx
import { useMouse } from '@fluxgpu/react';

const canvasRef = useRef<HTMLCanvasElement>(null);
const { x, y } = useMouse(canvasRef);
```

## Components

### GPUCanvas

Self-contained GPU canvas with automatic lifecycle management.

```tsx
import { GPUCanvas } from '@fluxgpu/react';
import type { ICommandEncoder } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/react';

function App() {
  const handleReady = (executor: AdapterExecutor) => {
    // Initialize pipelines and buffers
  };

  const handleRender = (encoder: ICommandEncoder, deltaTime: number) => {
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
| `onReady` | `(executor: AdapterExecutor) => void` | - | Called when GPU is ready |
| `onRender` | `(encoder: ICommandEncoder, deltaTime: number) => void` | - | Called each frame |
| `onError` | `(error: Error) => void` | - | Called on error |

### GPUStats

Display GPU statistics overlay.

```tsx
import { GPUStats } from '@fluxgpu/react';

<GPUStats position="top-right" />
```

## Full Example

```tsx
import { useRef, useState, useCallback, useMemo } from 'react';
import { useGPU, useGPUFrame, BrowserGPUAdapter } from '@fluxgpu/react';
import type { ICommandEncoder, IComputePipeline, IRenderPipeline, IBuffer, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/react';

const PARTICLE_COUNT = 10000;

export default function ParticleDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { executor, isLoading, error } = useGPU(canvasRef);
  
  const resourcesRef = useRef<{
    computePipeline: IComputePipeline;
    renderPipeline: IRenderPipeline;
    particleBuffer: IBuffer;
    computeBindGroup: IBindGroup;
    renderBindGroup: IBindGroup;
  } | null>(null);

  // Initialize resources when executor is ready
  useCallback(async () => {
    if (!executor || resourcesRef.current) return;
    
    const adapter = executor.getAdapter() as BrowserGPUAdapter;
    
    // Create shader modules
    const computeModule = executor.createShaderModule(computeShaderCode);
    const vertexModule = executor.createShaderModule(vertexShaderCode);
    const fragmentModule = executor.createShaderModule(fragmentShaderCode);
    
    // Create pipelines
    const computePipeline = await executor.createComputePipeline({
      shader: computeModule,
      entryPoint: 'main',
    });
    
    const renderPipeline = await executor.createRenderPipeline({
      vertex: { shader: vertexModule, entryPoint: 'main' },
      fragment: {
        shader: fragmentModule,
        entryPoint: 'main',
        targets: [{ format: executor.getPreferredFormat() }],
      },
    });
    
    // Create buffers
    const particleBuffer = executor.createBuffer({
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
    
    resourcesRef.current = {
      computePipeline,
      renderPipeline,
      particleBuffer,
      computeBindGroup,
      renderBindGroup,
    };
  }, [executor]);

  // Render loop
  useGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
    const resources = resourcesRef.current;
    if (!resources) return;
    
    // Compute pass
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(resources.computePipeline);
    computePass.setBindGroup(0, resources.computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
    computePass.end();
    
    // Render pass
    const renderTarget = executor!.getCurrentTexture();
    if (renderTarget) {
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: renderTarget.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      renderPass.setPipeline(resources.renderPipeline);
      renderPass.setBindGroup(0, resources.renderBindGroup);
      renderPass.draw(PARTICLE_COUNT * 6);
      renderPass.end();
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

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

## Re-exports

For convenience, this package re-exports commonly used types and classes:

```tsx
import {
  // Hooks
  useGPU,
  useGPUFrame,
  useAnimationFrame,
  useMouse,
  
  // Components
  GPUCanvas,
  FluxCanvas,
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
} from '@fluxgpu/react';
```
