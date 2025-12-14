// Core Flux API with Dependency Injection
// Implements the composition root where dependencies are wired together
import type { IRuntimeAdapter, IExecutor } from '@flux/contracts';
import { 
  Result, 
  Ok, 
  Err, 
  InitializationError, 
  NotInitializedError,
  ValidationError,
  RuntimeError,
  ErrorRecoveryContext
} from '@flux/contracts';
import { ShadowStateManager } from './shadow-state.js';
import { createCommandGraph, validateGraph, type GraphNode, type CommandGraph } from './command-graph.js';

// Configuration interface for Flux initialization
export interface FluxConfig {
  runtime: IRuntimeAdapter;
}

// Initialization state enum
enum InitializationState {
  NotInitialized = 'not-initialized',
  Initializing = 'initializing',
  Initialized = 'initialized',
  Failed = 'failed',
}

// Main Flux instance interface
export interface FluxInstance {
  // Initialization
  initialize(): Promise<Result<void, InitializationError>>;
  isInitialized(): boolean;
  getInitializationState(): InitializationState;

  // Shadow state management
  getShadowStateManager(): ShadowStateManager;

  // Command graph operations
  buildCommandGraph(nodes: GraphNode[]): Result<CommandGraph, ValidationError | NotInitializedError>;
  validateCommandGraph(graph: CommandGraph): Result<void, ValidationError | NotInitializedError>;

  // Executor access
  getExecutor(): Result<IExecutor, NotInitializedError | RuntimeError>;

  // Runtime adapter access
  getRuntime(): IRuntimeAdapter;

  // Error recovery
  getErrorRecoveryContext(): ErrorRecoveryContext;
}

// Internal Flux implementation
class Flux implements FluxInstance {
  private config: FluxConfig;
  private state: InitializationState;
  private shadowStateManager: ShadowStateManager;
  private executor: IExecutor | null;
  private initializationError: Error | null;
  private errorRecoveryContext: ErrorRecoveryContext;

  constructor(config: FluxConfig) {
    this.config = config;
    this.state = InitializationState.NotInitialized;
    this.shadowStateManager = new ShadowStateManager();
    this.executor = null;
    this.initializationError = null;
    this.errorRecoveryContext = new ErrorRecoveryContext();
  }

  async initialize(): Promise<Result<void, InitializationError>> {
    // Prevent re-initialization
    if (this.state === InitializationState.Initialized) {
      return Ok(undefined);
    }

    if (this.state === InitializationState.Initializing) {
      return Err(new InitializationError(
        'Initialization already in progress',
        { state: this.state }
      ));
    }

    try {
      this.state = InitializationState.Initializing;

      // Register cleanup handler for initialization failure
      this.errorRecoveryContext.registerCleanup(async () => {
        if (this.executor) {
          // Cleanup executor resources if needed
          this.executor = null;
        }
      });

      // Initialize the runtime adapter
      await this.config.runtime.initialize();

      // Create the executor
      this.executor = this.config.runtime.createExecutor();

      // Mark as initialized
      this.state = InitializationState.Initialized;

      return Ok(undefined);
    } catch (error) {
      this.state = InitializationState.Failed;
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      
      // Attempt cleanup on failure
      try {
        await this.errorRecoveryContext.executeCleanup();
      } catch (cleanupError) {
        // Cleanup failed - error is already captured in initializationError
      }
      
      return Err(new InitializationError(
        this.initializationError.message,
        { 
          originalError: this.initializationError.message,
          state: this.state 
        }
      ));
    }
  }

  isInitialized(): boolean {
    return this.state === InitializationState.Initialized;
  }

  getInitializationState(): InitializationState {
    return this.state;
  }

  getShadowStateManager(): ShadowStateManager {
    return this.shadowStateManager;
  }

  buildCommandGraph(nodes: GraphNode[]): Result<CommandGraph, ValidationError | NotInitializedError> {
    // Check initialization state
    if (!this.isInitialized()) {
      return Err(new NotInitializedError(
        'buildCommandGraph',
        { state: this.state }
      ));
    }

    // Build the graph
    const graphResult = createCommandGraph(nodes);

    if (!graphResult.success) {
      return Err(graphResult.error);
    }

    // Validate the graph
    const validation = validateGraph(graphResult.value);

    if (!validation.valid) {
      const errorMessages = validation.errors?.join('; ') || 'Unknown validation error';
      return Err(new ValidationError(
        `Command graph validation failed: ${errorMessages}`,
        { errors: validation.errors }
      ));
    }

    return Ok(graphResult.value);
  }

  validateCommandGraph(graph: CommandGraph): Result<void, ValidationError | NotInitializedError> {
    // Check initialization state
    if (!this.isInitialized()) {
      return Err(new NotInitializedError(
        'validateCommandGraph',
        { state: this.state }
      ));
    }

    const validation = validateGraph(graph);

    if (!validation.valid) {
      const errorMessages = validation.errors?.join('; ') || 'Unknown validation error';
      return Err(new ValidationError(
        `Command graph validation failed: ${errorMessages}`,
        { errors: validation.errors }
      ));
    }

    return Ok(undefined);
  }

  getExecutor(): Result<IExecutor, NotInitializedError | RuntimeError> {
    if (!this.isInitialized()) {
      return Err(new NotInitializedError(
        'getExecutor',
        { state: this.state }
      ));
    }

    if (!this.executor) {
      return Err(new RuntimeError(
        'Executor not available',
        { state: this.state }
      ));
    }

    return Ok(this.executor);
  }

  getRuntime(): IRuntimeAdapter {
    return this.config.runtime;
  }

  getErrorRecoveryContext(): ErrorRecoveryContext {
    return this.errorRecoveryContext;
  }
}

// Factory function to create a Flux instance
export function createFlux(config: FluxConfig): FluxInstance {
  if (!config.runtime) {
    throw new InitializationError(
      'FluxConfig must include a runtime adapter',
      { providedConfig: config }
    );
  }

  return new Flux(config);
}
