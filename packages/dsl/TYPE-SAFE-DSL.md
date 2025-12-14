# Type-Safe WGSL DSL (v2)

完整的类型安�?WGSL 着色器 DSL，提供完整的 TypeScript 类型推断�?IntelliSense 支持�?

## 特�?

�?**完整的类型安�?* - 所�?WGSL 类型都有对应�?TypeScript 类型  
�?**智能类型推断** - 自动推断表达式类�? 
�?**结构体字段访�?* - 类型安全的字段访问，错误的字段名会在编译时报�? 
�?**向量 Swizzling** - 完整支持 `.x`, `.xy`, `.rgb` �? 
�?**所�?WGSL 内置函数** - 100+ 个内置函数，全部类型安全  
�?**操作符重�?* - 支持 `+`, `-`, `*`, `/`, `==`, `<` 等所有操作符  
�?**Unsafe 逃生�?* - 需要时可以注入原始 WGSL 代码  

## 快速开�?

```typescript
import { DSLv2, TypeSystem, Builtins } from '@fluxgpu/dsl';

const { shader } = DSLv2;
const { f32, vec2, vec3, array, struct } = TypeSystem;
const { normalize, length, dot } = Builtins;

// 定义结构�?
const ParticleType = struct('Particle', {
  position: vec3(f32),
  velocity: vec3(f32),
  mass: f32,
});

// 创建着色器
const code = shader()
  .defineStruct('Particle', {
    position: vec3(f32),
    velocity: vec3(f32),
    mass: f32,
  })
  .compute([256], (ctx) => {
    // 类型安全的存储缓冲区
    const particles = ctx.storageBuffer(
      'particles',
      0,
      0,
      array(ParticleType),
      'read_write'
    );

    // 类型安全的变量声�?
    const index = ctx.let('index', u32, lit(0, u32));
    const particle = ctx.var('particle', ParticleType, particles.at(index));
    
    // 类型安全的字段访�?- IDE 会提示可用字段！
    const pos = particle.field('position');
    const vel = particle.field('velocity');
    const mass = particle.field('mass');
    
    // 类型安全的向量操�?
    const dir = normalize(vel);
    const speed = length(vel);
    
    // 类型安全的算术运�?
    const newVel = vel.add(dir.mul(speed));
    
    // 赋�?
    ctx.unsafeInjectWGSL(vel.assign(newVel));
  })
  .build();

console.log(code);
```

## 类型系统

### 标量类型

```typescript
import { TypeSystem } from '@fluxgpu/dsl';
const { bool, i32, u32, f32, f16 } = TypeSystem;

// 创建字面�?
const x = lit(1.0, f32);  // f32
const y = lit(42, i32);   // i32
const z = litBool(true);  // bool
```

### 向量类型

```typescript
const { vec2, vec3, vec4 } = TypeSystem;

// 创建向量类型
const v2 = vec2(f32);  // vec2<f32>
const v3 = vec3(i32);  // vec3<i32>
const v4 = vec4(u32);  // vec4<u32>

// 向量字面�?
const pos = litVec3(1.0, 2.0, 3.0);

// Swizzling - 完全类型安全�?
const x = pos.x;      // Expr<F32Type>
const xy = pos.xy;    // VecExpr<Vec2Type<F32Type>>
const rgb = pos.rgb;  // VecExpr<Vec3Type<F32Type>>
```

### 矩阵类型

```typescript
const { mat2x2, mat3x3, mat4x4 } = TypeSystem;

const m4 = mat4x4(f32);  // mat4x4<f32>
```

### 数组类型

```typescript
const { array } = TypeSystem;

// 固定大小数组
const arr1 = array(f32, 100);

// 运行时大小数�?
const arr2 = array(vec3(f32));
```

### 结构体类�?

```typescript
const { struct } = TypeSystem;

const ParticleType = struct('Particle', {
  position: vec3(f32),
  velocity: vec3(f32),
  mass: f32,
  active: bool,
});

// 使用时会有完整的字段类型推断
```

## 内置函数

### 数学函数

