/**
 * SolidJS Primitives for FluxGPU
 *
 * 基于 IGPUAdapter 的六边形架构
 */

import { createSignal, createEffect, onCleanup, type Accessor } from 'solid-js';
import type { IGPUAdapter, ICommandEncoder } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';

// ============================================================================
// createGPU - 主要的 GPU 初始化 primitive
// ============================================================================

export interface CreateGPUOptions {
  powerPreference?: 'low-power' | 'high-performance';
}

export interface CreateGPUReturn {
  adapter: Accessor<IGPUAdapter | null>;
  executor: Accessor<AdapterExecutor | null>;
  error: Accessor<Error | null>;
  isLoading: Accessor<boolean>;
}

/**
 * 初始化 GPU 适配器和执行器
 *
 * @example
 * const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
 * const { adapter, executor, isLoading, error } = createGPU(canvas);
 */
export function createGPU(canvas: Accessor<HTMLCanvasElement | null>, options: CreateGPUOptions = {}): CreateGPUReturn {
  const [adapter, setAdapter] = createSignal<IGPUAdapter | null>(null);
  const [executor, setExecutor] = createSignal<AdapterExecutor | null>(null);
  const [error, setError] = createSignal<Error | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  createEffect(() => {
    const c = canvas();
    if (!c) return;

    setIsLoading(true);

    const browserAdapter = new BrowserGPUAdapter({
      canvas: c,
      powerPreference: options.powerPreference,
    });

    const adapterExecutor = new AdapterExecutor({ adapter: browserAdapter });

    adapterExecutor
      .initialize()
      .then(() => {
        setAdapter(browserAdapter);
        setExecutor(adapterExecutor);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setAdapter(null);
        setExecutor(null);
      })
      .finally(() => {
        setIsLoading(false);
      });

    onCleanup(() => {
      adapterExecutor.dispose();
    });
  });

  return { adapter, executor, error, isLoading };
}

// ============================================================================
// createGPUFrame - GPU 帧渲染 primitive
// ============================================================================

export interface CreateGPUFrameReturn {
  start: () => void;
  stop: () => void;
  isRunning: Accessor<boolean>;
}

/**
 * GPU 帧渲染循环
 */
export function createGPUFrame(
  executor: Accessor<AdapterExecutor | null>,
  render: (encoder: ICommandEncoder, deltaTime: number) => void,
  autoStart = true
): CreateGPUFrameReturn {
  const [isRunning, setIsRunning] = createSignal(false);
  let frameId = 0;
  let lastTime = 0;

  const animate = (time: number) => {
    const deltaTime = lastTime ? time - lastTime : 0;
    lastTime = time;

    const e = executor();
    if (e) {
      e.frame((encoder) => {
        render(encoder, deltaTime);
      });
    }

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

  createEffect(() => {
    if (executor() && autoStart) {
      start();
    }
  });

  onCleanup(stop);

  return { start, stop, isRunning };
}

// ============================================================================
// createAnimationFrame - 通用动画循环 primitive
// ============================================================================

export function createAnimationFrame(callback: (deltaTime: number, time: number) => void): CreateGPUFrameReturn {
  const [isRunning, setIsRunning] = createSignal(false);
  let frameId = 0;
  let lastTime = 0;
  let currentCallback = callback;

  const animate = (time: number) => {
    const deltaTime = lastTime ? time - lastTime : 0;
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

  onCleanup(stop);

  return { start, stop, isRunning };
}

// ============================================================================
// createMouse - 鼠标位置 primitive
// ============================================================================

/**
 * 获取归一化的鼠标位置 (-1 到 1)
 */
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
