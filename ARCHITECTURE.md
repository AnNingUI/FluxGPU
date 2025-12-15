# FluxGPU Architecture

## Core Principle

**All domain packages are decoupled from specific hosts** - True hexagonal architecture, no backward compatibility burden.

## Current Status ✅

Architecture refactoring completed:

- ✅ Define `IGPUAdapter` and other Port interfaces in `contracts`
- ✅ Refactor `core` to only support `IGPUAdapter` (no backward compatibility)
- ✅ Add `AdapterExecutor` in `engine` (based on `IGPUAdapter`)
- ✅ Add `BrowserGPUAdapter` in `host-browser` (implements `IGPUAdapter`)
- ✅ Add Worker mode support in `host-browser` (`WorkerHost`, `WorkerExecutor`)
- ✅ Update all framework bindings (react, vue, solid, preact)
- ✅ Update all examples (vanilla, vanilla-worker, react, vue, solid, preact)

## Architecture Diagram

```
+=====================================================================+
|                        APPLICATION LAYER                            |
|              User Code / Examples / Framework Bindings              |
|                                                                     |
|    const adapter = new BrowserGPUAdapter({ canvas });               |
|    const executor = new AdapterExecutor({ adapter });               |
|    await executor.initialize();                                     |
+=====================================================================+
                                 |
                                 | Dependency Injection
                                 v
+=====================================================================+
|                   DOMAIN LAYER (Environment Agnostic)               |
|                                                                     |
|   +-----------------+  +-----------------+  +-----------------+     |
|   |   @fluxgpu/     |  |   @fluxgpu/     |  |   @fluxgpu/     |     |
|   |     core        |  |     engine      |  |     dsl         |     |
|   |                 |  |                 |  |                 |     |
|   | - createFlux    |  | - AdapterExec   |  | - shader()      |     |
|   | - CommandGraph  |  | - Resource Mgmt |  | - defineStruct  |     |
|   | - ShadowState   |  | - frame()       |  | - types/builtin |     |
|   +--------+--------+  +--------+--------+  +-----------------+     |
|            |                    |                                   |
|            +----------+---------+                                   |
|                       v                                             |
|   +-------------------------------------------------------------+   |
|   |                    @fluxgpu/contracts                       |   |
|   |                                                             |   |
|   |  - IGPUAdapter        (GPU adapter interface)               |   |
|   |  - IBuffer/ITexture   (Abstract resource interfaces)        |   |
|   |  - ICommandEncoder    (Command encoding interface)          |   |
|   |  - BufferUsage        (Usage flag enums)                    |   |
|   |  - Opcode             (Command opcodes)                     |   |
|   |  - Error types        (InitializationError, etc.)           |   |
|   +-------------------------------------------------------------+   |
|                       ^                                             |
|                       |                                             |
|   +-----------------+ |                                             |
|   |   @fluxgpu/     | |                                             |
|   |   protocol      +-+  <-- Serialization (for Worker comm)        |
|   |                 |                                               |
|   | - serialize     |                                               |
|   | - deserialize   |                                               |
|   | - RingBuffer    |                                               |
|   +-----------------+                                               |
+=====================================================================+
                                 ^
                                 | Implements Interface
                                 |
+=====================================================================+
|                   ADAPTER LAYER (Environment Specific)              |
|                                                                     |
|   +-------------------------------------------------------------+   |
|   |                  @fluxgpu/host-browser                      |   |
|   |                                                             |   |
|   |  Main Thread Mode:                                          |   |
|   |  - BrowserGPUAdapter    (implements IGPUAdapter)            |   |
|   |  - CanvasManager        (Canvas management)                 |   |
|   |  - AnimationLoop        (Animation loop)                    |   |
|   |  - FeatureDetection     (Feature detection)                 |   |
|   |                                                             |   |
|   |  Worker Mode:                                               |   |
|   |  - WorkerHost           (Main thread Worker manager)        |   |
|   |  - WorkerExecutor       (Worker-side executor)              |   |
|   |  - IWorkerRenderer      (Renderer interface)                |   |
|   |  - createWorkerHandler  (Worker entry helper)               |   |
|   +-------------------------------------------------------------+   |
|                                                                     |
|   +-----------------+  +-----------------+                          |
|   |   @fluxgpu/     |  |   @fluxgpu/     |                          |
|   |   host-node     |  |   host-deno     |                          |
|   |   (future)      |  |   (future)      |                          |
|   +-----------------+  +-----------------+                          |
+=====================================================================+
                                 |
                                 v
+=====================================================================+
|                       FRAMEWORK BINDINGS                            |
|                                                                     |
|   +-------------+  +-------------+  +-------------+  +-------------+|
|   |  @fluxgpu/  |  |  @fluxgpu/  |  |  @fluxgpu/  |  |  @fluxgpu/  ||
|   |    react    |  |    vue      |  |    solid    |  |   preact    ||
|   |             |  |             |  |             |  |             ||
|   | - useGPU    |  | - useGPU    |  | - createGPU |  | - useGPU    ||
|   | - useGPU    |  | - useGPU    |  | - createGPU |  | - useGPU    ||
|   |   Frame     |  |   Frame     |  |   Frame     |  |   Frame     ||
|   | - useMouse  |  | - useMouse  |  | - createMou |  | - useMouse  ||
|   +-------------+  +-------------+  +-------------+  +-------------+|
+=====================================================================+
```

