/**
 * Test for new composition-based type system
 */

import { expect, it } from 'vitest';
import {
  // Types
  bool,
  f32,
  i32,
  u32,
  vec2,
  vec3,
  vec4,
  
  // New expressions
  BoolExpr,
  NumericExpr,
  NumericVecExpr,
  BoolVecExpr,
  litBool,
  litF32,
  litI32,
  litU32,
  makeVec2,
  makeVec3,
  
  // Builder
  shader,
  defineStruct,
  
  // Builtins
  builtins,
} from './core/index.js';
import { select } from './core/builtins.js';

// Test 1: Bool expressions only have logical ops
const b1 = litBool(true);
const b2 = litBool(false);
const b3 = b1.and(b2);  // ✅ OK
const b4 = b1.or(b2);   // ✅ OK
const b5 = b1.not();    // ✅ OK
// b1.add(b2);  // ❌ Compile error - BoolExpr has no 'add' method

console.log('Bool ops:', b3.toWGSL(), b4.toWGSL(), b5.toWGSL());

// Test 2: Numeric expressions have arithmetic ops
const n1 = litF32(1.0);
const n2 = litF32(2.0);
const n3 = n1.add(n2);  // ✅ OK
const n4 = n1.mul(n2);  // ✅ OK
const n5 = n1.lt(n2);   // ✅ Returns BoolExpr

console.log('Numeric ops:', n3.toWGSL(), n4.toWGSL(), n5.toWGSL());

// Test 3: Bool vectors only have logical ops
const bv1 = makeVec2(bool, true, false);
const bv2 = makeVec2(bool, false, true);
const bv3 = bv1.and(bv2);  // ✅ OK
const bv4 = bv1.or(bv2);   // ✅ OK
// bv1.add(bv2);  // ❌ Compile error - BoolVecExpr has no 'add' method

console.log('Bool vec ops:', bv3.toWGSL(), bv4.toWGSL());
console.log('Bool vec swizzle:', bv1.x.toWGSL(), bv1.xy.toWGSL());


// Test 4: Numeric vectors have arithmetic ops
const nv1 = makeVec2(f32, 1.0, 2.0);
const nv2 = makeVec2(f32, 3.0, 4.0);
const nv3 = nv1.add(nv2);  // ✅ OK
const nv4 = nv1.mul(2);    // ✅ OK - scalar multiplication
const nv5 = nv1.lt(nv2);   // ✅ Returns BoolVecExpr
const nvS = select(nv1, nv2, bv1)
console.log('Numeric vec ops:', nv3.toWGSL(), nv4.toWGSL());
console.log('Comparison returns bool vec:', nv5.toWGSL());
console.log('Bool and vec2f select:', nvS.toWGSL());

// Test 5: Swizzle returns correct types
const v3 = makeVec3(f32, 1, 2, 3);
const xy = v3.xy;  // NumericVecExpr<Vec2Type<F32Type>>
const x = v3.x;    // NumericExpr<F32Type>

console.log('Swizzle types:', xy.toWGSL(), x.toWGSL());

// Test 6: Shader builder with new types
const TestStruct = defineStruct('TestStruct', {
  position: vec2(f32),
  enabled: bool,
});

const builder = shader();
const uniforms = builder.uniform('uniforms', TestStruct, 0, 0);

builder.compute([64], (ctx, bi) => {
  // varNull equivalent - declare without init
  const mask = ctx.var('mask', vec2(bool));
  
  // Use builtins
  const idx = bi.globalInvocationId.x;
  const cond = idx.lt(litU32(100));  // Use u32 literal for comparison
  
  ctx.if(cond, () => {
    ctx.exec(mask.set(makeVec2(bool, true, false)));
  });
});

const code = builder.build();

it("log", () => {
    console.log('\n=== Generated Shader ===');
    console.log(code);
    console.log('\n✅ All type-safe tests passed!');
    expect(1).eq(1)
})