# Dependency Validation Examples

This document demonstrates how the DependencyValidator catches architectural violations.

## Valid Configurations

### Contracts Package
```json
{
  "name": "@flux/contracts",
  "dependencies": {}
}
```
✅ Contracts has zero runtime dependencies

### Core Package
```json
{
  "name": "@flux/core",
  "dependencies": {
    "@flux/contracts": "workspace:*"
  }
}
```
✅ Core depends only on contracts

### Infrastructure Package
```json
{
  "name": "@flux/engine",
  "dependencies": {
    "@flux/contracts": "workspace:*",
    "@flux/protocol": "workspace:*",
    "@webgpu/types": "^0.1.40"
  }
}
```
✅ Engine depends on contracts and protocol, plus external dependencies

## Invalid Configurations

### Contracts with Dependencies
```json
{
  "name": "@flux/contracts",
  "dependencies": {
    "@flux/core": "workspace:*"
  }
}
```
❌ Error: Contracts package must have zero runtime dependencies

### Core with Invalid Dependencies
```json
{
  "name": "@flux/core",
  "dependencies": {
    "@flux/contracts": "workspace:*",
    "@flux/protocol": "workspace:*"
  }
}
```
❌ Error: @flux/core must depend only on @flux/contracts

### Infrastructure with Domain Dependencies
```json
{
  "name": "@flux/engine",
  "dependencies": {
    "@flux/contracts": "workspace:*",
    "@flux/protocol": "workspace:*",
    "@flux/core": "workspace:*"
  }
}
```
❌ Error: Infrastructure package must depend only on @flux/contracts and @flux/protocol

## Testing Violations

To test that the validator catches violations, you can temporarily modify a package.json:

```bash
# Add an invalid dependency to contracts
cd packages/contracts
# Edit package.json to add a dependency
pnpm validate:arch
# Should fail with error message
# Revert changes
```

## Current Project Status

Run `pnpm validate:arch` to see the current validation status:

```
FluxGPU Architectural Constraint Validator

Validating domain packages:
  - packages/contracts
  - packages/core
  - packages/dsl

✓ All architectural constraints validated successfully
```
