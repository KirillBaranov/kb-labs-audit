/**
 * Core types for @kb-labs/audit-core
 */

export type CheckId = 'style' | 'types' | 'tests' | 'build' | 'devlink' | 'mind' | 'security';

export interface AuditCheckResult {
  id: CheckId;
  ok: boolean;
  code?: string;
  details?: unknown;
  hint?: string;
  timingMs?: number;
}

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

export interface CoverageThresholds {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
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

