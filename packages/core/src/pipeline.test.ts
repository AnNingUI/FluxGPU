// Tests for pipeline composition API
import { describe, it, expect } from 'vitest';
import { createPipeline, type Pipeline, type PipelineOperation, type Middleware } from './pipeline.js';

describe('Pipeline Composition API', () => {
  describe('Factory function (Requirement 4.1)', () => {
    it('should create a pipeline using factory function', () => {
      const pipeline = createPipeline();
      expect(pipeline).toBeDefined();
      expect(typeof pipeline.pipe).toBe('function');
      expect(typeof pipeline.execute).toBe('function');
      expect(typeof pipeline.use).toBe('function');
    });

    it('should create an identity pipeline when no operations are added', () => {
      const pipeline = createPipeline<number>();
      const result = pipeline.execute(42);
      expect(result).toBe(42);
    });
  });

  describe('Pipeline chaining (Requirement 4.2)', () => {
    it('should support chaining via pipe method', () => {
      const add5: PipelineOperation<number, number> = (x) => x + 5;
      const multiply2: PipelineOperation<number, number> = (x) => x * 2;

      const pipeline = createPipeline<number>()
        .pipe(add5)
        .pipe(multiply2);

      expect(pipeline).toBeDefined();
      expect(typeof pipeline.pipe).toBe('function');
    });

    it('should return a new pipeline object on each pipe call', () => {
      const add5: PipelineOperation<number, number> = (x) => x + 5;
      const multiply2: PipelineOperation<number, number> = (x) => x * 2;

      const pipeline1 = createPipeline<number>();
      const pipeline2 = pipeline1.pipe(add5);
      const pipeline3 = pipeline2.pipe(multiply2);

      // Each pipe returns a new object
      expect(pipeline1).not.toBe(pipeline2);
      expect(pipeline2).not.toBe(pipeline3);
      
      // Original pipeline is unchanged
      expect(pipeline1.execute(10)).toBe(10);
      expect(pipeline2.execute(10)).toBe(15);
      expect(pipeline3.execute(10)).toBe(30);
    });

    it('should support arbitrary chaining depth', () => {
      const add1: PipelineOperation<number, number> = (x) => x + 1;
      
      let pipeline = createPipeline<number>();
      for (let i = 0; i < 10; i++) {
        pipeline = pipeline.pipe(add1);
      }

      const result = pipeline.execute(0);
      expect(result).toBe(10);
    });

    it('should support type transformations through the chain', () => {
      const numToString: PipelineOperation<number, string> = (x) => x.toString();
      const stringLength: PipelineOperation<string, number> = (s) => s.length;
      const isEven: PipelineOperation<number, boolean> = (n) => n % 2 === 0;

      const pipeline = createPipeline<number>()
        .pipe(numToString)
        .pipe(stringLength)
        .pipe(isEven);

      expect(pipeline.execute(12345)).toBe(false); // "12345".length = 5, which is odd
      expect(pipeline.execute(1234)).toBe(true);   // "1234".length = 4, which is even
    });
  });

  describe('Middleware insertion (Requirement 4.3)', () => {
    it('should allow inserting middleware functions', () => {
      const add5: PipelineOperation<number, number> = (x) => x + 5;
      const loggingMiddleware: Middleware<number> = (data, next) => {
        return next(data);
      };

      const pipeline = createPipeline<number>()
        .use(loggingMiddleware)
        .pipe(add5);

      const result = pipeline.execute(10);
      expect(result).toBe(15);
    });

    it('should call middleware with access to data flow', () => {
      const calls: number[] = [];
      
      const add5: PipelineOperation<number, number> = (x) => x + 5;
      const trackingMiddleware: Middleware<number> = (data, next) => {
        calls.push(data);
        const result = next(data);
        calls.push(result);
        return result;
      };

      const pipeline = createPipeline<number>()
        .use(trackingMiddleware)
        .pipe(add5);

      pipeline.execute(10);
      
      // Middleware should see both input and output
      expect(calls).toContain(10);
      expect(calls).toContain(15);
    });

    it('should allow middleware to transform data', () => {
      const add5: PipelineOperation<number, number> = (x) => x + 5;
      const doubleMiddleware: Middleware<number> = (data, next) => {
        const result = next(data);
        return result * 2;
      };

      const pipeline = createPipeline<number>()
        .use(doubleMiddleware)
        .pipe(add5);

      const result = pipeline.execute(10);
      expect(result).toBe(30); // (10 + 5) * 2
    });

    it('should support multiple middleware', () => {
      const add5: PipelineOperation<number, number> = (x) => x + 5;
      
      const middleware1: Middleware<number> = (data, next) => {
        return next(data) + 1;
      };
      
      const middleware2: Middleware<number> = (data, next) => {
        return next(data) * 2;
      };

      const pipeline = createPipeline<number>()
        .use(middleware1)
        .use(middleware2)
        .pipe(add5);

      // Execution: ((10 + 5) * 2) + 1 = 31
      const result = pipeline.execute(10);
      expect(result).toBe(31);
    });

    it('should return a new pipeline object on each use call', () => {
      const middleware: Middleware<number> = (data, next) => next(data);
      
      const pipeline1 = createPipeline<number>();
      const pipeline2 = pipeline1.use(middleware);

      expect(pipeline1).not.toBe(pipeline2);
    });
  });

  describe('Execution order (Requirement 4.4)', () => {
    it('should execute operations in composition order', () => {
      const operations: string[] = [];
      
      const op1: PipelineOperation<number, number> = (x) => {
        operations.push('op1');
        return x + 1;
      };
      
      const op2: PipelineOperation<number, number> = (x) => {
        operations.push('op2');
        return x * 2;
      };
      
      const op3: PipelineOperation<number, number> = (x) => {
        operations.push('op3');
        return x - 3;
      };

      const pipeline = createPipeline<number>()
        .pipe(op1)
        .pipe(op2)
        .pipe(op3);

      pipeline.execute(5);

      expect(operations).toEqual(['op1', 'op2', 'op3']);
    });

    it('should pass output of each operation to the next', () => {
      const add10: PipelineOperation<number, number> = (x) => x + 10;
      const multiply3: PipelineOperation<number, number> = (x) => x * 3;
      const subtract5: PipelineOperation<number, number> = (x) => x - 5;

      const pipeline = createPipeline<number>()
        .pipe(add10)
        .pipe(multiply3)
        .pipe(subtract5);

      // (5 + 10) * 3 - 5 = 15 * 3 - 5 = 45 - 5 = 40
      const result = pipeline.execute(5);
      expect(result).toBe(40);
    });

    it('should execute operations in order regardless of when they were added', () => {
      const results: number[] = [];
      
      const track = (label: number): PipelineOperation<number, number> => (x) => {
        results.push(label);
        return x;
      };

      const pipeline = createPipeline<number>()
        .pipe(track(1))
        .pipe(track(2))
        .pipe(track(3))
        .pipe(track(4))
        .pipe(track(5));

      pipeline.execute(0);

      expect(results).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Complex composition scenarios', () => {
    it('should handle pipelines with both operations and middleware', () => {
      const executionLog: string[] = [];
      
      const op1: PipelineOperation<number, number> = (x) => {
        executionLog.push('op1');
        return x + 1;
      };
      
      const op2: PipelineOperation<number, number> = (x) => {
        executionLog.push('op2');
        return x * 2;
      };
      
      const middleware: Middleware<number> = (data, next) => {
        executionLog.push('middleware-before');
        const result = next(data);
        executionLog.push('middleware-after');
        return result;
      };

      const pipeline = createPipeline<number>()
        .use(middleware)
        .pipe(op1)
        .pipe(op2);

      const result = pipeline.execute(5);

      // (5 + 1) * 2 = 12
      expect(result).toBe(12);
      
      // Middleware wraps each operation
      expect(executionLog).toContain('middleware-before');
      expect(executionLog).toContain('middleware-after');
      expect(executionLog).toContain('op1');
      expect(executionLog).toContain('op2');
    });

    it('should support building pipelines incrementally', () => {
      const base = createPipeline<number>();
      
      const withAdd = base.pipe((x: number) => x + 10);
      const withMultiply = withAdd.pipe((x: number) => x * 2);
      const withSubtract = withMultiply.pipe((x: number) => x - 5);

      expect(base.execute(5)).toBe(5);
      expect(withAdd.execute(5)).toBe(15);
      expect(withMultiply.execute(5)).toBe(30);
      expect(withSubtract.execute(5)).toBe(25);
    });

    it('should support reusing pipeline segments', () => {
      const normalize = createPipeline<number>()
        .pipe((x: number) => Math.abs(x))
        .pipe((x: number) => Math.min(x, 100));

      const pipeline1 = normalize.pipe((x: number) => x * 2);
      const pipeline2 = normalize.pipe((x: number) => x + 50);

      expect(pipeline1.execute(-150)).toBe(200); // abs(-150) = 150, min(150, 100) = 100, 100 * 2 = 200
      expect(pipeline2.execute(-150)).toBe(150); // abs(-150) = 150, min(150, 100) = 100, 100 + 50 = 150
    });

    it('should handle empty pipeline execution', () => {
      const pipeline = createPipeline<string>();
      const result = pipeline.execute('test');
      expect(result).toBe('test');
    });

    it('should handle complex data transformations', () => {
      interface User {
        name: string;
        age: number;
      }

      const extractAge: PipelineOperation<User, number> = (user) => user.age;
      const isAdult: PipelineOperation<number, boolean> = (age) => age >= 18;
      const toMessage: PipelineOperation<boolean, string> = (adult) => 
        adult ? 'Access granted' : 'Access denied';

      const pipeline = createPipeline<User>()
        .pipe(extractAge)
        .pipe(isAdult)
        .pipe(toMessage);

      expect(pipeline.execute({ name: 'Alice', age: 25 })).toBe('Access granted');
      expect(pipeline.execute({ name: 'Bob', age: 16 })).toBe('Access denied');
    });
  });

  describe('Edge cases', () => {
    it('should handle operations that return undefined', () => {
      const returnUndefined: PipelineOperation<number, undefined> = () => undefined;
      const handleUndefined: PipelineOperation<undefined, string> = (x) => 
        x === undefined ? 'was undefined' : 'had value';

      const pipeline = createPipeline<number>()
        .pipe(returnUndefined)
        .pipe(handleUndefined);

      expect(pipeline.execute(42)).toBe('was undefined');
    });

    it('should handle operations that return null', () => {
      const returnNull: PipelineOperation<number, null> = () => null;
      const handleNull: PipelineOperation<null, string> = (x) => 
        x === null ? 'was null' : 'had value';

      const pipeline = createPipeline<number>()
        .pipe(returnNull)
        .pipe(handleNull);

      expect(pipeline.execute(42)).toBe('was null');
    });

    it('should handle middleware that does not call next', () => {
      const shortCircuit: Middleware<number> = (data) => {
        return 999; // Don't call next
      };

      const neverCalled: PipelineOperation<number, number> = (x) => {
        throw new Error('Should not be called');
      };

      const pipeline = createPipeline<number>()
        .use(shortCircuit)
        .pipe(neverCalled);

      expect(pipeline.execute(42)).toBe(999);
    });
  });
});
