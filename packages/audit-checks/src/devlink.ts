/**
 * DevLink check adapter
 * Calls: kb devlink check --json
 */

import { BaseCheckAdapter } from './base';
import type { AuditCheckResult } from '@kb-labs/audit-contracts';
import type { ShellApi } from '@kb-labs/audit-core';

export class DevLinkCheck extends BaseCheckAdapter {
  id = 'devlink' as const;

  async run(cwd: string, timeoutMs: number, shell?: ShellApi): Promise<AuditCheckResult> {
    const start = Date.now();

    try {
      if (!shell) {
        return this.createErrorResult(
          'SHELL_NOT_AVAILABLE',
          'Shell API not available',
          Date.now() - start,
          { error: 'Shell API is required for running checks' }
        );
      }

      // Check if kb CLI is available
      const versionResult = await shell.exec('kb', ['--version'], { cwd, timeoutMs: 5000 });
      if (!versionResult.ok) {
        return this.createSkippedResult('kb CLI not installed');
      }

      // Run kb devlink check --json
      const result = await shell.exec('kb', ['devlink', 'check', '--json'], {
        cwd,
        timeoutMs,
      });
      const { stdout, exitCode } = result;

      const timingMs = Date.now() - start;

      // Parse JSON output
      let parsedResult: any;
      try {
        parsedResult = JSON.parse(stdout || '{}');
      } catch {
        return this.createErrorResult(
          'PARSE_ERROR',
          'Failed to parse devlink output',
          timingMs
        );
      }

      // Extract cycles and mismatches
      const cycles = parsedResult.cycles || [];
      const mismatches = parsedResult.mismatches || [];
      const ok = exitCode === 0 && cycles.length === 0 && mismatches.length === 0;

      return {
        id: this.id,
        ok,
        details: {
          cycles,
          mismatches,
          exitCode,
        },
        hint: ok
          ? undefined
          : cycles.length > 0
            ? `Found ${cycles.length} dependency cycle(s).`
            : mismatches.length > 0
              ? `Found ${mismatches.length} dependency mismatch(es).`
              : 'DevLink check failed.',
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

