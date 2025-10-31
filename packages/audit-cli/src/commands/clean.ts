/**
 * Audit clean command
 * Cleans the .kb/audit directory
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '@kb-labs/cli-commands/types';
import { box, safeColors, safeSymbols } from '@kb-labs/shared-cli-ui';
import { findRepoRoot } from '../utils.js';

export const clean: Command = {
  name: 'audit:clean',
  category: 'audit',
  describe: 'Clean audit output directory',
  async run(ctx, argv, flags) {
    const jsonMode = !!flags.json;
    const cwd = ctx?.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);

    const auditDir = join(repoRoot, '.kb', 'audit');

    try {
      await rm(auditDir, { recursive: true, force: true });
      if (jsonMode) {
        ctx.presenter.json({ ok: true, message: 'Audit directory cleaned' });
      } else {
        const output = box('Clean', [
          `${safeSymbols.success} Audit directory cleaned: ${auditDir}`,
        ]);
        ctx.presenter.write(output);
      }
      return 0;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if (jsonMode) {
          ctx.presenter.json({ ok: true, message: 'Audit directory does not exist' });
        } else {
          ctx.presenter.write(safeColors.dim('Audit directory does not exist.'));
        }
        return 0;
      }
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
  },
};

