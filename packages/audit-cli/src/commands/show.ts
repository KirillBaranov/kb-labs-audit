/**
 * Audit show command
 * Displays the last audit report
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '@kb-labs/cli-commands/types';
import { findRepoRoot } from '../utils.js';
import type { AuditReport } from '@kb-labs/audit-core';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

export const show: Command = {
  name: 'audit:show',
  category: 'audit',
  describe: 'Show last audit report',
  async run(ctx, argv, flags) {
    const startTime = Date.now();
    const jsonMode = !!flags.json;
    const cwd = ctx?.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);

    return await runScope(
      {
        actor: ANALYTICS_ACTOR,
        ctx: { workspace: cwd },
      },
      async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>) => {
        try {
          // Track command start
          await emit({
            type: ANALYTICS_EVENTS.SHOW_STARTED,
            payload: {},
          });

          const reportPath = join(repoRoot, '.kb', 'audit', 'report.json');

          const reportContent = await readFile(reportPath, 'utf-8');
          const report = JSON.parse(reportContent) as AuditReport;

          const totalTime = Date.now() - startTime;

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

          // Track command completion
          await emit({
            type: ANALYTICS_EVENTS.SHOW_FINISHED,
            payload: {
              overallOk: report.overall.ok,
              checksCount: Object.keys(report.checks).length,
              durationMs: totalTime,
              result: 'success',
            },
          });

          return 0;
        } catch (error) {
          const totalTime = Date.now() - startTime;

          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await emit({
              type: ANALYTICS_EVENTS.SHOW_FINISHED,
              payload: {
                durationMs: totalTime,
                result: 'failed',
                error: 'No audit report found',
              },
            });

            if (jsonMode) {
              ctx.presenter.json({ ok: false, error: 'No audit report found' });
            } else {
              ctx.presenter.error('No audit report found. Run "kb audit run" first.');
            }
            return 3; // Misconfiguration
          }

          // Track command failure
          await emit({
            type: ANALYTICS_EVENTS.SHOW_FINISHED,
            payload: {
              durationMs: totalTime,
              result: 'error',
              error: error instanceof Error ? error.message : String(error),
            },
          });

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
      }
    );
  },
};


