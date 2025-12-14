/**
 * Canvas Manager - Utilities for managing HTML canvas elements
 * 
 * Responsibilities:
 * - Create and configure canvas elements
 * - Manage canvas lifecycle
 * - Handle canvas resizing
 * - Provide WebGPU context access
 * 
 * Requirements: 6.1 - Browser-specific DOM integration
 */

export interface CanvasConfig {
  width?: number;
  height?: number;
  devicePixelRatio?: number;
  alpha?: boolean;
  antialias?: boolean;
}

export interface ManagedCanvas {
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext | null;
  dispose: () => void;
  resize: (width: number, height: number) => void;
  getSize: () => { width: number; height: number };
}

/**
 * Create a managed canvas element
 */
export function createCanvas(config: CanvasConfig = {}): ManagedCanvas {
  const canvas = document.createElement('canvas');
  
  const devicePixelRatio = config.devicePixelRatio ?? window.devicePixelRatio ?? 1;
  const width = config.width ?? 800;
  const height = config.height ?? 600;
  
  // Set display size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // Set actual size in memory (accounting for DPI)
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  
  // Get WebGPU context
  let context: GPUCanvasContext | null = null;
  if ('gpu' in navigator) {
    context = canvas.getContext('webgpu') as GPUCanvasContext | null;
  }
  
  const managedCanvas: ManagedCanvas = {
    canvas,
    context,
    
    dispose: () => {
      // Remove canvas from DOM if attached
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      // Clear context reference
      context = null;
    },
    
    resize: (newWidth: number, newHeight: number) => {
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      canvas.width = newWidth * devicePixelRatio;
      canvas.height = newHeight * devicePixelRatio;
    },
    
    getSize: () => ({
      width: canvas.width,
      height: canvas.height,
    }),
  };
  
  return managedCanvas;
}

/**
 * Attach a canvas to a DOM element
 */
export function attachCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  container.appendChild(canvas);
}

/**
 * Create and attach a canvas to a container
 */
export function createAndAttachCanvas(
  container: HTMLElement,
  config: CanvasConfig = {}
): ManagedCanvas {
  const managedCanvas = createCanvas(config);
  attachCanvas(managedCanvas.canvas, container);
  return managedCanvas;
}

/**
 * Configure WebGPU canvas context
 */
export async function configureCanvasContext(
  context: GPUCanvasContext,
  device: GPUDevice,
  format: GPUTextureFormat = 'bgra8unorm'
): Promise<void> {
  context.configure({
    device,
    format,
    alphaMode: 'opaque',
  });
}

/**
 * Get the preferred canvas format for the current device
 */
export function getPreferredCanvasFormat(): GPUTextureFormat {
  if ('gpu' in navigator) {
    return navigator.gpu.getPreferredCanvasFormat();
  }
  return 'bgra8unorm';
}
