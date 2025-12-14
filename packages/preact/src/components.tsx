/**
 * Preact Components for FluxGPU
 */

/// <reference types="@webgpu/types" />

import { useRef, useEffect } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import { GPUContext } from '@fluxgpu/engine';
import { useGPUContext, useGPUFrame } from './hooks.js';

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
  children?: ComponentChildren;
}

export function GPUCanvas({
  width = 800,
  height = 600,
  devicePixelRatio: useDPR = true,
  autoStart = true,
  onReady,
  onError,
  onRender,
  class: className,
  style,
  children,
}: GPUCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gpu, error, isLoading } = useGPUContext(canvasRef);

  // 设置 canvas 尺寸
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = useDPR ? window.devicePixelRatio : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }, [width, height, useDPR]);

  // 回调
  useEffect(() => {
    if (gpu) onReady?.(gpu);
  }, [gpu, onReady]);

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  // 保存最新的 onRender 回调
  const onRenderRef = useRef(onRender);
  onRenderRef.current = onRender;

  // 渲染循环
  useGPUFrame(
    gpu,
    (encoder, target, deltaTime) => {
      onRenderRef.current?.(encoder, target, deltaTime);
    },
    autoStart
  );

  return (
    <div class={className} style={{ position: 'relative', width, height, ...style }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
        }}>
          Loading WebGPU...
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,0,0,0.2)',
          color: 'red',
        }}>
          {error.message}
        </div>
      )}
      
      {children}
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

export function GPUStats({ gpu, position = 'top-right', style }: GPUStatsProps) {
  const positionStyle: JSX.CSSProperties = {
    position: 'absolute',
    padding: '8px 12px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '12px',
    borderRadius: '4px',
    ...(position.includes('top') ? { top: 8 } : { bottom: 8 }),
    ...(position.includes('right') ? { right: 8 } : { left: 8 }),
    ...style,
  };

  return (
    <div style={positionStyle}>
      <div>GPU: {gpu ? 'Ready' : 'N/A'}</div>
      {gpu && <div>Format: {gpu.format}</div>}
    </div>
  );
}
