# FluxGPU TODO

## 1. Lit 框架绑定

创建 `@fluxgpu/lit` 包，为 Lit Web Components 提供 FluxGPU 绑定。

### 任务清单

- [ ] 创建 `packages/lit` 目录结构
- [ ] 实现 `GPUCanvasElement` 自定义元素
- [ ] 实现 `useGPU` reactive controller
- [ ] 实现 `useGPUFrame` reactive controller
- [ ] 实现 `useAnimationFrame` reactive controller
- [ ] 实现 `useComputePass` / `useRenderPass` controllers
- [ ] 实现 `useUniformBuffer` controller
- [ ] 实现 `useMouse` controller
- [ ] 添加 TypeScript 类型定义
- [ ] 编写 README 文档
- [ ] 创建 Lit 示例 (`examples/lit`)

### API 设计草案

```typescript
// 自定义元素
@customElement('gpu-canvas')
class GPUCanvasElement extends LitElement {
  @property({ type: Number }) width = 800;
  @property({ type: Number }) height = 600;
  @property({ type: Boolean }) autoStart = true;
  
  // Events: gpu-ready, gpu-error, gpu-render
}

// Reactive Controllers
class MyElement extends LitElement {
  private gpu = new GPUController(this);
  private frame = new GPUFrameController(this, this.gpu, this.render);
  private mouse = new MouseController(this, this.canvasRef);
}
```

---

## 2. 结构化组件实现

详见 [structured-components.md](./structured-components.md)

### Phase 1: 基础抽象组件

- [ ] `ComputeEffect` - 声明式计算着色器
- [ ] `GPUBuffer` - 声明式 Buffer 管理

### Phase 2: 粒子系统

- [ ] `ParticleSystem` - 完整粒子系统组件

### Phase 3: SDF 渲染

- [ ] `SDFRenderer` - SDF 渲染器
- [ ] SDF 基础图元 (Sphere, Box, Torus, etc.)
- [ ] SDF 操作 (Union, Subtraction, Intersection, etc.)

### Phase 4: 多 Pass 支持

- [ ] `RenderLayer` - 渲染层组件
- [ ] `PostProcess` - 后处理效果容器

### Phase 5: 其他组件

- [ ] `Uniforms` - 统一 Uniform 管理
- [ ] `GPUInstances` - GPU 实例化渲染
- [ ] `GPUTexture` - 声明式纹理管理
- [ ] `FluidSimulation` - 流体模拟
- [ ] `MeshRenderer` - 网格渲染

---

## 3. 架构重构 (六边形架构) ✅ 已完成

详见 [../ARCHITECTURE.md](../ARCHITECTURE.md)

### 已完成

- [x] 在 `contracts` 中定义 `IGPUAdapter` 等 Port 接口 (`ports.ts`)
- [x] 重构 `core` 只支持 `IGPUAdapter`（移除向后兼容）
- [x] 在 `engine` 中添加 `AdapterExecutor`（`adapter-executor.ts`）
- [x] 在 `host-browser` 中添加 `BrowserGPUAdapter`（`gpu-adapter.ts`）
- [x] 更新框架绑定（react, vue, solid, preact）使用新架构
- [x] 更新所有示例使用新架构
- [x] 移除旧的 GPUContext API

---

## 4. Worker Mode WebGPU ✅ 已完成

真正的 Worker 模式 WebGPU 实现，在独立线程中运行 GPU 计算和渲染。

### 已完成

- [x] `WorkerHost` - 主线程端 Worker 管理器
- [x] `WorkerExecutor` - Worker 端 WebGPU 执行器
- [x] `createWorkerHandler` - Worker 入口点辅助函数
- [x] 使用 `OffscreenCanvas` 在 Worker 中渲染
- [x] 使用 `@fluxgpu/protocol` 进行命令序列化
- [x] 更新 `vanilla-worker` 示例使用真正的 Worker 模式
- [x] Vite Worker 打包配置

### 架构

```
┌─────────────────────────────┐
│      Main Thread            │
│  ┌───────────────────────┐  │
│  │   WorkerHost          │  │
│  │  - AnimationLoop      │  │
│  │  - EventHandler       │  │
│  └───────────┬───────────┘  │
└──────────────┼──────────────┘
               │ postMessage (protocol)
┌──────────────┼──────────────┐
│      GPU Worker Thread      │
│  ┌───────────┴───────────┐  │
│  │   WorkerExecutor      │  │
│  │  - OffscreenCanvas    │  │
│  │  - WebGPU Device      │  │
│  │  - Compute + Render   │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

---

## 5. 其他待办

- [ ] 完善单元测试覆盖率
- [ ] 添加更多 DSL 内置函数
- [ ] 性能基准测试
- [ ] 文档网站
- [ ] 更多示例项目

---

## 进度追踪

| 任务 | 状态 | 优先级 |
|------|------|--------|
| 六边形架构核心 | ✅ 已完成 | 高 |
| 框架绑定更新 | ✅ 已完成 | 高 |
| Vanilla 示例更新 | ✅ 已完成 | 高 |
| React/Vue/Solid/Preact 示例 | ✅ 已完成 | 高 |
| Worker Mode WebGPU | ✅ 已完成 | 高 |
| Lit 绑定 | 待开始 | 高 |
| ComputeEffect | 待开始 | 高 |
| GPUBuffer | 待开始 | 高 |
| ParticleSystem | 待开始 | 中 |
| SDFRenderer | 待开始 | 中 |
| RenderLayer | 待开始 | 中 |
| PostProcess | 待开始 | 低 |