## Worker Mode Architecture

```
+----------------------------------+     +----------------------------------+
|          MAIN THREAD             |     |         GPU WORKER THREAD        |
|                                  |     |                                  |
|  +----------------------------+  |     |  +----------------------------+  |
|  |        WorkerHost          |  |     |  |      WorkerExecutor        |  |
|  |                            |  |     |  |                            |  |
|  |  - initialize()            |  |     |  |  - WebGPU Device           |  |
|  |  - requestFrame(uniforms)  |  |     |  |  - OffscreenCanvas         |  |
|  |  - sendCommand(data)       |  |     |  |  - IWorkerRenderer         |  |
|  |  - setOnFrameComplete()    |  |     |  |  - executeCommand()        |  |
|  +-------------+--------------+  |     |  +-------------+--------------+  |
|                |                 |     |                ^                 |
+----------------|-----------------|     |----------------|-----------------|
                 |                       |                |
                 |    postMessage        |                |
                 |  +--------------+     |                |
                 +->| WorkerInit   |---->+----------------+
                    | WorkerFrame  |
                    | WorkerCommand|
                    +--------------+
                           |
                    +--------------+
                    | FrameComplete|<----+
                    | Ready        |
                    | Error        |
                    +--------------+
```

## Package Details

### `@fluxgpu/contracts` - Pure Interface Definitions

**Responsibility**: Define all Port interfaces and types, zero runtime dependencies

**Exports**:
- `IGPUAdapter` - Core GPU adapter interface
- `IBuffer`, `ITexture`, `IShaderModule` - Abstract resource interfaces
- `IComputePipeline`, `IRenderPipeline` - Pipeline interfaces
- `ICommandEncoder`, `IComputePassEncoder`, `IRenderPassEncoder` - Command encoding
- `BufferUsage`, `TextureUsage` - Usage flag enums
- `BufferDescriptor`, `TextureDescriptor` - Descriptor types
- `Opcode`, `CommandBuffer` - Command protocol types
- `ResourceId`, `NodeId`, `CommandId` - Branded types
- Error types: `InitializationError`, `RuntimeError`, `ValidationError`

**Dependencies**: None

---

### `@fluxgpu/protocol` - Serialization Protocol

**Responsibility**: Command serialization/deserialization for Worker communication

**Exports**:
- `serializeCommand()` - Serialize command
- `deserializeCommand()` - Deserialize command
- `RingBuffer` - Lock-free ring buffer (SharedArrayBuffer)

**Dependencies**: `@fluxgpu/contracts`

---

### `@fluxgpu/core` - Core Orchestration

**Responsibility**: State management, command graph building, lifecycle management

**Exports**:
- `createFlux()` - Create Flux instance
- `FluxInstance` - Flux instance interface
- `ShadowStateManager` - Shadow state management
- `createCommandGraph()`, `validateGraph()` - Command graph operations

**Dependencies**: `@fluxgpu/contracts`

---

### `@fluxgpu/engine` - Executor

**Responsibility**: Adapter-based command execution and resource management

**Exports**:
- `AdapterExecutor` - Adapter executor
  - `initialize()` - Initialize
  - `createBuffer()`, `createTexture()` - Resource creation
  - `createShaderModule()` - Shader creation
  - `createComputePipeline()`, `createRenderPipeline()` - Pipeline creation
  - `writeBuffer()`, `readBuffer()` - Data operations
  - `frame()` - Execute one frame
  - `getCurrentTexture()` - Get render target
  - `dispose()` - Cleanup resources

**Dependencies**: `@fluxgpu/contracts`

---

### `@fluxgpu/dsl` - Shader DSL

**Responsibility**: Type-safe WGSL shader generation

