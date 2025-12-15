# @fluxgpu/dsl

Type-safe functional shader composition DSL for WebGPU.

## Overview

Write WGSL shaders using TypeScript with full type inference, composable atoms, and compile-time validation.

## Installation

```bash
pnpm add @fluxgpu/dsl
```

## Usage

### Define Structs

```typescript
import { defineStruct, f32, vec2, vec3, array } from '@fluxgpu/dsl';

const Particle = defineStruct('Particle', {
  position: vec2(f32),
  velocity: vec2(f32),
  color: vec3(f32),
  life: f32,
});

const Uniforms = defineStruct('Uniforms', {
  deltaTime: f32,
  time: f32,
  mousePos: vec2(f32),
});
```

### Compute Shader

```typescript
import { ShaderBuilder, u32, f32, length } from '@fluxgpu/dsl';

const computeShader = new ShaderBuilder()
  .storage('particles', array(Particle), 0, 0, 'read_write')
  .uniform('uniforms', Uniforms, 0, 1)
  .compute([256], (ctx, { globalInvocationId }) => {
    const index = ctx.let('index', u32, globalInvocationId.x);
    ctx.if(index.ge(particles.len()), () => ctx.return());
    
    const particle = ctx.var('particle', Particle, particles.$at(index));
    const speed = ctx.let('speed', f32, length(particle.$('velocity')));
    
    // Update particle...
    ctx.exec(particles.$at(index).set(particle));
  })
  .build();
```

### Vertex/Fragment Shaders

```typescript
import { ShaderBuilder, vec3, vec4, f32 } from '@fluxgpu/dsl';

const vertexShader = new ShaderBuilder()
  .storage('particles', array(Particle), 0, 0, 'read')
  .vertex(
    { varyings: { color: { location: 0, type: vec3(f32) } } },
    (ctx, { vertexIndex }) => {
      const particle = ctx.let('p', Particle, particles.$at(vertexIndex));
      return {
        position: vec4FromVec2(particle.$('position'), 0.0, 1.0),
        varyings: { color: { location: 0, value: particle.$('color') } },
      };
    }
  )
  .build();

const fragmentShader = new ShaderBuilder()
  .fragment(
    { inputs: { color: { location: 0, type: vec3(f32) } }, targets: 1 },
    (ctx, builtins, { color }) => ({
      colors: [{ location: 0, value: vec4FromVec3(color, 1.0) }],
    })
  )
  .build();
```

### Struct Layout Utilities

```typescript
import { structSize, calculateStructLayout, createUniformBuffer } from '@fluxgpu/dsl';

// Get struct byte size (for buffer creation)
const size = structSize(Uniforms);

// Get detailed layout info
const layout = calculateStructLayout(Uniforms);
// { fields: [...], size: number, align: number }

// Create uniform buffer with automatic alignment
const buffer = createUniformBuffer(Uniforms, {
  deltaTime: 0.016,
  time: 1.5,
  mousePos: [0.5, 0.3],
});
```

## Built-in Functions

| Category | Functions |
|----------|-----------|
| Math | `sin`, `cos`, `tan`, `abs`, `floor`, `ceil`, `sqrt`, `pow`, `exp`, `log` |
| Vector | `length`, `normalize`, `dot`, `cross`, `distance`, `reflect` |
| Interpolation | `mix`, `clamp`, `smoothstep`, `step` |
| Comparison | `min`, `max`, `sign` |

## Type System

- `f32`, `i32`, `u32`, `bool`, `f16` - Scalar types
- `vec2(T)`, `vec3(T)`, `vec4(T)` - Vector types
- `mat2x2(T)`, `mat3x3(T)`, `mat4x4(T)` - Matrix types
- `array(T)` - Runtime-sized arrays
- `defineStruct()` - Custom struct types

## Expression API

All expressions support chainable operators:

```typescript
// Arithmetic: add, sub, mul, div, mod, neg
const sum = a.add(b);

// Comparison: eq, ne, lt, le, gt, ge
const isGreater = a.gt(b);

// Logical: and, or, not
const both = cond1.and(cond2);

// Bitwise: bitAnd, bitOr, bitXor, bitNot, shl, shr
const masked = value.bitAnd(mask);

// Assignment statements
ctx.exec(variable.set(newValue));
ctx.exec(variable.addEq(delta));
```

## Vector Swizzling

```typescript
const pos = particle.$('position');  // vec2<f32>
const x = pos.x;                     // f32
const xy = velocity.xy;              // vec2
const rgb = color.rgb;               // vec3
```
