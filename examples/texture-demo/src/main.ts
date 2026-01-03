/**
 * FluxGPU Texture & Sampler Demo
 *
 * 演示所有新添加的纹理和采样器功能：
 * - Sampler Types: sampler, sampler_comparison
 * - Texture Types: texture_2d, texture_storage_2d, etc.
 * - Sampling Functions: textureSample, textureSampleLevel, textureLoad, textureStore, etc.
 * - Advanced Effects: Edge detection, blur, SDF shapes, etc.
 */

/// <reference types="@webgpu/types" />

import type { ICommandEncoder, IBuffer, IRenderPipeline, ITexture, ISampler, IBindGroup } from '@fluxgpu/contracts';
import { BufferUsage, TextureUsage } from '@fluxgpu/contracts';
import { AdapterExecutor } from '@fluxgpu/engine';
import { BrowserGPUAdapter } from '@fluxgpu/host-browser';
import {
  defineStruct,
  shader,
  f32,
  u32,
  vec2,
  vec3,
  vec4,
  lit,
  makeVec2,
  makeVec3,
  makeVec4,
  // 纹理类型构造函数
  texture2d,
  textureStorage2d,
  // 类型转换函数
  toF32,
  // 纹理采样 builtins
  textureSample,
  textureSampleLevel,
  textureLoad,
  textureStore,
  textureDimensions,
  // 数学函数
  abs,
  length,
  smoothstep,
  mix,
  clamp,
  floor,
  fract,
  sin,
  cos,
  sqrt,
  max,
  min,
  dot,
  normalize,
} from '@fluxgpu/dsl';

// ============================================================================
// Uniforms 结构 - 扩展以支持更多效果参数
// ============================================================================

const Uniforms = defineStruct('Uniforms', {
  time: f32,
  lodLevel: f32,
  effectMode: u32,
  intensity: f32,
  // 额外参数
  param1: f32,
  param2: f32,
  param3: f32,
  param4: f32,
});

// ============================================================================
// Effect Mode 枚举
// ============================================================================

const EffectModes = {
  // 基础纹理效果
  BASIC: 0,
  LOD_SAMPLING: 1,
  GRAYSCALE: 2,
  INVERT: 3,
  // 高级图像处理效果
  EDGE_DETECT: 4,
  BLUR: 5,
  SHARPEN: 6,
  EMBOSS: 7,
  VIGNETTE: 8,
  CHROMATIC_ABERRATION: 9,
  PIXELATE: 10,
  // SDF 效果
  SDF_CIRCLE: 11,
  SDF_BOX: 12,
  SDF_RING: 13,
  SDF_GLOW: 14,
  SDF_OUTLINE: 15,
  SDF_SOFT_SHADOW: 16,
  SDF_COMBINED: 17,
  // 动态效果
  WAVE_DISTORT: 18,
  RIPPLE: 19,
  KALEIDOSCOPE: 20,
} as const;

// ============================================================================
// Shader Generators - 展示纹理 DSL 功能
// ============================================================================

/**
 * Vertex Shader - 全屏四边形
 */
function generateVertexShader(): string {
  const builder = shader();

  return builder
    .vertex(
      {
        varyings: {
          uv: { location: 0, type: vec2(f32) },
        },
      },
      (ctx, { vertexIndex }) => {
        const xBit = ctx.let('xBit', u32, vertexIndex.bitAnd(lit(1, u32)));
        const yBit = ctx.let('yBit', u32, vertexIndex.shr(lit(1, u32)));

        const x = ctx.let('x', f32, lit(-1.0, f32).add(toF32(xBit.mul(lit(2, u32)))));
        const y = ctx.let('y', f32, lit(-1.0, f32).add(toF32(yBit.mul(lit(2, u32)))));

        const uvX = ctx.let('uvX', f32, toF32(xBit));
        const uvY = ctx.let('uvY', f32, lit(1.0, f32).sub(toF32(yBit)));

        return {
          position: makeVec4(f32, x, y, 0.0, 1.0),
          varyings: {
            uv: { location: 0, value: makeVec2(f32, uvX, uvY) },
          },
        };
      }
    )
    .build();
}

/**
 * Fragment Shader - 展示所有纹理效果
 */
