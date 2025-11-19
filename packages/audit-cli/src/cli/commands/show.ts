/**
 * Audit show command
 * Displays the last audit report
 */

import { readFile } from 'node:fs/promises';
import type { Command } from '@kb-labs/cli-commands';
import { findRepoRoot } from '../../shared/utils.js';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';
import {
  showReportCore,
  type ShowReportRuntimeContext,
} from '../../application/index.js';

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

          // Create runtime context
          const runtimeCtx: ShowReportRuntimeContext = {
            fs: {
              readFile,
            },
            log: (level, msg) => {
              if (level !== 'debug') {
                ctx.presenter[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'](msg);
              }
            },
          };

          // Execute show report core
          const result = await showReportCore({ repoRoot }, runtimeCtx);

          const totalTime = Date.now() - startTime;

          if (jsonMode) {
            ctx.presenter.json(result.report);
          } else {
            // Pretty print summary
            ctx.presenter.write(`Audit Report: ${result.report.ts}`);
            ctx.presenter.write(`Repository: ${result.report.context.repo}`);
            ctx.presenter.write(`Overall: ${result.report.overall.ok ? 'PASS' : 'FAIL'}`);
            if (!result.report.overall.ok) {
              ctx.presenter.write(`Fail reasons: ${result.report.overall.failReasons.join(', ')}`);
            }
          }

          // Track command completion
          await emit({
            type: ANALYTICS_EVENTS.SHOW_FINISHED,
            payload: {
              overallOk: result.report.overall.ok,
              checksCount: Object.keys(result.report.checks).length,
              durationMs: totalTime,
              result: 'success',
            },
          });

          return 0;
        } catch (error) {
          const totalTime = Date.now() - startTime;

          if (error instanceof Error && error.message === 'No audit report found. Run "kb audit run" first.') {
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
            ctx.presenter.error(
              `Failed to read report: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          return 1;
        }
      }
    );
  },
};

export async function showCommand(
  ctx: Parameters<Command['run']>[0],
  argv: Parameters<Command['run']>[1],
  flags: Parameters<Command['run']>[2]
) {
  return show.run(ctx, argv, flags);
}
