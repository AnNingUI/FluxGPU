/**
 * React Context for GPU
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { GPUContext } from '@flux/engine';

// ============================================================================
// Context
// ============================================================================

interface FluxContextValue {
  gpu: GPUContext | null;
  error: Error | null;
  isLoading: boolean;
}

const FluxContext = createContext<FluxContextValue>({
  gpu: null,
  error: null,
  isLoading: true,
});

// ============================================================================
// Provider
// ============================================================================

export interface FluxProviderProps {
  children: ReactNode;
  /** Canvas element or ref */
  canvas: HTMLCanvasElement | null;
  /** Power preference for GPU adapter */
  powerPreference?: 'low-power' | 'high-performance';
  /** Callback when GPU is ready */
  onReady?: (gpu: GPUContext) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export function FluxProvider({
  children,
  canvas,
  powerPreference,
  onReady,
  onError,
}: FluxProviderProps) {
  const [gpu, setGpu] = useState<GPUContext | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canvas) return;

    let mounted = true;

    GPUContext.create({ canvas, powerPreference })
      .then((ctx) => {
        if (mounted) {
          setGpu(ctx);
          setIsLoading(false);
          onReady?.(ctx);
        }
      })
      .catch((err) => {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          onError?.(error);
        }
      });

    return () => {
      mounted = false;
    };
  }, [canvas, powerPreference, onReady, onError]);

  return (
    <FluxContext.Provider value={{ gpu, error, isLoading }}>
      {children}
    </FluxContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useFluxContext(): FluxContextValue {
  return useContext(FluxContext);
}

export function useGPU(): GPUContext {
  const { gpu, error, isLoading } = useFluxContext();
  
  if (isLoading) {
    throw new Error('GPU is still loading. Use useFluxContext() to check loading state.');
  }
  
  if (error) {
    throw error;
  }
  
  if (!gpu) {
    throw new Error('GPU not available. Make sure FluxProvider is set up correctly.');
  }
  
  return gpu;
}
