/**
 * React Components for FluxGPU
 */

/// <reference types="@webgpu/types" />

import { useRef, useEffect, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { GPUContext } from '@flux/engine';
import { FluxProvider, useFluxContext } from './context.js';
import { useGPUContext, useGPUFrame } from './hooks.js';

// ============================================================================
// GPUCanvas - 自包含的 GPU Canvas 组件
// ============================================================================

export interface GPUCanvasProps {
  /** Canvas 宽度 */
  width?: number;
  /** Canvas 高度 */
  height?: number;
  /** 使用设备像素比 */
  devicePixelRatio?: boolean;
  /** 渲染回调 */
  onRender?: (encoder: GPUCommandEncoder, target: GPUTextureView, deltaTime: number) => void;
  /** GPU 就绪回调 */
  onReady?: (gpu: GPUContext) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 自动开始渲染 */
  autoStart?: boolean;
  /** 额外的 className */
  className?: string;
  /** 额外的 style */
  style?: React.CSSProperties;
  /** 子元素（覆盖层） */
  children?: ReactNode;
}

export interface GPUCanvasRef {
  canvas: HTMLCanvasElement | null;
  gpu: GPUContext | null;
  start: () => void;
  stop: () => void;
}

export const GPUCanvas = forwardRef<GPUCanvasRef, GPUCanvasProps>(function GPUCanvas(
  {
    width = 800,
    height = 600,
    devicePixelRatio: useDPR = true,
    onRender,
    onReady,
    onError,
    autoStart = true,
    className,
    style,
    children,
  },
  ref
) {
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

  // 暴露 ref
  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    gpu,
    start: () => {},
    stop: () => {},
  }), [gpu]);

  return (
    <div className={className} style={{ position: 'relative', width, height, ...style }}>
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
});

// ============================================================================
// FluxCanvas - 带 Context 的 Canvas
// ============================================================================

export interface FluxCanvasProps extends Omit<GPUCanvasProps, 'onReady' | 'onError'> {
  /** 子组件可以使用 useGPU hook */
  children?: ReactNode;
}

export function FluxCanvas({ children, ...props }: FluxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <FluxProvider canvas={canvasRef.current}>
      <GPUCanvas ref={canvasRef as any} {...props}>
        {children}
      </GPUCanvas>
    </FluxProvider>
  );
}

// ============================================================================
// GPUStats - 性能统计组件
// ============================================================================

export interface GPUStatsProps {
  /** 显示位置 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export function GPUStats({ position = 'top-right', style }: GPUStatsProps) {
  const { gpu, isLoading } = useFluxContext();
  
  const positionStyle: React.CSSProperties = {
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

  if (isLoading) {
    return <div style={positionStyle}>Loading...</div>;
  }

  if (!gpu) {
    return <div style={positionStyle}>No GPU</div>;
  }

  return (
    <div style={positionStyle}>
      <div>GPU: Ready</div>
      <div>Format: {gpu.format}</div>
    </div>
  );
}
