/**
 * @fluxgpu/react - React bindings for FluxGPU
 *
 * 基于 IGPUAdapter 的六边形架构
 */

export * from './hooks.js';
export * from './components.js';
export * from './context.js';

// Re-export types from contracts and engine
export type { IGPUAdapter, ICommandEncoder, IBuffer, ITexture } from '@fluxgpu/contracts';
export { AdapterExecutor } from '@fluxgpu/engine';
export { BrowserGPUAdapter } from '@fluxgpu/host-browser';
