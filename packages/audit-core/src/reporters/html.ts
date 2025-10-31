/**
 * HTML report renderer
 * Lightweight HTML dashboard
 */

import type { AuditReport, CheckId } from '../types.js';

/**
 * Render audit results as HTML
 */
export function renderHtml(report: AuditReport): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Report - ${report.context.repo}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: bold;
      margin: 10px 0;
    }
    .status.ok {
      background-color: #d4edda;
      color: #155724;
    }
    .status.fail {
      background-color: #f8d7da;
      color: #721c24;
    }
    .check {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    }
    .check.ok {
      border-left: 4px solid #28a745;
    }
    .check.fail {
      border-left: 4px solid #dc3545;
    }
    .meta {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 0.9em;
    }
    .details {
      margin-top: 10px;
      padding-left: 20px;
    }
    .details ul {
      margin: 5px 0;
      padding-left: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Audit Report</h1>
    <p><strong>Repository:</strong> ${escapeHtml(report.context.repo)}</p>
    <p><strong>Timestamp:</strong> ${escapeHtml(report.ts)}</p>
    <p><strong>Profile:</strong> ${escapeHtml(report.context.profile || 'default')}</p>
  </div>

  <div class="status ${report.overall.ok ? 'ok' : 'fail'}">
    ${report.overall.ok ? '✅ All Checks Passed' : '❌ Some Checks Failed'}
  </div>

  ${!report.overall.ok && report.overall.failReasons.length > 0 ? `
    <ul>
      ${report.overall.failReasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>
  ` : ''}

  <h2>Checks</h2>
  ${renderChecksHtml(report.checks)}

  <div class="meta">
    <p><strong>Total time:</strong> ${formatTiming(report.meta.timingMs.total)}</p>
    <p><strong>Node:</strong> ${escapeHtml(report.meta.node)}</p>
    ${report.meta.pnpm ? `<p><strong>pnpm:</strong> ${escapeHtml(report.meta.pnpm)}</p>` : ''}
  </div>
</body>
</html>`;

  return html;
}

function renderChecksHtml(checks: AuditReport['checks']): string {
  const sortedChecks = Object.entries(checks).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return sortedChecks
    .map(([id, check]) => {
      if (!check) return '';
      return `
  <div class="check ${check.ok ? 'ok' : 'fail'}">
    <h3>${check.ok ? '✅' : '❌'} ${capitalize(id)}</h3>
    ${check.hint ? `<p><em>${escapeHtml(check.hint)}</em></p>` : ''}
    ${check.timingMs ? `<p>Duration: ${formatTiming(check.timingMs)}</p>` : ''}
    ${renderCheckDetailsHtml(check.details)}
  </div>`;
    })
    .join('');
}

function renderCheckDetailsHtml(details: unknown): string {
  if (!details || typeof details !== 'object') {
    return '';
  }

  const d = details as Record<string, any>;
  const items: string[] = [];

  if (d.errors !== undefined) {
    items.push(`<li>Errors: ${d.errors}</li>`);
  }
  if (d.warnings !== undefined) {
    items.push(`<li>Warnings: ${d.warnings}</li>`);
  }
  if (d.coverage) {
    items.push(`<li>Coverage: ${formatCoverage(d.coverage, d.threshold)}</li>`);
  }

  if (items.length === 0) {
    return '';
  }

  return `<div class="details"><ul>${items.join('')}</ul></div>`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

