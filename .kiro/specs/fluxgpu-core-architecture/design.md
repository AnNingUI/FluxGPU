# Design Document: FluxGPU Core Architecture

## Overview

FluxGPU v5.0 is a WebGPU framework implementing Hexagonal Architecture (Ports & Adapters) with strict adherence to the Dependency Inversion Principle. The system is organized as a PNPM monorepo with packages structured by architectural responsibility rather than feature. The core philosophy is "The Domain defines the needs; the Infrastructure fulfills them."

The architecture consists of three primary layers:
- **Domain Layer** (Inner Circle): Pure logic with zero platform dependencies
- **Bridge Layer**: Protocol definitions and serialization
- **Infrastructure Layer** (Outer Circle): Concrete platform-specific implementations

All dependencies flow inward, ensuring the domain remains pure and testable while infrastructure adapters can be swapped without affecting core logic.

## Architecture

### Layered Architecture

The system follows a strict layered architecture with four levels:

**Level 0 (Center) - Contracts (`@flux/contracts`)**
- Pure TypeScript interfaces defining all ports
- Zero runtime dependencies
- Defines: `IGPUResource`, `IGraphNode`, `IRuntimeAdapter`, `IExecutor`, `ITexture`

**Level 1 (Domain) - Core Logic (`@flux/core`, `@flux/dsl`)**
- Implements business logic using only contract interfaces
- `@flux/core`: Graph orchestration, shadow state management, validation
- `@flux/dsl`: Functional shader composition using atoms and molecules
- Depends only on: `@flux/contracts`

**Level 2 (Bridge) - Protocol (`@flux/protocol`)**
- Binary opcode definitions
- SharedArrayBuffer memory layouts
- Ring buffer implementation with atomic operations
- Platform-agnostic serialization
- Depends on: `@flux/contracts`

**Level 3 (Infrastructure) - Adapters (`@flux/host-*`, `@flux/engine`)**
- `@flux/host-browser`: Browser runtime with Workers and DOM integration
- `@flux/host-deno`: Deno runtime adapter
- `@flux/engine`: WebGPU executor running inside Worker
- Depends on: `@flux/contracts`, `@flux/protocol`

### Dependency Flow

```
Infrastructure Layer (@flux/host-*, @flux/engine)
         ↓ (implements)
    Contracts (@flux/contracts)
         ↑ (uses)
Domain Layer (@flux/core, @flux/dsl)
```

The key inversion: Core never imports from Infrastructure. Infrastructure implements interfaces defined by Core.

## Components and Interfaces

### @flux/contracts

**Purpose**: Single source of truth for all system interfaces.

**Key Interfaces**:

```typescript
interface IRuntimeAdapter {
  initialize(): Promise<void>;
  createExecutor(): IExecutor;
  supportsFeature(feature: string): boolean;
}

interface IExecutor {
  dispatch(command: CommandBuffer): void;
  getResourceTable(): ResourceTable;
}

interface IGPUResource {
  id: ResourceId;
  type: ResourceType;
  dispose(): void;
}

interface IGraphNode {
  id: NodeId;
  dependencies: NodeId[];
  validate(): ValidationResult;
}
```

### @flux/core

**Purpose**: The brain - manages shadow state and builds command graphs.

**Key Components**:

1. **Shadow State Manager**
   - Maintains proxy objects for remote GPU resources
   - Tracks resource lifecycle and dependencies
   - Provides synchronous API over async GPU operations

2. **Command Graph Builder**
   - Constructs DAG from user operations
   - Validates topology (cycle detection, dependency resolution)
   - Optimizes execution order

3. **Validation Engine**
   - Checks for circular dependencies
   - Validates resource compatibility
   - Ensures operation ordering constraints

**Key Functions**:
```typescript
function createFlux(config: { runtime: IRuntimeAdapter }): FluxInstance;
function createCommandGraph(nodes: IGraphNode[]): CommandGraph;
function validateGraph(graph: CommandGraph): ValidationResult;
```

### @flux/dsl

**Purpose**: Functional shader composition system.

**Key Concepts**:

1. **Atoms**: Pure functions returning WGSL snippets
   ```typescript
   type Atom = () => WGSLSnippet;
   const simplexNoise: Atom = () => ({ code: "...", dependencies: [] });
   ```

2. **Molecules**: Composed shader functions
   ```typescript
   type Molecule = (deps: Atom[]) => WGSLSnippet;
   const turbulence: Molecule = (deps) => compose(...deps);
   ```

3. **Tree Shaker**: Dependency walker that generates minimal WGSL
   ```typescript
   function compileShader(root: Molecule): string;
   ```

### @flux/protocol

**Purpose**: Platform-agnostic communication protocol.

**Key Components**:

