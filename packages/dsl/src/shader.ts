// Functional shader composition using atoms and molecules

/**
 * WGSLSnippet represents a shader code fragment with its dependencies
 */
export interface WGSLSnippet {
  code: string;
  dependencies: string[];
}

/**
 * Atom is a pure function that returns a WGSL snippet
 * Atoms are the building blocks of shader composition
 */
export type Atom = () => WGSLSnippet;

/**
 * Molecule is a function that accepts atoms and composes them
 * into a more complex WGSL snippet
 */
export type Molecule = (deps: Record<string, Atom>) => WGSLSnippet;

/**
 * Example atom: Simplex noise function
 */
export const simplexNoise: Atom = () => ({
  code: `fn simplexNoise(p: vec3<f32>) -> f32 {
  // Simplified 3D simplex noise implementation
  let s = dot(p, vec3<f32>(0.333333));
  let i = floor(p + s);
  let x0 = p - i + dot(i, vec3<f32>(0.166667));
  
  let e = step(vec3<f32>(0.0), x0 - x0.yzx);
  let i1 = e * (1.0 - e.zxy);
  let i2 = 1.0 - e.zxy * (1.0 - e);
  
  let x1 = x0 - i1 + 0.166667;
  let x2 = x0 - i2 + 0.333333;
  let x3 = x0 - 0.5;
  
  let h = max(0.6 - vec4<f32>(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4<f32>(0.0));
  let n = h * h * h * h;
  
  return dot(n, vec4<f32>(1.0));
}`,
  dependencies: [],
});

/**
 * Example atom: Fractional Brownian Motion (FBM)
 */
export const fbm: Atom = () => ({
  code: `fn fbm(p: vec3<f32>, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var position = p;
  
  for (var i = 0; i < octaves; i = i + 1) {
    value = value + amplitude * simplexNoise(position * frequency);
    frequency = frequency * 2.0;
    amplitude = amplitude * 0.5;
  }
  
  return value;
}`,
  dependencies: ['simplexNoise'],
});

/**
 * Example atom: Turbulence function
 */
export const turbulence: Atom = () => ({
  code: `fn turbulence(p: vec3<f32>, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var position = p;
  
  for (var i = 0; i < octaves; i = i + 1) {
    value = value + amplitude * abs(simplexNoise(position * frequency));
    frequency = frequency * 2.0;
    amplitude = amplitude * 0.5;
  }
  
  return value;
}`,
  dependencies: ['simplexNoise'],
});

/**
 * Compose multiple atoms into a molecule
 * This function aggregates atoms via dependency injection
 */
export function compose(deps: Record<string, Atom>): WGSLSnippet {
  const allDependencies = new Set<string>();
  const codes: string[] = [];
  
  // Collect all dependencies and code from provided atoms
  for (const [name, atom] of Object.entries(deps)) {
    const snippet = atom();
    codes.push(snippet.code);
    snippet.dependencies.forEach(dep => allDependencies.add(dep));
  }
  
  return {
    code: codes.join('\n'),
    dependencies: Array.from(allDependencies),
  };
}

/**
 * Registry of all available atoms by name
 */
const shaderAtomRegistry = new Map<string, Atom>([
  ['simplexNoise', simplexNoise],
  ['fbm', fbm],
  ['turbulence', turbulence],
]);

/**
 * Register a custom atom
 */
export function registerAtom(name: string, atom: Atom): void {
  shaderAtomRegistry.set(name, atom);
}

/**
 * Get an atom by name from the registry
 */
export function getAtom(name: string): Atom | undefined {
  return shaderAtomRegistry.get(name);
}

/**
 * Walk the dependency tree and collect all required atoms
 * This implements tree shaking by only including referenced atoms
 */
function collectDependencies(
  rootSnippet: WGSLSnippet,
  visited: Set<string> = new Set()
): Map<string, WGSLSnippet> {
  const collected = new Map<string, WGSLSnippet>();
  
  // Process dependencies recursively
  for (const depName of rootSnippet.dependencies) {
    if (visited.has(depName)) {
      continue; // Already processed
    }
    
    visited.add(depName);
    const atom = shaderAtomRegistry.get(depName);
    
    if (!atom) {
      throw new Error(`Dependency '${depName}' not found in atom registry`);
    }
    
    const snippet = atom();
    collected.set(depName, snippet);
    
    // Recursively collect transitive dependencies
    const transitive = collectDependencies(snippet, visited);
    for (const [name, dep] of transitive) {
      collected.set(name, dep);
    }
  }
  
  return collected;
}

/**
 * Compile a shader by walking the dependency tree
 * This function performs tree shaking to exclude unused atoms
 */
export function compileShader(root: Molecule | WGSLSnippet): string {
  // Get the root snippet
  const rootSnippet = typeof root === 'function' 
    ? root({}) 
    : root;
  
  // Collect all required dependencies (tree shaking)
  const dependencies = collectDependencies(rootSnippet);
  
  // Build the final shader code
  const parts: string[] = [];
  
  // Add dependencies in order (dependencies first)
  const sortedDeps = topologicalSort(dependencies);
  for (const depName of sortedDeps) {
    const snippet = dependencies.get(depName);
    if (snippet) {
      parts.push(snippet.code);
    }
  }
  
  // Add root code last
  parts.push(rootSnippet.code);
  
  return parts.join('\n\n');
}

/**
 * Topologically sort dependencies to ensure correct ordering
 */
function topologicalSort(dependencies: Map<string, WGSLSnippet>): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(name: string): void {
    if (visited.has(name)) {
      return;
    }
    
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }
    
    visiting.add(name);
    
    const snippet = dependencies.get(name);
    if (snippet) {
      // Visit dependencies first
      for (const dep of snippet.dependencies) {
        if (dependencies.has(dep)) {
          visit(dep);
        }
      }
    }
    
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }
  
  // Visit all nodes
  for (const name of dependencies.keys()) {
    visit(name);
  }
  
  return sorted;
}
