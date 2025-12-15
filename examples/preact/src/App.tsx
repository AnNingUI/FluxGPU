/**
 * FluxGPU Preact Demo - 使用新的六边形架构
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'preact/hooks';
import type { ICommandEncoder, IBuffer, IComputePipeline, IRenderPipeline, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';
import { generateComputeShader, generateVertexShader, generateFragmentShader } from './shaders';

const PARTICLE_COUNT = 15000;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attraction, setAttraction] = useState(0.5);
  const [damping, setDamping] = useState(0.98);
  const [fps, setFps] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const executorRef = useRef<AdapterExecutor | null>(null);
  const adapterRef = useRef<BrowserGPUAdapter | null>(null);
  const resourcesRef = useRef<{
    computePipeline: IComputePipeline;
    renderPipeline: IRenderPipeline;
    particleBuffer: IBuffer;
    uniformBuffer: IBuffer;
    computeBindGroup: IBindGroup;
    renderBindGroup: IBindGroup;
  } | null>(null);

  // 使用 ref 存储可变参数，避免 render 函数依赖变化
  const paramsRef = useRef({ attraction, damping });
  paramsRef.current = { attraction, damping };

  const mousePosRef = useRef({ x: 0, y: 0 });
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const animationIdRef = useRef(0);

  // 使用 useMemo 缓存着色器，避免每次渲染重新生成
  const computeShader = useMemo(() => generateComputeShader(), []);
  const vertexShader = useMemo(() => generateVertexShader(), []);
  const fragmentShader = useMemo(() => generateFragmentShader(), []);

  // render 函数不依赖 attraction/damping，而是从 ref 读取
  const render = useCallback(() => {
    const executor = executorRef.current;
    const resources = resourcesRef.current;
    if (!executor || !resources) return;

    const { computePipeline, renderPipeline, uniformBuffer, computeBindGroup, renderBindGroup } = resources;

    // 从 ref 读取最新参数
    const { attraction: attr, damping: damp } = paramsRef.current;

    // 更新 uniforms
    const uniformData = new Float32Array([
      0.016,
      performance.now() / 1000,
      mousePosRef.current.x,
      mousePosRef.current.y,
      attr,
      damp,
    ]);
    executor.writeBuffer(uniformBuffer, uniformData);

    executor.frame((encoder: ICommandEncoder) => {
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
    });

    // FPS 计算
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsUpdateRef.current > 1000) {
      setFps(Math.round(frameCountRef.current / ((now - lastFpsUpdateRef.current) / 1000)));
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }

    animationIdRef.current = requestAnimationFrame(render);
  }, []); // 空依赖数组！

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 800 * devicePixelRatio;
    canvas.height = 600 * devicePixelRatio;

    const initGPU = async () => {
      try {
        const adapter = new BrowserGPUAdapter({ canvas });
        const executor = new AdapterExecutor({ adapter });
        await executor.initialize();

        adapterRef.current = adapter;
        executorRef.current = executor;

        // 创建着色器模块
        const computeModule = executor.createShaderModule(computeShader);
        const vertexModule = executor.createShaderModule(vertexShader);
        const fragmentModule = executor.createShaderModule(fragmentShader);

        // 创建管线
        const computePipeline = await executor.createComputePipeline({
          shader: computeModule,
          entryPoint: 'main',
        });

        const renderPipeline = await executor.createRenderPipeline({
          vertex: { shader: vertexModule, entryPoint: 'main' },
          fragment: {
            shader: fragmentModule,
            entryPoint: 'main',
            targets: [{ format: executor.getPreferredFormat() }],
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
        const particleBuffer = executor.createBuffer({
          size: particleData.byteLength,
          usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
        });
        executor.writeBuffer(particleBuffer, particleData);

        const uniformBuffer = executor.createBuffer({
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
        };

        setIsLoading(false);
        animationIdRef.current = requestAnimationFrame(render);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };

    initGPU();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      executorRef.current?.dispose();
    };
  }, [computeShader, vertexShader, fragmentShader, render]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mousePosRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  }, []);

  return (
    <div class="app">
      <header>
        <h1>🚀 FluxGPU Preact Demo</h1>
        <p>Using new hexagonal architecture with @fluxgpu/preact</p>
      </header>

      <main>
        <div onMouseMove={handleMouseMove} style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ width: 800, height: 600, display: 'block' }} />
          <div class="overlay">
            <div>FPS: {fps}</div>
            <div>Particles: {PARTICLE_COUNT}</div>
            <div>Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Running'}</div>
          </div>
        </div>

        <div class="controls">
          <label>
            Attraction: {attraction.toFixed(1)}
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={attraction}
              onInput={(e) => setAttraction(parseFloat((e.target as HTMLInputElement).value))}
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
              onInput={(e) => setDamping(parseFloat((e.target as HTMLInputElement).value))}
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
