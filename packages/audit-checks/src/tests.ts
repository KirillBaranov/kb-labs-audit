/**
 * Tests check adapter (vitest)
 */

import { BaseCheckAdapter } from './base';
import type { AuditCheckResult, CoverageThresholds } from '@kb-labs/audit-contracts';
import type { ShellApi } from '@kb-labs/audit-core';

export class TestsCheck extends BaseCheckAdapter {
  id = 'tests' as const;

  async run(
    cwd: string,
    timeoutMs: number,
    shell?: ShellApi,
    coverageThresholds?: CoverageThresholds
  ): Promise<AuditCheckResult> {
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

      // Check if vitest is available
      const versionResult = await shell.exec('vitest', ['--version'], { cwd, timeoutMs: 5000 });
      if (!versionResult.ok) {
        return this.createSkippedResult('vitest not installed');
      }

      // Run vitest with JSON reporter
      const result = await shell.exec('vitest', ['run', '--reporter=json'], {
        cwd,
        timeoutMs,
      });
      const { stdout, exitCode } = result;

      const timingMs = Date.now() - start;

      // Parse JSON output
      let parsedResult: any;
      try {
        parsedResult = JSON.parse(stdout || '{}');
      } catch {
        return this.createErrorResult(
          'PARSE_ERROR',
          'Failed to parse vitest output',
          timingMs
        );
      }

      // Extract test results
      const numFailedTests = parsedResult.numFailedTests || 0;
      const numPassedTests = parsedResult.numPassedTests || 0;
      const numTotalTests = parsedResult.numTotalTests || 0;

      // Extract coverage if available
      let coverage: any = undefined;
      if (parsedResult.coverageMap) {
        // Coverage data structure from vitest
        const coverageSummary = parsedResult.coverageMap?.coverageMap?.summary;
        if (coverageSummary) {
          coverage = {
            lines: Math.round(coverageSummary.lines?.pct || 0),
            branches: Math.round(coverageSummary.branches?.pct || 0),
            functions: Math.round(coverageSummary.functions?.pct || 0),
            statements: Math.round(coverageSummary.statements?.pct || 0),
          };
        }
      }

      // Check coverage thresholds if provided
      let coverageOk = true;
      if (coverage && coverageThresholds) {
        coverageOk =
          coverage.lines >= coverageThresholds.lines &&
          coverage.branches >= coverageThresholds.branches &&
          coverage.functions >= coverageThresholds.functions &&
          coverage.statements >= coverageThresholds.statements;
      }

      const ok = exitCode === 0 && numFailedTests === 0 && coverageOk;

      return {
        id: this.id,
        ok,
        details: {
          passed: numPassedTests,
          failed: numFailedTests,
          total: numTotalTests,
          coverage,
          threshold: coverageThresholds,
        },
        hint: ok
          ? undefined
          : numFailedTests > 0
            ? `${numFailedTests} test(s) failed.`
            : coverage && !coverageOk
              ? `Coverage below threshold.`
              : 'Tests failed.',
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

