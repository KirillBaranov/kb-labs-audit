/**
 * Security check adapter (npm audit)
 * Optional in MVP - basic implementation
 */

import { execa } from 'execa';
import { BaseCheckAdapter } from './base.js';
import type { AuditCheckResult } from '@kb-labs/audit-core';

export class SecurityCheck extends BaseCheckAdapter {
  id = 'security' as const;

  async run(cwd: string, timeoutMs: number): Promise<AuditCheckResult> {
    const start = Date.now();

    try {
      // Check if npm is available
      try {
        await execa('npm', ['--version'], { cwd, timeout: 5000 });
      } catch {
        return this.createSkippedResult('npm not installed');
      }

      // Run npm audit --json
      const { stdout, exitCode } = await execa(
        'npm',
        ['audit', '--json'],
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
          'Failed to parse npm audit output',
          timingMs
        );
      }

      // Extract vulnerabilities
      const vulnerabilities = result.vulnerabilities || {};
      const summary = result.metadata?.vulnerabilities || {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
      };

      const totalVulns =
        summary.info +
        summary.low +
        summary.moderate +
        summary.high +
        summary.critical;

      // Consider critical/high as failures, others as warnings
      const hasCriticalIssues = (summary.critical || 0) > 0 || (summary.high || 0) > 0;
      const ok = !hasCriticalIssues;

      return {
        id: this.id,
        ok,
        details: {
          total: totalVulns,
          summary,
          exitCode,
        },
        hint: ok
          ? totalVulns > 0
            ? `Found ${totalVulns} low/moderate vulnerability(ies). Consider reviewing.`
            : undefined
          : `Found ${summary.critical || 0} critical and ${summary.high || 0} high vulnerability(ies). Run 'npm audit fix' to attempt fixes.`,
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

