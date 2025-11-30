export * from './schema';
export * from './types';
export {
  pluginContractsManifest,
  type PluginArtifactIds,
  type PluginCommandIds,
  type PluginRouteIds,
} from './contract';
// Re-export types for convenience
export type {
  AuditCheckResultContract,
  AuditReportContract,
} from './schema/report.schema';
export type { AuditListChecksEntryContract } from './schema/list.schema';

// Re-export base schema types with simplified names
export {
  AuditCheckIdSchema,
  CoverageThresholdsSchema,
} from './schema/base.schema';

// Type aliases for backward compatibility
import type { z } from 'zod';
import type { AuditCheckIdSchema, CoverageThresholdsSchema } from './schema/base.schema';
import type { AuditCheckResultContract } from './schema/report.schema';

export type CheckId = z.infer<typeof AuditCheckIdSchema>;
export type CoverageThresholds = z.infer<typeof CoverageThresholdsSchema>;
export type AuditCheckResult = AuditCheckResultContract;