1. **Binary Layout Definitions**
   - Struct mappings to SharedArrayBuffer
   - Opcode enumeration
   - Memory alignment specifications

2. **Ring Buffer**
   - Lock-free circular buffer using Atomics
   - Read/write pointer management
   - Overflow handling

3. **Serialization**
   ```typescript
   function serializeCommand(cmd: Command): Uint8Array;
   function deserializeCommand(buffer: Uint8Array): Command;
   ```

### @flux/engine

**Purpose**: The muscle - executes WebGPU commands.

**Key Components**:

1. **Command Loop**
   - Processes commands from ring buffer
   - Translates abstract operations to WebGPU API calls
   - Manages execution timing and batching

2. **Resource Table**
   - Maps ResourceId → GPUBuffer/GPUTexture
   - Handles resource creation and disposal
   - Tracks resource usage and dependencies

3. **WebGPU Interface**
   - Only package that imports `@webgpu/types`
   - Only package that accesses `navigator.gpu`
   - Encapsulates all GPU API interactions

### @flux/host-browser

**Purpose**: Browser-specific runtime adapter.

**Key Components**:

1. **Worker Manager**
   - Spawns and manages Web Workers
   - Routes messages between main thread and workers
   - Handles worker lifecycle

2. **DOM Integration**
   - Canvas management
   - Event handling
   - Browser-specific optimizations

### @flux/host-deno

**Purpose**: Deno runtime adapter.

**Key Components**:

1. **Deno Worker Integration**
2. **File system access for shader caching**
3. **Deno-specific WebGPU initialization**

## Data Models

### Resource Model

```typescript
type ResourceId = string & { __brand: 'ResourceId' };

enum ResourceType {
  Buffer = 'buffer',
  Texture = 'texture',
  Sampler = 'sampler',
}

interface Resource {
  id: ResourceId;
  type: ResourceType;
  size: number;
  usage: GPUBufferUsageFlags;
}
```

### Command Model

```typescript
type CommandId = string & { __brand: 'CommandId' };

interface Command {
  id: CommandId;
  opcode: Opcode;
  payload: Uint8Array;
  dependencies: CommandId[];
}

enum Opcode {
  CreateBuffer = 0x01,
  WriteBuffer = 0x02,
  Dispatch = 0x03,
  ReadBuffer = 0x04,
}
```

### Graph Model

