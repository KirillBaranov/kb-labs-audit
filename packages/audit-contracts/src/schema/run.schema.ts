import { z } from 'zod';
import {
  AuditCheckIdSchema,
  AuditFailOnSchema,
  AuditReportOutputsSchema
} from './base.schema';
import { AuditChecksSchema, AuditOverallSchema } from './report.schema';

export const AuditRunPackageSchema = z.object({
  name: z.string(),
  path: z.string(),
  private: z.boolean().optional()
});

export const AuditRunRequestSchema = z.object({
  scope: z.string().optional(),
  profile: z.string().optional(),
  failOn: AuditFailOnSchema.optional(),
  dryRun: z.boolean().optional(),
  all: z.boolean().optional(),
  verbose: z.boolean().optional(),
  outputs: AuditReportOutputsSchema.optional()
});

export const AuditRunDryRunResponseSchema = z.object({
  ok: z.literal(true),
  dryRun: z.literal(true),
  packages: z.array(AuditRunPackageSchema),
  checks: z.array(AuditCheckIdSchema),
  summary: z.object({
    totalPackages: z.number().int().nonnegative(),
    enabledChecks: z.number().int().nonnegative()
  })
});

export const AuditRunSuccessResponseSchema = z.object({
  ok: z.literal(true),
  checks: AuditChecksSchema,
  overall: AuditOverallSchema,
  files: z.array(z.string()).optional(),
  timingMs: z.number().int().nonnegative().optional()
});

export const AuditRunErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  timingMs: z.number().int().nonnegative().optional()
});

export const AuditRunJsonResponseSchema = z.union([
  AuditRunDryRunResponseSchema,
  AuditRunSuccessResponseSchema,
  AuditRunErrorResponseSchema
]);


