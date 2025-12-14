// Base validator interface and types

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  rule: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface Validator {
  name: string;
  validate(files: string[]): Promise<ValidationResult>;
}

export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}
