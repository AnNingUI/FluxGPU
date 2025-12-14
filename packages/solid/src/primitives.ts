/**
 * SolidJS Primitives for FluxGPU
 */

/// <reference types="@webgpu/types" />

import { createSignal, createEffect, onCleanup, createMemo, type Accessor } from 'solid-js';
import type { StructType } from '@fluxgpu/dsl';
import { GPUContext, ComputePass, RenderPass, UniformBuffer } from '@fluxgpu/engine';

// ============================================================================
// createGPU - 主要的 GPU 初始化 primitive
// ============================================================================

export interface CreateGPUOptions {
  powerPreference?: 'low-power' | 'high-performance';
}

export interface CreateGPUReturn {
  gpu: Accessor<GPUContext | null>;
  error: Accessor<Error | null>;
  isLoading: Accessor<boolean>;
}

export function createGPU(
  canvas: Accessor<HTMLCanvasElement | null>,
  options: CreateGPUOptions = {}
): CreateGPUReturn {
  const [gpu, setGpu] = createSignal<GPUContext | null>(null);
  const [error, setError] = createSignal<Error | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  createEffect(() => {
    const c = canvas();
    if (!c) return;

    setIsLoading(true);
    
    GPUContext.create({ canvas: c, powerPreference: options.powerPreference })
      .then((ctx) => {
        setGpu(ctx);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setGpu(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  });

  return { gpu, error, isLoading };
}

// ============================================================================
// createComputePass - 计算管线 primitive
// ============================================================================

export function createComputePass(
  gpu: Accessor<GPUContext | null>,
  shaderCode: Accessor<string> | string,
  workgroupSize: [number, number?, number?] = [256]
): Accessor<ComputePass | null> {
  const code = typeof shaderCode === 'string' ? () => shaderCode : shaderCode;

  return createMemo(() => {
    const g = gpu();
    const c = code();
    if (g && c) {
      return g.createComputePass(c, workgroupSize);
    }
    return null;
  });
}

// ============================================================================
// createRenderPass - 渲染管线 primitive
// ============================================================================

export interface CreateRenderPassOptions {
  topology?: GPUPrimitiveTopology;
  blend?: GPUBlendState;
}

export function createRenderPass(
  gpu: Accessor<GPUContext | null>,
  vertexShader: Accessor<string> | string,
  fragmentShader: Accessor<string> | string,
  options: CreateRenderPassOptions = {}
): Accessor<RenderPass | null> {
  const vertex = typeof vertexShader === 'string' ? () => vertexShader : vertexShader;
  const fragment = typeof fragmentShader === 'string' ? () => fragmentShader : fragmentShader;

  return createMemo(() => {
    const g = gpu();
    const v = vertex();
    const f = fragment();
    if (g && v && f) {
      return g.createRenderPass(v, f, options);
    }
    return null;
  });
}

// ============================================================================
// createUniformBuffer - Uniform buffer primitive
// ============================================================================

export function createUniformBuffer<T extends StructType>(
  gpu: Accessor<GPUContext | null>,
  structType: T
): Accessor<UniformBuffer<T> | null> {
  return createMemo(() => {
    const g = gpu();
    if (g) {
      return g.createUniformBuffer(structType);
    }
    return null;
  });
}

// ============================================================================
// createAnimationFrame - 动画循环 primitive
// ============================================================================

export interface CreateAnimationFrameReturn {
  start: () => void;
  stop: () => void;
  isRunning: Accessor<boolean>;
}

export function createAnimationFrame(
  callback: (deltaTime: number, time: number) => void
): CreateAnimationFrameReturn {
  const [isRunning, setIsRunning] = createSignal(false);
  let frameId = 0;
  let lastTime = 0;
  // 保存最新的回调引用
  let currentCallback = callback;

  const animate = (time: number) => {
    const deltaTime = lastTime ? time - lastTime : 0; // 毫秒
    lastTime = time;
    
    currentCallback(deltaTime, time);
    
    frameId = requestAnimationFrame(animate);
  };

  const start = () => {
    if (!isRunning()) {
      setIsRunning(true);
      lastTime = 0;
      frameId = requestAnimationFrame(animate);
    }
  };

  const stop = () => {
    setIsRunning(false);
    cancelAnimationFrame(frameId);
  };

  // 提供更新回调的方法
  const updateCallback = (cb: typeof callback) => {
    currentCallback = cb;
  };

  onCleanup(stop);

  return { start, stop, isRunning };
}

// ============================================================================
// createGPUFrame - GPU 帧渲染 primitive
// ============================================================================

export function createGPUFrame(
  gpu: Accessor<GPUContext | null>,
  render: (encoder: GPUCommandEncoder, target: GPUTextureView, deltaTime: number) => void,
  autoStart = true
): CreateAnimationFrameReturn {
  const { start, stop, isRunning } = createAnimationFrame((deltaTime) => {
    const g = gpu();
    if (g) {
      g.frame((encoder, target) => {
        // 直接调用 render，在 Solid 中如果 render 内部访问 signals，会自动获取最新值
        render(encoder, target, deltaTime);
      });
    }
  });
  
  createEffect(() => {
    if (gpu() && autoStart) {
      start();
    }
  });

  return { start, stop, isRunning };
}

// ============================================================================
// createMouse - 鼠标位置 primitive
// ============================================================================

export function createMouse(canvas: Accessor<HTMLCanvasElement | null>) {
  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);

  createEffect(() => {
    const c = canvas();
    if (!c) return;

    const handleMove = (e: MouseEvent) => {
      const rect = c.getBoundingClientRect();
      setX(((e.clientX - rect.left) / rect.width) * 2 - 1);
      setY(-(((e.clientY - rect.top) / rect.height) * 2 - 1));
    };

    c.addEventListener('mousemove', handleMove);
    onCleanup(() => c.removeEventListener('mousemove', handleMove));
  });

  return { x, y };
}
