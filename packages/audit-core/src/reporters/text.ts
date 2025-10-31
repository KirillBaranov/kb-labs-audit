/**
 * Text report renderer
 * Ultra-compact, CI-friendly format
 */

import type { AuditReport } from '../types.js';

/**
 * Render audit results as plain text
 */
export function renderText(report: AuditReport): string {
  const lines: string[] = [];

  lines.push('AUDIT REPORT');
  lines.push(`Repo: ${report.context.repo}`);
  lines.push(`Time: ${report.ts}`);
  lines.push('');

  // Overall
  const overallStatus = report.overall.ok ? 'PASS' : 'FAIL';
  lines.push(`Overall: ${overallStatus}`);
  if (!report.overall.ok && report.overall.failReasons.length > 0) {
    for (const reason of report.overall.failReasons) {
      lines.push(`  - ${reason}`);
    }
  }
  lines.push('');

  // Checks
  const sortedChecks = Object.entries(report.checks).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [id, check] of sortedChecks) {
    const status = check.ok ? 'OK' : 'FAIL';
    const details: string[] = [];

    if (check.details && typeof check.details === 'object') {
      const d = check.details as Record<string, any>;
      if (d.errors !== undefined) {
        details.push(`${d.errors}e`);
      }
      if (d.warnings !== undefined) {
        details.push(`${d.warnings}w`);
      }
      if (d.coverage) {
        const cov = d.coverage;
        if (cov.lines !== undefined) {
          details.push(`coverage:${cov.lines}%`);
        }
      }
    }

    const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
    lines.push(`[${id}] ${status}${detailsStr}`);
  }

  lines.push('');
  lines.push(`Total time: ${formatTiming(report.meta.timingMs.total)}`);

  return lines.join('\n');
}

function formatTiming(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

