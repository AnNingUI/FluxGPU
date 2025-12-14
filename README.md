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
┌─────────────────────────────────────────────────────────────┐
│                    Framework Layer                          │
│         @flux/react  @flux/vue  @flux/solid  @flux/preact   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                       │
│              @flux/engine    @flux/host-browser             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Bridge Layer                            │
│                      @flux/protocol                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│           @flux/contracts  @flux/core  @flux/dsl            │
└─────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| [@flux/contracts](./packages/contracts) | Pure TypeScript interfaces (zero dependencies) |
| [@flux/core](./packages/core) | Graph orchestration and shadow state |
| [@flux/dsl](./packages/dsl) | Functional shader composition DSL |
| [@flux/protocol](./packages/protocol) | Binary communication protocol |
| [@flux/engine](./packages/engine) | WebGPU executor and high-level API |
| [@flux/host-browser](./packages/host-browser) | Browser runtime adapter |
| [@flux/react](./packages/react) | React hooks and components |
| [@flux/vue](./packages/vue) | Vue composables and components |
| [@flux/solid](./packages/solid) | SolidJS primitives and components |
| [@flux/preact](./packages/preact) | Preact hooks and components |

## Quick Start

```bash
# Install
pnpm add @flux/engine @flux/dsl @flux/react

# Or with npm
npm install @flux/engine @flux/dsl @flux/react
```

### React Example

```tsx
import { GPUCanvas } from '@flux/react';
import { GPUContext } from '@flux/engine';

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
import { shader, defineStruct, f32, vec2, vec3 } from '@flux/dsl';

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
pnpm --filter "@flux/example-vanilla" dev   # http://localhost:8000
pnpm --filter "@flux/example-react" dev     # http://localhost:8001
pnpm --filter "@flux/example-vue" dev       # http://localhost:8002
pnpm --filter "@flux/example-solid" dev     # http://localhost:8003
pnpm --filter "@flux/example-preact" dev    # http://localhost:8004
```

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
