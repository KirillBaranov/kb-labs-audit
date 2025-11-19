import { z } from 'zod';
import { AuditCheckIdSchema, CoverageThresholdsSchema } from './base.schema';

export const AuditCheckResultSchema = z.object({
  id: AuditCheckIdSchema,
  ok: z.boolean(),
  code: z.string().min(1).optional(),
  details: z.unknown().optional(),
  hint: z.string().optional(),
  timingMs: z.number().int().nonnegative().optional()
});

export const AuditChecksSchema = z.record(AuditCheckIdSchema, AuditCheckResultSchema.optional());

export const AuditOverallSchema = z.object({
  ok: z.boolean(),
  failReasons: z.array(z.string())
});

export const AuditReportContextSchema = z.object({
  repo: z.string(),
  cwd: z.string(),
  profile: z.string().optional()
});

export const AuditReportMetaSchema = z.object({
  node: z.string(),
  kbCli: z.string().optional(),
  pnpm: z.string().optional(),
  timingMs: z.object({
    total: z.number().int().nonnegative()
  })
});

export const AuditReportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  ts: z.string(),
  context: AuditReportContextSchema,
  checks: AuditChecksSchema,
  overall: AuditOverallSchema,
  meta: AuditReportMetaSchema
});

export const AuditReportSummarySchema = z.object({
  report: AuditReportSchema,
  thresholds: CoverageThresholdsSchema.optional(),
  files: z.array(z.string()).optional()
});

// Export TypeScript types from Zod schemas
export type AuditCheckResultContract = z.infer<typeof AuditCheckResultSchema>;
export type AuditReportContract = z.infer<typeof AuditReportSchema>;


