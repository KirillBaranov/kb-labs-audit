import { z } from 'zod';
import { AuditCheckIdSchema } from './base.schema';

export const AuditListChecksEntrySchema = z.object({
  id: AuditCheckIdSchema,
  description: z.string(),
  available: z.boolean()
});

export const AuditListChecksResponseSchema = z.object({
  checks: z.array(AuditListChecksEntrySchema)
});

// Export TypeScript types from Zod schemas
export type AuditListChecksEntryContract = z.infer<typeof AuditListChecksEntrySchema>;


