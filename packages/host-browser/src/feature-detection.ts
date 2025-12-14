/**
 * Feature Detection - Browser capability detection
 * 
 * Responsibilities:
 * - Detect WebGPU support
 * - Check for required browser features
 * - Provide detailed capability information
 * - Generate user-friendly error messages
 * 
 * Requirements: 6.1 - Feature detection for WebGPU support
 */

export interface FeatureSupport {
  webgpu: boolean;
  sharedArrayBuffer: boolean;
  workers: boolean;
  offscreenCanvas: boolean;
  atomics: boolean;
  webgl2: boolean;
}

export interface WebGPUCapabilities {
  supported: boolean;
  adapter: GPUAdapter | null;
  limits?: GPUSupportedLimits;
  features?: GPUSupportedFeatures;
}

/**
 * Check if a specific feature is supported
 */
export function isFeatureSupported(feature: keyof FeatureSupport): boolean {
  switch (feature) {
    case 'webgpu':
      return typeof navigator !== 'undefined' && 'gpu' in navigator;
    
    case 'sharedArrayBuffer':
      return typeof SharedArrayBuffer !== 'undefined';
    
    case 'workers':
      return typeof Worker !== 'undefined';
    
    case 'offscreenCanvas':
      return typeof OffscreenCanvas !== 'undefined';
    
    case 'atomics':
      return typeof Atomics !== 'undefined';
    
    case 'webgl2':
      if (typeof document === 'undefined') {
        return false;
      }
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    
    default:
      return false;
  }
}

/**
 * Get all feature support information
 */
export function getFeatureSupport(): FeatureSupport {
  return {
    webgpu: isFeatureSupported('webgpu'),
    sharedArrayBuffer: isFeatureSupported('sharedArrayBuffer'),
    workers: isFeatureSupported('workers'),
    offscreenCanvas: isFeatureSupported('offscreenCanvas'),
    atomics: isFeatureSupported('atomics'),
    webgl2: isFeatureSupported('webgl2'),
  };
}

/**
 * Check if all required features are supported
 */
export function areRequiredFeaturesSupported(): boolean {
  const support = getFeatureSupport();
  return support.webgpu && support.sharedArrayBuffer && support.workers;
}

/**
 * Get detailed WebGPU capabilities
 */
export async function getWebGPUCapabilities(): Promise<WebGPUCapabilities> {
  if (!isFeatureSupported('webgpu')) {
    return {
      supported: false,
      adapter: null,
    };
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    
    if (!adapter) {
      return {
        supported: false,
        adapter: null,
      };
    }
    
    return {
      supported: true,
      adapter,
      limits: adapter.limits,
      features: adapter.features,
    };
  } catch (error) {
    return {
      supported: false,
      adapter: null,
    };
  }
}

/**
 * Generate a user-friendly error message for missing features
 */
export function getMissingFeaturesMessage(): string {
  const support = getFeatureSupport();
  const missing: string[] = [];
  
  if (!support.webgpu) {
    missing.push('WebGPU');
  }
  if (!support.sharedArrayBuffer) {
    missing.push('SharedArrayBuffer');
  }
  if (!support.workers) {
    missing.push('Web Workers');
  }
  
  if (missing.length === 0) {
    return 'All required features are supported';
  }
  
  const missingList = missing.join(', ');
  let message = `The following required features are not supported: ${missingList}.\n\n`;
  
  if (!support.webgpu) {
    message += 'WebGPU is not available in this browser. ';
    message += 'Please use a modern browser with WebGPU support (Chrome 113+, Edge 113+, or Safari 18+).\n';
  }
  
  if (!support.sharedArrayBuffer) {
    message += 'SharedArrayBuffer is not available. ';
    message += 'This may be due to missing cross-origin isolation headers. ';
    message += 'Ensure your server sends "Cross-Origin-Opener-Policy: same-origin" and ';
    message += '"Cross-Origin-Embedder-Policy: require-corp" headers.\n';
  }
  
  if (!support.workers) {
    message += 'Web Workers are not available in this environment.\n';
  }
  
  return message.trim();
}

/**
 * Check if the browser is in a secure context (required for some features)
 */
export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

/**
 * Get browser information
 */
export function getBrowserInfo(): {
  userAgent: string;
  vendor: string;
  platform: string;
} {
  if (typeof navigator === 'undefined') {
    return {
      userAgent: 'unknown',
      vendor: 'unknown',
      platform: 'unknown',
    };
  }
  
  return {
    userAgent: navigator.userAgent,
    vendor: navigator.vendor,
    platform: navigator.platform,
  };
}

/**
 * Log feature support information to console
 */
export function logFeatureSupport(): void {
  const support = getFeatureSupport();
  const browser = getBrowserInfo();
  
  console.group('FluxGPU Feature Support');
  console.log('Browser:', browser.userAgent);
  console.log('Platform:', browser.platform);
  console.log('Secure Context:', isSecureContext());
  console.log('');
  console.log('Feature Support:');
  console.log('  WebGPU:', support.webgpu ? '✓' : '✗');
  console.log('  SharedArrayBuffer:', support.sharedArrayBuffer ? '✓' : '✗');
  console.log('  Web Workers:', support.workers ? '✓' : '✗');
  console.log('  OffscreenCanvas:', support.offscreenCanvas ? '✓' : '✗');
  console.log('  Atomics:', support.atomics ? '✓' : '✗');
  console.log('  WebGL2:', support.webgl2 ? '✓' : '✗');
  console.groupEnd();
  
  if (!areRequiredFeaturesSupported()) {
    console.warn(getMissingFeaturesMessage());
  }
}
