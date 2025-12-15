/**
 * 粒子渲染器 - 实现 IWorkerRenderer 接口
 *
 * 在 Worker 中运行的粒子系统渲染器
 */

/// <reference types="@webgpu/types" />

import type { IWorkerRenderer } from '@fluxgpu/host-browser';
import { generateComputeShader, generateVertexShader, generateFragmentShader } from './shaders';

export interface ParticleRendererConfig {
  particleCount?: number;
}

/**
 * 粒子渲染器
 */
export class ParticleRenderer implements IWorkerRenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;

  private particleBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private renderPipeline: GPURenderPipeline | null = null;
  private computeBindGroup: GPUBindGroup | null = null;
  private renderBindGroup: GPUBindGroup | null = null;

  private particleCount: number;

  constructor(config: ParticleRendererConfig = {}) {
    this.particleCount = config.particleCount ?? 10000;
  }

  async initialize(device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat): Promise<void> {
    this.device = device;
    this.context = context;

    // 生成着色器
    const computeShaderCode = generateComputeShader();
    const vertexShaderCode = generateVertexShader();
    const fragmentShaderCode = generateFragmentShader();

    // 创建着色器模块
    const computeModule = device.createShaderModule({ code: computeShaderCode });
    const vertexModule = device.createShaderModule({ code: vertexShaderCode });
    const fragmentModule = device.createShaderModule({ code: fragmentShaderCode });

    // 创建计算管线
    this.computePipeline = await device.createComputePipelineAsync({
      layout: 'auto',
      compute: { module: computeModule, entryPoint: 'main' },
    });

    // 创建渲染管线
    this.renderPipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: { module: vertexModule, entryPoint: 'main' },
      fragment: {
        module: fragmentModule,
        entryPoint: 'main',
        targets: [{ format }],
      },
    });

    // 初始化粒子数据
    const particleData = new Float32Array(this.particleCount * 8);
    for (let i = 0; i < this.particleCount; i++) {
      const offset = i * 8;
      particleData[offset + 0] = (Math.random() - 0.5) * 2; // position.x
      particleData[offset + 1] = (Math.random() - 0.5) * 2; // position.y
      particleData[offset + 2] = 0; // velocity.x
      particleData[offset + 3] = 0; // velocity.y
      particleData[offset + 4] = Math.random(); // color.r
      particleData[offset + 5] = Math.random(); // color.g
      particleData[offset + 6] = Math.random(); // color.b
      particleData[offset + 7] = 1.0; // life
    }

    // 创建粒子 buffer
    this.particleBuffer = device.createBuffer({
      size: particleData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.particleBuffer, 0, particleData);

    // 创建 uniform buffer (deltaTime, time, mouseX, mouseY, attraction, damping)
    this.uniformBuffer = device.createBuffer({
      size: 6 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // 创建 bind groups
    this.computeBindGroup = device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.renderBindGroup = device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.particleBuffer } }],
    });

    console.log(`[ParticleRenderer] Initialized with ${this.particleCount} particles`);
  }

  renderFrame(uniforms?: ArrayBuffer): number {
    if (!this.computePipeline || !this.renderPipeline) {
      return 0;
    }

    const startTime = performance.now();

    // 更新 uniforms
    if (uniforms && this.uniformBuffer) {
      this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);
    }

    const encoder = this.device.createCommandEncoder();

    // Compute pass - 更新粒子位置
    if (this.computeBindGroup) {
      const computePass = encoder.beginComputePass();
      computePass.setPipeline(this.computePipeline);
      computePass.setBindGroup(0, this.computeBindGroup);
      computePass.dispatchWorkgroups(Math.ceil(this.particleCount / 256));
      computePass.end();
    }

    // Render pass - 渲染粒子
    const texture = this.context.getCurrentTexture();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: texture.createView(),
          clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    if (this.renderBindGroup) {
      renderPass.setPipeline(this.renderPipeline);
      renderPass.setBindGroup(0, this.renderBindGroup);
      renderPass.draw(this.particleCount * 6); // 每个粒子 6 个顶点（2 个三角形）
    }

    renderPass.end();
    this.device.queue.submit([encoder.finish()]);

    return performance.now() - startTime;
  }

  dispose(): void {
    this.particleBuffer?.destroy();
    this.uniformBuffer?.destroy();
    console.log('[ParticleRenderer] Disposed');
  }
}

/**
 * 创建粒子渲染器工厂
 */
export function createParticleRendererFactory(config: ParticleRendererConfig = {}) {
  return () => new ParticleRenderer(config);
}
