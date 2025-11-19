/**
 * Audit list-checks command
 */

import type { Command } from '@kb-labs/cli-commands';
import { box, keyValue, safeColors } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';
import { listChecksCore, type ListChecksRuntimeContext } from '../../application/index.js';

export const listChecks: Command = {
  name: 'audit:list-checks',
  category: 'audit',
  describe: 'List available audit checks',
  async run(ctx, argv, flags) {
    const startTime = Date.now();
    const jsonMode = !!flags.json;
    const cwd = ctx?.cwd || process.cwd();

    return await runScope(
      {
        actor: ANALYTICS_ACTOR,
        ctx: { workspace: cwd },
      },
      async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>) => {
        try {
          // Track command start
          await emit({
            type: ANALYTICS_EVENTS.LIST_CHECKS_STARTED,
            payload: {},
          });

          // Create runtime context
          const runtimeCtx: ListChecksRuntimeContext = {
            log: (level, msg) => {
              if (level !== 'debug') {
                ctx.presenter[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'](msg);
              }
            },
          };

          // Execute list checks core
          const result = await listChecksCore(runtimeCtx);

          const totalTime = Date.now() - startTime;

          if (jsonMode) {
            ctx.presenter.json({
              checks: result.checks,
            });
          } else {
            const lines: string[] = [];
            lines.push('Available audit checks:');
            lines.push('');

            const checkDisplay: Record<string, string> = {};
            for (const check of result.checks) {
              const icon = check.available ? safeColors.success('✓') : safeColors.error('✗');
              checkDisplay[check.id.padEnd(12)] = `${icon} ${check.description}`;
            }

            lines.push(...keyValue(checkDisplay));
            const output = box('Audit Checks', lines);
            ctx.presenter.write(output);
          }

          // Track command completion
          await emit({
            type: ANALYTICS_EVENTS.LIST_CHECKS_FINISHED,
            payload: {
              checksCount: result.checks.length,
              availableCount: result.checks.filter((c) => c.available).length,
              durationMs: totalTime,
              result: 'success',
            },
          });

          return 0;
        } catch (error: any) {
          const totalTime = Date.now() - startTime;

          // Track command failure
          await emit({
            type: ANALYTICS_EVENTS.LIST_CHECKS_FINISHED,
            payload: {
              durationMs: totalTime,
              result: 'error',
              error: error.message || String(error),
            },
          });

          throw error;
        }
      }
    );
  },
};

export async function listChecksCommand(
  ctx: Parameters<Command['run']>[0],
  argv: Parameters<Command['run']>[1],
  flags: Parameters<Command['run']>[2]
) {
  return listChecks.run(ctx, argv, flags);
}
