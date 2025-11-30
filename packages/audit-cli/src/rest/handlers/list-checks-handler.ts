import { AuditListChecksResponseSchema } from '@kb-labs/audit-contracts';
import { createCheckRegistry } from '@kb-labs/audit-core';
import { CHECK_DESCRIPTIONS } from '../../domain/checks/descriptions';

export async function handleListChecks() {
  const registry = await createCheckRegistry();
  const checks = Array.from(registry.entries() as Iterable<[string, unknown]>).map(([id, adapter]) => ({
    id,
    description: CHECK_DESCRIPTIONS[id] ?? 'Unknown check',
    available: Boolean(adapter),
  }));

  return AuditListChecksResponseSchema.parse({
    checks: checks.sort((a, b) => a.id.localeCompare(b.id)),
  });
}


