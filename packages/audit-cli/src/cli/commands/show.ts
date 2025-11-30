/**
 * Audit show command
 * Displays the last audit report
 */

import { readFile } from 'node:fs/promises';
import { defineCommand, type CommandResult } from '@kb-labs/shared-command-kit';
import { findRepoRoot } from '../../shared/utils';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';
import {
  showReportCore,
  type ShowReportRuntimeContext,
} from '../../application/index';

type AuditShowFlags = {
  json: { type: 'boolean'; description?: string; default?: boolean };
};

type AuditShowResult = CommandResult & {
  report?: {
    ts: string;
    context: { repo: string };
    overall: { ok: boolean; failReasons: string[] };
    checks: Record<string, unknown>;
  };
};

export const showCommand = defineCommand<AuditShowFlags, AuditShowResult>({
  name: 'audit:show',
  flags: {
    json: {
      type: 'boolean',
      description: 'Output in JSON format',
      default: false,
    },
  },
  analytics: {
    startEvent: ANALYTICS_EVENTS.SHOW_STARTED,
    finishEvent: ANALYTICS_EVENTS.SHOW_FINISHED,
    actor: ANALYTICS_ACTOR.id,
  },
  async handler(ctx, argv, flags) {
    const cwd = ctx.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);

    ctx.tracker.checkpoint('start');
    
    // Create runtime context
    const runtimeCtx: ShowReportRuntimeContext = {
      fs: {
        readFile,
      },
      log: (level, msg) => {
        if (level !== 'debug') {
          if (ctx.output) {
            if (level === 'error') {
              ctx.output.error(msg instanceof Error ? msg : new Error(msg));
            } else if (level === 'warn') {
              ctx.output.warn(msg);
            } else {
              ctx.output.info(msg);
            }
          }
          ctx.logger?.[level](msg);
        } else {
          ctx.logger?.[level](msg);
        }
      },
    };

    try {
      // Execute show report core
      const result = await showReportCore({ repoRoot }, runtimeCtx);

      ctx.tracker.checkpoint('complete');
      
      ctx.logger?.info('Audit show completed', { 
        overallOk: result.report.overall.ok,
        checksCount: Object.keys(result.report.checks).length,
      });

      if (flags.json) {
        ctx.output?.json(result.report);
      } else {
        if (!ctx.output) {
          throw new Error('Output not available');
        }

        const summaryItems: string[] = [
          `Report date: ${result.report.ts}`,
          `Repository: ${result.report.context.repo}`,
          `Overall: ${result.report.overall.ok ? ctx.output.ui.colors.success('PASS') : ctx.output.ui.colors.error('FAIL')}`,
        ];

        const sections: Array<{ header?: string; items: string[] }> = [
          {
            header: 'Summary',
            items: summaryItems,
          },
        ];

        if (!result.report.overall.ok && result.report.overall.failReasons.length > 0) {
          sections.push({
            header: 'Fail reasons',
            items: result.report.overall.failReasons.map(
              (reason) => `${ctx.output!.ui.symbols.error} ${reason}`
            ),
          });
        }

        const outputText = ctx.output.ui.sideBox({
          title: 'Audit Report',
          sections,
          status: result.report.overall.ok ? 'success' : 'error',
          timing: ctx.tracker.total(),
        });
        ctx.output.write(outputText);
      }

      return { ok: result.report.overall.ok, report: result.report };
    } catch (error) {
      if (error instanceof Error && error.message === 'No audit report found. Run "kb audit run" first.') {
        ctx.logger?.warn('No audit report found');
        
        if (flags.json) {
          ctx.output?.json({ ok: false, error: 'No audit report found' });
        } else {
          ctx.output?.error(new Error('No audit report found. Run "kb audit run" first.'));
        }
        // Return exit code 3 for misconfiguration
        return 3;
      }
      throw error;
    }
  },
});
