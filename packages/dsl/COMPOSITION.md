# Composing Fluent DSL with Functional Atoms

This guide explains how to combine the fluent DSL API with functional atoms for maximum flexibility.

## Quick Start

```typescript
import { shader, atomRegistry } from '@flux/dsl';
import { fbm } from '@flux/dsl';

// 1. Register atoms
atomRegistry.set('fbm', fbm);

// 2. Use atoms in fluent DSL
const code = shader()
  .useAtom(fbm, atomRegistry)
  .main((ctx) => {
    // 3. Call imported functions
    const noise = ctx.call('fbm', position, 4);
  })
  .build();
```

## Key Features

### 1. Automatic Dependency Resolution

When you import an atom, all its dependencies are automatically included:

```typescript
// fbm depends on simplexNoise
atomRegistry.set('simplexNoise', simplexNoise);
atomRegistry.set('fbm', fbm);

shader()
  .useAtom(fbm, atomRegistry) // ✅ Automatically imports simplexNoise too!
```

### 2. Automatic Deduplication

Functions are only included once, even if imported multiple times:

```typescript
shader()
  .use(simplexNoise().code)
  .use(simplexNoise().code) // ✅ Deduplicated - only appears once
  .use(simplexNoise().code)
```

### 3. Calling Imported Functions

Use `ctx.call()` to invoke imported functions in your shader logic:

```typescript
.main((ctx) => {
  const pos = ctx.let('pos', ...);
  
  // Call with expressions
  const noise = ctx.let('noise', ctx.call('fbm', pos, 4));
  
  // Call with literals
  const value = ctx.let('value', ctx.call('myFunc', 1.0, 2.0));
  
  // Call with raw WGSL
  const result = ctx.let('result', ctx.call('complexFunc', 'vec3<f32>(1.0)', pos));
})
```

## Complete Example

```typescript
import { shader, struct, f32, vec3, array, atomRegistry } from '@flux/dsl';
import { simplexNoise, fbm } from '@flux/dsl';

// Register atoms
atomRegistry.set('simplexNoise', simplexNoise);
atomRegistry.set('fbm', fbm);

// Define custom atom
const remap = () => ({
  code: `
fn remap(value: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}`,
  dependencies: [],
});

atomRegistry.set('remap', remap);

// Build shader
const TerrainPoint = struct('TerrainPoint', {
  position: vec3(f32),
  height: f32,
});

const code = shader()
  .useStruct(TerrainPoint)
  .workgroup(16, 16)
  // Import atoms with auto-dependency resolution
  .useAtom(fbm, atomRegistry)    // Imports simplexNoise automatically
  .useAtom(remap, atomRegistry)
  .main((ctx) => {
    const terrain = ctx.storageBuffer('terrain', 0, 0, array(TerrainPoint), 'read_write');
    const globalId = ctx.builtin('global_id', 'global_invocation_id', vec3(f32));

    const index = ctx.let('index', globalId.x);
    const point = terrain.at(index);
    
    // Call imported functions
    const rawNoise = ctx.let('rawNoise', ctx.call('fbm', point.position, 4));
    const height = ctx.let('height', ctx.call('remap', rawNoise, -1.0, 1.0, 0.0, 100.0));
    
    // Assign result
    ctx.assign(point.height, height);
  })
  .build();
```

## Creating Custom Atoms

```typescript
// Simple atom with no dependencies
const myFunction = () => ({
  code: `
fn myFunction(x: f32) -> f32 {
  return x * x + 1.0;
}`,
  dependencies: [],
});

// Atom with dependencies
const complexFunction = () => ({
  code: `
fn complexFunction(x: f32) -> f32 {
  return myFunction(x) * 2.0;
}`,
  dependencies: ['myFunction'], // Will be imported automatically
});

// Register and use
atomRegistry.set('myFunction', myFunction);
atomRegistry.set('complexFunction', complexFunction);

shader()
  .useAtom(complexFunction, atomRegistry) // Imports myFunction too
  .main((ctx) => {
    const result = ctx.call('complexFunction', someValue);
  })
```

## Best Practices

### 1. Register Atoms Once

Register atoms at application startup, not in every shader:

```typescript
// app-init.ts
import { atomRegistry } from '@flux/dsl';
import { simplexNoise, fbm, turbulence } from '@flux/dsl';

export function initShaderLibrary() {
  atomRegistry.set('simplexNoise', simplexNoise);
  atomRegistry.set('fbm', fbm);
  atomRegistry.set('turbulence', turbulence);
}
```

### 2. Build Shader Libraries

Organize related atoms into libraries:

```typescript
// noise-library.ts
export const noiseLibrary = {
  simplex: simplexNoise,
  fbm: fbm,
  turbulence: turbulence,
};

// Register all at once
Object.entries(noiseLibrary).forEach(([name, atom]) => {
  atomRegistry.set(name, atom);
});
```

### 3. Type-Safe Function Calls

While `ctx.call()` returns a generic `Expr`, you can add type hints:

```typescript
// For better IDE support, document expected types
const noise = ctx.let('noise', 
  ctx.call('fbm', pos, 4) // Returns f32
);

const color = ctx.let('color',
  ctx.call('getColor', index) // Returns vec3<f32>
);
```

## API Reference

### `shader().useAtom(atom, registry)`

Import an atom with automatic dependency resolution.

**Parameters:**
- `atom`: The atom function to import
- `registry`: The atom registry (usually `atomRegistry`)

**Returns:** `this` (chainable)

### `ctx.call(fnName, ...args)`

Call an imported function in shader code.

**Parameters:**
- `fnName`: Name of the function to call
- `...args`: Arguments (can be `Expr`, `number`, or `string`)

**Returns:** `Expr` - Expression representing the function call

### `atomRegistry`

Global registry for atoms. Use `atomRegistry.set(name, atom)` to register.

### `registerDSLAtom(name, atom)`

Helper function to register an atom. Equivalent to `atomRegistry.set()`.

## Troubleshooting

### Function not found

Make sure the atom is registered before using it:

```typescript
atomRegistry.set('myFunc', myFunc);
shader().useAtom(myFunc, atomRegistry)
```

### Dependency not imported

Check that dependencies are listed correctly:

```typescript
const myAtom = () => ({
  code: '...',
  dependencies: ['requiredFunc'], // Must match registry name
});
```

### Type errors with ctx.call()

Use explicit type casting if needed:

```typescript
const result = ctx.let('result', 
  ctx.call('myFunc', arg1, arg2) as Expr<vec3<f32>>
);
```
