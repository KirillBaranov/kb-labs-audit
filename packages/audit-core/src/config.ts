/**
 * Configuration loader for @kb-labs/audit-core
 * Merges: kb-labs.config.json → defaults
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findRepoRoot, getLogger } from '@kb-labs/core';
import type { CoverageThresholds } from '@kb-labs/audit-contracts';
import type { AuditConfig } from './types';

const log = getLogger('audit-core');

const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
  lines: 90,
  branches: 85,
  functions: 90,
  statements: 90,
};

const DEFAULT_TIMEOUTS = {
  styleMs: 30000,
  typesMs: 60000,
  testsMs: 300000,
  buildMs: 180000,
  devlinkMs: 10000,
  mindMs: 10000,
};

const DEFAULT_CONFIG: AuditConfig = {
  enable: ['style', 'types', 'tests', 'build', 'devlink', 'mind'],
  thresholds: {
    coverage: DEFAULT_COVERAGE_THRESHOLDS,
  },
  timeouts: DEFAULT_TIMEOUTS,
  output: {
    json: true,
    md: true,
    html: false,
    text: true,
  },
  concurrency: 4,
};

/**
 * Load configuration with priority: config file → defaults
 */
export async function loadConfig(opts: {
  cwd?: string;
}): Promise<AuditConfig> {
  const cwd = opts.cwd || process.cwd();
  const repoRoot = await findRepoRoot(cwd);

  // Start with defaults
  let config: AuditConfig = { ...DEFAULT_CONFIG };

  // Load kb-labs.config.json and merge (highest priority)
  try {
    const configPath = join(repoRoot, 'kb-labs.config.json');
    const configContent = await readFile(configPath, 'utf-8');
    const fileConfig = JSON.parse(configContent) as { audit?: Partial<AuditConfig> };

    if (fileConfig.audit) {
      // Deep merge
      config = {
        enable: fileConfig.audit.enable ?? config.enable,
        thresholds: {
          ...config.thresholds,
          ...fileConfig.audit.thresholds,
          coverage: fileConfig.audit.thresholds?.coverage ?? config.thresholds?.coverage,
        },
        timeouts: {
          ...config.timeouts,
          ...fileConfig.audit.timeouts,
        },
        scope: fileConfig.audit.scope ?? config.scope,
        output: {
          ...config.output,
          ...fileConfig.audit.output,
        },
        concurrency: fileConfig.audit.concurrency ?? config.concurrency,
      };
    }
  } catch (error) {
    // Config file not found - continue with profile/defaults
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn('Could not load kb-labs.config.json', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return config;
}

