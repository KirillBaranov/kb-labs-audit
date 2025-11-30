/**
 * Style check adapter (eslint)
 */

import { BaseCheckAdapter } from './base';
import type { AuditCheckResult } from '@kb-labs/audit-contracts';
import type { ShellApi } from '@kb-labs/audit-core';

export class StyleCheck extends BaseCheckAdapter {
  id = 'style' as const;

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

      // Check if eslint is available
      const versionResult = await shell.exec('eslint', ['--version'], { cwd, timeoutMs: 5000 });
      if (!versionResult.ok) {
        return this.createSkippedResult('eslint not installed');
      }

      // Run eslint
      const result = await shell.exec('eslint', ['.', '--format', 'json'], {
        cwd,
        timeoutMs,
      });
      const { stdout, exitCode } = result;

      const timingMs = Date.now() - start;

      // Parse JSON output
      let results: any[];
      try {
        results = JSON.parse(stdout || '[]');
        if (!Array.isArray(results)) {
          results = [results];
        }
      } catch {
        // If parsing fails, treat as error
        return this.createErrorResult(
          'PARSE_ERROR',
          'Failed to parse eslint output',
          timingMs
        );
      }

      // Count errors and warnings
      let errorCount = 0;
      let warningCount = 0;

      for (const result of results) {
        if (result.errorCount) {
          errorCount += result.errorCount;
        }
        if (result.warningCount) {
          warningCount += result.warningCount;
        }
      }

      const ok = exitCode === 0 && errorCount === 0;

      return {
        id: this.id,
        ok,
        details: {
          errors: errorCount,
          warnings: warningCount,
          exitCode,
        },
        hint: ok
          ? undefined
          : `Found ${errorCount} error(s) and ${warningCount} warning(s). Run 'eslint . --fix' to auto-fix some issues.`,
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

