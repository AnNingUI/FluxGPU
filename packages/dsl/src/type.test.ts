// bun run ./packages/dsl/src/type.test.ts
import {
	defineStruct,
	f32,
	Fn,
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
const addf = Fn.name("addf")
	.input(["a", f32], ["b", f32])
	.output(f32)
	.body((ctx) => {
		const a = ctx.$("a");
		const b = ctx.$("b");
		const c = ctx.val("c", a.add(b));
		return a.add(b);
	});
const _0 = lit(0, f32);
const _1 = lit(1, f32);
const _2 = lit(2, f32);
const _05 = lit(0.5, f32);
export function createSDFFragmentShader(): string {
	const builder = shader();

	const uniforms = builder.uniform("uniforms", SDFUniformStruct, 0, 0);
	builder.injectFn(addf);
	builder.fragment(
		{
			inputs: {
				vUv: { location: 0, type: vec2() },
			},
		},
		(ctx, builtins, inputs) => {
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
						const halfSize = ctx.val(
							"halfSize",
							size.mul(_05).div(ctx.builtins.max(size.x, size.y))
						);
						const r = ctx.val(
							"r",
							cornerRadius.div(ctx.builtins.max(size.x, size.y))
						);
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
					const radius = ctx.val(
						"radius",
						ctx.builtins
							.min(size.x, size.y)
							.mul(ctx.builtins.max(size.x, size.y).div(_2))
					);
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
					borderAlpha
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

			// 测试函数dsl是否成功
			const test = ctx.val("testt", addf.call(_0, _2));

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

console.log(createSDFFragmentShader());
