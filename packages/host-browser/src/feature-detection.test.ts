import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isFeatureSupported,
  getFeatureSupport,
  areRequiredFeaturesSupported,
  getWebGPUCapabilities,
  getMissingFeaturesMessage,
  isSecureContext,
  getBrowserInfo,
} from './feature-detection.js';

describe('Feature Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isFeatureSupported', () => {
    it('should detect WebGPU support', () => {
      vi.stubGlobal('navigator', { gpu: {} });
      expect(isFeatureSupported('webgpu')).toBe(true);
      
      vi.stubGlobal('navigator', {});
      expect(isFeatureSupported('webgpu')).toBe(false);
    });

    it('should detect SharedArrayBuffer support', () => {
      vi.stubGlobal('SharedArrayBuffer', function() {});
      expect(isFeatureSupported('sharedArrayBuffer')).toBe(true);
      
      vi.stubGlobal('SharedArrayBuffer', undefined);
      expect(isFeatureSupported('sharedArrayBuffer')).toBe(false);
    });

    it('should detect Worker support', () => {
      vi.stubGlobal('Worker', function() {});
      expect(isFeatureSupported('workers')).toBe(true);
      
      vi.stubGlobal('Worker', undefined);
      expect(isFeatureSupported('workers')).toBe(false);
    });

    it('should detect OffscreenCanvas support', () => {
      vi.stubGlobal('OffscreenCanvas', function() {});
      expect(isFeatureSupported('offscreenCanvas')).toBe(true);
      
      vi.stubGlobal('OffscreenCanvas', undefined);
      expect(isFeatureSupported('offscreenCanvas')).toBe(false);
    });

    it('should detect Atomics support', () => {
      vi.stubGlobal('Atomics', {});
      expect(isFeatureSupported('atomics')).toBe(true);
      
      vi.stubGlobal('Atomics', undefined);
      expect(isFeatureSupported('atomics')).toBe(false);
    });
  });

  describe('getFeatureSupport', () => {
    it('should return all feature support information', () => {
      vi.stubGlobal('navigator', { gpu: {} });
      vi.stubGlobal('SharedArrayBuffer', function() {});
      vi.stubGlobal('Worker', function() {});
      vi.stubGlobal('OffscreenCanvas', function() {});
      vi.stubGlobal('Atomics', {});
      
      const support = getFeatureSupport();
      
      expect(support.webgpu).toBe(true);
      expect(support.sharedArrayBuffer).toBe(true);
      expect(support.workers).toBe(true);
      expect(support.offscreenCanvas).toBe(true);
      expect(support.atomics).toBe(true);
    });
  });

  describe('areRequiredFeaturesSupported', () => {
    it('should return true when all required features are supported', () => {
      vi.stubGlobal('navigator', { gpu: {} });
      vi.stubGlobal('SharedArrayBuffer', function() {});
      vi.stubGlobal('Worker', function() {});
      
      expect(areRequiredFeaturesSupported()).toBe(true);
    });

    it('should return false when any required feature is missing', () => {
      vi.stubGlobal('navigator', {});
      vi.stubGlobal('SharedArrayBuffer', function() {});
      vi.stubGlobal('Worker', function() {});
      
      expect(areRequiredFeaturesSupported()).toBe(false);
    });
  });

  describe('getWebGPUCapabilities', () => {
    it('should return capabilities when WebGPU is supported', async () => {
      const mockAdapter = {
        limits: { maxBufferSize: 1024 },
        features: new Set(['texture-compression-bc']),
      };
      
      vi.stubGlobal('navigator', {
        gpu: {
          requestAdapter: vi.fn(async () => mockAdapter),
        },
      });
      
      const capabilities = await getWebGPUCapabilities();
      
      expect(capabilities.supported).toBe(true);
      expect(capabilities.adapter).toBe(mockAdapter);
      expect(capabilities.limits).toBeDefined();
      expect(capabilities.features).toBeDefined();
    });

    it('should return unsupported when WebGPU is not available', async () => {
      vi.stubGlobal('navigator', {});
      
      const capabilities = await getWebGPUCapabilities();
      
      expect(capabilities.supported).toBe(false);
      expect(capabilities.adapter).toBe(null);
    });

    it('should handle adapter request failure', async () => {
      vi.stubGlobal('navigator', {
        gpu: {
          requestAdapter: vi.fn(async () => null),
        },
      });
      
      const capabilities = await getWebGPUCapabilities();
      
      expect(capabilities.supported).toBe(false);
      expect(capabilities.adapter).toBe(null);
    });
  });

  describe('getMissingFeaturesMessage', () => {
    it('should return success message when all features are supported', () => {
      vi.stubGlobal('navigator', { gpu: {} });
      vi.stubGlobal('SharedArrayBuffer', function() {});
      vi.stubGlobal('Worker', function() {});
      
      const message = getMissingFeaturesMessage();
      
      expect(message).toContain('All required features are supported');
    });

    it('should list missing features', () => {
      vi.stubGlobal('navigator', {});
      vi.stubGlobal('SharedArrayBuffer', undefined);
      vi.stubGlobal('Worker', function() {});
      
      const message = getMissingFeaturesMessage();
      
      expect(message).toContain('WebGPU');
      expect(message).toContain('SharedArrayBuffer');
      expect(message).not.toContain('Web Workers');
    });

    it('should provide helpful guidance for WebGPU', () => {
      vi.stubGlobal('navigator', {});
      vi.stubGlobal('SharedArrayBuffer', function() {});
      vi.stubGlobal('Worker', function() {});
      
      const message = getMissingFeaturesMessage();
      
      expect(message).toContain('modern browser');
      expect(message).toContain('Chrome');
    });

    it('should provide helpful guidance for SharedArrayBuffer', () => {
      vi.stubGlobal('navigator', { gpu: {} });
      vi.stubGlobal('SharedArrayBuffer', undefined);
      vi.stubGlobal('Worker', function() {});
      
      const message = getMissingFeaturesMessage();
      
      expect(message).toContain('cross-origin isolation');
      expect(message).toContain('Cross-Origin-Opener-Policy');
    });
  });

  describe('isSecureContext', () => {
    it('should return true in secure context', () => {
      vi.stubGlobal('window', { isSecureContext: true });
      expect(isSecureContext()).toBe(true);
    });

    it('should return false in non-secure context', () => {
      vi.stubGlobal('window', { isSecureContext: false });
      expect(isSecureContext()).toBe(false);
    });
  });

  describe('getBrowserInfo', () => {
    it('should return browser information', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0',
        vendor: 'Google Inc.',
        platform: 'Win32',
      });
      
      const info = getBrowserInfo();
      
      expect(info.userAgent).toBe('Mozilla/5.0');
      expect(info.vendor).toBe('Google Inc.');
      expect(info.platform).toBe('Win32');
    });

    it('should handle missing navigator', () => {
      vi.stubGlobal('navigator', undefined);
      
      const info = getBrowserInfo();
      
      expect(info.userAgent).toBe('unknown');
      expect(info.vendor).toBe('unknown');
      expect(info.platform).toBe('unknown');
    });
  });
});
