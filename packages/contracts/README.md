# @fluxgpu/contracts

Pure TypeScript interfaces defining all ports for FluxGPU.

## Overview

This package contains zero-dependency type definitions that form the contract between all FluxGPU packages. It defines:

- Command buffer types and opcodes
- Resource identifiers and handles
- Error types and validation contracts
- Port interfaces for dependency inversion

## Installation

```bash
pnpm add @fluxgpu/contracts
```

## Usage

```typescript
import type { CommandBuffer, ResourceId, Opcode } from '@fluxgpu/contracts';
import { FluxError, ErrorCode } from '@fluxgpu/contracts';

// Create a command
const command: CommandBuffer = {
  id: 'cmd-001' as ResourceId,
  opcode: Opcode.CreateBuffer,
  payload: new Uint8Array([1, 2, 3]),
  dependencies: [],
};

// Handle errors
throw new FluxError(ErrorCode.InvalidResource, 'Buffer not found');
```

## Key Types

| Type | Description |
|------|-------------|
| `CommandBuffer` | Represents a GPU command with dependencies |
| `ResourceId` | Branded type for resource identification |
| `Opcode` | Enum of all supported GPU operations |
| `FluxError` | Typed error with error codes |

## Architecture Role

As the foundation of FluxGPU's hexagonal architecture, this package:

- Has **zero dependencies** (not even on other @flux packages)
- Defines **ports** that other packages implement
- Enables **dependency inversion** across the codebase
