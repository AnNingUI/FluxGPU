# FluxGPU Structured Components TODO

## 概述

本文档记录 FluxGPU 计划实现的高级组件，分为抽象组件和结构化组件两类。

---

## 抽象组件 (Abstract Components)

通用的、与具体效果无关的基础组件，用于简化 GPU 编程模式。

### 🔴 高优先级

#### 1. ComputeEffect
声明式计算着色器组件，简化 compute pass 的使用。

```tsx
<ComputeEffect
  shader={myComputeShader}
  uniforms={{ time, mousePos, deltaTime }}
  buffers={{ particles: particleBuffer }}
  dispatch={[Math.ceil(particleCount / 256), 1, 1]}
  enabled={isRunning}
/>
```

**功能**:
- [ ] 自动管理 compute pipeline
- [ ] 声明式 uniform 绑定
- [ ] 声明式 buffer 绑定
- [ ] 条件执行 (enabled)
- [ ] 多 pass 支持

---

#### 2. GPUBuffer
声明式 GPU Buffer 管理组件。

```tsx
<GPUBuffer
  name="particles"
  struct={ParticleStruct}
  count={10000}
  usage="storage"
  initialData={generateParticles}
  onCreated={(buffer) => console.log('Buffer ready')}
/>
```

**功能**:
- [ ] 自动创建和销毁
- [ ] 类型安全的初始化数据
- [ ] 支持 storage / uniform / vertex 用途
- [ ] 动态调整大小
- [ ] 数据读回 (readback)

---

#### 3. RenderLayer
渲染层组件，支持多 pass 渲染和混合模式。

```tsx
<GPUCanvas>
  <RenderLayer order={0} blend="additive" clearColor="#000">
    <ParticleRenderer buffer={particles} />
  </RenderLayer>
  <RenderLayer order={1} blend="normal">
    <UIOverlay />
  </RenderLayer>
</GPUCanvas>
```

**功能**:
- [ ] 渲染顺序控制
- [ ] 混合模式 (additive, multiply, normal, etc.)
- [ ] 独立 clear color
- [ ] Render target 支持
- [ ] 深度/模板测试配置

---

### 🟡 中优先级

#### 4. Uniforms
统一的 Uniform 管理组件。

```tsx
<Uniforms struct={UniformsStruct} values={{ time, mousePos, resolution }}>
  {(uniformBuffer) => (
    <MyRenderer uniforms={uniformBuffer} />
  )}
</Uniforms>
```

**功能**:
- [ ] 类型安全的 uniform 更新
- [ ] 自动脏检测和批量更新
- [ ] 支持嵌套结构体
- [ ] 数组 uniform 支持

---

#### 5. GPUInstances
GPU 实例化渲染组件。

```tsx
<GPUInstances 
  count={1000} 
  geometry={quadGeometry}
  instanceData={instanceBuffer}
>
  <InstanceMaterial shader={instanceShader} />
</GPUInstances>
```

**功能**:
- [ ] 自动实例化渲染
- [ ] 动态实例数量
- [ ] 实例数据 buffer 管理
- [ ] 视锥剔除 (可选)

---

#### 6. GPUTexture
声明式纹理管理组件。

```tsx
<GPUTexture
  name="diffuse"
  src="/textures/diffuse.png"
  format="rgba8unorm"
  sampler={{ filter: 'linear', wrap: 'repeat' }}
  onLoad={(texture) => console.log('Loaded')}
/>
```

**功能**:
- [ ] 异步加载
- [ ] 格式转换
- [ ] Sampler 配置
- [ ] Mipmap 生成
- [ ] 支持 Canvas/Video 作为源

---

### 🟢 低优先级

#### 7. PostProcess
后处理效果容器组件。

```tsx
<GPUCanvas>
  <Scene />
  <PostProcess>
    <Bloom intensity={0.5} threshold={0.8} />
    <ChromaticAberration offset={0.002} />
    <Vignette strength={0.3} />
    <ToneMapping mode="aces" />
  </PostProcess>
</GPUCanvas>
```

**功能**:
- [ ] 效果链管理
- [ ] 中间 render target 自动管理
- [ ] 效果开关
- [ ] 自定义效果支持

---

#### 8. GPUQuery
GPU 查询组件（性能分析）。

```tsx
<GPUQuery type="timestamp" onResult={(ms) => setGpuTime(ms)}>
  <ExpensiveComputation />
</GPUQuery>
```

**功能**:
- [ ] Timestamp 查询
- [ ] Occlusion 查询
- [ ] Pipeline statistics

---

## 结构化组件 (Structured Components)

针对特定效果或用例的高级组件，封装完整的渲染逻辑。

### 🔴 高优先级

#### 1. ParticleSystem
完整的粒子系统组件。

```tsx
<ParticleSystem
  count={10000}
  emitter={{
    type: 'point',
    position: [0, 0],
    rate: 100,
    burst: { count: 500, interval: 2 }
  }}
  lifetime={{ min: 1, max: 3 }}
  velocity={{ min: [-1, -1], max: [1, 1] }}
  forces={[
    gravity(0, -9.8),
    wind(1, 0),
    attract(mousePos, 0.5),
    turbulence(0.1)
  ]}
  size={{ start: 0.02, end: 0.001 }}
  color={{ 
    start: [1, 0.5, 0, 1], 
    end: [1, 0, 0, 0] 
  }}
  blendMode="additive"
/>
```

