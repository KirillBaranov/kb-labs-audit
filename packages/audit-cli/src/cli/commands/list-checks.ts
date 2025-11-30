/**
 * Audit list-checks command
 */

import { defineCommand, type CommandResult } from '@kb-labs/shared-command-kit';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';
import { listChecksCore, type ListChecksRuntimeContext } from '../../application/index';

type AuditListChecksFlags = {
  json: { type: 'boolean'; description?: string; default?: boolean };
};

type AuditListChecksResult = CommandResult & {
  checks?: Array<{
    id: string;
    description: string;
    available: boolean;
  }>;
};

export const listChecksCommand = defineCommand<AuditListChecksFlags, AuditListChecksResult>({
  name: 'audit:list-checks',
  flags: {
    json: {
      type: 'boolean',
      description: 'Output in JSON format',
      default: false,
    },
  },
  analytics: {
    startEvent: ANALYTICS_EVENTS.LIST_CHECKS_STARTED,
    finishEvent: ANALYTICS_EVENTS.LIST_CHECKS_FINISHED,
    actor: ANALYTICS_ACTOR.id,
  },
  async handler(ctx, argv, flags) {
    const cwd = ctx.cwd || process.cwd();
    
    ctx.tracker.checkpoint('start');

    // Create runtime context
    const runtimeCtx: ListChecksRuntimeContext = {
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

    // Execute list checks core
    const result = await listChecksCore(runtimeCtx);

    ctx.tracker.checkpoint('complete');
    
    ctx.logger?.info('Audit list-checks completed', { 
      checksCount: result.checks.length,
      availableCount: result.checks.filter((c) => c.available).length,
    });

    if (flags.json) {
      ctx.output?.json({
        checks: result.checks,
      });
    } else {
      if (!ctx.output) {
        throw new Error('Output not available');
      }

      const checkItems: string[] = [];
      for (const check of result.checks) {
        const icon = check.available ? ctx.output.ui.symbols.success : ctx.output.ui.symbols.error;
        const color = check.available ? ctx.output.ui.colors.success : ctx.output.ui.colors.error;
        checkItems.push(`${icon} ${ctx.output.ui.colors.bold(check.id.padEnd(12))}: ${color(check.description)}`);
      }

      const outputText = ctx.output.ui.sideBox({
        title: 'Audit Checks',
        sections: [
          {
            header: 'Available checks',
            items: checkItems,
          },
        ],
        status: 'info',
        timing: ctx.tracker.total(),
      });
      ctx.output.write(outputText);
    }

    return { ok: true, checks: result.checks };
  },
});