**Exports**:
- `shader()` - Create shader builder
- `defineStruct()` - Define struct
- Types: `f32`, `u32`, `i32`, `vec2`, `vec3`, `vec4`, `mat4`, `array`
- Builtins: `sin`, `cos`, `normalize`, `length`, `clamp`, `mix`, etc.
- Helpers: `lit()`, `makeVec2()`, `makeVec3()`, `vec4FromVec2()`, etc.
- `structSize()` - Calculate struct size

**Dependencies**: None

---

### `@fluxgpu/host-browser` - Browser Adapter

**Responsibility**: Browser environment WebGPU implementation

**Main Thread Mode Exports**:
- `BrowserGPUAdapter` - Implements `IGPUAdapter`
- `CanvasManager` - Canvas management
- `createAnimationLoop()` - Animation loop
- `getFeatureSupport()`, `getWebGPUCapabilities()` - Feature detection

**Worker Mode Exports**:
- `WorkerHost` - Main thread Worker manager
- `WorkerExecutor` - Worker-side executor
- `IWorkerRenderer` - Renderer interface (user implements)
- `createWorkerHandler()` - Worker entry helper
- `WorkerMessageType` - Message type enum

**Dependencies**: `@fluxgpu/contracts`, `@fluxgpu/protocol`

---

### Framework Binding Packages

#### `@fluxgpu/react`

**Exports**:
- `useGPU(canvasRef, options)` - Initialize GPU
- `useGPUFrame(executor, render, active)` - Render loop
- `useAnimationFrame(callback, active)` - Generic animation
- `useMouse(canvasRef)` - Mouse position
- Re-exports: `BrowserGPUAdapter`, `AdapterExecutor`

#### `@fluxgpu/vue`

**Exports**:
- `useGPU(canvasRef, options)` - Initialize GPU
- `useGPUFrame(executor, render, autoStart)` - Render loop
- `useAnimationFrame(callback, autoStart)` - Generic animation
- `useMouse(canvasRef)` - Mouse position

#### `@fluxgpu/solid`

**Exports**:
- `createGPU(canvas, options)` - Initialize GPU
- `createGPUFrame(executor, render, autoStart)` - Render loop
- `createAnimationFrame(callback)` - Generic animation
- `createMouse(canvas)` - Mouse position

#### `@fluxgpu/preact`

**Exports**:
- `useGPU(canvasRef, options)` - Initialize GPU
- `useGPUFrame(executor, render, active)` - Render loop
- `useAnimationFrame(callback, active)` - Generic animation
- `useMouse(canvasRef)` - Mouse position

**All framework bindings depend on**: `@fluxgpu/contracts`, `@fluxgpu/engine`, `@fluxgpu/host-browser`

---

## Key Interfaces

### `IGPUAdapter` (contracts/ports.ts)

```typescript
export interface IGPUAdapter {
  // Lifecycle
  initialize(): Promise<void>;
  isInitialized(): boolean;
  dispose(): void;
  
  // Capability Query
  getPreferredFormat(): GPUTextureFormatType;
  supportsFeature(feature: string): boolean;
  
  // Resource Creation
  createBuffer(descriptor: BufferDescriptor): IBuffer;
  createTexture(descriptor: TextureDescriptor): ITexture;
  createShaderModule(code: string): IShaderModule;
  createComputePipeline(descriptor: ComputePipelineDescriptor): Promise<IComputePipeline>;
  createRenderPipeline(descriptor: RenderPipelineDescriptor): Promise<IRenderPipeline>;
  
  // Commands
  createCommandEncoder(): ICommandEncoder;
  submit(commandBuffers: ICommandBuffer[]): void;
  
  // Data Operations
  writeBuffer(buffer: IBuffer, data: ArrayBuffer | ArrayBufferView, offset?: number): void;
  readBuffer(buffer: IBuffer): Promise<ArrayBuffer>;
  
  // Render Target
  getRenderTarget(): IRenderTarget | null;
}
```

### `IWorkerRenderer` (host-browser/worker-executor.ts)

```typescript
export interface IWorkerRenderer {
  /** Initialize renderer (called after WebGPU device creation) */
  initialize(device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat): Promise<void>;

  /** Render one frame, return frame time (ms) */
  renderFrame(uniforms?: ArrayBuffer): number;

  /** Dispose resources */
  dispose(): void;
}
```

---

## Usage Examples

### Basic Usage (Main Thread Mode)

