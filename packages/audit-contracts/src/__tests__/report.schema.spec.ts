import { describe, expect, it } from 'vitest';
import { AuditReportSchema } from '../schema/report.schema.js';

const baseReport = {
  schemaVersion: '1.0',
  ts: '2024-01-01T00:00:00.000Z',
  context: {
    repo: 'kb-labs',
    cwd: '/tmp/repo',
    profile: 'default',
  },
  checks: {
    style: {
      id: 'style',
      ok: true,
      timingMs: 10,
    },
  },
  overall: {
    ok: true,
    failReasons: [],
  },
  meta: {
    node: 'v20.10.0',
    kbCli: '0.42.0',
    pnpm: '9.1.0',
    timingMs: {
      total: 1234,
    },
  },
};

describe('AuditReportSchema', () => {
  it('accepts a valid report payload', () => {
    const parsed = AuditReportSchema.parse(baseReport);
    expect(parsed.context.repo).toBe('kb-labs');
    expect(parsed.checks.style?.ok).toBe(true);
  });

  it('rejects report with invalid schema version', () => {
    expect(() =>
      AuditReportSchema.parse({
        ...baseReport,
        schemaVersion: '2.0',
      })
    ).toThrow(/Invalid literal value/);
  });
});


