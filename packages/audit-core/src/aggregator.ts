/**
 * Result aggregation and summary computation
 */

import type { AuditCheckResult, AuditReport, CheckId, CoverageThresholds } from './types.js';

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
      const testsDetails = result.details as any;
      if (testsDetails.coverage && options.coverageThresholds) {
        const coverage = testsDetails.coverage;
        const thresholds = options.coverageThresholds;

        if (coverage.lines < thresholds.lines) {
          failReasons.push(`tests.coverage.lines<${thresholds.lines}`);
        }
        if (coverage.branches < thresholds.branches) {
          failReasons.push(`tests.coverage.branches<${thresholds.branches}`);
        }
        if (coverage.functions < thresholds.functions) {
          failReasons.push(`tests.coverage.functions<${thresholds.functions}`);
        }
        if (coverage.statements < thresholds.statements) {
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


