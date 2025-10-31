/**
 * Audit run command
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '@kb-labs/cli-commands/types';
import { box, keyValue, formatTiming, TimingTracker, safeSymbols, safeColors } from '@kb-labs/shared-cli-ui';
import {
  loadConfig,
  runAudit,
  createCheckRegistry,
  aggregateResults,
  renderJson,
  renderMarkdown,
  renderText,
  renderHtml,
  type AuditReport,
  type CheckId,
  type AuditCheckResult,
} from '@kb-labs/audit-core';
import { findRepoRoot } from '../utils.js';

export const run: Command = {
  name: 'audit:run',
  category: 'audit',
  describe: 'Run quality audit checks',
  async run(ctx, argv, flags) {
    const tracker = new TimingTracker();
    const jsonMode = !!flags.json;
    const quiet = !!flags.quiet;
    const cwd = ctx?.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);

      tracker.checkpoint('config');

      try {
        // Load configuration
        const config = await loadConfig({
          cwd: repoRoot,
          profileId: flags.profile as string | undefined,
        });

        // Apply scope filtering if specified
        const scopePattern = flags.scope as string | undefined;
        let packagesToAudit: Array<{ name: string; path: string }> | null = null;
        
        if (scopePattern) {
          // Filter packages by scope
          const { filterPackagesByScope } = await import('../package-scope.js');
          const filteredPackages = await filterPackagesByScope(
            repoRoot,
            scopePattern,
            !flags.all // exclude private unless --all flag
          );
          
          if (filteredPackages.length === 0) {
            if (jsonMode) {
              ctx.presenter.json({
                ok: false,
                error: `No packages found matching scope: ${scopePattern}`,
              });
            } else {
              ctx.presenter.error(`No packages found matching scope: ${scopePattern}`);
            }
            return 3; // Misconfiguration
          }
          
          packagesToAudit = filteredPackages;
          
          if (!jsonMode && !quiet) {
            ctx.presenter.info(`Scope: ${filteredPackages.length} package(s) matching "${scopePattern}"`);
          }
        }

        tracker.checkpoint('checks');

      // Create check registry
      const adapters = await createCheckRegistry();

      // Run audit for each package if scope is specified, otherwise run at repo level
      let allChecks: Partial<Record<CheckId, AuditCheckResult>> = {};
      let allOverall: { ok: boolean; failReasons: string[] } = { ok: true, failReasons: [] };

      if (packagesToAudit && packagesToAudit.length > 0) {
        // Run checks per package and aggregate
        const packageResults: Array<{
          package: { name: string; path: string };
          checks: Partial<Record<CheckId, AuditCheckResult>>;
          overall: { ok: boolean; failReasons: string[] };
        }> = [];

        for (const pkg of packagesToAudit) {
          if (!jsonMode && !quiet) {
            ctx.presenter.info(`\nAuditing package: ${pkg.name}`);
          }

          const { checks: pkgChecks, overall: pkgOverall } = await runAudit({
            config,
            cwd: pkg.path,
            profile: flags.profile as string | undefined,
            adapters,
          });

          packageResults.push({
            package: pkg,
            checks: pkgChecks,
            overall: pkgOverall,
          });

          // Merge results (any failure = overall failure)
          for (const [checkId, result] of Object.entries(pkgChecks)) {
            if (result && !result.ok) {
              const existing = allChecks[checkId as CheckId];
              if (!existing || existing.ok) {
                // Override with failure
                allChecks[checkId as CheckId] = {
                  ...result,
                  details: {
                    ...(result.details as object || {}),
                    packages: [
                      ...((existing?.details as any)?.packages || []),
                      pkg.name,
                    ],
                  },
                } as AuditCheckResult;
              } else {
                // Add package to existing failure
                const details = existing.details as any || {};
                allChecks[checkId as CheckId] = {
                  ...existing,
                  details: {
                    ...details,
                    packages: [...(details.packages || []), pkg.name],
                  },
                } as AuditCheckResult;
              }
            } else if (result && result.ok) {
              // Only keep success if no failures exist
              if (!allChecks[checkId as CheckId] || allChecks[checkId as CheckId]?.ok) {
                allChecks[checkId as CheckId] = result;
              }
            }
          }

          // Aggregate overall status
          if (!pkgOverall.ok) {
            allOverall.ok = false;
            allOverall.failReasons.push(...pkgOverall.failReasons.map(r => `${pkg.name}:${r}`));
          }

          if (!jsonMode && !quiet) {
            const status = pkgOverall.ok ? safeColors.green('✓ PASS') : safeColors.red('✗ FAIL');
            ctx.presenter.info(`${pkg.name}: ${status}`);
          }
        }

        // Re-aggregate final results
        const finalAggregation = aggregateResults(allChecks, {
          coverageThresholds: config.thresholds?.coverage,
        });
        allOverall = finalAggregation.overall;
      } else {
        // Run at repo level (no scope)
        const auditResult = await runAudit({
          config,
          cwd: repoRoot,
          profile: flags.profile as string | undefined,
          adapters,
        });
        allChecks = auditResult.checks;
        allOverall = auditResult.overall;
      }

      tracker.checkpoint('reports');

      // Build report
      const report: AuditReport = {
        schemaVersion: '1.0',
        ts: new Date().toISOString(),
        context: {
          repo: repoRoot,
          cwd: packagesToAudit ? packagesToAudit.map(p => p.path).join(',') : repoRoot,
          profile: flags.profile as string | undefined,
        },
        checks: allChecks,
        overall: allOverall,
        meta: {
          node: process.version,
          pnpm: await getPnpmVersion(),
          timingMs: { total: tracker.total() },
        },
      };

      // Determine output formats
      const outputJson = flags.json !== false; // Default true
      const outputMd = flags.md !== false; // Default true
      const outputText = true; // Always generate text
      const outputHtml = !!flags.html;

      // Write reports to .kb/audit/
      const auditDir = join(repoRoot, '.kb', 'audit');
      await mkdir(auditDir, { recursive: true });

      const files: string[] = [];

      if (outputJson) {
        const jsonPath = join(auditDir, 'report.json');
        await writeFile(jsonPath, renderJson(report), 'utf-8');
        files.push(jsonPath);
      }

      if (outputMd) {
        const mdPath = join(auditDir, 'summary.md');
        await writeFile(mdPath, renderMarkdown(report), 'utf-8');
        files.push(mdPath);
      }

      if (outputText) {
        const txtPath = join(auditDir, 'summary.txt');
        await writeFile(txtPath, renderText(report), 'utf-8');
        files.push(txtPath);
      }

      if (outputHtml) {
        const htmlPath = join(auditDir, 'summary.html');
        await writeFile(htmlPath, renderHtml(report), 'utf-8');
        files.push(htmlPath);
      }

      tracker.checkpoint('complete');

      // Output results
      if (jsonMode) {
        ctx.presenter.json({
          ok: allOverall.ok,
          checks: allChecks,
          overall: allOverall,
          files,
          timingMs: tracker.total(),
        });
      } else {
        const summaryLines: string[] = [];

        // Add overall status
        const statusIcon = allOverall.ok ? safeSymbols.success : safeSymbols.error;
        const statusText = allOverall.ok ? 'All checks passed' : 'Some checks failed';
        summaryLines.push(`${statusIcon} ${statusText}`);

        if (!allOverall.ok && allOverall.failReasons.length > 0) {
          summaryLines.push('');
          summaryLines.push(safeColors.dim('Fail reasons:'));
          for (const reason of allOverall.failReasons) {
            summaryLines.push(`  ${safeColors.error('✗')} ${reason}`);
          }
        }

        // Add check statuses
        summaryLines.push('');
        const checkStatuses: Record<string, string> = {};
        for (const [id, check] of Object.entries(allChecks).sort()) {
          const icon = check?.ok ? safeSymbols.success : safeSymbols.error;
          const capitalized = id.charAt(0).toUpperCase() + id.slice(1);
          checkStatuses[capitalized.padEnd(12)] = `${icon} ${check?.ok ? 'OK' : 'FAIL'}`;
        }
        summaryLines.push(...keyValue(checkStatuses));

        // Add file locations
        summaryLines.push('');
        summaryLines.push(safeColors.dim('Reports written to:'));
        for (const file of files) {
          summaryLines.push(`  ${safeColors.dim('→')} ${file}`);
        }

        summaryLines.push('');
        summaryLines.push(safeColors.dim(`Time: ${formatTiming(tracker.total())}`));

        const output = box('Audit Results', summaryLines);
        ctx.presenter.write(output);
      }

      // Determine exit code
      const failOn = (flags['fail-on'] as string) || 'error';
      if (!allOverall.ok) {
        if (failOn === 'any') {
          return 2; // Quality gate fail
        }
        if (failOn === 'warn') {
          return 2; // Quality gate fail
        }
        // failOn === 'error'
        return 2; // Quality gate fail
      }

      return 0; // All checks passed
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (jsonMode) {
        ctx.presenter.json({
          ok: false,
          error: errorMessage,
          timing: tracker.total(),
        });
      } else {
        ctx.presenter.error(errorMessage);
      }
      return 1; // Infrastructure error
    }
  },
};

async function getPnpmVersion(): Promise<string | undefined> {
  try {
    const { execa } = await import('execa');
    const { stdout } = await execa('pnpm', ['--version'], { timeout: 5000 });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

