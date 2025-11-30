/**
 * Audit clean command
 * Cleans the .kb/audit directory
 */

import { rm } from 'node:fs/promises';
import { defineCommand, type CommandResult } from '@kb-labs/shared-command-kit';
import { findRepoRoot } from '../../shared/utils';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events';
import {
  cleanAuditCore,
  type CleanAuditRuntimeContext,
} from '../../application/index';

type AuditCleanFlags = {
  json: { type: 'boolean'; description?: string; default?: boolean };
};

type AuditCleanResult = CommandResult & {
  existed?: boolean;
  auditDir?: string;
  message?: string;
};

export const cleanCommand = defineCommand<AuditCleanFlags, AuditCleanResult>({
  name: 'audit:clean',
  flags: {
    json: {
      type: 'boolean',
      description: 'Output in JSON format',
      default: false,
    },
  },
  analytics: {
    startEvent: ANALYTICS_EVENTS.CLEAN_STARTED,
    finishEvent: ANALYTICS_EVENTS.CLEAN_FINISHED,
    actor: ANALYTICS_ACTOR.id,
  },
  async handler(ctx, argv, flags) {
    const cwd = ctx.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);
    
    ctx.tracker.checkpoint('start');

    // Create runtime context
    const runtimeCtx: CleanAuditRuntimeContext = {
      fs: {
        rm,
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

    // Execute clean audit core
    const result = await cleanAuditCore({ repoRoot }, runtimeCtx);

    ctx.tracker.checkpoint('complete');
    
    ctx.logger?.info('Audit clean completed', { existed: result.existed, auditDir: result.auditDir });

    if (flags.json) {
      ctx.output?.json({
        ok: true,
        message: result.existed ? 'Audit directory cleaned' : 'Audit directory does not exist',
        auditDir: result.auditDir,
      });
    } else {
      if (!ctx.output) {
        throw new Error('Output not available');
      }

      if (result.existed) {
        const outputText = ctx.output.ui.sideBox({
          title: 'Clean Audit Directory',
          sections: [
            {
              items: [
                `${ctx.output.ui.symbols.success} Audit directory cleaned`,
                `${ctx.output.ui.colors.muted(`Path: ${result.auditDir}`)}`,
              ],
            },
          ],
          status: 'success',
          timing: ctx.tracker.total(),
        });
        ctx.output.write(outputText);
      } else {
        const outputText = ctx.output.ui.sideBox({
          title: 'Clean Audit Directory',
          sections: [
            {
              items: [ctx.output.ui.colors.muted('Audit directory does not exist.')],
            },
          ],
          status: 'info',
          timing: ctx.tracker.total(),
        });
        ctx.output.write(outputText);
      }
    }

    return { ok: true, existed: result.existed, auditDir: result.auditDir };
  },
});
