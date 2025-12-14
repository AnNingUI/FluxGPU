# @flux/core

Graph orchestration, shadow state management, and validation for FluxGPU.

## Overview

This package provides the core domain logic:

- **ShadowState**: CPU-side state tracking for GPU resources
- **Graph Orchestration**: Dependency resolution and command scheduling
- **Validation**: Resource lifecycle and state validation

## Installation

```bash
pnpm add @flux/core
```

## Usage

### Shadow State

```typescript
import { ShadowState } from '@flux/core';

const state = new ShadowState();

// Track buffer creation
state.createBuffer('buffer-1', { size: 1024, usage: 'storage' });

// Query state
const buffer = state.getBuffer('buffer-1');
console.log(buffer.size); // 1024

// Validate operations
state.validateWrite('buffer-1', 0, 512); // throws if invalid
```

## Architecture Role

Part of the **Domain Layer**, this package:

- Depends only on `@flux/contracts`
- Contains pure business logic with no platform dependencies
- Can be tested without any GPU or browser APIs
