/**
 * FluxGPU Worker Demo - Shaders
 *
 * 使用 @fluxgpu/dsl 生成着色器
 */

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

// 类型定义
export const Particle = defineStruct('Particle', {
  position: vec2(f32),
  velocity: vec2(f32),
  color: vec3(f32),
  life: f32,
});

export const Uniforms = defineStruct('Uniforms', {
  deltaTime: f32,
  time: f32,
  mousePos: vec2(f32),
  attraction: f32,
  damping: f32,
});

// 计算着色器
export function generateComputeShader(): string {
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

// 顶点着色器
export function generateVertexShader(): string {
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

// 片段着色器
export function generateFragmentShader(): string {
  const builder = shader();

  return builder
    .fragment({ inputs: { color: { location: 0, type: vec3(f32) } }, targets: 1 }, (_ctx, _builtins, { color }) => ({
      colors: [{ location: 0, value: vec4FromVec3(color, 1.0) }],
    }))
    .build();
}
