# Dependency Validation Examples

This document demonstrates how the DependencyValidator catches architectural violations.

## Valid Configurations

### Contracts Package
```json
{
  "name": "@fluxgpu/contracts",
  "dependencies": {}
}
```
‚ú?Contracts has zero runtime dependencies

### Core Package
```json
{
  "name": "@fluxgpu/core",
  "dependencies": {
    "@fluxgpu/contracts": "workspace:*"
  }
}
```
‚ú?Core depends only on contracts

### Infrastructure Package
```json
{
  "name": "@fluxgpu/engine",
  "dependencies": {
    "@fluxgpu/contracts": "workspace:*",
    "@fluxgpu/protocol": "workspace:*",
    "@webgpu/types": "^0.1.40"
  }
}
```
‚ú?Engine depends on contracts and protocol, plus external dependencies

## Invalid Configurations

### Contracts with Dependencies
```json
{
  "name": "@fluxgpu/contracts",
  "dependencies": {
    "@fluxgpu/core": "workspace:*"
  }
}
```
‚ù?Error: Contracts package must have zero runtime dependencies

### Core with Invalid Dependencies
```json
{
  "name": "@fluxgpu/core",
  "dependencies": {
    "@fluxgpu/contracts": "workspace:*",
    "@fluxgpu/protocol": "workspace:*"
  }
}
```
‚ù?Error: @fluxgpu/core must depend only on @fluxgpu/contracts

### Infrastructure with Domain Dependencies
```json
{
  "name": "@fluxgpu/engine",
  "dependencies": {
    "@fluxgpu/contracts": "workspace:*",
    "@fluxgpu/protocol": "workspace:*",
    "@fluxgpu/core": "workspace:*"
  }
}
```
‚ù?Error: Infrastructure package must depend only on @fluxgpu/contracts and @fluxgpu/protocol

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

‚ú?All architectural constraints validated successfully
```
