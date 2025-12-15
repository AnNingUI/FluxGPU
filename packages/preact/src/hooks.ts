/**
 * Preact Hooks for FluxGPU
 *
 * 基于 IGPUAdapter 的六边形架构
 * API mirrors @fluxgpu/react for easy migration
 */

import { useState, useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { IGPUAdapter, ICommandEncoder } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';

// ============================================================================
// useGPU - 主要的 GPU 初始化 hook
// ============================================================================

export interface UseGPUOptions {
  powerPreference?: 'low-power' | 'high-performance';
}

export interface UseGPUResult {
  adapter: IGPUAdapter | null;
  executor: AdapterExecutor | null;
  error: Error | null;
  isLoading: boolean;
}

/**
 * 初始化 GPU 适配器和执行器
 *
 * @example
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * const { adapter, executor, isLoading, error } = useGPU(canvasRef);
 */
export function useGPU(canvasRef: RefObject<HTMLCanvasElement>, options: UseGPUOptions = {}): UseGPUResult {
  const [adapter, setAdapter] = useState<IGPUAdapter | null>(null);
  const [executor, setExecutor] = useState<AdapterExecutor | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;
    let currentExecutor: AdapterExecutor | null = null;

    const init = async () => {
      try {
        const browserAdapter = new BrowserGPUAdapter({
          canvas,
          powerPreference: options.powerPreference,
        });

        currentExecutor = new AdapterExecutor({ adapter: browserAdapter });
        await currentExecutor.initialize();

        if (mounted) {
          setAdapter(browserAdapter);
          setExecutor(currentExecutor);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (currentExecutor) {
        currentExecutor.dispose();
      }
    };
    // 注意：使用 canvasRef 而不是 canvasRef.current，避免不必要的重新初始化
  }, [canvasRef, options.powerPreference]);

  return { adapter, executor, error, isLoading };
}

// ============================================================================
// useGPUFrame - GPU 帧渲染 hook
// ============================================================================

/**
 * GPU 帧渲染循环
 */
export function useGPUFrame(
  executor: AdapterExecutor | null,
  render: (encoder: ICommandEncoder, deltaTime: number) => void,
  active = true
): void {
  const renderRef = useRef(render);
  renderRef.current = render;

  useEffect(() => {
    if (!active || !executor) return;

    let frameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      const deltaTime = lastTime ? time - lastTime : 0;
      lastTime = time;

      executor.frame((encoder) => {
        renderRef.current(encoder, deltaTime);
      });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [active, executor]);
}

// ============================================================================
// useAnimationFrame - 通用动画循环 hook
// ============================================================================

/**
 * 通用动画循环
 */
export function useAnimationFrame(callback: (deltaTime: number, time: number) => void, active = true): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;

    let frameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      const deltaTime = lastTime ? time - lastTime : 0;
      lastTime = time;
      callbackRef.current(deltaTime, time);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [active]);
}

// ============================================================================
// useMouse - 鼠标位置 hook
// ============================================================================

/**
 * 获取归一化的鼠标位置 (-1 到 1)
 */
export function useMouse(canvasRef: RefObject<HTMLCanvasElement>): { x: number; y: number } {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setPos({
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      });
    };

    canvas.addEventListener('mousemove', handleMove);
    return () => canvas.removeEventListener('mousemove', handleMove);
  }, [canvasRef]);

  return pos;
}
