/**
 * Audit list-checks command
 */

import type { Command } from '@kb-labs/cli-commands/types';
import { box, keyValue, safeColors } from '@kb-labs/shared-cli-ui';
import { createCheckRegistry } from '@kb-labs/audit-core';

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
    const jsonMode = !!flags.json;

    const registry = createCheckRegistry();
    const checks: Array<{ id: string; description: string; available: boolean }> = [];

    for (const [id, adapter] of registry.entries()) {
      checks.push({
        id,
        description: CHECK_DESCRIPTIONS[id] || 'Unknown check',
        available: !!adapter,
      });
    }

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

    return 0;
  },
};

