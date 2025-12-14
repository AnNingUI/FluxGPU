/// <reference types="@webgpu/types" />

import { createSignal } from 'solid-js';
import { GPUCanvas } from '@fluxgpu/solid';
import { GPUContext } from '@fluxgpu/engine';
import { Uniforms, generateComputeShader, generateVertexShader, generateFragmentShader } from './shaders';

const PARTICLE_COUNT = 15000;

export default function App() {
  const [attraction, setAttraction] = createSignal(0.5);
  const [damping, setDamping] = createSignal(0.98);
  const [fps, setFps] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  
  let mousePos = { x: 0, y: 0 };
  let resources: {
    computePass: ReturnType<GPUContext['createComputePass']>;
    renderPass: ReturnType<GPUContext['createRenderPass']>;
    uniformBuffer: ReturnType<GPUContext['createUniformBuffer']>;
    particleBuffer: GPUBuffer;
  } | null = null;
  
  let frameCount = 0;
  let lastFpsUpdate = performance.now();
  
  // 生成着色器
  const computeShader = generateComputeShader();
  const vertexShader = generateVertexShader();
  const fragmentShader = generateFragmentShader();
  
  // GPU 就绪回调
  function handleReady(gpu: GPUContext) {
    const computePass = gpu.createComputePass(computeShader, [256]);
    const renderPass = gpu.createRenderPass(vertexShader, fragmentShader);
    const uniformBuffer = gpu.createUniformBuffer(Uniforms);
    
    // 初始化粒子
    const particleData = new Float32Array(PARTICLE_COUNT * 8);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const offset = i * 8;
      particleData[offset + 0] = (Math.random() - 0.5) * 2;
      particleData[offset + 1] = (Math.random() - 0.5) * 2;
      particleData[offset + 2] = 0;
      particleData[offset + 3] = 0;
      particleData[offset + 4] = Math.random();
      particleData[offset + 5] = Math.random();
      particleData[offset + 6] = Math.random();
      particleData[offset + 7] = 1.0;
    }
    
    const particleBuffer = gpu.device.createBuffer({
      size: particleData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    gpu.device.queue.writeBuffer(particleBuffer, 0, particleData);
    
    computePass.bind(0, [
      { binding: 0, resource: particleBuffer },
      { binding: 1, resource: uniformBuffer.buffer },
    ]);
    
    renderPass.bind(0, [
      { binding: 0, resource: particleBuffer },
    ]);
    
    resources = { computePass, renderPass, uniformBuffer, particleBuffer };
    setReady(true);
  }
  
  // 渲染回调
  function handleRender(encoder: GPUCommandEncoder, target: GPUTextureView, deltaTime: number) {
    if (!resources) return;
    
    const { computePass, renderPass, uniformBuffer } = resources;
    
    uniformBuffer.update({
      deltaTime: Math.min(deltaTime / 1000, 0.016),
      time: performance.now() / 1000,
      mousePos: [mousePos.x, mousePos.y],
      attraction: attraction(),
      damping: damping(),
    });
    
    computePass.dispatch(encoder, PARTICLE_COUNT);
    renderPass.draw(encoder, target, PARTICLE_COUNT * 6, {
      clearColor: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
    });
    
    // FPS 计算
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate > 1000) {
      setFps(Math.round(frameCount / ((now - lastFpsUpdate) / 1000)));
      frameCount = 0;
      lastFpsUpdate = now;
    }
  }
  
  // 鼠标追踪
  function handleMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mousePos = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  }
  
  return (
    <div class="app">
      <header>
        <h1>🚀 FluxGPU SolidJS Demo</h1>
        <p>Using @fluxgpu/solid GPUCanvas component</p>
      </header>
      
      <main>
        <div onMouseMove={handleMouseMove}>
          <GPUCanvas
            width={800}
            height={600}
            onReady={handleReady}
            onRender={handleRender}
            autoStart={true}
          >
            <div class="overlay">
              <div>FPS: {fps()}</div>
              <div>Particles: {PARTICLE_COUNT}</div>
              <div>Status: {ready() ? 'Running' : 'Loading...'}</div>
            </div>
          </GPUCanvas>
        </div>
        
        <div class="controls">
          <label>
            Attraction: {attraction().toFixed(1)}
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={attraction()}
              onInput={(e) => setAttraction(parseFloat(e.currentTarget.value))}
            />
          </label>
          <label>
            Damping: {damping().toFixed(2)}
            <input
              type="range"
              min="0.9"
              max="1"
              step="0.01"
              value={damping()}
              onInput={(e) => setDamping(parseFloat(e.currentTarget.value))}
            />
          </label>
        </div>
      </main>
      
      <style>{`
        .app { min-height: 100vh; }
        header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 20px 40px;
          border-bottom: 1px solid #333;
        }
        header h1 { font-size: 24px; color: #fff; margin: 0; }
        header p { color: #888; margin: 5px 0 0; }
        main { display: flex; gap: 20px; padding: 20px; }
        .overlay {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(0,0,0,0.7);
          padding: 10px;
          border-radius: 4px;
          font-size: 14px;
          color: #4fc3f7;
        }
        .controls {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 20px;
          background: #111;
          border-radius: 8px;
          height: fit-content;
        }
        .controls label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: #ccc;
        }
        .controls input { width: 200px; }
      `}</style>
    </div>
  );
}
