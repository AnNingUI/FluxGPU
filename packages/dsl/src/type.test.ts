import {
	defineStruct,
	f32,
	lit,
	makeVec2,
	makeVec4,
	shader,
	sw,
	u32,
	vec2,
	vec4,
} from "./dsl";
export const SDFUniformStruct = defineStruct("SDFUniforms", {
	resolution: vec2(),
	bounds: vec4(), // x, y, width, height
	fillColor: vec4(),
	borderColor: vec4(),
	borderWidth: f32,
	cornerRadius: f32,
	shapeType: u32, // 0=box, 1=circle, 2=roundedRect
	_padding: f32,
});
const _0 = lit(0, f32);
const _1 = lit(1, f32);
const _2 = lit(2, f32);
const _05 = lit(0.5, f32);
export function createSDFFragmentShader(): string {
	const builder = shader();

	const uniforms = builder.uniform("uniforms", SDFUniformStruct, 0, 0);

	builder.fragment(
		{
			inputs: {
				vUv: { location: 0, type: vec2() },
			},
		},
		(ctx, builtins, inputs) => {
			// 获取 uniform 引用
			// const uniforms = ctx.var('uniforms_ref', SDFUniformStruct, { __code: 'uniforms', __type: SDFUniformStruct } as any);

			// 访问 uniform 字段
			const bounds = uniforms.$("bounds");
			const fillColor = uniforms.$("fillColor");
			const borderColor = uniforms.$("borderColor");
			const borderWidth = uniforms.$("borderWidth");
			const cornerRadius = uniforms.$("cornerRadius");
			const shapeType = uniforms.$("shapeType");

			// 计算 size = bounds.zw
			const size = ctx.let("size", vec2(), makeVec2(f32, bounds.z, bounds.w));

			// 计算中心偏移 p = vUv - 0.5
			const center = makeVec2(f32, 0.5, 0.5);
			const p = inputs.vUv.sub(center);

			// 初始化距离变量
			const dist = ctx.var("dist", f32, _0);

			// 根据形状类型计算 SDF
			// ctx.if(shapeType.eq(_0), () => {
			//   // Box SDF
			//   // const halfSize = ctx.builtins.div(
			//   //   ctx.builtins.mul(size, 0.5),
			//   //   ctx.builtins.max(size.x, size.y)
			//   // );
			//   const halfSize = size.mul(_05).div(ctx.builtins.max(size.x, size.y));
			//   const d = ctx.builtins.abs(p).sub(halfSize) as VecExpr<Vec2Type<F32Type>>;
			//   // const distVal = ctx.builtins.add(
			//   //   ctx.builtins.length(ctx.builtins.max(d, makeVec2(f32, 0.0, 0.0))),
			//   //   ctx.builtins.min(ctx.builtins.max(d.x, d.y), 0.0)
			//   // );
			//   const distVal = ctx.builtins.length(ctx.builtins.max(d, makeVec2(f32, 0.0, 0.0))).add(ctx.builtins.clamp(d.x, d.y, _0))
			//   dist.set(distVal);
			// }, () => {

			// })
			// ctx.elseIf(shapeType.eq(1.0), () => {
			//   // Circle SDF
			//   const radius = ctx.builtins.mul(
			//     ctx.builtins.min(size.x, size.y),
			//     0.5 / ctx.builtins.max(size.x, size.y)
			//   );
			//   dist.set(ctx.builtins.sub(ctx.builtins.length(p), radius));
			// }).elseIf(shapeType.eq(2.0), () => {
			//   // Rounded Rectangle SDF
			//   const halfSize = ctx.builtins.div(
			//     ctx.builtins.mul(size, 0.5),
			//     ctx.builtins.max(size.x, size.y)
			//   );
			//   const r = ctx.builtins.div(cornerRadius, ctx.builtins.max(size.x, size.y));
			//   const q = ctx.builtins.add(
			//     ctx.builtins.sub(ctx.builtins.abs(p), halfSize),
			//     makeVec2(f32, r, r)
			//   );
			//   const distVal = ctx.builtins.sub(
			//     ctx.builtins.add(
			//       ctx.builtins.length(ctx.builtins.max(q, makeVec2(f32, 0.0, 0.0))),
			//       ctx.builtins.min(ctx.builtins.max(q.x, q.y), 0.0)
			//     ),
			//     r
			//   );
			//   dist.set(distVal);
			// }).else(() => {
			//   // 其他形状暂时使用圆形
			//   const radius = ctx.builtins.mul(
			//     ctx.builtins.min(size.x, size.y),
			//     0.5 / ctx.builtins.max(size.x, size.y)
			//   );
			//   dist.set(ctx.builtins.sub(ctx.builtins.length(p), radius));
			// });
			sw(ctx)
				.value(shapeType)
				.case([
					0,
					() => {
						const halfSize = size
							.mul(_05)
							.div(ctx.builtins.max(size.x, size.y));
						const d = ctx.val("d", ctx.builtins.abs(p).sub(halfSize));
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
							"radius",
							ctx.builtins
								.min(size.x, size.y)
								.mul(ctx.builtins.max(size.x, size.y).div(_2))
						);
						ctx.exec(dist.set(ctx.builtins.length(p).sub(radius)));
					},
				])
				.case([
					2,
					() => {
						const halfSize = ctx.val("halfSize", size
							.mul(_05)
							.div(ctx.builtins.max(size.x, size.y)));
						const r = ctx.val("r", cornerRadius.div(ctx.builtins.max(size.x, size.y)));
						const q = ctx.val(
							"q",
							ctx.builtins.abs(p).sub(halfSize).add(makeVec2(f32, r, r))
						);
						const distVal = ctx.val(
							"distVal",
							ctx.builtins
								.length(ctx.builtins.max(q, makeVec2(f32, 0.0, 0.0)))
								.add(ctx.builtins.min(ctx.builtins.max(q.x, q.y), _0))
								.sub(r)
						);
						ctx.exec(dist.set(distVal));
					},
				])
				.def(() => {
					const radius = ctx.val("radius", ctx.builtins
						.min(size.x, size.y)
						.mul(ctx.builtins.max(size.x, size.y).div(_2)));
					ctx.exec(dist.set(ctx.builtins.length(p).sub(radius)));
				})
				.$();

			// 抗锯齿
			// pixelSize 需要是 f32 标量，因为 dist 是 f32
			const pixelSize = _1.div(ctx.builtins.max(size.x, size.y));
			const alpha = _1.sub(
				ctx.builtins.smoothstep(pixelSize.neg(), pixelSize, dist)
			);

			// 初始化最终颜色
			const finalColor = ctx.var("finalColor", vec4(), fillColor);

			// 边框处理
			ctx.if(borderWidth.gt(_0), () => {
				const borderWidthNorm = borderWidth.div(
					ctx.builtins.max(size.x, size.y)
				);
				const borderDist = ctx.val(
					"borderDist",
					ctx.builtins.abs(dist).sub(borderWidthNorm)
				);
				const borderAlpha = ctx.let(
					"borderAlpha",
					f32,
					_1.sub(
						ctx.builtins.smoothstep(pixelSize.neg(), pixelSize, borderDist)
					)
				);
				const mixedColor = ctx.builtins.mix(
					finalColor,
					borderColor,
					makeVec4(f32, borderAlpha, borderAlpha, borderAlpha, borderAlpha)
				);
				ctx.exec(finalColor.set(mixedColor));
			});

			// 应用透明度
			const finalAlpha = ctx.val("finalColor", finalColor.w.mul(alpha));
			const outputColor = makeVec4(
				f32,
				finalColor.x,
				finalColor.y,
				finalColor.z,
				finalAlpha
			);

			return {
				colors: [
					{
						location: 0,
						value: outputColor,
					},
				],
			};
		}
	);

	return builder.build();
}

