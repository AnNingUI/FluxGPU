/**
 * Vue Composables for FluxGPU
 */

/// <reference types="@webgpu/types" />

import { ref, shallowRef, onMounted, onUnmounted, watch, type Ref, type ShallowRef } from 'vue';
import type { StructType } from '@flux/dsl';
import { GPUContext, ComputePass, RenderPass, UniformBuffer } from '@flux/engine';

// ============================================================================
// useGPU - 主要的 GPU 初始化 composable
// ============================================================================

export interface UseGPUOptions {
  powerPreference?: 'low-power' | 'high-performance';
}

export interface UseGPUReturn {
  gpu: ShallowRef<GPUContext | null>;
  error: Ref<Error | null>;
  isLoading: Ref<boolean>;
}

export function useGPU(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: UseGPUOptions = {}
): UseGPUReturn {
  const gpu = shallowRef<GPUContext | null>(null);
  const error = ref<Error | null>(null);
  const isLoading = ref(true);

  watch(canvasRef, async (canvas) => {
    if (!canvas) return;

    try {
      isLoading.value = true;
      gpu.value = await GPUContext.create({
        canvas,
        powerPreference: options.powerPreference,
      });
      error.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      gpu.value = null;
    } finally {
      isLoading.value = false;
    }
  }, { immediate: true });

  return { gpu, error, isLoading };
}

// ============================================================================
// useComputePass - 计算管线 composable
// ============================================================================

export function useComputePass(
  gpu: ShallowRef<GPUContext | null>,
  shaderCode: Ref<string> | string,
  workgroupSize: [number, number?, number?] = [256]
): ShallowRef<ComputePass | null> {
  const pass = shallowRef<ComputePass | null>(null);
  const code = typeof shaderCode === 'string' ? ref(shaderCode) : shaderCode;

  watch([gpu, code], ([g, c]) => {
    if (g && c) {
      pass.value = g.createComputePass(c, workgroupSize);
    } else {
      pass.value = null;
    }
  }, { immediate: true });

  return pass;
}

// ============================================================================
// useRenderPass - 渲染管线 composable
// ============================================================================

export interface UseRenderPassOptions {
  topology?: GPUPrimitiveTopology;
  blend?: GPUBlendState;
}

export function useRenderPass(
  gpu: ShallowRef<GPUContext | null>,
  vertexShader: Ref<string> | string,
  fragmentShader: Ref<string> | string,
  options: UseRenderPassOptions = {}
): ShallowRef<RenderPass | null> {
  const pass = shallowRef<RenderPass | null>(null);
  const vertex = typeof vertexShader === 'string' ? ref(vertexShader) : vertexShader;
  const fragment = typeof fragmentShader === 'string' ? ref(fragmentShader) : fragmentShader;

  watch([gpu, vertex, fragment], ([g, v, f]) => {
    if (g && v && f) {
      pass.value = g.createRenderPass(v, f, options);
    } else {
      pass.value = null;
    }
  }, { immediate: true });

  return pass;
}

// ============================================================================
// useUniformBuffer - Uniform buffer composable
// ============================================================================

export function useUniformBuffer<T extends StructType>(
  gpu: ShallowRef<GPUContext | null>,
  structType: T
): ShallowRef<UniformBuffer<T> | null> {
  const buffer = shallowRef<UniformBuffer<T> | null>(null);

  watch(gpu, (g) => {
    if (g) {
      buffer.value = g.createUniformBuffer(structType);
    } else {
      buffer.value = null;
    }
  }, { immediate: true });

  return buffer;
}

// ============================================================================
// useAnimationFrame - 动画循环 composable
// ============================================================================

export interface UseAnimationFrameReturn {
  start: () => void;
  stop: () => void;
  isRunning: Ref<boolean>;
}

export function useAnimationFrame(
  callback: (deltaTime: number, time: number) => void,
  autoStart = true
): UseAnimationFrameReturn {
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
// useGPUFrame - GPU 帧渲染 composable
// ============================================================================

export function useGPUFrame(
  gpu: ShallowRef<GPUContext | null>,
  render: (encoder: GPUCommandEncoder, target: GPUTextureView, deltaTime: number) => void,
  autoStart = true
): UseAnimationFrameReturn {
  const { start, stop, isRunning } = useAnimationFrame((deltaTime) => {
    const g = gpu.value;
    if (g) {
      g.frame((encoder, target) => {
        render(encoder, target, deltaTime);
      });
    }
  });

  watch(gpu, (g) => {
    if (g && autoStart) {
      start();
    }
  }, { immediate: true });

  onUnmounted(stop);

  return { start, stop, isRunning };
}

// ============================================================================
// useMouse - 鼠标位置 composable
// ============================================================================

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

  watch(canvasRef, (canvas, _, onCleanup) => {
    if (canvas) {
      canvas.addEventListener('mousemove', handleMove);
      onCleanup(() => canvas.removeEventListener('mousemove', handleMove));
    }
  }, { immediate: true });

  return pos;
}
