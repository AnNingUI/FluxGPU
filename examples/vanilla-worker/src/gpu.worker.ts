/**
 * FluxGPU Worker - 在 Worker 中运行 WebGPU
 *
 * 使用 @fluxgpu/protocol 进行通信
 * 使用 IWorkerRenderer 接口实现具体渲染逻辑
 */

import { createWorkerHandler } from '@fluxgpu/host-browser';
import { createParticleRendererFactory } from './particle-renderer';

// 创建 Worker 处理器，传入粒子渲染器工厂
createWorkerHandler({
  rendererFactory: createParticleRendererFactory({
    particleCount: 10000,
  }),
});

console.log('[GPU Worker] Worker initialized with ParticleRenderer');
