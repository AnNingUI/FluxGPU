/**
 * Tests for Unified DSL
 */

import { describe, expect, it } from 'vitest';
import {
  array,
  cos,
  defineStruct,
  f32,
  length,
  lit, makeVec2, makeVec3, makeVec4,
  normalize,
  shader,
  sin,
  toF32,
  u32, vec2, vec3,
} from './dsl.js';

describe('Unified DSL: Type-Safe Shader Construction', () => {
  it('should create a simple compute shader with type safety', () => {
    const Particle = defineStruct('Particle', {
      position: vec3(f32),
      velocity: vec3(f32),
      mass: f32,
    });

    const Uniforms = defineStruct('Uniforms', {
      deltaTime: f32,
      gravity: vec3(f32),
    });

    const builder = shader();
    const particles = builder.storage('particles', array(Particle), 0, 0, 'read_write');
    const uniforms = builder.uniform('uniforms', Uniforms, 0, 1);

    const code = builder
      .compute([256], (ctx, { globalInvocationId }) => {
        const index = ctx.let('index', u32, globalInvocationId.x);

        ctx.if(index.ge(particles.len()), () => {
          ctx.return();
        });

        const particle = ctx.var('particle', Particle, particles.$at(index));

        // 类型安全的字段访问
        ctx.exec(particle.$('velocity').addEq(
          uniforms.$('gravity').mul(uniforms.$('deltaTime'))
        ));

        ctx.exec(particle.$('position').addEq(
          particle.$('velocity').mul(uniforms.$('deltaTime'))
        ));

        ctx.exec(particles.$at(index).set(particle));
      })
      .build();

    expect(code).toContain('struct Particle');
    expect(code).toContain('struct Uniforms');
    expect(code).toContain('@compute @workgroup_size(256, 1, 1)');
    expect(code).toContain('var<storage, read_write> particles');
    expect(code).toContain('var<uniform> uniforms');
  });

  it('should support vector field access with swizzle', () => {
    const Particle = defineStruct('Particle', {
      position: vec2(f32),
      velocity: vec2(f32),
    });

    const builder = shader();
    const particles = builder.storage('particles', array(Particle), 0, 0, 'read_write');

    const code = builder
      .compute([64], (ctx, { globalInvocationId }) => {
        const index = ctx.let('index', u32, globalInvocationId.x);
        const particle = ctx.var('particle', Particle, particles.$at(index));

        // VecFieldRef 支持 swizzle
        const posX = particle.$('position').x;
        const posY = particle.$('position').y;

        // 使用 posX 和 posY 进行边界检查 - 类型安全的分量赋值
        ctx.if(posX.lt(lit(-1.0, f32)).or(posX.gt(lit(1.0, f32))), () => {
          ctx.exec(particle.$('velocity').x.mulEq(lit(-1.0, f32)));
        });

        ctx.if(posY.lt(lit(-1.0, f32)).or(posY.gt(lit(1.0, f32))), () => {
          ctx.exec(particle.$('velocity').y.mulEq(lit(-1.0, f32)));
        });

        ctx.exec(particles.$at(index).set(particle));
      })
      .build();

    expect(code).toContain('particle.position.x');
    expect(code).toContain('particle.position.y');
  });

  it('should support builtin math functions', () => {
    const Particle = defineStruct('Particle', {
      position: vec2(f32),
      velocity: vec2(f32),
    });

    const builder = shader();
    const particles = builder.storage('particles', array(Particle), 0, 0, 'read_write');

    const code = builder
      .compute([64], (ctx, { globalInvocationId }) => {
        const index = ctx.let('index', u32, globalInvocationId.x);
        const particle = ctx.var('particle', Particle, particles.$at(index));

        const velocity = particle.$('velocity');
        const speed = ctx.let('speed', f32, length(velocity));
        const direction = ctx.let('direction', vec2(f32), normalize(velocity));

        ctx.exec(particles.$at(index).set(particle));
      })
      .build();

    expect(code).toContain('length(');
    expect(code).toContain('normalize(');
  });

  it('should support makeVec3 helper', () => {
    const builder = shader();

    const code = builder
      .compute([64], (ctx, { globalInvocationId }) => {
        const time = ctx.let('time', f32, lit(1.0, f32));

        const r = sin(time);
        const g = cos(time);
        const b = lit(0.5, f32);

        const color = ctx.let('color', vec3(f32), makeVec3(f32, r, g, b));
      })
      .build();

    expect(code).toContain('vec3<f32>(');
    expect(code).toContain('sin(');
    expect(code).toContain('cos(');
  });

  it('should support control flow', () => {
    const builder = shader();

    const code = builder
      .compute([64], (ctx, { globalInvocationId }) => {
        const x = ctx.let('x', f32, lit(1.0, f32));
        const y = ctx.var('y', f32, lit(0.0, f32));

        ctx.if(
          x.gt(lit(0.5, f32)),
          () => {
            ctx.exec(y.set(lit(1.0, f32)));
          },
          () => {
            ctx.exec(y.set(lit(-1.0, f32)));
          }
        );

        ctx.for(
          { name: 'i', type: u32, start: 0 },
          (i) => i.lt(lit(10, u32)),
          (i) => i.addEq(lit(1, u32)),
          (i) => {
            ctx.exec(y.addEq(lit(0.1, f32)));
          }
        );
      })
      .build();

    expect(code).toContain('if (');
    expect(code).toContain('} else {');
    expect(code).toContain('for (');
  });

  it('should support nested struct field access', () => {
    const Inner = defineStruct('Inner', {
      value: f32,
      offset: vec2(f32),
    });

    const Outer = defineStruct('Outer', {
      inner: Inner,
      scale: f32,
    });

    const builder = shader();
    const data = builder.storage('data', array(Outer), 0, 0, 'read_write');

    const code = builder
      .compute([64], (ctx, { globalInvocationId }) => {
        const index = ctx.let('index', u32, globalInvocationId.x);
        const item = ctx.var('item', Outer, data.$at(index));

        // 嵌套字段访问
        const innerValue = item.$('inner').$('value');
        const offsetX = item.$('inner').$('offset').x;

        ctx.exec(item.$('scale').set(innerValue.add(offsetX)));
        ctx.exec(data.$at(index).set(item));
      })
      .build();

    expect(code).toContain('item.inner.value');
    expect(code).toContain('item.inner.offset.x');
  });

  it('should generate complete particle system shader', () => {
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
    });

    const builder = shader();
    const particles = builder.storage('particles', array(Particle), 0, 0, 'read_write');
    const uniforms = builder.uniform('uniforms', Uniforms, 0, 1);

    const code = builder
      .compute([256], (ctx, { globalInvocationId }) => {
        const index = ctx.let('index', u32, globalInvocationId.x);

        ctx.if(index.ge(particles.len()), () => {
          ctx.return();
        });

        const particle = ctx.var('particle', Particle, particles.$at(index));

        // 计算到鼠标的方向
        const toMouse = ctx.let('toMouse', vec2(f32),
          uniforms.$('mousePos').sub(particle.$('position'))
        );
        const distance = ctx.let('distance', f32, length(toMouse));
        const direction = ctx.let('direction', vec2(f32), normalize(toMouse));

        // 应用吸引力
        const force = ctx.let('force', vec2(f32),
          direction.mul(uniforms.$('attraction')).mul(
            lit(1.0, f32).div(distance.add(lit(0.1, f32)))
          )
        );

        ctx.exec(particle.$('velocity').addEq(force.mul(uniforms.$('deltaTime'))));
        ctx.exec(particle.$('velocity').mulEq(lit(0.98, f32)));
        ctx.exec(particle.$('position').addEq(particle.$('velocity').mul(uniforms.$('deltaTime'))));

        // 更新颜色
        const speed = ctx.let('speed', f32, length(particle.$('velocity')));
        const time = uniforms.$('time');

        ctx.exec(particle.$('color').set(
          makeVec3(f32,
            lit(0.5, f32).add(sin(time.add(speed.mul(lit(10.0, f32)))).mul(lit(0.5, f32))),
            lit(0.5, f32).add(cos(time.mul(lit(0.7, f32))).mul(lit(0.5, f32))),
            lit(0.8, f32)
          )
        ));

        ctx.exec(particles.$at(index).set(particle));
      })
      .build();

    expect(code).toContain('struct Particle');
    expect(code).toContain('struct Uniforms');
    expect(code).toContain('normalize(');
    expect(code).toContain('length(');
    expect(code).toContain('sin(');
    expect(code).toContain('cos(');
  });
});


