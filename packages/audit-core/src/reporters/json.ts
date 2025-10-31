/**
 * JSON report renderer
 * Produces stable, deterministic JSON output
 */

import type { AuditReport } from '../types';

/**
 * Render audit results as JSON
 * Ensures stable order and rounded numeric values
 */
export function renderJson(report: AuditReport): string {
  // Create a copy with normalized values
  const normalized: AuditReport = {
    schemaVersion: report.schemaVersion,
    ts: report.ts,
    context: report.context,
    checks: normalizeChecks(report.checks),
    overall: report.overall,
    meta: {
      ...report.meta,
      timingMs: {
        total: round(report.meta.timingMs.total, 2),
      },
    },
  };

  // Sort keys deterministically
  return JSON.stringify(normalized, null, 2);
}

/**
 * Normalize check results: round timings, stable order
 */
function normalizeChecks(
  checks: AuditReport['checks']
): AuditReport['checks'] {
  const normalized: AuditReport['checks'] = {};
  const sortedIds = Object.keys(checks).sort();

  for (const id of sortedIds) {
    const check = checks[id as keyof typeof checks];
    if (check) {
      normalized[id as keyof typeof normalized] = {
        ...check,
        timingMs: check.timingMs ? round(check.timingMs, 2) : undefined,
      };
    }
  }

  return normalized;
}

/**
 * Round number to specified decimal places
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}


