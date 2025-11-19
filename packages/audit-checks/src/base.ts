/**
 * Base adapter class for audit checks
 */

import type { AuditCheckResult, CheckId } from '@kb-labs/audit-contracts';
import type { ShellApi } from '@kb-labs/audit-core';

export interface CheckAdapter {
  id: CheckId;
  run(cwd: string, timeoutMs: number, shell?: ShellApi, ...args: unknown[]): Promise<AuditCheckResult>;
}

export abstract class BaseCheckAdapter implements CheckAdapter {
  abstract id: CheckId;

  abstract run(cwd: string, timeoutMs: number, shell?: ShellApi, ...args: unknown[]): Promise<AuditCheckResult>;

  protected createErrorResult(
    code: string,
    hint: string,
    timingMs: number,
    details?: unknown
  ): AuditCheckResult {
    return {
      id: this.id,
      ok: false,
      code,
      hint,
      timingMs,
      details,
    };
  }

  protected createSuccessResult(
    details?: unknown,
    hint?: string,
    timingMs?: number
  ): AuditCheckResult {
    return {
      id: this.id,
      ok: true,
      details,
      hint,
      timingMs,
    };
  }

  protected createSkippedResult(reason: string): AuditCheckResult {
    return {
      id: this.id,
      ok: true,
      details: `skipped: ${reason}`,
    };
  }
}

