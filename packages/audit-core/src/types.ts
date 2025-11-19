/**
 * Core types for @kb-labs/audit-core
 */

import type { CheckId, AuditCheckResult, CoverageThresholds } from '@kb-labs/audit-contracts';

// Re-export types from contracts to maintain backward compatibility
export type { CheckId, AuditCheckResult, CoverageThresholds };

export interface AuditReport {
  schemaVersion: '1.0';
  ts: string; // ISO timestamp
  context: {
    repo: string;
    cwd: string;
    profile?: string;
  };
  checks: Partial<Record<CheckId, AuditCheckResult>>;
  overall: {
    ok: boolean;
    failReasons: string[];
  };
  meta: {
    node: string;
    kbCli?: string;
    pnpm?: string;
    timingMs: { total: number };
  };
}

export interface AuditConfig {
  enable: CheckId[];
  thresholds?: {
    coverage?: CoverageThresholds;
  };
  timeouts?: {
    styleMs?: number;
    typesMs?: number;
    testsMs?: number;
    buildMs?: number;
    devlinkMs?: number;
    mindMs?: number;
  };
  scope?: {
    include?: string[];
    exclude?: string[];
  };
  output?: {
    json?: boolean;
    md?: boolean;
    html?: boolean;
    text?: boolean;
  };
  concurrency?: number;
}


