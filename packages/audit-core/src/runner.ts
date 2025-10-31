/**
 * Main audit runner - orchestrates check execution
 */

import type { AuditConfig, AuditCheckResult, CheckId } from './types';
import { aggregateResults } from './aggregator';

export interface CheckAdapter {
  id: CheckId;
  run(cwd: string, timeoutMs: number, ...args: unknown[]): Promise<AuditCheckResult>;
}

export interface RunnerOptions {
  config: AuditConfig;
  cwd: string;
  profile?: string;
  adapters?: Map<CheckId, CheckAdapter>;
}

/**
 * Run audit checks with parallel execution and concurrency control
 */
export async function runAudit(options: RunnerOptions): Promise<{
  checks: Partial<Record<CheckId, AuditCheckResult>>;
  overall: { ok: boolean; failReasons: string[] };
}> {
  const { config, cwd, adapters } = options;

  // Get enabled checks
  const enabledChecks = config.enable || [];
  const concurrency = config.concurrency || 4;

  // Get adapters for enabled checks
  const checkTasks: Array<{ id: CheckId; adapter: CheckAdapter }> = [];
  if (adapters) {
    for (const id of enabledChecks) {
      const adapter = adapters.get(id);
      if (adapter) {
        checkTasks.push({ id, adapter });
      }
    }
  }

  // Run checks with concurrency limit
  const results: Partial<Record<CheckId, AuditCheckResult>> = {};
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < checkTasks.length; i += concurrency) {
    const batch = checkTasks.slice(i, i + concurrency);
    const promises = batch.map(async ({ id, adapter }) => {
      const timeoutMs = getTimeoutForCheck(id, config);
      try {
        // Special handling for TestsCheck which needs coverage thresholds
        if (id === 'tests' && 'run' in adapter && typeof adapter.run === 'function') {
          const result = await (adapter.run as any)(cwd, timeoutMs, config.thresholds?.coverage);
          return { id, result };
        }
        const result = await adapter.run(cwd, timeoutMs);
        return { id, result };
      } catch (error) {
        return {
          id,
          result: {
            id,
            ok: false,
            code: 'AUDIT_TOOL_ERROR',
            hint: error instanceof Error ? error.message : String(error),
            timingMs: Date.now() - startTime,
            details: { error: String(error) },
          } as AuditCheckResult,
        };
      }
    });

    const batchResults = await Promise.allSettled(promises);
    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        results[settled.value.id] = settled.value.result;
      }
    }
  }

  // Aggregate results
  const aggregation = aggregateResults(results, {
    coverageThresholds: config.thresholds?.coverage,
  });

  return {
    checks: results,
    overall: aggregation.overall,
  };
}

/**
 * Get timeout for a specific check
 */
function getTimeoutForCheck(id: CheckId, config: AuditConfig): number {
  const timeouts = config.timeouts || {};
  switch (id) {
    case 'style':
      return timeouts.styleMs || 30000;
    case 'types':
      return timeouts.typesMs || 60000;
    case 'tests':
      return timeouts.testsMs || 300000;
    case 'build':
      return timeouts.buildMs || 180000;
    case 'devlink':
      return timeouts.devlinkMs || 10000;
    case 'mind':
      return timeouts.mindMs || 10000;
    case 'security':
      return 30000; // Default for security
    default:
      return 60000;
  }
}

