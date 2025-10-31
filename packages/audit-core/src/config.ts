/**
 * Configuration loader for @kb-labs/audit-core
 * Merges: kb-labs.config.json → devkit profile → defaults
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveProfile } from '@kb-labs/shared-profiles';
import { findRepoRoot } from '@kb-labs/core';
import type { AuditConfig, CoverageThresholds } from './types.js';

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
 * Extract coverage thresholds from profile
 */
function extractCoverageThresholds(profile: any): CoverageThresholds | undefined {
  // Try policies.coverageThresholds first
  if (profile.policies?.coverageThresholds) {
    const ct = profile.policies.coverageThresholds;
    if (
      typeof ct.lines === 'number' &&
      typeof ct.branches === 'number' &&
      typeof ct.functions === 'number' &&
      typeof ct.statements === 'number'
    ) {
      return {
        lines: ct.lines,
        branches: ct.branches,
        functions: ct.functions,
        statements: ct.statements,
      };
    }
  }

  // Try meta.coverageThresholds
  if (profile.meta?.coverageThresholds) {
    const ct = profile.meta.coverageThresholds;
    if (
      typeof ct.lines === 'number' &&
      typeof ct.branches === 'number' &&
      typeof ct.functions === 'number' &&
      typeof ct.statements === 'number'
    ) {
      return {
        lines: ct.lines,
        branches: ct.branches,
        functions: ct.functions,
        statements: ct.statements,
      };
    }
  }

  return undefined;
}

/**
 * Load configuration with priority: config file → profile → defaults
 */
export async function loadConfig(opts: {
  cwd?: string;
  profileId?: string;
  profilesDir?: string;
}): Promise<AuditConfig> {
  const cwd = opts.cwd || process.cwd();
  const repoRoot = await findRepoRoot(cwd);

  // Start with defaults
  let config: AuditConfig = { ...DEFAULT_CONFIG };

  // Try to load devkit profile for thresholds
  if (opts.profileId || opts.profilesDir) {
    try {
      const profileId = opts.profileId || 'frontend';
      const { profile } = await resolveProfile({
        repoRoot,
        profileId,
        profilesDir: opts.profilesDir,
      });

      const coverageThresholds = extractCoverageThresholds(profile);
      if (coverageThresholds) {
        config.thresholds = {
          ...config.thresholds,
          coverage: coverageThresholds,
        };
      }
    } catch (error) {
      // Profile not found or invalid - continue with defaults
      console.warn(`[audit] Could not load profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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
      console.warn(`[audit] Could not load kb-labs.config.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return config;
}

