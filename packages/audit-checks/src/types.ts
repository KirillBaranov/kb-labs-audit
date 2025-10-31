/**
 * Types check adapter (tsc --noEmit)
 */

import { execa } from 'execa';
import { BaseCheckAdapter } from './base.js';
import type { AuditCheckResult } from '@kb-labs/audit-core';

export class TypesCheck extends BaseCheckAdapter {
  id = 'types' as const;

  async run(cwd: string, timeoutMs: number): Promise<AuditCheckResult> {
    const start = Date.now();

    try {
      // Check if tsc is available
      try {
        await execa('tsc', ['--version'], { cwd, timeout: 5000 });
      } catch {
        return this.createSkippedResult('tsc not installed');
      }

      // Run tsc --noEmit
      const { stderr, exitCode } = await execa(
        'tsc',
        ['--noEmit', '--pretty', 'false'],
        {
          cwd,
          timeout: timeoutMs,
          reject: false,
        }
      );

      const timingMs = Date.now() - start;

      // Parse diagnostics from stderr
      const errorLines = stderr
        .split('\n')
        .filter((line) => line.trim().length > 0 && line.includes('error TS'));

      const errorCount = errorLines.length;
      const ok = exitCode === 0;

      return {
        id: this.id,
        ok,
        details: {
          errors: errorCount,
          exitCode,
        },
        hint: ok
          ? undefined
          : `Found ${errorCount} type error(s). Check the output above for details.`,
        timingMs,
      };
    } catch (error: unknown) {
      const timingMs = Date.now() - start;
      return this.createErrorResult(
        'AUDIT_TOOL_ERROR',
        error instanceof Error ? error.message : String(error),
        timingMs,
        { error: String(error) }
      );
    }
  }
}

