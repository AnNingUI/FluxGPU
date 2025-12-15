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
# Install
pnpm add @fluxgpu/engine @fluxgpu/dsl @fluxgpu/react

# Or with npm
npm install @fluxgpu/engine @fluxgpu/dsl @fluxgpu/react
```

### React Example

```tsx
import { GPUCanvas } from '@fluxgpu/react';
import { GPUContext } from '@fluxgpu/engine';

function App() {
  const handleReady = (gpu: GPUContext) => {
    // Initialize your GPU resources
  };

  const handleRender = (encoder: GPUCommandEncoder, target: GPUTextureView, dt: number) => {
    // Render your frame
  };

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

### Shader DSL Example

```typescript
import { shader, defineStruct, f32, vec2, vec3 } from '@fluxgpu/dsl';

const Particle = defineStruct('Particle', {
  position: vec2(f32),
  velocity: vec2(f32),
  color: vec3(f32),
});

const computeShader = shader()
  .storage('particles', array(Particle), 0, 0, 'read_write')
  .compute([256], (ctx, { globalInvocationId }) => {
    const index = ctx.let('index', u32, globalInvocationId.x);
    // ... shader logic
  })
  .build();
```

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
| vanilla | Basic TypeScript with GPUContext (direct mode) |
| vanilla-worker | Using @fluxgpu/host-browser APIs (Worker mode ready) |
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
