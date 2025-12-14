# @fluxgpu/protocol

Platform-agnostic binary communication protocol for FluxGPU.

## Overview

This package provides efficient serialization for GPU commands, enabling:

- Worker thread communication
- Network transmission
- Command recording and replay

## Installation

```bash
pnpm add @fluxgpu/protocol
```

## Usage

### Serialize Commands

```typescript
import { serializeCommand, deserializeCommand } from '@fluxgpu/protocol';
import type { CommandBuffer } from '@fluxgpu/contracts';
import { Opcode } from '@fluxgpu/contracts';

const command: CommandBuffer = {
  id: 'cmd-001',
  opcode: Opcode.CreateBuffer,
  payload: new Uint8Array([1, 2, 3, 4]),
  dependencies: [],
};

// Serialize to binary
const bytes = serializeCommand(command);

// Deserialize back
const restored = deserializeCommand(bytes);
```

### Batch Operations

```typescript
import { serializeBatch, deserializeBatch } from '@fluxgpu/protocol';

const commands = [command1, command2, command3];
const batch = serializeBatch(commands);
const restored = deserializeBatch(batch);
```

## Wire Format

Commands are serialized as:

```
┌──────────┬──────────┬──────────┬──────────┬──────────�?
�? Header  �? Opcode  �? ID Len  �?   ID    �?Payload  �?
�? 4 bytes �? 1 byte  �? 2 bytes �? N bytes �? M bytes �?
└──────────┴──────────┴──────────┴──────────┴──────────�?
```

## Architecture Role

Part of the **Bridge Layer**, this package:

- Enables communication between main thread and workers
- Provides platform-agnostic serialization
- Supports future network/IPC use cases
