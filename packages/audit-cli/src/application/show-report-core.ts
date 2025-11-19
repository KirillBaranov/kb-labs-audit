/**
 * @module @kb-labs/audit-cli/application/show-report-core
 * Core show report logic (shared between CLI and REST)
 */

import { join } from 'node:path';
import type * as fsPromises from 'node:fs/promises';
import { AuditReportSchema } from '@kb-labs/audit-contracts';
import type { AuditReportContract } from '@kb-labs/audit-contracts';

/**
 * Show report input
 */
export interface ShowReportInput {
  /** Repository root */
  repoRoot: string;
}

/**
 * Show report result
 */
export interface ShowReportResult {
  /** Report contract */
  report: AuditReportContract;
}

/**
 * Runtime context for core functions
 */
export interface ShowReportRuntimeContext {
  /** File system access */
  fs: {
    readFile: typeof fsPromises.readFile;
  };
  /** Logging */
  log: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Core show report execution (shared between CLI and REST)
 */
export async function showReportCore(
  input: ShowReportInput,
  ctx: ShowReportRuntimeContext
): Promise<ShowReportResult> {
  const { repoRoot } = input;
  const reportPath = join(repoRoot, '.kb', 'audit', 'report.json');

  try {
    const reportContent = await ctx.fs.readFile(reportPath, 'utf-8');
    const report = AuditReportSchema.parse(JSON.parse(reportContent));

    return {
      report,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('No audit report found. Run "kb audit run" first.');
    }
    throw error;
  }
}

