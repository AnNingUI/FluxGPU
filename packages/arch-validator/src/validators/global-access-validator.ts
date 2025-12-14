// Validator to check for global variable access in domain packages
import * as fs from 'fs/promises';
// Removed unused import: path
import type { Validator, ValidationResult, ValidationError } from './validator.js';

// Global variables that should not be accessed in domain packages
const FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'navigator',
  'Worker',
  'localStorage',
  'sessionStorage',
  'location',
  'history',
  'fetch', // Should use injected adapter
  'XMLHttpRequest',
  'WebSocket',
  'Blob',
  'File',
  'FileReader',
];

export class GlobalAccessValidator implements Validator {
  name = 'GlobalAccessValidator';

  async validate(files: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (const file of files) {
      const fileErrors = await this.validateFile(file);
      errors.push(...fileErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async validateFile(filePath: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Skip comments and strings (basic heuristic)
        const withoutComments = this.removeComments(line);
        
        for (const global of FORBIDDEN_GLOBALS) {
          // Check for direct access (e.g., window.something, navigator.gpu)
          const directAccessRegex = new RegExp(`\\b${global}\\b(?!\\s*:)`, 'g');
          
          let match;
          while ((match = directAccessRegex.exec(withoutComments)) !== null) {
            // Skip if it's in a type annotation or interface definition
            if (this.isInTypeContext(withoutComments, match.index)) {
              continue;
            }

            errors.push({
              file: filePath,
              line: lineNumber,
              column: match.index + 1,
              message: `Forbidden global variable access: '${global}'. Domain packages must not access platform-specific globals.`,
              rule: 'no-global-access'
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        file: filePath,
        message: `Failed to read file: ${error}`,
        rule: 'file-read-error'
      });
    }

    return errors;
  }

  private removeComments(line: string): string {
    // Remove single-line comments
    const commentIndex = line.indexOf('//');
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex);
    }
    
    // Remove string literals (basic approach)
    line = line.replace(/'[^']*'/g, '""');
    line = line.replace(/"[^"]*"/g, '""');
    line = line.replace(/`[^`]*`/g, '""');
    
    return line;
  }

  private isInTypeContext(line: string, position: number): boolean {
    const beforeMatch = line.substring(0, position);
    const afterMatch = line.substring(position);
    const matchedWord = afterMatch.match(/^\w+/)?.[0] || '';
    const afterWord = afterMatch.substring(matchedWord.length);
    
    // Check for interface/type definitions
    if (/\b(interface|type)\s+\w+/.test(beforeMatch)) {
      return true;
    }
    
    // Check for type annotations (: Type)
    if (/:\s*$/.test(beforeMatch.trim())) {
      return true;
    }
    
    // Check for generic type parameters
    if (/<[^>]*$/.test(beforeMatch)) {
      return true;
    }
    
    // Check if it's an object property name followed by colon (e.g., { location: number })
    if (/^\s*:/.test(afterWord)) {
      return true;
    }
    
    // Check if inside object literal or interface body (after { or ,)
    if (/[{,]\s*$/.test(beforeMatch.trim())) {
      return true;
    }
    
    // Check if it's a property in a type/interface (has semicolon or comma after type)
    if (/^\s*:\s*\w+[\s;,}]/.test(afterWord)) {
      return true;
    }
    
    return false;
  }
}
