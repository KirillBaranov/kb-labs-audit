import { z } from 'zod';

export const AuditCheckIdSchema = z.enum([
  'style',
  'types',
  'tests',
  'build',
  'devlink',
  'mind',
  'security'
]);

export const CoverageThresholdsSchema = z.object({
  lines: z.number().int().min(0),
  branches: z.number().int().min(0),
  functions: z.number().int().min(0),
  statements: z.number().int().min(0)
});

export const AuditFailOnSchema = z.enum(['warn', 'error', 'any']);

export const AuditReportOutputsSchema = z
  .object({
    json: z.boolean().optional(),
    md: z.boolean().optional(),
    html: z.boolean().optional(),
    text: z.boolean().optional()
  })
  .partial();
