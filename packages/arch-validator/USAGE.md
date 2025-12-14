# Architecture Validator Usage Guide

## Overview

The Architecture Validator enforces FluxGPU's architectural constraints:

1. **No Global Access**: Domain packages cannot access platform-specific globals
2. **Limited Inheritance**: Class inheritance depth cannot exceed 1 level

## Running the Validator

### During Build (Automatic)

The validator runs automatically before every build:

```bash
pnpm build
```

If validation fails, the build will be aborted.

### Standalone Validation

Run validation without building:

```bash
pnpm validate:arch
```

### Manual Testing

For development and debugging:

```bash
node packages/arch-validator/test-manual.js
```

## Understanding Validation Errors

### Global Access Violations

**Error Example:**
```
packages/core/src/example.ts:15:5 [no-global-access]
Forbidden global variable access: 'window'. Domain packages must not access platform-specific globals.
```

**Fix:** Use dependency injection instead:
```typescript
// ‚ù?Bad - Direct global access
export function getWidth() {
  return window.innerWidth;
}

// ‚ú?Good - Injected adapter
export function getWidth(adapter: IRuntimeAdapter) {
  return adapter.getWindowWidth();
}
```

### Inheritance Depth Violations

**Error Example:**
```
packages/core/src/example.ts:25:1 [max-inheritance-depth]
Class 'DeepDerived' has inheritance depth of 2, which exceeds the maximum allowed depth of 1.
Use composition instead of deep inheritance.
```

**Fix:** Use composition:
```typescript
// ‚ù?Bad - Deep inheritance
class Base { }
class Middle extends Base { }
class DeepDerived extends Middle { } // Depth 2!

// ‚ú?Good - Composition
class Base { }
class Composed {
  private base: Base;
  constructor() {
    this.base = new Base();
  }
}
```

## Extending the Validator

### Adding New Validators

1. Create a new validator class implementing the `Validator` interface:

```typescript
import type { Validator, ValidationResult } from './validators/validator.js';

export class MyValidator implements Validator {
  name = 'MyValidator';

  async validate(files: string[]): Promise<ValidationResult> {
    // Implementation
  }
}
```

2. Register it in `runner.ts`:

```typescript
this.validators = config.validators || [
  new GlobalAccessValidator(),
  new InheritanceValidator(),
  new MyValidator() // Add here
];
```

### Adding Forbidden Globals

Edit `FORBIDDEN_GLOBALS` in `global-access-validator.ts`:

```typescript
const FORBIDDEN_GLOBALS = [
  'window',
  'document',
  // Add more here
  'myGlobal',
];
```

### Changing Inheritance Depth Limit

Edit `maxDepth` in `inheritance-validator.ts`:

```typescript
export class InheritanceValidator implements Validator {
  private maxDepth = 2; // Change from 1 to 2
  // ...
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Validate Architecture
  run: pnpm validate:arch
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
pnpm validate:arch || exit 1
```

## Troubleshooting

### False Positives

If the validator incorrectly flags valid code:

1. Check if the code is in a comment or string (should be ignored)
2. Check if it's in a type annotation (should be ignored)
3. File an issue with the specific case

### Performance Issues

For large codebases:

1. Limit validation to changed files only
2. Run validation in parallel with other checks
3. Cache validation results

### Skipping Validation

To temporarily skip validation (not recommended):

```bash
# Skip prebuild hook
pnpm build --ignore-scripts
```

## Architecture Principles

### Why No Global Access?

Domain packages should be platform-agnostic. Accessing globals like `window` or `navigator` ties the code to specific environments (browsers), making it:
- Harder to test
- Impossible to run in other environments (Deno, Node.js)
- Violates Hexagonal Architecture principles

### Why Limited Inheritance?

Deep inheritance hierarchies are:
- Hard to understand and maintain
- Fragile (changes ripple through the hierarchy)
- Violate the "composition over inheritance" principle

FluxGPU prefers:
- Factory functions over constructors
- Composition over inheritance
- Interfaces over base classes

## Examples

### Valid Domain Code

```typescript
// ‚ú?Pure function
export function add(a: number, b: number): number {
  return a + b;
}

// ‚ú?Interface usage
export function createExecutor(adapter: IRuntimeAdapter): IExecutor {
  return adapter.createExecutor();
}

// ‚ú?Single-level inheritance (from external class)
export class FluxError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// ‚ú?Composition
export class Pipeline {
  private operations: Operation[] = [];
  
  pipe(op: Operation): Pipeline {
    return new Pipeline([...this.operations, op]);
  }
}
```

### Invalid Domain Code

```typescript
// ‚ú?Global access
export function getGPU() {
  return navigator.gpu; // Forbidden!
}

// ‚ú?Deep inheritance
class Base { }
class Middle extends Base { }
class Deep extends Middle { } // Depth 2 - Forbidden!

// ‚ú?Worker creation
export function startWorker() {
  return new Worker('./worker.js'); // Forbidden!
}
```
