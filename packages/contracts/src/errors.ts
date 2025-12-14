// Error types and Result type for domain layer
// Provides type-safe error handling without exceptions

/**
 * Result type for operations that can fail
 * Represents either success with a value or failure with an error
 */
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Helper to create a successful result
 */
export function Ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Helper to create a failed result
 */
export function Err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Base error class for all FluxGPU errors
 */
export class FluxError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'FluxError';
    this.code = code;
    this.context = context;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a user-friendly error message with context
   */
  toUserMessage(): string {
    let msg = `${this.message}`;
    if (this.context) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      msg += ` (${contextStr})`;
    }
    return msg;
  }
}

// ============================================================================
// Validation Errors - All extend FluxError directly (max depth = 1)
// ============================================================================

/**
 * General validation error
 */
export class ValidationError extends FluxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a circular dependency is detected
 */
export class CircularDependencyError extends FluxError {
  constructor(cycle: string[], context?: Record<string, unknown>) {
    const cycleStr = cycle.join(' -> ');
    super(
      `Circular dependency detected: ${cycleStr}`,
      'VALIDATION_ERROR',
      { ...context, cycle }
    );
    this.name = 'CircularDependencyError';
  }
}

/**
 * Error thrown when a resource reference is invalid
 */
export class InvalidResourceError extends FluxError {
  constructor(resourceId: string, reason: string, context?: Record<string, unknown>) {
    super(
      `Invalid resource reference '${resourceId}': ${reason}`,
      'VALIDATION_ERROR',
      { ...context, resourceId, reason }
    );
    this.name = 'InvalidResourceError';
  }
}

/**
 * Error thrown when graph topology is invalid
 */
export class GraphTopologyError extends FluxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Graph topology error: ${message}`, 'VALIDATION_ERROR', context);
    this.name = 'GraphTopologyError';
  }
}

// ============================================================================
// Runtime Errors - All extend FluxError directly (max depth = 1)
// ============================================================================

/**
 * General runtime error
 */
export class RuntimeError extends FluxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'RUNTIME_ERROR', context);
    this.name = 'RuntimeError';
  }
}

/**
 * Error thrown when GPU device is lost
 */
export class DeviceLostError extends FluxError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(
      `GPU device lost: ${reason}`,
      'RUNTIME_ERROR',
      { ...context, reason }
    );
    this.name = 'DeviceLostError';
  }
}

/**
 * Error thrown when out of GPU memory
 */
export class OutOfMemoryError extends FluxError {
  constructor(requested: number, available?: number, context?: Record<string, unknown>) {
    const msg = available !== undefined
      ? `Out of memory: requested ${requested} bytes, ${available} bytes available`
      : `Out of memory: requested ${requested} bytes`;
    super(msg, 'RUNTIME_ERROR', { ...context, requested, available });
    this.name = 'OutOfMemoryError';
  }
}

/**
 * Error thrown when resource disposal fails
 */
export class ResourceDisposalError extends FluxError {
  constructor(resourceId: string, reason: string, context?: Record<string, unknown>) {
    super(
      `Failed to dispose resource '${resourceId}': ${reason}`,
      'RUNTIME_ERROR',
      { ...context, resourceId, reason }
    );
    this.name = 'ResourceDisposalError';
  }
}

/**
 * Error thrown when command execution fails
 */
export class CommandExecutionError extends FluxError {
  constructor(commandId: string, reason: string, context?: Record<string, unknown>) {
    super(
      `Command execution failed for '${commandId}': ${reason}`,
      'RUNTIME_ERROR',
      { ...context, commandId, reason }
    );
    this.name = 'CommandExecutionError';
  }
}

/**
 * Error thrown during initialization
 */
export class InitializationError extends FluxError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Initialization failed: ${message}`, 'RUNTIME_ERROR', context);
    this.name = 'InitializationError';
  }
}

/**
 * Error thrown when an operation is attempted before initialization
 */
export class NotInitializedError extends FluxError {
  constructor(operation: string, context?: Record<string, unknown>) {
    super(
      `Cannot perform operation '${operation}': system not initialized`,
      'RUNTIME_ERROR',
      { ...context, operation }
    );
    this.name = 'NotInitializedError';
  }
}

// ============================================================================
// Protocol Errors - All extend FluxError directly (max depth = 1)
// ============================================================================

/**
 * Error thrown when serialization fails
 */
export class SerializationError extends FluxError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(`Serialization failed: ${reason}`, 'PROTOCOL_ERROR', context);
    this.name = 'SerializationError';
  }
}

/**
 * Error thrown when deserialization fails
 */
export class DeserializationError extends FluxError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(`Deserialization failed: ${reason}`, 'PROTOCOL_ERROR', context);
    this.name = 'DeserializationError';
  }
}

/**
 * Error thrown when buffer overflow occurs
 */
export class BufferOverflowError extends FluxError {
  constructor(required: number, available: number, context?: Record<string, unknown>) {
    super(
      `Buffer overflow: required ${required} bytes, only ${available} bytes available`,
      'PROTOCOL_ERROR',
      { ...context, required, available }
    );
    this.name = 'BufferOverflowError';
  }
}

/**
 * Error thrown when an invalid opcode is encountered
 */
export class InvalidOpcodeError extends FluxError {
  constructor(opcode: number, context?: Record<string, unknown>) {
    super(
      `Invalid opcode: ${opcode}`,
      'PROTOCOL_ERROR',
      { ...context, opcode }
    );
    this.name = 'InvalidOpcodeError';
  }
}

/**
 * Error thrown when a message is corrupted
 */
export class CorruptedMessageError extends FluxError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(`Corrupted message: ${reason}`, 'PROTOCOL_ERROR', context);
    this.name = 'CorruptedMessageError';
  }
}

// ============================================================================
// Error Recovery
// ============================================================================

/**
 * Interface for error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  /**
   * Attempts to recover from an error
   * @returns true if recovery succeeded, false otherwise
   */
  recover(error: FluxError): Promise<boolean>;
}

/**
 * Error recovery context for managing cleanup and state recovery
 */
export class ErrorRecoveryContext {
  private cleanupHandlers: Array<() => Promise<void>> = [];
  private stateRecoveryHandlers: Array<() => Promise<void>> = [];

  /**
   * Register a cleanup handler
   */
  registerCleanup(handler: () => Promise<void>): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Register a state recovery handler
   */
  registerStateRecovery(handler: () => Promise<void>): void {
    this.stateRecoveryHandlers.push(handler);
  }

  /**
   * Execute all cleanup handlers
   */
  async executeCleanup(): Promise<void> {
    const errors: Error[] = [];
    
    for (const handler of this.cleanupHandlers) {
      try {
        await handler();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      throw new FluxError(
        `Cleanup failed with ${errors.length} error(s)`,
        'RUNTIME_ERROR',
        { errors: errors.map(e => e.message) }
      );
    }
  }

  /**
   * Execute all state recovery handlers
   */
  async executeStateRecovery(): Promise<void> {
    const errors: Error[] = [];
    
    for (const handler of this.stateRecoveryHandlers) {
      try {
        await handler();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length > 0) {
      throw new FluxError(
        `State recovery failed with ${errors.length} error(s)`,
        'RUNTIME_ERROR',
        { errors: errors.map(e => e.message) }
      );
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.cleanupHandlers = [];
    this.stateRecoveryHandlers = [];
  }
}
