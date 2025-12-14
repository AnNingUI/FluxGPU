/**
 * FluxGPU Vanilla TypeScript Demo
 * 
 * 使用所有子包：
 * - @fluxgpu/contracts: 类型定义和错误处理
 * - @fluxgpu/core: 核心领域逻辑 (ShadowState)
 * - @fluxgpu/dsl: 着色器 DSL
 * - @fluxgpu/engine: WebGPU 执行器 + 高级 API
 * - @fluxgpu/protocol: 二进制通信协议
 */

/// <reference types="@webgpu/types" />

import type { CommandBuffer } from '@fluxgpu/contracts';
import { Opcode } from '@fluxgpu/contracts';
import { serializeCommand, deserializeCommand } from '@fluxgpu/protocol';
import {
  defineStruct,
  shader,
  f32, u32, vec2, vec3, array,
  lit, makeVec2, makeVec3, vec4FromVec2, vec4FromVec3,
  normalize, length, sin, cos, clamp,
} from '@fluxgpu/dsl';
import { GPUContext } from '@fluxgpu/engine';

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
      const force = ctx.let('force', vec2(f32),
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
      
      ctx.exec(particle.$('color').set(makeVec3(f32,
        lit(0.5, f32).add(sin(time.add(speed.mul(lit(10.0, f32)))).mul(lit(0.5, f32))),
        lit(0.5, f32).add(cos(time.mul(lit(0.7, f32)).add(speed.mul(lit(8.0, f32)))).mul(lit(0.5, f32))),
        lit(0.8, f32)
      )));
      
      ctx.exec(particles.$at(index).set(particle));
    })
    .build();
}

function generateVertexShader(): string {
  const builder = shader();
  const particles = builder.storage('particles', array(Particle), 0, 0, 'read');
  
  return builder
    .vertex(
      { varyings: { color: { location: 0, type: vec3(f32) } } },
      (ctx, { vertexIndex }) => {
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
      }
    )
    .build();
}

function generateFragmentShader(): string {
  const builder = shader();
  
  return builder
    .fragment(
      { inputs: { color: { location: 0, type: vec3(f32) } }, targets: 1 },
      (_ctx, _builtins, { color }) => ({
        colors: [{ location: 0, value: vec4FromVec3(color, 1.0) }],
      })
    )
    .build();
}

// Demo Application
class ParticleDemo {
  private gpu!: GPUContext;
  private computePass!: ReturnType<GPUContext['createComputePass']>;
  private renderPass!: ReturnType<GPUContext['createRenderPass']>;
  private particleBuffer!: GPUBuffer;
  private uniformBuffer!: ReturnType<GPUContext['createUniformBuffer']>;
  
  private particleCount = 15000;
  private mousePos = { x: 0, y: 0 };
  private running = false;
  private startTime = 0;
  private frameCount = 0;
  private lastFPSUpdate = 0;
  private attraction = 0.5;
  private damping = 0.98;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.gpu = await GPUContext.create({ canvas });
    
    const computeShader = generateComputeShader();
    const vertexShader = generateVertexShader();
    const fragmentShader = generateFragmentShader();
    
    document.getElementById('computeCode')!.textContent = computeShader;
    
    this.computePass = this.gpu.createComputePass(computeShader, [256]);
    this.renderPass = this.gpu.createRenderPass(vertexShader, fragmentShader);
    
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
    
    this.particleBuffer = this.gpu.device.createBuffer({
      size: particleData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.gpu.device.queue.writeBuffer(this.particleBuffer, 0, particleData);
    
    this.uniformBuffer = this.gpu.createUniformBuffer(Uniforms);
    
    this.computePass.bind(0, [
      { binding: 0, resource: this.particleBuffer },
      { binding: 1, resource: this.uniformBuffer.buffer },
    ]);
    
    this.renderPass.bind(0, [
      { binding: 0, resource: this.particleBuffer },
    ]);
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
    
    this.uniformBuffer.update({
      deltaTime,
      time: now / 1000,
      mousePos: [this.mousePos.x, this.mousePos.y],
      attraction: this.attraction,
      damping: this.damping,
    });
    
    this.gpu.frame((encoder, target) => {
      this.computePass.dispatch(encoder, this.particleCount);
      this.renderPass.draw(encoder, target, this.particleCount * 6, {
        clearColor: { r: 0.02, g: 0.02, b: 0.05, a: 1.0 },
      });
    });
    
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

// Protocol Demo
function demonstrateProtocol(): void {
  console.log('=== @fluxgpu/protocol Demo ===');
  
  const command: CommandBuffer = {
    id: 'cmd-001' as any,
    opcode: Opcode.CreateBuffer,
    payload: new Uint8Array([1, 2, 3, 4]),
    dependencies: [],
  };
  
  const serialized = serializeCommand(command);
  console.log('Serialized:', serialized.length, 'bytes');
  
  const deserialized = deserializeCommand(serialized);
  console.log('Deserialized:', deserialized);
}

// Main
async function main(): Promise<void> {
  const canvas = document.getElementById('gpuCanvas') as HTMLCanvasElement;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  
  demonstrateProtocol();
  
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
