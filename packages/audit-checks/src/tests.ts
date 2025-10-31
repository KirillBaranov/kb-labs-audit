/**
 * Tests check adapter (vitest)
 */

import { execa } from 'execa';
import { BaseCheckAdapter } from './base.js';
import type { AuditCheckResult, CoverageThresholds } from '@kb-labs/audit-core';

export class TestsCheck extends BaseCheckAdapter {
  id = 'tests' as const;

  async run(
    cwd: string,
    timeoutMs: number,
    ...args: unknown[]
  ): Promise<AuditCheckResult> {
    const coverageThresholds = args[0] as CoverageThresholds | undefined;
    const start = Date.now();

    try {
      // Check if vitest is available
      try {
        await execa('vitest', ['--version'], { cwd, timeout: 5000 });
      } catch {
        return this.createSkippedResult('vitest not installed');
      }

      // Run vitest with JSON reporter
      const { stdout, exitCode } = await execa(
        'vitest',
        ['run', '--reporter=json'],
        {
          cwd,
          timeout: timeoutMs,
          reject: false,
        }
      );

      const timingMs = Date.now() - start;

      // Parse JSON output
      let result: any;
      try {
        result = JSON.parse(stdout || '{}');
      } catch {
        return this.createErrorResult(
          'PARSE_ERROR',
          'Failed to parse vitest output',
          timingMs
        );
      }

      // Extract test results
      const numFailedTests = result.numFailedTests || 0;
      const numPassedTests = result.numPassedTests || 0;
      const numTotalTests = result.numTotalTests || 0;

      // Extract coverage if available
      let coverage: any = undefined;
      if (result.coverageMap) {
        // Coverage data structure from vitest
        const coverageSummary = result.coverageMap?.coverageMap?.summary;
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