function generateFragmentShader(): string {
  const builder = shader();

  const tex = builder.texture('inputTexture', texture2d(), 0, 0);
  const samp = builder.sampler('texSampler', 0, 1);
  const uniforms = builder.uniform('uniforms', Uniforms, 0, 2);

  return builder
    .fragment(
      {
        inputs: { uv: { location: 0, type: vec2(f32) } },
        targets: 1,
      },
      (ctx, _builtins, { uv }) => {
        const effectMode = uniforms.$('effectMode');
        const lodLevel = uniforms.$('lodLevel');
        const time = uniforms.$('time');
        const intensity = uniforms.$('intensity');
        const param1 = uniforms.$('param1');

        // 纹理像素尺寸 (用于卷积核)
        const texelSize = ctx.let('texelSize', vec2(f32), makeVec2(f32, 1.0 / 256.0, 1.0 / 256.0));

        // 输出颜色
        const color = ctx.var('color', vec4(f32), makeVec4(f32, 0.0, 0.0, 0.0, 1.0));

        // ========== 基础效果 ==========

        // 0: 基本采样
        ctx.if(effectMode.eq(lit(EffectModes.BASIC, u32)), () => {
          ctx.exec(color.set(textureSample(tex, samp, uv)));
        });

        // 1: LOD 采样
        ctx.if(effectMode.eq(lit(EffectModes.LOD_SAMPLING, u32)), () => {
          ctx.exec(color.set(textureSampleLevel(tex, samp, uv, lodLevel)));
        });

        // 2: 灰度
        ctx.if(effectMode.eq(lit(EffectModes.GRAYSCALE, u32)), () => {
          const texColor = ctx.let('texColor', vec4(f32), textureSample(tex, samp, uv));
          const gray = ctx.let('gray', f32,
            texColor.x.mul(lit(0.299, f32))
              .add(texColor.y.mul(lit(0.587, f32)))
              .add(texColor.z.mul(lit(0.114, f32)))
          );
          ctx.exec(color.set(makeVec4(f32, gray, gray, gray, 1.0)));
        });

        // 3: 反色
        ctx.if(effectMode.eq(lit(EffectModes.INVERT, u32)), () => {
          const texColor = ctx.let('texColor3', vec4(f32), textureSample(tex, samp, uv));
          ctx.exec(color.set(makeVec4(f32,
            lit(1.0, f32).sub(texColor.x),
            lit(1.0, f32).sub(texColor.y),
            lit(1.0, f32).sub(texColor.z),
            1.0
          )));
        });

        // ========== 高级图像处理 ==========

        // 4: 边缘检测 (Sobel)
        ctx.if(effectMode.eq(lit(EffectModes.EDGE_DETECT, u32)), () => {
          // Sobel 算子 - 水平和垂直
          const tl = ctx.let('tl', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x.neg(), texelSize.y))));
          const tm = ctx.let('tm', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, 0.0, texelSize.y))));
          const tr = ctx.let('tr', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x, texelSize.y))));
          const ml = ctx.let('ml', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x.neg(), 0.0))));
          const mr = ctx.let('mr', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x, 0.0))));
          const bl = ctx.let('bl', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x.neg(), texelSize.y.neg()))));
          const bm = ctx.let('bm', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, 0.0, texelSize.y.neg()))));
          const br = ctx.let('br', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x, texelSize.y.neg()))));

          // Gx = [-1 0 1; -2 0 2; -1 0 1]
          const gx = ctx.let('gx', vec3(f32),
            tl.xyz.mul(lit(-1.0, f32))
              .add(tr.xyz)
              .add(ml.xyz.mul(lit(-2.0, f32)))
              .add(mr.xyz.mul(lit(2.0, f32)))
              .add(bl.xyz.mul(lit(-1.0, f32)))
              .add(br.xyz)
          );
          // Gy = [1 2 1; 0 0 0; -1 -2 -1]
          const gy = ctx.let('gy', vec3(f32),
            tl.xyz
              .add(tm.xyz.mul(lit(2.0, f32)))
              .add(tr.xyz)
              .add(bl.xyz.mul(lit(-1.0, f32)))
              .add(bm.xyz.mul(lit(-2.0, f32)))
              .add(br.xyz.mul(lit(-1.0, f32)))
          );

          const edge = ctx.let('edge', vec3(f32), sqrt(gx.mul(gx).add(gy.mul(gy))));
          const edgeIntensity = ctx.let('edgeIntensity', f32,
            edge.x.add(edge.y).add(edge.z).div(lit(3.0, f32))
          );
          ctx.exec(color.set(makeVec4(f32, edgeIntensity, edgeIntensity, edgeIntensity, 1.0)));
        });

        // 5: 模糊 (Box Blur) - 手动展开 3x3 采样
        ctx.if(effectMode.eq(lit(EffectModes.BLUR, u32)), () => {
          const blurSize = ctx.let('blurSize', f32, intensity.mul(lit(3.0, f32)));
          const ts = ctx.let('ts', vec2(f32), makeVec2(f32, texelSize.x.mul(blurSize), texelSize.y.mul(blurSize)));

          // 3x3 手动采样
          const s00 = ctx.let('s00', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, ts.x.neg(), ts.y.neg()))));
          const s01 = ctx.let('s01', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, 0.0, ts.y.neg()))));
          const s02 = ctx.let('s02', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, ts.x, ts.y.neg()))));
          const s10 = ctx.let('s10', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, ts.x.neg(), 0.0))));
          const s11 = ctx.let('s11', vec4(f32), textureSample(tex, samp, uv));
          const s12 = ctx.let('s12', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, ts.x, 0.0))));
          const s20 = ctx.let('s20', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, ts.x.neg(), ts.y))));
          const s21 = ctx.let('s21', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, 0.0, ts.y))));
          const s22 = ctx.let('s22', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, ts.x, ts.y))));

          const sum = ctx.let('sumBlur', vec4(f32),
            s00.add(s01).add(s02).add(s10).add(s11).add(s12).add(s20).add(s21).add(s22)
          );
          ctx.exec(color.set(sum.div(lit(9.0, f32))));
        });

        // 6: 锐化
        ctx.if(effectMode.eq(lit(EffectModes.SHARPEN, u32)), () => {
          const center = ctx.let('centerS', vec4(f32), textureSample(tex, samp, uv));
          const top = ctx.let('topS', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, 0.0, texelSize.y))));
          const bottom = ctx.let('bottomS', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, 0.0, texelSize.y.neg()))));
          const left = ctx.let('leftS', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x.neg(), 0.0))));
          const right = ctx.let('rightS', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x, 0.0))));

          // 锐化核: [0 -1 0; -1 5 -1; 0 -1 0]
          const sharpened = ctx.let('sharpened', vec4(f32),
            center.mul(lit(5.0, f32))
              .sub(top)
              .sub(bottom)
              .sub(left)
              .sub(right)
          );
          // mix for vec4: x * (1 - t) + y * t
          const oneMinusI = ctx.let('oneMinusI', f32, lit(1.0, f32).sub(intensity));
          const result = ctx.let('resultS', vec4(f32),
            center.mul(oneMinusI).add(sharpened.mul(intensity))
          );
          ctx.exec(color.set(makeVec4(f32, result.x, result.y, result.z, 1.0)));
        });

        // 7: 浮雕
        ctx.if(effectMode.eq(lit(EffectModes.EMBOSS, u32)), () => {
          const tl2 = ctx.let('tl2', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x.neg(), texelSize.y))));
          const br2 = ctx.let('br2', vec4(f32), textureSample(tex, samp, uv.add(makeVec2(f32, texelSize.x, texelSize.y.neg()))));
          const diff = ctx.let('diff', vec4(f32), br2.sub(tl2));
          const gray2 = ctx.let('gray2', f32, diff.x.add(diff.y).add(diff.z).div(lit(3.0, f32)).add(lit(0.5, f32)));
          ctx.exec(color.set(makeVec4(f32, gray2, gray2, gray2, 1.0)));
        });

        // 8: 暗角
        ctx.if(effectMode.eq(lit(EffectModes.VIGNETTE, u32)), () => {
          const texColor = ctx.let('texColorV', vec4(f32), textureSample(tex, samp, uv));
          const centerUV = ctx.let('centerUV', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const dist = ctx.let('distV', f32, length(centerUV));
          const vignette = ctx.let('vignette', f32, smoothstep(lit(0.8, f32), lit(0.2, f32), dist.mul(intensity.mul(lit(2.0, f32)))));
          ctx.exec(color.set(makeVec4(f32,
            texColor.x.mul(vignette),
            texColor.y.mul(vignette),
            texColor.z.mul(vignette),
            1.0
          )));
        });

        // 9: 色差
        ctx.if(effectMode.eq(lit(EffectModes.CHROMATIC_ABERRATION, u32)), () => {
          const centerCA = ctx.let('centerCA', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const distCA = ctx.let('distCA', f32, length(centerCA));
          const offset = ctx.let('offsetCA', f32, distCA.mul(intensity).mul(lit(0.02, f32)));

          const r = ctx.let('rCA', f32, textureSample(tex, samp, uv.add(centerCA.mul(offset))).x);
          const g = ctx.let('gCA', f32, textureSample(tex, samp, uv).y);
          const b = ctx.let('bCA', f32, textureSample(tex, samp, uv.sub(centerCA.mul(offset))).z);
          ctx.exec(color.set(makeVec4(f32, r, g, b, 1.0)));
        });

        // 10: 像素化
        ctx.if(effectMode.eq(lit(EffectModes.PIXELATE, u32)), () => {
          const pixelSize = ctx.let('pixelSize', f32, max(intensity.mul(lit(32.0, f32)), lit(1.0, f32)));
          const pixelUV = ctx.let('pixelUV', vec2(f32),
            makeVec2(f32,
              floor(uv.x.mul(lit(256.0, f32)).div(pixelSize)).mul(pixelSize).div(lit(256.0, f32)),
              floor(uv.y.mul(lit(256.0, f32)).div(pixelSize)).mul(pixelSize).div(lit(256.0, f32))
            )
          );
          ctx.exec(color.set(textureSample(tex, samp, pixelUV)));
        });

        // ========== SDF 效果 ==========

        // 11: SDF 圆形
        ctx.if(effectMode.eq(lit(EffectModes.SDF_CIRCLE, u32)), () => {
          const p = ctx.let('pCircle', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const d = ctx.let('dCircle', f32, length(p).sub(lit(0.3, f32)));
          const sdf = ctx.let('sdfCircle', f32, smoothstep(lit(0.01, f32), lit(0.0, f32), abs(d)));

          const texColor = ctx.let('texColorSDF', vec4(f32), textureSample(tex, samp, uv));
          ctx.exec(color.set(makeVec4(f32,
            texColor.x.mul(sdf),
            texColor.y.mul(sdf),
            texColor.z.mul(sdf),
            1.0
          )));
        });

        // 12: SDF 方形
        ctx.if(effectMode.eq(lit(EffectModes.SDF_BOX, u32)), () => {
          const p = ctx.let('pBox', vec2(f32), abs(uv.sub(makeVec2(f32, 0.5, 0.5))));
          const boxSize = ctx.let('boxSize', vec2(f32), makeVec2(f32, 0.3, 0.3));
          const q = ctx.let('qBox', vec2(f32), p.sub(boxSize));
          const d = ctx.let('dBox', f32,
            length(makeVec2(f32, max(q.x, lit(0.0, f32)), max(q.y, lit(0.0, f32))))
              .add(min(max(q.x, q.y), lit(0.0, f32)))
          );
          const sdf = ctx.let('sdfBox', f32, smoothstep(lit(0.01, f32), lit(0.0, f32), abs(d)));

          const texColor = ctx.let('texColorBox', vec4(f32), textureSample(tex, samp, uv));
          ctx.exec(color.set(makeVec4(f32,
            texColor.x.mul(sdf),
            texColor.y.mul(sdf),
            texColor.z.mul(sdf),
            1.0
          )));
        });

        // 13: SDF 环形
        ctx.if(effectMode.eq(lit(EffectModes.SDF_RING, u32)), () => {
          const p = ctx.let('pRing', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const dist = ctx.let('distRing', f32, length(p));
          const ring = ctx.let('ring', f32, abs(dist.sub(lit(0.3, f32))).sub(intensity.mul(lit(0.1, f32))));
          const sdf = ctx.let('sdfRing', f32, smoothstep(lit(0.01, f32), lit(0.0, f32), ring));

          const texColor = ctx.let('texColorRing', vec4(f32), textureSample(tex, samp, uv));
          const ringColor = ctx.let('ringColor', vec3(f32), makeVec3(f32, 1.0, 0.5, 0.2));
          ctx.exec(color.set(makeVec4(f32,
            mix(texColor.x, ringColor.x, sdf),
            mix(texColor.y, ringColor.y, sdf),
            mix(texColor.z, ringColor.z, sdf),
            1.0
          )));
        });

        // 14: SDF 发光
        ctx.if(effectMode.eq(lit(EffectModes.SDF_GLOW, u32)), () => {
          const p = ctx.let('pGlow', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const d = ctx.let('dGlow', f32, length(p).sub(lit(0.2, f32)));
          const glow = ctx.let('glow', f32, lit(1.0, f32).div(d.mul(lit(10.0, f32).mul(intensity)).add(lit(1.0, f32))));

          const texColor = ctx.let('texColorGlow', vec4(f32), textureSample(tex, samp, uv));
          const glowColor = ctx.let('glowColor', vec3(f32), makeVec3(f32, 0.3, 0.6, 1.0));
          ctx.exec(color.set(makeVec4(f32,
            texColor.x.add(glowColor.x.mul(glow)),
            texColor.y.add(glowColor.y.mul(glow)),
            texColor.z.add(glowColor.z.mul(glow)),
            1.0
          )));
        });

        // 15: SDF 描边
        ctx.if(effectMode.eq(lit(EffectModes.SDF_OUTLINE, u32)), () => {
          const p = ctx.let('pOutline', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const d = ctx.let('dOutline', f32, length(p).sub(lit(0.25, f32)));
          const outline = ctx.let('outline', f32,
            smoothstep(lit(0.02, f32), lit(0.01, f32), abs(d))
              .mul(smoothstep(lit(0.0, f32), lit(0.01, f32), abs(d)))
          );

          const texColor = ctx.let('texColorOutline', vec4(f32), textureSample(tex, samp, uv));
          const inside = ctx.let('inside', f32, smoothstep(lit(0.01, f32), lit(0.0, f32), d));
          const outlineColor = ctx.let('outlineColorV', vec3(f32), makeVec3(f32, 1.0, 0.8, 0.0));

          ctx.exec(color.set(makeVec4(f32,
            mix(lit(0.1, f32), mix(texColor.x, outlineColor.x, outline), inside),
            mix(lit(0.1, f32), mix(texColor.y, outlineColor.y, outline), inside),
            mix(lit(0.1, f32), mix(texColor.z, outlineColor.z, outline), inside),
            1.0
          )));
        });

        // 16: SDF 软阴影
        ctx.if(effectMode.eq(lit(EffectModes.SDF_SOFT_SHADOW, u32)), () => {
          const p = ctx.let('pShadow', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const shadowOffset = ctx.let('shadowOffset', vec2(f32), makeVec2(f32, 0.03, 0.03).mul(intensity));
          const pShadowOffset = ctx.let('pShadowOffset', vec2(f32), p.add(shadowOffset));

          const dMain = ctx.let('dMain', f32, length(p).sub(lit(0.25, f32)));
          const dShadow = ctx.let('dShadow', f32, length(pShadowOffset).sub(lit(0.25, f32)));

          const shadow = ctx.let('shadow', f32, smoothstep(lit(0.0, f32), lit(0.1, f32), dShadow).mul(lit(0.5, f32)));
          const shape = ctx.let('shape', f32, smoothstep(lit(0.01, f32), lit(0.0, f32), dMain));

          const texColor = ctx.let('texColorShadow', vec4(f32), textureSample(tex, samp, uv));
          ctx.exec(color.set(makeVec4(f32,
            texColor.x.mul(lit(1.0, f32).sub(shadow)).mul(lit(1.0, f32).sub(shape)).add(texColor.x.mul(shape)),
            texColor.y.mul(lit(1.0, f32).sub(shadow)).mul(lit(1.0, f32).sub(shape)).add(texColor.y.mul(shape)),
            texColor.z.mul(lit(1.0, f32).sub(shadow)).mul(lit(1.0, f32).sub(shape)).add(texColor.z.mul(shape)),
            1.0
          )));
        });

        // 17: SDF 组合 (多个形状)
        ctx.if(effectMode.eq(lit(EffectModes.SDF_COMBINED, u32)), () => {
          const p = ctx.let('pComb', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));

          // 圆形
          const circle = ctx.let('circle', f32, length(p).sub(lit(0.15, f32)));

          // 移动的小圆
          const p2 = ctx.let('p2', vec2(f32), p.sub(makeVec2(f32, sin(time).mul(lit(0.2, f32)), cos(time).mul(lit(0.2, f32)))));
          const circle2 = ctx.let('circle2', f32, length(p2).sub(lit(0.1, f32)));

          // Union (最小值)
          const combined = ctx.let('combined', f32, min(circle, circle2));
          const sdf = ctx.let('sdfComb', f32, smoothstep(lit(0.01, f32), lit(0.0, f32), combined));

          const texColor = ctx.let('texColorComb', vec4(f32), textureSample(tex, samp, uv));
          ctx.exec(color.set(makeVec4(f32,
            mix(texColor.x.mul(lit(0.3, f32)), texColor.x, sdf),
            mix(texColor.y.mul(lit(0.3, f32)), texColor.y, sdf),
            mix(texColor.z.mul(lit(0.3, f32)), texColor.z, sdf),
            1.0
          )));
        });

        // ========== 动态效果 ==========

        // 18: 波浪扭曲
        ctx.if(effectMode.eq(lit(EffectModes.WAVE_DISTORT, u32)), () => {
          const waveX = ctx.let('waveX', f32, sin(uv.y.mul(lit(20.0, f32)).add(time.mul(lit(3.0, f32)))).mul(intensity).mul(lit(0.02, f32)));
          const waveY = ctx.let('waveY', f32, cos(uv.x.mul(lit(20.0, f32)).add(time.mul(lit(3.0, f32)))).mul(intensity).mul(lit(0.02, f32)));
          const distortedUV = ctx.let('distortedUV', vec2(f32), uv.add(makeVec2(f32, waveX, waveY)));
          ctx.exec(color.set(textureSample(tex, samp, distortedUV)));
        });

        // 19: 涟漪
        ctx.if(effectMode.eq(lit(EffectModes.RIPPLE, u32)), () => {
          const center = ctx.let('centerRipple', vec2(f32), makeVec2(f32, 0.5, 0.5));
          const dist = ctx.let('distRipple', f32, length(uv.sub(center)));
          const ripple = ctx.let('rippleV', f32, sin(dist.mul(lit(50.0, f32)).sub(time.mul(lit(5.0, f32)))).mul(intensity).mul(lit(0.01, f32)));
          const dir = ctx.let('dirRipple', vec2(f32), normalize(uv.sub(center)));
          const rippleUV = ctx.let('rippleUV', vec2(f32), uv.add(dir.mul(ripple)));
          ctx.exec(color.set(textureSample(tex, samp, rippleUV)));
        });

        // 20: 万花筒
        ctx.if(effectMode.eq(lit(EffectModes.KALEIDOSCOPE, u32)), () => {
          const center = ctx.let('centerK', vec2(f32), uv.sub(makeVec2(f32, 0.5, 0.5)));
          const angle = ctx.let('angleK', f32,
            // atan2 模拟
            center.y.div(length(center).add(lit(0.0001, f32)))
          );
          const segments = ctx.let('segments', f32, lit(6.0, f32));
          const segmentAngle = ctx.let('segmentAngle', f32, lit(3.14159, f32).mul(lit(2.0, f32)).div(segments));
          const dist = ctx.let('distK', f32, length(center));

          // 简化的万花筒效果
          const newAngle = ctx.let('newAngle', f32, fract(angle.div(segmentAngle)).mul(segmentAngle));
          const kaleidoUV = ctx.let('kaleidoUV', vec2(f32),
            makeVec2(f32,
              cos(newAngle.add(time.mul(intensity))).mul(dist).add(lit(0.5, f32)),
              sin(newAngle.add(time.mul(intensity))).mul(dist).add(lit(0.5, f32))
            )
          );
          ctx.exec(color.set(textureSample(tex, samp, kaleidoUV)));
        });

        // 默认：基本采样
        ctx.if(effectMode.gt(lit(EffectModes.KALEIDOSCOPE, u32)), () => {
          ctx.exec(color.set(textureSample(tex, samp, uv)));
        });

        return {
          colors: [{ location: 0, value: color }],
        };
      }
    )
    .build();
}

/**
 * Compute Shader - 展示 textureLoad 和 textureStore
 */
function generateComputeShader(): string {
  const builder = shader();

  const inputTex = builder.texture('inputTex', texture2d(), 0, 0);
  const outputTex = builder.texture('outputTex', textureStorage2d('rgba8unorm', 'write'), 0, 1);

  return builder
    .compute([16, 16], (ctx, { globalInvocationId }) => {
      const coords = ctx.let('coords', vec2(u32), globalInvocationId.xy);
      const texSize = ctx.let('texSize', vec2(u32), textureDimensions(inputTex));

      ctx.if(coords.x.ge(texSize.x).or(coords.y.ge(texSize.y)), () => ctx.return());

      const pixel = ctx.let('pixel', vec4(f32), textureLoad(inputTex, coords, lit(0, u32)));
      const inverted = ctx.let('inverted', vec4(f32),
        makeVec4(f32,
          lit(1.0, f32).sub(pixel.x),
          lit(1.0, f32).sub(pixel.y),
          lit(1.0, f32).sub(pixel.z),
          pixel.w
        )
      );

      ctx.exec(textureStore(outputTex, coords, inverted));
    })
    .build();
}

// ============================================================================
// Demo Application
// ============================================================================

class TextureDemo {
  private executor!: AdapterExecutor;
  private renderPipeline!: IRenderPipeline;
  private uniformBuffer!: IBuffer;
  private renderBindGroup!: IBindGroup;
  private inputTexture!: ITexture;
  private textureSampler!: ISampler;

  private textureSize = { width: 0, height: 0 };

  private running = false;
  private startTime = 0;
  private frameCount = 0;
  private lastFPSUpdate = 0;
  private lodLevel = 0;
  private effectMode = 0;
  private intensity = 1.0;

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    const adapter = new BrowserGPUAdapter({ canvas });
    this.executor = new AdapterExecutor({ adapter });
    await this.executor.initialize();

    const vertexShader = generateVertexShader();
    const fragmentShader = generateFragmentShader();
    const computeShader = generateComputeShader();

    document.getElementById('vertexCode')!.textContent = vertexShader;
    document.getElementById('fragmentCode')!.textContent = fragmentShader;
    document.getElementById('computeCode')!.textContent = computeShader;

    const vertexModule = this.executor.createShaderModule(vertexShader);
    const fragmentModule = this.executor.createShaderModule(fragmentShader);

    this.renderPipeline = await this.executor.createRenderPipeline({
      vertex: { shader: vertexModule, entryPoint: 'main' },
      fragment: {
        shader: fragmentModule,
        entryPoint: 'main',
        targets: [{ format: this.executor.getPreferredFormat() }],
      },
      primitive: { topology: 'triangle-strip' },
    });

    await this.createCheckerboardTexture(256, 256);

    // 扩展的 uniform buffer (8 floats = 32 bytes)
    this.uniformBuffer = this.executor.createBuffer({
      size: 32,
      usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });

    this.renderBindGroup = this.executor.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.inputTexture.createView() },
        { binding: 1, resource: this.textureSampler },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.setupEvents();
    this.updateStatus('success', 'Initialized! All texture features loaded.');
  }

  private async createCheckerboardTexture(width: number, height: number): Promise<void> {
    this.textureSize = { width, height };
    document.getElementById('texSize')!.textContent = `${width}x${height}`;

    const mipLevelCount = Math.floor(Math.log2(Math.max(width, height))) + 1;

    const data = new Uint8Array(width * height * 4);
    const tileSize = 32;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const isWhite = ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2) === 0;

        const r = isWhite ? 255 : Math.floor(50 + (x / width) * 100);
        const g = isWhite ? 255 : Math.floor(50 + (y / height) * 100);
        const b = isWhite ? 255 : 150;

        data[offset + 0] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 255;
      }
    }

    this.inputTexture = this.executor.createTexture({
      size: { width, height },
      format: 'rgba8unorm',
      usage: TextureUsage.TEXTURE_BINDING | TextureUsage.COPY_DST | TextureUsage.RENDER_ATTACHMENT,
      mipLevelCount,
    });

    this.executor.writeTexture(
      { texture: this.inputTexture, mipLevel: 0 },
      data,
      { bytesPerRow: width * 4, rowsPerImage: height },
      { width, height }
    );

    let mipWidth = width;
    let mipHeight = height;
    let prevData: Uint8Array = data;

    for (let level = 1; level < mipLevelCount; level++) {
      const newWidth = Math.max(1, mipWidth >> 1);
      const newHeight = Math.max(1, mipHeight >> 1);
      const newData = this.generateMipLevel(prevData, mipWidth, mipHeight, newWidth, newHeight);

      this.executor.writeTexture(
        { texture: this.inputTexture, mipLevel: level },
        newData,
        { bytesPerRow: newWidth * 4, rowsPerImage: newHeight },
        { width: newWidth, height: newHeight }
      );

      mipWidth = newWidth;
      mipHeight = newHeight;
      prevData = newData;
    }

    this.textureSampler = this.executor.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    });
  }

  private generateMipLevel(
    src: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    dstWidth: number,
    dstHeight: number
  ): Uint8Array {
    const dst = new Uint8Array(dstWidth * dstHeight * 4);

    for (let y = 0; y < dstHeight; y++) {
      for (let x = 0; x < dstWidth; x++) {
        const srcX = x * 2;
        const srcY = y * 2;

        let r = 0, g = 0, b = 0, a = 0;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const sx = Math.min(srcX + dx, srcWidth - 1);
            const sy = Math.min(srcY + dy, srcHeight - 1);
            const srcOffset = (sy * srcWidth + sx) * 4;
            r += src[srcOffset + 0];
            g += src[srcOffset + 1];
            b += src[srcOffset + 2];
            a += src[srcOffset + 3];
          }
        }

        const dstOffset = (y * dstWidth + x) * 4;
        dst[dstOffset + 0] = r >> 2;
        dst[dstOffset + 1] = g >> 2;
        dst[dstOffset + 2] = b >> 2;
        dst[dstOffset + 3] = a >> 2;
      }
    }

    return dst;
  }

  private setupEvents(): void {
    const lodInput = document.getElementById('lodLevel') as HTMLInputElement;
    const effectSelect = document.getElementById('effectSelect') as HTMLSelectElement;
    const intensityInput = document.getElementById('intensity') as HTMLInputElement;

    lodInput?.addEventListener('input', () => {
      this.lodLevel = parseFloat(lodInput.value);
      document.getElementById('lodVal')!.textContent = this.lodLevel.toFixed(1);
    });

    intensityInput?.addEventListener('input', () => {
      this.intensity = parseFloat(intensityInput.value);
      document.getElementById('intensityVal')!.textContent = this.intensity.toFixed(2);
    });

    effectSelect?.addEventListener('change', () => {
      this.effectMode = parseInt(effectSelect.value, 10);
      const effectName = effectSelect.options[effectSelect.selectedIndex].text;
      document.getElementById('effectName')!.textContent = effectName;
    });
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

    // 更新 uniforms (8 floats)
    const uniformData = new Float32Array(8);
    uniformData[0] = (now - this.startTime) / 1000;  // time
    uniformData[1] = this.lodLevel;                   // lodLevel
    // effectMode 作为 u32
    const view = new DataView(uniformData.buffer);
    view.setUint32(8, this.effectMode, true);
    uniformData[3] = this.intensity;                  // intensity
    uniformData[4] = 0;  // param1
    uniformData[5] = 0;  // param2
    uniformData[6] = 0;  // param3
    uniformData[7] = 0;  // param4

    this.executor.writeBuffer(this.uniformBuffer, uniformData);

    this.executor.frame((encoder: ICommandEncoder) => {
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
        renderPass.draw(4);
        renderPass.end();
      }
    });

    this.frameCount++;
    if (now - this.lastFPSUpdate > 1000) {
      const fps = Math.round(this.frameCount / ((now - this.lastFPSUpdate) / 1000));
      document.getElementById('fps')!.textContent = fps.toString();
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }

    requestAnimationFrame(this.animate);
  };

  private updateStatus(type: 'success' | 'error' | 'info', message: string): void {
    const status = document.getElementById('status')!;
    status.className = `status ${type}`;
    status.textContent = message;
  }
}

// ============================================================================
// Main Entry
// ============================================================================

async function main(): Promise<void> {
  const canvas = document.getElementById('gpuCanvas') as HTMLCanvasElement;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const demo = new TextureDemo();

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
