// Branded types for type safety
export type ResourceId = string & { __brand: 'ResourceId' };
export type NodeId = string & { __brand: 'NodeId' };
export type CommandId = string & { __brand: 'CommandId' };

// Enums
export enum ResourceType {
  Buffer = 'buffer',
  Texture = 'texture',
  Sampler = 'sampler',
}

// Command opcodes (用于 protocol 包)
export enum Opcode {
  CreateBuffer = 0x01,
  WriteBuffer = 0x02,
  Dispatch = 0x03,
  ReadBuffer = 0x04,
}

// Validation result type
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// Graph node interface
export interface IGraphNode {
  id: NodeId;
  dependencies: NodeId[];
  validate(): ValidationResult;
}

// Command buffer type (用于 protocol 包)
export interface CommandBuffer {
  id: CommandId;
  opcode: Opcode;
  payload: Uint8Array;
  dependencies: CommandId[];
}
