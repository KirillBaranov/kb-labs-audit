/**
 * @module @kb-labs/audit-cli/application/clean-audit-core
 * Core clean audit logic (shared between CLI and REST)
 */

import { join } from 'node:path';
import type * as fsPromises from 'node:fs/promises';

/**
 * Clean audit input
 */
export interface CleanAuditInput {
  /** Repository root */
  repoRoot: string;
}

/**
 * Clean audit result
 */
export interface CleanAuditResult {
  /** Audit directory path */
  auditDir: string;
  /** Whether directory existed */
  existed: boolean;
}

/**
 * Runtime context for core functions
 */
export interface CleanAuditRuntimeContext {
  /** File system access */
  fs: {
    rm: typeof fsPromises.rm;
  };
  /** Logging */
  log: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Core clean audit execution (shared between CLI and REST)
 */
export async function cleanAuditCore(
  input: CleanAuditInput,
  ctx: CleanAuditRuntimeContext
): Promise<CleanAuditResult> {
  const { repoRoot } = input;
  const auditDir = join(repoRoot, '.kb', 'audit');

  try {
    await ctx.fs.rm(auditDir, { recursive: true, force: true });
    return {
      auditDir,
      existed: true,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        auditDir,
        existed: false,
      };
    }
    throw error;
  }
}

