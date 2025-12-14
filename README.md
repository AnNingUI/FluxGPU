# FluxGPU v5.0

WebGPU framework with Hexagonal Architecture (Ports & Adapters).

## Architecture

FluxGPU follows strict Dependency Inversion with three layers:

- **Domain Layer** (`@flux/core`, `@flux/dsl`): Pure logic, depends only on contracts
- **Bridge Layer** (`@flux/protocol`): Platform-agnostic communication
- **Infrastructure Layer** (`@flux/engine`, `@flux/host-*`): Platform-specific implementations

## Packages

- `@flux/contracts`: Pure TypeScript interfaces (zero dependencies)
- `@flux/dsl`: Functional shader composition
- `@flux/core`: Graph orchestration and shadow state
- `@flux/protocol`: Binary communication protocol
- `@flux/engine`: WebGPU executor
- `@flux/host-browser`: Browser runtime adapter

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development

This is a PNPM monorepo with TypeScript project references for fast incremental builds.