```typescript
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';
import { BufferUsage } from '@fluxgpu/contracts';

// Create adapter and executor
const adapter = new BrowserGPUAdapter({ canvas });
const executor = new AdapterExecutor({ adapter });
await executor.initialize();

// Create resources
const buffer = executor.createBuffer({
  size: 1024,
  usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
});

// Create shader and pipeline
const shader = executor.createShaderModule(shaderCode);
const pipeline = await executor.createComputePipeline({
  shader,
  entryPoint: 'main',
});

// Execute render frame
executor.frame((encoder) => {
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(pipeline);
  computePass.setBindGroup(0, bindGroup);
  computePass.dispatchWorkgroups(64);
  computePass.end();
});
```

### Worker Mode

**Main Thread (main.ts)**:
```typescript
import { WorkerHost } from '@fluxgpu/host-browser';
import GPUWorker from './gpu.worker?worker';

const workerHost = new WorkerHost({
  canvas,
  worker: new GPUWorker(),
});

await workerHost.initialize();

// Send uniforms to Worker each frame
function animate() {
  const uniforms = new Float32Array([deltaTime, time, mouseX, mouseY]);
  workerHost.requestFrame(uniforms.buffer.slice(0));
  requestAnimationFrame(animate);
}
```

**Worker (gpu.worker.ts)**:
```typescript
import { createWorkerHandler, type IWorkerRenderer } from '@fluxgpu/host-browser';

class MyRenderer implements IWorkerRenderer {
  async initialize(device, context, format) { /* ... */ }
  renderFrame(uniforms) { /* ... */ return frameTime; }
  dispose() { /* ... */ }
}

createWorkerHandler({
  rendererFactory: () => new MyRenderer(),
});
```

### Using Flux Core

```typescript
import { createFlux } from '@fluxgpu/core';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';

const adapter = new BrowserGPUAdapter({ canvas });
const flux = createFlux({ adapter });
await flux.initialize();

// Get adapter for operations
const gpu = flux.getAdapter();
const buffer = gpu.createBuffer({ size: 1024, usage: BufferUsage.STORAGE });
```

### Framework Binding (React)

```typescript
import { useRef, useState } from 'react';
import { useGPU, useGPUFrame } from '@fluxgpu/react';

function MyComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { executor, isLoading, error } = useGPU(canvasRef);

  useGPUFrame(executor, (encoder, deltaTime) => {
    // Render logic
  });

  return <canvas ref={canvasRef} />;
}
```

### Using DSL for Shader Generation

```typescript
import { shader, defineStruct, f32, vec2, vec3, array, u32 } from '@fluxgpu/dsl';

const Particle = defineStruct('Particle', {
  position: vec2(f32),
  velocity: vec2(f32),
  color: vec3(f32),
  life: f32,
});

const computeShader = shader()
  .storage('particles', array(Particle), 0, 0, 'read_write')
  .uniform('uniforms', Uniforms, 0, 1)
  .compute([256], (ctx, { globalInvocationId }) => {
    const index = ctx.let('index', u32, globalInvocationId.x);
    // ... compute logic
  })
  .build();
```

---

## Package Responsibility Summary

| Package | Responsibility | Dependencies | Environment |
|---------|---------------|--------------|-------------|
| `contracts` | Port interfaces, types, errors | None | Agnostic |
| `protocol` | Command serialization | `contracts` | Agnostic |
| `core` | Orchestration, state, graph | `contracts` | Agnostic |
| `dsl` | Shader DSL | None | Agnostic |
| `engine` | Executor, resource mgmt | `contracts` | Agnostic |
| `host-browser` | Browser WebGPU impl | `contracts`, `protocol` | Browser |
| `react/vue/solid/preact` | Framework bindings | `contracts`, `engine`, `host-browser` | Browser |

---

## Decoupling Verification

```typescript
// This code should compile in any environment
// because it doesn't depend on any specific implementation
import { createFlux } from '@fluxgpu/core';
import { AdapterExecutor } from '@fluxgpu/engine';
import { shader, defineStruct } from '@fluxgpu/dsl';
import type { IGPUAdapter } from '@fluxgpu/contracts';

function createApp(adapter: IGPUAdapter) {
  const flux = createFlux({ adapter });
  const executor = new AdapterExecutor({ adapter });
  // ...
}
```

---

## Design Decisions

1. **No Backward Compatibility** - As a new library, no legacy burden, avoid maintenance hell
2. **Dependency Injection** - Inject `IGPUAdapter` via constructor for decoupling
3. **Single Architecture** - All packages have only one usage pattern, lower learning curve
4. **Interface First** - `contracts` package contains only interface definitions, no implementation
5. **Environment Isolation** - `host-*` packages are the only ones coupled to specific environments
6. **Worker Support** - Support custom Worker rendering logic via `IWorkerRenderer` interface
