/**
 * FluxGPU Worker Mode Demo
 *
 * 真正的 Worker 模式 WebGPU：
 * - 使用 OffscreenCanvas 在 Worker 中渲染
 * - 使用 @fluxgpu/protocol 进行命令序列化
 * - 主线程只负责 UI 和发送命令
 */

import {
  WorkerHost,
  getFeatureSupport,
  getWebGPUCapabilities,
  logFeatureSupport,
  createAnimationLoop,
  type FrameInfo,
} from '@fluxgpu/host-browser';

// Vite Worker 导入 - 使用 ?worker 后缀
import GPUWorker from './gpu.worker?worker';

// ============================================================================
// Logging Utility
// ============================================================================

type LogLevel = 'info' | 'success' | 'error' | 'warn';

function log(message: string, level: LogLevel = 'info'): void {
  const container = document.getElementById('logContainer')!;
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;

  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[FluxGPU] ${message}`);
}

function updateStatus(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const status = document.getElementById('status')!;
  status.className = `status-box ${type}`;
  status.textContent = message;
}

// ============================================================================
// Feature Detection Display
// ============================================================================

function displayFeatures(): void {
  const support = getFeatureSupport();
  const container = document.getElementById('featureList')!;

  const features = [
    { name: 'WebGPU', key: 'webgpu' as const },
    { name: 'SharedArrayBuffer', key: 'sharedArrayBuffer' as const },
    { name: 'Web Workers', key: 'workers' as const },
    { name: 'OffscreenCanvas', key: 'offscreenCanvas' as const },
    { name: 'Atomics', key: 'atomics' as const },
    { name: 'WebGL2 (fallback)', key: 'webgl2' as const },
  ];

  container.innerHTML = features
    .map(
      (f) => `
    <div class="feature">
      <span>${f.name}</span>
      <span class="status ${support[f.key] ? 'yes' : 'no'}">${support[f.key] ? '✓ Yes' : '✗ No'}</span>
    </div>
  `
    )
    .join('');
}

// ============================================================================
// Worker Mode Demo
// ============================================================================

class WorkerModeDemo {
  private workerHost!: WorkerHost;
  private animationLoop!: ReturnType<typeof createAnimationLoop>;

  private mousePos = { x: 0, y: 0 };
  private attraction = 0.5;
  private damping = 0.98;

  private fps = 0;
  private frameCount = 0;
  private lastFpsUpdate = performance.now();
  private gpuFrameTime = 0;

  async initialize(): Promise<void> {
    log('Starting Worker Mode initialization...', 'info');

    // Step 1: Feature detection
    log('Checking browser features...', 'info');
    displayFeatures();
    logFeatureSupport();

    const support = getFeatureSupport();

    if (!support.webgpu) {
      throw new Error('WebGPU is not supported in this browser');
    }

    if (!support.offscreenCanvas) {
      throw new Error('OffscreenCanvas is not supported - required for Worker mode');
    }

    if (!support.workers) {
      throw new Error('Web Workers are not supported');
    }

    log('All required features supported!', 'success');

    // Step 2: Get WebGPU capabilities
    log('Checking WebGPU capabilities...', 'info');
    const capabilities = await getWebGPUCapabilities();
    if (!capabilities.supported) {
      throw new Error('WebGPU adapter not available');
    }
    log(`WebGPU adapter found with ${capabilities.features?.size ?? 0} features`, 'success');

    // Step 3: Configure canvas
    log('Configuring canvas...', 'info');
    const canvas = document.getElementById('gpuCanvas') as HTMLCanvasElement;
    const dpr = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    log(`Canvas configured: ${canvas.width}x${canvas.height}`, 'info');

    // Step 4: Create Worker Host
    log('Creating Worker Host...', 'info');
    log('⚠️ Canvas will be transferred to Worker (OffscreenCanvas)', 'warn');

    // 使用 Vite 的 Worker 导入
    this.workerHost = new WorkerHost({
      canvas,
      worker: new GPUWorker(),
      powerPreference: 'high-performance',
    });

    // Step 5: Initialize Worker
    log('Initializing Worker...', 'info');
    await this.workerHost.initialize();
    log(`Worker initialized! Preferred format: ${this.workerHost.getPreferredFormat()}`, 'success');

    // Step 6: Setup frame complete callback
    this.workerHost.setOnFrameComplete((frameTime: number) => {
      this.gpuFrameTime = frameTime;
    });

    // Step 7: Setup events
    this.setupEvents(canvas);

    // Step 8: Create animation loop
    log('Creating animation loop...', 'info');
    this.animationLoop = createAnimationLoop((frameInfo) => {
      this.render(frameInfo);
    });

    // Update UI
    document.getElementById('mode')!.textContent = 'Worker Mode (OffscreenCanvas)';
    document.getElementById('workerCount')!.textContent = '1 (GPU Worker)';

    updateStatus('Worker Mode initialized! GPU runs in separate thread.', 'success');
    log('Initialization complete! 🚀', 'success');
  }

  private setupEvents(canvas: HTMLCanvasElement): void {
    // 注意：canvas 已经被转移到 Worker，但我们仍然可以监听事件
    // 因为 DOM 元素仍在主线程
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    });

    // 控制面板事件
    const attractionInput = document.getElementById('attraction') as HTMLInputElement;
    const dampingInput = document.getElementById('damping') as HTMLInputElement;

    attractionInput?.addEventListener('input', () => {
      this.attraction = parseFloat(attractionInput.value);
      document.getElementById('attractionVal')!.textContent = this.attraction.toFixed(1);
    });

    dampingInput?.addEventListener('input', () => {
      this.damping = parseFloat(dampingInput.value);
      document.getElementById('dampingVal')!.textContent = this.damping.toFixed(2);
    });
  }

  private render(frameInfo: FrameInfo): void {
    // 创建 uniforms 数据
    const uniforms = new Float32Array([
      Math.min(frameInfo.deltaTime / 1000, 0.016), // deltaTime
      frameInfo.time / 1000, // time
      this.mousePos.x, // mouseX
      this.mousePos.y, // mouseY
      this.attraction, // attraction
      this.damping, // damping
    ]);

    // 发送帧请求到 Worker
    this.workerHost.requestFrame(uniforms.buffer.slice(0));

    // 更新 FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate > 1000) {
      this.fps = Math.round(this.frameCount / ((now - this.lastFpsUpdate) / 1000));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      // 更新 UI
      document.getElementById('fps')!.textContent = this.fps.toString();
      document.getElementById('frameCount')!.textContent = frameInfo.frameCount.toString();
      document.getElementById('gpuTime')!.textContent = `${this.gpuFrameTime.toFixed(2)}ms`;
    }
  }

  start(): void {
    log('Starting animation loop...', 'info');
    this.animationLoop.start();
  }

  stop(): void {
    this.animationLoop.stop();
    this.workerHost.dispose();
    log('Animation loop stopped', 'info');
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  log('FluxGPU Worker Mode Demo starting...', 'info');
  log('This demo runs WebGPU in a separate Worker thread!', 'info');

  const demo = new WorkerModeDemo();

  try {
    await demo.initialize();
    demo.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Initialization failed: ${message}`, 'error');
    updateStatus(`Error: ${message}`, 'error');
  }
}

main();
