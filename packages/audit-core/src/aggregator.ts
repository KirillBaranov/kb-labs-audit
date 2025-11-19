/**
 * Result aggregation and summary computation
 */

import type { AuditCheckResult, CheckId, CoverageThresholds, TestsCheckDetails } from '@kb-labs/audit-contracts';

export interface AggregationOptions {
  coverageThresholds?: CoverageThresholds;
}

/**
 * Aggregate check results into a complete report
 */
export function aggregateResults(
  checks: Partial<Record<CheckId, AuditCheckResult>>,
  options: AggregationOptions = {}
): {
  overall: { ok: boolean; failReasons: string[] };
} {
  const failReasons: string[] = [];
  let allOk = true;

  for (const [id, result] of Object.entries(checks)) {
    if (!result || result.ok) {
      continue;
    }

    allOk = false;

    // Check coverage thresholds if this is a tests check
    if (id === 'tests' && result.details && typeof result.details === 'object') {
      const testsDetails = result.details as TestsCheckDetails;
      if (testsDetails.coverage && options.coverageThresholds) {
        const coverage = testsDetails.coverage;
        const thresholds = options.coverageThresholds;

        if (coverage.lines !== undefined && coverage.lines < thresholds.lines) {
          failReasons.push(`tests.coverage.lines<${thresholds.lines}`);
        }
        if (coverage.branches !== undefined && coverage.branches < thresholds.branches) {
          failReasons.push(`tests.coverage.branches<${thresholds.branches}`);
        }
        if (coverage.functions !== undefined && coverage.functions < thresholds.functions) {
          failReasons.push(`tests.coverage.functions<${thresholds.functions}`);
        }
        if (coverage.statements !== undefined && coverage.statements < thresholds.statements) {
          failReasons.push(`tests.coverage.statements<${thresholds.statements}`);
        }
      }
    }

    // Generic failure reasons
    if (result.code) {
      failReasons.push(`${id}.${result.code}`);
    } else {
      failReasons.push(`${id}.failed`);
    }
  }

  return {
    overall: {
      ok: allOk,
      failReasons,
    },
  };
}


