// Validator to check class inheritance depth
import * as fs from 'fs/promises';
import * as ts from 'typescript';
import type { Validator, ValidationResult, ValidationError } from './validator.js';

export class InheritanceValidator implements Validator {
  name = 'InheritanceValidator';
  private maxDepth = 1;

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
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // Build inheritance map
      const inheritanceMap = this.buildInheritanceMap(sourceFile);
      
      // Check each class for inheritance depth
      for (const [className, info] of inheritanceMap.entries()) {
        const depth = this.calculateInheritanceDepth(className, inheritanceMap);
        
        if (depth > this.maxDepth) {
          errors.push({
            file: filePath,
            line: info.line,
            column: info.column,
            message: `Class '${className}' has inheritance depth of ${depth}, which exceeds the maximum allowed depth of ${this.maxDepth}. Use composition instead of deep inheritance.`,
            rule: 'max-inheritance-depth'
          });
        }
      }
    } catch (error) {
      errors.push({
        file: filePath,
        message: `Failed to parse file: ${error}`,
        rule: 'file-parse-error'
      });
    }

    return errors;
  }

  private buildInheritanceMap(sourceFile: ts.SourceFile): Map<string, { parent: string | null; line: number; column: number }> {
    const map = new Map<string, { parent: string | null; line: number; column: number }>();

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        let parentName: string | null = null;

        // Check for extends clause
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              const type = clause.types[0];
              if (ts.isIdentifier(type.expression)) {
                parentName = type.expression.text;
              }
            }
          }
        }

        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        map.set(className, {
          parent: parentName,
          line: line + 1,
          column: character + 1
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return map;
  }

  private calculateInheritanceDepth(
    className: string,
    inheritanceMap: Map<string, { parent: string | null; line: number; column: number }>,
    visited = new Set<string>()
  ): number {
    // Prevent infinite loops from circular inheritance
    if (visited.has(className)) {
      return 0;
    }

    const info = inheritanceMap.get(className);
    if (!info || !info.parent) {
      return 0;
    }

    visited.add(className);
    
    // Check if parent is in the same file (part of the codebase)
    const parentInfo = inheritanceMap.get(info.parent);
    if (!parentInfo) {
      // Parent is external (built-in or imported), don't count it
      return 0;
    }

    return 1 + this.calculateInheritanceDepth(info.parent, inheritanceMap, visited);
  }
}
