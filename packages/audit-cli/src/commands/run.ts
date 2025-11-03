/**
 * Audit run command
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '@kb-labs/cli-commands';
import { box, keyValue, formatTiming, TimingTracker, safeSymbols, safeColors, Loader } from '@kb-labs/shared-cli-ui';
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
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

export const run: Command = {
  name: 'audit:run',
  category: 'audit',
  describe: 'Run quality audit checks',
  async run(ctx, argv, flags) {
    const startTime = Date.now();
    const tracker = new TimingTracker();
    const jsonMode = !!flags.json;
    const quiet = !!flags.quiet;
    const dryRun = !!flags['dry-run'] || !!flags.dryRun;
    const cwd = ctx?.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);

    return await runScope(
      {
        actor: ANALYTICS_ACTOR,
        ctx: { workspace: cwd },
      },
      async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>) => {
        try {
          // Track command start
          await emit({
            type: ANALYTICS_EVENTS.RUN_STARTED,
            payload: {
              dryRun,
              profile: flags.profile as string | undefined,
              scope: flags.scope as string | undefined,
              all: !!flags.all,
              verbose: !!flags.verbose,
            },
          });

          tracker.checkpoint('config');

          // Load configuration
        const config = await loadConfig({
          cwd: repoRoot,
          profileId: flags.profile as string | undefined,
        });

        // Apply scope filtering if specified, otherwise discover all workspace packages
        const scopePattern = flags.scope as string | undefined;
        let packagesToAudit: Array<{ name: string; path: string }> | null = null;
        
        const { getWorkspacePackages, filterPackagesByScope } = await import('../package-scope.js');
        
        if (scopePattern) {
          // Filter packages by scope pattern
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
        } else {
          // No scope specified - discover all workspace packages
          const allPackages = await getWorkspacePackages(repoRoot);
          
          if (allPackages.length > 0) {
            // Filter out private packages unless --all flag is set
            packagesToAudit = flags.all
              ? allPackages
              : allPackages.filter((pkg) => !pkg.private);
            
            if (packagesToAudit.length === 0) {
              if (jsonMode) {
                ctx.presenter.json({
                  ok: false,
                  error: 'No packages found in workspace (all packages are private). Use --all to include private packages.',
                });
              } else {
                ctx.presenter.error('No packages found in workspace (all packages are private). Use --all to include private packages.');
              }
              return 3; // Misconfiguration
            }
            
            if (!jsonMode && !quiet) {
              ctx.presenter.info(`Auditing ${packagesToAudit.length} package(s) from workspace`);
            }
          }
          // If no packages found, packagesToAudit remains null and we'll run at repo level
        }

        tracker.checkpoint('checks');

      // Dry-run mode: just show what would be checked
      if (dryRun) {
        const enabledChecks = config.enable || [];
        const packageList = packagesToAudit || [{ name: 'root', path: repoRoot }];
        
        if (jsonMode) {
          ctx.presenter.json({
            ok: true,
            dryRun: true,
            packages: packageList.map(p => ({ name: p.name, path: p.path })),
            checks: enabledChecks,
            summary: {
              totalPackages: packageList.length,
              enabledChecks: enabledChecks.length,
            },
          });
        } else {
          const lines: string[] = [];
          
          // Summary information
          const summaryInfo: Record<string, string> = {
            'Mode': safeColors.dim('DRY RUN (no checks executed)'),
            'Repository': repoRoot,
            'Packages': `${packageList.length}`,
            'Checks': `${enabledChecks.length}: ${enabledChecks.join(', ')}`,
          };
          lines.push(...keyValue(summaryInfo));
          lines.push('');
          
          // Group packages by project for better readability
          if (packageList.length > 0) {
            // Group by project root directory
            const byProject = new Map<string, typeof packageList>();
            for (const pkg of packageList) {
              // Extract project name from path (e.g., kb-labs-audit/packages/audit-core -> kb-labs-audit)
              const relativePath = pkg.path.replace(repoRoot, '');
              const pathParts = relativePath ? relativePath.split(/[/\\]/).filter(Boolean) : [];
              const projectName = pathParts.length > 1 && pathParts[0] && pathParts[0].startsWith('kb-labs-')
                ? pathParts[0]
                : 'root';
              
              if (!byProject.has(projectName)) {
                byProject.set(projectName, []);
              }
              const projectPackages = byProject.get(projectName);
              if (projectPackages) {
                projectPackages.push(pkg);
              }
            }
            
            // Sort projects
            const sortedProjects = Array.from(byProject.entries()).sort((a, b) => 
              a[0].localeCompare(b[0])
            );
            
            if (sortedProjects.length > 1) {
              lines.push('Packages grouped by project:');
              lines.push('');
              
              for (const [project, packages] of sortedProjects) {
                lines.push(safeColors.bold(`  ${project} (${packages.length} package${packages.length !== 1 ? 's' : ''})`));
                for (const pkg of packages) {
                  const privateLabel = (pkg as any).private ? safeColors.dim(' (private)') : '';
                  lines.push(`    ${safeSymbols.bullet} ${pkg.name}${privateLabel}`);
                  if (!quiet && packageList.length <= 50) {
                    // Only show paths if not too many packages
                    lines.push(`      ${safeColors.dim(pkg.path)}`);
                  }
                }
                lines.push('');
              }
            } else {
              // Single project or too many - simple list
              lines.push('Packages to audit:');
              lines.push('');
              for (const pkg of packageList) {
                const privateLabel = (pkg as any).private ? safeColors.dim(' (private)') : '';
                lines.push(`  ${safeSymbols.bullet} ${safeColors.bold(pkg.name)}${privateLabel}`);
                if (!quiet && packageList.length <= 30) {
                  lines.push(`    ${safeColors.dim(pkg.path)}`);
                }
              }
            }
          }
          
          const output = box('Audit Dry Run', lines);
          ctx.presenter.write(output);
        }
        
        return 0; // Always success for dry-run
      }

      // Create check registry
      const adapters = await createCheckRegistry();

      const verbose = !!flags.verbose;

      // Run audit for each package if scope is specified, otherwise run at repo level
      let allChecks: Partial<Record<CheckId, AuditCheckResult>> = {};
      let allOverall: { ok: boolean; failReasons: string[] } = { ok: true, failReasons: [] };
      const packageResults: Array<{
        package: { name: string; path: string };
        checks: Partial<Record<CheckId, AuditCheckResult>>;
        overall: { ok: boolean; failReasons: string[] };
      }> = [];

      if (packagesToAudit && packagesToAudit.length > 0) {
        // Run checks per package and aggregate
        const totalPackages = packagesToAudit.length;
        let processedPackages = 0;
        const startTime = Date.now();
        let loader: Loader | null = null;

        // Start loader if not in json mode and not quiet
        if (!jsonMode && !quiet && totalPackages > 1) {
          loader = new Loader({
            text: `Auditing packages ${safeColors.dim(`(0/${totalPackages})`)}...`,
            spinner: true,
            jsonMode: false,
          });
          loader.start();
        } else if (!jsonMode && !quiet && packagesToAudit.length > 0) {
          ctx.presenter.info(`\nAuditing package: ${safeColors.bold(packagesToAudit[0]!.name)}`);
        }

        for (const pkg of packagesToAudit) {
          processedPackages++;
          const packageStartTime = Date.now();
          const elapsed = packageStartTime - startTime;
          const avgTimePerPackage = processedPackages > 1 ? elapsed / (processedPackages - 1) : 0;
          const estimatedRemaining = avgTimePerPackage > 0 
            ? Math.round(avgTimePerPackage * (totalPackages - processedPackages))
            : 0;

          // Update loader with progress (only once per package - spinner handles animation)
          if (loader && !jsonMode && !quiet) {
            if (totalPackages > 1) {
              const mainText = `Auditing ${safeColors.bold(pkg.name)}`;
              const progressInfo = safeColors.dim(`(${processedPackages}/${totalPackages})`);
              const timeInfo = estimatedRemaining > 0 
                ? safeColors.dim(`~${formatTiming(estimatedRemaining)} left`)
                : '';
              // Store package name in loader, time updates will be handled by spinner interval
              const progressText = timeInfo 
                ? `${mainText} ${progressInfo} ${timeInfo}`
                : `${mainText} ${progressInfo}`;
              loader.update({ text: progressText });
            } else {
              loader.update({ text: `Auditing ${safeColors.bold(pkg.name)}...` });
            }
          }

          const { checks: pkgChecks, overall: pkgOverall } = await runAudit({
            config,
            cwd: pkg.path,
            profile: flags.profile as string | undefined,
            adapters,
          });

          // Stop loader and show result for current package
          if (loader && !jsonMode && !quiet) {
            loader.stop();
            const status = pkgOverall.ok ? safeColors.success('✓ PASS') : safeColors.error('✗ FAIL');
            const resultText = `${safeColors.bold(pkg.name)}: ${status}`;
            if (pkgOverall.ok) {
              loader.succeed(resultText);
            } else {
              loader.fail(resultText);
            }
            
            // Restart loader if more packages to process
            if (processedPackages < totalPackages) {
              loader = new Loader({
                text: `Auditing packages ${safeColors.dim(`(${processedPackages}/${totalPackages})`)}...`,
                spinner: true,
                jsonMode: false,
              });
              loader.start();
            }
          } else if (!jsonMode && !quiet && totalPackages === 1) {
            const status = pkgOverall.ok ? safeColors.success('✓ PASS') : safeColors.error('✗ FAIL');
            ctx.presenter.info(`${safeColors.bold(pkg.name)}: ${status}`);
          }

          packageResults.push({
            package: pkg,
            checks: pkgChecks,
            overall: pkgOverall,
          });

          // Merge results (any failure = overall failure)
          // Store full package details for JSON output
          for (const [checkId, result] of Object.entries(pkgChecks)) {
            if (result && !result.ok) {
              const existing = allChecks[checkId as CheckId];
              const packageDetail = {
                name: pkg.name,
                path: pkg.path,
                ok: false,
                code: result.code,
                hint: result.hint,
                details: result.details,
                timingMs: result.timingMs,
              };

              if (!existing || existing.ok) {
                // Override with failure
                allChecks[checkId as CheckId] = {
                  ...result,
                  details: {
                    ...(result.details as object || {}),
                    packages: [
                      ...((existing?.details as any)?.packages || []).filter((p: any) => typeof p === 'object' ? p.name !== pkg.name : p !== pkg.name),
                      packageDetail,
                    ],
                  },
                } as AuditCheckResult;
              } else {
                // Add package to existing failure
                const details = existing.details as any || {};
                const existingPackages = (details.packages || []).filter((p: any) => typeof p === 'object' ? p.name !== pkg.name : p !== pkg.name);
                allChecks[checkId as CheckId] = {
                  ...existing,
                  details: {
                    ...details,
                    packages: [...existingPackages, packageDetail],
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

          // Show detailed errors in verbose mode (after loader is stopped or if no loader)
          if (!jsonMode && !quiet && verbose && !pkgOverall.ok && (!loader || processedPackages === totalPackages)) {
            const errorDetails: string[] = [];
            for (const [checkId, check] of Object.entries(pkgChecks)) {
              if (check && !check.ok) {
                errorDetails.push(`  ${safeSymbols.error} ${checkId}:`);
                if (check.code) {
                  errorDetails.push(`    ${safeColors.dim(`Code: ${check.code}`)}`);
                }
                if (check.hint) {
                  errorDetails.push(`    ${safeColors.warning(check.hint)}`);
                }
                // Show specific details based on check type
                const details = check.details as any;
                if (details) {
                  if (details.errors !== undefined) {
                    errorDetails.push(`    ${safeColors.error(`Errors: ${details.errors}`)}`);
                  }
                  if (details.warnings !== undefined) {
                    errorDetails.push(`    ${safeColors.warning(`Warnings: ${details.warnings}`)}`);
                  }
                  if (details.failed !== undefined) {
                    errorDetails.push(`    ${safeColors.error(`Failed tests: ${details.failed}/${details.total || '?'}`)}`);
                  }
                  if (details.exitCode !== undefined && details.exitCode !== 0) {
                    errorDetails.push(`    ${safeColors.dim(`Exit code: ${details.exitCode}`)}`);
                  }
                  if (details.error) {
                    const errorMsg = String(details.error);
                    errorDetails.push(`    ${safeColors.error(`Error: ${errorMsg.substring(0, 150)}${errorMsg.length > 150 ? '...' : ''}`)}`);
                  }
                  if (details.coverage && details.threshold) {
                    const cov = details.coverage;
                    const thresh = details.threshold;
                    const issues: string[] = [];
                    if (cov.lines < thresh.lines) {issues.push(`lines: ${cov.lines}% < ${thresh.lines}%`);}
                    if (cov.branches < thresh.branches) {issues.push(`branches: ${cov.branches}% < ${thresh.branches}%`);}
                    if (cov.functions < thresh.functions) {issues.push(`functions: ${cov.functions}% < ${thresh.functions}%`);}
                    if (cov.statements < thresh.statements) {issues.push(`statements: ${cov.statements}% < ${thresh.statements}%`);}
                    if (issues.length > 0) {
                      errorDetails.push(`    ${safeColors.error(`Coverage: ${issues.join(', ')}`)}`);
                    }
                  }
                }
              }
            }
            if (errorDetails.length > 0) {
              ctx.presenter.write('');
              ctx.presenter.write(errorDetails.join('\n'));
            }
          }
        }

        // Stop loader if still active
        if (loader) {
          loader.stop();
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
      // Add package-level summary if available
      const reportContext: AuditReport['context'] & { packages?: Array<{ name: string; path: string; ok: boolean }> } = {
        repo: repoRoot,
        cwd: packagesToAudit ? packagesToAudit.map(p => p.path).join(',') : repoRoot,
        profile: flags.profile as string | undefined,
      };

      if (packageResults.length > 0) {
        reportContext.packages = packageResults.map(p => ({
          name: p.package.name,
          path: p.package.path,
          ok: p.overall.ok,
        }));
      }

      const report: AuditReport = {
        schemaVersion: '1.0',
        ts: new Date().toISOString(),
        context: reportContext,
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

      // Prepare options for verbose reports
      const reportOptions = verbose && packageResults.length > 0
        ? { verbose: true, packageResults }
        : undefined;

      if (outputMd) {
        const mdPath = join(auditDir, 'summary.md');
        await writeFile(mdPath, renderMarkdown(report, reportOptions), 'utf-8');
        files.push(mdPath);
      }

      if (outputText) {
        const txtPath = join(auditDir, 'summary.txt');
        await writeFile(txtPath, renderText(report, reportOptions), 'utf-8');
        files.push(txtPath);
      }

      if (outputHtml) {
        const htmlPath = join(auditDir, 'summary.html');
        await writeFile(htmlPath, renderHtml(report, reportOptions), 'utf-8');
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

        // Overall status
        const statusIcon = allOverall.ok ? safeSymbols.success : safeSymbols.error;
        const statusText = allOverall.ok 
          ? safeColors.success('All checks passed') 
          : safeColors.error('Some checks failed');
        summaryLines.push(`${statusIcon} ${statusText}`);

        if (!allOverall.ok && allOverall.failReasons.length > 0) {
          summaryLines.push('');
          summaryLines.push(safeColors.bold('Fail reasons:'));
          for (const reason of allOverall.failReasons.slice(0, verbose ? 50 : 5)) {
            summaryLines.push(`  ${safeSymbols.error} ${reason}`);
          }
          if (!verbose && allOverall.failReasons.length > 5) {
            summaryLines.push(`  ${safeColors.dim(`... and ${allOverall.failReasons.length - 5} more (use --verbose to see all)`)}`);
          }
        }

        // Detailed package breakdown in verbose mode
        if (verbose && packageResults.length > 0) {
          const failedPackages = packageResults.filter(p => !p.overall.ok);
          if (failedPackages.length > 0) {
            summaryLines.push('');
            summaryLines.push(safeColors.bold('Detailed package errors:'));
            summaryLines.push('');
            
            for (const pkgResult of failedPackages) {
              summaryLines.push(`  ${safeColors.bold(pkgResult.package.name)}`);
              summaryLines.push(`    ${safeColors.dim(pkgResult.package.path)}`);
              
              const failedChecks = Object.entries(pkgResult.checks).filter(
                ([, check]) => check && !check.ok
              );
              
              for (const [checkId, check] of failedChecks) {
                summaryLines.push(`    ${safeSymbols.error} ${checkId}:`);
                if (check.code) {
                  summaryLines.push(`      ${safeColors.dim(`Code: ${check.code}`)}`);
                }
                if (check.hint) {
                  summaryLines.push(`      ${safeColors.warning(check.hint)}`);
                }
                
                const details = check.details as any;
                if (details) {
                  if (details.errors !== undefined) {
                    summaryLines.push(`      ${safeColors.error(`Errors: ${details.errors}`)}`);
                  }
                  if (details.warnings !== undefined) {
                    summaryLines.push(`      ${safeColors.warning(`Warnings: ${details.warnings}`)}`);
                  }
                  if (details.failed !== undefined) {
                    summaryLines.push(`      ${safeColors.error(`Failed tests: ${details.failed}/${details.total || '?'}`)}`);
                  }
                  if (details.coverage && details.threshold) {
                    const cov = details.coverage;
                    const thresh = details.threshold;
                    const issues: string[] = [];
                    if (cov.lines < thresh.lines) {issues.push(`lines: ${cov.lines}% < ${thresh.lines}%`);}
                    if (cov.branches < thresh.branches) {issues.push(`branches: ${cov.branches}% < ${thresh.branches}%`);}
                    if (cov.functions < thresh.functions) {issues.push(`functions: ${cov.functions}% < ${thresh.functions}%`);}
                    if (cov.statements < thresh.statements) {issues.push(`statements: ${cov.statements}% < ${thresh.statements}%`);}
                    if (issues.length > 0) {
                      summaryLines.push(`      ${safeColors.error(`Coverage below threshold: ${issues.join(', ')}`)}`);
                    }
                  }
                  if (details.exitCode !== undefined && details.exitCode !== 0) {
                    summaryLines.push(`      ${safeColors.dim(`Exit code: ${details.exitCode}`)}`);
                  }
                  if (details.error) {
                    summaryLines.push(`      ${safeColors.error(`Error: ${String(details.error).substring(0, 200)}`)}`);
                  }
                  if (details.tool) {
                    summaryLines.push(`      ${safeColors.dim(`Tool: ${details.tool}`)}`);
                  }
                }
              }
              summaryLines.push('');
            }
          }
        }

        // Check statuses
        summaryLines.push('');
        const checkStatuses: Record<string, string> = {};
        for (const checkId of ['style', 'types', 'tests', 'build', 'devlink', 'mind', 'security'] as CheckId[]) {
          const check = allChecks[checkId];
          if (check) {
            const icon = check.ok ? safeSymbols.success : safeSymbols.error;
            const status = check.ok 
              ? safeColors.success('passed') 
              : safeColors.error('failed');
            const name = checkId.padEnd(8);
            const timing = check.timingMs ? safeColors.dim(` (${formatTiming(check.timingMs)})`) : '';
            checkStatuses[name] = `${icon} ${status}${timing}`;
          } else {
            const name = checkId.padEnd(8);
            checkStatuses[name] = safeColors.dim('skipped');
          }
        }
        summaryLines.push(...keyValue(checkStatuses));

        // Package count if auditing multiple packages
        if (packagesToAudit && packagesToAudit.length > 1) {
          summaryLines.push('');
          const failedCount = allOverall.failReasons.length;
          const passedCount = packagesToAudit.length - failedCount;
          summaryLines.push(safeColors.dim(`Packages: ${passedCount}/${packagesToAudit.length} passed`));
        }

        // Report files
        if (files.length > 0) {
          summaryLines.push('');
          summaryLines.push(safeColors.bold('Reports:'));
          for (const file of files) {
            summaryLines.push(`  ${safeSymbols.info} ${safeColors.dim(file)}`);
          }
        }

        // Timing
        summaryLines.push('');
        summaryLines.push(safeColors.dim(`Total time: ${formatTiming(tracker.total())}`));

        const output = box('Audit Results', summaryLines);
        ctx.presenter.write(output);
      }

          // Determine exit code
          const failOn = (flags['fail-on'] as string) || 'error';
          const totalTime = Date.now() - startTime;
          
          if (!allOverall.ok) {
            // Track command completion with failure
            await emit({
              type: ANALYTICS_EVENTS.RUN_FINISHED,
              payload: {
                dryRun,
                profile: flags.profile as string | undefined,
                scope: flags.scope as string | undefined,
                all: !!flags.all,
                verbose: !!flags.verbose,
                overallOk: false,
                checksCount: Object.keys(allChecks).length,
                packagesCount: packagesToAudit?.length || 0,
                durationMs: totalTime,
                result: 'failed',
                failOn,
              },
            });

            if (failOn === 'any') {
              return 2; // Quality gate fail
            }
            if (failOn === 'warn') {
              return 2; // Quality gate fail
            }
            // failOn === 'error'
            return 2; // Quality gate fail
          }

          // Track command completion with success
          await emit({
            type: ANALYTICS_EVENTS.RUN_FINISHED,
            payload: {
              dryRun,
              profile: flags.profile as string | undefined,
              scope: flags.scope as string | undefined,
              all: !!flags.all,
              verbose: !!flags.verbose,
              overallOk: true,
              checksCount: Object.keys(allChecks).length,
              packagesCount: packagesToAudit?.length || 0,
              durationMs: totalTime,
              result: 'success',
            },
          });

          return 0; // All checks passed
        } catch (error: unknown) {
          const totalTime = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Track command failure
          await emit({
            type: ANALYTICS_EVENTS.RUN_FINISHED,
            payload: {
              dryRun,
              profile: flags.profile as string | undefined,
              scope: flags.scope as string | undefined,
              all: !!flags.all,
              verbose: !!flags.verbose,
              durationMs: totalTime,
              result: 'error',
              error: errorMessage,
            },
          });

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
      }
    );
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

