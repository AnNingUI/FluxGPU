/**
 * React Context for GPU
 *
 * 基于 IGPUAdapter 的六边形架构
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { IGPUAdapter } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';

// ============================================================================
// Context
// ============================================================================

interface FluxContextValue {
  adapter: IGPUAdapter | null;
  executor: AdapterExecutor | null;
  error: Error | null;
  isLoading: boolean;
}

const FluxContext = createContext<FluxContextValue>({
  adapter: null,
  executor: null,
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
  onReady?: (executor: AdapterExecutor) => void;
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
  const [adapter, setAdapter] = useState<IGPUAdapter | null>(null);
  const [executor, setExecutor] = useState<AdapterExecutor | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canvas) return;

    let mounted = true;
    let currentExecutor: AdapterExecutor | null = null;

    const init = async () => {
      try {
        const browserAdapter = new BrowserGPUAdapter({ canvas, powerPreference });
        currentExecutor = new AdapterExecutor({ adapter: browserAdapter });
        await currentExecutor.initialize();

        if (mounted) {
          setAdapter(browserAdapter);
          setExecutor(currentExecutor);
          setIsLoading(false);
          onReady?.(currentExecutor);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          onError?.(error);
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
  }, [canvas, powerPreference, onReady, onError]);

  return (
    <FluxContext.Provider value={{ adapter, executor, error, isLoading }}>
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

export function useFluxExecutor(): AdapterExecutor {
  const { executor, error, isLoading } = useFluxContext();

  if (isLoading) {
    throw new Error('GPU is still loading. Use useFluxContext() to check loading state.');
  }

  if (error) {
    throw error;
  }

  if (!executor) {
    throw new Error('GPU not available. Make sure FluxProvider is set up correctly.');
  }

  return executor;
}