```typescript
import { Builtins } from '@fluxgpu/dsl';
const {
  abs, acos, asin, atan, atan2,
  ceil, floor, round, trunc, fract,
  sin, cos, tan, sinh, cosh, tanh,
  exp, exp2, log, log2,
  pow, sqrt, inverseSqrt,
  min, max, clamp, saturate,
  mix, smoothstep, step,
  sign, degrees, radians,
} = Builtins;

// 所有函数都是类型安全的
const x = lit(0.5);
const y = sin(x);        // Expr<F32Type>
const z = abs(y);        // Expr<F32Type>
const w = clamp(z, lit(0.0), lit(1.0));  // Expr<F32Type>
```

### 向量函数

```typescript
const {
  dot, cross, length, distance,
  normalize, faceForward, reflect, refract,
} = Builtins;

const v1 = litVec3(1.0, 0.0, 0.0);
const v2 = litVec3(0.0, 1.0, 0.0);

const d = dot(v1, v2);           // Expr<F32Type>
const c = cross(v1, v2);         // VecExpr<Vec3Type<F32Type>>
const len = length(v1);          // Expr<F32Type>
const norm = normalize(v1);      // VecExpr<Vec3Type<F32Type>>
```

### 矩阵函数

```typescript
const { determinant, transpose } = Builtins;

// 类型安全的矩阵操�?
```

### 比较函数

```typescript
const { all, any, select } = Builtins;

const condition = x.gt(lit(0.5));
const result = select(lit(0.0), lit(1.0), condition);
```

## 操作�?

### 算术操作�?

```typescript
const a = lit(1.0);
const b = lit(2.0);

const sum = a.add(b);      // a + b
const diff = a.sub(b);     // a - b
const prod = a.mul(b);     // a * b
const quot = a.div(b);     // a / b
const mod = a.mod(b);      // a % b
const neg = a.neg();       // -a
```

### 比较操作�?

```typescript
const eq = a.eq(b);        // a == b  -> Expr<BoolType>
const ne = a.ne(b);        // a != b
const lt = a.lt(b);        // a < b
const le = a.le(b);        // a <= b
const gt = a.gt(b);        // a > b
const ge = a.ge(b);        // a >= b
```

### 逻辑操作�?

```typescript
const cond1 = litBool(true);
const cond2 = litBool(false);

const and = cond1.and(cond2);   // cond1 && cond2
const or = cond1.or(cond2);     // cond1 || cond2
const not = cond1.not();        // !cond1
```

### 位操作符

```typescript
const x = lit(0b1010, u32);
const y = lit(0b1100, u32);

const and = x.bitAnd(y);   // x & y
const or = x.bitOr(y);     // x | y
const xor = x.bitXor(y);   // x ^ y
const not = x.bitNot();    // ~x
const shl = x.shl(lit(2, u32));  // x << 2
const shr = x.shr(lit(2, u32));  // x >> 2
```

### 赋值操作符

```typescript
// 这些返回字符串，需要用 ctx.unsafeInjectWGSL() 注入
ctx.unsafeInjectWGSL(x.assign(y));        // x = y
ctx.unsafeInjectWGSL(x.addAssign(y));     // x += y
ctx.unsafeInjectWGSL(x.subAssign(y));     // x -= y
ctx.unsafeInjectWGSL(x.mulAssign(y));     // x *= y
ctx.unsafeInjectWGSL(x.divAssign(y));     // x /= y
ctx.unsafeInjectWGSL(x.modAssign(y));     // x %= y
```

## 控制�?

### If 语句

```typescript
shader().compute([64], (ctx) => {
  const x = ctx.let('x', f32, lit(1.0));
  
  ctx.if(
    x.gt(lit(0.5)),
    () => {
      // then 分支
      ctx.unsafeInjectWGSL('// do something');
    },
    () => {
      // else 分支（可选）
      ctx.unsafeInjectWGSL('// do something else');
    }
  );
});
```

### For 循环

