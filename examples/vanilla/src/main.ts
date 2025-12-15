/**
 * FluxGPU Vanilla TypeScript Demo
 *
 * 使用新的六边形架构：
 * - @fluxgpu/contracts: 类型定义和接口
 * - @fluxgpu/core: 核心领域逻辑
 * - @fluxgpu/dsl: 着色器 DSL
 * - @fluxgpu/engine: AdapterExecutor
 * - @fluxgpu/host-browser: BrowserGPUAdapter
 */

import type { ICommandEncoder, IBuffer, IComputePipeline, IRenderPipeline, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';
import {
  defineStruct,
  shader,
  f32,
  u32,
  vec2,
  vec3,
  array,
  lit,
  makeVec2,
  makeVec3,
  vec4FromVec2,
  vec4FromVec3,
  normalize,
  length,
  sin,
  cos,
  clamp,
} from '@fluxgpu/dsl';

// 类型定义 (使用 DSL)
const Particle = defineStruct('Particle', {
  position: vec2(f32),
  velocity: vec2(f32),
  color: vec3(f32),
  life: f32,
});

const Uniforms = defineStruct('Uniforms', {
  deltaTime: f32,
  time: f32,
  mousePos: vec2(f32),
  attraction: f32,
  damping: f32,
});

// 着色器生成
function generateComputeShader(): string {
  const builder = shader();
  const particles = builder.storage('particles', array(Particle), 0, 0, 'read_write');
  const uniforms = builder.uniform('uniforms', Uniforms, 0, 1);

  return builder
    .compute([256], (ctx, { globalInvocationId }) => {
      const index = ctx.let('index', u32, globalInvocationId.x);
      ctx.if(index.ge(particles.len()), () => ctx.return());

      const particle = ctx.var('particle', Particle, particles.$at(index));
      const mousePos = uniforms.$('mousePos');
      const position = particle.$('position');

      const toMouse = ctx.let('toMouse', vec2(f32), mousePos.sub(position));
      const distance = ctx.let('distance', f32, length(toMouse));
      const direction = ctx.let('direction', vec2(f32), normalize(toMouse));

      const attraction = uniforms.$('attraction');
      const force = ctx.let(
        'force',
        vec2(f32),
        direction.mul(attraction).mul(lit(1.0, f32).div(distance.add(lit(0.1, f32))))
      );

      const deltaTime = uniforms.$('deltaTime');
      ctx.exec(particle.$('velocity').addEq(force.mul(deltaTime)));
      ctx.exec(particle.$('velocity').mulEq(uniforms.$('damping')));
      ctx.exec(particle.$('position').addEq(particle.$('velocity').mul(deltaTime)));

      const posX = particle.$('position').x;
      const posY = particle.$('position').y;
      const minBound = lit(-1.0, f32);
      const maxBound = lit(1.0, f32);
      const bounce = lit(-0.8, f32);

      ctx.if(posX.lt(minBound).or(posX.gt(maxBound)), () => {
        ctx.exec(particle.$('velocity').x.mulEq(bounce));
        ctx.exec(particle.$('position').x.set(clamp(posX, minBound, maxBound)));
      });

      ctx.if(posY.lt(minBound).or(posY.gt(maxBound)), () => {
        ctx.exec(particle.$('velocity').y.mulEq(bounce));
        ctx.exec(particle.$('position').y.set(clamp(posY, minBound, maxBound)));
      });

      const speed = ctx.let('speed', f32, length(particle.$('velocity')));
      const time = uniforms.$('time');

      ctx.exec(
        particle.$('color').set(
          makeVec3(
            f32,
            lit(0.5, f32).add(sin(time.add(speed.mul(lit(10.0, f32)))).mul(lit(0.5, f32))),
            lit(0.5, f32).add(cos(time.mul(lit(0.7, f32)).add(speed.mul(lit(8.0, f32)))).mul(lit(0.5, f32))),
            lit(0.8, f32)
          )
        )
      );

      ctx.exec(particles.$at(index).set(particle));
    })
    .build();
}

function generateVertexShader(): string {
  const builder = shader();
  const particles = builder.storage('particles', array(Particle), 0, 0, 'read');

  return builder
    .vertex({ varyings: { color: { location: 0, type: vec3(f32) } } }, (ctx, { vertexIndex }) => {
      const particleIndex = ctx.let('particleIndex', u32, vertexIndex.div(lit(6, u32)));
      const vertexInQuad = ctx.let('vertexInQuad', u32, vertexIndex.mod(lit(6, u32)));
      const particle = ctx.let('particle', Particle, particles.$at(particleIndex));

      const quadPos = ctx.var('quadPos', vec2(f32));
      ctx.switch(vertexInQuad, [
        { case: 0, body: () => ctx.exec(quadPos.set(makeVec2(f32, -1.0, -1.0))) },
        { case: 1, body: () => ctx.exec(quadPos.set(makeVec2(f32, 1.0, -1.0))) },
        { case: 2, body: () => ctx.exec(quadPos.set(makeVec2(f32, 1.0, 1.0))) },
        { case: 3, body: () => ctx.exec(quadPos.set(makeVec2(f32, -1.0, -1.0))) },
        { case: 4, body: () => ctx.exec(quadPos.set(makeVec2(f32, 1.0, 1.0))) },
        { case: 'default', body: () => ctx.exec(quadPos.set(makeVec2(f32, -1.0, 1.0))) },
      ]);

      const size = ctx.let('size', f32, lit(0.008, f32));
      const finalPos = ctx.let('finalPos', vec2(f32), particle.$('position').add(quadPos.mul(size)));

      return {
        position: vec4FromVec2(finalPos, 0.0, 1.0),
        varyings: { color: { location: 0, value: particle.$('color') } },
      };
    })
    .build();
}

function generateFragmentShader(): string {
  const builder = shader();

  return builder
    .fragment({ inputs: { color: { location: 0, type: vec3(f32) } }, targets: 1 }, (_ctx, _builtins, { color }) => ({
      colors: [{ location: 0, value: vec4FromVec3(color, 1.0) }],
    }))
    .build();
}

// Demo Application
class ParticleDemo {
  private executor!: AdapterExecutor;
  private adapter!: BrowserGPUAdapter;
  private computePipeline!: IComputePipeline;
  private renderPipeline!: IRenderPipeline;
  private particleBuffer!: IBuffer;
  private uniformBuffer!: IBuffer;
  private computeBindGroup!: IBindGroup;
  private renderBindGroup!: IBindGroup;

  private particleCount = 15000;
  private mousePos = { x: 0, y: 0 };
  private running = false;
  private startTime = 0;
  private frameCount = 0;
  private lastFPSUpdate = 0;
  private attraction = 0.5;
  private damping = 0.98;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // 创建适配器和执行器
    this.adapter = new BrowserGPUAdapter({ canvas });
    this.executor = new AdapterExecutor({ adapter: this.adapter });
    await this.executor.initialize();

    // 生成着色器
    const computeShader = generateComputeShader();
    const vertexShader = generateVertexShader();
    const fragmentShader = generateFragmentShader();

    document.getElementById('computeCode')!.textContent = computeShader;

    // 创建着色器模块
    const computeModule = this.executor.createShaderModule(computeShader);
    const vertexModule = this.executor.createShaderModule(vertexShader);
    const fragmentModule = this.executor.createShaderModule(fragmentShader);

    // 创建管线
    this.computePipeline = await this.executor.createComputePipeline({
      shader: computeModule,
      entryPoint: 'main',
    });

    this.renderPipeline = await this.executor.createRenderPipeline({
      vertex: { shader: vertexModule, entryPoint: 'main' },
      fragment: {
        shader: fragmentModule,
        entryPoint: 'main',
        targets: [{ format: this.executor.getPreferredFormat() }],
      },
    });

    await this.initializeParticles();
    this.setupEvents(canvas);

    document.getElementById('particleCount')!.textContent = this.particleCount.toString();
    this.updateStatus('success', 'Initialized successfully!');
  }

  private async initializeParticles(): Promise<void> {
    const particleData = new Float32Array(this.particleCount * 8);
    for (let i = 0; i < this.particleCount; i++) {
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

    // 创建粒子 buffer
    this.particleBuffer = this.executor.createBuffer({
      size: particleData.byteLength,
      usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
    });
    this.executor.writeBuffer(this.particleBuffer, particleData);

    // 创建 uniform buffer (6 floats: deltaTime, time, mouseX, mouseY, attraction, damping)
    this.uniformBuffer = this.executor.createBuffer({
      size: 6 * 4,
      usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });

    // 创建 bind groups
    this.computeBindGroup = this.adapter.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.renderBindGroup = this.adapter.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.particleBuffer } }],
    });
  }

  private setupEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    });

    const attractionInput = document.getElementById('attraction') as HTMLInputElement;
    const dampingInput = document.getElementById('damping') as HTMLInputElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    attractionInput?.addEventListener('input', () => {
      this.attraction = parseFloat(attractionInput.value);
      document.getElementById('attractionVal')!.textContent = this.attraction.toFixed(1);
    });

    dampingInput?.addEventListener('input', () => {
      this.damping = parseFloat(dampingInput.value);
      document.getElementById('dampingVal')!.textContent = this.damping.toFixed(2);
    });

    resetBtn?.addEventListener('click', () => this.initializeParticles());
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.lastFPSUpdate = this.startTime;
    this.frameCount = 0;
    this.animate();
  }

  private animate = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.startTime) / 1000, 0.016);
    this.startTime = now;

    // 更新 uniforms
    const uniformData = new Float32Array([
      deltaTime,
      now / 1000,
      this.mousePos.x,
      this.mousePos.y,
      this.attraction,
      this.damping,
    ]);
    this.executor.writeBuffer(this.uniformBuffer, uniformData);

    // 渲染帧
    this.executor.frame((encoder: ICommandEncoder) => {
      // Compute pass
      const computePass = encoder.beginComputePass();
      computePass.setPipeline(this.computePipeline);
      computePass.setBindGroup(0, this.computeBindGroup);
      computePass.dispatchWorkgroups(Math.ceil(this.particleCount / 256));
      computePass.end();

      // Render pass
      const renderTarget = this.executor.getCurrentTexture();
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
        renderPass.setPipeline(this.renderPipeline);
        renderPass.setBindGroup(0, this.renderBindGroup);
        renderPass.draw(this.particleCount * 6);
        renderPass.end();
      }
    });

    // FPS 计算
    this.frameCount++;
    if (now - this.lastFPSUpdate > 1000) {
      const fps = Math.round(this.frameCount / ((now - this.lastFPSUpdate) / 1000));
      document.getElementById('fps')!.textContent = fps.toString();
      document.getElementById('gpuTime')!.textContent = `${(1000 / fps).toFixed(1)}ms`;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }

    requestAnimationFrame(this.animate);
  };

  private updateStatus(type: 'success' | 'error', message: string): void {
    const status = document.getElementById('status')!;
    status.className = `status ${type}`;
    status.textContent = message;
  }
}

// Main
async function main(): Promise<void> {
  const canvas = document.getElementById('gpuCanvas') as HTMLCanvasElement;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const demo = new ParticleDemo();

  try {
    await demo.initialize(canvas);
    demo.start();
  } catch (error) {
    console.error('Failed to initialize:', error);
    const status = document.getElementById('status')!;
    status.className = 'status error';
    status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

main();