// ============ 完整 SDF 着色器（合并版本）============

/** 创建完整的 SDF WGSL 着色器代码 */
export function createSDFShaderCode(): string {
	return `
// SDF Uniforms
struct SDFUniforms {
  resolution: vec2f,
  bounds: vec4f,
  fillColor: vec4f,
  borderColor: vec4f,
  borderWidth: f32,
  cornerRadius: f32,
  shapeType: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: SDFUniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

// Pentagon SDF
fn sdPentagon(p: vec2f, r: f32) -> f32 {
  let k = vec3f(0.809016994, 0.587785252, 0.726542528);
  var q = vec2f(abs(p.x), p.y);
  q = q - 2.0 * min(dot(vec2f(-k.x, k.y), q), 0.0) * vec2f(-k.x, k.y);
  q = q - 2.0 * min(dot(vec2f(k.x, k.y), q), 0.0) * vec2f(k.x, k.y);
  q = q - vec2f(clamp(q.x, -r * k.z, r * k.z), r);
  return length(q) * sign(q.y);
}

// Hexagon SDF
fn sdHexagon(p: vec2f, r: f32) -> f32 {
  let k = vec3f(-0.866025404, 0.5, 0.577350269);
  var q = abs(p);
  q = q - 2.0 * min(dot(k.xy, q), 0.0) * k.xy;
  q = q - vec2f(clamp(q.x, -k.z * r, k.z * r), r);
  return length(q) * sign(q.y);
}

@vertex
fn vs_main(
  @location(0) position: vec2f,
  @location(1) uv: vec2f,
) -> VertexOutput {
  var output: VertexOutput;

  let bounds = uniforms.bounds;
  let resolution = uniforms.resolution;

  // 计算像素位置
  let pixelX = bounds.x + position.x * bounds.z;
  let pixelY = bounds.y + position.y * bounds.w;

  // 转换为 NDC (-1 到 1)
  let ndcX = (pixelX / resolution.x) * 2.0 - 1.0;
  let ndcY = 1.0 - (pixelY / resolution.y) * 2.0;

  output.position = vec4f(ndcX, ndcY, 0.0, 1.0);
  output.uv = uv;

  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  let bounds = uniforms.bounds;
  let size = vec2f(bounds.z, bounds.w);
  let center = vec2f(0.5, 0.5);
  let p = input.uv - center;

  var dist: f32 = 0.0;
  let shapeType = i32(uniforms.shapeType);
  let cornerRadius = uniforms.cornerRadius;

  // Box SDF
  if (shapeType == 0) {
    let halfSize = size * 0.5 / max(size.x, size.y);
    let d = abs(p) - halfSize;
    dist = length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
  }
  // Circle SDF
  else if (shapeType == 1) {
    let radius = min(size.x, size.y) * 0.5 / max(size.x, size.y);
    dist = length(p) - radius;
  }
  // Rounded Rectangle SDF
  else if (shapeType == 2) {
    let halfSize = size * 0.5 / max(size.x, size.y);
    let r = cornerRadius / max(size.x, size.y);
    let q = abs(p) - halfSize + vec2f(r);
    dist = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
  }
  // Triangle SDF
  else if (shapeType == 3) {
    let scale = 0.4 / max(size.x, size.y) * min(size.x, size.y);
    let k = sqrt(3.0);
    var tp = p / scale;
    tp.x = abs(tp.x) - 1.0;
    tp.y = tp.y + 1.0 / k;
    if (tp.x + k * tp.y > 0.0) {
      tp = vec2f(tp.x - k * tp.y, -k * tp.x - tp.y) / 2.0;
    }
    tp.x = tp.x - clamp(tp.x, -2.0, 0.0);
    dist = -length(tp) * sign(tp.y) * scale;
  }
  // Pentagon SDF
  else if (shapeType == 4) {
    dist = sdPentagon(p, 0.4);
  }
  // Hexagon SDF
  else if (shapeType == 5) {
    dist = sdHexagon(p, 0.4);
  }

  // 抗锯齿
  let pixelSize = 1.0 / max(size.x, size.y);
  let alpha = 1.0 - smoothstep(-pixelSize, pixelSize, dist);

  // 边框处理
  let borderWidth = uniforms.borderWidth / max(size.x, size.y);
  var finalColor = uniforms.fillColor;

  if (borderWidth > 0.0) {
    let borderAlpha = 1.0 - smoothstep(-pixelSize, pixelSize, abs(dist) - borderWidth);
    finalColor = mix(finalColor, uniforms.borderColor, borderAlpha);
  }

  finalColor.a = finalColor.a * alpha;

  // 丢弃完全透明的像素
  if (finalColor.a < 0.001) {
    discard;
  }

  return finalColor;
}
`;
}

// ============ 顶点数据 ============

/** 创建 SDF 四边形顶点数据 */
export function createSDFQuadVertices(): Float32Array {
	// 每个顶点: position(x, y), uv(u, v)
	return new Float32Array([
		// 左下
		0.0, 0.0, 0.0, 0.0,
		// 右下
		1.0, 0.0, 1.0, 0.0,
		// 左上
		0.0, 1.0, 0.0, 1.0,
		// 右上
		1.0, 1.0, 1.0, 1.0,
	]);
}

/** 创建 SDF 四边形索引数据 */
export function createSDFQuadIndices(): Uint16Array {
	return new Uint16Array([
		0,
		1,
		2, // 第一个三角形
		2,
		1,
		3, // 第二个三角形
	]);
}

console.log(createSDFFragmentShader());