```typescript
interface GraphNode {
  id: NodeId;
  operation: Operation;
  inputs: ResourceId[];
  outputs: ResourceId[];
  dependencies: NodeId[];
}

interface CommandGraph {
  nodes: Map<NodeId, GraphNode>;
  executionOrder: NodeId[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Dependency Direction Enforcement
*For any* package dependency declaration in the monorepo, the dependency must point inward toward the domain layer, with infrastructure packages depending only on contracts and protocol, never on other infrastructure packages.
**Validates: Requirements 1.2, 1.5**

### Property 2: Contracts Purity
*For any* TypeScript file in the contracts package, the file must contain only interface and type declarations without function implementations or class method bodies.
**Validates: Requirements 2.2**

### Property 3: Atom Function Structure
*For any* atom definition, it must be a pure function that returns a WGSL snippet with code and dependencies.
**Validates: Requirements 3.1**

### Property 4: Molecule Composition
*For any* molecule, it must accept atoms as parameters and compose them through dependency injection to produce a valid WGSL snippet.
**Validates: Requirements 3.2**

### Property 5: Shader Tree Shaking
*For any* shader dependency tree, compiling it must produce WGSL code that contains only the atoms that are transitively referenced from the root, excluding all unused atoms.
**Validates: Requirements 3.3, 3.4**

### Property 6: Pipeline Chaining
*For any* pipeline and any operation, calling pipe with that operation must return an object that also has a pipe method, enabling fluent chaining.
**Validates: Requirements 4.2**

### Property 7: Pipeline Middleware Insertion
*For any* pipeline and any function, inserting that function as middleware must result in the function being called during pipeline execution with access to the data flow.
**Validates: Requirements 4.3**

### Property 8: Pipeline Execution Order
*For any* pipeline composed of multiple operations, executing the pipeline must invoke each operation in the order they were added via pipe, with each operation receiving the output of the previous operation.
**Validates: Requirements 4.4**

### Property 9: Resource Wrapper Composition
*For any* resource and any set of wrapper functions, applying multiple wrappers in sequence must produce an object that has all capabilities added by each wrapper.
**Validates: Requirements 5.4**

### Property 10: Adapter Interface Isolation
*For any* runtime adapter implementation, the core package must interact with it only through methods defined in the IRuntimeAdapter interface, and swapping adapter implementations must not require changes to core code.
**Validates: Requirements 6.2, 6.3**

### Property 11: Initialization Order
*For any* FluxGPU instance, attempting to perform operations before the composition root completes dependency wiring must fail, and operations after initialization must succeed.
**Validates: Requirements 6.4**

### Property 12: Shadow State Proxy Creation
*For any* GPU resource creation request, the system must return a proxy object and maintain that proxy in the shadow state, with the proxy's ID mapping to the remote resource.
**Validates: Requirements 7.1**

### Property 13: DAG Validation
*For any* sequence of operations, the resulting command graph must be a valid Directed Acyclic Graph, and any graph containing circular dependencies must be detected and rejected during validation.
**Validates: Requirements 7.2, 7.3**

### Property 14: Validation Error Prevention
*For any* invalid command graph, attempting to execute it must be prevented and must return an error describing the validation failure.
**Validates: Requirements 7.4**

### Property 15: Data Structure Buffer Mapping
*For any* protocol data structure, it must have a corresponding SharedArrayBuffer layout with correctly calculated offsets and alignment for all fields.
**Validates: Requirements 8.1**

### Property 16: Protocol Platform Independence
*For any* protocol operation, executing it in different runtime environments (Workers, WebSockets) must produce identical results and maintain the same semantics.
**Validates: Requirements 8.3**

### Property 17: Protocol Serialization Round Trip
*For any* protocol structure, serializing it to binary format and then deserializing must produce a structure equivalent to the original.
**Validates: Requirements 8.4**

### Property 18: Resource Table Mapping
*For any* resource created through the engine, the resource table must contain a mapping from the resource's ID to the actual GPU resource instance, and querying the table with that ID must return the correct resource.
**Validates: Requirements 9.3**

### Property 19: Command Translation
*For any* abstract command sent to the engine, the engine must translate it into the corresponding WebGPU API calls with correct parameters.
**Validates: Requirements 9.4**

### Property 20: Class Inheritance Depth Limit
*For any* class definition in the codebase, the inheritance depth must not exceed one level (only direct extension of a base class is allowed).
**Validates: Requirements 10.3**

## Error Handling

### Error Categories

1. **Validation Errors**
   - Circular dependency detection
   - Invalid resource references
   - Type mismatches
   - Graph topology violations

2. **Runtime Errors**
   - GPU device lost
   - Out of memory
   - Resource disposal errors
   - Command execution failures

3. **Protocol Errors**
   - Serialization failures
   - Buffer overflow
   - Invalid opcodes
   - Corrupted messages

### Error Handling Strategy

**Domain Layer (Core)**
- Returns `Result<T, Error>` types for all operations
- Never throws exceptions
- Validates all inputs before processing
- Provides detailed error messages with context

**Infrastructure Layer**
- Catches platform-specific exceptions
- Translates to domain error types
- Logs errors with appropriate severity
- Implements retry logic for transient failures

**Protocol Layer**
- Validates all incoming messages
- Handles malformed data gracefully
- Provides error codes for all failure modes
- Maintains protocol state consistency

### Error Recovery

1. **Resource Cleanup**
   - Automatic disposal of orphaned resources
   - Reference counting for shared resources
   - Graceful degradation on partial failures

2. **State Recovery**
   - Shadow state synchronization
   - Command graph rollback
   - Resource table consistency checks

3. **User Notification**
   - Clear error messages
   - Actionable suggestions
   - Debug information in development mode

## Testing Strategy

### Unit Testing

Unit tests verify specific examples, edge cases, and integration points:

**Core Package Tests**
- Shadow state management with specific resource types
- Command graph construction with known topologies
- Validation logic with specific error cases
- Edge cases: empty graphs, single-node graphs, disconnected components

**DSL Package Tests**
- Specific atom implementations (simplexNoise, etc.)
- Molecule composition with known atom combinations
- Shader compilation with specific dependency trees
- Edge cases: empty shaders, circular atom references

**Protocol Package Tests**
- Ring buffer with specific read/write patterns
- Serialization of specific command types
- Buffer overflow handling
- Edge cases: empty buffers, full buffers, concurrent access

**Engine Package Tests**
- Resource table operations with specific resource types
- Command execution with known WebGPU calls
- Error handling for specific GPU failures
- Edge cases: device lost, out of memory

**Infrastructure Package Tests**
- Worker lifecycle management
- Message routing between threads
- Adapter initialization
- Edge cases: worker crashes, initialization failures

### Property-Based Testing

Property-based tests verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library).

**Configuration**
- Each property test must run a minimum of 100 iterations
- Tests must use appropriate generators for domain types
- Shrinking must be enabled to find minimal failing cases

**Test Tagging**
- Each property-based test must include a comment with the format:
  `// Feature: fluxgpu-core-architecture, Property N: [property description]`
- This links tests to design properties for traceability

**Property Test Coverage**

