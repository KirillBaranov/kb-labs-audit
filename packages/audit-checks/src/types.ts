/**
 * Types check adapter (tsc --noEmit)
 */

import { BaseCheckAdapter } from './base';
import type { AuditCheckResult } from '@kb-labs/audit-contracts';
import type { ShellApi } from '@kb-labs/audit-core';

export class TypesCheck extends BaseCheckAdapter {
  id = 'types' as const;

  async run(cwd: string, timeoutMs: number, shell?: ShellApi): Promise<AuditCheckResult> {
    const start = Date.now();

    try {
      if (!shell) {
        return this.createErrorResult(
          'SHELL_NOT_AVAILABLE',
          'Shell API not available',
          Date.now() - start,
          { error: 'Shell API is required for running checks' }
        );
      }

      // Check if tsc is available
      const versionResult = await shell.exec('tsc', ['--version'], { cwd, timeoutMs: 5000 });
      if (!versionResult.ok) {
        return this.createSkippedResult('tsc not installed');
      }

      // Run tsc --noEmit
      const result = await shell.exec('tsc', ['--noEmit', '--pretty', 'false'], {
        cwd,
        timeoutMs,
      });
      const { stderr, exitCode } = result;

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

