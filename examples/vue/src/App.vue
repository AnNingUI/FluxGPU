<script setup lang="ts">
/**
 * FluxGPU Vue Demo - 使用新的六边形架构
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';
import type { ICommandEncoder, IBuffer, IComputePipeline, IRenderPipeline, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';
import { generateComputeShader, generateVertexShader, generateFragmentShader } from './shaders';

const PARTICLE_COUNT = 15000;

const canvasRef = ref<HTMLCanvasElement | null>(null);
const attraction = ref(0.5);
const damping = ref(0.98);
const fps = ref(0);
const isLoading = ref(true);
const error = ref<Error | null>(null);

let executor: AdapterExecutor | null = null;
let adapter: BrowserGPUAdapter | null = null;
let resources: {
  computePipeline: IComputePipeline;
  renderPipeline: IRenderPipeline;
  particleBuffer: IBuffer;
  uniformBuffer: IBuffer;
  computeBindGroup: IBindGroup;
  renderBindGroup: IBindGroup;
} | null = null;

const mousePos = { x: 0, y: 0 };
let frameCount = 0;
let lastFpsUpdate = performance.now();
let animationId = 0;

// 生成着色器
const computeShader = generateComputeShader();
const vertexShader = generateVertexShader();
const fragmentShader = generateFragmentShader();

async function initGPU() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  try {
    adapter = new BrowserGPUAdapter({ canvas });
    executor = new AdapterExecutor({ adapter });
    await executor.initialize();

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

    resources = {
      computePipeline,
      renderPipeline,
      particleBuffer,
      uniformBuffer,
      computeBindGroup,
      renderBindGroup,
    };

    isLoading.value = false;
    startRenderLoop();
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
    isLoading.value = false;
  }
}

function render() {
  if (!executor || !resources) return;

  const { computePipeline, renderPipeline, uniformBuffer, computeBindGroup, renderBindGroup } = resources;

  // 更新 uniforms
  const uniformData = new Float32Array([
    0.016,
    performance.now() / 1000,
    mousePos.x,
    mousePos.y,
    attraction.value,
    damping.value,
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
    const renderTarget = executor!.getCurrentTexture();
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
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate > 1000) {
    fps.value = Math.round(frameCount / ((now - lastFpsUpdate) / 1000));
    frameCount = 0;
    lastFpsUpdate = now;
  }

  animationId = requestAnimationFrame(render);
}

function startRenderLoop() {
  animationId = requestAnimationFrame(render);
}

function handleMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mousePos.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
}

onMounted(() => {
  if (canvasRef.value) {
    canvasRef.value.width = 800 * devicePixelRatio;
    canvasRef.value.height = 600 * devicePixelRatio;
    initGPU();
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  executor?.dispose();
});
</script>

<template>
  <div class="app">
    <header>
      <h1>🚀 FluxGPU Vue Demo</h1>
      <p>Using new hexagonal architecture with @fluxgpu/vue</p>
    </header>

    <main>
      <div @mousemove="handleMouseMove" style="position: relative">
        <canvas ref="canvasRef" :style="{ width: '800px', height: '600px', display: 'block' }" />
        <div class="overlay">
          <div>FPS: {{ fps }}</div>
          <div>Particles: {{ PARTICLE_COUNT }}</div>
          <div>Status: {{ isLoading ? 'Loading...' : error ? 'Error' : 'Running' }}</div>
        </div>
      </div>

      <div class="controls">
        <label>
          Attraction: {{ attraction.toFixed(1) }}
          <input type="range" min="0" max="2" step="0.1" v-model.number="attraction" />
        </label>
        <label>
          Damping: {{ damping.toFixed(2) }}
          <input type="range" min="0.9" max="1" step="0.01" v-model.number="damping" />
        </label>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}
header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px 40px;
  border-bottom: 1px solid #333;
}
header h1 {
  font-size: 24px;
  color: #fff;
  margin: 0;
}
header p {
  color: #888;
  margin: 5px 0 0;
}
main {
  display: flex;
  gap: 20px;
  padding: 20px;
}
.overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
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
.controls input {
  width: 200px;
}
</style>
