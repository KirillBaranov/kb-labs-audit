/**
 * Markdown report renderer
 * Human-readable summary format
 */

import type { AuditReport, CheckId, AuditCheckResult } from '../types.js';

/**
 * Render audit results as Markdown
 */
export function renderMarkdown(
  report: AuditReport,
  options?: { verbose?: boolean; packageResults?: Array<{ package: { name: string; path: string }; checks: Partial<Record<CheckId, AuditCheckResult>>; overall: { ok: boolean; failReasons: string[] } }> }
): string {
  const lines: string[] = [];

  lines.push('# Audit Report');
  lines.push('');
  lines.push(`**Timestamp:** ${report.ts}`);
  lines.push(`**Repository:** ${report.context.repo}`);
  lines.push(`**Profile:** ${report.context.profile || 'default'}`);
  lines.push('');

  // Overall status
  const statusIcon = report.overall.ok ? '✅' : '❌';
  lines.push(`## ${statusIcon} Overall Status`);
  lines.push('');
  if (report.overall.ok) {
    lines.push('All checks passed.');
  } else {
    lines.push('Some checks failed:');
    for (const reason of report.overall.failReasons) {
      lines.push(`- ${reason}`);
    }
  }
  lines.push('');

  // Individual checks
  lines.push('## Checks');
  lines.push('');

  const sortedChecks = Object.entries(report.checks).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [id, check] of sortedChecks) {
    const checkIcon = check.ok ? '✅' : '❌';
    lines.push(`### ${checkIcon} ${capitalize(id)}`);

    // Tool and summary
    const tool = getToolName(id as CheckId);
    if (tool) {
      lines.push(`> ${tool} — ${formatCheckSummary(check)}`);
    }

    // Duration
    if (check.timingMs) {
      lines.push(`- Duration: ${formatTiming(check.timingMs)}`);
    }

    // Details
    if (check.details && typeof check.details === 'object') {
      const details = check.details as Record<string, any>;
      if (details.errors !== undefined) {
        lines.push(`- Errors: ${details.errors}`);
      }
      if (details.warnings !== undefined) {
        lines.push(`- Warnings: ${details.warnings}`);
      }
      if (details.coverage) {
        lines.push(`- Coverage: ${formatCoverage(details.coverage, details.threshold)}`);
      }
      if (details.failed !== undefined) {
        lines.push(`- Failed: ${details.failed}, Passed: ${details.passed || 0}`);
      }
    }

    // Hint
    if (check.hint) {
      lines.push(`- **Recommendation:** ${check.hint}`);
    }

    lines.push('');
  }

  // Detailed package breakdown in verbose mode
  if (options?.verbose && options?.packageResults && options.packageResults.length > 0) {
    const failedPackages = options.packageResults.filter(p => !p.overall.ok);
    if (failedPackages.length > 0) {
      lines.push('## Detailed Package Errors');
      lines.push('');
      
      for (const pkgResult of failedPackages) {
        lines.push(`### ${pkgResult.package.name}`);
        lines.push(`**Path:** ${pkgResult.package.path}`);
        lines.push('');
        
        const failedChecks = Object.entries(pkgResult.checks).filter(
          ([, check]) => check && !check.ok
        );
        
        if (failedChecks.length > 0) {
          for (const [checkId, check] of failedChecks) {
            lines.push(`#### ${capitalize(checkId)}`);
            
            if (check.code) {
              lines.push(`- **Code:** ${check.code}`);
            }
            if (check.hint) {
              lines.push(`- **Hint:** ${check.hint}`);
            }
            
            const details = check.details as any;
            if (details) {
              if (details.errors !== undefined) {
                lines.push(`- **Errors:** ${details.errors}`);
              }
              if (details.warnings !== undefined) {
                lines.push(`- **Warnings:** ${details.warnings}`);
              }
              if (details.failed !== undefined) {
                lines.push(`- **Failed tests:** ${details.failed}/${details.total || '?'}`);
              }
              if (details.coverage && details.threshold) {
                const cov = details.coverage;
                const thresh = details.threshold;
                const issues: string[] = [];
                if (cov.lines < thresh.lines) {issues.push(`lines: ${cov.lines}% < ${thresh.lines}%`);}
                if (cov.branches < thresh.branches) {issues.push(`branches: ${cov.branches}% < ${thresh.branches}%`);}
                if (cov.functions < thresh.functions) {issues.push(`functions: ${cov.functions}% < ${thresh.functions}%`);}
                if (cov.statements < thresh.statements) {issues.push(`statements: ${cov.statements}% < ${thresh.statements}%`);}
                if (issues.length > 0) {
                  lines.push(`- **Coverage below threshold:** ${issues.join(', ')}`);
                }
              }
              if (details.exitCode !== undefined && details.exitCode !== 0) {
                lines.push(`- **Exit code:** ${details.exitCode}`);
              }
              if (details.error) {
                lines.push(`- **Error:** ${String(details.error).substring(0, 200)}${String(details.error).length > 200 ? '...' : ''}`);
              }
            }
            lines.push('');
          }
        }
        lines.push('');
      }
    }
  }

  // Metadata
  lines.push('---');
  lines.push('');
  lines.push(`Total time: ${formatTiming(report.meta.timingMs.total)}`);
  lines.push(`Node: ${report.meta.node}`);
  if (report.meta.pnpm) {
    lines.push(`pnpm: ${report.meta.pnpm}`);
  }

  return lines.join('\n');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getToolName(id: CheckId): string {
  const tools: Record<CheckId, string> = {
    style: 'eslint',
    types: 'tsc',
    tests: 'vitest',
    build: 'build tool',
    devlink: 'kb devlink',
    mind: 'kb mind',
    security: 'npm audit',
  };
  return tools[id] || id;
}

function formatCheckSummary(check: AuditReport['checks'][CheckId]): string {
  if (!check) {return '';}
  if (check.ok) {
    return 'passed';
  }
  return check.code || 'failed';
}

function formatTiming(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCoverage(
  coverage: { lines?: number; branches?: number; functions?: number; statements?: number },
  threshold?: { lines?: number; branches?: number; functions?: number; statements?: number }
): string {
  const parts: string[] = [];
  if (coverage.lines !== undefined) {
    const thresholdStr = threshold?.lines ? ` (threshold: ${threshold.lines}%)` : '';
    parts.push(`${coverage.lines}% lines${thresholdStr}`);
  }
  return parts.join(', ');
}

