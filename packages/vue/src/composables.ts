/**
 * Vue Composables for FluxGPU
 *
 * 基于 IGPUAdapter 的六边形架构
 */

import { ref, shallowRef, onMounted, onUnmounted, watch, type Ref, type ShallowRef } from 'vue';
import type { IGPUAdapter, ICommandEncoder } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';

// ============================================================================
// useGPU - 主要的 GPU 初始化 composable
// ============================================================================

export interface UseGPUOptions {
  powerPreference?: 'low-power' | 'high-performance';
}

export interface UseGPUReturn {
  adapter: ShallowRef<IGPUAdapter | null>;
  executor: ShallowRef<AdapterExecutor | null>;
  error: Ref<Error | null>;
  isLoading: Ref<boolean>;
}

/**
 * 初始化 GPU 适配器和执行器
 *
 * @example
 * const canvasRef = ref<HTMLCanvasElement | null>(null);
 * const { adapter, executor, isLoading, error } = useGPU(canvasRef);
 */
export function useGPU(canvasRef: Ref<HTMLCanvasElement | null>, options: UseGPUOptions = {}): UseGPUReturn {
  const adapter = shallowRef<IGPUAdapter | null>(null);
  const executor = shallowRef<AdapterExecutor | null>(null);
  const error = ref<Error | null>(null);
  const isLoading = ref(true);

  watch(
    canvasRef,
    async (canvas) => {
      if (!canvas) return;

      try {
        isLoading.value = true;

        const browserAdapter = new BrowserGPUAdapter({
          canvas,
          powerPreference: options.powerPreference,
        });

        const adapterExecutor = new AdapterExecutor({ adapter: browserAdapter });
        await adapterExecutor.initialize();

        adapter.value = browserAdapter;
        executor.value = adapterExecutor;
        error.value = null;
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
        adapter.value = null;
        executor.value = null;
      } finally {
        isLoading.value = false;
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    if (executor.value) {
      executor.value.dispose();
    }
  });

  return { adapter, executor, error, isLoading };
}

// ============================================================================
// useGPUFrame - GPU 帧渲染 composable
// ============================================================================

export interface UseGPUFrameReturn {
  start: () => void;
  stop: () => void;
  isRunning: Ref<boolean>;
}

/**
 * GPU 帧渲染循环
 */
export function useGPUFrame(
  executor: ShallowRef<AdapterExecutor | null>,
  render: (encoder: ICommandEncoder, deltaTime: number) => void,
  autoStart = true
): UseGPUFrameReturn {
  const isRunning = ref(false);
  let frameId = 0;
  let lastTime = 0;

  const animate = (time: number) => {
    const deltaTime = lastTime ? time - lastTime : 0;
    lastTime = time;

    const e = executor.value;
    if (e) {
      e.frame((encoder) => {
        render(encoder, deltaTime);
      });
    }

    if (isRunning.value) {
      frameId = requestAnimationFrame(animate);
    }
  };

  const start = () => {
    if (!isRunning.value) {
      isRunning.value = true;
      lastTime = 0;
      frameId = requestAnimationFrame(animate);
    }
  };

  const stop = () => {
    isRunning.value = false;
    cancelAnimationFrame(frameId);
  };

  watch(
    executor,
    (e) => {
      if (e && autoStart) {
        start();
      }
    },
    { immediate: true }
  );

  onUnmounted(stop);

  return { start, stop, isRunning };
}

// ============================================================================
// useAnimationFrame - 通用动画循环 composable
// ============================================================================

export function useAnimationFrame(
  callback: (deltaTime: number, time: number) => void,
  autoStart = true
): UseGPUFrameReturn {
  const isRunning = ref(false);
  let frameId = 0;
  let lastTime = 0;

  const animate = (time: number) => {
    const deltaTime = lastTime ? time - lastTime : 0;
    lastTime = time;

    callback(deltaTime, time / 1000);

    if (isRunning.value) {
      frameId = requestAnimationFrame(animate);
    }
  };

  const start = () => {
    if (!isRunning.value) {
      isRunning.value = true;
      lastTime = 0;
      frameId = requestAnimationFrame(animate);
    }
  };

  const stop = () => {
    isRunning.value = false;
    cancelAnimationFrame(frameId);
  };

  onMounted(() => {
    if (autoStart) {
      start();
    }
  });

  onUnmounted(stop);

  return { start, stop, isRunning };
}

// ============================================================================
// useMouse - 鼠标位置 composable
// ============================================================================

/**
 * 获取归一化的鼠标位置 (-1 到 1)
 */
export function useMouse(canvasRef: Ref<HTMLCanvasElement | null>) {
  const pos = ref({ x: 0, y: 0 });

  const handleMove = (e: MouseEvent) => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    pos.value = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  };

  watch(
    canvasRef,
    (canvas, _, onCleanup) => {
      if (canvas) {
        canvas.addEventListener('mousemove', handleMove);
        onCleanup(() => canvas.removeEventListener('mousemove', handleMove));
      }
    },
    { immediate: true }
  );

  return pos;
}