describe('Unified DSL: Vertex and Fragment Shaders', () => {
  it('should create a vertex shader with varyings', () => {
    const builder = shader();

    const code = builder
      .vertex(
        {
          varyings: {
            color: { location: 0, type: vec3(f32) },
            uv: { location: 1, type: vec2(f32) },
          },
        },
        (ctx, { vertexIndex }) => {
          const angle = ctx.let('angle', f32, toF32(vertexIndex).mul(lit(0.1, f32)));
          const x = ctx.let('x', f32, sin(angle));
          const y = ctx.let('y', f32, cos(angle));

          return {
            position: makeVec4(f32, x, y, 0.0, 1.0),
            varyings: {
              color: { location: 0, value: makeVec3(f32, 1.0, 0.0, 0.0) },
              uv: { location: 1, value: makeVec2(f32, x, y) },
            },
          };
        }
      )
      .build();

    expect(code).toContain('struct VertexOutput');
    expect(code).toContain('@builtin(position) position: vec4<f32>');
    expect(code).toContain('@location(0) color: vec3<f32>');
    expect(code).toContain('@location(1) uv: vec2<f32>');
    expect(code).toContain('@vertex');
    expect(code).toContain('fn main(');
    expect(code).toContain('@builtin(vertex_index) vertex_index: u32');
  });

  it('should correctly infer vertex attributes input types', () => {
    const builder = shader();

    const code = builder
      .vertex(
        {
          attributes: {
            position: { location: 0, type: vec3(f32) },
            normal: { location: 1, type: vec3(f32) },
            uv: { location: 2, type: vec2(f32) },
          },
          varyings: {
            vNormal: { location: 0, type: vec3(f32) },
            vUv: { location: 1, type: vec2(f32) },
          },
        },
        (ctx, _builtins, inputs) => {
          // 类型测试: inputs 应该正确推断为 { position: VarFor<vec3<f32>>, normal: VarFor<vec3<f32>>, uv: VarFor<vec2<f32>> }
          // 如果类型推断失败（变成 {}），下面的代码会报类型错误
          const pos = inputs.position;   // 应该是 vec3<f32> 类型
          const norm = inputs.normal;    // 应该是 vec3<f32> 类型
          const texCoord = inputs.uv;    // 应该是 vec2<f32> 类型

          // 验证可以使用 swizzle 访问分量
          const posX = pos.x;
          const posY = pos.y;
          const posZ = pos.z;

          return {
            position: makeVec4(f32, posX, posY, posZ, 1.0),
            varyings: {
              vNormal: { location: 0, value: norm },
              vUv: { location: 1, value: texCoord },
            },
          };
        }
      )
      .build();

      // 验证生成的 WGSL 包含正确的属性绑定
    expect(code).toContain('@location(0) position: vec3<f32>');
    expect(code).toContain('@location(1) normal: vec3<f32>');
    expect(code).toContain('@location(2) uv: vec2<f32>');
    expect(code).toContain('@vertex');
  });

  it('should create a fragment shader with inputs', () => {
    const builder = shader();

    const code = builder
      .fragment(
        {
          inputs: {
            color: { location: 0, type: vec3(f32) },
          },
          targets: 1,
        },
        (ctx, _builtins, { color }) => {
          return {
            colors: [
              { location: 0, value: makeVec4(f32, color.x, color.y, color.z, 1.0) },
            ],
          };
        }
      )
      .build();

    expect(code).toContain('struct FragmentInput');
    expect(code).toContain('struct FragmentOutput');
    expect(code).toContain('@fragment');
    expect(code).toContain('fn main(input: FragmentInput)');
    expect(code).toContain('@location(0) color: vec3<f32>');
  });

  it('should create a complete render pipeline with vertex and fragment', () => {
    const Vertex = defineStruct('Vertex', {
      position: vec3(f32),
      normal: vec3(f32),
      uv: vec2(f32),
    });

    const builder = shader();
    const vertices = builder.storage('vertices', array(Vertex), 0, 0, 'read');

    const code = builder
      .vertex(
        {
          varyings: {
            worldNormal: { location: 0, type: vec3(f32) },
            texCoord: { location: 1, type: vec2(f32) },
          },
        },
        (ctx, { vertexIndex }) => {
          const vertex = ctx.let('vertex', Vertex, vertices.$at(vertexIndex));
          // 使用 $ 访问字段，返回 VecFieldRef 支持 swizzle
          const pos = vertex.$('position');
          const normal = vertex.$('normal');
          const uv = vertex.$('uv');

          return {
            position: makeVec4(f32, pos.x, pos.y, pos.z, 1.0),
            varyings: {
              worldNormal: { location: 0, value: normal },
              texCoord: { location: 1, value: uv },
            },
          };
        }
      )
      .build();

    expect(code).toContain('struct Vertex');
    expect(code).toContain('var<storage, read> vertices');
    expect(code).toContain('@vertex');
    expect(code).toContain('worldNormal');
    expect(code).toContain('texCoord');
  });
});
