/**
 * Audit list-checks command
 */

import { defineCommand, type CommandResult } from '@kb-labs/cli-command-kit';
import { keyValue } from '@kb-labs/shared-cli-ui';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';
import { listChecksCore, type ListChecksRuntimeContext } from '../../application/index.js';

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
      
      const lines: string[] = [];
      lines.push('Available audit checks:');
      lines.push('');

      const checkDisplay: Record<string, string> = {};
      for (const check of result.checks) {
        const icon = check.available ? ctx.output.ui.colors.success('✓') : ctx.output.ui.colors.error('✗');
        checkDisplay[check.id.padEnd(12)] = `${icon} ${check.description}`;
      }

      lines.push(...keyValue(checkDisplay));
      const outputText = ctx.output.ui.box('Audit Checks', lines);
      ctx.output.write(outputText);
    }

    return { ok: true, checks: result.checks };
  },
});
