/**
 * Audit list-checks command
 */

import type { Command } from '@kb-labs/cli-commands';
import { box, keyValue, safeColors } from '@kb-labs/shared-cli-ui';
import { createCheckRegistry } from '@kb-labs/audit-core';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

const CHECK_DESCRIPTIONS: Record<string, string> = {
  style: 'Code style checks via eslint',
  types: 'Type checking via tsc',
  tests: 'Test execution and coverage via vitest',
  build: 'Build verification (tsup/rollup/vite)',
  devlink: 'Dependency cycle and mismatch detection',
  mind: 'Mind workspace verification',
  security: 'Security audit via npm audit',
};

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

          const registry = await createCheckRegistry();
          const checks: Array<{ id: string; description: string; available: boolean }> = [];

          for (const [id, adapter] of registry.entries()) {
            checks.push({
              id,
              description: CHECK_DESCRIPTIONS[id] || 'Unknown check',
              available: !!adapter,
            });
          }

          const totalTime = Date.now() - startTime;

          if (jsonMode) {
            ctx.presenter.json({
              checks: checks.sort((a, b) => a.id.localeCompare(b.id)),
            });
          } else {
            const lines: string[] = [];
            lines.push('Available audit checks:');
            lines.push('');

            const checkDisplay: Record<string, string> = {};
            for (const check of checks.sort((a, b) => a.id.localeCompare(b.id))) {
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
              checksCount: checks.length,
              availableCount: checks.filter(c => c.available).length,
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


