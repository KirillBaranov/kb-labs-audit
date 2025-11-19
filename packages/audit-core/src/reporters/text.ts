/**
 * Text report renderer
 * Ultra-compact, CI-friendly format
 */

import type { CheckId, AuditCheckResult, TestsCheckDetails } from '@kb-labs/audit-contracts';
import type { AuditReport } from '../types';

/**
 * Render audit results as plain text
 */
export function renderText(
  report: AuditReport,
  options?: { verbose?: boolean; packageResults?: Array<{ package: { name: string; path: string }; checks: Partial<Record<CheckId, AuditCheckResult>>; overall: { ok: boolean; failReasons: string[] } }> }
): string {
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

  // Detailed package breakdown in verbose mode
  if (options?.verbose && options?.packageResults && options.packageResults.length > 0) {
    const failedPackages = options.packageResults.filter(p => !p.overall.ok);
    if (failedPackages.length > 0) {
      lines.push('');
      lines.push('DETAILED PACKAGE ERRORS:');
      lines.push('');
      
      for (const pkgResult of failedPackages) {
        lines.push(`${pkgResult.package.name}`);
        lines.push(`  Path: ${pkgResult.package.path}`);
        
        const failedChecks = Object.entries(pkgResult.checks).filter(
          ([, check]) => check && !check.ok
        );
        
        for (const [checkId, check] of failedChecks) {
          lines.push(`  [${checkId}] FAIL`);
          if (check.code) {
            lines.push(`    Code: ${check.code}`);
          }
          if (check.hint) {
            lines.push(`    Hint: ${check.hint}`);
          }
          
          const details = (check.details && typeof check.details === 'object' 
            ? check.details as TestsCheckDetails 
            : {}) as TestsCheckDetails;
          if (details) {
            if (details.errors !== undefined) {
              lines.push(`    Errors: ${details.errors}`);
            }
            if (details.warnings !== undefined) {
              lines.push(`    Warnings: ${details.warnings}`);
            }
            if (details.failed !== undefined) {
              lines.push(`    Failed: ${details.failed}/${details.total || '?'}`);
            }
            if (details.coverage && details.threshold) {
              const cov = details.coverage;
              const thresh = details.threshold;
              const issues: string[] = [];
              if (cov.lines !== undefined && cov.lines < thresh.lines) {issues.push(`lines: ${cov.lines}% < ${thresh.lines}%`);}
              if (cov.branches !== undefined && cov.branches < thresh.branches) {issues.push(`branches: ${cov.branches}% < ${thresh.branches}%`);}
              if (cov.functions !== undefined && cov.functions < thresh.functions) {issues.push(`functions: ${cov.functions}% < ${thresh.functions}%`);}
              if (cov.statements !== undefined && cov.statements < thresh.statements) {issues.push(`statements: ${cov.statements}% < ${thresh.statements}%`);}
              if (issues.length > 0) {
                lines.push(`    Coverage: ${issues.join(', ')}`);
              }
            }
            if (details.exitCode !== undefined && details.exitCode !== 0) {
              lines.push(`    Exit: ${details.exitCode}`);
            }
            if (details.error) {
              lines.push(`    Error: ${String(details.error).substring(0, 150)}${String(details.error).length > 150 ? '...' : ''}`);
            }
          }
        }
        lines.push('');
      }
    }
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


