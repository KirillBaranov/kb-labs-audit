/**
 * Audit show command
 * Displays the last audit report
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '@kb-labs/cli-commands/types';
import { findRepoRoot } from '../utils.js';
import type { AuditReport } from '@kb-labs/audit-core';

export const show: Command = {
  name: 'audit:show',
  category: 'audit',
  describe: 'Show last audit report',
  async run(ctx, argv, flags) {
    const jsonMode = !!flags.json;
    const cwd = ctx?.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);

    const reportPath = join(repoRoot, '.kb', 'audit', 'report.json');

    try {
      const reportContent = await readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportContent) as AuditReport;

      if (jsonMode) {
        ctx.presenter.json(report);
      } else {
        // Pretty print summary
        ctx.presenter.write(`Audit Report: ${report.ts}`);
        ctx.presenter.write(`Repository: ${report.context.repo}`);
        ctx.presenter.write(`Overall: ${report.overall.ok ? 'PASS' : 'FAIL'}`);
        if (!report.overall.ok) {
          ctx.presenter.write(`Fail reasons: ${report.overall.failReasons.join(', ')}`);
        }
      }

      return 0;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if (jsonMode) {
          ctx.presenter.json({ ok: false, error: 'No audit report found' });
        } else {
          ctx.presenter.error('No audit report found. Run "kb audit run" first.');
        }
        return 3; // Misconfiguration
      }
      if (jsonMode) {
        ctx.presenter.json({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        ctx.presenter.error(`Failed to read report: ${error instanceof Error ? error.message : String(error)}`);
      }
      return 1;
    }
  },
};


