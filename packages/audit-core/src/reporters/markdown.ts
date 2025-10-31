/**
 * Markdown report renderer
 * Human-readable summary format
 */

import type { AuditReport, CheckId } from '../types.js';

/**
 * Render audit results as Markdown
 */
export function renderMarkdown(report: AuditReport): string {
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
  if (!check) return '';
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

