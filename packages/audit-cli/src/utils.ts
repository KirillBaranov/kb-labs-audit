/**
 * Utility functions for audit CLI
 */

import { access } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Find repo root by looking for pnpm-workspace.yaml or .git
 */
export async function findRepoRoot(startDir: string): Promise<string> {
  let current = startDir;
  while (current !== dirname(current)) {
    try {
      await access(join(current, 'pnpm-workspace.yaml'));
      return current;
    } catch {
      try {
        await access(join(current, '.git'));
        return current;
      } catch {
        current = dirname(current);
      }
    }
  }
  return startDir;
}

