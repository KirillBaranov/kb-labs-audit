import { describe, expect, it } from 'vitest';
import { aggregateResults } from '../aggregator';

describe('aggregateResults', () => {
  it('returns ok when every check succeeds', () => {
    const { overall } = aggregateResults({
      style: { id: 'style', ok: true },
      tests: { id: 'tests', ok: true },
    });

    expect(overall).toEqual({ ok: true, failReasons: [] });
  });

  it('collects fail reasons with coverage thresholds', () => {
    const thresholds = {
      lines: 80,
      branches: 85,
      functions: 90,
      statements: 95,
    };

    const { overall } = aggregateResults(
      {
        tests: {
          id: 'tests',
          ok: false,
          details: {
            coverage: {
              lines: 70,
              branches: 80,
              functions: 88,
              statements: 90,
            },
          },
        },
        style: { id: 'style', ok: false, code: 'LINT_ERROR' },
      },
      { coverageThresholds: thresholds }
    );

    expect(overall.ok).toBe(false);
    expect(overall.failReasons).toEqual([
      'tests.coverage.lines<80',
      'tests.coverage.branches<85',
      'tests.coverage.functions<90',
      'tests.coverage.statements<95',
      'tests.failed',
      'style.LINT_ERROR',
    ]);
  });
});


