import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAnimationLoop, nextFrame, delayFrames } from './animation-loop.js';

describe('Animation Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock requestAnimationFrame and cancelAnimationFrame
    let frameId = 0;
    globalThis.requestAnimationFrame = vi.fn((cb) => {
      frameId++;
      setTimeout(() => cb(performance.now()), 0);
      return frameId;
    }) as any;
    
    globalThis.cancelAnimationFrame = vi.fn() as any;
    
    // Mock performance.now
    globalThis.performance = {
      now: vi.fn(() => Date.now()),
    } as any;
  });

  describe('createAnimationLoop', () => {
    it('should create animation loop with start/stop methods', () => {
      const callback = vi.fn();
      const loop = createAnimationLoop(callback);
      
      expect(loop.start).toBeDefined();
      expect(loop.stop).toBeDefined();
      expect(loop.pause).toBeDefined();
      expect(loop.resume).toBeDefined();
      expect(loop.isRunning).toBeDefined();
      expect(loop.getFrameInfo).toBeDefined();
    });

    it('should call callback when loop is running', async () => {
      const callback = vi.fn();
      const loop = createAnimationLoop(callback);
      
      loop.start();
      
      // Wait for frame callback
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(callback).toHaveBeenCalled();
      expect(requestAnimationFrame).toHaveBeenCalled();
      
      loop.stop();
    });

    it('should provide frame info to callback', async () => {
      let receivedFrameInfo: any = null;
      const callback = vi.fn((frameInfo) => {
        receivedFrameInfo = frameInfo;
      });
      
      const loop = createAnimationLoop(callback);
      loop.start();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(receivedFrameInfo).toBeDefined();
      expect(receivedFrameInfo.time).toBeGreaterThanOrEqual(0);
      expect(receivedFrameInfo.deltaTime).toBeGreaterThanOrEqual(0);
      expect(receivedFrameInfo.frameCount).toBeGreaterThan(0);
      
      loop.stop();
    });

    it('should stop calling callback when stopped', async () => {
      const callback = vi.fn();
      const loop = createAnimationLoop(callback);
      
      loop.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const callCount = callback.mock.calls.length;
      
      loop.stop();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not have been called again after stop
      expect(callback.mock.calls.length).toBe(callCount);
    });

    it('should pause and resume correctly', async () => {
      const callback = vi.fn();
      const loop = createAnimationLoop(callback);
      
      loop.start();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      loop.pause();
      expect(loop.isRunning()).toBe(false);
      
      const callCountAfterPause = callback.mock.calls.length;
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not have been called while paused
      expect(callback.mock.calls.length).toBe(callCountAfterPause);
      
      loop.resume();
      expect(loop.isRunning()).toBe(true);
      
      loop.stop();
    });

    it('should return frame info', () => {
      const callback = vi.fn();
      const loop = createAnimationLoop(callback);
      
      const frameInfo = loop.getFrameInfo();
      
      expect(frameInfo).toBeDefined();
      expect(frameInfo.time).toBeDefined();
      expect(frameInfo.deltaTime).toBeDefined();
      expect(frameInfo.frameCount).toBeDefined();
      expect(frameInfo.fps).toBeDefined();
    });
  });

  describe('nextFrame', () => {
    it('should call callback on next frame', async () => {
      const callback = vi.fn();
      nextFrame(callback);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(callback).toHaveBeenCalled();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('delayFrames', () => {
    it('should call callback after specified frames', async () => {
      const callback = vi.fn();
      delayFrames(3, callback);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(callback).toHaveBeenCalled();
    });

    it('should allow cancellation', async () => {
      const callback = vi.fn();
      const cancel = delayFrames(10, callback);
      
      cancel();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
