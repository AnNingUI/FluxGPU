// bun run ./packages/dsl/src/type.test.ts
// 使用新的组合式类型系统
import { expect, it } from 'vitest';
import {
  $2,
  defineStruct,
  f32,
  Fn,
  litF32,
  makeVec2,
  makeVec4,
  shader,
  sw,
  u32,
  vec2,
  vec4,
  bool,
  type NumericVecExpr,
  type Vec4Type,
  type F32Type,
} from './core/index.js';

export const SDFUniformStruct = defineStruct('SDFUniforms', {
  resolution: vec2(f32),
  bounds: vec4(f32),
  fillColor: vec4(f32),
  borderColor: vec4(f32),
  borderWidth: f32,
  cornerRadius: f32,
  shapeType: u32,
  _padding: f32,
});

const _0 = litF32(0);
const _1 = litF32(1);
const _2 = litF32(2);
const _05 = litF32(0.5);

const addf = Fn.name('addf')
  .input($2('a', f32), $2('b', f32))
  .output(f32)
  .body((ctx) => {
    const { a, b } = ctx.args();
    const c = ctx.val('c', a.add(b));
    return c;
  });

export function createSDFFragmentShader(): string {
  const builder = shader();

  const uniforms = builder.uniform('uniforms', SDFUniformStruct, 0, 0);
  builder.injectFn(addf);

  builder.fragment(
    {
      inputs: {
        vUv: { location: 0, type: vec2(f32) },
      },
    },
    (ctx, _builtins, inputs) => {
      // 访问 uniform 字段
      const bounds = uniforms.field('bounds');
      const fillColor = uniforms.field('fillColor');
      const borderColor = uniforms.field('borderColor');
      const borderWidth = uniforms.field('borderWidth');
      const cornerRadius = uniforms.field('cornerRadius');
      const shapeType = uniforms.field('shapeType');

      // 计算 size = bounds.zw
      const size = ctx.let('size', vec2(f32), makeVec2(f32, bounds.z, bounds.w));

      // 计算中心偏移 p = vUv - 0.5
      const center = makeVec2(f32, 0.5, 0.5);
      const vUv = inputs.vUv;
      const p = ctx.val('p', vUv.sub(center));

      // 声明 bool 向量变量
      const _u = ctx.var('u', vec2(bool), makeVec2(bool, false, false));

      // 初始化距离变量
      const dist = ctx.var('dist', f32, _0);

      // 根据形状类型计算 SDF
      sw(ctx)
        .value(shapeType)
        .case([
          0,
          () => {
            const halfSize = ctx.val(
              'halfSize',
              size.mul(_05).div(ctx.builtins.max(size.x, size.y)),
            );
            const d = ctx.val('d', ctx.builtins.abs(p).sub(halfSize));
            const distVal = ctx.builtins
              .length(ctx.builtins.max(d, makeVec2(f32, 0.0, 0.0)))
              .add(ctx.builtins.clamp(d.x, d.y, _0));
            ctx.exec(dist.set(distVal));
          },
        ])
        .case([
          1,
          () => {
            const radius = ctx.val(
              'radius',
              ctx.builtins.min(size.x, size.y).mul(ctx.builtins.max(size.x, size.y).div(_2)),
            );
            ctx.exec(dist.set(ctx.builtins.length(p).sub(radius)));
          },
        ])
        .case([
          2,
          () => {
            const halfSize = ctx.val(
              'halfSize',
              size.mul(_05).div(ctx.builtins.max(size.x, size.y)),
            );
            const r = ctx.val('r', cornerRadius.div(ctx.builtins.max(size.x, size.y)));
            const q = ctx.val(
              'q',
              ctx.builtins.abs(p).sub(halfSize).add(makeVec2(f32, r, r)),
            );
            const distVal = ctx.val(
              'distVal',
              ctx.builtins
                .length(ctx.builtins.max(q, makeVec2(f32, 0.0, 0.0)))
                .add(ctx.builtins.min(ctx.builtins.max(q.x, q.y), _0))
                .sub(r),
            );
            ctx.exec(dist.set(distVal));
          },
        ])
        .def(() => {
          const radius = ctx.val(
            'radius',
            ctx.builtins.min(size.x, size.y).mul(ctx.builtins.max(size.x, size.y).div(_2)),
          );
          ctx.exec(dist.set(ctx.builtins.length(p).sub(radius)));
        })
        .$();

      // 抗锯齿
      const pixelSize = ctx.val('pixelSize', _1.div(ctx.builtins.max(size.x, size.y)));
      const alpha = ctx.val(
        'alpha',
        _1.sub(ctx.builtins.smoothstep(pixelSize.neg(), pixelSize, dist)),
      );

      // 初始化最终颜色
      const finalColor = ctx.var('finalColor', vec4(f32), fillColor);

      // 边框处理
      ctx.if(borderWidth.gt(_0), () => {
        const borderWidthNorm = ctx.val(
          'borderWidthNorm',
          borderWidth.div(ctx.builtins.max(size.x, size.y)),
        );
        const borderDist = ctx.val('borderDist', ctx.builtins.abs(dist).sub(borderWidthNorm));
        const borderAlpha = ctx.let(
          'borderAlpha',
          f32,
          _1.sub(ctx.builtins.smoothstep(pixelSize.neg(), pixelSize, borderDist)),
        );
        const mixedColor = ctx.builtins.mix(finalColor, borderColor, borderAlpha);
        ctx.exec(finalColor.set(mixedColor));
      });

      // 应用透明度
      const finalAlpha = ctx.val('finalAlpha', finalColor.w.mul(alpha));
      const outputColor = makeVec4(f32, finalColor.x, finalColor.y, finalColor.z, finalAlpha);

      // 测试函数 DSL 是否成功
      const _test = ctx.val('testt', addf.call(_0, _2));

      return {
        colors: [
          {
            location: 0,
            value: outputColor as NumericVecExpr<Vec4Type<F32Type>>,
          },
        ],
      };
    },
  );

  return builder.build();
}
it("log", () => {
  console.log(createSDFFragmentShader())
  expect(1).eq(1)
})