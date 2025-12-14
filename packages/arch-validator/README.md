# @flux/arch-validator

Static analysis tool for enforcing architectural constraints in FluxGPU.

## Purpose

This package validates that the FluxGPU codebase maintains its architectural integrity by enforcing:

1. **No Global Access in Domain Packages**: Domain packages (contracts, core, dsl) must not access platform-specific globals like `window`, `document`, `navigator`, or `Worker`.

2. **Maximum Inheritance Depth**: Class inheritance depth must not exceed 1 level, promoting composition over inheritance.

## Usage

### Command Line

```bash
# Run validation
pnpm validate:arch

# Or directly
node packages/arch-validator/dist/cli.js
```

### Programmatic

```typescript
import { validateArchitecture } from '@flux/arch-validator';

const isValid = await validateArchitecture({
  domainPackages: ['packages/contracts', 'packages/core', 'packages/dsl'],
  rootDir: process.cwd()
});

if (!isValid) {
  process.exit(1);
}
```

## Validators

### GlobalAccessValidator

Scans TypeScript files for references to forbidden global variables:
- `window`, `document`, `navigator`
- `Worker`, `localStorage`, `sessionStorage`
- `location`, `history`, `fetch`
- `XMLHttpRequest`, `WebSocket`
- `Blob`, `File`, `FileReader`

These globals should only be accessed in infrastructure packages (host-*, engine) through the adapter pattern.

### InheritanceValidator

Uses TypeScript's AST to analyze class hierarchies and ensure inheritance depth does not exceed 1 level. This enforces the architectural principle of "composition over inheritance."

### DependencyValidator

Validates package dependencies across the monorepo to enforce architectural layering:

1. **Contracts Package**: Must have zero runtime dependencies (only devDependencies allowed)
2. **Domain Packages** (core, dsl): Must depend only on `@flux/contracts`
3. **Protocol Package**: Must depend only on `@flux/contracts`
4. **Infrastructure Packages** (engine, host-*): Must depend only on `@flux/contracts` and `@flux/protocol`

This ensures dependencies flow inward toward the domain layer, preventing circular dependencies and maintaining clean architecture boundaries.

## Integration

The validator is integrated into the build process via the `prebuild` script in the root package.json. This ensures architectural constraints are validated before every build.

## Requirements

Validates:
- Requirement 1.2: Dependencies must point only inward toward the domain layer
- Requirement 1.3: Contracts package must have zero runtime dependencies
- Requirement 1.4: Core package must depend only on contracts
- Requirement 1.5: Infrastructure packages must depend on contracts and protocol only
- Requirement 10.1: Domain packages must not access global variables
- Requirement 10.3: Class inheritance depth must not exceed one level
