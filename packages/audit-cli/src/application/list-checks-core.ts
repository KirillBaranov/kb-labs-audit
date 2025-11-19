/**
 * @module @kb-labs/audit-cli/application/list-checks-core
 * Core list checks logic (shared between CLI and REST)
 */

import { createCheckRegistry } from '@kb-labs/audit-core';
import { CHECK_DESCRIPTIONS } from '../domain/checks/descriptions.js';

/**
 * Check information
 */
export interface CheckInfo {
  id: string;
  description: string;
  available: boolean;
}

/**
 * List checks result
 */
export interface ListChecksResult {
  checks: CheckInfo[];
}

/**
 * Runtime context for core functions
 */
export interface ListChecksRuntimeContext {
  /** Logging */
  log: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Core list checks execution (shared between CLI and REST)
 */
export async function listChecksCore(
  ctx: ListChecksRuntimeContext
): Promise<ListChecksResult> {
  const registry = await createCheckRegistry();
  const checks: CheckInfo[] = [];

  for (const [id, adapter] of registry.entries()) {
    checks.push({
      id,
      description: CHECK_DESCRIPTIONS[id] || 'Unknown check',
      available: !!adapter,
    });
  }

  return {
    checks: checks.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

