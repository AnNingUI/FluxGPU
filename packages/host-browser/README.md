# @flux/host-browser

Browser runtime adapter for FluxGPU.

## Overview

This package provides browser-specific implementations:

- **BrowserAdapter**: Main thread to Worker communication
- **DOM Integration**: Canvas and event handling
- **Resource Management**: Browser-specific resource lifecycle

## Installation

```bash
pnpm add @flux/host-browser
```

## Usage

### Browser Adapter

```typescript
import { BrowserAdapter } from '@flux/host-browser';

const adapter = new BrowserAdapter();

// Initialize with canvas
await adapter.initialize(canvas);

// Send commands to worker
adapter.send(command);

// Handle responses
adapter.onMessage((response) => {
  console.log('GPU response:', response);
});
```

## Architecture Role

Part of the **Infrastructure Layer**, this package:

- Implements browser-specific ports defined in `@flux/contracts`
- Manages Worker thread lifecycle
- Handles DOM events and canvas integration