**功能**:
- [ ] 多种发射器类型 (point, line, circle, box, mesh)
- [ ] 力场系统 (gravity, wind, attract, repel, turbulence, vortex)
- [ ] 生命周期管理
- [ ] 颜色/大小渐变
- [ ] 碰撞检测 (可选)
- [ ] 子发射器
- [ ] 纹理动画

---

#### 2. SDFRenderer
Signed Distance Field 渲染组件。

```tsx
<SDFRenderer
  resolution={[800, 600]}
  camera={{ position: [0, 0, 5], target: [0, 0, 0] }}
  maxSteps={100}
  maxDistance={100}
  epsilon={0.001}
>
  <SDFScene>
    <SDFSphere position={[0, 0, 0]} radius={1} material={redMaterial} />
    <SDFBox position={[2, 0, 0]} size={[1, 1, 1]} material={blueMaterial} />
    <SDFUnion>
      <SDFTorus position={[-2, 0, 0]} radius={1} tube={0.3} />
      <SDFCylinder position={[-2, 0, 0]} radius={0.2} height={2} />
    </SDFUnion>
    <SDFSubtraction>
      <SDFBox size={[1, 1, 1]} />
      <SDFSphere radius={1.2} />
    </SDFSubtraction>
  </SDFScene>
</SDFRenderer>
```

**SDF 基础图元**:
- [ ] Sphere
- [ ] Box
- [ ] Torus
- [ ] Cylinder
- [ ] Cone
- [ ] Plane
- [ ] Capsule

**SDF 操作**:
- [ ] Union (并集)
- [ ] Subtraction (差集)
- [ ] Intersection (交集)
- [ ] SmoothUnion (平滑并集)
- [ ] SmoothSubtraction (平滑差集)
- [ ] Twist (扭曲)
- [ ] Bend (弯曲)
- [ ] Repeat (重复)

**渲染功能**:
- [ ] Ray marching
- [ ] 软阴影
- [ ] AO (环境光遮蔽)
- [ ] 材质系统
- [ ] 法线计算

---

### 🟡 中优先级

#### 3. FluidSimulation
流体模拟组件。

```tsx
<FluidSimulation
  resolution={[256, 256]}
  viscosity={0.1}
  diffusion={0.0001}
  dissipation={0.99}
>
  <FluidEmitter position={mousePos} radius={10} density={1} velocity={mouseDelta} />
  <FluidObstacle shape={circleObstacle} />
</FluidSimulation>
```

**功能**:
- [ ] Navier-Stokes 求解器
- [ ] 密度/速度场
- [ ] 障碍物
- [ ] 边界条件
- [ ] 可视化模式

---

#### 4. MeshRenderer
网格渲染组件。

```tsx
<MeshRenderer
  geometry={cubeGeometry}
  material={{
    shader: pbrShader,
    uniforms: { albedo, metallic, roughness }
  }}
  transform={{ position: [0, 0, 0], rotation: [0, time, 0], scale: 1 }}
/>
```

**功能**:
- [ ] 几何体加载 (OBJ, GLTF)
- [ ] 材质系统
- [ ] 变换矩阵
- [ ] 骨骼动画 (可选)

---

### 🟢 低优先级

#### 5. VolumeRenderer
体积渲染组件。

```tsx
<VolumeRenderer
  data={volumeData}
  transferFunction={colorMap}
  stepSize={0.01}
  opacity={0.5}
/>
```

---

#### 6. Terrain
地形渲染组件。

```tsx
<Terrain
  heightmap="/terrain/height.png"
  size={[1000, 100, 1000]}
  segments={256}
  material={terrainMaterial}
  lod={true}
/>
```

---

#### 7. Skybox
天空盒组件。

```tsx
<Skybox
  type="cubemap"
  textures={[px, nx, py, ny, pz, nz]}
/>
// 或
<Skybox
  type="procedural"
  sunDirection={[0.5, 0.8, 0.2]}
  turbidity={10}
/>
```

---

## 待补充

- [ ] 更多 SDF 图元和操作
- [ ] 物理模拟组件
- [ ] 音频可视化组件
- [ ] 图像处理组件
- [ ] ...

---

## 实现顺序建议

1. **Phase 1**: ComputeEffect, GPUBuffer (基础抽象)
2. **Phase 2**: ParticleSystem (展示框架能力)
3. **Phase 3**: SDFRenderer (高级渲染)
4. **Phase 4**: RenderLayer, PostProcess (多 pass 支持)
5. **Phase 5**: 其他结构化组件

---

## 设计原则

1. **声明式优先**: 组件应该是声明式的，隐藏命令式细节
2. **类型安全**: 充分利用 TypeScript 类型系统
3. **可组合**: 组件应该可以自由组合
4. **性能优先**: 避免不必要的重新创建和更新
5. **框架无关**: 核心逻辑应该与 UI 框架无关
