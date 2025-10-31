/**
 * Audit clean command
 * Cleans the .kb/audit directory
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '@kb-labs/cli-commands/types';
import { box, safeColors, safeSymbols } from '@kb-labs/shared-cli-ui';
import { findRepoRoot } from '../utils.js';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

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

          const auditDir = join(repoRoot, '.kb', 'audit');

          await rm(auditDir, { recursive: true, force: true });
          
          const totalTime = Date.now() - startTime;

          if (jsonMode) {
            ctx.presenter.json({ ok: true, message: 'Audit directory cleaned' });
          } else {
            const output = box('Clean', [
              `${safeSymbols.success} Audit directory cleaned: ${auditDir}`,
            ]);
            ctx.presenter.write(output);
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

          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await emit({
              type: ANALYTICS_EVENTS.CLEAN_FINISHED,
              payload: {
                durationMs: totalTime,
                result: 'success',
                note: 'Directory does not exist',
              },
            });

            if (jsonMode) {
              ctx.presenter.json({ ok: true, message: 'Audit directory does not exist' });
            } else {
              ctx.presenter.write(safeColors.dim('Audit directory does not exist.'));
            }
            return 0;
          }

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
            ctx.presenter.error(`Failed to clean directory: ${error instanceof Error ? error.message : String(error)}`);
          }
          return 1;
        }
      }
    );
  },
};


