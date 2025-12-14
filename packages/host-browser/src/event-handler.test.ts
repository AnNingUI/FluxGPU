import { describe, it, expect, vi } from 'vitest';
import {
  addEventListener,
  addEventListeners,
  getCanvasMousePosition,
  getNormalizedMousePosition,
  attachPointerHandlers,
  attachKeyboardHandlers,
  onResize,
} from './event-handler.js';

describe('Event Handler', () => {
  describe('addEventListener', () => {
    it('should attach event listener and return subscription', () => {
      const element = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      
      const callback = vi.fn();
      const subscription = addEventListener(element, 'click', callback);
      
      expect(element.addEventListener).toHaveBeenCalledWith('click', callback, undefined);
      expect(subscription.unsubscribe).toBeDefined();
    });

    it('should remove event listener on unsubscribe', () => {
      const element = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      
      const callback = vi.fn();
      const subscription = addEventListener(element, 'click', callback);
      subscription.unsubscribe();
      
      expect(element.removeEventListener).toHaveBeenCalledWith('click', callback, undefined);
    });
  });

  describe('addEventListeners', () => {
    it('should attach multiple event listeners', () => {
      const element = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const subscription = addEventListeners(element, [
        { type: 'click', callback: callback1 },
        { type: 'mousemove', callback: callback2 },
      ]);
      
      expect(element.addEventListener).toHaveBeenCalledTimes(2);
      expect(subscription.unsubscribe).toBeDefined();
    });

    it('should remove all listeners on unsubscribe', () => {
      const element = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      
      const subscription = addEventListeners(element, [
        { type: 'click', callback: vi.fn() },
        { type: 'mousemove', callback: vi.fn() },
      ]);
      
      subscription.unsubscribe();
      
      expect(element.removeEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCanvasMousePosition', () => {
    it('should calculate mouse position relative to canvas', () => {
      const canvas = {
        getBoundingClientRect: vi.fn(() => ({
          left: 100,
          top: 50,
          width: 800,
          height: 600,
        })),
      } as any;
      
      const event = {
        clientX: 250,
        clientY: 150,
      } as MouseEvent;
      
      const pos = getCanvasMousePosition(event, canvas);
      
      expect(pos.x).toBe(150); // 250 - 100
      expect(pos.y).toBe(100); // 150 - 50
    });
  });

  describe('getNormalizedMousePosition', () => {
    it('should return normalized position (0-1 range)', () => {
      const canvas = {
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })),
        clientWidth: 800,
        clientHeight: 600,
      } as any;
      
      const event = {
        clientX: 400,
        clientY: 300,
      } as MouseEvent;
      
      const pos = getNormalizedMousePosition(event, canvas);
      
      expect(pos.x).toBe(0.5); // 400 / 800
      expect(pos.y).toBe(0.5); // 300 / 600
    });
  });

  describe('attachPointerHandlers', () => {
    it('should attach pointer event handlers', () => {
      const element = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
      } as any;
      
      const handlers = {
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
      };
      
      const subscription = attachPointerHandlers(element, handlers);
      
      expect(element.addEventListener).toHaveBeenCalledTimes(3);
      expect(subscription.unsubscribe).toBeDefined();
    });
  });

  describe('attachKeyboardHandlers', () => {
    it('should attach keyboard event handlers', () => {
      const element = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      
      const handlers = {
        onKeyDown: vi.fn(),
        onKeyUp: vi.fn(),
      };
      
      const subscription = attachKeyboardHandlers(element, handlers);
      
      expect(element.addEventListener).toHaveBeenCalledTimes(2);
      expect(subscription.unsubscribe).toBeDefined();
    });
  });

  describe('onResize', () => {
    it('should attach resize handler with debouncing', () => {
      vi.stubGlobal('window', {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setTimeout: vi.fn((cb) => {
          cb();
          return 123;
        }),
        clearTimeout: vi.fn(),
        innerWidth: 1920,
        innerHeight: 1080,
      });
      
      const callback = vi.fn();
      const subscription = onResize(callback, 100);
      
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(subscription.unsubscribe).toBeDefined();
    });
  });
});
