import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuditReportSchema } from '@kb-labs/audit-contracts';
import { findRepoRoot } from '../../shared/utils';

type HandlerContext = {
  cwd?: string;
};

export async function handleGetLatestReport(input: unknown, ctx: HandlerContext = {}) {
  const cwd = ctx.cwd ?? process.cwd();
  const repoRoot = await findRepoRoot(cwd);
  const reportPath = join(repoRoot, '.kb', 'audit', 'report.json');

  let raw: string;
  try {
    raw = await readFile(reportPath, 'utf-8');
  } catch (error) {
    const notFound = new Error('Audit report not found');
    (notFound as Error & { code?: string; cause?: unknown }).code = 'AUDIT_REPORT_NOT_FOUND';
    notFound.cause = error;
    throw notFound;
  }

  try {
    const parsed = JSON.parse(raw);
    return AuditReportSchema.parse(parsed);
  } catch (error) {
    const parseError = new Error(
      error instanceof Error ? error.message : 'Failed to parse audit report'
    );
    (parseError as Error & { code?: string; cause?: unknown }).code = 'AUDIT_REPORT_PARSE_ERROR';
    parseError.cause = error;
    throw parseError;
  }
}


