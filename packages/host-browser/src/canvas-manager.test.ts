import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createCanvas,
  attachCanvas,
  createAndAttachCanvas,
  getPreferredCanvasFormat,
} from './canvas-manager.js';

// Mock DOM APIs
const mockCanvas = {
  style: { width: '', height: '' },
  width: 0,
  height: 0,
  parentNode: null as any,
  getContext: vi.fn(),
};

const mockContainer = {
  appendChild: vi.fn(),
};

describe('Canvas Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.createElement using vi.stubGlobal
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockCanvas),
    });
    
    // Mock window
    vi.stubGlobal('window', {
      devicePixelRatio: 2,
    });
    
    // Mock navigator
    vi.stubGlobal('navigator', {
      gpu: {
        getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm'),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createCanvas', () => {
    it('should create a canvas with default dimensions', () => {
      const managed = createCanvas();
      
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(managed.canvas).toBeDefined();
      expect(managed.dispose).toBeDefined();
      expect(managed.resize).toBeDefined();
      expect(managed.getSize).toBeDefined();
    });

    it('should set canvas dimensions with device pixel ratio', () => {
      const managed = createCanvas({ width: 400, height: 300 });
      
      expect(mockCanvas.style.width).toBe('400px');
      expect(mockCanvas.style.height).toBe('300px');
      expect(mockCanvas.width).toBe(800); // 400 * 2 (devicePixelRatio)
      expect(mockCanvas.height).toBe(600); // 300 * 2
    });

    it('should resize canvas correctly', () => {
      const managed = createCanvas();
      managed.resize(1000, 800);
      
      expect(mockCanvas.style.width).toBe('1000px');
      expect(mockCanvas.style.height).toBe('800px');
      expect(mockCanvas.width).toBe(2000); // 1000 * 2
      expect(mockCanvas.height).toBe(1600); // 800 * 2
    });

    it('should return correct size', () => {
      mockCanvas.width = 1600;
      mockCanvas.height = 1200;
      
      const managed = createCanvas();
      const size = managed.getSize();
      
      expect(size.width).toBe(1600);
      expect(size.height).toBe(1200);
    });

    it('should dispose canvas and remove from DOM', () => {
      const mockParent = { removeChild: vi.fn() };
      mockCanvas.parentNode = mockParent;
      
      const managed = createCanvas();
      managed.dispose();
      
      expect(mockParent.removeChild).toHaveBeenCalledWith(mockCanvas);
    });
  });

  describe('attachCanvas', () => {
    it('should attach canvas to container', () => {
      const managed = createCanvas();
      attachCanvas(managed.canvas, mockContainer as any);
      
      expect(mockContainer.appendChild).toHaveBeenCalledWith(mockCanvas);
    });
  });

  describe('createAndAttachCanvas', () => {
    it('should create and attach canvas in one call', () => {
      const managed = createAndAttachCanvas(mockContainer as any, { width: 500, height: 400 });
      
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockContainer.appendChild).toHaveBeenCalledWith(mockCanvas);
      expect(mockCanvas.style.width).toBe('500px');
      expect(mockCanvas.style.height).toBe('400px');
    });
  });

  describe('getPreferredCanvasFormat', () => {
    it('should return preferred format from navigator.gpu', () => {
      const format = getPreferredCanvasFormat();
      expect(format).toBe('bgra8unorm');
    });

    it('should return default format when WebGPU not available', () => {
      vi.stubGlobal('navigator', {});
      const format = getPreferredCanvasFormat();
      expect(format).toBe('bgra8unorm');
    });
  });
});
