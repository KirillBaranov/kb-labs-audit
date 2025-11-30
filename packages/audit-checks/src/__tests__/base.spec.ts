import { describe, expect, it } from 'vitest';
import { BaseCheckAdapter } from '../base';

class TestCheck extends BaseCheckAdapter {
  id = 'style' as const;

  async run() {
    return this.createSuccessResult({ ok: true }, 'all good', 10);
  }

  simulateError() {
    return this.createErrorResult('TEST_ERROR', 'broken', 5, { reason: 'fail' });
  }

  simulateSkip(reason: string) {
    return this.createSkippedResult(reason);
  }
}

describe('BaseCheckAdapter', () => {
  it('creates success result with hint and details', async () => {
    const check = new TestCheck();
    const result = await check.run('.', 1000);
    expect(result).toEqual({
      id: 'style',
      ok: true,
      details: { ok: true },
      hint: 'all good',
      timingMs: 10,
    });
  });

  it('creates error result with code and timing', () => {
    const check = new TestCheck();
    const result = check.simulateError();
    expect(result).toEqual({
      id: 'style',
      ok: false,
      code: 'TEST_ERROR',
      hint: 'broken',
      timingMs: 5,
      details: { reason: 'fail' },
    });
  });

  it('creates skipped result with reason', () => {
    const check = new TestCheck();
    const result = check.simulateSkip('missing deps');
    expect(result).toEqual({
      id: 'style',
      ok: true,
      details: 'skipped: missing deps',
    });
  });
});


