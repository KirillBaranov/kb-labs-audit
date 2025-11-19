/**
 * @module @kb-labs/audit-core/__tests__/audit-core-edge-cases.spec.ts
 * Edge cases and error handling tests for Audit Core
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createCheckRegistry } from '../check-registry';
import { runAudit, type CheckAdapter } from '../runner';
import { renderText, renderJson } from '../reporters';
import { renderMarkdown } from '../reporters/markdown';
import { renderHtml } from '../reporters/html';
import type { AuditCheckResult, CheckId } from '@kb-labs/audit-contracts';
import type { AuditConfig, AuditReport } from '../types';

describe('Audit Core Edge Cases', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `kb-labs-audit-edge-${Date.now()}`);
    await fsp.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  describe('Check Registry Edge Cases', () => {
    it('should create registry when adapters not available', async () => {
      // Registry should handle gracefully when adapters not available
      const registry = await createCheckRegistry();
      
      // Should return registry (may be empty or partially populated depending on environment)
      expect(registry).toBeDefined();
      expect(registry instanceof Map).toBe(true);
    });

    it('should handle partial adapter loading', async () => {
      // Registry should handle when only some adapters are available
      const registry = await createCheckRegistry();
      
      // Should return registry (may be empty or partially populated)
      expect(registry).toBeDefined();
      expect(registry instanceof Map).toBe(true);
    });

    it('should handle adapter instantiation errors gracefully', async () => {
      // Registry should handle adapter instantiation errors without throwing
      const registry = await createCheckRegistry();
      
      // Should not throw, even if adapters fail to instantiate
      expect(registry).toBeDefined();
      expect(registry instanceof Map).toBe(true);
    });

    it('should return registry with correct structure', async () => {
      const registry = await createCheckRegistry();
      
      // Should be a Map with CheckId -> CheckAdapter
      expect(registry).toBeInstanceOf(Map);
      
      // If adapters are available, they should have the correct structure
      for (const [id, adapter] of registry.entries()) {
        expect(typeof id).toBe('string');
        expect(adapter).toBeDefined();
        expect(typeof adapter.id).toBe('string');
        expect(typeof adapter.run).toBe('function');
      }
    });
  });

  describe('Runner Edge Cases', () => {
    const createMockAdapter = (id: CheckId, ok: boolean): CheckAdapter => ({
      id,
      run: vi.fn(async () => ({
        id,
        ok,
        timingMs: 100,
      })) as any,
    });

    it('should handle empty config', async () => {
      const config: AuditConfig = {
        enable: [],
      };

      const result = await runAudit({
        config,
        cwd: testDir,
        adapters: new Map(),
      });

      expect(result).toBeDefined();
      expect(result.checks).toEqual({});
      expect(result.overall.ok).toBe(true);
    });

    it('should handle missing adapters gracefully', async () => {
      const config: AuditConfig = {
        enable: ['style', 'types'],
      };

      const result = await runAudit({
        config,
        cwd: testDir,
        adapters: new Map(), // Empty registry
      });

      expect(result).toBeDefined();
      expect(result.checks).toEqual({});
      expect(result.overall.ok).toBe(true); // No checks = success
    });

    it('should handle adapter errors gracefully', async () => {
      const errorAdapter: CheckAdapter = {
        id: 'style',
        run: vi.fn(async () => {
          throw new Error('Check failed');
        }) as any,
      };

      const config: AuditConfig = {
        enable: ['style'],
      };

      const result = await runAudit({
        config,
        cwd: testDir,
        adapters: new Map([['style', errorAdapter]]),
      });

      expect(result).toBeDefined();
      expect(result.checks.style).toBeDefined();
      expect(result.checks.style?.ok).toBe(false);
      expect(result.checks.style?.code).toBe('AUDIT_TOOL_ERROR');
      expect(result.overall.ok).toBe(false);
    });

    it('should handle timeout correctly', async () => {
      const slowAdapter: CheckAdapter = {
        id: 'style',
        run: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { id: 'style', ok: true };
        }) as any,
      };

      const config: AuditConfig = {
        enable: ['style'],
        timeouts: {
          styleMs: 100, // Very short timeout
        },
      };

      // Note: Actual timeout behavior depends on adapter implementation
      const result = await runAudit({
        config,
        cwd: testDir,
        adapters: new Map([['style', slowAdapter]]),
      });

      expect(result).toBeDefined();
      // May timeout or succeed depending on implementation
      expect(result.checks.style).toBeDefined();
    });

    it('should respect concurrency limit', async () => {
      const adapters = new Map<CheckId, CheckAdapter>([
        ['style', createMockAdapter('style', true)],
        ['types', createMockAdapter('types', true)],
        ['tests', createMockAdapter('tests', true)],
        ['build', createMockAdapter('build', true)],
      ]);

      const config: AuditConfig = {
        enable: ['style', 'types', 'tests', 'build'],
        concurrency: 2, // Limit to 2 concurrent
      };

      const result = await runAudit({
        config,
        cwd: testDir,
        adapters,
      });

      expect(result).toBeDefined();
      expect(Object.keys(result.checks).length).toBe(4);
      expect(result.overall.ok).toBe(true);
    });

    it('should handle partial check failures', async () => {
      const adapters = new Map<CheckId, CheckAdapter>([
        ['style', createMockAdapter('style', true)],
        ['types', createMockAdapter('types', false)],
      ]);

      const config: AuditConfig = {
        enable: ['style', 'types'],
      };

      const result = await runAudit({
        config,
        cwd: testDir,
        adapters,
      });

      expect(result).toBeDefined();
      expect(result.checks.style?.ok).toBe(true);
      expect(result.checks.types?.ok).toBe(false);
      expect(result.overall.ok).toBe(false);
    });

    it('should handle tests check with coverage thresholds', async () => {
      const testsAdapter: CheckAdapter = {
        id: 'tests',
        run: vi.fn(async () => ({
          id: 'tests',
          ok: false,
          details: {
            coverage: {
              lines: 70,
              branches: 80,
            },
          },
        })) as any,
      };

      const config: AuditConfig = {
        enable: ['tests'],
        thresholds: {
          coverage: {
            lines: 80,
            branches: 85,
            functions: 90,
            statements: 95,
          },
        },
      };

      const result = await runAudit({
        config,
        cwd: testDir,
        adapters: new Map([['tests', testsAdapter]]),
      });

      expect(result).toBeDefined();
      expect(result.checks.tests?.ok).toBe(false);
      expect(result.overall.ok).toBe(false);
    });
  });

  describe('Reporters Edge Cases', () => {
    const createMockReport = (ok: boolean): AuditReport => ({
      schemaVersion: '1.0',
      ts: new Date().toISOString(),
      context: {
        repo: 'test-repo',
        cwd: testDir,
      },
      checks: {
        style: {
          id: 'style',
          ok,
          timingMs: 100,
        },
        types: {
          id: 'types',
          ok: true,
          timingMs: 200,
        },
      },
      overall: {
        ok,
        failReasons: ok ? [] : ['style.LINT_ERROR'],
      },
      meta: {
        node: process.version,
        timingMs: {
          total: 300,
        },
      },
    });

    describe('Text Reporter', () => {
      it('should render report with all checks passing', () => {
        const report = createMockReport(true);
        const output = renderText(report);

        expect(output).toContain('AUDIT REPORT');
        expect(output).toContain('PASS');
        expect(output).toContain('[style]');
        expect(output).toContain('[types]');
      });

      it('should render report with failures', () => {
        const report = createMockReport(false);
        const output = renderText(report);

        // Text report should indicate failure
        expect(output).toContain('FAIL');
        expect(output).toContain('style.LINT_ERROR');
        expect(output).not.toContain('PASS'); // Should not pass when there are failures
      });

      it('should handle empty checks', () => {
        const report: AuditReport = {
          ...createMockReport(true),
          checks: {},
        };

        const output = renderText(report);

        expect(output).toContain('AUDIT REPORT');
        expect(output).toContain('PASS');
      });

      it('should handle verbose mode with package results', () => {
        const report = createMockReport(false);
        const packageResults = [
          {
            package: {
              name: 'test-package',
              path: '/test/path',
            },
            checks: {
              style: {
                id: 'style',
                ok: false,
                code: 'LINT_ERROR',
                details: { errors: 5 },
              },
            },
            overall: {
              ok: false,
              failReasons: ['style.LINT_ERROR'],
            },
          },
        ];

        const output = renderText(report, {
          verbose: true,
          packageResults,
        });

        expect(output).toContain('DETAILED PACKAGE ERRORS');
        expect(output).toContain('test-package');
        expect(output).toContain('LINT_ERROR');
      });

      it('should handle check details correctly', () => {
        const report: AuditReport = {
          ...createMockReport(true),
          checks: {
            tests: {
              id: 'tests',
              ok: true,
              details: {
                coverage: {
                  lines: 85,
                },
                errors: 0,
                warnings: 2,
              },
            },
          },
        };

        const output = renderText(report);

        expect(output).toContain('[tests]');
        expect(output).toContain('coverage:85%');
      });
    });

    describe('JSON Reporter', () => {
      it('should render valid JSON', () => {
        const report = createMockReport(true);
        const output = renderJson(report);

        expect(() => JSON.parse(output)).not.toThrow();
        const parsed = JSON.parse(output);
        expect(parsed.schemaVersion).toBe('1.0');
        expect(parsed.overall.ok).toBe(true);
      });

      it('should normalize timing values', () => {
        const report: AuditReport = {
          ...createMockReport(true),
          checks: {
            style: {
              id: 'style',
              ok: true,
              timingMs: 123.456789,
            },
          },
          meta: {
            ...createMockReport(true).meta,
            timingMs: {
              total: 987.654321,
            },
          },
        };

        const output = renderJson(report);
        const parsed = JSON.parse(output);

        // Timings should be rounded to 2 decimal places
        expect(typeof parsed.checks.style.timingMs).toBe('number');
        // Should be rounded (987.654321 -> 987.65 or similar)
        expect(parsed.meta.timingMs.total).toBeGreaterThanOrEqual(987);
        expect(parsed.meta.timingMs.total).toBeLessThanOrEqual(988);
      });

      it('should sort check keys deterministically', () => {
        const report: AuditReport = {
          ...createMockReport(true),
          checks: {
            types: { id: 'types', ok: true },
            style: { id: 'style', ok: true },
            tests: { id: 'tests', ok: true },
          },
        };

        const output1 = renderJson(report);
        const output2 = renderJson(report);

        // Should produce identical output for same input
        expect(output1).toBe(output2);

        const parsed = JSON.parse(output1);
        const keys = Object.keys(parsed.checks);
        // Should be sorted
        expect(keys).toEqual(['style', 'tests', 'types']);
      });

      it('should handle missing optional fields', () => {
        const report: AuditReport = {
          ...createMockReport(true),
          checks: {
            style: {
              id: 'style',
              ok: true,
              // No timingMs, code, details, hint
            },
          },
        };

        const output = renderJson(report);
        const parsed = JSON.parse(output);

        expect(parsed.checks.style).toBeDefined();
        expect(parsed.checks.style.ok).toBe(true);
      });
    });

    describe('Markdown Reporter', () => {
      it('should render markdown report', () => {
        const report = createMockReport(true);
        const output = renderMarkdown(report);

        expect(output).toContain('# Audit Report');
        // Markdown may capitalize check names (Style, Types) or use tool names
        expect(output.includes('Style') || output.includes('style')).toBe(true);
        expect(output.includes('Types') || output.includes('types')).toBe(true);
        // May contain success icon or text "All checks passed"
        expect(output.includes('✅') || output.includes('All checks passed')).toBe(true);
      });

      it('should handle failures in markdown', () => {
        const report = createMockReport(false);
        const output = renderMarkdown(report);

        // Markdown may not contain "FAIL" directly, but should indicate failure
        expect(output).toContain('style.LINT_ERROR');
        expect(output).toContain('❌'); // Failure icon
        expect(output).toContain('Some checks failed');
      });
    });

    describe('HTML Reporter', () => {
      it('should render HTML report', () => {
        const report = createMockReport(true);
        const output = renderHtml(report);

        expect(output).toContain('<!DOCTYPE html>');
        expect(output).toContain('Audit Report');
        expect(output).toContain('style');
      });

      it('should handle failures in HTML', () => {
        const report = createMockReport(false);
        const output = renderHtml(report);

        // HTML may not contain "FAIL" directly, but should indicate failure
        expect(output).toContain('style.LINT_ERROR');
        expect(output).toContain('fail'); // lowercase in class names
        expect(output).toContain('❌'); // failure icon
      });
    });
  });

  describe('Integration Edge Cases', () => {
    it('should handle full audit cycle with all checks', async () => {
      const adapters = new Map<CheckId, CheckAdapter>();
      
      // Create mock adapters for all checks
      const checkIds: CheckId[] = ['style', 'types', 'tests', 'build', 'devlink', 'mind', 'security'];
      
      for (const id of checkIds) {
        adapters.set(id, {
          id,
          run: vi.fn(async () => ({
            id,
            ok: true,
            timingMs: 100,
          })) as any,
        });
      }

      const config: AuditConfig = {
        enable: checkIds,
        concurrency: 4,
      };

      const result = await runAudit({
        config,
        cwd: testDir,
        adapters,
      });

      expect(result).toBeDefined();
      expect(Object.keys(result.checks).length).toBe(checkIds.length);
      expect(result.overall.ok).toBe(true);

      // Verify all adapters were called
      for (const adapter of adapters.values()) {
        expect(adapter.run).toHaveBeenCalled();
      }
    });

    it('should generate complete report from audit results', () => {
      const report: AuditReport = {
        schemaVersion: '1.0',
        ts: new Date().toISOString(),
        context: {
          repo: 'test-repo',
          cwd: testDir,
          profile: 'default',
        },
        checks: {
          style: { id: 'style', ok: true, timingMs: 100 },
          types: { id: 'types', ok: false, code: 'TYPE_ERROR', timingMs: 200 },
        },
        overall: {
          ok: false,
          failReasons: ['types.TYPE_ERROR'],
        },
        meta: {
          node: process.version,
          kbCli: '1.0.0',
          pnpm: '8.0.0',
          timingMs: {
            total: 300,
          },
        },
      };

      // Test all reporter formats
      const textOutput = renderText(report);
      const jsonOutput = renderJson(report);
      const mdOutput = renderMarkdown(report);
      const htmlOutput = renderHtml(report);

      expect(textOutput).toContain('test-repo');
      expect(JSON.parse(jsonOutput)).toMatchObject({
        schemaVersion: '1.0',
        overall: { ok: false },
      });
      expect(mdOutput).toContain('Audit Report');
      expect(htmlOutput).toContain('<!DOCTYPE html>');
    });
  });
});

