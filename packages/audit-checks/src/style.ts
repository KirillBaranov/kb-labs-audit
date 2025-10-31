/**
 * Style check adapter (eslint)
 */

import { execa } from 'execa';
import { BaseCheckAdapter } from './base.js';
import type { AuditCheckResult } from '@kb-labs/audit-core';

export class StyleCheck extends BaseCheckAdapter {
  id = 'style' as const;

  async run(cwd: string, timeoutMs: number): Promise<AuditCheckResult> {
    const start = Date.now();

    try {
      // Check if eslint is available
      try {
        await execa('eslint', ['--version'], { cwd, timeout: 5000 });
      } catch {
        return this.createSkippedResult('eslint not installed');
      }

      // Run eslint
      const { stdout, exitCode } = await execa(
        'eslint',
        ['.', '--format', 'json'],
        {
          cwd,
          timeout: timeoutMs,
          reject: false, // Don't throw on non-zero exit
        }
      );

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

