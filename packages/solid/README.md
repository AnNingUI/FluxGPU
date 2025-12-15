# @fluxgpu/solid

SolidJS primitives and components for FluxGPU.

## Installation

```bash
pnpm add @fluxgpu/solid
# Dependencies are re-exported, but you can also install directly:
# pnpm add @fluxgpu/engine @fluxgpu/host-browser @fluxgpu/contracts
```

## Primitives

### createGPU

Initialize GPU adapter and executor.

```tsx
import { createSignal } from 'solid-js';
import { createGPU } from '@fluxgpu/solid';

function App() {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  const { adapter, executor, error, isLoading } = createGPU(canvas);

  return (
    <Show when={!isLoading()} fallback={<div>Loading WebGPU...</div>}>
      <Show when={!error()} fallback={<div>Error: {error()?.message}</div>}>
        <canvas ref={setCanvas} width={800} height={600} />
      </Show>
    </Show>
  );
}
```

### createGPUFrame

Run render callback every frame.

```tsx
import { createGPU, createGPUFrame } from '@fluxgpu/solid';
import type { ICommandEncoder } from '@fluxgpu/contracts';

const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
const { executor } = createGPU(canvas);

const { start, stop, isRunning } = createGPUFrame(
  executor,
  (encoder: ICommandEncoder, deltaTime: number) => {
    // Render logic - signals accessed here are reactive!
  },
  true // autoStart
);
```

### createAnimationFrame

Low-level animation frame primitive.

```tsx
import { createAnimationFrame } from '@fluxgpu/solid';

const { start, stop, isRunning } = createAnimationFrame((deltaTime, time) => {
  // Called every frame
});
```

### createMouse

Track normalized mouse position (-1 to 1).

```tsx
import { createMouse } from '@fluxgpu/solid';

const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
const { x, y } = createMouse(canvas);
// x() and y() are signals
```

## Components

### GPUCanvas

Self-contained GPU canvas component.

```tsx
import { GPUCanvas } from '@fluxgpu/solid';
import type { ICommandEncoder } from '@fluxgpu/contracts';
import type { AdapterExecutor } from '@fluxgpu/solid';

function App() {
  function handleReady(executor: AdapterExecutor) {
    // Initialize pipelines
  }

  function handleRender(encoder: ICommandEncoder, deltaTime: number) {
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
<GPUStats executor={executor()} position="top-right" />
```

## Reactivity Note

In SolidJS, signals accessed inside `onRender` are automatically reactive. When you call `attraction()` or `damping()` inside the render callback, changes to these signals will be reflected in the next frame without any additional setup.

## Full Example

```tsx
import { createSignal, createEffect, onCleanup } from 'solid-js';
import { createGPU, createGPUFrame, BrowserGPUAdapter } from '@fluxgpu/solid';
import type { ICommandEncoder, IComputePipeline, IRenderPipeline, IBuffer, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage } from '@fluxgpu/contracts';

const PARTICLE_COUNT = 10000;

export default function ParticleDemo() {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  const { executor, isLoading, error } = createGPU(canvas);
  
  const [attraction, setAttraction] = createSignal(0.5);
  const [damping, setDamping] = createSignal(0.98);
  
  let resources: {
    computePipeline: IComputePipeline;
    renderPipeline: IRenderPipeline;
    particleBuffer: IBuffer;
    uniformBuffer: IBuffer;
    computeBindGroup: IBindGroup;
    renderBindGroup: IBindGroup;
  } | null = null;

  // Initialize resources when executor is ready
  createEffect(async () => {
    const exec = executor();
    if (!exec || resources) return;
    
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
    
    const uniformBuffer = exec.createBuffer({
      size: 24,
      usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });
    
    // Create bind groups
    const computeBindGroup = adapter.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: uniformBuffer } },
      ],
    });
    
    const renderBindGroup = adapter.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: particleBuffer } }],
    });
    
    resources = {
      computePipeline,
      renderPipeline,
      particleBuffer,
      uniformBuffer,
      computeBindGroup,
      renderBindGroup,
    };
  });

  // Render loop
  createGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
    const exec = executor();
    if (!resources || !exec) return;
    
    // Update uniforms - signals are reactive!
    const uniformData = new Float32Array([
      deltaTime / 1000,
      performance.now() / 1000,
      0, 0, // mouse position
      attraction(),
      damping(),
    ]);
    exec.writeBuffer(resources.uniformBuffer, uniformData);
    
    // Compute pass
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(resources.computePipeline);
    computePass.setBindGroup(0, resources.computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
    computePass.end();
    
    // Render pass
    const renderTarget = exec.getCurrentTexture();
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

  return (
    <>
      <Show when={isLoading()}>
        <div>Loading...</div>
      </Show>
      <Show when={error()}>
        <div>Error: {error()?.message}</div>
      </Show>
      <Show when={!isLoading() && !error()}>
        <canvas
          ref={setCanvas}
          width={800 * devicePixelRatio}
          height={600 * devicePixelRatio}
          style={{ width: '800px', height: '600px' }}
        />
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={attraction()}
          onInput={(e) => setAttraction(parseFloat(e.currentTarget.value))}
        />
      </Show>
    </>
  );
}
```

## Re-exports

For convenience, this package re-exports commonly used types and classes:

```tsx
import {
  // Primitives
  createGPU,
  createGPUFrame,
  createAnimationFrame,
  createMouse,
  
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
} from '@fluxgpu/solid';
```
