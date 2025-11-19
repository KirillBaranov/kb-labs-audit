/**
 * Audit run command
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '@kb-labs/cli-commands';
import {
  box,
  keyValue,
  formatTiming,
  TimingTracker,
  safeSymbols,
  safeColors,
  createProgressBar,
} from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../../infra/analytics/events.js';
import {
  runAuditCore,
  parseAuditFromCliFlags,
  type AuditRuntimeContext,
} from '../../application/index.js';
import type { ShellApi, ShellResult } from '@kb-labs/plugin-contracts';
import { findRepoRoot } from '../../shared/utils.js';
import { getWorkspacePackages, filterPackagesByScope } from '../../shared/package-scope.js';

async function getPnpmVersion(
  shell?: { exec: (command: string, args: string[], options?: { timeoutMs?: number }) => Promise<{ ok: boolean; stdout: string }> }
): Promise<string | undefined> {
  // ShellBroker handles dryRun mode - if shell is provided, it will return empty stdout in dry-run
  // So we don't need to check dryRun here
  try {
    if (shell) {
      const result = await shell.exec('pnpm', ['--version'], { timeoutMs: 5000 });
      if (result.ok) {
        return result.stdout.trim();
      }
      return undefined;
    }
    // Fallback to execa if shell not available (non-plugin context)
    const { execa } = await import('execa');
    const { stdout } = await execa('pnpm', ['--version'], { timeout: 5000 });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

export const run: Command = {
  name: 'audit:run',
  category: 'audit',
  describe: 'Run quality audit checks',
  async run(ctx, argv, flags) {
    const startTime = Date.now();
    const tracker = new TimingTracker();
    const jsonMode = !!flags?.json;
    const quiet = !!flags.quiet;
    const cwd = ctx?.cwd || process.cwd();
    const repoRoot = await findRepoRoot(cwd);

    return await runScope(
      {
        actor: ANALYTICS_ACTOR,
        ctx: { workspace: cwd },
      },
      async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>) => {
        // Track command start
          await emit({
            type: ANALYTICS_EVENTS.RUN_STARTED,
            payload: {
              dryRun: !!flags['dry-run'] || !!flags.dryRun,
              profile: flags.profile as string | undefined,
              scope: flags.scope as string | undefined,
              all: !!flags.all,
              verbose: !!flags.verbose,
            },
          });

          tracker.checkpoint('config');

          // Parse CLI flags into normalized input
          const input = parseAuditFromCliFlags(flags as Record<string, unknown>, cwd, repoRoot);

          // Estimate total steps: config (1) + checks (up to 7) + reports (1)
          // We'll use a dynamic approach - start with estimate and update as we go
          const totalSteps = 10; // Conservative estimate
          const progressBar = createProgressBar('Running audit', totalSteps, jsonMode);
          
          let currentStep = 0;
          const updateProgress = (step: string) => {
            if (!jsonMode && !quiet) {
              currentStep++;
              const elapsed = Date.now() - startTime;
              const avgTimePerStep = currentStep > 0 ? elapsed / currentStep : 0;
              const remainingSteps = Math.max(0, totalSteps - currentStep);
              const estimatedRemaining = Math.round(avgTimePerStep * remainingSteps);
              
              progressBar.update({
                text: `${step} (${formatTiming(elapsed)} elapsed, ~${formatTiming(estimatedRemaining)} remaining)`,
                current: currentStep,
                total: totalSteps,
              });
            }
          };

          if (!jsonMode && !quiet) {
            progressBar.start();
          }

          // Create runtime context with progress callback
          // Use ctx.runtime.shell if available (plugin context), otherwise fallback to execa
          const shellApi = (ctx as any).runtime?.shell as ShellApi | undefined;
          const runtimeCtx: AuditRuntimeContext = {
            workdir: cwd,
            fs: {
              mkdir,
              writeFile,
            },
            log: (level, msg, meta) => {
              if (!quiet && level !== 'debug') {
                ctx.presenter[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'](msg);
              }
            },
            getWorkspacePackages,
            filterPackagesByScope,
            // getPnpmVersion: ShellBroker will handle dryRun, so no need to pass it here
            getPnpmVersion: () => getPnpmVersion(shellApi),
            onProgress: updateProgress,
            // Use runtime.shell if available (plugin context)
            // ShellBroker already handles dryRun mode via ctx.dryRun - runtime layer is responsible
            // If shellApi is not available, checks that require shell will fail gracefully
            shell: shellApi || undefined,
          };

          try {
            // Execute audit core (progress updates happen inside runAuditCore)
            const result = await runAuditCore(input, runtimeCtx);

            tracker.checkpoint('complete');

            // Stop progress bar
            if (!jsonMode && !quiet) {
              progressBar.stop();
            }

            // Handle dry-run output
            if (input.dryRun) {
              const packageList = result.packageResults || [{ package: { name: 'root', path: repoRoot }, checks: {}, overall: { ok: true, failReasons: [] } }];
        
              if (jsonMode) {
          ctx.presenter.json({
            ok: true,
            dryRun: true,
                packages: packageList.map((p) => ({ name: p.package.name, path: p.package.path })),
                checks: input.scope ? [] : [],
            summary: {
              totalPackages: packageList.length,
            },
          });
        } else {
          const lines: string[] = [];
          const summaryInfo: Record<string, string> = {
            'Mode': safeColors.dim('DRY RUN (no checks executed)'),
            'Repository': repoRoot,
            'Packages': `${packageList.length}`,
          };
          lines.push(...keyValue(summaryInfo));
          lines.push('');
          
          if (packageList.length > 0) {
                lines.push('Packages to audit:');
              lines.push('');
              for (const pkg of packageList) {
                  const privateLabel = pkg.package.private ? safeColors.dim(' (private)') : '';
                  lines.push(`  ${safeSymbols.bullet} ${safeColors.bold(pkg.package.name)}${privateLabel}`);
                if (!quiet && packageList.length <= 30) {
                    lines.push(`    ${safeColors.dim(pkg.package.path)}`);
                  }
            }
          }
          
              const output = box('Audit Dry Run', lines);
              ctx.presenter.write(output);
            }
        
            return 0;
          }

          // Output results
          if (jsonMode) {
        ctx.presenter.json({
              ok: result.ok,
              checks: result.checks,
              overall: result.overall,
              files: result.files,
              timingMs: result.timingMs,
        });
      } else {
        const summaryLines: string[] = [];

        // Overall status
            const statusIcon = result.overall.ok ? safeSymbols.success : safeSymbols.error;
            const statusText = result.overall.ok
          ? safeColors.success('All checks passed') 
          : safeColors.error('Some checks failed');
        summaryLines.push(`${statusIcon} ${statusText}`);

            if (!result.overall.ok && result.overall.failReasons.length > 0) {
          summaryLines.push('');
          summaryLines.push(safeColors.bold('Fail reasons:'));
              for (const reason of result.overall.failReasons.slice(0, input.verbose ? 50 : 5)) {
            summaryLines.push(`  ${safeSymbols.error} ${reason}`);
          }
              if (!input.verbose && result.overall.failReasons.length > 5) {
                summaryLines.push(
                  `  ${safeColors.dim(`... and ${result.overall.failReasons.length - 5} more (use --verbose to see all)`)}`
                );
          }
        }

        // Detailed package breakdown in verbose mode
            if (input.verbose && result.packageResults && result.packageResults.length > 0) {
              const failedPackages = result.packageResults.filter((p) => !p.overall.ok);
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
                
                const details = (check.details && typeof check.details === 'object' 
                  ? check.details as Record<string, unknown> 
                  : {}) as Record<string, unknown>;
                if (details) {
                  if (details.errors !== undefined) {
                    summaryLines.push(`      ${safeColors.error(`Errors: ${details.errors}`)}`);
                  }
                  if (details.warnings !== undefined) {
                    summaryLines.push(`      ${safeColors.warning(`Warnings: ${details.warnings}`)}`);
                  }
                  if (details.failed !== undefined) {
                        summaryLines.push(
                          `      ${safeColors.error(`Failed tests: ${details.failed}/${details.total || '?'}`)}`
                        );
                  }
                  if (details.coverage && details.threshold) {
                    const cov = details.coverage as { lines?: number; branches?: number; functions?: number; statements?: number };
                    const thresh = details.threshold as { lines: number; branches: number; functions: number; statements: number };
                    const issues: string[] = [];
                        if (cov.lines !== undefined && cov.lines < thresh.lines) {
                          issues.push(`lines: ${cov.lines}% < ${thresh.lines}%`);
                        }
                        if (cov.branches !== undefined && cov.branches < thresh.branches) {
                          issues.push(`branches: ${cov.branches}% < ${thresh.branches}%`);
                        }
                        if (cov.functions !== undefined && cov.functions < thresh.functions) {
                          issues.push(`functions: ${cov.functions}% < ${thresh.functions}%`);
                        }
                        if (cov.statements !== undefined && cov.statements < thresh.statements) {
                          issues.push(`statements: ${cov.statements}% < ${thresh.statements}%`);
                        }
                    if (issues.length > 0) {
                          summaryLines.push(
                            `      ${safeColors.error(`Coverage below threshold: ${issues.join(', ')}`)}`
                          );
                    }
                  }
                  if (details.exitCode !== undefined && details.exitCode !== 0) {
                    summaryLines.push(`      ${safeColors.dim(`Exit code: ${details.exitCode}`)}`);
                  }
                  if (details.error) {
                        summaryLines.push(
                          `      ${safeColors.error(`Error: ${String(details.error).substring(0, 200)}`)}`
                        );
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
            for (const checkId of ['style', 'types', 'tests', 'build', 'devlink', 'mind', 'security'] as const) {
              const check = result.checks[checkId];
          if (check) {
            const icon = check.ok ? safeSymbols.success : safeSymbols.error;
                const status = check.ok ? safeColors.success('passed') : safeColors.error('failed');
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
            if (result.packageResults && result.packageResults.length > 1) {
          summaryLines.push('');
              const failedCount = result.overall.failReasons.length;
              const passedCount = result.packageResults.length - failedCount;
              summaryLines.push(
                safeColors.dim(`Packages: ${passedCount}/${result.packageResults.length} passed`)
              );
        }

        // Report files
            if (result.files.length > 0) {
          summaryLines.push('');
          summaryLines.push(safeColors.bold('Reports:'));
              for (const file of result.files) {
            summaryLines.push(`  ${safeSymbols.info} ${safeColors.dim(file)}`);
          }
        }

        // Timing
        summaryLines.push('');
            summaryLines.push(safeColors.dim(`Total time: ${formatTiming(result.timingMs)}`));

        const output = box('Audit Results', summaryLines);
        ctx.presenter.write(output);
      }

          // Determine exit code
          const totalTime = Date.now() - startTime;
          
          if (!result.ok) {
            // Track command completion with failure
            await emit({
              type: ANALYTICS_EVENTS.RUN_FINISHED,
              payload: {
                dryRun: !!input.dryRun,
                profile: input.profile,
                scope: input.scope,
                all: !!input.all,
                verbose: !!input.verbose,
                overallOk: false,
                checksCount: Object.keys(result.checks).length,
                packagesCount: result.packageResults?.length || 0,
                durationMs: totalTime,
                result: 'failed',
                failOn: input.failOn,
              },
            });

            if (input.failOn === 'any') {
              return 2; // Quality gate fail
            }
            if (input.failOn === 'warn') {
              return 2; // Quality gate fail
            }
            // failOn === 'error'
            return 2; // Quality gate fail
          }

          // Track command completion with success
          await emit({
            type: ANALYTICS_EVENTS.RUN_FINISHED,
            payload: {
              dryRun: !!input.dryRun,
              profile: input.profile,
              scope: input.scope,
              all: !!input.all,
              verbose: !!input.verbose,
              overallOk: true,
              checksCount: Object.keys(result.checks).length,
              packagesCount: result.packageResults?.length || 0,
              durationMs: totalTime,
              result: 'success',
            },
          });

          return 0; // All checks passed
          } catch (error: unknown) {
            // Stop progress bar on error
            if (!jsonMode && !quiet) {
              progressBar.stop();
            }

            const totalTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Track command failure
            await emit({
              type: ANALYTICS_EVENTS.RUN_FINISHED,
              payload: {
                dryRun: !!flags['dry-run'] || !!flags.dryRun,
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

export async function runCommand(
  ctx: Parameters<Command['run']>[0],
  argv: Parameters<Command['run']>[1],
  flags: Parameters<Command['run']>[2]
) {
  return run.run(ctx, argv, flags);
}
