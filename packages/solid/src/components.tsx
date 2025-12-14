/**
 * SolidJS Components for FluxGPU
 */

/// <reference types="@webgpu/types" />

import { createSignal, createEffect, onMount, Show, type JSX, type ParentProps } from 'solid-js';
import { GPUContext } from '@fluxgpu/engine';
import { createGPU, createGPUFrame } from './primitives.js';

// ============================================================================
// GPUCanvas - GPU Canvas 组件
// ============================================================================

export interface GPUCanvasProps {
  width?: number;
  height?: number;
  devicePixelRatio?: boolean;
  autoStart?: boolean;
  onReady?: (gpu: GPUContext) => void;
  onError?: (error: Error) => void;
  onRender?: (encoder: GPUCommandEncoder, target: GPUTextureView, deltaTime: number) => void;
  class?: string;
  style?: JSX.CSSProperties;
  ref?: (el: GPUCanvasRef) => void;
}

export interface GPUCanvasRef {
  canvas: HTMLCanvasElement | null;
  gpu: GPUContext | null;
  start: () => void;
  stop: () => void;
}

export function GPUCanvas(props: ParentProps<GPUCanvasProps>) {
  let canvasEl: HTMLCanvasElement | undefined;
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  
  const { gpu, error, isLoading } = createGPU(canvas);

  // 设置 canvas 尺寸
  createEffect(() => {
    const c = canvas();
    if (!c) return;

    const dpr = props.devicePixelRatio !== false ? window.devicePixelRatio : 1;
    c.width = (props.width ?? 800) * dpr;
    c.height = (props.height ?? 600) * dpr;
  });

  // 回调
  createEffect(() => {
    const g = gpu();
    if (g) props.onReady?.(g);
  });

  createEffect(() => {
    const e = error();
    if (e) props.onError?.(e);
  });

  // 渲染循环 - 直接访问 props.onRender 以保持响应式
  const { start, stop } = createGPUFrame(
    gpu,
    (encoder, target, deltaTime) => {
      props.onRender?.(encoder, target, deltaTime);
    },
    props.autoStart !== false
  );

  // 暴露 ref
  onMount(() => {
    setCanvas(canvasEl ?? null);
    props.ref?.({
      canvas: canvasEl ?? null,
      gpu: gpu(),
      start,
      stop,
    });
  });

  return (
    <div
      class={props.class}
      style={{
        position: 'relative',
        width: `${props.width ?? 800}px`,
        height: `${props.height ?? 600}px`,
        ...props.style,
      }}
    >
      <canvas
        ref={canvasEl}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      
      <Show when={isLoading()}>
        <div style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
        }}>
          Loading WebGPU...
        </div>
      </Show>
      
      <Show when={error()}>
        <div style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          background: 'rgba(255,0,0,0.2)',
          color: 'red',
        }}>
          {error()?.message}
        </div>
      </Show>
      
      {props.children}
    </div>
  );
}

// ============================================================================
// GPUStats - 性能统计组件
// ============================================================================

export interface GPUStatsProps {
  gpu?: GPUContext | null;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: JSX.CSSProperties;
}

export function GPUStats(props: GPUStatsProps) {
  const [fps, setFps] = createSignal(0);
  let frameCount = 0;
  let lastTime = performance.now();

  const updateFPS = () => {
    frameCount++;
    const now = performance.now();
    if (now - lastTime > 1000) {
      setFps(Math.round(frameCount / ((now - lastTime) / 1000)));
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(updateFPS);
  };

  onMount(updateFPS);

  const position = () => props.position ?? 'top-right';

  return (
    <div style={{
      position: 'absolute',
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      'font-family': 'monospace',
      'font-size': '12px',
      'border-radius': '4px',
      ...(position().includes('top') ? { top: '8px' } : { bottom: '8px' }),
      ...(position().includes('right') ? { right: '8px' } : { left: '8px' }),
      ...props.style,
    }}>
      <div>FPS: {fps()}</div>
      <Show when={props.gpu}>
        <div>Format: {props.gpu?.format}</div>
      </Show>
    </div>
  );
}
