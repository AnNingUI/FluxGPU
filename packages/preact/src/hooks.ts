/**
 * Preact Hooks for FluxGPU
 * 
 * API mirrors @flux/react for easy migration
 */

/// <reference types="@webgpu/types" />

import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { StructType } from '@flux/dsl';
import { GPUContext, ComputePass, RenderPass, UniformBuffer } from '@flux/engine';

// ============================================================================
// useGPUContext - GPU 初始化 hook
// ============================================================================

export interface UseGPUContextOptions {
  powerPreference?: 'low-power' | 'high-performance';
}

export interface UseGPUContextResult {
  gpu: GPUContext | null;
  error: Error | null;
  isLoading: boolean;
}

export function useGPUContext(
  canvasRef: RefObject<HTMLCanvasElement>,
  options: UseGPUContextOptions = {}
): UseGPUContextResult {
  const [gpu, setGpu] = useState<GPUContext | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;

    GPUContext.create({ canvas, powerPreference: options.powerPreference })
      .then((ctx) => {
        if (mounted) {
          setGpu(ctx);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [canvasRef.current, options.powerPreference]);

  return { gpu, error, isLoading };
}

// ============================================================================
// useComputePass - 计算管线 hook
// ============================================================================

export function useComputePass(
  gpu: GPUContext | null,
  shaderCode: string,
  workgroupSize: [number, number?, number?] = [256]
): ComputePass | null {
  return useMemo(() => {
    if (!gpu) return null;
    return gpu.createComputePass(shaderCode, workgroupSize);
  }, [gpu, shaderCode, workgroupSize[0], workgroupSize[1], workgroupSize[2]]);
}

// ============================================================================
// useRenderPass - 渲染管线 hook
// ============================================================================

export interface UseRenderPassOptions {
  topology?: GPUPrimitiveTopology;
  blend?: GPUBlendState;
}

export function useRenderPass(
  gpu: GPUContext | null,
  vertexShader: string,
  fragmentShader: string,
  options: UseRenderPassOptions = {}
): RenderPass | null {
  return useMemo(() => {
    if (!gpu) return null;
    return gpu.createRenderPass(vertexShader, fragmentShader, options);
  }, [gpu, vertexShader, fragmentShader, options.topology]);
}

// ============================================================================
// useUniformBuffer - Uniform buffer hook
// ============================================================================

export function useUniformBuffer<T extends StructType>(
  gpu: GPUContext | null,
  structType: T
): UniformBuffer<T> | null {
  return useMemo(() => {
    if (!gpu) return null;
    return gpu.createUniformBuffer(structType);
  }, [gpu, structType]);
}

// ============================================================================
// useAnimationFrame - 动画循环 hook (简化版)
// ============================================================================

export function useAnimationFrame(
  callback: (deltaTime: number, time: number) => void,
  active = true
): void {
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
// useGPUFrame - GPU 帧渲染 hook
// ============================================================================

export function useGPUFrame(
  gpu: GPUContext | null,
  render: (encoder: GPUCommandEncoder, target: GPUTextureView, deltaTime: number) => void,
  active = true
): void {
  const renderRef = useRef(render);
  renderRef.current = render;

  const gpuRef = useRef(gpu);
  gpuRef.current = gpu;

  // 当 gpu 变化时更新 ref
  useEffect(() => {
    gpuRef.current = gpu;
  }, [gpu]);

  useEffect(() => {
    if (!active || !gpu) return;

    let frameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      const deltaTime = lastTime ? time - lastTime : 0;
      lastTime = time;

      const currentGpu = gpuRef.current;
      if (currentGpu) {
        currentGpu.frame((encoder, target) => {
          renderRef.current(encoder, target, deltaTime);
        });
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [active, gpu]);
}

// ============================================================================
// useMouse - 鼠标位置 hook
// ============================================================================

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
  }, [canvasRef.current]);

  return pos;
}
