/**
 * FluxGPU React Demo - 使用新的六边形架构
 */

import { useState, useRef, useMemo, useCallback } from 'react';
import type { ICommandEncoder, IBuffer, IComputePipeline, IRenderPipeline, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage } from '@fluxgpu/contracts';
import { AdapterExecutor, BrowserGPUAdapter } from '@fluxgpu/react';
import { useGPU, useGPUFrame } from '@fluxgpu/react';
import { generateComputeShader, generateVertexShader, generateFragmentShader } from './shaders';

const PARTICLE_COUNT = 15000;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attraction, setAttraction] = useState(0.5);
  const [damping, setDamping] = useState(0.98);
  const [fps, setFps] = useState(0);

  const { executor, isLoading, error } = useGPU(canvasRef);

  // 资源引用
  const resourcesRef = useRef<{
    computePipeline: IComputePipeline;
    renderPipeline: IRenderPipeline;
    particleBuffer: IBuffer;
    uniformBuffer: IBuffer;
    computeBindGroup: IBindGroup;
    renderBindGroup: IBindGroup;
    adapter: BrowserGPUAdapter;
  } | null>(null);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const initializedRef = useRef(false);

  // 生成着色器
  const computeShader = useMemo(() => generateComputeShader(), []);
  const vertexShader = useMemo(() => generateVertexShader(), []);
  const fragmentShader = useMemo(() => generateFragmentShader(), []);

  // 初始化资源
  const initResources = useCallback(
    async (exec: AdapterExecutor) => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const adapter = exec.getAdapter() as BrowserGPUAdapter;

      // 创建着色器模块
      const computeModule = exec.createShaderModule(computeShader);
      const vertexModule = exec.createShaderModule(vertexShader);
      const fragmentModule = exec.createShaderModule(fragmentShader);

      // 创建管线
      const computePipeline = await exec.createComputePipeline({
        shader: computeModule,
        entryPoint: 'main',
      });

      const renderPipeline = await exec.createRenderPipeline({
        vertex: { shader: vertexModule, entryPoint: 'main' },
        fragment: {
          shader: fragmentModule,
          entryPoint: 'main',
          targets: [{ format: exec.getPreferredFormat() }],
        },
      });

      // 初始化粒子数据
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

      // 创建 buffers
      const particleBuffer = exec.createBuffer({
        size: particleData.byteLength,
        usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
      });
      exec.writeBuffer(particleBuffer, particleData);

      const uniformBuffer = exec.createBuffer({
        size: 6 * 4,
        usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
      });

      // 创建 bind groups
      const computeBindGroup = adapter.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: particleBuffer } },
          { binding: 1, resource: { buffer: uniformBuffer } },
        ],
      });

      const renderBindGroup = adapter.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: particleBuffer } }],
      });

      resourcesRef.current = {
        computePipeline,
        renderPipeline,
        particleBuffer,
        uniformBuffer,
        computeBindGroup,
        renderBindGroup,
        adapter,
      };
    },
    [computeShader, vertexShader, fragmentShader]
  );

  // 当 executor 准备好时初始化资源
  if (executor && !resourcesRef.current) {
    initResources(executor);
  }

  // 渲染循环
  useGPUFrame(executor, (encoder: ICommandEncoder, deltaTime: number) => {
    const resources = resourcesRef.current;
    if (!resources || !executor) return;

    const { computePipeline, renderPipeline, uniformBuffer, computeBindGroup, renderBindGroup } = resources;

    // 更新 uniforms
    const uniformData = new Float32Array([
      Math.min(deltaTime / 1000, 0.016),
      performance.now() / 1000,
      mousePosRef.current.x,
      mousePosRef.current.y,
      attraction,
      damping,
    ]);
    executor.writeBuffer(uniformBuffer, uniformData);

    // Compute pass
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
    computePass.end();

    // Render pass
    const renderTarget = executor.getCurrentTexture();
    if (renderTarget) {
      const renderPass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: renderTarget.createView(),
            clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });
      renderPass.setPipeline(renderPipeline);
      renderPass.setBindGroup(0, renderBindGroup);
      renderPass.draw(PARTICLE_COUNT * 6);
      renderPass.end();
    }

    // FPS 计算
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsUpdateRef.current > 1000) {
      setFps(Math.round(frameCountRef.current / ((now - lastFpsUpdateRef.current) / 1000)));
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  });

  // 鼠标追踪
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mousePosRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  }, []);

  return (
    <div className="app">
      <header>
        <h1>🚀 FluxGPU React Demo</h1>
        <p>Using new hexagonal architecture with @fluxgpu/react</p>
      </header>

      <main>
        <div onMouseMove={handleMouseMove} style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={800 * devicePixelRatio}
            height={600 * devicePixelRatio}
            style={{ width: 800, height: 600, display: 'block' }}
          />
          <div className="overlay">
            <div>FPS: {fps}</div>
            <div>Particles: {PARTICLE_COUNT}</div>
            <div>Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Running'}</div>
          </div>
        </div>

        <div className="controls">
          <label>
            Attraction: {attraction.toFixed(1)}
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={attraction}
              onChange={(e) => setAttraction(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Damping: {damping.toFixed(2)}
            <input
              type="range"
              min="0.9"
              max="1"
              step="0.01"
              value={damping}
              onChange={(e) => setDamping(parseFloat(e.target.value))}
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
