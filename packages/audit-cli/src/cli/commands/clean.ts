/**
 * Audit clean command
 * Cleans the .kb/audit directory
 */

import { rm } from 'node:fs/promises';
import type { Command } from '@kb-labs/cli-commands';
import { box, safeColors, safeSymbols } from '@kb-labs/shared-cli-ui';
import { findRepoRoot } from '../../shared/utils.js';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';
import {
  cleanAuditCore,
  type CleanAuditRuntimeContext,
} from '../../application/index.js';

export const clean: Command = {
  name: 'audit:clean',
  category: 'audit',
  describe: 'Clean audit output directory',
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
            type: ANALYTICS_EVENTS.CLEAN_STARTED,
            payload: {},
          });

          // Create runtime context
          const runtimeCtx: CleanAuditRuntimeContext = {
            fs: {
              rm,
            },
            log: (level, msg) => {
              if (level !== 'debug') {
                ctx.presenter[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'](msg);
              }
            },
          };

          // Execute clean audit core
          const result = await cleanAuditCore({ repoRoot }, runtimeCtx);

          const totalTime = Date.now() - startTime;

          if (jsonMode) {
            ctx.presenter.json({
              ok: true,
              message: result.existed ? 'Audit directory cleaned' : 'Audit directory does not exist',
              auditDir: result.auditDir,
            });
          } else {
            if (result.existed) {
              const output = box('Clean', [
                `${safeSymbols.success} Audit directory cleaned: ${result.auditDir}`,
              ]);
              ctx.presenter.write(output);
            } else {
              ctx.presenter.write(safeColors.dim('Audit directory does not exist.'));
            }
          }

          // Track command completion
          await emit({
            type: ANALYTICS_EVENTS.CLEAN_FINISHED,
            payload: {
              durationMs: totalTime,
              result: 'success',
            },
          });

          return 0;
        } catch (error) {
          const totalTime = Date.now() - startTime;

          // Track command failure
          await emit({
            type: ANALYTICS_EVENTS.CLEAN_FINISHED,
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
              `Failed to clean directory: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          return 1;
        }
      }
    );
  },
};

export async function cleanCommand(
  ctx: Parameters<Command['run']>[0],
  argv: Parameters<Command['run']>[1],
  flags: Parameters<Command['run']>[2]
) {
  return clean.run(ctx, argv, flags);
}
