// Pipeline composition API
// Implements functional composition over inheritance
// Requirements: 4.1, 4.2, 4.3, 4.4

// PipelineOperation type - transforms input to output
export type PipelineOperation<TIn = any, TOut = any> = (input: TIn) => TOut;

// Middleware type - wraps operations with cross-cutting concerns
export type Middleware<T = any> = (
  data: T,
  next: (data: T) => T
) => T;

// Pipeline interface with fluent API
export interface Pipeline<TIn = any, TOut = any> {
  // Chain operations
  pipe<TNext>(operation: PipelineOperation<TOut, TNext>): Pipeline<TIn, TNext>;
  
  // Insert middleware
  use(middleware: Middleware<any>): Pipeline<TIn, TOut>;
  
  // Execute the pipeline
  execute(input: TIn): TOut;
}

// Internal pipeline implementation
class PipelineImpl<TIn, TOut> implements Pipeline<TIn, TOut> {
  private operations: PipelineOperation<any, any>[];
  private middlewares: Middleware<any>[];

  constructor(
    operations: PipelineOperation<any, any>[] = [],
    middlewares: Middleware<any>[] = []
  ) {
    this.operations = operations;
    this.middlewares = middlewares;
  }

  pipe<TNext>(operation: PipelineOperation<TOut, TNext>): Pipeline<TIn, TNext> {
    // Return new pipeline with added operation (immutable)
    return new PipelineImpl<TIn, TNext>(
      [...this.operations, operation],
      [...this.middlewares]
    );
  }

  use(middleware: Middleware<any>): Pipeline<TIn, TOut> {
    // Return new pipeline with added middleware (immutable)
    return new PipelineImpl<TIn, TOut>(
      [...this.operations],
      [...this.middlewares, middleware]
    );
  }

  execute(input: TIn): TOut {
    // If no operations, return input as-is (identity)
    if (this.operations.length === 0) {
      return input as any;
    }

    // Build the execution chain
    // Operations execute in the order they were added via pipe
    let result: any = input;

    for (let i = 0; i < this.operations.length; i++) {
      const operation = this.operations[i];
      
      // Apply middleware if any exist
      if (this.middlewares.length > 0) {
        // Wrap the operation with all middleware
        const wrappedOperation = this.applyMiddleware(operation, result);
        result = wrappedOperation(result);
      } else {
        // Execute operation directly
        result = operation(result);
      }
    }

    return result;
  }

  private applyMiddleware<T>(
    operation: PipelineOperation<T, any>,
    data: T
  ): PipelineOperation<T, any> {
    // Build middleware chain from right to left
    // Each middleware wraps the next, with the operation at the core
    let chain = operation;

    // Apply middleware in reverse order so they execute in the order they were added
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const currentChain = chain;
      
      chain = (input: T) => {
        return middleware(input, (d) => currentChain(d));
      };
    }

    return chain;
  }
}

// Factory function to create a pipeline
// Requirements: 4.1 - Provides factory function rather than base class
export function createPipeline<T = any>(): Pipeline<T, T> {
  return new PipelineImpl<T, T>();
}
