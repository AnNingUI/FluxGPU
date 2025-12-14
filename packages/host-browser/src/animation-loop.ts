/**
 * Animation Loop - requestAnimationFrame integration
 * 
 * Responsibilities:
 * - Manage animation frame requests
 * - Provide frame timing information
 * - Handle loop lifecycle (start, stop, pause)
 * - Calculate delta time and FPS
 * 
 * Requirements: 6.1 - Browser-specific optimizations (requestAnimationFrame)
 */

export interface FrameInfo {
  time: number;
  deltaTime: number;
  frameCount: number;
  fps: number;
}

export type FrameCallback = (frameInfo: FrameInfo) => void;

export interface AnimationLoop {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isRunning: () => boolean;
  getFrameInfo: () => FrameInfo;
}

/**
 * Create an animation loop using requestAnimationFrame
 */
export function createAnimationLoop(callback: FrameCallback): AnimationLoop {
  let animationFrameId: number | null = null;
  let isRunning = false;
  let isPaused = false;
  let lastTime = 0;
  let frameCount = 0;
  let fps = 0;
  let fpsFrameCount = 0;
  let fpsLastTime = 0;
  
  const frameInfo: FrameInfo = {
    time: 0,
    deltaTime: 0,
    frameCount: 0,
    fps: 0,
  };
  
  const loop = (currentTime: number) => {
    if (!isRunning || isPaused) {
      return;
    }
    
    // Calculate delta time
    const deltaTime = lastTime === 0 ? 0 : currentTime - lastTime;
    lastTime = currentTime;
    frameCount++;
    
    // Calculate FPS (update every second)
    fpsFrameCount++;
    if (currentTime - fpsLastTime >= 1000) {
      fps = Math.round((fpsFrameCount * 1000) / (currentTime - fpsLastTime));
      fpsFrameCount = 0;
      fpsLastTime = currentTime;
    }
    
    // Update frame info
    frameInfo.time = currentTime;
    frameInfo.deltaTime = deltaTime;
    frameInfo.frameCount = frameCount;
    frameInfo.fps = fps;
    
    // Call user callback
    callback(frameInfo);
    
    // Request next frame
    animationFrameId = requestAnimationFrame(loop);
  };
  
  return {
    start: () => {
      if (isRunning) {
        return;
      }
      
      isRunning = true;
      isPaused = false;
      lastTime = 0;
      frameCount = 0;
      fpsFrameCount = 0;
      fpsLastTime = performance.now();
      
      animationFrameId = requestAnimationFrame(loop);
    },
    
    stop: () => {
      if (!isRunning) {
        return;
      }
      
      isRunning = false;
      isPaused = false;
      
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      lastTime = 0;
      frameCount = 0;
      fps = 0;
    },
    
    pause: () => {
      if (!isRunning || isPaused) {
        return;
      }
      
      isPaused = true;
      
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },
    
    resume: () => {
      if (!isRunning || !isPaused) {
        return;
      }
      
      isPaused = false;
      lastTime = 0; // Reset to avoid large delta on resume
      
      animationFrameId = requestAnimationFrame(loop);
    },
    
    isRunning: () => isRunning && !isPaused,
    
    getFrameInfo: () => ({ ...frameInfo }),
  };
}

/**
 * Run a callback once on the next animation frame
 */
export function nextFrame(callback: () => void): void {
  requestAnimationFrame(() => callback());
}

/**
 * Run a callback after a delay using animation frames
 */
export function delayFrames(frames: number, callback: () => void): () => void {
  let count = 0;
  let cancelled = false;
  
  const loop = () => {
    if (cancelled) {
      return;
    }
    
    count++;
    if (count >= frames) {
      callback();
    } else {
      requestAnimationFrame(loop);
    }
  };
  
  requestAnimationFrame(loop);
  
  return () => {
    cancelled = true;
  };
}
