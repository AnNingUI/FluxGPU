# @fluxgpu/arch-validator

Static analysis tool for validating FluxGPU's architectural constraints.

## Overview

This package enforces the hexagonal architecture rules at build time:

- Domain packages cannot import from infrastructure
- Bridge layer can only depend on contracts
- Framework bindings follow proper dependency direction

## Installation

```bash
pnpm add -D @fluxgpu/arch-validator
```

## Usage

### CLI

```bash
# Validate architecture
npx flux-validate

# Or via pnpm script
pnpm validate:arch
```

### Programmatic

```typescript
import { validateArchitecture } from '@fluxgpu/arch-validator';

const result = validateArchitecture({
  domainPackages: ['packages/contracts', 'packages/core', 'packages/dsl'],
  bridgePackages: ['packages/protocol'],
  infraPackages: ['packages/engine', 'packages/host-browser'],
});

if (!result.valid) {
  console.error('Violations:', result.violations);
}
```

## Rules Enforced

| Rule | Description |
|------|-------------|
| Domain Isolation | `@fluxgpu/core`, `@fluxgpu/dsl` cannot import from engine/host |
| Contract Purity | `@fluxgpu/contracts` has zero dependencies |
| Bridge Independence | `@fluxgpu/protocol` only depends on contracts |
| Dependency Direction | Dependencies flow inward toward domain |

## Output

```
FluxGPU Architectural Constraint Validator

Validating domain packages:
  - packages/contracts
  - packages/core
  - packages/dsl

âœ?All architectural constraints validated successfully
```

## Integration

Add to your build pipeline:

```json
{
  "scripts": {
    "prebuild": "pnpm validate:arch",
    "build": "tsc -b"
  }
}
```