```typescript
ctx.for(
  'var i = 0u',                    // 初始�?
  lit(10, u32).gt(lit(0, u32)),   // 条件
  'i = i + 1u',                    // 更新
  () => {
    // 循环�?
  }
);
```

### While 循环

```typescript
ctx.while(
  condition,
  () => {
    // 循环�?
  }
);
```

## 完整示例：粒子系�?

```typescript
import { DSLv2, TypeSystem, Builtins } from '@fluxgpu/dsl';

const { shader } = DSLv2;
const { f32, vec2, vec3, array, struct } = TypeSystem;
const { normalize, length } = Builtins;

const ParticleType = struct('Particle', {
  position: vec2(f32),
  velocity: vec2(f32),
  targetPos: vec2(f32),
  life: f32,
});

const UniformsType = struct('Uniforms', {
  deltaTime: f32,
  time: f32,
  attraction: f32,
  turbulence: f32,
});

const computeShader = shader()
  .defineStruct('Particle', {
    position: vec2(f32),
    velocity: vec2(f32),
    targetPos: vec2(f32),
    life: f32,
  })
  .defineStruct('Uniforms', {
    deltaTime: f32,
    time: f32,
    attraction: f32,
    turbulence: f32,
  })
  .compute([256], (ctx) => {
    const particles = ctx.storageBuffer(
      'particles',
      0,
      0,
      array(ParticleType),
      'read_write'
    );

    const uniforms = ctx.uniformBuffer('uniforms', 0, 1, UniformsType);

    // 获取粒子索引
    ctx.unsafeInjectWGSL('let index = global_invocation_id.x;');
    
    // 加载粒子
    const particle = ctx.var('particle', ParticleType);
    ctx.unsafeInjectWGSL(`particle = particles[index];`);
    
    // 计算�?
    const toTarget = particle.field('targetPos').sub(particle.field('position'));
    const distance = length(toTarget);
    const direction = normalize(toTarget);
    
    const attractionForce = direction
      .mul(uniforms.field('attraction'))
      .mul(distance)
      .mul(lit(0.5));
    
    // 更新速度
    const newVel = particle.field('velocity')
      .add(attractionForce.mul(uniforms.field('deltaTime')))
      .mul(lit(0.95)); // 阻尼
    
    // 更新位置
    const newPos = particle.field('position')
      .add(newVel.mul(uniforms.field('deltaTime')));
    
    // 写回
    ctx.unsafeInjectWGSL(particle.field('velocity').assign(newVel));
    ctx.unsafeInjectWGSL(particle.field('position').assign(newPos));
    ctx.unsafeInjectWGSL(`particles[index] = particle;`);
  })
  .build();

console.log(computeShader);
```

## 与旧 API 的对�?

### �?API (v1)
```typescript
// 需要手写字符串，没有类型检�?
const code = `
struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
}

@compute @workgroup_size(256)
fn main() {
  let particle = particles[index];
  let pos = particle.position;  // 拼写错误不会被发现！
}
`;
```

### �?API (v2)
```typescript
// 完全类型安全，IDE 会提示所有可用字�?
const code = shader()
  .defineStruct('Particle', {
    position: vec2(f32),
    velocity: vec2(f32),
  })
  .compute([256], (ctx) => {
    const particle = ctx.var('particle', ParticleType);
    const pos = particle.field('position');  // 类型安全！拼写错误会报错
  })
  .build();
```

## 最佳实�?

1. **使用类型推断** - �?TypeScript 自动推断类型
2. **避免过度使用 unsafeInjectWGSL** - 尽量使用类型安全�?API
3. **定义可重用的结构�?* - 在多个着色器间共享类型定�?
4. **利用 IntelliSense** - IDE 会提示所有可用的方法和字�?
5. **组合小函�?* - 使用 `.fn()` 定义可重用的着色器函数

## 未来计划

- [ ] 更好的控制流 API（不需�?unsafeInjectWGSL�?
- [ ] 纹理和采样器的完整支�?
- [ ] 自动生成绑定组布局
- [ ] 着色器优化和死代码消除
- [ ] 更多示例和文�?
