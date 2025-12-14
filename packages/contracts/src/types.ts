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

// Core interfaces
export interface IGPUResource {
  id: ResourceId;
  type: ResourceType;
  dispose(): void;
}

export interface ITexture extends IGPUResource {
  type: ResourceType.Texture;
  width: number;
  height: number;
  format: string;
}

export interface IGraphNode {
  id: NodeId;
  dependencies: NodeId[];
  validate(): ValidationResult;
}

// Resource table type
export interface ResourceTable {
  get(id: ResourceId): IGPUResource | undefined;
  set(id: ResourceId, resource: IGPUResource): void;
  delete(id: ResourceId): boolean;
  has(id: ResourceId): boolean;
}

// Command buffer type for dispatch
export interface CommandBuffer {
  id: CommandId;
  opcode: Opcode;
  payload: Uint8Array;
  dependencies: CommandId[];
}

// Executor interface
export interface IExecutor {
  dispatch(command: CommandBuffer): void;
  getResourceTable(): ResourceTable;
}

// Runtime adapter interface
export interface IRuntimeAdapter {
  initialize(): Promise<void>;
  createExecutor(): IExecutor;
  supportsFeature(feature: string): boolean;
}