1. **Dependency Direction (Property 1)**
   - Generate random package dependency graphs
   - Verify all edges point inward

2. **Contracts Purity (Property 2)**
   - Generate random TypeScript ASTs
   - Verify contracts contain only declarations

3. **Atom Structure (Property 3)**
   - Generate random atom definitions
   - Verify they return valid WGSL snippets

4. **Molecule Composition (Property 4)**
   - Generate random atom sets
   - Verify molecules compose them correctly

5. **Shader Tree Shaking (Property 5)**
   - Generate random shader trees with unused branches
   - Verify output contains only referenced code

6. **Pipeline Chaining (Property 6)**
   - Generate random operation sequences
   - Verify chaining works at any depth

7. **Pipeline Middleware (Property 7)**
   - Generate random middleware functions
   - Verify they're called with correct data

8. **Pipeline Execution Order (Property 8)**
   - Generate random operation sequences
   - Verify execution order matches composition order

9. **Resource Wrapper Composition (Property 9)**
   - Generate random wrapper combinations
   - Verify all capabilities are present

10. **Adapter Interface Isolation (Property 10)**
    - Generate different adapter implementations
    - Verify core works with all without modification

11. **Initialization Order (Property 11)**
    - Generate random operation sequences
    - Verify pre-init operations fail, post-init succeed

12. **Shadow State Proxy (Property 12)**
    - Generate random resource creation requests
    - Verify proxies are created and tracked

13. **DAG Validation (Property 13)**
    - Generate random graphs (some with cycles)
    - Verify cycles are detected

14. **Validation Error Prevention (Property 14)**
    - Generate invalid graphs
    - Verify execution is prevented

15. **Buffer Mapping (Property 15)**
    - Generate random data structures
    - Verify buffer layouts are correct

16. **Protocol Platform Independence (Property 16)**
    - Generate random protocol operations
    - Verify identical behavior across platforms

17. **Serialization Round Trip (Property 17)**
    - Generate random protocol structures
    - Verify serialize→deserialize is identity

18. **Resource Table Mapping (Property 18)**
    - Generate random resource operations
    - Verify table mappings are correct

19. **Command Translation (Property 19)**
    - Generate random abstract commands
    - Verify correct WebGPU API calls

20. **Inheritance Depth (Property 20)**
    - Generate random class hierarchies
    - Verify depth ≤ 1

### Integration Testing

Integration tests verify the system works end-to-end:

- Full pipeline from user code to GPU execution
- Cross-package interactions
- Worker communication
- Resource lifecycle across boundaries

### Test Organization

```
packages/
├── contracts/
│   └── src/
│       └── __tests__/
├── core/
│   └── src/
│       ├── __tests__/          # Unit tests
│       └── __properties__/     # Property-based tests
├── dsl/
│   └── src/
│       ├── __tests__/
│       └── __properties__/
├── protocol/
│   └── src/
│       ├── __tests__/
│       └── __properties__/
├── engine/
│   └── src/
│       ├── __tests__/
│       └── __properties__/
└── integration/
    └── __tests__/              # End-to-end tests
```

## Performance Considerations

### Command Batching
- Group multiple operations into single GPU submissions
- Minimize host-device synchronization points
- Use ring buffer to amortize communication overhead

### Memory Management
- Pool frequently allocated resources
- Reuse command buffers
- Implement resource aliasing where possible

### Compilation Caching
- Cache compiled shader modules
- Memoize shader tree compilation results
- Persist cache across sessions

### Parallel Execution
- Leverage Web Workers for parallel command preparation
- Use GPU compute queues for concurrent execution
- Pipeline CPU and GPU work

## Security Considerations

### Input Validation
- Validate all user-provided shader code
- Sanitize resource sizes and counts
- Prevent buffer overflows in protocol layer

### Resource Limits
- Enforce maximum resource sizes
- Limit command graph complexity
- Prevent unbounded memory growth

### Isolation
- Sandbox shader execution
- Isolate worker contexts
- Prevent cross-origin resource access

## Deployment Considerations

### Browser Support
- Target modern browsers with WebGPU support
- Provide feature detection
- Graceful degradation for unsupported features

### Bundle Size
- Tree-shakeable exports
- Separate host adapters into optional packages
- Minimize core bundle size

### Development Experience
- TypeScript-first API
- Comprehensive type definitions
- Clear error messages
- Debugging utilities

## Future Extensibility

### Plugin System
- Define plugin interface in contracts
- Allow custom resource types
- Support custom command types
- Enable middleware extensions

### Additional Runtimes
- Node.js adapter (when WebGPU support lands)
- Native adapter via FFI
- Cloud execution adapter

### Advanced Features
- Multi-GPU support
- Distributed execution
- Shader hot-reloading
- Visual debugging tools
