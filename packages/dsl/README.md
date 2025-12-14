# @flux/dsl

Type-safe DSL for WebGPU shader construction.

## Installation

```bash
pnpm add @flux/dsl
```

## APIs

### Primary API: Unified DSL

The main API provides a fluent, type-safe interface for building shaders with natural TypeScript syntax.

```typescript
import { shader, struct, f32, vec3, array, std } from '@flux/dsl';

// Define types
const Particle = struct('Particle', {
  position: vec3(f32),
  velocity: vec3(f32),
  mass: f32,
});

// Build shader
const code = shader()
  .useStruct(Particle)
  .workgroup(256)
  .main((ctx) => {
    // Bindings
    const particles = ctx.storageBuffer('particles', 0, 0, array(Particle), 'read_write');
    const globalId = ctx.builtin('global_id', 'global_invocation_id', vec3(f32));
    
    // Logic with natural syntax
    const index = ctx.let('index', globalId.x);
    const particle = particles.at(index);
    
    // Proxy-based field access
    ctx.addAssign(particle.velocity, particle.position.mul(lit(0.1)));
  })
  .build();
```

**Features:**
- ✨ Proxy-based field access (`particle.velocity`, `uniforms.gravity`)
- 🔒 Type inference and safety
- 🧩 Composable expressions (`a.mul(b).add(c)`)
- 📖 Natural, readable syntax
- 🎯 Standard library functions (`std.normalize`, `std.arrayLength`)

### Advanced API: Functional Composition

For building reusable shader libraries, use the atom/molecule pattern:

```typescript
import { compileShader, simplexNoise, fbm, turbulence } from '@flux/dsl';

// Use pre-built atoms
const shader = compileShader({
  code: `
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let noise = fbm(vec3<f32>(global_id), 4);
  // ... use noise
}`,
  dependencies: ['fbm'], // Automatically includes simplexNoise
});
```

**Features:**
- 🔧 Reusable shader fragments (atoms)
- 🌳 Dependency tree management
- ✂️ Tree shaking (only includes used code)
- 📦 Build shader libraries

## Type System

```typescript
// Scalar types
f32, i32, u32, bool

// Vector types
vec2(f32), vec3(f32), vec4(f32)

// Array types
array(f32)           // Dynamic array
array(f32, 100)      // Fixed-size array

// Struct types
struct('MyStruct', {
  field1: f32,
  field2: vec3(f32),
})
```

## Standard Library

```typescript
std.arrayLength(arr)    // Get array length
std.normalize(vec)      // Normalize vector
std.dot(a, b)          // Dot product
std.length(vec)        // Vector length
std.sin(x), std.cos(x) // Trigonometry
std.floor(x), std.ceil(x)
std.abs(x)
std.max(a, b), std.min(a, b)
```

## Combining Both APIs

You can use atoms/molecules within the fluent DSL for maximum flexibility:

```typescript
import { shader, f32, vec3, array, atomRegistry } from '@flux/dsl';
import { simplexNoise, fbm } from '@flux/dsl';

// Register atoms (usually done once at app startup)
// Option 1: Direct registry access
atomRegistry.set('simplexNoise', simplexNoise);
atomRegistry.set('fbm', fbm);

// Option 2: Using helper function
// registerDSLAtom('simplexNoise', simplexNoise);
// registerDSLAtom('fbm', fbm);

const code = shader()
  .workgroup(64)
  // Import with automatic dependency resolution
  .useAtom(fbm, atomRegistry) // Automatically imports simplexNoise too!
  .main((ctx) => {
    const data = ctx.storageBuffer('data', 0, 0, array(vec3(f32)), 'read_write');
    const output = ctx.storageBuffer('output', 0, 1, array(f32), 'read_write');
    const globalId = ctx.builtin('global_id', 'global_invocation_id', vec3(f32));

    const index = ctx.let('index', globalId.x);
    const pos = ctx.let('pos', data.at(index));
    
    // Call the imported function using ctx.call()
    const noiseValue = ctx.let('noise', ctx.call('fbm', pos, 4));
    
    ctx.assign(output.at(index), noiseValue);
  })
  .build();
```

**Key Features:**
- ✅ **Automatic dependency resolution** - `useAtom(fbm)` imports `simplexNoise` automatically
- ✅ **Deduplication** - Functions are only included once, even if imported multiple times
- ✅ **Type-safe calls** - Use `ctx.call('functionName', ...args)` to call imported functions
- ✅ **Mix and match** - Combine fluent DSL with functional atoms seamlessly

### Creating Custom Atoms

```typescript
// Define a custom atom
const smoothstep3 = () => ({
  code: `
fn smoothstep3(edge0: vec3<f32>, edge1: vec3<f32>, x: vec3<f32>) -> vec3<f32> {
  let t = clamp((x - edge0) / (edge1 - edge0), vec3<f32>(0.0), vec3<f32>(1.0));
  return t * t * (vec3<f32>(3.0) - vec3<f32>(2.0) * t);
}`,
  dependencies: [], // List any other atoms this depends on
});

// Use it in fluent DSL
const code = shader()
  .use(smoothstep3().code)
  .main((ctx) => {
    const colors = ctx.storageBuffer('colors', 0, 0, array(vec3(f32)), 'read_write');
    const globalId = ctx.builtin('global_id', 'global_invocation_id', vec3(f32));
    
    const index = ctx.let('index', globalId.x);
    const color = ctx.let('color', colors.at(index));
    
    // Call your custom function
    const smoothed = ctx.let('smoothed', 
      ctx.call('smoothstep3', vec3Lit(0, 0, 0), vec3Lit(1, 1, 1), color)
    );
    
    ctx.assign(colors.at(index), smoothed);
  })
  .build();
```

### Nested Dependencies

Atoms can depend on other atoms, and dependencies are resolved automatically:

```typescript
const helper1 = () => ({
  code: `fn helper1(x: f32) -> f32 { return x * 2.0; }`,
  dependencies: [],
});

const helper2 = () => ({
  code: `fn helper2(x: f32) -> f32 { return helper1(x) + 1.0; }`,
  dependencies: ['helper1'], // Declares dependency
});

// Register both
atomRegistry.set('helper1', helper1);
atomRegistry.set('helper2', helper2);

// Import helper2 - helper1 is automatically included!
const code = shader()
  .useAtom(helper2, atomRegistry)
  .main((ctx) => {
    // Both helper1 and helper2 are available
  })
  .build();
```

## Examples

See the `examples/` directory for complete working examples:
- `05-unified-dsl/` - Complete DSL showcase

## License

MIT
