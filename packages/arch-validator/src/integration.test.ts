import { describe, it, expect } from 'vitest';
import { validateArchitecture } from './runner.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Architecture Validation Integration', () => {
  it('should validate domain packages successfully', async () => {
    // Get root directory (assuming we're in packages/arch-validator/src or dist)
    const rootDir = path.resolve(__dirname, '../../..');

    const result = await validateArchitecture({
      domainPackages: [
        'packages/contracts',
        'packages/core',
        'packages/dsl'
      ],
      rootDir
    });

    // If this fails, it means there are architectural violations in the codebase
    expect(result).toBe(true);
  }, 30000); // 30 second timeout for file scanning
});
