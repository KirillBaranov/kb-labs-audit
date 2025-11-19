/**
 * Core types for KB Labs Audit
 * Shared between audit-core and audit-checks to avoid circular dependencies
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

export interface CoverageThresholds {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

/**
 * Type guard for test check details
 */
export interface TestsCheckDetails {
  coverage?: {
    lines?: number;
    branches?: number;
    functions?: number;
    statements?: number;
  };
  threshold?: CoverageThresholds;
  errors?: number;
  warnings?: number;
  failed?: number;
  passed?: number;
  total?: number;
  exitCode?: number;
  error?: string;
}

/**
 * Type guard for package-scoped check details
 */
export interface PackageScopedCheckDetails {
  packages?: Array<{
    name: string;
    path: string;
    ok: boolean;
    error?: string;
  }>;
}
